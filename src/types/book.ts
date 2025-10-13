import { z } from "zod";

/**
 * Core Book interface for the application
 *
 * This represents the normalized book object used throughout the app.
 * All API responses should be transformed to match this interface.
 */
export interface Book {
  /** Unique identifier for the book */
  id: string;

  /** Book title */
  title: string;

  /** List of authors (can be empty) */
  authors: string[];

  /** Book description/summary (optional) */
  description?: string;

  /** Publication date in ISO format (optional) */
  publishedDate?: string;

  /** Publisher name (optional) */
  publisher?: string;

  /** Number of pages (optional) */
  pageCount?: number;

  /** Array of category/genre tags (optional) */
  categories?: string[];

  /** Language code (e.g., 'en', 'es') */
  language?: string;

  /** ISBN-10 identifier (optional) */
  isbn10?: string;

  /** ISBN-13 identifier (optional) */
  isbn13?: string;

  /** URL to book cover thumbnail image (optional) */
  thumbnail?: string;

  /** URL to small cover image (optional) */
  smallThumbnail?: string;

  /** URL to medium cover image (optional) */
  mediumThumbnail?: string;

  /** URL to large cover image (optional) */
  largeThumbnail?: string;

  /** Average rating from 1-5 (optional) */
  averageRating?: number;

  /** Total number of ratings (optional) */
  ratingsCount?: number;

  /** Preview/sample URL for reading (optional) */
  previewLink?: string;

  /** Purchase/info link (optional) */
  infoLink?: string;

  /** API source this book came from */
  source: "google-books" | "open-library";

  /** Original API response ID for debugging */
  originalId: string;

  /**
   * Indicates if this book is part of the curated "Book of the Day" pool
   * Only true for books seeded from the approved list
   */
  isBookOfTheDay?: boolean;

  /**
   * Short explanation of why this book was selected for curation
   * Only present for curated books (when isBookOfTheDay is true)
   */
  seedReason?: string;
}

/**
 * Zod schema for Book validation
 *
 * Why Zod:
 * - Runtime validation of API responses
 * - Type safety with automatic TypeScript inference
 * - Detailed error messages for debugging
 * - Easy parsing and transformation
 */
export const BookSchema = z.object({
  id: z.string().min(1, "Book ID is required"),
  title: z.string().min(1, "Book title is required"),
  authors: z.array(z.string()).default([]),
  description: z.string().optional(),
  publishedDate: z.string().optional(),
  publisher: z.string().optional(),
  pageCount: z.number().int().positive().optional(),
  categories: z.array(z.string()).optional(),
  language: z.string().optional(),
  isbn10: z.string().optional(),
  isbn13: z.string().optional(),
  thumbnail: z.string().url().optional(),
  smallThumbnail: z.string().url().optional(),
  mediumThumbnail: z.string().url().optional(),
  largeThumbnail: z.string().url().optional(),
  averageRating: z.number().min(0).max(5).optional(),
  ratingsCount: z.number().int().min(0).optional(),
  previewLink: z.string().url().optional(),
  infoLink: z.string().url().optional(),
  source: z.enum(["google-books", "open-library"]),
  originalId: z.string().min(1, "Original ID is required"),
  isBookOfTheDay: z.boolean().optional(),
  seedReason: z.string().optional(),
});

/**
 * Book creation input (for when adding books to favorites)
 * Subset of Book interface with required fields only
 */
export interface CreateBookInput {
  title: string;
  authors: string[];
  description?: string;
  thumbnail?: string;
  source: "google-books" | "open-library";
  originalId: string;
}

export const CreateBookInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  authors: z.array(z.string()).min(1, "At least one author is required"),
  description: z.string().optional(),
  thumbnail: z.string().url().optional(),
  source: z.enum(["google-books", "open-library"]),
  originalId: z.string().min(1, "Original ID is required"),
});

/**
 * Search query parameters
 */
export interface SearchParams {
  /** Search query string */
  query: string;

  /** Maximum number of results to return */
  maxResults?: number;

  /** Starting index for pagination */
  startIndex?: number;

  /** Filter by specific field (title, author, etc.) */
  searchIn?: "title" | "author" | "all";

  /** Language filter */
  language?: string;

  /** Publication date filter (from year) */
  publishedAfter?: number;

  /** Publication date filter (to year) */
  publishedBefore?: number;
}

export const SearchParamsSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  maxResults: z.number().int().positive().max(100).default(20),
  startIndex: z.number().int().min(0).default(0),
  searchIn: z.enum(["title", "author", "all"]).default("all"),
  language: z.string().optional(),
  publishedAfter: z
    .number()
    .int()
    .min(1000)
    .max(new Date().getFullYear())
    .optional(),
  publishedBefore: z
    .number()
    .int()
    .min(1000)
    .max(new Date().getFullYear())
    .optional(),
});

/**
 * Search results container
 */
export interface SearchResults {
  /** Array of found books */
  books: Book[];

  /** Total number of results available */
  totalItems: number;

  /** Current starting index */
  startIndex: number;

  /** Number of items per page */
  itemsPerPage: number;

  /** Whether there are more results available */
  hasMore: boolean;

  /** Query that generated these results */
  query: string;

  /** API source for these results */
  source: "google-books" | "open-library" | "combined";
}

export const SearchResultsSchema = z.object({
  books: z.array(BookSchema),
  totalItems: z.number().int().min(0),
  startIndex: z.number().int().min(0),
  itemsPerPage: z.number().int().positive(),
  hasMore: z.boolean(),
  query: z.string(),
  source: z.enum(["google-books", "open-library", "combined"]),
});

/**
 * Book image configuration
 * Different sizes available from various APIs
 */
export interface BookImage {
  /** Small thumbnail (usually ~128px) */
  smallThumbnail?: string;

  /** Medium thumbnail (usually ~256px) */
  thumbnail?: string;

  /** Medium size image */
  medium?: string;

  /** Large size image */
  large?: string;

  /** Extra large image */
  extraLarge?: string;
}

export const BookImageSchema = z.object({
  smallThumbnail: z.string().url().optional(),
  thumbnail: z.string().url().optional(),
  medium: z.string().url().optional(),
  large: z.string().url().optional(),
  extraLarge: z.string().url().optional(),
});

/**
 * Type helpers and utilities
 */

/** Extract the inferred type from Zod schema */
export type InferredBook = z.infer<typeof BookSchema>;
export type InferredSearchParams = z.infer<typeof SearchParamsSchema>;
export type InferredSearchResults = z.infer<typeof SearchResultsSchema>;
export type InferredCreateBookInput = z.infer<typeof CreateBookInputSchema>;

/** Book ID type for better type safety */
export type BookId = string;

/** Search query type */
export type SearchQuery = string;

/** API source type */
export type ApiSource = "google-books" | "open-library" | "combined";

/** Book status for user interactions */
export type BookStatus = "available" | "reading" | "completed" | "want-to-read";

/**
 * Validation helper functions
 */

/** Safely parse and validate a Book object */
export const parseBook = (data: unknown): Book | null => {
  try {
    return BookSchema.parse(data);
  } catch (error) {
    console.error("Book validation failed:", error);
    return null;
  }
};

/** Safely parse and validate SearchParams */
export const parseSearchParams = (data: unknown): SearchParams | null => {
  try {
    return SearchParamsSchema.parse(data);
  } catch (error) {
    console.error("SearchParams validation failed:", error);
    return null;
  }
};

/** Safely parse and validate SearchResults */
export const parseSearchResults = (data: unknown): SearchResults | null => {
  try {
    return SearchResultsSchema.parse(data);
  } catch (error) {
    console.error("SearchResults validation failed:", error);
    return null;
  }
};

/**
 * Type guards for runtime type checking
 */

export const isBook = (obj: unknown): obj is Book => {
  return BookSchema.safeParse(obj).success;
};

export const isSearchParams = (obj: unknown): obj is SearchParams => {
  return SearchParamsSchema.safeParse(obj).success;
};

export const isSearchResults = (obj: unknown): obj is SearchResults => {
  return SearchResultsSchema.safeParse(obj).success;
};
