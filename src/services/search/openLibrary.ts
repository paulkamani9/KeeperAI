import { apiClient } from "../../lib/apiClient";
import {
  type Book,
  type SearchParams,
  type SearchResults,
  BookSchema,
} from "@/types/book";
import {
  type OpenLibrarySearchResponse,
  OpenLibrarySearchResponseSchema,
} from "@/types/api";

// Interface for handling raw OpenLibrary responses with flexible field formats
interface RawOpenLibraryResponse {
  start?: number;
  num_found?: number;
  numFound?: number;
  docs: any[];
}

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
        // fields: DEFAULT_CONFIG.fields,
        // sort: DEFAULT_CONFIG.sort,
        ...(params.language && { language: params.language }),
      });

      // Make API request
      const rawResponse = await apiClient.get<RawOpenLibraryResponse>(url);

      // Normalize and validate response with fallback strategy
      const searchResults = this.processApiResponse(rawResponse, params);
      return searchResults;
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

    // If authorQuery is provided, combine title and author fields for precise search
    if (params.authorQuery && params.authorQuery.trim()) {
      const titleQuery = `title:${query}`;
      const authorQuery = `author:${params.authorQuery.trim()}`;
      return `${titleQuery} ${authorQuery}`;
    }

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
   * Process and normalize OpenLibrary API response with robust error handling
   *
   * @param rawResponse Raw response from OpenLibrary API
   * @param originalParams Original search parameters
   * @returns Normalized search results
   */
  private processApiResponse(
    rawResponse: RawOpenLibraryResponse,
    originalParams: SearchParams
  ): SearchResults {
    try {
      // Step 1: Normalize the response format (snake_case -> camelCase)
      const normalizedResponse = this.normalizeOpenLibraryResponse(rawResponse);

      // Step 2: Try Zod validation on normalized response
      const validatedResponse =
        OpenLibrarySearchResponseSchema.safeParse(normalizedResponse);

      if (validatedResponse.success) {
        // Happy path: validation successful
        return this.transformToSearchResults(
          validatedResponse.data,
          originalParams
        );
      } else {
        // Step 3: Validation failed, log warning but continue with fallback
        console.warn(
          "OpenLibrary response validation failed, using fallback parsing:",
          validatedResponse.error.message
        );

        // Use fallback strategy with raw response
        return this.transformRawResponseToSearchResults(
          rawResponse,
          originalParams
        );
      }
    } catch (error) {
      console.error("Failed to process OpenLibrary response:", error);

      // Last resort: try to extract any usable data
      return this.createEmptySearchResults(originalParams, String(error));
    }
  }

  /**
   * Normalize OpenLibrary response by converting snake_case to camelCase
   * and handling field inconsistencies
   *
   * @param rawResponse Raw response from API
   * @returns Normalized response matching expected schema
   */
  private normalizeOpenLibraryResponse(
    rawResponse: RawOpenLibraryResponse
  ): OpenLibrarySearchResponse {
    // Handle the dual field format issue (num_found vs numFound)
    const numFound = rawResponse.numFound ?? rawResponse.num_found ?? 0;

    return {
      start: rawResponse.start ?? 0,
      num_found: numFound,
      numFound: numFound,
      docs: rawResponse.docs || [],
    };
  }

  /**
   * Fallback transformation when Zod validation fails
   * Attempts to extract usable data from raw response
   *
   * @param rawResponse Raw response that failed validation
   * @param originalParams Original search parameters
   * @returns SearchResults with available data
   */
  private transformRawResponseToSearchResults(
    rawResponse: RawOpenLibraryResponse,
    originalParams: SearchParams
  ): SearchResults {
    const docs = rawResponse.docs || [];
    const totalItems =
      rawResponse.numFound ?? rawResponse.num_found ?? docs.length;

    // Transform documents with more lenient approach
    const books: Book[] = [];

    for (const doc of docs) {
      try {
        const book = this.transformDocToBook(doc);
        // Only validate individual books, not the whole response
        if (BookSchema.safeParse(book).success) {
          books.push(book);
        } else {
          console.warn(
            "Skipping invalid book from OpenLibrary:",
            doc.title || doc.key
          );
        }
      } catch (error) {
        console.warn("Failed to transform OpenLibrary doc:", error);
        // Continue processing other docs
      }
    }

    const itemsPerPage = originalParams.maxResults || DEFAULT_CONFIG.limit;
    const startIndex = originalParams.startIndex || 0;

    return {
      books,
      totalItems,
      startIndex,
      itemsPerPage,
      hasMore: startIndex + books.length < totalItems,
      query: originalParams.query,
      source: "open-library",
    };
  }

  /**
   * Create empty search results when all parsing attempts fail
   *
   * @param originalParams Original search parameters
   * @param errorContext Error context for logging
   * @returns Empty search results
   */
  private createEmptySearchResults(
    originalParams: SearchParams,
    errorContext?: string
  ): SearchResults {
    console.warn(
      "Returning empty OpenLibrary results due to parsing failure:",
      errorContext
    );

    return {
      books: [],
      totalItems: 0,
      startIndex: originalParams.startIndex || 0,
      itemsPerPage: originalParams.maxResults || DEFAULT_CONFIG.limit,
      hasMore: false,
      query: originalParams.query,
      source: "open-library",
    };
  }

  /**
   * Transform a single Open Library doc to normalized Book format
   * Now with robust error handling for malformed data
   *
   * @param doc Open Library search result document
   * @returns Normalized Book object
   */
  private transformDocToBook(doc: any): Book {
    // Ensure we have minimum required fields
    if (!doc || !doc.key || !doc.title) {
      throw new Error(
        "Missing required fields (key or title) in OpenLibrary document"
      );
    }

    // Extract ISBNs with safe array handling (can be strings or numbers)
    let isbn10: string | undefined;
    let isbn13: string | undefined;

    if (Array.isArray(doc.isbn)) {
      for (const isbn of doc.isbn) {
        // Convert to string and clean - handles both string and number formats
        const cleanIsbn = String(isbn).replace(/[^0-9X]/g, "");
        if (cleanIsbn.length === 10) {
          isbn10 = cleanIsbn;
        } else if (cleanIsbn.length === 13) {
          isbn13 = cleanIsbn;
        }
      }
    }

    // Generate cover image URLs from cover_i with validation
    let thumbnail: string | undefined;
    let smallThumbnail: string | undefined;
    let mediumThumbnail: string | undefined;
    let largeThumbnail: string | undefined;

    const coverId = doc.cover_i || doc.cover_id;
    if (coverId && typeof coverId === "number" && coverId > 0) {
      smallThumbnail = `${this.coversUrl}/id/${coverId}-S.jpg`;
      thumbnail = `${this.coversUrl}/id/${coverId}-M.jpg`;
      mediumThumbnail = `${this.coversUrl}/id/${coverId}-L.jpg`;
      largeThumbnail = `${this.coversUrl}/id/${coverId}-L.jpg`;
    }

    // Extract publication year with fallbacks
    const publishYear =
      doc.first_publish_year ||
      (Array.isArray(doc.publish_year)
        ? doc.publish_year[0]
        : doc.publish_year);
    const publishedDate = publishYear ? `${publishYear}-01-01` : undefined;

    // Safe key processing
    const cleanKey = String(doc.key).replace("/works/", "");

    // Safe array processing for authors
    const authors = Array.isArray(doc.author_name)
      ? doc.author_name.filter(
          (author: any) => author && typeof author === "string"
        )
      : [];

    // Safe publisher extraction
    let publisher: string | undefined;
    if (Array.isArray(doc.publisher) && doc.publisher.length > 0) {
      publisher = String(doc.publisher[0]);
    } else if (doc.publisher && typeof doc.publisher === "string") {
      publisher = doc.publisher;
    }

    // Safe language extraction
    let language: string | undefined;
    if (Array.isArray(doc.language) && doc.language.length > 0) {
      language = String(doc.language[0]);
    } else if (doc.language && typeof doc.language === "string") {
      language = doc.language;
    }

    // Safe categories extraction
    let categories: string[] | undefined;
    if (Array.isArray(doc.subject) && doc.subject.length > 0) {
      categories = doc.subject
        .filter((subj: any) => subj && typeof subj === "string")
        .slice(0, 5); // Limit to 5 categories
    }

    return {
      id: `open-library-${cleanKey}`,
      title: String(doc.title) || "Unknown Title",
      authors,
      description: undefined, // Not available in search results
      publishedDate,
      publisher,
      pageCount:
        typeof doc.number_of_pages_median === "number"
          ? doc.number_of_pages_median
          : undefined,
      categories,
      language,
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
      originalId: cleanKey,
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

    // Handle parsing errors (now more specific since we have fallback parsing)
    if (
      error.message?.includes("Invalid Open Library API response") ||
      error.message?.includes("Failed to process OpenLibrary response")
    ) {
      return new Error(
        "Unable to parse Open Library API response. The service may be experiencing issues."
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
