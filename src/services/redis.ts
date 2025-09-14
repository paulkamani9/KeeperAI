/**
 * Redis Cache Service Configuration
 *
 * This service handles caching operations for the KeeperAI backend.
 * Uses Upstash Redis for serverless-friendly caching.
 */

export interface RedisConfig {
  url: string;
  token: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  compress?: boolean; // Whether to compress large objects
}

export class RedisService {
  private config: RedisConfig;

  constructor(config: RedisConfig) {
    this.config = config;
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const response = await fetch(`${this.config.url}/get/${key}`, {
        headers: {
          Authorization: `Bearer ${this.config.token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Redis GET failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.result ? JSON.parse(data.result) : null;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null; // Graceful degradation
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const url = options?.ttl
        ? `${this.config.url}/setex/${key}/${options.ttl}`
        : `${this.config.url}/set/${key}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          "Content-Type": "application/json",
        },
        body: serialized,
      });

      return response.ok;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      return false; // Graceful degradation
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.url}/del/${key}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.token}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error(`Redis DELETE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.url}/exists/${key}`, {
        headers: {
          Authorization: `Bearer ${this.config.token}`,
        },
      });

      if (!response.ok) return false;

      const data = await response.json();
      return data.result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }
}

// Singleton instance
let redisInstance: RedisService | null = null;

export function getRedisService(): RedisService {
  if (!redisInstance) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        "Missing Upstash Redis configuration. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables."
      );
    }

    redisInstance = new RedisService({ url, token });
  }

  return redisInstance;
}

// Cache key generators for different data types
export const CacheKeys = {
  search: (query: string) => `search:${Buffer.from(query).toString("base64")}`,
  gptRecommendations: (userId: string, preferencesHash: string) =>
    `gpt:recs:${userId}:${preferencesHash}`,
  bookMetadata: (bookId: string) => `book:${bookId}`,
  popularQueries: (category: string, timeframe: string) =>
    `popular:${category}:${timeframe}`,
  userSession: (sessionId: string) => `session:${sessionId}`,
} as const;

// Default TTL values in seconds
export const CacheTTL = {
  SEARCH_RESULTS: 3600, // 1 hour
  GPT_RECOMMENDATIONS: 86400, // 24 hours
  BOOK_METADATA: 604800, // 7 days
  POPULAR_QUERIES: 21600, // 6 hours
  USER_SESSION: 1800, // 30 minutes
} as const;
