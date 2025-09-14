/**
 * Google Books API Service
 *
 * Handles interactions with Google Books API including:
 * - Book search and metadata retrieval
 * - Error handling and retry logic
 * - Result normalization to internal format
 */

import { getRedisService, CacheKeys, CacheTTL } from "./redis";
import {
  GoogleBooksVolumesResponse,
  GoogleBooksVolume,
  NormalizedBook,
  BookAPIResponse,
  APIServiceConfig,
} from "../types";

export interface GoogleBooksSearchOptions {
  maxResults?: number;
  useCache?: boolean;
  timeout?: number;
  startIndex?: number;
}

export class GoogleBooksService {
  private redis = getRedisService();
  private apiKey: string | null = null;
  private config: APIServiceConfig;

  constructor() {
    this.apiKey = process.env.GOOGLE_BOOKS_API_KEY || null;
    this.config = {
      timeout: 5000,
      maxRetries: 3,
      retryDelay: 1000,
    };
  }

  /**
   * Search for books using Google Books API
   */
  async searchBooks(
    query: string,
    options: GoogleBooksSearchOptions = {}
  ): Promise<BookAPIResponse<NormalizedBook>> {
    const startTime = Date.now();
    const {
      maxResults = 10,
      useCache = true,
      timeout = this.config.timeout,
    } = options;

    try {
      // Check cache first
      if (useCache) {
        const cacheKey = CacheKeys.search(`google:${query}:${maxResults}`);
        const cached = await this.redis.get<NormalizedBook[]>(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            source: "cache",
            processingTime: Date.now() - startTime,
          };
        }
      }

      // Make API request
      const books = await this.fetchBooksWithRetry(query, {
        maxResults,
        timeout,
      });
      const normalizedBooks = this.normalizeGoogleBooksResponse(books);

      // Cache results
      if (useCache && normalizedBooks.length > 0) {
        const cacheKey = CacheKeys.search(`google:${query}:${maxResults}`);
        await this.redis.set(cacheKey, normalizedBooks, {
          ttl: CacheTTL.SEARCH_RESULTS,
        });
      }

      return {
        success: true,
        data: normalizedBooks,
        source: "api",
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error("Google Books search error:", error);
      return {
        success: false,
        data: [],
        source: "api",
        error: error instanceof Error ? error.message : "Unknown error",
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get book details by ID
   */
  async getBookById(
    bookId: string,
    useCache = true
  ): Promise<NormalizedBook | null> {
    try {
      // Check cache first
      if (useCache) {
        const cacheKey = CacheKeys.bookMetadata(`google:${bookId}`);
        const cached = await this.redis.get<NormalizedBook>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      if (!this.apiKey) {
        console.warn("Google Books API key not configured");
        return null;
      }

      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes/${bookId}?key=${this.apiKey}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(this.config.timeout),
        }
      );

      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.statusText}`);
      }

      const volume: GoogleBooksVolume = await response.json();
      const normalizedBook = this.normalizeGoogleBooksVolume(volume);

      // Cache result
      if (useCache && normalizedBook) {
        const cacheKey = CacheKeys.bookMetadata(`google:${bookId}`);
        await this.redis.set(cacheKey, normalizedBook, {
          ttl: CacheTTL.BOOK_METADATA,
        });
      }

      return normalizedBook;
    } catch (error) {
      console.error(`Google Books get book by ID error (${bookId}):`, error);
      return null;
    }
  }

  /**
   * Fetch multiple books by titles (for AI recommendations)
   */
  async fetchBooksByTitles(
    titles: string[],
    options: GoogleBooksSearchOptions = {}
  ): Promise<NormalizedBook[]> {
    const results: NormalizedBook[] = [];
    const maxConcurrent = 3; // Rate limiting

    // Process titles in batches to avoid rate limits
    for (let i = 0; i < titles.length; i += maxConcurrent) {
      const batch = titles.slice(i, i + maxConcurrent);

      const batchPromises = batch.map(async (title) => {
        const response = await this.searchBooks(title, {
          ...options,
          maxResults: 3, // Only get top 3 for each title
        });

        // Return the best match (first result)
        return response.success && response.data.length > 0
          ? response.data[0]
          : null;
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(
        ...batchResults.filter((book): book is NormalizedBook => book !== null)
      );

      // Add delay between batches
      if (i + maxConcurrent < titles.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return results;
  }

  /**
   * Fetch books with retry logic
   */
  private async fetchBooksWithRetry(
    query: string,
    options: { maxResults: number; timeout: number }
  ): Promise<GoogleBooksVolume[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.fetchBooks(query, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.warn(
            `Google Books API attempt ${attempt} failed, retrying in ${delay}ms:`,
            error
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("All retry attempts failed");
  }

  /**
   * Make the actual API request
   */
  private async fetchBooks(
    query: string,
    options: { maxResults: number; timeout: number }
  ): Promise<GoogleBooksVolume[]> {
    if (!this.apiKey) {
      console.warn("Google Books API key not configured");
      return [];
    }

    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=${options.maxResults}&key=${this.apiKey}`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(options.timeout),
    });

    if (!response.ok) {
      throw new Error(
        `Google Books API error: ${response.status} ${response.statusText}`
      );
    }

    const data: GoogleBooksVolumesResponse = await response.json();
    return data.items || [];
  }

  /**
   * Normalize Google Books response to internal format
   */
  private normalizeGoogleBooksResponse(
    volumes: GoogleBooksVolume[]
  ): NormalizedBook[] {
    return volumes
      .map((volume) => this.normalizeGoogleBooksVolume(volume))
      .filter((book): book is NormalizedBook => book !== null);
  }

  /**
   * Normalize a single Google Books volume
   */
  private normalizeGoogleBooksVolume(
    volume: GoogleBooksVolume
  ): NormalizedBook | null {
    if (!volume.id || !volume.volumeInfo) {
      return null;
    }

    const info = volume.volumeInfo;

    // Ensure we have at least title and authors
    if (!info.title) {
      return null;
    }

    // Find the best ISBN
    const isbn13 = info.industryIdentifiers?.find(
      (id) => id.type === "ISBN_13"
    )?.identifier;
    const isbn10 = info.industryIdentifiers?.find(
      (id) => id.type === "ISBN_10"
    )?.identifier;

    // Extract authors (handle both array and string cases)
    const authors = Array.isArray(info.authors)
      ? info.authors
      : info.authors
        ? [info.authors as any]
        : ["Unknown Author"];

    // Extract categories (handle both array and string cases)
    const categories = Array.isArray(info.categories)
      ? info.categories
      : info.categories
        ? [info.categories as any]
        : undefined;

    return {
      id: volume.id,
      title: info.title,
      authors: authors.filter(Boolean), // Remove empty strings
      description: info.description,
      publishedDate: info.publishedDate,
      isbn: isbn13 || isbn10,
      imageUrl:
        info.imageLinks?.thumbnail ||
        info.imageLinks?.small ||
        info.imageLinks?.medium,
      categories: categories,
      pageCount: info.pageCount,
      language: info.language || "en",
      source: "google" as const,
    };
  }

  /**
   * Check if the service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get service status
   */
  getStatus(): { available: boolean; configured: boolean } {
    return {
      available: this.isAvailable(),
      configured: !!this.apiKey,
    };
  }
}

// Singleton instance
let googleBooksInstance: GoogleBooksService | null = null;

export function getGoogleBooksService(): GoogleBooksService {
  if (!googleBooksInstance) {
    googleBooksInstance = new GoogleBooksService();
  }
  return googleBooksInstance;
}
