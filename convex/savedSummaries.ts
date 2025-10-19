/**
 * Convex functions for managing user's saved summaries
 * 
 * Links users, books, and their generated summaries together.
 * Note: Summaries are typically generated from book detail pages where books
 * are already persisted, so book object is optional but rarely needed.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * Save a summary for a user
 * Links user, book, and summary together
 *
 * Note: Summaries are only generated from book detail pages where books
 * are already persisted, so book object is optional but rarely needed.
 */
export const saveSummary = mutation({
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
    summaryId: v.id("summaries"),
  },
  returns: v.id("savedSummaries"),
  handler: async (ctx, args) => {
    let bookDocId: Id<"books">;

    // Get or create book document
    if (args.book) {
      // Book object provided - persist it
      bookDocId = await ctx.runMutation(api.books.upsertBook, args.book);
    } else {
      // Book already persisted (typical for summaries)
      const existingBook = await ctx.db
        .query("books")
        .withIndex("by_book_id", (q) => q.eq("id", args.bookId))
        .first();

      if (!existingBook) {
        throw new Error(
          `Book not found: ${args.bookId}. Book must be persisted before saving summary.`
        );
      }

      bookDocId = existingBook._id;
    }

    // Check if already saved
    const existing = await ctx.db
      .query("savedSummaries")
      .withIndex("byUserAndSummary", (q) =>
        q.eq("userId", args.userId).eq("summaryIdRef", args.summaryId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // Save the summary
    return await ctx.db.insert("savedSummaries", {
      userId: args.userId,
      bookIdRef: bookDocId,
      summaryIdRef: args.summaryId,
      savedAt: Date.now(),
    });
  },
});

/**
 * Remove a saved summary
 */
export const removeSavedSummary = mutation({
  args: {
    userId: v.string(),
    summaryId: v.id("summaries"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const savedSummary = await ctx.db
      .query("savedSummaries")
      .withIndex("byUserAndSummary", (q) =>
        q.eq("userId", args.userId).eq("summaryIdRef", args.summaryId)
      )
      .first();

    if (savedSummary) {
      await ctx.db.delete(savedSummary._id);
    }

    return null;
  },
});

/**
 * Check if a summary is saved by user
 */
export const isSummarySaved = query({
  args: {
    userId: v.string(),
    summaryId: v.id("summaries"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const saved = await ctx.db
      .query("savedSummaries")
      .withIndex("byUserAndSummary", (q) =>
        q.eq("userId", args.userId).eq("summaryIdRef", args.summaryId)
      )
      .first();

    return saved !== null;
  },
});

/**
 * Get all saved summaries for a user with full details
 */
export const getSavedSummaries = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("savedSummaries"),
      savedAt: v.number(),
      book: v.object({
        _id: v.id("books"),
        id: v.string(),
        title: v.string(),
        authors: v.array(v.string()),
        description: v.optional(v.string()),
        thumbnail: v.optional(v.string()),
        source: v.union(v.literal("google-books"), v.literal("open-library")),
        originalId: v.string(),
      }),
      summary: v.object({
        _id: v.id("summaries"),
        summaryType: v.union(
          v.literal("concise"),
          v.literal("detailed"),
          v.literal("analysis"),
          v.literal("practical")
        ),
        content: v.string(),
        wordCount: v.number(),
        readingTime: v.number(),
        status: v.union(
          v.literal("pending"),
          v.literal("generating"),
          v.literal("completed"),
          v.literal("failed")
        ),
      }),
    })
  ),
  handler: async (ctx, args) => {
    const savedSummaries = await ctx.db
      .query("savedSummaries")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    // Fetch full details for each saved summary
    const summariesWithDetails = await Promise.all(
      savedSummaries.map(async (saved) => {
        const book = await ctx.db.get(saved.bookIdRef);
        const summary = await ctx.db.get(saved.summaryIdRef);

        if (!book || !summary) {
          throw new Error("Book or summary not found");
        }

        return {
          _id: saved._id,
          savedAt: saved.savedAt,
          book: {
            _id: book._id,
            id: book.id,
            title: book.title,
            authors: book.authors,
            description: book.description,
            thumbnail: book.thumbnail,
            source: book.source,
            originalId: book.originalId,
          },
          summary: {
            _id: summary._id,
            summaryType: summary.summaryType,
            content: summary.content,
            wordCount: summary.wordCount,
            readingTime: summary.readingTime,
            status: summary.status,
          },
        };
      })
    );

    return summariesWithDetails;
  },
});

/**
 * Get saved summaries count for a user
 */
export const getSavedSummariesCount = query({
  args: {
    userId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const saved = await ctx.db
      .query("savedSummaries")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .collect();

    return saved.length;
  },
});
