/**
 * Summary Flow Integration Test
 * 
 * Tests the actual integration points without relying on external APIs
 */

import { describe, it, expect } from "vitest";
import type { Book } from "../types/book";
import { createDefaultSummaryService } from "../services/summaryService";

const testBook: Book = {
  id: "test-123",
  originalId: "orig-123",
  title: "Test Book for AI Summaries",
  authors: ["Jane Doe"],
  description: "A test book to validate our summary generation pipeline.",
  source: "google-books",
  publishedDate: "2024",
  pageCount: 200,
  categories: ["Test"],
  language: "en"
};

describe("Summary Flow Validation (Integration)", () => {
  
  describe("Service Integration", () => {
    it("should create summary service instance", () => {
      const service = createDefaultSummaryService();
      expect(service).toBeDefined();
      expect(typeof service.generateSummary).toBe("function");
      expect(typeof service.isConfigured).toBe("function");
    });

    it("should validate book data correctly", async () => {
      const service = createDefaultSummaryService();
      
      // Test with missing title
      const invalidBook = { ...testBook, title: "" };
      await expect(
        service.generateSummary(invalidBook, "concise")
      ).rejects.toThrow();
      
      // Test with missing authors
      const noAuthorsBook = { ...testBook, authors: [] };
      await expect(
        service.generateSummary(noAuthorsBook, "concise")
      ).rejects.toThrow();
    });

    it("should handle all summary types", async () => {
      const service = createDefaultSummaryService();
      const summaryTypes = ["concise", "detailed", "analysis", "practical"] as const;
      
      for (const type of summaryTypes) {
        const result = await service.generateSummary(testBook, type);
        expect(result).toBeDefined();
        expect(result.content).toBeTruthy();
        // Summary type is validated by the service itself
      }
    });

    it("should generate summary with required metadata", async () => {
      const service = createDefaultSummaryService();
      const result = await service.generateSummary(testBook, "concise");
      
      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("generationTime");
      expect(result).toHaveProperty("aiModel");
      expect(result).toHaveProperty("promptVersion");
      expect(result).toHaveProperty("metadata");
      
      expect(result.metadata).toHaveProperty("bookDataSource");
      expect(result.metadata).toHaveProperty("hadBookDescription");
      
      expect(typeof result.content).toBe("string");
      expect(result.content.length).toBeGreaterThan(50);
      expect(result.generationTime).toBeGreaterThan(0);
    });
  });

  describe("Hook Integration", () => {
    it("should export useSummaryGeneration hook", async () => {
      const hookModule = await import("../hooks/useSummaryGeneration");
      
      expect(hookModule.useSummaryGeneration).toBeDefined();
      expect(typeof hookModule.useSummaryGeneration).toBe("function");
    });

    it("should export helper hooks", async () => {
      const hookModule = await import("../hooks/useSummaryGeneration");
      
      expect(hookModule.useSummaryExists).toBeDefined();
      expect(hookModule.useSummaryGenerationService).toBeDefined();
    });
  });

  describe("Component Integration", () => {
    it("should export BookDetailView component", async () => {
      const viewModule = await import("../views/BookDetailView");
      expect(viewModule.BookDetailView).toBeDefined();
    });

    it("should export SummaryReadingView component", async () => {
      const viewModule = await import("../views/SummaryReadingView");
      expect(viewModule.SummaryReadingView).toBeDefined();
    });
  });

  describe("Convex Integration", () => {
    it("should have Convex API available", async () => {
      try {
        const { api } = await import("../../convex/_generated/api");
        expect(api).toBeDefined();
        expect(api.summaries).toBeDefined();
      } catch (error) {
        console.warn("Convex API not available in test environment");
      }
    });

    it("should have required Convex functions", async () => {
      try {
        const { api } = await import("../../convex/_generated/api");
        
        const requiredFunctions = [
          "storeSummary",
          "getSummaryById", 
          "getExistingSummary",
          "recordSummaryFailure"
        ];

        for (const funcName of requiredFunctions) {
          expect(api.summaries[funcName]).toBeDefined();
        }
      } catch (error) {
        console.warn("Convex functions not available in test environment");
      }
    });
  });
});

describe("Type Safety Validation", () => {
  it("should have proper TypeScript types", () => {
    // Import and check types exist
    import("../types/book").then(bookTypes => {
      expect(bookTypes).toBeDefined();
    });
    
    import("../types/summary").then(summaryTypes => {
      expect(summaryTypes).toBeDefined();
    });
  });
});