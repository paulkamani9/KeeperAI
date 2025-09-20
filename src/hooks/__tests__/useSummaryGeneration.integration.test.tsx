/**
 * Integration Test: Summary End-to-End Flow
 *
 * Tests the complete summary generation flow:
 * 1. Generate AI summary using existing service
 * 2. Persist summary in Convex database
 * 3. Retrieve summary from database
 * 4. Display summary on reading page
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { useSummaryGeneration } from "../useSummaryGeneration";
import type { Book } from "../../types/book";
import type { SummaryType } from "../../types/summary";

// Mock the Convex client
const mockConvex = {
  query: vi.fn(),
  mutation: vi.fn(),
};

// Mock the summary service
vi.mock("../../services/summaryService", () => ({
  createDefaultSummaryService: () => ({
    generateSummary: vi.fn().mockResolvedValue({
      content: "This is a mock AI-generated summary of the book.",
      generationTime: 2500,
      aiModel: "gpt-4o-mini",
      promptVersion: "v1.0",
      usage: {
        promptTokens: 150,
        completionTokens: 200,
        totalTokens: 350,
        estimatedCost: 0.0001,
      },
      metadata: {
        bookDataSource: "google-books" as const,
        hadBookDescription: true,
        notes: "Generated successfully",
      },
    }),
    isConfigured: () => true,
    getRateLimit: () => ({ hasKey: true, requestsLeft: 100 }),
    getAvailableModels: () => ["gpt-4o-mini", "gpt-4"],
    testConnection: () => Promise.resolve(true),
  }),
}));

// Mock Convex React
vi.mock("convex/react", () => ({
  useConvex: () => mockConvex,
}));

// Mock analytics service
vi.mock("../../lib/analytics/summaryTracking", () => ({
  createSummaryAnalyticsService: () => ({
    createPerformanceTimer: () => ({
      start: vi.fn(),
      end: () => 2500,
    }),
    trackSummaryGeneration: vi.fn(),
  }),
}));

describe("Summary End-to-End Integration", () => {
  let queryClient: QueryClient;

  const mockBook: Book = {
    id: "test-book-123",
    title: "Test Book",
    authors: ["Test Author"],
    description: "A test book for summary generation",
    source: "google-books",
    originalId: "test-original-id",
    publishedDate: "2023",
    categories: ["Fiction"],
    pageCount: 200,
    thumbnail: "https://example.com/thumbnail.jpg",
    mediumThumbnail: "https://example.com/medium.jpg",
    largeThumbnail: "https://example.com/large.jpg",
    smallThumbnail: "https://example.com/small.jpg",
    previewLink: "https://example.com/preview",
    infoLink: "https://example.com/info",
    language: "en",
    averageRating: 4.2,
    ratingsCount: 150,
  };

  const summaryType: SummaryType = "concise";

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();

    // Mock successful Convex operations
    mockConvex.query.mockResolvedValue(null); // No existing summary
    mockConvex.mutation.mockResolvedValue("mock-summary-id-123");
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should complete the full summary generation and persistence flow", async () => {
    // Arrange
    const { result } = renderHook(
      () =>
        useSummaryGeneration({
          book: mockBook,
          summaryType,
          enabled: false, // Manual generation only
        }),
      { wrapper }
    );

    // Initial state should show no summary and ready to generate
    expect(result.current.summary).toBeUndefined();
    expect(result.current.canGenerate).toBe(true);
    expect(result.current.isGenerating).toBe(false);

    // Act - Trigger summary generation
    result.current.generateSummary();

    // Assert - Should start generating
    await waitFor(() => {
      expect(result.current.isGenerating).toBe(true);
    });

    // Assert - Should complete generation and persist to Convex
    await waitFor(
      () => {
        expect(result.current.isGenerating).toBe(false);
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.summary).toBeDefined();
      },
      { timeout: 5000 }
    );

    // Verify the summary was created with correct data
    const summary = result.current.summary!;
    expect(summary.content).toBe(
      "This is a mock AI-generated summary of the book."
    );
    expect(summary.bookId).toBe(mockBook.id);
    expect(summary.summaryType).toBe(summaryType);
    expect(summary.status).toBe("completed");
    expect(summary.aiModel).toBe("gpt-4o-mini");

    // Verify Convex operations were called correctly
    expect(mockConvex.query).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        bookId: mockBook.id,
        summaryType,
      })
    );

    expect(mockConvex.mutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        bookId: mockBook.id,
        summaryType,
        content: "This is a mock AI-generated summary of the book.",
        aiModel: "gpt-4o-mini",
        promptVersion: "v1.0",
      })
    );
  });

  it("should handle existing summaries correctly", async () => {
    // Arrange - Mock existing summary
    const existingSummary = {
      _id: "existing-summary-id",
      bookId: mockBook.id,
      summaryType,
      content: "Existing summary content",
      status: "completed",
      wordCount: 50,
      readingTime: 1,
      aiModel: "gpt-4o-mini",
      promptVersion: "v1.0",
      createdAt: Date.now() - 3600000, // 1 hour ago
      updatedAt: Date.now() - 3600000,
    };

    mockConvex.query.mockResolvedValue(existingSummary);

    // Act
    const { result } = renderHook(
      () =>
        useSummaryGeneration({
          book: mockBook,
          summaryType,
          enabled: true, // Auto-check for existing
        }),
      { wrapper }
    );

    // Assert - Should load existing summary
    await waitFor(() => {
      expect(result.current.summary).toBeDefined();
      expect(result.current.summary!.content).toBe("Existing summary content");
      expect(result.current.isSuccess).toBe(true);
    });

    // Should still be able to regenerate if needed
    expect(result.current.canGenerate).toBe(true);
  });

  it("should handle generation errors gracefully", async () => {
    // Arrange - Mock service failure
    vi.doMock("../../services/summaryService", () => ({
      createDefaultSummaryService: () => ({
        generateSummary: vi
          .fn()
          .mockRejectedValue(new Error("AI service temporarily unavailable")),
        isConfigured: () => true,
        getRateLimit: () => ({ hasKey: true }),
        getAvailableModels: () => ["gpt-4o-mini"],
        testConnection: () => Promise.resolve(false),
      }),
    }));

    // Also mock the Convex failure recording
    mockConvex.mutation.mockResolvedValue("failure-record-id");

    const { result } = renderHook(
      () =>
        useSummaryGeneration({
          book: mockBook,
          summaryType,
          enabled: false,
        }),
      { wrapper }
    );

    // Act - Trigger generation
    result.current.generateSummary();

    // Assert - Should handle error
    await waitFor(
      () => {
        expect(result.current.isGenerating).toBe(false);
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBeDefined();
      },
      { timeout: 5000 }
    );

    // Should still be able to retry
    expect(result.current.canGenerate).toBe(true);
  });
});
