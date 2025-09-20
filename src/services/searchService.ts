/**
 * Unified Search Service
 *
 * This service combines Google Books and Open Library APIs to provide
 * a comprehensive book search experience with intelligent fallback,
 * deduplication, and result merging capabilities.
 */

import type {
  Book,
  SearchParams,
  SearchResults,
  ApiSource,
} from "../types/book";
import { GoogleBooksService, createGoogleBooksService } from "./googleBooks";
import { OpenLibraryService, createOpenLibraryService } from "./openLibrary";

// Base interface for book services
interface BookService {
  searchBooks(params: SearchParams): Promise<SearchResults>;
  isConfigured(): boolean;
  getRateLimit(): { hasKey: boolean; unlimited: boolean };
}

interface UnifiedSearchConfig {
  /** Primary service to use first */
  primaryService: ApiSource;
  /** Whether to use fallback when primary fails */
  enableFallback: boolean;
  /** Whether to merge results from both services */
  enableMerging: boolean;
  /** Maximum number of results to return */
  maxResults?: number;
  /** Timeout in milliseconds for each service call */
  timeout?: number;
}

interface SearchStrategy {
  /** Name of the strategy */
  name: string;
  /** Description of when to use this strategy */
  description: string;
  /** Function to execute the strategy */
  execute: (params: SearchParams) => Promise<SearchResults>;
}

export class UnifiedSearchService implements BookService {
  private googleBooks: GoogleBooksService;
  private openLibrary: OpenLibraryService;
  private config: UnifiedSearchConfig;

  constructor(
    config: Partial<UnifiedSearchConfig> = {},
    googleBooksService?: GoogleBooksService,
    openLibraryService?: OpenLibraryService
  ) {
    this.config = {
      primaryService: "google-books",
      enableFallback: true,
      enableMerging: false,
      maxResults: 40,
      timeout: 10000,
      ...config,
    };

    this.googleBooks = googleBooksService || createGoogleBooksService();
    this.openLibrary = openLibraryService || createOpenLibraryService();
  }

  /**
   * Main search method - routes to appropriate strategy based on config
   */
  async searchBooks(params: SearchParams): Promise<SearchResults> {
    const strategy = this.selectStrategy(params);

    try {
      return await this.executeWithTimeout(
        strategy.execute(params),
        this.config.timeout!
      );
    } catch (error) {
      // If configured strategy fails and fallback is disabled, throw error
      if (!this.config.enableFallback) {
        throw error;
      }

      // Try fallback strategy
      const fallbackStrategy = this.getFallbackStrategy(params);
      if (fallbackStrategy && fallbackStrategy.name !== strategy.name) {
        try {
          return await this.executeWithTimeout(
            fallbackStrategy.execute(params),
            this.config.timeout!
          );
        } catch (fallbackError) {
          // Both strategies failed, throw the original error
          throw fallbackError;
        }
      }

      throw error;
    }
  }

  /**
   * Get details for a specific book from its source
   */
  async getBookDetails(id: string, source?: ApiSource): Promise<Book | null> {
    // Extract source and original ID from the composite ID
    const { actualSource, originalId } = this.parseBookId(id, source);

    try {
      if (actualSource === "google-books") {
        return await this.googleBooks.getBookDetails(originalId);
      } else if (actualSource === "open-library") {
        return await this.openLibrary.getWorkDetails(originalId);
      }
    } catch (error) {
      // If primary source fails, try the other source if fallback is enabled
      if (this.config.enableFallback) {
        const fallbackSource =
          actualSource === "google-books" ? "open-library" : "google-books";
        try {
          if (fallbackSource === "google-books") {
            return await this.googleBooks.getBookDetails(originalId);
          } else {
            return await this.openLibrary.getWorkDetails(originalId);
          }
        } catch (fallbackError) {
          // Both failed, return null
          return null;
        }
      }
    }

    return null;
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    const googleConfigured = this.googleBooks.isConfigured();
    const openLibraryConfigured = this.openLibrary.isConfigured();

    // At least one service must be configured
    return googleConfigured || openLibraryConfigured;
  }

  /**
   * Get rate limit information for all services
   */
  getRateLimit() {
    const googleRateLimit = this.googleBooks.getRateLimit();
    const openLibraryRateLimit = this.openLibrary.getRateLimit();

    return {
      googleBooks: googleRateLimit,
      openLibrary: openLibraryRateLimit,
      // Overall status is based on primary service
      hasKey:
        this.config.primaryService === "google-books"
          ? googleRateLimit.hasKey
          : openLibraryRateLimit.hasKey,
      unlimited:
        this.config.primaryService === "google-books"
          ? googleRateLimit.unlimited
          : openLibraryRateLimit.unlimited,
    };
  }

  // Strategy Selection Logic

  /**
   * Select the best strategy based on search parameters and service availability
   */
  private selectStrategy(params: SearchParams): SearchStrategy {
    // Check service availability
    const googleAvailable = this.googleBooks.isConfigured();
    const openLibraryAvailable = this.openLibrary.isConfigured();

    // If merging is enabled and both services are available
    if (this.config.enableMerging && googleAvailable && openLibraryAvailable) {
      return this.createMergedStrategy();
    }

    // Use primary service if available
    if (this.config.primaryService === "google-books" && googleAvailable) {
      return this.createGoogleBooksStrategy();
    } else if (
      this.config.primaryService === "open-library" &&
      openLibraryAvailable
    ) {
      return this.createOpenLibraryStrategy();
    }

    // Use any available service
    if (googleAvailable) {
      return this.createGoogleBooksStrategy();
    } else if (openLibraryAvailable) {
      return this.createOpenLibraryStrategy();
    }

    // No services available
    throw new Error("No book search services are configured or available");
  }

  /**
   * Get fallback strategy when primary fails
   */
  private getFallbackStrategy(params: SearchParams): SearchStrategy | null {
    const googleAvailable = this.googleBooks.isConfigured();
    const openLibraryAvailable = this.openLibrary.isConfigured();

    if (this.config.primaryService === "google-books" && openLibraryAvailable) {
      return this.createOpenLibraryStrategy();
    } else if (
      this.config.primaryService === "open-library" &&
      googleAvailable
    ) {
      return this.createGoogleBooksStrategy();
    }

    return null;
  }

  // Strategy Implementations

  private createGoogleBooksStrategy(): SearchStrategy {
    return {
      name: "google-books-only",
      description: "Search using Google Books API only",
      execute: async (params: SearchParams) => {
        const result = await this.googleBooks.searchBooks(params);
        return this.limitResults(result, this.config.maxResults!);
      },
    };
  }

  private createOpenLibraryStrategy(): SearchStrategy {
    return {
      name: "open-library-only",
      description: "Search using Open Library API only",
      execute: async (params: SearchParams) => {
        const result = await this.openLibrary.searchBooks(params);
        return this.limitResults(result, this.config.maxResults!);
      },
    };
  }

  private createMergedStrategy(): SearchStrategy {
    return {
      name: "merged-results",
      description: "Merge results from both Google Books and Open Library",
      execute: async (params: SearchParams) => {
        // Split the request between both services
        const halfResults = Math.ceil((this.config.maxResults || 40) / 2);
        const adjustedParams = { ...params, maxResults: halfResults };

        try {
          // Execute both searches in parallel
          const [googleResult, openLibraryResult] = await Promise.allSettled([
            this.googleBooks.searchBooks(adjustedParams),
            this.openLibrary.searchBooks(adjustedParams),
          ]);

          const googleBooks =
            googleResult.status === "fulfilled" ? googleResult.value.books : [];
          const openLibraryBooks =
            openLibraryResult.status === "fulfilled"
              ? openLibraryResult.value.books
              : [];

          // Merge and deduplicate results
          const mergedBooks = this.mergeAndDeduplicateBooks([
            ...googleBooks,
            ...openLibraryBooks,
          ]);
          const limitedBooks = mergedBooks.slice(0, this.config.maxResults!);

          // Calculate total items from both sources
          const googleTotal =
            googleResult.status === "fulfilled"
              ? googleResult.value.totalItems
              : 0;
          const openLibraryTotal =
            openLibraryResult.status === "fulfilled"
              ? openLibraryResult.value.totalItems
              : 0;

          return {
            books: limitedBooks,
            totalItems: Math.max(googleTotal, openLibraryTotal), // Use the higher estimate
            startIndex: params.startIndex || 0,
            itemsPerPage: limitedBooks.length,
            query: params.query,
            source: "combined" as ApiSource,
            hasMore:
              limitedBooks.length >= (this.config.maxResults || 40) ||
              (googleResult.status === "fulfilled" &&
                googleResult.value.hasMore) ||
              (openLibraryResult.status === "fulfilled" &&
                openLibraryResult.value.hasMore),
          };
        } catch (error) {
          // If both fail, try individual strategies as fallback
          throw error;
        }
      },
    };
  }

  // Utility Methods

  /**
   * Merge books from multiple sources and remove duplicates
   */
  private mergeAndDeduplicateBooks(books: Book[]): Book[] {
    const seen = new Set<string>();
    const deduplicatedBooks: Book[] = [];

    // Sort by relevance - prefer Google Books, then by quality indicators
    const sortedBooks = books.sort((a, b) => {
      // Prefer Google Books results
      if (a.source === "google-books" && b.source !== "google-books") return -1;
      if (b.source === "google-books" && a.source !== "google-books") return 1;

      // Prefer books with more information (cover, description, etc.)
      const aScore = this.calculateBookQualityScore(a);
      const bScore = this.calculateBookQualityScore(b);
      return bScore - aScore;
    });

    for (const book of sortedBooks) {
      const deduplicationKey = this.createDeduplicationKey(book);

      if (!seen.has(deduplicationKey)) {
        seen.add(deduplicationKey);
        deduplicatedBooks.push(book);
      }
    }

    return deduplicatedBooks;
  }

  /**
   * Create a key for deduplication based on title and authors
   */
  private createDeduplicationKey(book: Book): string {
    const normalizedTitle = book.title
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    const normalizedAuthors = book.authors
      .map((author) =>
        author
          .toLowerCase()
          .replace(/[^\w\s]/g, "")
          .trim()
      )
      .sort() // Sort to handle different author orders
      .join("|");

    return `${normalizedTitle}|${normalizedAuthors}`;
  }

  /**
   * Calculate a quality score for a book based on available information
   */
  private calculateBookQualityScore(book: Book): number {
    let score = 0;

    if (book.description && book.description.length > 50) score += 3;
    if (book.thumbnail || book.smallThumbnail) score += 2;
    if (book.publishedDate) score += 1;
    if (book.publisher) score += 1;
    if (book.pageCount && book.pageCount > 0) score += 1;
    if (book.isbn10 || book.isbn13) score += 2;
    if (book.categories && book.categories.length > 0) score += 1;
    if (book.averageRating && book.averageRating > 0) score += 2;

    return score;
  }

  /**
   * Parse a composite book ID to extract source and original ID
   */
  private parseBookId(
    id: string,
    explicitSource?: ApiSource
  ): { actualSource: ApiSource; originalId: string } {
    if (explicitSource) {
      return { actualSource: explicitSource, originalId: id };
    }

    // Check for source prefix in ID
    if (id.startsWith("google-books-")) {
      return {
        actualSource: "google-books",
        originalId: id.substring("google-books-".length),
      };
    } else if (id.startsWith("open-library-")) {
      return {
        actualSource: "open-library",
        originalId: id.substring("open-library-".length),
      };
    }

    // Default to primary service
    return { actualSource: this.config.primaryService, originalId: id };
  }

  /**
   * Limit the number of results in a SearchResults
   */
  private limitResults(
    result: SearchResults,
    maxResults: number
  ): SearchResults {
    if (result.books.length <= maxResults) {
      return result;
    }

    return {
      ...result,
      books: result.books.slice(0, maxResults),
      hasMore: true, // If we limited results, there are definitely more
    };
  }

  /**
   * Execute a promise with a timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Search request timed out"));
      }, timeoutMs);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeoutId));
    });
  }

  // Configuration Methods

  /**
   * Update the service configuration
   */
  updateConfig(newConfig: Partial<UnifiedSearchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): UnifiedSearchConfig {
    return { ...this.config };
  }

  /**
   * Get available search strategies
   */
  getAvailableStrategies(): SearchStrategy[] {
    const strategies: SearchStrategy[] = [];

    if (this.googleBooks.isConfigured()) {
      strategies.push(this.createGoogleBooksStrategy());
    }

    if (this.openLibrary.isConfigured()) {
      strategies.push(this.createOpenLibraryStrategy());
    }

    if (this.googleBooks.isConfigured() && this.openLibrary.isConfigured()) {
      strategies.push(this.createMergedStrategy());
    }

    return strategies;
  }
}

// Factory function for easy instantiation
export function createUnifiedSearchService(
  config: Partial<UnifiedSearchConfig> = {}
): UnifiedSearchService {
  return new UnifiedSearchService(config);
}

// Export types
export type { UnifiedSearchConfig, SearchStrategy };
