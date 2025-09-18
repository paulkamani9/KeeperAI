import { apiClient } from "../lib/apiClient";
import {
  type Book,
  type SearchParams,
  type SearchResults,
  BookSchema,
} from "../types/book";
import {
  type OpenLibrarySearchResponse,
  OpenLibrarySearchResponseSchema,
  API_ERROR_CODES,
} from "../types/api";

/**
 * Open Library API Service
 *
 * Provides search functionality for books using Open Library API.
 * Acts as a fallback when Google Books API is unavailable or rate limited.
 *
 * API Documentation: https://openlibrary.org/developers/api
 */

/** Base URL for Open Library API */
const OPEN_LIBRARY_BASE_URL = "https://openlibrary.org";

/** Base URL for Open Library covers */
const OPEN_LIBRARY_COVERS_URL = "https://covers.openlibrary.org/b";

/** Default configuration for Open Library requests */
const DEFAULT_CONFIG = {
  limit: 20,
  fields:
    "key,title,subtitle,author_name,author_key,first_publish_year,isbn,cover_i,edition_count,publisher,language,subject,number_of_pages_median,ebook_access",
  sort: "relevance",
};

/**
 * Open Library API service class
 *
 * Features:
 * - No API key required (free access)
 * - Good fallback for when Google Books API is unavailable
 * - Provides cover images and basic book metadata
 * - Different data structure requires careful normalization
 */
export class OpenLibraryService {
  private baseUrl: string;
  private coversUrl: string;

  constructor(
    baseUrl: string = OPEN_LIBRARY_BASE_URL,
    coversUrl: string = OPEN_LIBRARY_COVERS_URL
  ) {
    this.baseUrl = baseUrl;
    this.coversUrl = coversUrl;
  }

  /**
   * Search for books using Open Library API
   *
   * @param params Search parameters
   * @returns Promise<SearchResults> Normalized search results
   */
  async searchBooks(params: SearchParams): Promise<SearchResults> {
    try {
      // Build query string based on search parameters
      const query = this.buildSearchQuery(params);

      // Build request URL with parameters
      const url = this.buildRequestUrl("search.json", {
        q: query,
        offset: params.startIndex || 0,
        limit: Math.min(params.maxResults || DEFAULT_CONFIG.limit, 100), // Open Library max is 100
        fields: DEFAULT_CONFIG.fields,
        sort: DEFAULT_CONFIG.sort,
        ...(params.language && { language: params.language }),
      });

      // Make API request
      const response = await apiClient.get<OpenLibrarySearchResponse>(url);

      // Validate response format
      const validatedResponse =
        OpenLibrarySearchResponseSchema.safeParse(response);
      if (!validatedResponse.success) {
        throw new Error(
          `Invalid Open Library API response: ${validatedResponse.error.message}`
        );
      }

      // Transform to normalized format
      return this.transformToSearchResults(validatedResponse.data, params);
    } catch (error: any) {
      throw this.handleApiError(error, params.query);
    }
  }

  /**
   * Get detailed information about a specific work
   *
   * @param workKey Open Library work key (e.g., "/works/OL123W")
   * @returns Promise<Book | null> Book details or null if not found
   */
  async getWorkDetails(workKey: string): Promise<Book | null> {
    try {
      const cleanKey = workKey.startsWith("/works/")
        ? workKey
        : `/works/${workKey}`;
      const url = this.buildRequestUrl(`${cleanKey.substring(1)}.json`);

      const response = await apiClient.get(url);

      // Get additional author information
      const book = await this.transformWorkToBook(response, cleanKey);
      return BookSchema.safeParse(book).success ? book : null;
    } catch (error: any) {
      if (error.status === 404) {
        return null; // Work not found
      }
      throw this.handleApiError(error, workKey);
    }
  }

  /**
   * Build search query string based on parameters
   *
   * Open Library search supports various fields:
   * - title: book title
   * - author: author name
   * - publisher: publisher name
   * - subject: book subject/category
   * - isbn: ISBN number
   * - language: language code
   *
   * @param params Search parameters
   * @returns Formatted query string
   */
  private buildSearchQuery(params: SearchParams): string {
    let query = params.query.trim();

    // If searchIn is specified, use Open Library field queries
    if (params.searchIn && params.searchIn !== "all") {
      switch (params.searchIn) {
        case "title":
          query = `title:${query}`;
          break;
        case "author":
          query = `author:${query}`;
          break;
      }
    }

    // Add publication year filters if specified
    if (params.publishedAfter || params.publishedBefore) {
      const afterYear = params.publishedAfter || 0;
      const beforeYear = params.publishedBefore || new Date().getFullYear();

      // Open Library supports first_publish_year field
      query += ` first_publish_year:[${afterYear} TO ${beforeYear}]`;
    }

    return query;
  }

  /**
   * Build complete request URL with query parameters
   *
   * @param endpoint API endpoint (e.g., 'search.json', 'works/OL123W.json')
   * @param params Query parameters
   * @returns Complete URL string
   */
  private buildRequestUrl(
    endpoint: string,
    params: Record<string, any> = {}
  ): string {
    const url = new URL(`${this.baseUrl}/${endpoint}`);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    return url.toString();
  }

  /**
   * Transform Open Library API response to normalized SearchResults
   *
   * @param response Open Library API response
   * @param originalParams Original search parameters
   * @returns Normalized search results
   */
  private transformToSearchResults(
    response: OpenLibrarySearchResponse,
    originalParams: SearchParams
  ): SearchResults {
    const books = response.docs.map((doc) => this.transformDocToBook(doc));

    // Filter out any books that failed validation
    const validBooks = books.filter(
      (book) => BookSchema.safeParse(book).success
    );

    const itemsPerPage = originalParams.maxResults || DEFAULT_CONFIG.limit;
    const startIndex = originalParams.startIndex || 0;

    return {
      books: validBooks,
      totalItems: response.numFound,
      startIndex,
      itemsPerPage,
      hasMore: startIndex + validBooks.length < response.numFound,
      query: originalParams.query,
      source: "open-library",
    };
  }

  /**
   * Transform a single Open Library doc to normalized Book format
   *
   * @param doc Open Library search result document
   * @returns Normalized Book object
   */
  private transformDocToBook(doc: any): Book {
    // Extract ISBNs
    let isbn10: string | undefined;
    let isbn13: string | undefined;

    if (doc.isbn) {
      for (const isbn of doc.isbn) {
        if (isbn.length === 10) {
          isbn10 = isbn;
        } else if (isbn.length === 13) {
          isbn13 = isbn;
        }
      }
    }

    // Generate cover image URLs from cover_i
    let thumbnail: string | undefined;
    let smallThumbnail: string | undefined;
    let mediumThumbnail: string | undefined;
    let largeThumbnail: string | undefined;

    if (doc.cover_i) {
      smallThumbnail = `${this.coversUrl}/id/${doc.cover_i}-S.jpg`;
      thumbnail = `${this.coversUrl}/id/${doc.cover_i}-M.jpg`;
      mediumThumbnail = `${this.coversUrl}/id/${doc.cover_i}-L.jpg`;
      largeThumbnail = `${this.coversUrl}/id/${doc.cover_i}-L.jpg`;
    }

    // Extract publication year
    const publishYear = doc.first_publish_year;
    const publishedDate = publishYear ? `${publishYear}-01-01` : undefined;

    return {
      id: `open-library-${doc.key.replace("/works/", "")}`,
      title: doc.title || "Unknown Title",
      authors: doc.author_name || [],
      description: undefined, // Not available in search results
      publishedDate,
      publisher: Array.isArray(doc.publisher)
        ? doc.publisher[0]
        : doc.publisher,
      pageCount: doc.number_of_pages_median,
      categories: doc.subject ? doc.subject.slice(0, 5) : undefined, // Limit categories
      language: Array.isArray(doc.language) ? doc.language[0] : doc.language,
      isbn10,
      isbn13,
      thumbnail,
      smallThumbnail,
      mediumThumbnail,
      largeThumbnail,
      averageRating: undefined, // Not available in Open Library
      ratingsCount: undefined, // Not available in Open Library
      previewLink: `${this.baseUrl}${doc.key}`,
      infoLink: `${this.baseUrl}${doc.key}`,
      source: "open-library",
      originalId: doc.key.replace("/works/", ""),
    };
  }

  /**
   * Transform a work response to normalized Book format (for detailed view)
   *
   * @param work Open Library work object
   * @param workKey Work key for reference
   * @returns Normalized Book object
   */
  private async transformWorkToBook(work: any, workKey: string): Promise<Book> {
    // Extract description (can be string or object)
    let description: string | undefined;
    if (typeof work.description === "string") {
      description = work.description;
    } else if (work.description?.value) {
      description = work.description.value;
    }

    // Extract subjects/categories
    const categories = work.subjects ? work.subjects.slice(0, 5) : undefined;

    // Extract cover from covers array
    let thumbnail: string | undefined;
    let smallThumbnail: string | undefined;
    let mediumThumbnail: string | undefined;
    let largeThumbnail: string | undefined;

    if (work.covers && work.covers[0]) {
      const coverId = work.covers[0];
      smallThumbnail = `${this.coversUrl}/id/${coverId}-S.jpg`;
      thumbnail = `${this.coversUrl}/id/${coverId}-M.jpg`;
      mediumThumbnail = `${this.coversUrl}/id/${coverId}-L.jpg`;
      largeThumbnail = `${this.coversUrl}/id/${coverId}-L.jpg`;
    }

    // Get author names (requires additional API calls)
    let authors: string[] = [];
    if (work.authors && work.authors.length > 0) {
      authors = await this.fetchAuthorNames(work.authors);
    }

    return {
      id: `open-library-${workKey.replace("/works/", "")}`,
      title: work.title || "Unknown Title",
      authors,
      description: this.cleanDescription(description),
      publishedDate: work.first_publish_date,
      publisher: undefined, // Not available in work details
      pageCount: undefined, // Not available in work details
      categories,
      language: undefined, // Not available in work details
      isbn10: undefined, // Not available in work details
      isbn13: undefined, // Not available in work details
      thumbnail,
      smallThumbnail,
      mediumThumbnail,
      largeThumbnail,
      averageRating: undefined, // Not available in Open Library
      ratingsCount: undefined, // Not available in Open Library
      previewLink: `${this.baseUrl}${workKey}`,
      infoLink: `${this.baseUrl}${workKey}`,
      source: "open-library",
      originalId: workKey.replace("/works/", ""),
    };
  }

  /**
   * Fetch author names from author references
   *
   * @param authorRefs Array of author reference objects
   * @returns Promise<string[]> Array of author names
   */
  private async fetchAuthorNames(authorRefs: any[]): Promise<string[]> {
    try {
      const authorPromises = authorRefs.slice(0, 3).map(async (ref) => {
        try {
          const authorKey = ref.author?.key || ref.key;
          if (!authorKey) return null;

          const url = this.buildRequestUrl(`${authorKey.substring(1)}.json`);
          const authorData = await apiClient.get(url);

          return (
            authorData.name || authorData.personal_name || "Unknown Author"
          );
        } catch {
          return null; // Skip failed author lookups
        }
      });

      const authorNames = await Promise.all(authorPromises);
      return authorNames.filter((name) => name !== null) as string[];
    } catch {
      return []; // Return empty array if author fetching fails
    }
  }

  /**
   * Clean and format book description
   *
   * @param description Raw description from API
   * @returns Cleaned description or undefined
   */
  private cleanDescription(description?: string): string | undefined {
    if (!description) return undefined;

    // Clean up common formatting issues
    const cleaned = description
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return cleaned || undefined;
  }

  /**
   * Handle and normalize API errors
   *
   * @param error Original error from API client
   * @param context Additional context (query, workKey, etc.)
   * @returns Normalized error with appropriate message and code
   */
  private handleApiError(error: any, context?: string): Error {
    const contextMsg = context ? ` for "${context}"` : "";

    // Handle specific HTTP status codes
    if (error.status) {
      switch (error.status) {
        case 400:
          return new Error(
            `Invalid search query${contextMsg}: ${error.message}`
          );
        case 404:
          return new Error(`Book not found${contextMsg}`);
        case 429:
          return new Error(
            "Open Library API rate limit exceeded. Please try again later."
          );
        case 500:
        case 502:
        case 503:
        case 504:
          return new Error(
            "Open Library API is temporarily unavailable. Please try again later."
          );
      }
    }

    // Handle network and timeout errors
    if (error.isNetworkError) {
      return new Error(
        "Network error while contacting Open Library API. Please check your connection."
      );
    }

    if (error.isTimeout) {
      return new Error("Open Library API request timed out. Please try again.");
    }

    // Handle parsing errors
    if (error.message?.includes("Invalid Open Library API response")) {
      return new Error(
        "Received invalid response from Open Library API. Please try again."
      );
    }

    // Generic error fallback
    return new Error(
      `Open Library API error${contextMsg}: ${error.message || "Unknown error occurred"}`
    );
  }

  /**
   * Check if the service is properly configured
   *
   * @returns Boolean indicating if service can be used
   */
  isConfigured(): boolean {
    // Open Library doesn't require API key
    return true;
  }

  /**
   * Get rate limit information
   *
   * @returns Rate limit status
   */
  getRateLimit(): { hasKey: boolean; unlimited: boolean } {
    return {
      hasKey: false, // No API key needed
      unlimited: false, // Still has rate limits
    };
  }
}

/**
 * Default Open Library service instance
 */
export const openLibraryService = new OpenLibraryService();

/**
 * Create a new Open Library service instance with custom configuration
 *
 * @param baseUrl Custom base URL (for testing)
 * @param coversUrl Custom covers URL (for testing)
 * @returns New OpenLibraryService instance
 */
export const createOpenLibraryService = (
  baseUrl?: string,
  coversUrl?: string
): OpenLibraryService => {
  return new OpenLibraryService(baseUrl, coversUrl);
};
