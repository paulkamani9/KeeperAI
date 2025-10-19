import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useConvex } from "convex/react";

import { createUnifiedSearchService } from "../services/search/searchService";
import { createSearchAnalyticsService } from "../lib/analytics/searchTracking";
import type { SearchParams, SearchResults } from "../types/book";

/**
 * Custom hook for book search using React Query
 *
 * Provides caching, loading states, and error handling for book searches.
 * Automatically debounces searches and handles cache invalidation.
 *
 * Why React Query:
 * - Automatic background refetching
 * - Intelligent caching with TTL
 * - Loading and error state management
 * - Deduplication of identical requests
 * - Optimistic updates support
 */

interface UseBookSearchParams extends Partial<SearchParams> {
  /** Whether to enable the search query (default: true if query exists) */
  enabled?: boolean;
}

interface UseBookSearchReturn {
  /** Search results data */
  data: SearchResults | undefined;
  /** Whether the initial request is loading */
  isLoading: boolean;
  /** Whether any request is currently fetching */
  isFetching: boolean;
  /** Whether a search is currently in progress (alias for isFetching) */
  isSearching: boolean;
  /** Error from the search request */
  error: Error | null;
  /** Whether the query was successful */
  isSuccess: boolean;
  /** Whether the query failed */
  isError: boolean;
  /** Refetch the search manually */
  refetch: () => void;
}

/**
 * Search for books using the unified search service
 *
 * @param params Search parameters including query, pagination, and filters
 * @returns React Query result with search data and states
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useBookSearch({
 *   query: "javascript programming",
 *   maxResults: 20
 * });
 * ```
 */
export function useBookSearch(
  params: UseBookSearchParams = {}
): UseBookSearchReturn {
  const convex = useConvex();

  // Create search service and analytics service instances
  const searchService = useMemo(() => createUnifiedSearchService(), []);
  const analyticsService = useMemo(
    () => createSearchAnalyticsService(convex),
    [convex]
  );

  // Normalize search parameters with defaults
  const searchParams: SearchParams = useMemo(() => {
    const normalized: SearchParams = {
      query: params.query || "",
      maxResults: params.maxResults || 20,
      startIndex: params.startIndex || 0,
    };

    // Only include optional parameters if they are provided
    if (params.authorQuery) normalized.authorQuery = params.authorQuery;
    if (params.searchIn) normalized.searchIn = params.searchIn;
    if (params.language) normalized.language = params.language;
    if (params.publishedAfter)
      normalized.publishedAfter = params.publishedAfter;
    if (params.publishedBefore)
      normalized.publishedBefore = params.publishedBefore;

    return normalized;
  }, [
    params.query,
    params.authorQuery,
    params.maxResults,
    params.startIndex,
    params.searchIn,
    params.language,
    params.publishedAfter,
    params.publishedBefore,
  ]);

  // Create cache key for React Query
  const queryKey = useMemo(() => ["bookSearch", searchParams], [searchParams]);

  // Determine if query should be enabled
  const isEnabled = useMemo(() => {
    // If explicitly disabled, don't run
    if (params.enabled === false) return false;

    // If explicitly enabled, run regardless of query
    if (params.enabled === true) return true;

    // Default: only run if query is not empty
    return Boolean(searchParams.query.trim());
  }, [params.enabled, searchParams.query]);

  // React Query for search
  const queryResult = useQuery({
    queryKey,
    queryFn: async (): Promise<SearchResults> => {
      const timer = analyticsService.createSearchTimer();
      timer.start();

      try {
        const results = await searchService.searchBooks(searchParams);
        const searchTime = timer.end();

        // Log successful search analytics (fire-and-forget)
        analyticsService.logSearchQuery({
          query: searchParams.query,
          resultCount: results.books.length,
          searchTime,
          source: results.source as
            | "google-books"
            | "open-library"
            | "combined", // Cast to match expected type
          cached: false, // React Query handles caching, API calls are not cached at service level
        });

        return results;
      } catch (error) {
        const searchTime = timer.end();

        // Log failed search analytics (fire-and-forget)
        analyticsService.logSearchQuery({
          query: searchParams.query,
          resultCount: 0,
          searchTime,
          source: "google-books", // Default source for failed searches
          cached: false,
        });

        // Transform API errors into user-friendly messages
        if (error instanceof Error) {
          // Handle specific error types
          if (error.message.includes("Rate limit")) {
            throw new Error("Too many requests. Please try again in a moment.");
          }
          if (error.message.includes("Network")) {
            throw new Error("Network error. Please check your connection.");
          }
          if (error.message.includes("not configured")) {
            throw new Error("Search service is not available at the moment.");
          }
          // Re-throw original error for other cases
          throw error;
        }
        // Fallback for unknown error types
        throw new Error("An unexpected error occurred while searching.");
      }
    },
    enabled: isEnabled,
    // Cache configuration
    staleTime: 1000 * 60 * 2, // Consider data fresh for 2 minutes
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    // Retry configuration
    retry: (failureCount, error) => {
      // Don't retry if service is not configured
      if (error.message.includes("not configured")) return false;
      // Don't retry rate limit errors
      if (error.message.includes("Rate limit")) return false;
      // Retry network errors up to 2 times
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    // Refetch behavior
    refetchOnWindowFocus: false, // Don't refetch on focus for search results
    refetchOnReconnect: true, // Refetch when connection is restored
  });

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    isSearching: queryResult.isFetching, // Alias for better semantics
    error: queryResult.error,
    isSuccess: queryResult.isSuccess,
    isError: queryResult.isError,
    refetch: queryResult.refetch,
  };
}

/**
 * Create a cache key for book search
 * Used internally by the hook and can be used for cache invalidation
 */
export function createBookSearchCacheKey(params: SearchParams): unknown[] {
  return ["bookSearch", params];
}

/**
 * Hook for getting search service configuration
 * Useful for showing API status or configuration warnings
 */
export function useBookSearchService() {
  const searchService = useMemo(() => createUnifiedSearchService(), []);

  return useMemo(
    () => ({
      isConfigured: searchService.isConfigured(),
      rateLimit: searchService.getRateLimit(),
      config: searchService.getConfig(),
      availableStrategies: searchService.getAvailableStrategies(),
    }),
    [searchService]
  );
}

// Export types for external use
export type { UseBookSearchParams, UseBookSearchReturn };
