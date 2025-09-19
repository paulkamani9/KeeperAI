/**
 * Cache abstraction for KeeperAI
 *
 * Provides a unified interface for caching with Upstash Redis in production
 * and an in-memory LRU cache for local development.
 *
 * Default TTL: 15 minutes (900 seconds)
 * Cache keys should be prefixed with service name for clarity
 */

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
    `summary:${bookId}:${summaryType}`,
  summaryGeneration: (bookId: string, summaryType: string) =>
    `gen:summary:${bookId}:${summaryType}`,
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
  /** Default TTL for other content */
  default: 900,
} as const;

/**
 * Summary-specific cache operations
 */
export class SummaryCache {
  private cacheAdapter: CacheAdapter;

  constructor(cacheAdapter?: CacheAdapter) {
    this.cacheAdapter = cacheAdapter || cache;
  }

  /**
   * Get a cached summary
   */
  async getSummary(
    bookId: string,
    summaryType: string
  ): Promise<string | null> {
    const key = cacheKeys.bookSummary(bookId, summaryType);
    return await this.cacheAdapter.get(key);
  }

  /**
   * Store a summary in cache
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
   * Delete a cached summary
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
  }

  /**
   * Get cache statistics for summaries
   */
  async getCacheStats(): Promise<{
    adapter: string;
    summaryTTL: number;
    generationTTL: number;
  }> {
    return {
      adapter: this.cacheAdapter.constructor.name,
      summaryTTL: cacheTTL.summary,
      generationTTL: cacheTTL.generation,
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
