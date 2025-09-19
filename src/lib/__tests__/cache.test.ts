import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCacheAdapter,
  cacheKeys,
  cacheTTL,
  SummaryCache,
  createSummaryCache,
} from "../cache";

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
      const summaryType = "concise";
      const key = cacheKeys.bookSummary(bookId, summaryType);
      expect(key).toBe("summary:book123:concise");
    });

    it("should generate generation lock keys", () => {
      const bookId = "book123";
      const summaryType = "detailed";
      const key = cacheKeys.summaryGeneration(bookId, summaryType);
      expect(key).toBe("gen:summary:book123:detailed");
    });

    it("should generate encoded search keys", () => {
      const query = "javascript programming";
      const key = cacheKeys.bookSearch(query);
      expect(key).toMatch(/^search:/);
      expect(key.length).toBeGreaterThan(7); // 'search:' + encoded content
    });
  });

  describe("cacheTTL", () => {
    it("should have correct TTL values", () => {
      expect(cacheTTL.search).toBe(900); // 15 minutes
      expect(cacheTTL.summary).toBe(86400); // 24 hours
      expect(cacheTTL.generation).toBe(300); // 5 minutes
      expect(cacheTTL.default).toBe(900); // 15 minutes
    });
  });

  describe("SummaryCache", () => {
    let summaryCache: SummaryCache;

    beforeEach(() => {
      const cacheAdapter = createCacheAdapter();
      summaryCache = createSummaryCache(cacheAdapter);
    });

    describe("summary operations", () => {
      it("should store and retrieve summaries", async () => {
        const bookId = "book123";
        const summaryType = "concise";
        const summary = "This is a test summary";

        await summaryCache.setSummary(bookId, summaryType, summary);
        const retrieved = await summaryCache.getSummary(bookId, summaryType);

        expect(retrieved).toBe(summary);
      });

      it("should return null for non-existent summaries", async () => {
        const result = await summaryCache.getSummary("nonexistent", "concise");
        expect(result).toBeNull();
      });

      it("should delete summaries", async () => {
        const bookId = "book456";
        const summaryType = "detailed";
        const summary = "Detailed test summary";

        await summaryCache.setSummary(bookId, summaryType, summary);
        await summaryCache.deleteSummary(bookId, summaryType);

        const result = await summaryCache.getSummary(bookId, summaryType);
        expect(result).toBeNull();
      });

      it("should delete all summaries for a book", async () => {
        const bookId = "book789";

        // Store multiple summary types
        await summaryCache.setSummary(bookId, "concise", "Concise summary");
        await summaryCache.setSummary(bookId, "detailed", "Detailed summary");
        await summaryCache.setSummary(bookId, "analysis", "Analysis summary");

        // Delete all summaries
        await summaryCache.deleteAllSummariesForBook(bookId);

        // Verify all are deleted
        expect(await summaryCache.getSummary(bookId, "concise")).toBeNull();
        expect(await summaryCache.getSummary(bookId, "detailed")).toBeNull();
        expect(await summaryCache.getSummary(bookId, "analysis")).toBeNull();
      });
    });

    describe("generation lock operations", () => {
      it("should track generation in progress", async () => {
        const bookId = "book123";
        const summaryType = "concise";

        // Initially not in progress
        expect(
          await summaryCache.isGenerationInProgress(bookId, summaryType)
        ).toBe(false);

        // Mark as in progress
        await summaryCache.markGenerationInProgress(bookId, summaryType);
        expect(
          await summaryCache.isGenerationInProgress(bookId, summaryType)
        ).toBe(true);

        // Clear status
        await summaryCache.clearGenerationStatus(bookId, summaryType);
        expect(
          await summaryCache.isGenerationInProgress(bookId, summaryType)
        ).toBe(false);
      });

      it("should clear generation status when deleting all summaries", async () => {
        const bookId = "book456";

        // Mark multiple types as generating
        await summaryCache.markGenerationInProgress(bookId, "concise");
        await summaryCache.markGenerationInProgress(bookId, "detailed");

        // Delete all summaries (should clear generation status too)
        await summaryCache.deleteAllSummariesForBook(bookId);

        // Verify generation status is cleared
        expect(
          await summaryCache.isGenerationInProgress(bookId, "concise")
        ).toBe(false);
        expect(
          await summaryCache.isGenerationInProgress(bookId, "detailed")
        ).toBe(false);
      });
    });

    describe("cache stats", () => {
      it("should return cache statistics", async () => {
        const stats = await summaryCache.getCacheStats();

        expect(stats).toHaveProperty("adapter");
        expect(stats).toHaveProperty("summaryTTL");
        expect(stats).toHaveProperty("generationTTL");
        expect(stats.summaryTTL).toBe(cacheTTL.summary);
        expect(stats.generationTTL).toBe(cacheTTL.generation);
      });
    });

    describe("factory function", () => {
      it("should create summary cache with default adapter", () => {
        const cache = createSummaryCache();
        expect(cache).toBeInstanceOf(SummaryCache);
      });

      it("should create summary cache with custom adapter", () => {
        const customAdapter = createCacheAdapter();
        const cache = createSummaryCache(customAdapter);
        expect(cache).toBeInstanceOf(SummaryCache);
      });
    });

    describe("integration scenarios", () => {
      it("should handle concurrent operations on different summary types", async () => {
        const bookId = "concurrent-test";

        // Simulate concurrent operations
        await Promise.all([
          summaryCache.setSummary(bookId, "concise", "Concise content"),
          summaryCache.setSummary(bookId, "detailed", "Detailed content"),
          summaryCache.markGenerationInProgress(bookId, "analysis"),
        ]);

        // Verify all operations completed correctly
        expect(await summaryCache.getSummary(bookId, "concise")).toBe(
          "Concise content"
        );
        expect(await summaryCache.getSummary(bookId, "detailed")).toBe(
          "Detailed content"
        );
        expect(
          await summaryCache.isGenerationInProgress(bookId, "analysis")
        ).toBe(true);
        expect(
          await summaryCache.isGenerationInProgress(bookId, "practical")
        ).toBe(false);
      });

      it("should maintain separation between different books", async () => {
        const book1 = "book-1";
        const book2 = "book-2";
        const summaryType = "concise";

        await summaryCache.setSummary(book1, summaryType, "Book 1 summary");
        await summaryCache.setSummary(book2, summaryType, "Book 2 summary");

        expect(await summaryCache.getSummary(book1, summaryType)).toBe(
          "Book 1 summary"
        );
        expect(await summaryCache.getSummary(book2, summaryType)).toBe(
          "Book 2 summary"
        );

        // Deleting book1 summaries shouldn't affect book2
        await summaryCache.deleteAllSummariesForBook(book1);
        expect(await summaryCache.getSummary(book1, summaryType)).toBeNull();
        expect(await summaryCache.getSummary(book2, summaryType)).toBe(
          "Book 2 summary"
        );
      });
    });
  });
});
