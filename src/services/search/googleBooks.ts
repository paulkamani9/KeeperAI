import { apiClient } from "@/lib/apiClient";
import {
  type Book,
  type SearchParams,
  type SearchResults,
  BookSchema,
} from "@/types/book";
import {
  type GoogleBooksResponse,
  type GoogleBooksVolume,
  GoogleBooksResponseSchema,
} from "@/types/api";

/**
 * Google Books API Service
 *
 * Provides search functionality for books using Google Books API v1.
 * Handles data normalization, error handling, and rate limiting.
 *
 * API Documentation: https://developers.google.com/books/docs/v1/using
 */

/** Base URL for Google Books API */
const GOOGLE_BOOKS_BASE_URL = "https://www.googleapis.com/books/v1";

/** Default configuration for Google Books requests */
const DEFAULT_CONFIG = {
  maxResults: 20,
  printType: "books", // Only return books (not magazines)
  projection: "full", // Get full volume info
  orderBy: "relevance", // Order by relevance
};

/**
 * Google Books API service class
 *
 * Why a class:
 * - Encapsulates API-specific logic
 * - Maintains configuration state
 * - Easier to mock in tests
 * - Can be extended for additional functionality
 */
export class GoogleBooksService {
  private apiKey?: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl: string = GOOGLE_BOOKS_BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Search for books using Google Books API
   *
   * @param params Search parameters
   * @returns Promise<SearchResults> Normalized search results
   */
  async searchBooks(params: SearchParams): Promise<SearchResults> {
    try {
      // Build query string based on search parameters
      const query = this.buildSearchQuery(params);

      // Build request URL with parameters
      const url = this.buildRequestUrl("volumes", {
        q: query,
        startIndex: params.startIndex || 0,
        maxResults: Math.min(
          params.maxResults || DEFAULT_CONFIG.maxResults,
          40
        ), // Google Books max is 40
        printType: DEFAULT_CONFIG.printType,
        projection: DEFAULT_CONFIG.projection,
        orderBy: DEFAULT_CONFIG.orderBy,
        langRestrict: params.language,
        ...(this.apiKey && { key: this.apiKey }),
      });

      // Make API request
      const response = await apiClient.get<GoogleBooksResponse>(url);

      // Validate response format
      const validatedResponse = GoogleBooksResponseSchema.safeParse(response);
      if (!validatedResponse.success) {
        throw new Error(
          `Invalid Google Books API response: ${validatedResponse.error.message}`
        );
      }

      // Transform to normalized format
      return this.transformToSearchResults(validatedResponse.data, params);
    } catch (error: any) {
      throw this.handleApiError(error, params.query);
    }
  }

  /**
   * Get detailed information about a specific book
   *
   * @param volumeId Google Books volume ID
   * @returns Promise<Book | null> Book details or null if not found
   */
  async getBookDetails(volumeId: string): Promise<Book | null> {
    try {
      const url = this.buildRequestUrl(`volumes/${volumeId}`, {
        projection: "full",
        ...(this.apiKey && { key: this.apiKey }),
      });

      const response = await apiClient.get<GoogleBooksVolume>(url);

      const book = this.transformVolumeToBook(response);
      return BookSchema.safeParse(book).success ? book : null;
    } catch (error: any) {
      if (error.status === 404) {
        return null; // Book not found
      }
      throw this.handleApiError(error, volumeId);
    }
  }

  /**
   * Build search query string based on parameters
   *
   * Google Books supports advanced search syntax:
   * - intitle: searches in title
   * - inauthor: searches in author
   * - inpublisher: searches in publisher
   * - subject: searches in category/subject
   * - isbn: searches by ISBN
   *
   * @param params Search parameters
   * @returns Formatted query string
   */
  private buildSearchQuery(params: SearchParams): string {
    let query = params.query.trim();

    // If authorQuery is provided, combine title and author fields for precise search
    if (params.authorQuery && params.authorQuery.trim()) {
      const titleQuery = `intitle:${query}`;
      const authorQuery = `inauthor:${params.authorQuery.trim()}`;
      return `${titleQuery} ${authorQuery}`;
    }

    // If searchIn is specified, use Google Books field operators
    if (params.searchIn && params.searchIn !== "all") {
      switch (params.searchIn) {
        case "title":
          query = `intitle:${query}`;
          break;
        case "author":
          query = `inauthor:${query}`;
          break;
      }
    }

    // Add publication date filters if specified
    if (params.publishedAfter || params.publishedBefore) {
      const afterYear = params.publishedAfter || 0;
      const beforeYear = params.publishedBefore || new Date().getFullYear();

      // Google Books doesn't have direct date filtering, but we can try adding years to query
      query += ` published:${afterYear}-${beforeYear}`;
    }

    return query;
  }

  /**
   * Build complete request URL with query parameters
   *
   * @param endpoint API endpoint (e.g., 'volumes', 'volumes/123')
   * @param params Query parameters
   * @returns Complete URL string
   */
  private buildRequestUrl(
    endpoint: string,
    params: Record<string, any>
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
   * Transform Google Books API response to normalized SearchResults
   *
   * @param response Google Books API response
   * @param originalParams Original search parameters
   * @returns Normalized search results
   */
  private transformToSearchResults(
    response: GoogleBooksResponse,
    originalParams: SearchParams
  ): SearchResults {
    const books =
      response.items?.map((volume) => this.transformVolumeToBook(volume)) || [];

    // Filter out any books that failed validation
    const validBooks = books.filter(
      (book) => BookSchema.safeParse(book).success
    );

    const itemsPerPage = originalParams.maxResults || DEFAULT_CONFIG.maxResults;
    const startIndex = originalParams.startIndex || 0;

    return {
      books: validBooks,
      totalItems: response.totalItems,
      startIndex,
      itemsPerPage,
      hasMore: startIndex + validBooks.length < response.totalItems,
      query: originalParams.query,
      source: "google-books",
    };
  }

  /**
   * Transform a single Google Books volume to normalized Book format
   *
   * @param volume Google Books volume object
   * @returns Normalized Book object
   */
  private transformVolumeToBook(volume: GoogleBooksVolume): Book {
    const info = volume.volumeInfo;

    // Extract ISBNs from industry identifiers
    let isbn10: string | undefined;
    let isbn13: string | undefined;

    if (info.industryIdentifiers) {
      for (const identifier of info.industryIdentifiers) {
        if (identifier.type === "ISBN_10") {
          isbn10 = identifier.identifier;
        } else if (identifier.type === "ISBN_13") {
          isbn13 = identifier.identifier;
        }
      }
    }

    // Normalize image URLs (Google Books provides different sizes)
    const images = info.imageLinks || {};

    return {
      id: `google-books-${volume.id}`,
      title: info.title || "Unknown Title",
      authors: info.authors || [],
      description: this.cleanDescription(info.description),
      publishedDate: info.publishedDate,
      publisher: info.publisher,
      pageCount: info.pageCount,
      categories: info.categories,
      language: info.language,
      isbn10,
      isbn13,
      thumbnail: this.cleanImageUrl(images.thumbnail),
      smallThumbnail: this.cleanImageUrl(images.smallThumbnail),
      mediumThumbnail: this.cleanImageUrl(images.small || images.medium),
      largeThumbnail: this.cleanImageUrl(images.large || images.extraLarge),
      averageRating: info.averageRating,
      ratingsCount: info.ratingsCount,
      previewLink: info.previewLink,
      infoLink: info.infoLink,
      source: "google-books",
      originalId: volume.id,
    };
  }

  /**
   * Clean and format book description
   *
   * @param description Raw description from API
   * @returns Cleaned description or undefined
   */
  private cleanDescription(description?: string): string | undefined {
    if (!description) return undefined;

    // Remove HTML tags and decode HTML entities
    const cleaned = description
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    return cleaned || undefined;
  }

  /**
   * Clean and validate image URLs
   *
   * @param url Raw image URL from API
   * @returns Cleaned HTTPS URL or undefined
   */
  private cleanImageUrl(url?: string): string | undefined {
    if (!url) return undefined;

    // Convert HTTP to HTTPS for security
    const httpsUrl = url.replace(/^http:/, "https:");

    // Validate URL format
    try {
      new URL(httpsUrl);
      return httpsUrl;
    } catch {
      return undefined;
    }
  }

  /**
   * Handle and normalize API errors
   *
   * @param error Original error from API client
   * @param context Additional context (query, volumeId, etc.)
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
        case 401:
          return new Error(
            "Google Books API authentication failed. Please check your API key."
          );
        case 403:
          return new Error(
            "Google Books API access forbidden. Please check your API key permissions."
          );
        case 404:
          return new Error(`Book not found${contextMsg}`);
        case 429:
          return new Error(
            "Google Books API rate limit exceeded. Please try again later."
          );
        case 500:
        case 502:
        case 503:
        case 504:
          return new Error(
            "Google Books API is temporarily unavailable. Please try again later."
          );
      }
    }

    // Handle network and timeout errors
    if (error.isNetworkError) {
      return new Error(
        "Network error while contacting Google Books API. Please check your connection."
      );
    }

    if (error.isTimeout) {
      return new Error("Google Books API request timed out. Please try again.");
    }

    // Handle parsing errors
    if (error.message?.includes("Invalid Google Books API response")) {
      return new Error(
        "Received invalid response from Google Books API. Please try again."
      );
    }

    // Generic error fallback
    return new Error(
      `Google Books API error${contextMsg}: ${error.message || "Unknown error occurred"}`
    );
  }

  /**
   * Check if the service is properly configured
   *
   * @returns Boolean indicating if service can be used
   */
  isConfigured(): boolean {
    // Google Books API can work without API key but with limited quotas
    return true;
  }

  /**
   * Get rate limit information (if available)
   *
   * @returns Rate limit status
   */
  getRateLimit(): { hasKey: boolean; unlimited: boolean } {
    return {
      hasKey: !!this.apiKey,
      unlimited: false, // Google Books always has quotas
    };
  }
}

/**
 * Default Google Books service instance
 * Uses API key from environment variable if available
 */
export const googleBooksService = new GoogleBooksService(
  process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY
);

/**
 * Create a new Google Books service instance with custom configuration
 *
 * @param apiKey Google Books API key
 * @param baseUrl Custom base URL (for testing)
 * @returns New GoogleBooksService instance
 */
export const createGoogleBooksService = (
  apiKey?: string,
  baseUrl?: string
): GoogleBooksService => {
  return new GoogleBooksService(apiKey, baseUrl);
};
