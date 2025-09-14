/**
 * Search Orchestrator
 *
 * Coordinates dual-mode search functionality:
 * - Search Mode: Direct API search with fallback
 * - Prompt Mode: AI-powered recommendations with metadata fetching
 * - Handles caching, deduplication, and result normalization
 */

import { getGoogleBooksService } from "./googleBooksService";
import { getOpenLibraryService } from "./openLibraryService";
import { getGPTRecommendationService } from "./gptRecommendationService";
import { getRedisService, CacheKeys, CacheTTL } from "./redis";
import { monitoring } from "./monitoring";
import {
  SearchRequest,
  SearchResult,
  NormalizedBook,
  SearchQuery,
} from "../types";

export interface SearchOrchestrator {
  search(request: SearchRequest): Promise<SearchResult>;
}

export interface OrchestrationConfig {
  maxRetries: number;
  fallbackTimeout: number;
  deduplicationEnabled: boolean;
  concurrencyLimit: number;
}

export class KeeperSearchOrchestrator implements SearchOrchestrator {
  private googleBooks = getGoogleBooksService();
  private openLibrary = getOpenLibraryService();
  private gptRecommendation = getGPTRecommendationService();
  private redis = getRedisService();
  private config: OrchestrationConfig;

  constructor() {
    this.config = {
      maxRetries: 2,
      fallbackTimeout: 8000,
      deduplicationEnabled: true,
      concurrencyLimit: 5,
    };
  }

  /**
   * Main search method - routes to appropriate mode
   */
  async search(request: SearchRequest): Promise<SearchResult> {
    const startTime = Date.now();
    const query: SearchQuery = {
      query: request.query,
      mode: request.mode,
      pagination: {
        limit: request.maxResults || 20,
        offset: 0,
      },
    };

    try {
      let searchResult: SearchResult;

      if (request.mode === "searchMode") {
        searchResult = await this.executeSearchMode(request, query);
      } else if (request.mode === "promptMode") {
        searchResult = await this.executePromptMode(request, query);
      } else {
        throw new Error(`Invalid search mode: ${request.mode}`);
      }

      // Ensure processing time is accurate
      searchResult.searchTime = Date.now() - startTime;

      // Record search operation for monitoring
      await monitoring.recordSearchOperation(
        request.mode,
        searchResult.searchTime,
        searchResult.books.length,
        searchResult.source === "cache",
        request.userId
      );

      return searchResult;
    } catch (error) {
      console.error("Search orchestration error:", error);

      // Record error for monitoring
      await monitoring.recordError(
        "search_orchestrator",
        request.mode,
        error as Error
      );

      // Return empty result with error information
      return {
        books: [],
        totalResults: 0,
        searchTime: Date.now() - startTime,
        source: "api",
        query,
        mode: request.mode,
      };
    }
  }

  /**
   * Execute search mode: Direct API search with fallback
   */
  private async executeSearchMode(
    request: SearchRequest,
    query: SearchQuery
  ): Promise<SearchResult> {
    const { query: searchQuery, maxResults = 20, useCache = true } = request;

    // Check unified cache first
    if (useCache) {
      const cacheKey = CacheKeys.search(
        `unified:${searchQuery}:${maxResults}:searchMode`
      );
      const cached = await this.redis.get<SearchResult>(cacheKey);
      if (cached) {
        return {
          ...cached,
          source: "cache",
        };
      }
    }

    let books: NormalizedBook[] = [];
    let primarySource = "google";

    try {
      // Try Google Books first
      const googleResponse = await this.googleBooks.searchBooks(searchQuery, {
        maxResults,
        useCache: false, // We handle unified caching here
      });

      if (googleResponse.success && googleResponse.data.length > 0) {
        books = googleResponse.data;
        primarySource = "google";
      } else {
        // Fallback to Open Library if Google Books fails or returns no results
        console.log(
          `Google Books returned ${googleResponse.data.length} results, trying Open Library as fallback`
        );

        const openLibraryResponse = await this.openLibrary.searchBooks(
          searchQuery,
          {
            maxResults,
            useCache: false,
          }
        );

        if (openLibraryResponse.success) {
          books = openLibraryResponse.data;
          primarySource = "openlibrary";
        }
      }

      // If still no results, try both APIs with a broader search
      if (books.length === 0 && searchQuery.length > 10) {
        console.log("No results found, trying broader search terms");
        const broaderQuery = this.createBroaderQuery(searchQuery);

        const [googleBroader, openLibraryBroader] = await Promise.allSettled([
          this.googleBooks.searchBooks(broaderQuery, {
            maxResults: Math.floor(maxResults / 2),
            useCache: false,
          }),
          this.openLibrary.searchBooks(broaderQuery, {
            maxResults: Math.floor(maxResults / 2),
            useCache: false,
          }),
        ]);

        if (
          googleBroader.status === "fulfilled" &&
          googleBroader.value.success
        ) {
          books.push(...googleBroader.value.data);
        }
        if (
          openLibraryBroader.status === "fulfilled" &&
          openLibraryBroader.value.success
        ) {
          books.push(...openLibraryBroader.value.data);
        }
      }
    } catch (error) {
      console.error("Error in search mode execution:", error);
    }

    // Deduplicate and normalize results
    const deduplicatedBooks = this.config.deduplicationEnabled
      ? this.deduplicateBooks(books)
      : books;

    const result: SearchResult = {
      books: deduplicatedBooks.slice(0, maxResults),
      totalResults: deduplicatedBooks.length,
      searchTime: 0, // Will be set by caller
      source: "api",
      query,
      mode: "searchMode",
    };

    // Cache the result
    if (useCache && deduplicatedBooks.length > 0) {
      const cacheKey = CacheKeys.search(
        `unified:${searchQuery}:${maxResults}:searchMode`
      );
      await this.redis.set(cacheKey, result, {
        ttl: CacheTTL.SEARCH_RESULTS,
      });
    }

    return result;
  }

  /**
   * Execute prompt mode: AI recommendations + metadata fetching
   */
  private async executePromptMode(
    request: SearchRequest,
    query: SearchQuery
  ): Promise<SearchResult> {
    const { query: searchQuery, maxResults = 10, useCache = true } = request;

    // Check unified cache first
    if (useCache) {
      const cacheKey = CacheKeys.search(
        `unified:${searchQuery}:${maxResults}:promptMode`
      );
      const cached = await this.redis.get<SearchResult>(cacheKey);
      if (cached) {
        return {
          ...cached,
          source: "cache",
        };
      }
    }

    try {
      // Step 1: Get AI recommendations
      console.log("Getting AI recommendations for:", searchQuery);
      const gptResponse = await this.gptRecommendation.generateRecommendations({
        query: searchQuery,
        maxRecommendations: maxResults * 2, // Get more recommendations to account for failed matches
        userPreferences: [], // TODO: Get from user context when available
      });

      if (gptResponse.recommendations.length === 0) {
        console.log(
          "No AI recommendations received, falling back to search mode"
        );
        return this.executeSearchMode(request, query);
      }

      // Step 2: Extract book titles for API fetching
      const bookTitles = this.gptRecommendation.extractBookTitles(
        gptResponse.recommendations
      );
      console.log("Fetching metadata for books:", bookTitles);

      // Step 3: Fetch book metadata concurrently from both APIs
      const [googleBooks, openLibraryBooks] = await Promise.allSettled([
        this.googleBooks.fetchBooksByTitles(bookTitles, { maxResults: 1 }),
        this.openLibrary.fetchBooksByTitles(bookTitles, { maxResults: 1 }),
      ]);

      // Combine results from both APIs
      let allBooks: NormalizedBook[] = [];
      if (googleBooks.status === "fulfilled") {
        allBooks.push(...googleBooks.value);
      }
      if (openLibraryBooks.status === "fulfilled") {
        allBooks.push(...openLibraryBooks.value);
      }

      // Step 4: Match GPT recommendations with fetched books
      const matchedBooks = this.gptRecommendation.matchRecommendationsWithBooks(
        gptResponse.recommendations,
        allBooks
      );

      // Step 5: If we don't have enough matches, supplement with direct search
      let finalBooks = matchedBooks;
      if (finalBooks.length < Math.max(3, maxResults / 2)) {
        console.log(
          `Only ${finalBooks.length} matched books, supplementing with direct search`
        );

        const directSearchResponse = await this.googleBooks.searchBooks(
          searchQuery,
          {
            maxResults: maxResults - finalBooks.length,
            useCache: false,
          }
        );

        if (directSearchResponse.success) {
          // Add books that aren't already in our results
          const existingIds = new Set(finalBooks.map((b) => b.id));
          const supplementaryBooks = directSearchResponse.data.filter(
            (book) => !existingIds.has(book.id)
          );
          finalBooks.push(...supplementaryBooks);
        }
      }

      // Deduplicate and limit results
      const deduplicatedBooks = this.config.deduplicationEnabled
        ? this.deduplicateBooks(finalBooks)
        : finalBooks;

      const result: SearchResult = {
        books: deduplicatedBooks.slice(0, maxResults),
        totalResults: deduplicatedBooks.length,
        searchTime: 0, // Will be set by caller
        source: "api",
        query,
        mode: "promptMode",
      };

      // Cache the result
      if (useCache && deduplicatedBooks.length > 0) {
        const cacheKey = CacheKeys.search(
          `unified:${searchQuery}:${maxResults}:promptMode`
        );
        await this.redis.set(cacheKey, result, {
          ttl: CacheTTL.SEARCH_RESULTS,
        });
      }

      return result;
    } catch (error) {
      console.error("Error in prompt mode execution:", error);

      // Fallback to search mode if prompt mode fails
      console.log("Prompt mode failed, falling back to search mode");
      return this.executeSearchMode(request, query);
    }
  }

  /**
   * Deduplicate books based on ISBN, title, and author similarity
   */
  private deduplicateBooks(books: NormalizedBook[]): NormalizedBook[] {
    const seen = new Map<string, NormalizedBook>();

    for (const book of books) {
      // Create deduplication key
      let key: string;

      if (book.isbn) {
        key = `isbn:${book.isbn}`;
      } else {
        // Normalize title and author for comparison
        const normalizedTitle = book.title
          .toLowerCase()
          .replace(/[^\w\s]/g, "")
          .replace(/\s+/g, " ")
          .trim();
        const normalizedAuthor =
          book.authors[0]
            ?.toLowerCase()
            .replace(/[^\w\s]/g, "")
            .trim() || "unknown";

        key = `title-author:${normalizedTitle}:${normalizedAuthor}`;
      }

      // Keep the book with higher confidence/score, or prefer Google Books
      if (!seen.has(key) || this.isPreferredBook(book, seen.get(key)!)) {
        seen.set(key, book);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Determine if a book is preferred over another for deduplication
   */
  private isPreferredBook(
    book1: NormalizedBook,
    book2: NormalizedBook
  ): boolean {
    // Prefer books with higher confidence
    if (book1.confidence && book2.confidence) {
      if (book1.confidence !== book2.confidence) {
        return book1.confidence > book2.confidence;
      }
    }

    // Prefer books with more complete information
    const book1Score = this.calculateCompletenessScore(book1);
    const book2Score = this.calculateCompletenessScore(book2);

    if (book1Score !== book2Score) {
      return book1Score > book2Score;
    }

    // Prefer Google Books as it typically has better metadata
    if (book1.source !== book2.source) {
      return book1.source === "google";
    }

    return false;
  }

  /**
   * Calculate completeness score for a book (more complete = higher score)
   */
  private calculateCompletenessScore(book: NormalizedBook): number {
    let score = 0;

    if (book.title) score += 1;
    if (book.authors.length > 0 && book.authors[0] !== "Unknown Author")
      score += 2;
    if (book.description) score += 2;
    if (book.isbn) score += 1;
    if (book.imageUrl) score += 1;
    if (book.publishedDate) score += 1;
    if (book.categories && book.categories.length > 0) score += 1;
    if (book.pageCount) score += 1;

    return score;
  }

  /**
   * Create a broader search query from the original
   */
  private createBroaderQuery(originalQuery: string): string {
    // Remove quotes and special characters
    let broaderQuery = originalQuery
      .replace(/['"]/g, "")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Take first few significant words
    const words = broaderQuery.split(" ");
    if (words.length > 3) {
      broaderQuery = words.slice(0, 3).join(" ");
    }

    return broaderQuery;
  }

  /**
   * Get search orchestrator status
   */
  getStatus() {
    return {
      available: true,
      services: {
        googleBooks: this.googleBooks.getStatus(),
        openLibrary: this.openLibrary.getStatus(),
        gptRecommendation: this.gptRecommendation.getStatus(),
      },
    };
  }
}

// Singleton instance
let searchOrchestratorInstance: KeeperSearchOrchestrator | null = null;

export function getSearchOrchestrator(): KeeperSearchOrchestrator {
  if (!searchOrchestratorInstance) {
    searchOrchestratorInstance = new KeeperSearchOrchestrator();
  }
  return searchOrchestratorInstance;
}
