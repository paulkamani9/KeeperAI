import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React, { type ReactNode } from "react";

import { useBookSearch } from "../useBookSearch";
import { createUnifiedSearchService } from "../../services/searchService";
import type { SearchResults, SearchParams } from "../../types/book";

// Mock the search service
vi.mock("../../services/searchService", () => ({
  createUnifiedSearchService: vi.fn(),
}));

// Create test wrapper for React Query
function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: 0, // Don't cache in tests
        staleTime: 0, // Don't use stale data in tests
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
      description: "Test description 1",
      source: "google-books",
      originalId: "original-1",
      thumbnail: "https://example.com/thumb1.jpg",
      publishedDate: "2024-01-01",
      categories: ["Fiction"],
      averageRating: 4.5,
      ratingsCount: 100,
    },
    {
      id: "test-book-2",
      title: "Test Book 2",
      authors: ["Test Author 2"],
      source: "open-library",
      originalId: "original-2",
    },
  ],
  totalItems: 2,
  startIndex: 0,
  itemsPerPage: 2,
  hasMore: false,
  query: "test query",
  source: "combined",
};

const emptySearchResults: SearchResults = {
  books: [],
  totalItems: 0,
  startIndex: 0,
  itemsPerPage: 0,
  hasMore: false,
  query: "empty query",
  source: "google-books",
};

describe("useBookSearch", () => {
  let mockSearchService: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock search service
    mockSearchService = {
      searchBooks: vi.fn(),
      isConfigured: vi.fn(() => true),
      getRateLimit: vi.fn(() => ({ hasKey: true, unlimited: false })),
    };

    vi.mocked(createUnifiedSearchService).mockReturnValue(mockSearchService);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Basic Functionality", () => {
    it("should return initial state when not searching", () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useBookSearch(), { wrapper });

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isSearching).toBe(false);
    });

    it("should not trigger search without query", () => {
      const wrapper = createTestWrapper();
      renderHook(() => useBookSearch(), { wrapper });

      expect(mockSearchService.searchBooks).not.toHaveBeenCalled();
    });

    it("should trigger search when query is provided", async () => {
      mockSearchService.searchBooks.mockResolvedValue(mockSearchResults);
      const wrapper = createTestWrapper();

      const { result } = renderHook(
        () => useBookSearch({ query: "test query" }),
        { wrapper }
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSearchService.searchBooks).toHaveBeenCalledWith({
        query: "test query",
        maxResults: 20,
        startIndex: 0,
      });
      expect(result.current.data).toEqual(mockSearchResults);
      expect(result.current.error).toBeNull();
    });

    it("should trigger search when enabled is true", async () => {
      mockSearchService.searchBooks.mockResolvedValue(mockSearchResults);
      const wrapper = createTestWrapper();

      renderHook(() => useBookSearch({ query: "test", enabled: true }), {
        wrapper,
      });

      await waitFor(() => {
        expect(mockSearchService.searchBooks).toHaveBeenCalled();
      });
    });

    it("should not trigger search when enabled is false", () => {
      const wrapper = createTestWrapper();

      renderHook(() => useBookSearch({ query: "test", enabled: false }), {
        wrapper,
      });

      expect(mockSearchService.searchBooks).not.toHaveBeenCalled();
    });
  });

  describe("Query Parameters", () => {
    it("should pass all search parameters correctly", async () => {
      mockSearchService.searchBooks.mockResolvedValue(mockSearchResults);
      const wrapper = createTestWrapper();

      const searchParams = {
        query: "advanced search",
        maxResults: 40,
        startIndex: 10,
        searchIn: "title" as const,
        language: "en",
        publishedAfter: 2020,
        publishedBefore: 2024,
      };

      renderHook(() => useBookSearch(searchParams), { wrapper });

      await waitFor(() => {
        expect(mockSearchService.searchBooks).toHaveBeenCalledWith(
          searchParams
        );
      });
    });

    it("should use default values for optional parameters", async () => {
      mockSearchService.searchBooks.mockResolvedValue(mockSearchResults);
      const wrapper = createTestWrapper();

      renderHook(() => useBookSearch({ query: "test" }), { wrapper });

      await waitFor(() => {
        expect(mockSearchService.searchBooks).toHaveBeenCalledWith({
          query: "test",
          maxResults: 20,
          startIndex: 0,
        });
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle search service errors", async () => {
      const searchError = new Error("Search service failed");
      mockSearchService.searchBooks.mockRejectedValue(searchError);
      const wrapper = createTestWrapper();

      const { result } = renderHook(() => useBookSearch({ query: "test" }), {
        wrapper,
      });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 2000 }
      );

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe("Search service failed");
      expect(result.current.data).toBeUndefined();
    });

    it("should handle API rate limit errors", async () => {
      const rateLimitError = new Error("Rate limit exceeded");
      rateLimitError.name = "RateLimitError";
      mockSearchService.searchBooks.mockRejectedValue(rateLimitError);
      const wrapper = createTestWrapper();

      const { result } = renderHook(() => useBookSearch({ query: "test" }), {
        wrapper,
      });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 2000 }
      );

      expect(result.current.error?.message).toBe(
        "Too many requests. Please try again in a moment."
      );
    });

    it("should handle network errors gracefully", async () => {
      const networkError = new Error("Network error");
      networkError.name = "NetworkError";
      mockSearchService.searchBooks.mockRejectedValue(networkError);
      const wrapper = createTestWrapper();

      const { result } = renderHook(() => useBookSearch({ query: "test" }), {
        wrapper,
      });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 2000 }
      );

      expect(result.current.error?.message).toBe(
        "Network error. Please check your connection."
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
      expect(result.current.isSearching).toBe(true);

      // Resolve the promise
      resolveSearch!(mockSearchResults);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSearching).toBe(false);
      expect(result.current.data).toEqual(mockSearchResults);
    });

    it("should have correct loading state for subsequent queries", async () => {
      mockSearchService.searchBooks.mockResolvedValue(mockSearchResults);
      const wrapper = createTestWrapper();

      const { result, rerender } = renderHook(
        ({ query }) => useBookSearch({ query }),
        {
          wrapper,
          initialProps: { query: "first query" },
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Change query to trigger new search
      rerender({ query: "second query" });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(true);
    });
  });

  describe("Cache Key Generation", () => {
    it("should generate consistent cache keys for same parameters", async () => {
      mockSearchService.searchBooks.mockResolvedValue(mockSearchResults);
      const wrapper = createTestWrapper();

      const params = { query: "test", maxResults: 20, startIndex: 0 };

      // First render
      const { result: result1 } = renderHook(() => useBookSearch(params), {
        wrapper,
      });

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
      });

      // Second render with same params
      const { result: result2 } = renderHook(() => useBookSearch(params), {
        wrapper,
      });

      // Should use cached result, not trigger new search
      expect(mockSearchService.searchBooks).toHaveBeenCalledTimes(1);
      expect(result2.current.data).toEqual(mockSearchResults);
    });

    it("should generate different cache keys for different parameters", async () => {
      mockSearchService.searchBooks
        .mockResolvedValueOnce(mockSearchResults)
        .mockResolvedValueOnce(emptySearchResults);

      const wrapper = createTestWrapper();

      // First search
      const { result: result1 } = renderHook(
        () => useBookSearch({ query: "first" }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
      });

      // Second search with different query
      const { result: result2 } = renderHook(
        () => useBookSearch({ query: "second" }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false);
      });

      // Should have triggered two separate searches
      expect(mockSearchService.searchBooks).toHaveBeenCalledTimes(2);
    });
  });

  describe("Empty Results Handling", () => {
    it("should handle empty search results", async () => {
      mockSearchService.searchBooks.mockResolvedValue(emptySearchResults);
      const wrapper = createTestWrapper();

      const { result } = renderHook(
        () => useBookSearch({ query: "nonexistent book" }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(emptySearchResults);
      expect(result.current.data?.books).toHaveLength(0);
      expect(result.current.error).toBeNull();
    });
  });

  describe("Service Configuration", () => {
    it("should handle unconfigured service", async () => {
      mockSearchService.isConfigured.mockReturnValue(false);
      const configError = new Error("Search service not configured");
      mockSearchService.searchBooks.mockRejectedValue(configError);

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useBookSearch({ query: "test" }), {
        wrapper,
      });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 2000 }
      );

      expect(result.current.error?.message).toBe(
        "Search service is not available at the moment."
      );
    });
  });

  describe("Debouncing", () => {
    it("should provide isSearching state for UI feedback", async () => {
      let resolveSearch: (value: SearchResults) => void;
      const searchPromise = new Promise<SearchResults>((resolve) => {
        resolveSearch = resolve;
      });
      mockSearchService.searchBooks.mockReturnValue(searchPromise);

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useBookSearch({ query: "test" }), {
        wrapper,
      });

      expect(result.current.isSearching).toBe(true);

      resolveSearch!(mockSearchResults);

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false);
      });
    });
  });
});
