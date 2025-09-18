"use client";

import React from "react";
import { SearchInput } from "@/components/search/SearchInput";
import { BookCard, type Book } from "@/components/search/BookCard";
import {
  ResultsList,
  type SearchResults,
} from "@/components/search/ResultsList";
import { ThemeProvider } from "@/providers/ThemeProvider";

/**
 * Visual Test Harness
 *
 * This page provides isolated component rendering for visual regression tests.
 * Each component is rendered in different states for screenshot comparison.
 */

// Mock book data for visual testing
const mockBook: Book = {
  id: "test-book-1",
  title: "The Art of Clean Code",
  authors: ["Robert C. Martin", "John Doe"],
  description:
    "A comprehensive guide to writing clean, maintainable code that stands the test of time. This book covers principles, patterns, and practices.",
  coverImage: "https://via.placeholder.com/128x192/4F46E5/white?text=Book",
  publishedDate: "2023",
  pageCount: 432,
  categories: ["Programming", "Software Engineering"],
  rating: 4.5,
  ratingsCount: 1234,
  links: {
    preview: "https://example.com/preview",
    info: "https://example.com/info",
  },
};

const mockBooks: Book[] = Array.from({ length: 6 }, (_, i) => ({
  ...mockBook,
  id: `test-book-${i + 1}`,
  title: `Book Title ${i + 1}`,
  authors: [`Author ${i + 1}`],
}));

// Mock search results for ResultsList
const mockSearchResults: SearchResults = {
  books: mockBooks,
  pagination: {
    currentPage: 0,
    totalPages: 3,
    pageSize: 20,
    totalItems: 60,
    hasNextPage: true,
    hasPrevPage: false,
  },
  query: "programming",
  searchTime: 245,
};

const mockEmptyResults: SearchResults = {
  books: [],
  pagination: {
    currentPage: 0,
    totalPages: 0,
    pageSize: 20,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
  query: "nonexistentbook123456",
  searchTime: 125,
};

interface ComponentTestProps {
  componentName: string;
  variant?: string;
  state?: string;
}

function ComponentTest({ componentName, variant, state }: ComponentTestProps) {
  const testId = `${componentName}${variant ? `-${variant}` : ""}${state ? `-${state}` : ""}`;

  switch (componentName) {
    case "search-input":
      return (
        <div data-testid={testId}>
          <SearchInput
            placeholder="Search for books..."
            variant={variant as "default" | "compact"}
            onSearch={() => {}}
          />
        </div>
      );

    case "book-card":
      return (
        <div data-testid={testId}>
          <BookCard
            book={mockBook}
            variant={variant as "default" | "compact" | "detailed"}
            onFavoriteToggle={() => {}}
            isFavorite={state === "favorite"}
            isLoading={state === "loading"}
          />
        </div>
      );

    case "results-list":
      if (state === "loading") {
        return (
          <div data-testid={testId}>
            <ResultsList
              isLoading={true}
              variant={variant as "grid" | "list" | "compact"}
            />
          </div>
        );
      }

      if (state === "empty") {
        return (
          <div data-testid={testId}>
            <ResultsList
              results={mockEmptyResults}
              isLoading={false}
              variant={variant as "grid" | "list" | "compact"}
            />
          </div>
        );
      }

      return (
        <div data-testid={testId}>
          <ResultsList
            results={mockSearchResults}
            isLoading={false}
            variant={variant as "grid" | "list" | "compact"}
          />
        </div>
      );

    default:
      return <div>Component not found: {componentName}</div>;
  }
}

export default function VisualTestHarness() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto py-8 space-y-12">
          <h1 className="text-3xl font-bold text-center">
            Visual Test Harness
          </h1>

          <section>
            <h2 className="text-2xl font-semibold mb-6">
              SearchInput Components
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-medium mb-4">Default State</h3>
                <ComponentTest componentName="search-input" />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Compact Variant</h3>
                <ComponentTest componentName="search-input" variant="compact" />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Error State</h3>
                <ComponentTest componentName="search-input" state="error" />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Loading State</h3>
                <ComponentTest componentName="search-input" state="loading" />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-6">BookCard Components</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-medium mb-4">Default Variant</h3>
                <ComponentTest componentName="book-card" variant="default" />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Compact Variant</h3>
                <ComponentTest componentName="book-card" variant="compact" />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Favorite State</h3>
                <ComponentTest
                  componentName="book-card"
                  variant="default"
                  state="favorite"
                />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Loading State</h3>
                <ComponentTest
                  componentName="book-card"
                  variant="default"
                  state="loading"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-6">
              ResultsList Components
            </h2>
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium mb-4">Grid Layout</h3>
                <ComponentTest componentName="results-list" variant="grid" />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Loading State</h3>
                <ComponentTest componentName="results-list" state="loading" />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Empty State</h3>
                <ComponentTest componentName="results-list" state="empty" />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">With Pagination</h3>
                <ComponentTest
                  componentName="results-list"
                  state="pagination"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-6">Theme Variations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 border rounded-lg">
                <h3 className="text-lg font-medium mb-4">
                  Light Theme Components
                </h3>
                <div className="space-y-4">
                  <ComponentTest componentName="search-input" />
                  <ComponentTest componentName="book-card" variant="default" />
                </div>
              </div>

              <div className="p-6 border rounded-lg bg-slate-900 text-white">
                <h3 className="text-lg font-medium mb-4">Dark Theme Preview</h3>
                <div className="space-y-4">
                  <div className="text-sm text-slate-400">
                    Switch to dark theme in browser to test
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-6">Responsive Testing</h2>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Resize browser window to test responsive behavior:
              </div>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Mobile: 375px width</li>
                <li>Tablet: 768px width</li>
                <li>Desktop: 1200px+ width</li>
              </ul>

              <div className="grid grid-cols-1 gap-4">
                <ComponentTest componentName="results-list" variant="grid" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </ThemeProvider>
  );
}
