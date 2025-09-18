import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React, { type ReactNode } from "react";

import { useBookSearch } from "../useBookSearch";
import { createUnifiedSearchService } from "../../services/searchService";
import type { SearchResults } from "../../types/book";

// Mock the search service
vi.mock("../../services/searchService", () => ({
  createUnifiedSearchService: vi.fn(),
}));

// Mock Convex
vi.mock("convex/react", () => ({
  useConvex: vi.fn(() => ({})),
}));

// Mock search analytics
vi.mock("../../lib/analytics/searchTracking", () => ({
  createSearchAnalyticsService: vi.fn(() => ({
    createSearchTimer: () => ({
      start: vi.fn(),
      end: vi.fn(() => 150),
    }),
  })),
}));

// Create test wrapper for React Query
function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  return function TestWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// Mock search results
const mockSearchResults: SearchResults = {
  books: [
    {
      id: "test-book-1",
      title: "Test Book 1",
      authors: ["Test Author 1"],
      source: "google-books",
      originalId: "original-1",
    },
  ],
  totalItems: 1,
  startIndex: 0,
  itemsPerPage: 1,
  hasMore: false,
  query: "test query",
  source: "combined",
};

describe("useBookSearch - Simplified", () => {
  let mockSearchService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSearchService = {
      searchBooks: vi.fn(),
      isConfigured: vi.fn(() => true),
      getRateLimit: vi.fn(() => ({ hasKey: true, unlimited: false })),
    };

    vi.mocked(createUnifiedSearchService).mockReturnValue(mockSearchService);
  });

  describe("Basic Functionality", () => {
    it("should return initial state when not searching", () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useBookSearch(), { wrapper });

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should trigger search when query is provided", async () => {
      mockSearchService.searchBooks.mockResolvedValue(mockSearchResults);
      const wrapper = createTestWrapper();

      const { result } = renderHook(
        () => useBookSearch({ query: "test query" }),
        { wrapper }
      );

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 }
      );

      expect(mockSearchService.searchBooks).toHaveBeenCalledWith({
        query: "test query",
        maxResults: 20,
        startIndex: 0,
      });
      expect(result.current.data).toEqual(mockSearchResults);
    });

    it("should handle search errors", async () => {
      const searchError = new Error("Search failed");
      mockSearchService.searchBooks.mockRejectedValue(searchError);
      const wrapper = createTestWrapper();

      const { result } = renderHook(() => useBookSearch({ query: "test" }), {
        wrapper,
      });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 3000 }
      );

      expect(result.current.error).toBeTruthy();
    });
  });

  describe("Query Parameters", () => {
    it("should pass search parameters correctly", async () => {
      mockSearchService.searchBooks.mockResolvedValue(mockSearchResults);
      const wrapper = createTestWrapper();

      const searchParams = {
        query: "advanced search",
        maxResults: 40,
        startIndex: 10,
      };

      renderHook(() => useBookSearch(searchParams), { wrapper });

      await waitFor(
        () => {
          expect(mockSearchService.searchBooks).toHaveBeenCalledWith(
            searchParams
          );
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Loading States", () => {
    it("should show loading state during search", async () => {
      let resolveSearch: (value: SearchResults) => void;
      const searchPromise = new Promise<SearchResults>((resolve) => {
        resolveSearch = resolve;
      });
      mockSearchService.searchBooks.mockReturnValue(searchPromise);

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useBookSearch({ query: "test" }), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      resolveSearch!(mockSearchResults);

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 }
      );

      expect(result.current.data).toEqual(mockSearchResults);
    });
  });
});
