/**
 * Convex functions for book persistence and retrieval
 *
 * This module handles caching of book details from external APIs
 * to reduce API calls and improve performance.
 */
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// Shared book object validator for reuse
const bookObjectValidator = v.object({
  _id: v.id("books"),
  _creationTime: v.number(),
  id: v.string(),
  title: v.string(),
  authors: v.array(v.string()),
  description: v.optional(v.string()),
  publishedDate: v.optional(v.string()),
  publisher: v.optional(v.string()),
  pageCount: v.optional(v.number()),
  categories: v.optional(v.array(v.string())),
  language: v.optional(v.string()),
  isbn10: v.optional(v.string()),
  isbn13: v.optional(v.string()),
  thumbnail: v.optional(v.string()),
  smallThumbnail: v.optional(v.string()),
  mediumThumbnail: v.optional(v.string()),
  largeThumbnail: v.optional(v.string()),
  averageRating: v.optional(v.number()),
  ratingsCount: v.optional(v.number()),
  previewLink: v.optional(v.string()),
  infoLink: v.optional(v.string()),
  source: v.union(v.literal("google-books"), v.literal("open-library")),
  originalId: v.string(),
  cachedAt: v.number(),
  lastAccessedAt: v.number(),
});

/**
 * Get a book by its composite ID
 */
export const getBookById = query({
  args: { id: v.string() },
  returns: v.union(bookObjectValidator, v.null()),
  handler: async (ctx, args) => {
    const book = await ctx.db
      .query("books")
      .withIndex("by_book_id", (q) => q.eq("id", args.id))
      .first();

    return book ?? null;
  },
});

/**
 * Get a book by its original ID and source
 */
export const getBookByOriginalId = query({
  args: {
    originalId: v.string(),
    source: v.union(v.literal("google-books"), v.literal("open-library")),
  },
  returns: v.union(bookObjectValidator, v.null()),
  handler: async (ctx, args) => {
    const book = await ctx.db
      .query("books")
      .withIndex("by_original_id_and_source", (q) =>
        q.eq("originalId", args.originalId).eq("source", args.source)
      )
      .first();

    return book ?? null;
  },
});

/**
 * Update the last accessed timestamp for a book
 */
export const updateLastAccessed = internalMutation({
  args: { bookId: v.id("books") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.bookId, {
      lastAccessedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Upsert a book (insert or update if it exists)
 */
export const upsertBook = mutation({
  args: {
    id: v.string(),
    title: v.string(),
    authors: v.array(v.string()),
    description: v.optional(v.string()),
    publishedDate: v.optional(v.string()),
    publisher: v.optional(v.string()),
    pageCount: v.optional(v.number()),
    categories: v.optional(v.array(v.string())),
    language: v.optional(v.string()),
    isbn10: v.optional(v.string()),
    isbn13: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
    smallThumbnail: v.optional(v.string()),
    mediumThumbnail: v.optional(v.string()),
    largeThumbnail: v.optional(v.string()),
    averageRating: v.optional(v.number()),
    ratingsCount: v.optional(v.number()),
    previewLink: v.optional(v.string()),
    infoLink: v.optional(v.string()),
    source: v.union(v.literal("google-books"), v.literal("open-library")),
    originalId: v.string(),
  },
  returns: v.id("books"),
  handler: async (ctx, args) => {
    // Check if book already exists
    const existingBook = await ctx.db
      .query("books")
      .withIndex("by_book_id", (q) => q.eq("id", args.id))
      .first();

    const now = Date.now();

    if (existingBook) {
      // Update existing book with new data and timestamp
      await ctx.db.patch(existingBook._id, {
        title: args.title,
        authors: args.authors,
        description: args.description,
        publishedDate: args.publishedDate,
        publisher: args.publisher,
        pageCount: args.pageCount,
        categories: args.categories,
        language: args.language,
        isbn10: args.isbn10,
        isbn13: args.isbn13,
        thumbnail: args.thumbnail,
        smallThumbnail: args.smallThumbnail,
        mediumThumbnail: args.mediumThumbnail,
        largeThumbnail: args.largeThumbnail,
        averageRating: args.averageRating,
        ratingsCount: args.ratingsCount,
        previewLink: args.previewLink,
        infoLink: args.infoLink,
        source: args.source,
        originalId: args.originalId,
        lastAccessedAt: now,
      });
      return existingBook._id;
    } else {
      // Insert new book
      return await ctx.db.insert("books", {
        id: args.id,
        title: args.title,
        authors: args.authors,
        description: args.description,
        publishedDate: args.publishedDate,
        publisher: args.publisher,
        pageCount: args.pageCount,
        categories: args.categories,
        language: args.language,
        isbn10: args.isbn10,
        isbn13: args.isbn13,
        thumbnail: args.thumbnail,
        smallThumbnail: args.smallThumbnail,
        mediumThumbnail: args.mediumThumbnail,
        largeThumbnail: args.largeThumbnail,
        averageRating: args.averageRating,
        ratingsCount: args.ratingsCount,
        previewLink: args.previewLink,
        infoLink: args.infoLink,
        source: args.source,
        originalId: args.originalId,
        cachedAt: now,
        lastAccessedAt: now,
      });
    }
  },
});

/**
 * Search books by ISBN-13
 */
export const getBookByIsbn13 = query({
  args: { isbn13: v.string() },
  returns: v.union(bookObjectValidator, v.null()),
  handler: async (ctx, args) => {
    const book = await ctx.db
      .query("books")
      .withIndex("by_isbn13", (q) => q.eq("isbn13", args.isbn13))
      .first();

    return book ?? null;
  },
});

/**
 * Search books by ISBN-10
 */
export const getBookByIsbn10 = query({
  args: { isbn10: v.string() },
  returns: v.union(bookObjectValidator, v.null()),
  handler: async (ctx, args) => {
    const book = await ctx.db
      .query("books")
      .withIndex("by_isbn10", (q) => q.eq("isbn10", args.isbn10))
      .first();

    return book ?? null;
  },
});

/**
 * Delete old cached books (cleanup utility)
 * Remove books that haven't been accessed in over 90 days
 */
export const cleanupOldBooks = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const oldBooks = await ctx.db
      .query("books")
      .filter((q) => q.lt(q.field("lastAccessedAt"), ninetyDaysAgo))
      .collect();

    let deletedCount = 0;
    for (const book of oldBooks) {
      await ctx.db.delete(book._id);
      deletedCount++;
    }

    return deletedCount;
  },
});
