/**
 * Performance Testing Suite
 *
 * This module provides performance benchmarks for:
 * - Search API response times
 * - Component render performance
 * - Memory usage validation
 * - Bundle size analysis
 *
 * Uses Vitest's built-in benchmark utilities and browser performance APIs.
 */

import { describe, bench, expect, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestWrapper } from "@/test/TestWrapper";
import { SearchInput } from "@/components/search/SearchInput";
import { BookCard, type Book } from "@/components/search/BookCard";
import { ResultsList } from "@/components/search/ResultsList";
import { createUnifiedSearchService } from "@/services/searchService";
import { server } from "@/test/mocks/server";

// Create search service instance for testing
const searchService = createUnifiedSearchService();

// Extend Performance interface to include memory property
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

// Mock book data for performance testing
const mockBook: Book = {
  id: "perf-test-book",
  title: "Performance Testing Guide",
  authors: ["Performance Expert"],
  description: "A comprehensive guide to performance testing and optimization.",
  coverImage: "https://via.placeholder.com/128x192/4F46E5/white?text=Book",
  publishedDate: "2023",
  pageCount: 300,
  rating: 4.2,
  ratingsCount: 856,
  categories: ["Programming", "Testing"],
};

const generateMockBooks = (count: number): Book[] => {
  return Array.from({ length: count }, (_, i) => ({
    ...mockBook,
    id: `perf-book-${i}`,
    title: `Test Book ${i + 1}`,
    authors: [`Author ${i + 1}`],
  }));
};

describe("Performance Benchmarks", () => {
  beforeAll(() => {
    // Start mock server for API performance tests
    server.listen();

    // Set up performance observer if available
    if (typeof PerformanceObserver !== "undefined") {
      const observer = new PerformanceObserver((list) => {
        // Log performance entries for analysis
        for (const entry of list.getEntries()) {
          console.log(`${entry.name}: ${entry.duration}ms`);
        }
      });
      observer.observe({ entryTypes: ["measure", "navigation"] });
    }
  });

  afterAll(() => {
    server.close();
  });

  describe("Search API Performance", () => {
    bench(
      "Unified search response time",
      async () => {
        const startTime = performance.now();

        await searchService.searchBooks({
          query: "javascript programming",
          maxResults: 20,
        });

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        // API calls should complete within 3 seconds
        expect(responseTime).toBeLessThan(3000);
      },
      {
        iterations: 10,
        time: 5000, // 5 second timeout
      }
    );

    bench(
      "Large result set search performance",
      async () => {
        const startTime = performance.now();

        await searchService.searchBooks({
          query: "programming",
          maxResults: 40,
        });

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        // Larger searches should complete within 4 seconds
        expect(responseTime).toBeLessThan(4000);
      },
      {
        iterations: 5,
        time: 10000,
      }
    );

    bench(
      "Search with pagination performance",
      async () => {
        const queries = ["javascript", "python", "react"];

        const startTime = performance.now();

        // Simulate pagination through multiple pages
        for (const query of queries) {
          await searchService.searchBooks({
            query,
            maxResults: 20,
            startIndex: 0,
          });

          await searchService.searchBooks({
            query,
            maxResults: 20,
            startIndex: 20,
          });
        }

        const endTime = performance.now();
        const totalTime = endTime - startTime;

        // 6 API calls should complete within 12 seconds
        expect(totalTime).toBeLessThan(12000);
      },
      {
        iterations: 3,
        time: 30000,
      }
    );
  });

  describe("Component Render Performance", () => {
    bench(
      "SearchInput render performance",
      () => {
        render(
          <TestWrapper>
            <SearchInput placeholder="Search for books..." />
          </TestWrapper>
        );
      },
      {
        iterations: 100,
      }
    );

    bench(
      "BookCard render performance",
      () => {
        render(
          <TestWrapper>
            <BookCard book={mockBook} />
          </TestWrapper>
        );
      },
      {
        iterations: 100,
      }
    );

    bench(
      "BookCard compact render performance",
      () => {
        render(
          <TestWrapper>
            <BookCard book={mockBook} variant="compact" />
          </TestWrapper>
        );
      },
      {
        iterations: 100,
      }
    );

    bench(
      "Multiple BookCards render performance (20 cards)",
      () => {
        const books = generateMockBooks(20);

        render(
          <TestWrapper>
            <div className="grid grid-cols-4 gap-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </TestWrapper>
        );
      },
      {
        iterations: 20,
      }
    );

    bench(
      "Large BookCards grid render performance (100 cards)",
      () => {
        const books = generateMockBooks(100);

        render(
          <TestWrapper>
            <div className="grid grid-cols-5 gap-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} variant="compact" />
              ))}
            </div>
          </TestWrapper>
        );
      },
      {
        iterations: 5,
      }
    );

    bench(
      "ResultsList with results render performance",
      () => {
        const books = generateMockBooks(20);
        const mockResults = {
          books,
          pagination: {
            currentPage: 0,
            totalPages: 5,
            pageSize: 20,
            totalItems: 100,
            hasNextPage: true,
            hasPrevPage: false,
          },
          query: "programming",
          searchTime: 245,
        };

        render(
          <TestWrapper>
            <ResultsList results={mockResults} />
          </TestWrapper>
        );
      },
      {
        iterations: 50,
      }
    );

    bench(
      "ResultsList loading state render performance",
      () => {
        render(
          <TestWrapper>
            <ResultsList isLoading={true} skeletonCount={20} />
          </TestWrapper>
        );
      },
      {
        iterations: 100,
      }
    );
  });

  describe("User Interaction Performance", () => {
    bench(
      "SearchInput typing performance",
      async () => {
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <SearchInput placeholder="Search for books..." />
          </TestWrapper>
        );

        const input = screen.getByPlaceholderText("Search for books...");

        const startTime = performance.now();

        // Simulate typing a query
        await user.type(input, "javascript programming");

        const endTime = performance.now();
        const typingTime = endTime - startTime;

        // Typing should feel responsive (< 100ms total)
        expect(typingTime).toBeLessThan(100);
      },
      {
        iterations: 50,
      }
    );

    bench(
      "BookCard favorite toggle performance",
      async () => {
        const user = userEvent.setup();
        let toggleCount = 0;

        render(
          <TestWrapper>
            <BookCard book={mockBook} onFavoriteToggle={() => toggleCount++} />
          </TestWrapper>
        );

        const favoriteButton = screen.getByTitle("Add to favorites");

        const startTime = performance.now();

        // Simulate clicking favorite button
        await user.click(favoriteButton);

        const endTime = performance.now();
        const clickTime = endTime - startTime;

        // Click response should be immediate (< 50ms)
        expect(clickTime).toBeLessThan(50);
        expect(toggleCount).toBe(1);
      },
      {
        iterations: 100,
      }
    );

    bench(
      "Search form submission performance",
      async () => {
        const user = userEvent.setup();
        let searchCount = 0;

        render(
          <TestWrapper>
            <SearchInput
              placeholder="Search for books..."
              onSearch={() => searchCount++}
            />
          </TestWrapper>
        );

        const input = screen.getByPlaceholderText("Search for books...");

        const startTime = performance.now();

        // Type and submit search
        await user.type(input, "programming");
        await user.keyboard("{Enter}");

        const endTime = performance.now();
        const submissionTime = endTime - startTime;

        // Form submission should be fast (< 200ms)
        expect(submissionTime).toBeLessThan(200);
        expect(searchCount).toBe(1);
      },
      {
        iterations: 50,
      }
    );
  });

  describe("Memory Usage Benchmarks", () => {
    bench(
      "Memory usage with large datasets",
      () => {
        // Test memory efficiency with large book collections
        const largeBookSet = generateMockBooks(1000);

        const startMemory = performance.memory?.usedJSHeapSize || 0;

        render(
          <TestWrapper>
            <div>
              {largeBookSet.map((book) => (
                <BookCard key={book.id} book={book} variant="compact" />
              ))}
            </div>
          </TestWrapper>
        );

        const endMemory = performance.memory?.usedJSHeapSize || 0;
        const memoryUsed = endMemory - startMemory;

        // Memory usage should be reasonable for 1000 components
        // This is a baseline measurement for monitoring
        console.log(`Memory used for 1000 BookCards: ${memoryUsed} bytes`);
      },
      {
        iterations: 3,
      }
    );

    bench(
      "Memory cleanup after unmounting",
      () => {
        const books = generateMockBooks(100);

        const { unmount } = render(
          <TestWrapper>
            <div>
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </TestWrapper>
        );

        const beforeUnmount = performance.memory?.usedJSHeapSize || 0;

        unmount();

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const afterUnmount = performance.memory?.usedJSHeapSize || 0;
        const memoryFreed = beforeUnmount - afterUnmount;

        console.log(`Memory freed after unmounting: ${memoryFreed} bytes`);
      },
      {
        iterations: 10,
      }
    );
  });

  describe("Bundle Size Analysis", () => {
    bench(
      "Component import performance",
      () => {
        // Measure time to import components (for bundle analysis)
        const startTime = performance.now();

        // Simulate dynamic imports
        Promise.all([
          import("@/components/search/SearchInput"),
          import("@/components/search/BookCard"),
          import("@/components/search/ResultsList"),
        ]);

        const endTime = performance.now();
        const importTime = endTime - startTime;

        // Dynamic imports should be fast
        expect(importTime).toBeLessThan(100);
      },
      {
        iterations: 50,
      }
    );
  });
});

/**
 * Performance Monitoring Utilities
 */

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  startMeasure(name: string): void {
    performance.mark(`${name}-start`);
  }

  endMeasure(name: string): number {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    const entry = performance.getEntriesByName(name)[0];
    const duration = entry.duration;

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);

    return duration;
  }

  getAverageTime(name: string): number {
    const times = this.metrics.get(name) || [];
    if (times.length === 0) return 0;

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getMetricsReport(): Record<
    string,
    { avg: number; min: number; max: number; count: number }
  > {
    const report: Record<
      string,
      { avg: number; min: number; max: number; count: number }
    > = {};

    for (const [name, times] of this.metrics.entries()) {
      if (times.length > 0) {
        report[name] = {
          avg: times.reduce((sum, time) => sum + time, 0) / times.length,
          min: Math.min(...times),
          max: Math.max(...times),
          count: times.length,
        };
      }
    }

    return report;
  }

  clear(): void {
    this.metrics.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// Export singleton for use in application
export const performanceMonitor = new PerformanceMonitor();
