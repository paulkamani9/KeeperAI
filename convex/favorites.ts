/**
 * Convex functions for managing user favorites
 *
 * Handles adding, removing, and querying favorited books with smart book persistence.
 * Supports two scenarios:
 * 1. From search results: book object provided → persist to books table first
 * 2. From book detail page: only bookId provided → book already persisted
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * Add a book to user's favorites
 *
 * Smart mutation that handles two scenarios:
 * 1. From search results: book object provided → persist to books table first
 * 2. From book detail page: only bookId provided → book already persisted
 */
export const addFavorite = mutation({
  args: {
    userId: v.string(), // Clerk user ID
    bookId: v.string(), // Composite book ID (e.g., "google-books:abc123")
    book: v.optional(
      v.object({
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
        isBookOfTheDay: v.optional(v.boolean()),
        seedReason: v.optional(v.string()),
      })
    ),
  },
  returns: v.id("favorites"),
  handler: async (ctx, args) => {
    let bookDocId: Id<"books">;

    // Step 1: Get or create book document
    if (args.book) {
      // Scenario A: Called from search results with full book object
      // Persist the book to the books table (upsert)
      bookDocId = await ctx.runMutation(api.books.upsertBook, args.book);
    } else {
      // Scenario B: Called from book detail page (book already persisted)
      // Just query for the existing book
      const existingBook = await ctx.db
        .query("books")
        .withIndex("by_book_id", (q) => q.eq("id", args.bookId))
        .first();

      if (!existingBook) {
        throw new Error(
          `Book not found: ${args.bookId}. Book must be persisted before favoriting.`
        );
      }

      bookDocId = existingBook._id;
    }

    // Step 2: Check if already favorited
    const existingFavorite = await ctx.db
      .query("favorites")
      .withIndex("byUserAndBook", (q) =>
        q.eq("userId", args.userId).eq("bookIdRef", bookDocId)
      )
      .first();

    if (existingFavorite) {
      return existingFavorite._id;
    }

    // Step 3: Add to favorites
    return await ctx.db.insert("favorites", {
      userId: args.userId,
      bookIdRef: bookDocId,
      addedAt: Date.now(),
    });
  },
});

/**
 * Remove a book from user's favorites
 */
export const removeFavorite = mutation({
  args: {
    userId: v.string(),
    bookId: v.string(), // Composite book ID (e.g., "google-books:abc123")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find the book document
    const book = await ctx.db
      .query("books")
      .withIndex("by_book_id", (q) => q.eq("id", args.bookId))
      .first();

    if (!book) {
      throw new Error("Book not found");
    }

    // Find and delete the favorite
    const favorite = await ctx.db
      .query("favorites")
      .withIndex("byUserAndBook", (q) =>
        q.eq("userId", args.userId).eq("bookIdRef", book._id)
      )
      .first();

    if (favorite) {
      await ctx.db.delete(favorite._id);
    }

    return null;
  },
});

/**
 * Check if a book is favorited by user
 */
export const isFavorited = query({
  args: {
    userId: v.string(),
    bookId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const book = await ctx.db
      .query("books")
      .withIndex("by_book_id", (q) => q.eq("id", args.bookId))
      .first();

    if (!book) {
      return false;
    }

    const favorite = await ctx.db
      .query("favorites")
      .withIndex("byUserAndBook", (q) =>
        q.eq("userId", args.userId).eq("bookIdRef", book._id)
      )
      .first();

    return favorite !== null;
  },
});

/**
 * Get all favorited books for a user with full book details
 */
export const getFavorites = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("favorites"),
      addedAt: v.number(),
      book: v.object({
        _id: v.id("books"),
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
        isBookOfTheDay: v.optional(v.boolean()),
        seedReason: v.optional(v.string()),
      }),
    })
  ),
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    // Fetch full book details for each favorite
    const favoritesWithBooks = await Promise.all(
      favorites.map(async (favorite) => {
        const bookDoc = await ctx.db.get(favorite.bookIdRef);
        if (!bookDoc) {
          throw new Error(`Book not found: ${favorite.bookIdRef}`);
        }

        // Map to only include fields defined in the validator (exclude internal Convex fields)
        const book = {
          _id: bookDoc._id,
          id: bookDoc.id,
          title: bookDoc.title,
          authors: bookDoc.authors,
          description: bookDoc.description,
          publishedDate: bookDoc.publishedDate,
          publisher: bookDoc.publisher,
          pageCount: bookDoc.pageCount,
          categories: bookDoc.categories,
          language: bookDoc.language,
          isbn10: bookDoc.isbn10,
          isbn13: bookDoc.isbn13,
          thumbnail: bookDoc.thumbnail,
          smallThumbnail: bookDoc.smallThumbnail,
          mediumThumbnail: bookDoc.mediumThumbnail,
          largeThumbnail: bookDoc.largeThumbnail,
          averageRating: bookDoc.averageRating,
          ratingsCount: bookDoc.ratingsCount,
          previewLink: bookDoc.previewLink,
          infoLink: bookDoc.infoLink,
          source: bookDoc.source,
          originalId: bookDoc.originalId,
          isBookOfTheDay: bookDoc.isBookOfTheDay,
          seedReason: bookDoc.seedReason,
        };

        return {
          _id: favorite._id,
          addedAt: favorite.addedAt,
          book,
        };
      })
    );

    return favoritesWithBooks;
  },
});

/**
 * Get count of user's favorites
 */
export const getFavoritesCount = query({
  args: {
    userId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .collect();

    return favorites.length;
  },
});
