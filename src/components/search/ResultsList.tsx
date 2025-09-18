"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  BookOpen,
  Loader2,
} from "lucide-react";
import { BookCard, type Book } from "./BookCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Pagination information
export interface PaginationInfo {
  /** Current page number (0-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Whether there are more pages available */
  hasNextPage: boolean;
  /** Whether there are previous pages available */
  hasPrevPage: boolean;
}

// Search results structure
export interface SearchResults {
  /** Array of books returned from search */
  books: Book[];
  /** Pagination information */
  pagination: PaginationInfo;
  /** The query that generated these results */
  query?: string;
  /** Total time taken for search (in ms) */
  searchTime?: number;
}

interface ResultsListProps {
  /** Search results to display */
  results?: SearchResults;
  /** Loading state for async search operations */
  isLoading?: boolean;
  /** Error message if search failed */
  error?: string | null;
  /** Layout variant for different contexts */
  variant?: "grid" | "list" | "compact";
  /** Number of skeleton cards to show during loading */
  skeletonCount?: number;
  /** Whether books are favorited (for favorite toggle state) */
  favoriteBookIds?: Set<string>;
  /** Callback when a book is clicked */
  onBookClick?: (book: Book) => void;
  /** Callback when favorite status changes */
  onFavoriteToggle?: (bookId: string, isFavorite: boolean) => void;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show search metadata (time, count, etc.) */
  showMetadata?: boolean;
}

/**
 * Search results container with responsive grid layout and pagination.
 *
 * Why this architecture:
 * - Flexible layout variants accommodate different use cases
 * - Comprehensive loading and error states provide smooth UX
 * - Pagination is decoupled from data fetching for reusability
 * - Responsive grid ensures optimal display across devices
 * - Accessible navigation and keyboard support
 */
export const ResultsList: React.FC<ResultsListProps> = ({
  results,
  isLoading = false,
  error = null,
  variant = "grid",
  skeletonCount = 12,
  favoriteBookIds = new Set(),
  onBookClick,
  onFavoriteToggle,
  onPageChange,
  className,
  showMetadata = true,
}) => {
  const books = results?.books || [];
  const pagination = results?.pagination;
  const hasResults = books.length > 0;

  // Handle page navigation
  const handlePageChange = (newPage: number) => {
    if (onPageChange && pagination && newPage !== pagination.currentPage) {
      onPageChange(newPage);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = (): number[] => {
    if (!pagination) return [];

    const { currentPage, totalPages } = pagination;
    const pageNumbers: number[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 0; i < totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Show pages around current page
      const start = Math.max(0, currentPage - 2);
      const end = Math.min(totalPages - 1, start + maxVisible - 1);

      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }

      // Add ellipsis and first/last pages if needed
      if (start > 0) {
        pageNumbers.unshift(-1); // -1 represents ellipsis
        pageNumbers.unshift(0);
      }

      if (end < totalPages - 1) {
        pageNumbers.push(-2); // -2 represents ellipsis
        pageNumbers.push(totalPages - 1);
      }
    }

    return pageNumbers;
  };

  // Render grid layout styles based on variant
  const getGridClasses = () => {
    switch (variant) {
      case "list":
        return "grid grid-cols-1 gap-4";
      case "compact":
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3";
      case "grid":
      default:
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6";
    }
  };

  // Render error state
  if (error && !isLoading) {
    return (
      <div className={cn("w-full", className)}>
        <Card className="border-destructive/20">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-destructive/50 mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">
              Search Error
            </h3>
            <p className="text-muted-foreground max-w-md">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className={cn("w-full", className)}>
        {showMetadata && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Searching...</span>
            </div>
          </div>
        )}

        <div className={getGridClasses()}>
          {Array.from({ length: skeletonCount }, (_, index) => (
            <BookCard
              key={index}
              book={{ id: `skeleton-${index}`, title: "", authors: "" }}
              isLoading
              variant={
                variant === "list"
                  ? "default"
                  : variant === "compact"
                    ? "compact"
                    : "default"
              }
            />
          ))}
        </div>
      </div>
    );
  }

  // Render empty state
  if (!hasResults && !isLoading) {
    return (
      <div className={cn("w-full", className)}>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground/50 mb-6" />
            <h3 className="text-xl font-semibold mb-2">No books found</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              {results?.query
                ? `No results found for "${results.query}". Try adjusting your search terms.`
                : "Start typing to search for books."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 text-sm text-muted-foreground">
              <span>• Try different keywords</span>
              <span>• Check your spelling</span>
              <span>• Use more general terms</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Search Metadata */}
      {showMetadata && results && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="text-sm text-muted-foreground">
            {pagination && (
              <span>
                Showing {pagination.currentPage * pagination.pageSize + 1}-
                {Math.min(
                  (pagination.currentPage + 1) * pagination.pageSize,
                  pagination.totalItems
                )}{" "}
                of {pagination.totalItems.toLocaleString()} results
                {results.query && (
                  <>
                    {" "}
                    for <span className="font-medium">"{results.query}"</span>
                  </>
                )}
              </span>
            )}
          </div>

          {results.searchTime && (
            <div className="text-xs text-muted-foreground">
              Search completed in {results.searchTime}ms
            </div>
          )}
        </div>
      )}

      {/* Results Grid */}
      <div className={getGridClasses()}>
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            variant={
              variant === "list"
                ? "detailed"
                : variant === "compact"
                  ? "compact"
                  : "default"
            }
            isFavorite={favoriteBookIds.has(book.id)}
            onClick={onBookClick}
            onFavoriteToggle={onFavoriteToggle}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t">
          {/* Page Info */}
          <div className="text-sm text-muted-foreground">
            Page {pagination.currentPage + 1} of {pagination.totalPages}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((pageNum, index) => {
                if (pageNum === -1 || pageNum === -2) {
                  // Ellipsis
                  return (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-2 text-muted-foreground"
                    >
                      ...
                    </span>
                  );
                }

                const isActive = pageNum === pagination.currentPage;

                return (
                  <Button
                    key={pageNum}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className={cn(
                      "min-w-[2.5rem]",
                      isActive && "pointer-events-none"
                    )}
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
            </div>

            {/* Next Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="flex items-center gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
