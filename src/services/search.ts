/**
 * Search Service for External API Integration
 *
 * This service handles search operations across multiple book APIs
 * with normalization and deduplication capabilities.
 */

import { getRedisService, CacheKeys, CacheTTL } from "./redis";

// External API Response Types
interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    imageLinks?: {
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
    };
    categories?: string[];
    pageCount?: number;
    language?: string;
  };
}

interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  isbn?: string[];
  subject?: string[];
  cover_i?: number;
  language?: string[];
}

// Normalized Book Object
export interface NormalizedBook {
  id: string;
  title: string;
  authors: string[];
  description?: string;
  publishedDate?: string;
  isbn?: string;
  imageUrl?: string;
  categories?: string[];
  pageCount?: number;
  language?: string;
  source: "google" | "openlibrary";
}

export interface SearchOptions {
  maxResults?: number;
  useCache?: boolean;
  timeout?: number;
}

export class SearchService {
  private redis = getRedisService();

  /**
   * Search for books using the primary Google Books API
   */
  async searchGoogleBooks(
    query: string,
    options: SearchOptions = {}
  ): Promise<NormalizedBook[]> {
    try {
      const { maxResults = 10, timeout = 5000 } = options;
      const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

      if (!apiKey) {
        console.warn("Google Books API key not configured");
        return [];
      }

      const encodedQuery = encodeURIComponent(query);
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=${maxResults}&key=${apiKey}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.normalizeGoogleBooksResponse(data.items || []);
    } catch (error) {
      console.error("Google Books search error:", error);
      return [];
    }
  }

  /**
   * Search for books using the fallback Open Library API
   */
  async searchOpenLibrary(
    query: string,
    options: SearchOptions = {}
  ): Promise<NormalizedBook[]> {
    try {
      const { maxResults = 10, timeout = 5000 } = options;

      const encodedQuery = encodeURIComponent(query);
      const url = `https://openlibrary.org/search.json?q=${encodedQuery}&limit=${maxResults}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Open Library API error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.normalizeOpenLibraryResponse(data.docs || []);
    } catch (error) {
      console.error("Open Library search error:", error);
      return [];
    }
  }

  /**
   * Unified search with fallback and caching
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<NormalizedBook[]> {
    const { useCache = true } = options;
    const cacheKey = CacheKeys.search(query);

    // Check cache first
    if (useCache) {
      const cached = await this.redis.get<NormalizedBook[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Try Google Books first
    let results = await this.searchGoogleBooks(query, options);

    // Fallback to Open Library if no results
    if (results.length === 0) {
      results = await this.searchOpenLibrary(query, options);
    }

    // Deduplicate results
    const deduplicated = this.deduplicateBooks(results);

    // Cache results
    if (useCache && deduplicated.length > 0) {
      await this.redis.set(cacheKey, deduplicated, {
        ttl: CacheTTL.SEARCH_RESULTS,
      });
    }

    return deduplicated;
  }

  /**
   * Normalize Google Books API response
   */
  private normalizeGoogleBooksResponse(
    volumes: GoogleBooksVolume[]
  ): NormalizedBook[] {
    return volumes.map((volume) => {
      const info = volume.volumeInfo;

      // Find ISBN
      const isbn13 = info.industryIdentifiers?.find(
        (id) => id.type === "ISBN_13"
      )?.identifier;
      const isbn10 = info.industryIdentifiers?.find(
        (id) => id.type === "ISBN_10"
      )?.identifier;

      return {
        id: volume.id,
        title: info.title || "Unknown Title",
        authors: info.authors || ["Unknown Author"],
        description: info.description,
        publishedDate: info.publishedDate,
        isbn: isbn13 || isbn10,
        imageUrl: info.imageLinks?.thumbnail || info.imageLinks?.small,
        categories: info.categories,
        pageCount: info.pageCount,
        language: info.language,
        source: "google" as const,
      };
    });
  }

  /**
   * Normalize Open Library API response
   */
  private normalizeOpenLibraryResponse(
    books: OpenLibraryBook[]
  ): NormalizedBook[] {
    return books.map((book) => ({
      id: book.key.replace("/works/", ""),
      title: book.title,
      authors: book.author_name || ["Unknown Author"],
      description: undefined, // Open Library search doesn't include descriptions
      publishedDate: book.first_publish_year?.toString(),
      isbn: book.isbn?.[0],
      imageUrl: book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
        : undefined,
      categories: book.subject?.slice(0, 3), // Limit to 3 categories
      pageCount: undefined,
      language: book.language?.[0],
      source: "openlibrary" as const,
    }));
  }

  /**
   * Deduplicate books based on ISBN and title similarity
   */
  private deduplicateBooks(books: NormalizedBook[]): NormalizedBook[] {
    const seen = new Set<string>();
    const result: NormalizedBook[] = [];

    for (const book of books) {
      // Create a deduplication key
      const key =
        book.isbn ||
        `${book.title.toLowerCase().trim()}-${book.authors[0]?.toLowerCase().trim()}`;

      if (!seen.has(key)) {
        seen.add(key);
        result.push(book);
      }
    }

    return result;
  }
}

// Singleton instance
let searchInstance: SearchService | null = null;

export function getSearchService(): SearchService {
  if (!searchInstance) {
    searchInstance = new SearchService();
  }
  return searchInstance;
}
