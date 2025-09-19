/**
 * Tests for Summary Analytics Service
 * Tests analytics tracking functionality for AI-powered summaries
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConvexReactClient } from "convex/react";
import { SummaryAnalyticsService } from "../summaryTracking";

// Mock the Convex API
const mockMutation = vi.fn().mockResolvedValue(undefined);
const mockQuery = vi.fn().mockResolvedValue({});

vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    analytics: {
      logSummaryGeneration: "logSummaryGeneration",
      getSummaryMetrics: "getSummaryMetrics",
    },
  },
}));

describe("SummaryAnalyticsService", () => {
  let mockConvex: ConvexReactClient;
  let service: SummaryAnalyticsService;

  const mockBook = {
    id: "book_123",
    title: "Test Book",
    authors: ["Test Author"],
    source: "google-books" as const,
    originalId: "original_123",
    description: "Test description",
  };

  const mockSuccessResult = {
    content: "Test summary content",
    generationTime: 1500,
    aiModel: "gpt-3.5-turbo",
    promptVersion: "v1.0",
    usage: {
      promptTokens: 100,
      completionTokens: 200,
      totalTokens: 300,
      estimatedCost: 0.001,
    },
    metadata: {
      bookDataSource: "google-books" as const,
      hadBookDescription: true,
    },
  };

  const mockErrorResult = {
    error: new Error("API rate limit exceeded"),
    generationTime: 500,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockConvex = {
      mutation: mockMutation,
      query: mockQuery,
    } as unknown as ConvexReactClient;

    service = new SummaryAnalyticsService(mockConvex);
  });

  describe("Basic functionality", () => {
    it("should initialize with convex client", () => {
      expect(service).toBeInstanceOf(SummaryAnalyticsService);
    });

    it("should handle invalid convex client", () => {
      // The constructor doesn't validate null inputs - it just stores them
      const service = new SummaryAnalyticsService(null as any);
      expect(service).toBeInstanceOf(SummaryAnalyticsService);
    });
  });

  describe("trackSummaryGeneration", () => {
    it("should track successful generation", async () => {
      await service.trackSummaryGeneration({
        book: mockBook,
        summaryType: "concise",
        result: mockSuccessResult,
        cacheHit: false,
      });

      expect(mockMutation).toHaveBeenCalledWith(
        "logSummaryGeneration",
        expect.objectContaining({
          bookId: "book_123",
          summaryType: "concise",
          generationTime: 1500,
          success: true,
          aiModel: "gpt-3.5-turbo",
          promptVersion: "v1.0",
          cacheHit: false,
        })
      );
    });

    it("should track failed generation", async () => {
      await service.trackSummaryGeneration({
        book: mockBook,
        summaryType: "detailed",
        result: mockErrorResult,
        cacheHit: false,
      });

      expect(mockMutation).toHaveBeenCalledWith(
        "logSummaryGeneration",
        expect.objectContaining({
          bookId: "book_123",
          summaryType: "detailed",
          generationTime: 500,
          success: false,
          errorType: "rate_limit",
          errorMessage: "API rate limit exceeded",
          aiModel: "unknown",
          promptVersion: "unknown",
          cacheHit: false,
        })
      );
    });

    it("should handle mutation errors gracefully", async () => {
      mockMutation.mockRejectedValueOnce(new Error("Network error"));

      // Should not throw
      await expect(
        service.trackSummaryGeneration({
          book: mockBook,
          summaryType: "concise",
          result: mockSuccessResult,
          cacheHit: false,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("categorizeError", () => {
    it("should categorize rate limit errors", () => {
      const error = new Error("Rate limit exceeded");
      const category = (service as any).categorizeError(error);
      expect(category).toBe("rate_limit");
    });

    it("should categorize API errors", () => {
      const error = new Error("API key invalid");
      const category = (service as any).categorizeError(error);
      expect(category).toBe("auth_error");
    });

    it("should categorize network errors", () => {
      const error = new Error("network connection failed");
      const category = (service as any).categorizeError(error);
      expect(category).toBe("network_error");
    });

    it("should default to unknown for unrecognized errors", () => {
      const error = new Error("Some random error");
      const category = (service as any).categorizeError(error);
      expect(category).toBe("unknown_error");
    });
  });
});
