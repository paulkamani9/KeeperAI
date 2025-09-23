"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchInput } from "@/components/search/SearchInput";
import {
  ResultsList,
  type SearchResults as ComponentSearchResults,
  type PaginationInfo,
} from "@/components/search/ResultsList";
import MainContent from "@/components/layout/MainContent";
import { useBookSearch } from "@/hooks/useBookSearch";
import type { SearchResults as ApiSearchResults } from "@/types/book";

// Transform API SearchResults to component SearchResults
function transformSearchResults(
  apiResults?: ApiSearchResults
): ComponentSearchResults | undefined {
  if (!apiResults) return undefined;

  const pagination: PaginationInfo = {
    currentPage: Math.floor(
      apiResults.startIndex / (apiResults.itemsPerPage || 20)
    ),
    totalPages: Math.ceil(
      apiResults.totalItems / (apiResults.itemsPerPage || 20)
    ),
    pageSize: apiResults.itemsPerPage || 20,
    totalItems: apiResults.totalItems,
    hasNextPage: apiResults.hasMore,
    hasPrevPage: apiResults.startIndex > 0,
  };

  return {
    books: apiResults.books, // No transformation needed - use the standard Book type directly
    pagination,
    query: apiResults.query,
  };
}

/**
 * Search view for displaying search results with query refinement
 *
 * Features:
 * - Real-time search integration with useBookSearch hook
 * - URL state synchronization with search parameters
 * - Loading, error, and empty states handling
 * - Pagination support with query preservation
 * - Clean, focused design prioritizing search functionality
 *
 * Why this architecture:
 * - URL-driven state ensures shareable search links
 * - Debounced search prevents excessive API calls
 * - Modular components allow easy layout changes
 * - Proper error boundaries provide resilient UX
 */
export const SearchView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract search parameters from URL
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "0", 10);
  const maxResults = parseInt(searchParams.get("limit") || "20", 10);

  // hook for storing current page search params
  // so that user can always navigate back to this page from book detail view, even after viewing a book summary
  // without losing their search context
  useEffect(()=> {
    localStorage.setItem("lastSearchUrl", window.location.href)
  }, [router])


  // Search hook with URL-derived parameters
  const {
    data: searchResults,
    isLoading,
    error,
    isSearching,
  } = useBookSearch({
    query,
    startIndex: page * maxResults,
    maxResults,
    enabled: Boolean(query.trim()), // Only search if query exists
  });

  // Transform search results for component
  const transformedResults = useMemo(
    () => transformSearchResults(searchResults),
    [searchResults]
  );

  // Handle new search queries from SearchInput
  const handleSearch = useCallback(
    (newQuery: string) => {
      const params = new URLSearchParams(searchParams);

      if (newQuery.trim()) {
        params.set("q", newQuery.trim());
        params.delete("page"); // Reset to first page for new search
      } else {
        params.delete("q");
        params.delete("page");
      }

      router.push(`/search?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Handle pagination changes
  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams);

      if (newPage > 0) {
        params.set("page", newPage.toString());
      } else {
        params.delete("page");
      }

      router.push(`/search?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Handle favorite toggle - could integrate with favorites system
  const handleFavoriteToggle = useCallback(
    (bookId: string, isFavorite: boolean) => {
      // TODO: Integrate with favorites system when implemented
      console.log("Favorite toggled:", bookId, isFavorite);
    },
    []
  );

  // Format error message for display
  const errorMessage = error ? String(error.message || error) : null;

  return (
    <MainContent maxWidth="full" padding="lg">
      {/* Search Header */}
      <div id="search-header" className="mb-10 md:mb-0" />
      <div className="mb-8">
        <SearchInput
          defaultValue={query}
          placeholder="Search for books by title, author, or keyword..."
          variant="compact"
          className="max-w-2xl w-full mx-auto"
          onSearch={handleSearch}
        />
      </div>

      {/* Search Results */}
      <ResultsList
        results={transformedResults}
        isLoading={isLoading || isSearching}
        error={errorMessage}
        onFavoriteToggle={handleFavoriteToggle}
        onPageChange={handlePageChange}
        showMetadata={true}
        variant="grid"
        className="mt-6"
      />
    </MainContent>
  );
};
