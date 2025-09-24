import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCacheAdapter,
  cacheKeys,
  cacheTTL,
  SummaryCache,
  createSummaryCache,
  getCachedSummaryById,
  getCachedSummaryByBook,
  setCachedSummary,
  cacheFailure,
  getRecentFailure,
  clearFailure,
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
      expect(key).toBe("summary:book:book123:concise");
    });

    it("should generate summary ID keys", () => {
      const summaryId = "summary123";
      const key = cacheKeys.summaryById(summaryId);
      expect(key).toBe("summary:id:summary123");
    });

    it("should generate generation lock keys", () => {
      const bookId = "book123";
      const summaryType = "detailed";
      const key = cacheKeys.summaryGeneration(bookId, summaryType);
      expect(key).toBe("gen:summary:book123:detailed");
    });

    it("should generate failure cache keys", () => {
      const bookId = "book123";
      const summaryType = "analysis";
      const key = cacheKeys.summaryFailure(bookId, summaryType);
      expect(key).toBe("fail:summary:book123:analysis");
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
      expect(cacheTTL.failure).toBe(600); // 10 minutes
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

    describe("Redis integration methods", () => {
      const mockSummary = {
        id: "summary123",
        bookId: "book456",
        summaryType: "concise" as const,
        content: "This is a test summary content",
        status: "completed" as const,
        createdAt: new Date("2023-01-01T00:00:00Z"),
        updatedAt: new Date("2023-01-01T01:00:00Z"),
        generationTime: 1500,
        wordCount: 100,
        readingTime: 5,
        aiModel: "gpt-4o-mini",
        promptVersion: "v1.0",
        errorMessage: undefined,
        metadata: {
          bookDataSource: "google-books" as const,
          hadBookDescription: true,
        },
      };

      it("should store and retrieve summaries by ID", async () => {
        await summaryCache.setCachedSummary(mockSummary);
        const retrieved = await summaryCache.getCachedSummaryById("summary123");

        expect(retrieved).not.toBeNull();
        expect(retrieved?.id).toBe(mockSummary.id);
        expect(retrieved?.bookId).toBe(mockSummary.bookId);
        expect(retrieved?.content).toBe(mockSummary.content);
      });

      it("should store and retrieve summaries by book+type", async () => {
        await summaryCache.setCachedSummary(mockSummary);
        const retrieved = await summaryCache.getCachedSummaryByBook(
          "book456",
          "concise"
        );

        expect(retrieved).not.toBeNull();
        expect(retrieved?.id).toBe(mockSummary.id);
        expect(retrieved?.bookId).toBe(mockSummary.bookId);
        expect(retrieved?.content).toBe(mockSummary.content);
      });

      it("should invalidate both cache keys", async () => {
        await summaryCache.setCachedSummary(mockSummary);

        // Verify both keys exist
        expect(
          await summaryCache.getCachedSummaryById("summary123")
        ).not.toBeNull();
        expect(
          await summaryCache.getCachedSummaryByBook("book456", "concise")
        ).not.toBeNull();

        // Invalidate
        await summaryCache.invalidateCachedSummary(
          "summary123",
          "book456",
          "concise"
        );

        // Verify both keys are gone
        expect(
          await summaryCache.getCachedSummaryById("summary123")
        ).toBeNull();
        expect(
          await summaryCache.getCachedSummaryByBook("book456", "concise")
        ).toBeNull();
      });

      it("should handle invalid JSON gracefully", async () => {
        // Manually set invalid JSON in cache
        const key = cacheKeys.summaryById("invalid123");
        await summaryCache["cacheAdapter"].set(key, "invalid json", 300);

        const result = await summaryCache.getCachedSummaryById("invalid123");
        expect(result).toBeNull();
      });

      it("should handle malformed summary objects gracefully", async () => {
        // Manually set malformed object in cache
        const key = cacheKeys.summaryById("malformed123");
        const malformed = JSON.stringify({ incomplete: "object" });
        await summaryCache["cacheAdapter"].set(key, malformed, 300);

        const result = await summaryCache.getCachedSummaryById("malformed123");
        expect(result).toBeNull();
      });
    });

    describe("failure caching", () => {
      it("should cache and retrieve failures", async () => {
        const bookId = "book789";
        const summaryType = "detailed";
        const errorMessage = "OpenAI API rate limit exceeded";

        await summaryCache.cacheFailure(bookId, summaryType, errorMessage);
        const retrieved = await summaryCache.getRecentFailure(
          bookId,
          summaryType
        );

        expect(retrieved).toBe(errorMessage);
      });

      it("should clear failure cache", async () => {
        const bookId = "book789";
        const summaryType = "analysis";
        const errorMessage = "Network timeout";

        await summaryCache.cacheFailure(bookId, summaryType, errorMessage);
        await summaryCache.clearFailure(bookId, summaryType);

        const retrieved = await summaryCache.getRecentFailure(
          bookId,
          summaryType
        );
        expect(retrieved).toBeNull();
      });

      it("should return null for non-existent failures", async () => {
        const result = await summaryCache.getRecentFailure(
          "nonexistent",
          "practical"
        );
        expect(result).toBeNull();
      });

      it("should handle malformed failure cache gracefully", async () => {
        // Manually set malformed failure data
        const key = cacheKeys.summaryFailure("malformed", "concise");
        await summaryCache["cacheAdapter"].set(key, "invalid json", 300);

        const result = await summaryCache.getRecentFailure(
          "malformed",
          "concise"
        );
        expect(result).toBeNull();
      });
    });

    describe("cache stats", () => {
      it("should return cache statistics", async () => {
        const stats = await summaryCache.getCacheStats();

        expect(stats).toHaveProperty("adapter");
        expect(stats).toHaveProperty("summaryTTL");
        expect(stats).toHaveProperty("generationTTL");
        expect(stats).toHaveProperty("failureTTL");
        expect(stats.summaryTTL).toBe(cacheTTL.summary);
        expect(stats.generationTTL).toBe(cacheTTL.generation);
        expect(stats.failureTTL).toBe(cacheTTL.failure);
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

      it("should handle Redis-based cache-miss-then-hydrate workflow", async () => {
        const mockSummary = {
          id: "workflow-test",
          bookId: "book-workflow",
          summaryType: "detailed" as const,
          content: "Workflow test content",
          status: "completed" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          generationTime: 2000,
          wordCount: 150,
          readingTime: 8,
          aiModel: "gpt-4o",
          promptVersion: "v1.1",
          metadata: {
            bookDataSource: "open-library" as const,
            hadBookDescription: false,
          },
        };

        // Step 1: Verify cache miss
        expect(
          await summaryCache.getCachedSummaryById("workflow-test")
        ).toBeNull();
        expect(
          await summaryCache.getCachedSummaryByBook("book-workflow", "detailed")
        ).toBeNull();

        // Step 2: Simulate "database query returns summary"
        await summaryCache.setCachedSummary(mockSummary);

        // Step 3: Verify cache hit for both access patterns
        const byId = await summaryCache.getCachedSummaryById("workflow-test");
        const byBook = await summaryCache.getCachedSummaryByBook(
          "book-workflow",
          "detailed"
        );

        expect(byId).not.toBeNull();
        expect(byBook).not.toBeNull();
        expect(byId?.content).toBe(mockSummary.content);
        expect(byBook?.content).toBe(mockSummary.content);
      });

      it("should clear all caches (summaries, failures, generation) for a book", async () => {
        const bookId = "cleanup-test";
        const mockSummary = {
          id: "cleanup-summary",
          bookId: bookId,
          summaryType: "practical" as const,
          content: "Cleanup test",
          status: "completed" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          generationTime: 1000,
          wordCount: 50,
          readingTime: 3,
          aiModel: "gpt-4o-mini",
          promptVersion: "v1.0",
          metadata: {
            bookDataSource: "google-books" as const,
            hadBookDescription: true,
          },
        };

        // Set up various caches
        await summaryCache.setCachedSummary(mockSummary);
        await summaryCache.markGenerationInProgress(bookId, "concise");
        await summaryCache.cacheFailure(bookId, "analysis", "Test error");

        // Verify they exist
        expect(
          await summaryCache.getCachedSummaryByBook(bookId, "practical")
        ).not.toBeNull();
        expect(
          await summaryCache.isGenerationInProgress(bookId, "concise")
        ).toBe(true);
        expect(await summaryCache.getRecentFailure(bookId, "analysis")).toBe(
          "Test error"
        );

        // Clear all
        await summaryCache.deleteAllSummariesForBook(bookId);

        // Verify all are cleared
        expect(await summaryCache.getSummary(bookId, "practical")).toBeNull();
        expect(
          await summaryCache.isGenerationInProgress(bookId, "concise")
        ).toBe(false);
        expect(
          await summaryCache.getRecentFailure(bookId, "analysis")
        ).toBeNull();
      });
    });
  });

  // Test module-level helper functions
  describe("Module-level helper functions", () => {
    it("should export getCachedSummaryById function", async () => {
      const result = await getCachedSummaryById("test-id");
      expect(result).toBeNull(); // Should return null for non-existent
    });

    it("should export getCachedSummaryByBook function", async () => {
      const result = await getCachedSummaryByBook("test-book", "concise");
      expect(result).toBeNull(); // Should return null for non-existent
    });

    it("should export setCachedSummary function", async () => {
      const mockSummary = {
        id: "module-test",
        bookId: "module-book",
        summaryType: "concise" as const,
        content: "Module test content",
        status: "completed" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        generationTime: 500,
        wordCount: 25,
        readingTime: 1,
        aiModel: "gpt-4o-mini",
        promptVersion: "v1.0",
        metadata: {
          bookDataSource: "google-books" as const,
          hadBookDescription: true,
        },
      };

      // Should not throw
      await setCachedSummary(mockSummary);

      // Verify it was cached
      const result = await getCachedSummaryById("module-test");
      expect(result?.content).toBe("Module test content");
    });

    it("should export failure cache functions", async () => {
      const bookId = "module-failure-test";
      const summaryType = "detailed";
      const errorMessage = "Module test error";

      // Should not throw
      await cacheFailure(bookId, summaryType, errorMessage);

      // Verify it was cached
      const result = await getRecentFailure(bookId, summaryType);
      expect(result).toBe(errorMessage);

      // Clear it
      await clearFailure(bookId, summaryType);
      const cleared = await getRecentFailure(bookId, summaryType);
      expect(cleared).toBeNull();
    });
  });
});
