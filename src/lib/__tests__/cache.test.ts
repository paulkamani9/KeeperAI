import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCacheAdapter, cacheKeys } from "../cache";

describe("Cache", () => {
  let cache: ReturnType<typeof createCacheAdapter>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Use in-memory cache for tests
    cache = createCacheAdapter();
  });

  it("should set and get values", async () => {
    const key = "test-key";
    const value = "test-value";

    await cache.set(key, value);
    const retrieved = await cache.get(key);

    expect(retrieved).toBe(value);
  });

  it("should return null for non-existent keys", async () => {
    const result = await cache.get("non-existent-key");
    expect(result).toBeNull();
  });

  it("should delete values", async () => {
    const key = "delete-test";
    const value = "delete-value";

    await cache.set(key, value);
    await cache.delete(key);

    const result = await cache.get(key);
    expect(result).toBeNull();
  });

  it("should respect TTL for in-memory cache", async () => {
    vi.useFakeTimers();

    const key = "ttl-test";
    const value = "ttl-value";

    await cache.set(key, value, 1); // 1 second TTL

    // Should exist immediately
    expect(await cache.get(key)).toBe(value);

    // Should expire after TTL
    vi.advanceTimersByTime(1500); // 1.5 seconds
    expect(await cache.get(key)).toBeNull();

    vi.useRealTimers();
  });

  describe("cacheKeys", () => {
    it("should generate consistent book summary keys", () => {
      const bookId = "book123";
      const key = cacheKeys.bookSummary(bookId);
      expect(key).toBe("summary:book123");
    });

    it("should generate encoded search keys", () => {
      const query = "javascript programming";
      const key = cacheKeys.bookSearch(query);
      expect(key).toMatch(/^search:/);
      expect(key.length).toBeGreaterThan(7); // 'search:' + encoded content
    });
  });
});
