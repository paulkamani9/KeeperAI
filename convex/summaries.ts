/**
 * Convex Summaries Functions
 *
 * Handles persistence and retrieval of AI-generated book summaries.
 * Does NOT handle AI generation - that's handled by the client-side summaryService.
 *
 * This module is responsible for:
 * - Storing completed summaries in the database
 * - Retrieving summaries by ID
 * - Querying existing summaries to avoid duplicates
 * - Managing summary metadata and status
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";


/**
 * Store a completed AI-generated summary in the database
 *
 * This should be called after the AI service successfully generates a summary.
 * The summary content and metadata should already be complete.
 */
export const storeSummary = mutation({
  args: {
    bookId: v.string(),
    summaryType: v.union(
      v.literal("concise"),
      v.literal("detailed"),
      v.literal("analysis"),
      v.literal("practical")
    ),
    content: v.string(),
    generationTime: v.optional(v.number()),
    wordCount: v.number(),
    readingTime: v.number(),
    aiModel: v.string(),
    promptVersion: v.string(),
    userId: v.optional(v.id("users")),
    metadata: v.optional(
      v.object({
        bookDataSource: v.union(
          v.literal("google-books"),
          v.literal("open-library")
        ),
        hadBookDescription: v.boolean(),
        promptTokens: v.optional(v.number()),
        completionTokens: v.optional(v.number()),
        estimatedCost: v.optional(v.number()),
        notes: v.optional(v.string()),
      })
    ),
  },
  returns: v.id("summaries"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if a summary already exists for this book and type
    const existingSummary = await ctx.db
      .query("summaries")
      .withIndex("byBookAndType", (q) =>
        q.eq("bookId", args.bookId).eq("summaryType", args.summaryType)
      )
      .first();

    if (existingSummary) {
      // Update existing summary instead of creating duplicate
      await ctx.db.patch(existingSummary._id, {
        content: args.content,
        status: "completed" as const,
        generationTime: args.generationTime,
        wordCount: args.wordCount,
        readingTime: args.readingTime,
        aiModel: args.aiModel,
        promptVersion: args.promptVersion,
        metadata: args.metadata,
        updatedAt: now,
        errorMessage: undefined, // Clear any previous errors
      });
      return existingSummary._id;
    }

    // Create new summary
    const summaryId = await ctx.db.insert("summaries", {
      userId: args.userId,
      bookId: args.bookId,
      summaryType: args.summaryType,
      content: args.content,
      status: "completed" as const,
      generationTime: args.generationTime,
      wordCount: args.wordCount,
      readingTime: args.readingTime,
      aiModel: args.aiModel,
      promptVersion: args.promptVersion,
      errorMessage: undefined,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });

    return summaryId;
  },
});

/**
 * Get a summary by its Convex ID
 *
 * Used by the summary reading page to display persisted summaries.
 */
export const getSummaryById = query({
  args: {
    summaryId: v.string(), // Accept string ID from URL params
  },
  returns: v.any(), // Simplified return type to avoid complex type matching
  handler: async (ctx, args) => {

    try {
      // Cast to proper Convex ID type and fetch
      const summary = await ctx.db.get(args.summaryId as any);
      return summary;
    } catch (error) {
      // Invalid ID format or summary doesn't exist
      console.error("Error fetching summary by ID:", error);
      return null;
    }
  },
});

/**
 * Check if a summary already exists for a book and summary type
 *
 * Used to avoid duplicate generation and show existing summaries.
 */
export const getExistingSummary = query({
  args: {
    bookId: v.string(),
    summaryType: v.union(
      v.literal("concise"),
      v.literal("detailed"),
      v.literal("analysis"),
      v.literal("practical")
    ),
    userId: v.optional(v.id("users")),
  },
  returns: v.any(), // Simplified return type
  handler: async (ctx, args) => {
    // Look for existing summary with this book ID and summary type
    const existingSummary = await ctx.db
      .query("summaries")
      .withIndex("byBookAndType", (q) =>
        q.eq("bookId", args.bookId).eq("summaryType", args.summaryType)
      )
      .filter((q) => {
        // If userId provided, only match summaries for this user or public summaries
        if (args.userId) {
          return q.or(
            q.eq(q.field("userId"), args.userId),
            q.eq(q.field("userId"), undefined)
          );
        }
        // If no userId, only return public summaries
        return q.eq(q.field("userId"), undefined);
      })
      .first();

    return existingSummary;
  },
});

/**
 * Record a failed summary generation attempt
 *
 * Used for error tracking and preventing repeated failures.
 */
export const recordSummaryFailure = mutation({
  args: {
    bookId: v.string(),
    summaryType: v.union(
      v.literal("concise"),
      v.literal("detailed"),
      v.literal("analysis"),
      v.literal("practical")
    ),
    errorMessage: v.string(),
    generationTime: v.optional(v.number()),
    aiModel: v.string(),
    promptVersion: v.string(),
    userId: v.optional(v.id("users")),
    metadata: v.optional(
      v.object({
        bookDataSource: v.union(
          v.literal("google-books"),
          v.literal("open-library")
        ),
        hadBookDescription: v.boolean(),
        promptTokens: v.optional(v.number()),
        completionTokens: v.optional(v.number()),
        estimatedCost: v.optional(v.number()),
        notes: v.optional(v.string()),
      })
    ),
  },
  returns: v.id("summaries"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if a summary record already exists
    const existingSummary = await ctx.db
      .query("summaries")
      .withIndex("byBookAndType", (q) =>
        q.eq("bookId", args.bookId).eq("summaryType", args.summaryType)
      )
      .first();

    if (existingSummary) {
      // Update existing record with failure info
      await ctx.db.patch(existingSummary._id, {
        status: "failed" as const,
        errorMessage: args.errorMessage,
        generationTime: args.generationTime,
        aiModel: args.aiModel,
        promptVersion: args.promptVersion,
        metadata: args.metadata,
        updatedAt: now,
      });
      return existingSummary._id;
    }

    // Create new failed summary record
    const summaryId = await ctx.db.insert("summaries", {
      userId: args.userId,
      bookId: args.bookId,
      summaryType: args.summaryType,
      content: "", // Empty content for failed summaries
      status: "failed" as const,
      generationTime: args.generationTime,
      wordCount: 0,
      readingTime: 0,
      aiModel: args.aiModel,
      promptVersion: args.promptVersion,
      errorMessage: args.errorMessage,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });

    return summaryId;
  },
});

/**
 * Get summaries for a specific book (all types)
 *
 * Used to show all available summaries for a book.
 */
export const getSummariesByBook = query({
  args: {
    bookId: v.string(),
    userId: v.optional(v.id("users")),
  },
  returns: v.any(), // Simplified return type
  handler: async (ctx, args) => {
    const summaries = await ctx.db
      .query("summaries")
      .withIndex("byBookAndType", (q) => q.eq("bookId", args.bookId))
      .filter((q) => {
        // If userId provided, include user's summaries and public summaries
        if (args.userId) {
          return q.or(
            q.eq(q.field("userId"), args.userId),
            q.eq(q.field("userId"), undefined)
          );
        }
        // If no userId, only return public summaries
        return q.eq(q.field("userId"), undefined);
      })
      .collect();

    // Return simplified view for listing
    return summaries.map((summary) => ({
      _id: summary._id,
      _creationTime: summary._creationTime,
      summaryType: summary.summaryType,
      status: summary.status,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
      wordCount: summary.wordCount,
      readingTime: summary.readingTime,
    }));
  },
});
