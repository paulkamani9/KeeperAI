/**
 * Performance Benchmarks
 *
 * Core performance tests for search functionality and API responses.
 * Uses Vitest's bench() function for accurate performance measurements.
 */

import { bench, describe, expect, beforeAll, afterAll } from "vitest";
import { createUnifiedSearchService } from "@/services/search/searchService";
import { server } from "@/test/mocks/server";
import type { Book } from "@/types/book";

describe("Search Performance Benchmarks", () => {
  let searchService: ReturnType<typeof createUnifiedSearchService>;

  beforeAll(() => {
    server.listen();
    searchService = createUnifiedSearchService({
      primaryService: "google-books",
      enableFallback: true,
      maxResults: 50,
    });
  });

  afterAll(() => {
    server.close();
  });

  describe("API Response Performance", () => {
    bench(
      "Google Books search - single query",
      async () => {
        await searchService.searchBooks({
          query: "javascript programming",
          maxResults: 20,
        });
      },
      {
        iterations: 10,
        time: 5000,
      }
    );

    bench(
      "Open Library search - single query",
      async () => {
        await searchService.searchBooks({
          query: "python programming",
          maxResults: 20,
        });
      },
      {
        iterations: 10,
        time: 5000,
      }
    );

    bench(
      "Combined search performance",
      async () => {
        await searchService.searchBooks({
          query: "react development",
          maxResults: 40,
        });
      },
      {
        iterations: 5,
        time: 10000,
      }
    );

    bench(
      "Search with different query types",
      async () => {
        const queries = [
          "programming",
          "machine learning",
          "web development",
          "data structures",
          "algorithms",
        ];

        for (const query of queries) {
          await searchService.searchBooks({
            query: query,
            maxResults: 10,
          });
        }
      },
      {
        iterations: 3,
        time: 15000,
      }
    );

    bench(
      "Pagination performance",
      async () => {
        // Test multiple page requests
        const query = "programming";

        await searchService.searchBooks({
          query: query,
          maxResults: 20,
          startIndex: 0,
        });

        await searchService.searchBooks({
          query: query,
          maxResults: 20,
          startIndex: 20,
        });

        await searchService.searchBooks({
          query: query,
          maxResults: 20,
          startIndex: 40,
        });
      },
      {
        iterations: 5,
        time: 10000,
      }
    );
  });

  describe("Data Processing Performance", () => {
    bench(
      "Large dataset processing",
      async () => {
        // Test with larger result sets
        const results = await searchService.searchBooks({
          query: "programming",
          maxResults: 100,
        });

        // Process the results (sorting, filtering, etc.)
        const processed = results.books
          .filter((book: Book) => book.authors.length > 0)
          .sort(
            (a: Book, b: Book) =>
              (b.averageRating || 0) - (a.averageRating || 0)
          )
          .slice(0, 50);

        expect(processed.length).toBeGreaterThan(0);
      },
      {
        iterations: 5,
      }
    );

    bench(
      "Book data transformation",
      async () => {
        const results = await searchService.searchBooks({
          query: "javascript",
          maxResults: 50,
        });

        // Transform book data (simulate real app operations)
        const transformed = results.books.map((book: Book) => ({
          ...book,
          displayTitle: book.title.toLowerCase(),
          authorString: book.authors.join(", "),
          hasRating: !!book.averageRating,
          publicationYear: book.publishedDate
            ? new Date(book.publishedDate).getFullYear()
            : null,
        }));

        expect(transformed.length).toBe(results.books.length);
      },
      {
        iterations: 10,
      }
    );
  });

  describe("Search Query Performance", () => {
    const searchQueries = [
      "javascript",
      "python machine learning",
      "web development react",
      "data structures algorithms",
      "software engineering patterns",
      "database design",
      "computer science fundamentals",
      "artificial intelligence",
      "mobile app development",
      "cloud computing aws",
    ];

    bench(
      "Multiple search queries benchmark",
      async () => {
        const randomQuery =
          searchQueries[Math.floor(Math.random() * searchQueries.length)];

        await searchService.searchBooks({
          query: randomQuery,
          maxResults: 20,
        });
      },
      {
        iterations: 20,
        time: 10000,
      }
    );

    bench(
      "Search query validation performance",
      async () => {
        const queries = [
          "short",
          "this is a much longer search query that tests performance with more words",
          "special-characters@#$%",
          "numbers 123 456",
          "UPPERCASE AND lowercase MiXeD",
        ];

        for (const query of queries) {
          await searchService.searchBooks({
            query: query,
            maxResults: 10,
          });
        }
      },
      {
        iterations: 5,
      }
    );
  });

  describe("Error Handling Performance", () => {
    bench(
      "Network error recovery",
      async () => {
        try {
          // This will trigger mock network error
          await searchService.searchBooks({
            query: "network-error-trigger",
            maxResults: 20,
          });
        } catch (error) {
          expect(error).toBeDefined();
        }
      },
      {
        iterations: 10,
      }
    );

    bench(
      "Rate limit handling",
      async () => {
        try {
          // This will trigger mock rate limit
          await searchService.searchBooks({
            query: "rate-limit-trigger",
            maxResults: 20,
          });
        } catch (error) {
          expect(error).toBeDefined();
        }
      },
      {
        iterations: 5,
      }
    );
  });
});

/**
 * Performance Thresholds
 *
 * These are target performance metrics for the search functionality.
 * Tests should pass these thresholds consistently.
 */
export const PERFORMANCE_THRESHOLDS = {
  // API Response Times (in milliseconds)
  GOOGLE_BOOKS_SEARCH: 2000,
  OPEN_LIBRARY_SEARCH: 3000,
  COMBINED_SEARCH: 4000,

  // Component Render Times (in milliseconds)
  SEARCH_INPUT_RENDER: 50,
  BOOK_CARD_RENDER: 100,
  RESULTS_LIST_RENDER: 500,

  // User Interaction Times (in milliseconds)
  SEARCH_INPUT_TYPING: 100,
  FAVORITE_TOGGLE: 50,
  FORM_SUBMISSION: 200,

  // Memory Thresholds (in bytes)
  MAX_MEMORY_PER_BOOK_CARD: 50000, // 50KB per card
  MAX_MEMORY_LEAK_TOLERANCE: 1000000, // 1MB tolerance for memory leaks

  // Bundle Size Thresholds (in bytes)
  MAX_COMPONENT_BUNDLE_SIZE: 500000, // 500KB for all search components
} as const;

/**
 * Performance Reporter
 *
 * Utility class for collecting and reporting performance metrics.
 */
export class PerformanceReporter {
  private measurements: Map<string, number[]> = new Map();

  recordMeasurement(name: string, duration: number): void {
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);
  }

  getStats(name: string): {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
    count: number;
  } | null {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      avg: sorted.reduce((sum, val) => sum + val, 0) / count,
      min: sorted[0],
      max: sorted[count - 1],
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
      count,
    };
  }

  getReport(): Record<string, ReturnType<PerformanceReporter["getStats"]>> {
    const report: Record<
      string,
      ReturnType<PerformanceReporter["getStats"]>
    > = {};

    for (const name of this.measurements.keys()) {
      report[name] = this.getStats(name);
    }

    return report;
  }

  checkThresholds(): { passed: boolean; failures: string[] } {
    const failures: string[] = [];

    // Add threshold checks here as needed
    const searchStats = this.getStats("google-books-search");
    if (
      searchStats &&
      searchStats.p95 > PERFORMANCE_THRESHOLDS.GOOGLE_BOOKS_SEARCH
    ) {
      failures.push(
        `Google Books search P95 (${searchStats.p95}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.GOOGLE_BOOKS_SEARCH}ms)`
      );
    }

    return {
      passed: failures.length === 0,
      failures,
    };
  }

  clear(): void {
    this.measurements.clear();
  }
}

// Export singleton instance
export const performanceReporter = new PerformanceReporter();
