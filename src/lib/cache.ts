/**
 * Cache abstraction for KeeperAI
 *
 * Provides a unified interface for caching with Upstash Redis in production
 * and an in-memory LRU cache for local development.
 *
 * Default TTL: 15 minutes (900 seconds)
 * Cache keys should be prefixed with service name for clarity
 */

import type { Summary } from "../types/summary";

interface CacheAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

class InMemoryCache implements CacheAdapter {
  private cache = new Map<string, { value: string; expires: number }>();
  private defaultTTL = 900; // 15 minutes

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(
    key: string,
    value: string,
    ttlSeconds = this.defaultTTL
  ): Promise<void> {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }
}

class UpstashCache implements CacheAdapter {
  private baseUrl: string;
  private token: string;
  private defaultTTL = 900; // 15 minutes

  constructor(url: string, token: string) {
    this.baseUrl = url;
    this.token = token;
  }

  async get(key: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/get/${encodeURIComponent(key)}`,
        {
          headers: { Authorization: `Bearer ${this.token}` },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Cache GET error: HTTP ${response.status} ${response.statusText} for key "${key}". Response body: ${errorText}`
        );
        return null;
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error("Cache GET error:", error);
      return null;
    }
  }

  async set(
    key: string,
    value: string,
    ttlSeconds = this.defaultTTL
  ): Promise<void> {
    try {
      await fetch(
        `${this.baseUrl}/setex/${encodeURIComponent(key)}/${ttlSeconds}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "text/plain",
          },
          body: value,
        }
      );
    } catch (error) {
      console.error("Cache SET error:", error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/del/${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}` },
      });
    } catch (error) {
      console.error("Cache DELETE error:", error);
    }
  }
}

// Utility function to encode strings for cache keys
function encodeForCache(input: string): string {
  // Use btoa in browser, fallback encoding for Node.js
  if (typeof btoa !== "undefined") {
    return btoa(input);
  }
  // Simple base64 encoding fallback
  return Buffer.from(input).toString("base64");
}

// Factory function to create cache adapter
export function createCacheAdapter(
  upstashUrl?: string,
  upstashToken?: string
): CacheAdapter {
  if (upstashUrl && upstashToken) {
    return new UpstashCache(upstashUrl, upstashToken);
  }

  return new InMemoryCache();
}

// Create default cache instance (server-side will use env vars)
const getDefaultCache = (): CacheAdapter => {
  // Only access process.env on server side
  if (typeof window === "undefined") {
    try {
      return createCacheAdapter(
        process.env.UPSTASH_REDIS_REST_URL,
        process.env.UPSTASH_REDIS_REST_TOKEN
      );
    } catch {
      // Fallback if process is not available
    }
  }

  return new InMemoryCache();
};

export const cache = getDefaultCache();

// Helper functions for common cache operations
export const cacheKeys = {
  bookSearch: (query: string) => `search:${encodeForCache(query)}`,
  bookSummary: (bookId: string, summaryType: string) =>
    `summary:book:${bookId}:${summaryType}`,
  summaryById: (summaryId: string) => `summary:id:${summaryId}`,
  summaryGeneration: (bookId: string, summaryType: string) =>
    `gen:summary:${bookId}:${summaryType}`,
  summaryFailure: (bookId: string, summaryType: string) =>
    `fail:summary:${bookId}:${summaryType}`,
} as const;

/**
 * Cache configuration for different content types
 */
export const cacheTTL = {
  /** Search results cache for 15 minutes */
  search: 900,
  /** Generated summaries cache for 24 hours */
  summary: 86400, // 24 hours
  /** Generation locks/status cache for 5 minutes */
  generation: 300,
  /** Summary failure cache for 10 minutes (to prevent hammering) */
  failure: 600, // 10 minutes
  /** Default TTL for other content */
  default: 900,
} as const;

/**
 * Summary-specific cache operations with Redis integration
 *
 * Redis Strategy:
 * - TTL: 24 hours for summaries
 * - Two cache keys per summary:
 *   1. summary:book:{bookId}:{summaryType} → for "does this book already have a summary?" checks
 *   2. summary:id:{summaryId} → for fetching summaries by Convex ID
 * - Redis is checked before Convex
 * - On cache miss: Convex is queried, then Redis is hydrated
 * - On write: persist in Convex first, then hydrate Redis with both keys
 * - On failure: cache failure status with short TTL to prevent hammering
 */
export class SummaryCache {
  private cacheAdapter: CacheAdapter;

  constructor(cacheAdapter?: CacheAdapter) {
    this.cacheAdapter = cacheAdapter || cache;
  }

  /**
   * Get a cached summary by book ID and type
   * Used for checking if a summary already exists for a book
   */
  async getSummary(
    bookId: string,
    summaryType: string
  ): Promise<string | null> {
    const key = cacheKeys.bookSummary(bookId, summaryType);
    return await this.cacheAdapter.get(key);
  }

  /**
   * Store a summary in cache using the book+type key
   * This is used by the legacy SummaryCache methods
   */
  async setSummary(
    bookId: string,
    summaryType: string,
    summary: string
  ): Promise<void> {
    const key = cacheKeys.bookSummary(bookId, summaryType);
    await this.cacheAdapter.set(key, summary, cacheTTL.summary);
  }

  /**
   * Get a cached summary by its Convex ID
   * Used by getSummaryById function for fast lookup
   */
  async getCachedSummaryById(summaryId: string): Promise<Summary | null> {
    try {
      const key = cacheKeys.summaryById(summaryId);
      const cached = await this.cacheAdapter.get(key);

      if (!cached) {
        return null;
      }

      // Parse JSON and validate structure
      const parsed = JSON.parse(cached);

      // Basic validation - ensure required fields exist
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !parsed.id ||
        !parsed.bookId ||
        !parsed.summaryType ||
        !parsed.content
      ) {
        console.warn(`Invalid cached summary structure for ID ${summaryId}`);
        return null;
      }

      return parsed as Summary;
    } catch (error) {
      console.error(
        `Error retrieving cached summary by ID ${summaryId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get a cached summary by book ID and type
   * Used by getExistingSummary function for fast lookup
   */
  async getCachedSummaryByBook(
    bookId: string,
    summaryType: string
  ): Promise<Summary | null> {
    try {
      const key = cacheKeys.bookSummary(bookId, summaryType);
      const cached = await this.cacheAdapter.get(key);

      if (!cached) {
        return null;
      }

      // Parse JSON and validate structure
      const parsed = JSON.parse(cached);

      // Basic validation - ensure required fields exist
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !parsed.id ||
        !parsed.bookId ||
        !parsed.summaryType ||
        !parsed.content
      ) {
        console.warn(
          `Invalid cached summary structure for book ${bookId}, type ${summaryType}`
        );
        return null;
      }

      return parsed as Summary;
    } catch (error) {
      console.error(
        `Error retrieving cached summary for book ${bookId}, type ${summaryType}:`,
        error
      );
      return null;
    }
  }

  /**
   * Cache a complete summary object with both cache keys
   * This is the primary method for hydrating Redis after Convex operations
   */
  async setCachedSummary(summary: Summary): Promise<void> {
    try {
      const summaryJson = JSON.stringify({
        id: summary.id,
        bookId: summary.bookId,
        summaryType: summary.summaryType,
        content: summary.content,
        status: summary.status,
        createdAt: summary.createdAt.toISOString(),
        updatedAt: summary.updatedAt.toISOString(),
        generationTime: summary.generationTime,
        wordCount: summary.wordCount,
        readingTime: summary.readingTime,
        aiModel: summary.aiModel,
        promptVersion: summary.promptVersion,
        errorMessage: summary.errorMessage,
        metadata: summary.metadata,
      });

      // Cache with both keys for different access patterns
      await Promise.all([
        // By ID (for getSummaryById)
        this.cacheAdapter.set(
          cacheKeys.summaryById(summary.id),
          summaryJson,
          cacheTTL.summary
        ),
        // By book+type (for getExistingSummary)
        this.cacheAdapter.set(
          cacheKeys.bookSummary(summary.bookId, summary.summaryType),
          summaryJson,
          cacheTTL.summary
        ),
      ]);
    } catch (error) {
      console.error(`Error caching summary ${summary.id}:`, error);
      // Don't throw - caching errors shouldn't break the flow
    }
  }

  /**
   * Invalidate both cache keys for a summary
   * Used when a summary is updated or deleted
   */
  async invalidateCachedSummary(
    summaryId: string,
    bookId: string,
    summaryType: string
  ): Promise<void> {
    try {
      await Promise.all([
        this.cacheAdapter.delete(cacheKeys.summaryById(summaryId)),
        this.cacheAdapter.delete(cacheKeys.bookSummary(bookId, summaryType)),
      ]);
    } catch (error) {
      console.error(`Error invalidating cached summary ${summaryId}:`, error);
      // Don't throw - caching errors shouldn't break the flow
    }
  }

  /**
   * Check if summary generation is in progress (to prevent duplicate requests)
   */
  async isGenerationInProgress(
    bookId: string,
    summaryType: string
  ): Promise<boolean> {
    const key = cacheKeys.summaryGeneration(bookId, summaryType);
    const status = await this.cacheAdapter.get(key);
    return status === "generating";
  }

  /**
   * Mark summary generation as in progress
   */
  async markGenerationInProgress(
    bookId: string,
    summaryType: string
  ): Promise<void> {
    const key = cacheKeys.summaryGeneration(bookId, summaryType);
    await this.cacheAdapter.set(key, "generating", cacheTTL.generation);
  }

  /**
   * Clear generation status (on completion or error)
   */
  async clearGenerationStatus(
    bookId: string,
    summaryType: string
  ): Promise<void> {
    const key = cacheKeys.summaryGeneration(bookId, summaryType);
    await this.cacheAdapter.delete(key);
  }

  /**
   * Cache a summary failure to prevent hammering OpenAI
   * Failures are cached with a shorter TTL (10 minutes)
   */
  async cacheFailure(
    bookId: string,
    summaryType: string,
    errorMessage: string
  ): Promise<void> {
    try {
      const key = cacheKeys.summaryFailure(bookId, summaryType);
      const failureData = JSON.stringify({
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      await this.cacheAdapter.set(key, failureData, cacheTTL.failure);
    } catch (error) {
      console.error(
        `Error caching failure for ${bookId}:${summaryType}:`,
        error
      );
    }
  }

  /**
   * Check if there's a recent failure for this book+type combo
   * Returns the cached error message if within TTL, null otherwise
   */
  async getRecentFailure(
    bookId: string,
    summaryType: string
  ): Promise<string | null> {
    try {
      const key = cacheKeys.summaryFailure(bookId, summaryType);
      const cached = await this.cacheAdapter.get(key);

      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(cached);
      return parsed.error || null;
    } catch (error) {
      console.error(
        `Error checking recent failure for ${bookId}:${summaryType}:`,
        error
      );
      return null;
    }
  }

  /**
   * Clear failure cache for a book+type combo
   * Used when generation succeeds after a previous failure
   */
  async clearFailure(bookId: string, summaryType: string): Promise<void> {
    try {
      const key = cacheKeys.summaryFailure(bookId, summaryType);
      await this.cacheAdapter.delete(key);
    } catch (error) {
      console.error(
        `Error clearing failure cache for ${bookId}:${summaryType}:`,
        error
      );
    }
  }

  /**
   * Delete a cached summary (legacy method for backwards compatibility)
   */
  async deleteSummary(bookId: string, summaryType: string): Promise<void> {
    const key = cacheKeys.bookSummary(bookId, summaryType);
    await this.cacheAdapter.delete(key);
  }

  /**
   * Delete all summaries for a book
   */
  async deleteAllSummariesForBook(bookId: string): Promise<void> {
    const summaryTypes = ["concise", "detailed", "analysis", "practical"];

    // Delete all summary types for this book
    await Promise.all(
      summaryTypes.map((type) => this.deleteSummary(bookId, type))
    );

    // Clear any generation statuses
    await Promise.all(
      summaryTypes.map((type) => this.clearGenerationStatus(bookId, type))
    );

    // Clear any failure caches
    await Promise.all(
      summaryTypes.map((type) => this.clearFailure(bookId, type))
    );
  }

  /**
   * Get cache statistics for summaries
   */
  async getCacheStats(): Promise<{
    adapter: string;
    summaryTTL: number;
    generationTTL: number;
    failureTTL: number;
  }> {
    return {
      adapter: this.cacheAdapter.constructor.name,
      summaryTTL: cacheTTL.summary,
      generationTTL: cacheTTL.generation,
      failureTTL: cacheTTL.failure,
    };
  }
}

/**
 * Create default summary cache instance
 */
export function createSummaryCache(cacheAdapter?: CacheAdapter): SummaryCache {
  return new SummaryCache(cacheAdapter);
}

/**
 * Default summary cache instance
 */
export const summaryCache = createSummaryCache();

/**
 * Summary-specific helper functions for Convex integration
 * These functions provide a clean interface for Redis caching in Convex functions
 */

/**
 * Get a cached summary by its Convex ID
 * Returns null on cache miss or error
 */
export async function getCachedSummaryById(
  summaryId: string
): Promise<Summary | null> {
  return await summaryCache.getCachedSummaryById(summaryId);
}

/**
 * Get a cached summary by book ID and summary type
 * Returns null on cache miss or error
 */
export async function getCachedSummaryByBook(
  bookId: string,
  summaryType: string
): Promise<Summary | null> {
  return await summaryCache.getCachedSummaryByBook(bookId, summaryType);
}

/**
 * Cache a complete summary object with both access keys
 * Safe to call - errors are logged but don't throw
 */
export async function setCachedSummary(summary: Summary): Promise<void> {
  await summaryCache.setCachedSummary(summary);
}

/**
 * Invalidate all cache entries for a summary
 * Safe to call - errors are logged but don't throw
 */
export async function invalidateCachedSummary(
  summaryId: string,
  bookId: string,
  summaryType: string
): Promise<void> {
  await summaryCache.invalidateCachedSummary(summaryId, bookId, summaryType);
}

/**
 * Cache a summary failure to prevent API hammering
 * Safe to call - errors are logged but don't throw
 */
export async function cacheFailure(
  bookId: string,
  summaryType: string,
  errorMessage: string
): Promise<void> {
  await summaryCache.cacheFailure(bookId, summaryType, errorMessage);
}

/**
 * Check for recent failures to avoid repeated attempts
 * Returns error message if recent failure exists, null otherwise
 */
export async function getRecentFailure(
  bookId: string,
  summaryType: string
): Promise<string | null> {
  return await summaryCache.getRecentFailure(bookId, summaryType);
}

/**
 * Clear failure cache (called on successful generation)
 * Safe to call - errors are logged but don't throw
 */
export async function clearFailure(
  bookId: string,
  summaryType: string
): Promise<void> {
  await summaryCache.clearFailure(bookId, summaryType);
}
