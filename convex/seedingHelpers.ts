/**
 * Helper utilities for seeding curated books
 *
 * This module provides functions for:
 * - Text normalization for matching
 * - Duplicate detection by title/author
 * - API fetching from Google Books and Open Library
 * - Metadata extraction and normalization
 */

import { QueryCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

/**
 * Normalize text for exact matching
 * - Trim whitespace
 * - Convert to lowercase
 * - Remove extra spaces between words
 */
export function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Sleep utility for rate limiting
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Find a book by normalized title and author (Gate A)
 */
export async function findByTitleAuthor(
  ctx: QueryCtx,
  normalizedTitle: string,
  normalizedAuthor: string
): Promise<Doc<"books"> | null> {
  const books = await ctx.db.query("books").collect();

  return (
    books.find((book) => {
      const bookTitle = normalize(book.title);
      const bookAuthor =
        book.authors.length > 0 ? normalize(book.authors[0]) : "";

      return bookTitle === normalizedTitle && bookAuthor === normalizedAuthor;
    }) ?? null
  );
}

/**
 * Book metadata interface for API responses
 */
export interface BookMetadata {
  id: string;
  source: "google-books" | "open-library";
  originalId: string;
  title: string;
  authors: string[];
  description?: string;
  publishedDate?: string;
  publisher?: string;
  pageCount?: number;
  categories?: string[];
  language?: string;
  isbn10?: string;
  isbn13?: string;
  thumbnail?: string;
  smallThumbnail?: string;
  mediumThumbnail?: string;
  largeThumbnail?: string;
  averageRating?: number;
  ratingsCount?: number;
  previewLink?: string;
  infoLink?: string;
}

/**
 * Fetch from Google Books API
 */
async function fetchGoogleBooks(title: string, author: string): Promise<any[]> {
  try {
    const query = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Google Books API returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.warn("Google Books API error:", error);
    return [];
  }
}

/**
 * Fetch from Open Library API
 */
async function fetchOpenLibrary(title: string, author: string): Promise<any[]> {
  try {
    const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=5`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Open Library API returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.docs || [];
  } catch (error) {
    console.warn("Open Library API error:", error);
    return [];
  }
}

/**
 * Normalize Google Books API response
 */
function normalizeGoogleBooksResult(item: any): BookMetadata {
  const volumeInfo = item.volumeInfo || {};
  const imageLinks = volumeInfo.imageLinks || {};

  return {
    id: `google-books-${item.id}`,
    source: "google-books",
    originalId: item.id,
    title: volumeInfo.title || "Unknown Title",
    authors: volumeInfo.authors || [],
    description: volumeInfo.description,
    publishedDate: volumeInfo.publishedDate,
    publisher: volumeInfo.publisher,
    pageCount: volumeInfo.pageCount,
    categories: volumeInfo.categories,
    language: volumeInfo.language,
    isbn10: volumeInfo.industryIdentifiers?.find(
      (id: any) => id.type === "ISBN_10"
    )?.identifier,
    isbn13: volumeInfo.industryIdentifiers?.find(
      (id: any) => id.type === "ISBN_13"
    )?.identifier,
    thumbnail: imageLinks.thumbnail,
    smallThumbnail: imageLinks.smallThumbnail,
    mediumThumbnail: imageLinks.medium,
    largeThumbnail: imageLinks.large,
    averageRating: volumeInfo.averageRating,
    ratingsCount: volumeInfo.ratingsCount,
    previewLink: volumeInfo.previewLink,
    infoLink: volumeInfo.infoLink,
  };
}

/**
 * Normalize Open Library API response
 */
function normalizeOpenLibraryResult(doc: any): BookMetadata {
  const workKey = doc.key || doc.work_key?.[0] || "";
  const editionKey = doc.edition_key?.[0] || "";
  const id = workKey || editionKey;

  return {
    id: `open-library-${id.replace(/^\/works\//, "")}`,
    source: "open-library",
    originalId: id,
    title: doc.title || "Unknown Title",
    authors: doc.author_name || [],
    description: doc.first_sentence?.[0],
    publishedDate: doc.first_publish_year?.toString(),
    publisher: doc.publisher?.[0],
    pageCount: doc.number_of_pages_median,
    categories: doc.subject?.slice(0, 5),
    language: doc.language?.[0],
    isbn10: doc.isbn?.[0],
    isbn13: doc.isbn?.find((isbn: string) => isbn.length === 13),
    thumbnail: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : undefined,
    smallThumbnail: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg`
      : undefined,
    mediumThumbnail: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : undefined,
    largeThumbnail: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : undefined,
  };
}

/**
 * Fetch book metadata with fallback strategy
 * Google Books (primary) → Open Library (fallback)
 */
export async function fetchBookMetadata(
  title: string,
  author: string
): Promise<BookMetadata | null> {
  // Try Google Books first
  try {
    const googleResults = await fetchGoogleBooks(title, author);
    if (googleResults && googleResults.length > 0) {
      return normalizeGoogleBooksResult(googleResults[0]);
    }
  } catch (error) {
    console.warn("Google Books failed, trying Open Library:", error);
  }

  // Fallback to Open Library
  try {
    const olResults = await fetchOpenLibrary(title, author);
    if (olResults && olResults.length > 0) {
      return normalizeOpenLibraryResult(olResults[0]);
    }
  } catch (error) {
    console.error("Both APIs failed for:", title, "by", author, error);
  }

  return null;
}

/**
 * Validate book data before using
 */
export function validateBookData(data: any): data is BookMetadata {
  return Boolean(
    data &&
      data.id &&
      data.title &&
      data.authors?.length > 0 &&
      data.originalId &&
      data.source
  );
}

/**
 * Internal queries for action-to-mutation communication
 */
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal query: Find book by normalized title/author
 */
export const findByTitleAuthorQuery = internalQuery({
  args: {
    normalizedTitle: v.string(),
    normalizedAuthor: v.string(),
  },
  handler: async (ctx, args) => {
    const books = await ctx.db.query("books").collect();

    return (
      books.find((book) => {
        const bookTitle = normalize(book.title);
        const bookAuthor =
          book.authors.length > 0 ? normalize(book.authors[0]) : "";

        return (
          bookTitle === args.normalizedTitle &&
          bookAuthor === args.normalizedAuthor
        );
      }) ?? null
    );
  },
});

/**
 * Internal query: Find book by external ID
 */
export const findByExternalIdQuery = internalQuery({
  args: {
    originalId: v.string(),
    source: v.union(v.literal("google-books"), v.literal("open-library")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("books")
      .withIndex("by_original_id_and_source", (q: any) =>
        q.eq("originalId", args.originalId).eq("source", args.source)
      )
      .first();
  },
});
