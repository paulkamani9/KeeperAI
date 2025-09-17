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
  bookSummary: (bookId: string) => `summary:${bookId}`,
  bookSearch: (query: string) => `search:${encodeForCache(query)}`,
} as const;
