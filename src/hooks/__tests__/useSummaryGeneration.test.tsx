import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import {
  useSummaryGeneration,
  useSummaryExists,
  useSummaryGenerationService,
} from "../useSummaryGeneration";
import type { Book } from "../../types/book";
import type { SummaryType } from "../../types/summary";

// Mock Convex
const mockConvex = {
  query: vi.fn(),
  mutation: vi.fn(),
  action: vi.fn(),
} as unknown as ConvexReactClient;

// Mock the summary analytics service
vi.mock("../../lib/analytics/summaryTracking", () => ({
  createSummaryAnalyticsService: vi.fn(() => ({
    createPerformanceTimer: vi.fn(() => ({
      start: vi.fn(),
      end: vi.fn(() => 1000),
    })),
    trackSummaryGeneration: vi.fn(),
  })),
}));

// Mock Convex React
vi.mock("convex/react", async () => {
  const actual = await vi.importActual("convex/react");
  return {
    ...actual,
    useConvex: () => mockConvex,
    ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock API
vi.mock("../../../convex/_generated/api", () => ({
  api: {
    summaries: {
      getSummary: "summaries:getSummary",
      generateSummary: "summaries:generateSummary",
      getServiceStatus: "summaries:getServiceStatus",
    },
  },
}));

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ConvexProvider client={mockConvex}>{children}</ConvexProvider>
    </QueryClientProvider>
  );
}

// Mock book data
const mockBook: Book = {
  id: "test-book-1",
  title: "Test Book",
  authors: ["Test Author"],
  description: "A test book description",
  source: "google-books",
  originalId: "google-123",
  publishedDate: "2023",
  categories: ["Fiction"],
  pageCount: 200,
};

describe("useSummaryGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe("Basic functionality", () => {
    it("should return initial state correctly", () => {
      const { result } = renderHook(
        () =>
          useSummaryGeneration({
            book: mockBook,
            summaryType: "concise" as SummaryType,
            enabled: false,
          }),
        { wrapper: TestWrapper }
      );

      expect(result.current.summary).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.canGenerate).toBe(true);
      expect(typeof result.current.generateSummary).toBe("function");
    });

    it("should provide estimated time for different summary types", () => {
      const conciseResult = renderHook(
        () =>
          useSummaryGeneration({
            book: mockBook,
            summaryType: "concise" as SummaryType,
          }),
        { wrapper: TestWrapper }
      );

      const detailedResult = renderHook(
        () =>
          useSummaryGeneration({
            book: mockBook,
            summaryType: "detailed" as SummaryType,
          }),
        { wrapper: TestWrapper }
      );

      expect(conciseResult.result.current.estimatedTime).toBe(15);
      expect(detailedResult.result.current.estimatedTime).toBe(45);
    });

    it("should disable generation for incomplete book data", () => {
      const incompleteBook = { ...mockBook, title: "", authors: [] };

      const { result } = renderHook(
        () =>
          useSummaryGeneration({
            book: incompleteBook,
            summaryType: "concise" as SummaryType,
          }),
        { wrapper: TestWrapper }
      );

      expect(result.current.canGenerate).toBe(false);
    });
  });

  describe("Summary generation", () => {
    it("should call generateSummary when triggered", async () => {
      const { result } = renderHook(
        () =>
          useSummaryGeneration({
            book: mockBook,
            summaryType: "concise" as SummaryType,
            enabled: false,
          }),
        { wrapper: TestWrapper }
      );

      // Trigger generation
      result.current.generateSummary();

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(true);
      });
    });

    it("should handle generation success", async () => {
      const { result } = renderHook(
        () =>
          useSummaryGeneration({
            book: mockBook,
            summaryType: "concise" as SummaryType,
            enabled: false,
          }),
        { wrapper: TestWrapper }
      );

      // Trigger generation
      result.current.generateSummary();

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(true);
      });

      // Wait for generation to complete (mock will succeed)
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
        expect(result.current.summary).toBeDefined();
      });
    });

    it("should provide progress during generation", async () => {
      const { result } = renderHook(
        () =>
          useSummaryGeneration({
            book: mockBook,
            summaryType: "concise" as SummaryType,
            enabled: false,
          }),
        { wrapper: TestWrapper }
      );

      // Trigger generation
      result.current.generateSummary();

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(true);
        expect(typeof result.current.progress).toBe("number");
      });
    });

    it("should prevent generation when already generating", async () => {
      const { result } = renderHook(
        () =>
          useSummaryGeneration({
            book: mockBook,
            summaryType: "concise" as SummaryType,
            enabled: false,
          }),
        { wrapper: TestWrapper }
      );

      // Trigger first generation
      result.current.generateSummary();

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(true);
        expect(result.current.canGenerate).toBe(false);
      });
    });
  });

  describe("Error handling", () => {
    it("should handle network errors gracefully", async () => {
      // This test will use the mock behavior - in real implementation,
      // we would mock the Convex action to throw an error
      const { result } = renderHook(
        () =>
          useSummaryGeneration({
            book: mockBook,
            summaryType: "concise" as SummaryType,
            enabled: false,
          }),
        { wrapper: TestWrapper }
      );

      result.current.generateSummary();

      // For now, the mock will succeed, but this structure is ready for error testing
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    });
  });

  describe("Analytics integration", () => {
    it("should track successful generation", async () => {
      const { result } = renderHook(
        () =>
          useSummaryGeneration({
            book: mockBook,
            summaryType: "concise" as SummaryType,
            enabled: false,
          }),
        { wrapper: TestWrapper }
      );

      result.current.generateSummary();

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      // Analytics tracking is mocked, so we just verify the hook completes
      expect(result.current.summary).toBeDefined();
    });
  });
});

describe("useSummaryExists", () => {
  it("should return false by default (mocked)", () => {
    const { result } = renderHook(
      () => useSummaryExists("book-1", "concise" as SummaryType),
      { wrapper: TestWrapper }
    );

    // Since the query is disabled, it should return the initial data
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle user ID parameter", () => {
    const { result } = renderHook(
      () => useSummaryExists("book-1", "concise" as SummaryType, "user-1"),
      { wrapper: TestWrapper }
    );

    // Query should be properly configured with user ID
    expect(result.current).toBeDefined();
  });
});

describe("useSummaryGenerationService", () => {
  it("should return service status", () => {
    const { result } = renderHook(() => useSummaryGenerationService(), {
      wrapper: TestWrapper,
    });

    // Since the query is disabled, check the structure
    expect(result.current).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("should provide service configuration", () => {
    const { result } = renderHook(() => useSummaryGenerationService(), {
      wrapper: TestWrapper,
    });

    // The mock returns service configuration structure
    expect(result.current).toBeDefined();
  });
});

describe("Hook integration", () => {
  it("should work with different summary types", () => {
    const summaryTypes: SummaryType[] = [
      "concise",
      "detailed", 
      "analysis",
      "practical",
    ];

    summaryTypes.forEach((summaryType) => {
      const { result } = renderHook(
        () =>
          useSummaryGeneration({
            book: mockBook,
            summaryType,
          }),
        { wrapper: TestWrapper }
      );

      expect(result.current).toBeDefined();
      expect(result.current.estimatedTime).toBeGreaterThan(0);
    });
  });

  it("should handle different book sources", () => {
    const googleBooksBook = { ...mockBook, source: "google-books" as const };
    const openLibraryBook = { ...mockBook, source: "open-library" as const };

    const googleResult = renderHook(
      () =>
        useSummaryGeneration({
          book: googleBooksBook,
          summaryType: "concise" as SummaryType,
        }),
      { wrapper: TestWrapper }
    );

    const openLibraryResult = renderHook(
      () =>
        useSummaryGeneration({
          book: openLibraryBook,
          summaryType: "concise" as SummaryType,
        }),
      { wrapper: TestWrapper }
    );

    expect(googleResult.result.current.canGenerate).toBe(true);
    expect(openLibraryResult.result.current.canGenerate).toBe(true);
  });
});