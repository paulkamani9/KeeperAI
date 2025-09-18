"use client";

import { useSearchParams } from "next/navigation";
import { SearchInput } from "@/components/search/SearchInput";
import { ResultsList } from "@/components/search/ResultsList";
import MainContent from "@/components/layout/MainContent";

/**
 * Search view for displaying search results with query refinement
 *
 * Features:
 * - Search input for query refinement at the top
 * - Results display with multiple layout options
 * - Clean, focused design prioritizing search functionality
 */
export const SearchView = () => {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  // TODO: Replace with actual search hook/API integration
  // For now, showing loading state to demonstrate the component
  const isSearching = query.length > 0;

  return (
    <MainContent maxWidth="full" padding="lg">
      {/* Search Header */}
      <div className="mb-8">
        <SearchInput
          defaultValue={query}
          placeholder="Search for books..."
          variant="compact"
          className="max-w-2xl  w-full -[50%]"
        />
      </div>

      {/* Search Results */}
      <ResultsList
        isLoading={isSearching}
        // TODO: Pass actual search results here
        // results={searchResults}
        // error={searchError}
        // onBookClick={handleBookClick}
        // onFavoriteToggle={handleFavoriteToggle}
        // onPageChange={handlePageChange}
        className="mt-6"
      />
    </MainContent>
  );
};
