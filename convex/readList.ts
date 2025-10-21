/**
 * Convex functions for managing user reading lists
 *
 * Handles adding, removing, and updating books in a user's reading list with status tracking.
 * Supports status: want-to-read, reading, completed
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * Add a book to user's read list
 *
 * Smart mutation that handles two scenarios:
 * 1. From search results: book object provided → persist to books table first
 * 2. From book detail page: only bookId provided → book already persisted
 */
export const addToReadList = mutation({
  args: {
    userId: v.string(),
    bookId: v.string(), // Composite book ID
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
    status: v.optional(
      v.union(
        v.literal("want-to-read"),
        v.literal("reading"),
        v.literal("completed")
      )
    ),
  },
  returns: v.id("readList"),
  handler: async (ctx, args) => {
    let bookDocId: Id<"books">;

    // Get or create book document
    if (args.book) {
      // From search results - persist the book
      bookDocId = await ctx.runMutation(api.books.upsertBook, args.book);
    } else {
      // From book detail page - book already persisted
      const existingBook = await ctx.db
        .query("books")
        .withIndex("by_book_id", (q) => q.eq("id", args.bookId))
        .first();

      if (!existingBook) {
        throw new Error(
          `Book not found: ${args.bookId}. Book must be persisted before adding to read list.`
        );
      }

      bookDocId = existingBook._id;
    }

    // Check if already in read list
    const existing = await ctx.db
      .query("readList")
      .withIndex("byUserAndBook", (q) =>
        q.eq("userId", args.userId).eq("bookIdRef", bookDocId)
      )
      .first();

    if (existing) {
      // Update status if provided
      if (args.status) {
        await ctx.db.patch(existing._id, { status: args.status });
      }
      return existing._id;
    }

    // Add to read list
    return await ctx.db.insert("readList", {
      userId: args.userId,
      bookIdRef: bookDocId,
      addedAt: Date.now(),
      status: args.status,
    });
  },
});

/**
 * Remove a book from user's read list
 */
export const removeFromReadList = mutation({
  args: {
    userId: v.string(),
    bookId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const book = await ctx.db
      .query("books")
      .withIndex("by_book_id", (q) => q.eq("id", args.bookId))
      .first();

    if (!book) {
      throw new Error("Book not found");
    }

    const readListItem = await ctx.db
      .query("readList")
      .withIndex("byUserAndBook", (q) =>
        q.eq("userId", args.userId).eq("bookIdRef", book._id)
      )
      .first();

    if (readListItem) {
      await ctx.db.delete(readListItem._id);
    }

    return null;
  },
});

/**
 * Update reading status for a book
 */
export const updateReadingStatus = mutation({
  args: {
    userId: v.string(),
    bookId: v.string(),
    status: v.union(
      v.literal("want-to-read"),
      v.literal("reading"),
      v.literal("completed")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const book = await ctx.db
      .query("books")
      .withIndex("by_book_id", (q) => q.eq("id", args.bookId))
      .first();

    if (!book) {
      throw new Error("Book not found");
    }

    const readListItem = await ctx.db
      .query("readList")
      .withIndex("byUserAndBook", (q) =>
        q.eq("userId", args.userId).eq("bookIdRef", book._id)
      )
      .first();

    if (!readListItem) {
      throw new Error("Book not in read list");
    }

    await ctx.db.patch(readListItem._id, { status: args.status });
    return null;
  },
});

/**
 * Check if a book is in user's read list
 */
export const isInReadList = query({
  args: {
    userId: v.string(),
    bookId: v.string(),
  },
  returns: v.union(
    v.object({
      inList: v.literal(true),
      status: v.optional(
        v.union(
          v.literal("want-to-read"),
          v.literal("reading"),
          v.literal("completed")
        )
      ),
    }),
    v.object({
      inList: v.literal(false),
    })
  ),
  handler: async (ctx, args) => {
    const book = await ctx.db
      .query("books")
      .withIndex("by_book_id", (q) => q.eq("id", args.bookId))
      .first();

    if (!book) {
      return { inList: false as const };
    }

    const readListItem = await ctx.db
      .query("readList")
      .withIndex("byUserAndBook", (q) =>
        q.eq("userId", args.userId).eq("bookIdRef", book._id)
      )
      .first();

    if (!readListItem) {
      return { inList: false as const };
    }

    return {
      inList: true as const,
      status: readListItem.status,
    };
  },
});

/**
 * Get all books in user's read list with full details
 */
export const getReadList = query({
  args: {
    userId: v.string(),
    status: v.optional(
      v.union(
        v.literal("want-to-read"),
        v.literal("reading"),
        v.literal("completed")
      )
    ),
  },
  returns: v.array(
    v.object({
      _id: v.id("readList"),
      addedAt: v.number(),
      status: v.optional(
        v.union(
          v.literal("want-to-read"),
          v.literal("reading"),
          v.literal("completed")
        )
      ),
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
    let query = ctx.db
      .query("readList")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId));

    // Filter by status if provided
    if (args.status) {
      query = ctx.db
        .query("readList")
        .withIndex("byUserAndStatus", (q) =>
          q.eq("userId", args.userId).eq("status", args.status)
        );
    }

    const readListItems = await query.order("desc").collect();

    // Fetch full book details
    const itemsWithBooks = await Promise.all(
      readListItems.map(async (item) => {
        const bookDoc = await ctx.db.get(item.bookIdRef);
        if (!bookDoc) {
          throw new Error(`Book not found: ${item.bookIdRef}`);
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
          _id: item._id,
          addedAt: item.addedAt,
          status: item.status,
          book,
        };
      })
    );

    return itemsWithBooks;
  },
});

/**
 * Get count of books in read list by status
 */
export const getReadListCount = query({
  args: {
    userId: v.string(),
    status: v.optional(
      v.union(
        v.literal("want-to-read"),
        v.literal("reading"),
        v.literal("completed")
      )
    ),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("readList")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId));

    if (args.status) {
      query = ctx.db
        .query("readList")
        .withIndex("byUserAndStatus", (q) =>
          q.eq("userId", args.userId).eq("status", args.status)
        );
    }

    const items = await query.collect();
    return items.length;
  },
});
