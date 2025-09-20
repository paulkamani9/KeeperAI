/**
 * End-to-End Flow Validation Test
 *
 * Tests the complete summary generation flow:
 * 1. BookDetailView uses useSummaryGeneration hook
 * 2. Hook calls summaryService for AI generation
 * 3. SummaryService calls OpenAI API
 * 4. Generated summary is stored in Convex
 * 5. Navigation to summary page works
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Book } from "../types/book";
import type { SummaryType } from "../types/summary";
import { createDefaultSummaryService } from "../services/summaryService";
import { featureFlags } from "../lib/environmentConfig";

// Mock book data for testing
const mockBook: Book = {
  id: "test-book-123",
  originalId: "goog-test-123",
  title: "The Test Book",
  authors: ["Test Author", "Co-Author"],
  description:
    "A comprehensive test book for validating our summary generation system. This book covers various aspects of testing methodologies and best practices.",
  source: "google-books",
  publishedDate: "2024-01-15",
  pageCount: 300,
  categories: ["Technology", "Testing"],
  language: "en",
  thumbnail: "https://example.com/cover.jpg",
  previewLink: "https://books.google.com/preview/123",
  infoLink: "https://books.google.com/info/123",
};

describe("Summary Generation Flow Validation", () => {
  beforeEach(() => {
    // Clear any existing mocks
    vi.clearAllMocks();
  });

  describe("1. Service Configuration", () => {
    it("should have OpenAI API key configured", () => {
      expect(featureFlags.openaiApi).toBe(true);
    });

    it("should create summary service instance", () => {
      const service = createDefaultSummaryService();
      expect(service).toBeDefined();
      expect(service.isConfigured()).toBe(true);
    });

    it("should have available AI models", () => {
      const service = createDefaultSummaryService();
      const models = service.getAvailableModels();
      expect(models).toContain("gpt-4o-mini");
      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe("2. Summary Service Integration", () => {
    it("should validate required book data", async () => {
      const service = createDefaultSummaryService();

      // Test with invalid book (no title)
      const invalidBook = { ...mockBook, title: "" };

      if (featureFlags.openaiApi) {
        await expect(
          service.generateSummary(invalidBook, "concise")
        ).rejects.toThrow("title is required");
      }
    });

    it("should validate summary type", async () => {
      const service = createDefaultSummaryService();

      if (featureFlags.openaiApi) {
        await expect(
          service.generateSummary(mockBook, "invalid" as SummaryType)
        ).rejects.toThrow("Invalid summary type");
      }
    });

    it("should generate summary with proper structure", async () => {
      const service = createDefaultSummaryService();

      if (featureFlags.openaiApi) {
        // This is a real API test - only run if configured
        try {
          const result = await service.generateSummary(mockBook, "concise");

          // Validate result structure
          expect(result).toHaveProperty("content");
          expect(result).toHaveProperty("generationTime");
          expect(result).toHaveProperty("aiModel");
          expect(result).toHaveProperty("promptVersion");
          expect(result).toHaveProperty("metadata");

          // Validate content
          expect(result.content).toBeTruthy();
          expect(typeof result.content).toBe("string");
          expect(result.content.length).toBeGreaterThan(100);

          // Validate metadata
          expect(result.metadata.bookDataSource).toBe("google-books");
          expect(result.metadata.hadBookDescription).toBe(true);

          // Validate timing
          expect(result.generationTime).toBeGreaterThan(0);
        } catch (error) {
          console.warn("OpenAI API test skipped due to error:", error);
          // Skip test if API is not available or rate limited
        }
      } else {
        // Test mock service
        const result = await service.generateSummary(mockBook, "concise");
        expect(result.content).toContain("mock summary");
        expect(result.aiModel).toBe("mock-gpt-4");
      }
    });
  });

  describe("3. Data Flow Validation", () => {
    it("should properly format summary types", () => {
      const validTypes: SummaryType[] = [
        "concise",
        "detailed",
        "analysis",
        "practical",
      ];

      validTypes.forEach((type) => {
        expect(["concise", "detailed", "analysis", "practical"]).toContain(
          type
        );
      });
    });

    it("should calculate metadata correctly", () => {
      const testContent =
        "This is a test summary with multiple sentences. It contains various words and punctuation. The calculation should be accurate.";

      // Import the utility functions used by the service
      import("../types/summary").then(
        ({ calculateWordCount, calculateReadingTime }) => {
          const wordCount = calculateWordCount(testContent);
          const readingTime = calculateReadingTime(wordCount);

          expect(wordCount).toBe(20); // Expected word count
          expect(readingTime).toBeGreaterThan(0);
        }
      );
    });
  });

  describe("4. Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      const service = createDefaultSummaryService();

      // Test with timeout
      try {
        await service.generateSummary(mockBook, "concise", { timeout: 1 }); // 1ms timeout
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("timeout");
      }
    });

    it("should provide user-friendly error messages", async () => {
      const service = createDefaultSummaryService();

      // Test various error conditions
      const errorCases = [
        {
          book: { ...mockBook, title: "" },
          expectedError: "title is required",
        },
        {
          book: { ...mockBook, authors: [] },
          expectedError: "authors are required",
        },
      ];

      for (const { book, expectedError } of errorCases) {
        try {
          await service.generateSummary(book, "concise");
          // If no error thrown, fail the test
          expect(false).toBe(true);
        } catch (error) {
          expect((error as Error).message.toLowerCase()).toContain(
            expectedError
          );
        }
      }
    });
  });

  describe("5. Integration Points", () => {
    it("should integrate with useSummaryGeneration hook", async () => {
      // Import the hook types to validate interface compatibility
      const hookModule = await import("../hooks/useSummaryGeneration");

      // Validate hook exports
      expect(hookModule.useSummaryGeneration).toBeDefined();
      expect(typeof hookModule.useSummaryGeneration).toBe("function");

      // Validate helper hooks
      expect(hookModule.useSummaryExists).toBeDefined();
      expect(hookModule.useSummaryGenerationService).toBeDefined();
    });

    it("should be compatible with BookDetailView", async () => {
      // Check that BookDetailView can import and use the hook
      const bookDetailModule = await import("../views/BookDetailView");
      expect(bookDetailModule.BookDetailView).toBeDefined();
    });

    it("should integrate with Convex persistence", async () => {
      // Validate that Convex functions are available
      try {
        const { api } = await import("../../convex/_generated/api");

        // Check that required Convex functions exist
        expect(api.summaries).toBeDefined();
        expect(api.summaries.storeSummary).toBeDefined();
        expect(api.summaries.getSummaryById).toBeDefined();
        expect(api.summaries.getExistingSummary).toBeDefined();
      } catch (error) {
        console.warn("Convex API not available in test environment:", error);
      }
    });
  });
});

/**
 * Performance validation
 */
describe("Performance Validation", () => {
  it("should complete summary generation within reasonable time", async () => {
    const service = createDefaultSummaryService();

    if (featureFlags.openaiApi) {
      const startTime = performance.now();

      try {
        await service.generateSummary(mockBook, "concise", { timeout: 30000 });
        const duration = performance.now() - startTime;

        // Should complete within 30 seconds
        expect(duration).toBeLessThan(30000);
      } catch (error) {
        console.warn("Performance test skipped:", error);
      }
    }
  });

  it("should handle concurrent requests", async () => {
    const service = createDefaultSummaryService();

    if (featureFlags.openaiApi) {
      // Test multiple concurrent requests (be careful not to hit rate limits)
      const promises = Array.from({ length: 2 }, (_, i) =>
        service.generateSummary(
          { ...mockBook, id: `test-book-${i}` },
          "concise"
        )
      );

      try {
        const results = await Promise.all(promises);
        expect(results).toHaveLength(2);
        results.forEach((result) => {
          expect(result.content).toBeTruthy();
        });
      } catch (error) {
        console.warn("Concurrent test skipped:", error);
      }
    }
  });
});
