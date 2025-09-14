/**
 * Open Library API Service
 *
 * Handles interactions with Open Library API including:
 * - Book search and metadata retrieval
 * - Error handling and retry logic
 * - Result normalization to internal format
 */

import { getRedisService, CacheKeys, CacheTTL } from "./redis";
import {
  OpenLibraryWork,
  NormalizedBook,
  BookAPIResponse,
  APIServiceConfig,
} from "../types";

export interface OpenLibrarySearchOptions {
  maxResults?: number;
  useCache?: boolean;
  timeout?: number;
  fields?: string[];
}

interface OpenLibrarySearchResponse {
  numFound: number;
  start: number;
  numFoundExact?: boolean;
  docs: OpenLibrarySearchDoc[];
}

interface OpenLibrarySearchDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  isbn?: string[];
  subject?: string[];
  cover_i?: number;
  language?: string[];
  publisher?: string[];
  publish_year?: number[];
  number_of_pages_median?: number;
  ratings_average?: number;
  ratings_count?: number;
  publisher_facet?: string[];
}

export class OpenLibraryService {
  private redis = getRedisService();
  private config: APIServiceConfig;
  private baseUrl = "https://openlibrary.org";

  constructor() {
    this.config = {
      timeout: 8000, // Open Library can be slower
      maxRetries: 3,
      retryDelay: 1500,
    };
  }

  /**
   * Search for books using Open Library API
   */
  async searchBooks(
    query: string,
    options: OpenLibrarySearchOptions = {}
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
        const cacheKey = CacheKeys.search(`openlibrary:${query}:${maxResults}`);
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
      const searchResults = await this.fetchBooksWithRetry(query, {
        maxResults,
        timeout,
      });
      const normalizedBooks = this.normalizeOpenLibraryResponse(searchResults);

      // Cache results
      if (useCache && normalizedBooks.length > 0) {
        const cacheKey = CacheKeys.search(`openlibrary:${query}:${maxResults}`);
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
      console.error("Open Library search error:", error);
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
   * Get book details by Open Library key
   */
  async getBookByKey(
    key: string,
    useCache = true
  ): Promise<NormalizedBook | null> {
    try {
      // Check cache first
      if (useCache) {
        const cacheKey = CacheKeys.bookMetadata(`openlibrary:${key}`);
        const cached = await this.redis.get<NormalizedBook>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Ensure key starts with /works/
      const workKey = key.startsWith("/works/") ? key : `/works/${key}`;

      const response = await fetch(`${this.baseUrl}${workKey}.json`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Open Library API error: ${response.statusText}`);
      }

      const work: OpenLibraryWork = await response.json();
      const normalizedBook = this.normalizeOpenLibraryWork(work);

      // Cache result
      if (useCache && normalizedBook) {
        const cacheKey = CacheKeys.bookMetadata(`openlibrary:${key}`);
        await this.redis.set(cacheKey, normalizedBook, {
          ttl: CacheTTL.BOOK_METADATA,
        });
      }

      return normalizedBook;
    } catch (error) {
      console.error(`Open Library get book by key error (${key}):`, error);
      return null;
    }
  }

  /**
   * Fetch multiple books by titles (for AI recommendations)
   */
  async fetchBooksByTitles(
    titles: string[],
    options: OpenLibrarySearchOptions = {}
  ): Promise<NormalizedBook[]> {
    const results: NormalizedBook[] = [];
    const maxConcurrent = 2; // Be conservative with Open Library

    // Process titles in batches to avoid overwhelming the API
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

      // Add longer delay between batches for Open Library
      if (i + maxConcurrent < titles.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
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
  ): Promise<OpenLibrarySearchDoc[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.fetchBooks(query, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.warn(
            `Open Library API attempt ${attempt} failed, retrying in ${delay}ms:`,
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
  ): Promise<OpenLibrarySearchDoc[]> {
    const encodedQuery = encodeURIComponent(query);
    const fields =
      "key,title,author_name,first_publish_year,isbn,subject,cover_i,language,publisher,publish_year,number_of_pages_median";
    const url = `${this.baseUrl}/search.json?q=${encodedQuery}&limit=${options.maxResults}&fields=${fields}`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(options.timeout),
    });

    if (!response.ok) {
      throw new Error(
        `Open Library API error: ${response.status} ${response.statusText}`
      );
    }

    const data: OpenLibrarySearchResponse = await response.json();
    return data.docs || [];
  }

  /**
   * Normalize Open Library search response to internal format
   */
  private normalizeOpenLibraryResponse(
    docs: OpenLibrarySearchDoc[]
  ): NormalizedBook[] {
    return docs
      .map((doc) => this.normalizeOpenLibrarySearchDoc(doc))
      .filter((book): book is NormalizedBook => book !== null);
  }

  /**
   * Normalize a single Open Library search document
   */
  private normalizeOpenLibrarySearchDoc(
    doc: OpenLibrarySearchDoc
  ): NormalizedBook | null {
    if (!doc.key || !doc.title) {
      return null;
    }

    // Clean up the key (remove /works/ prefix for our internal ID)
    const id = doc.key.replace("/works/", "");

    // Handle authors
    const authors =
      doc.author_name && doc.author_name.length > 0
        ? doc.author_name.filter(Boolean)
        : ["Unknown Author"];

    // Handle categories/subjects (limit to first 5 for performance)
    const categories = doc.subject ? doc.subject.slice(0, 5) : undefined;

    // Generate cover image URL if available
    const imageUrl = doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : undefined;

    return {
      id,
      title: doc.title,
      authors,
      description: undefined, // Search API doesn't include descriptions
      publishedDate: doc.first_publish_year?.toString(),
      isbn: doc.isbn?.[0], // Take first ISBN if available
      imageUrl,
      categories,
      pageCount: doc.number_of_pages_median,
      language: doc.language?.[0] || "en",
      source: "openlibrary" as const,
    };
  }

  /**
   * Normalize Open Library work (detailed view) to internal format
   */
  private normalizeOpenLibraryWork(
    work: OpenLibraryWork
  ): NormalizedBook | null {
    if (!work.key || !work.title) {
      return null;
    }

    const id = work.key.replace("/works/", "");

    // Handle description (can be string or object)
    let description: string | undefined;
    if (typeof work.description === "string") {
      description = work.description;
    } else if (
      work.description &&
      typeof work.description === "object" &&
      work.description.value
    ) {
      description = work.description.value;
    }

    // Handle authors
    const authors =
      work.authors && work.authors.length > 0
        ? work.authors
            .map((author) => {
              if (typeof author.author === "object" && author.author.name) {
                return author.author.name;
              }
              return null;
            })
            .filter((name): name is string => !!name)
        : ["Unknown Author"];

    // Handle subjects/categories
    let categories: string[] | undefined;
    if (Array.isArray(work.subjects)) {
      categories = work.subjects.slice(0, 5);
    } else if (work.subjects) {
      categories = [work.subjects as string];
    } else if (work.subject) {
      categories = Array.isArray(work.subject)
        ? work.subject.slice(0, 5)
        : [work.subject as string];
    }

    // Generate cover image URL
    const imageUrl =
      work.covers && work.covers.length > 0
        ? `https://covers.openlibrary.org/b/id/${work.covers[0]}-M.jpg`
        : undefined;

    return {
      id,
      title: work.title,
      authors: authors.length > 0 ? authors : ["Unknown Author"],
      description,
      publishedDate: work.first_publish_date,
      isbn: undefined, // Work-level objects don't typically have ISBNs
      imageUrl,
      categories,
      pageCount: undefined,
      language: "en", // Default, could be enhanced by fetching edition details
      source: "openlibrary" as const,
    };
  }

  /**
   * Check if the service is available (Open Library is always available, no API key needed)
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Get service status
   */
  getStatus(): { available: boolean; configured: boolean } {
    return {
      available: true,
      configured: true, // No configuration needed for Open Library
    };
  }
}

// Singleton instance
let openLibraryInstance: OpenLibraryService | null = null;

export function getOpenLibraryService(): OpenLibraryService {
  if (!openLibraryInstance) {
    openLibraryInstance = new OpenLibraryService();
  }
  return openLibraryInstance;
}
