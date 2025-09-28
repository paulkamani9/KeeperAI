/**
 * Convex Summaries Functions - Database Only
 *
 * Handles persistence and retrieval of AI-generated book summaries.
 * Does NOT handle AI generation - that's handled by the client-side summaryService.
 * Does NOT handle Redis caching - that's handled by actions in summariesActions.ts.
 * Redis caching is unpluged for now, queries and mutations happen here directly.
 *
 * This module is responsible for:
 * - Storing completed summaries in the database
 * - Retrieving summaries by ID (database only)
 * - Querying existing summaries to avoid duplicates (database only)
 * - Managing summary metadata and status
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Store a completed AI-generated summary in the database with Redis caching
 *
 * Flow:
 * 1. Store/update in Convex database (source of truth)
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
        notes: v.optional(v.string()),
      })
    ),
    tokenUsage: v.optional(
      v.object({
        promptTokens: v.optional(v.number()),
        completionTokens: v.optional(v.number()),
        totalTokens: v.optional(v.number()),
        estimatedCost: v.optional(v.number()),
      })
    ),
  },
  returns: v.id("summaries"),
  handler: async (ctx, args) => {
    const now = Date.now();
    let summaryId: string;

    // Step 1: Store in Convex database (source of truth)
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
        tokenUsage: args.tokenUsage,
        updatedAt: now,
        errorMessage: undefined, // Clear any previous errors
      });
      summaryId = String(existingSummary._id);
    } else {
      // Create new summary
      const newSummaryId = await ctx.db.insert("summaries", {
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
        tokenUsage: args.tokenUsage,
        createdAt: now,
        updatedAt: now,
      });
      summaryId = String(newSummaryId);
    }

    // Database storage complete

    return summaryId as any; // Cast back to Convex ID type
  },
});

/**
 * Get a summary by its Convex ID with Redis caching
 *
 * Flow:
 * 1. Query Convex database directly
 * 2. Return result
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
      // Query Convex database directly
      const result = await ctx.db.get(args.summaryId as any);

      if (!result) {
        console.log(`Summary ${args.summaryId} not found in database`);
        return null;
      }

      // Type guard to ensure we have a summaries document
      if (
        !("bookId" in result) ||
        !("summaryType" in result) ||
        !("content" in result)
      ) {
        console.error(`Invalid document type for ID ${args.summaryId}`);
        return null;
      }

      // Return the summary document
      return result;
    } catch (error) {
      // Invalid ID format or database error
      console.error("Error fetching summary by ID:", error);
      return null;
    }
  },
});

/**
 * Check if a summary already exists for a book and summary type with Redis caching
 *
 * Flow:
 * 1. Query Convex database directly
 * 2. Return result
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
    try {
      // Query Convex database directly
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
    } catch (error) {
      console.error("Error fetching existing summary:", error);
      return null;
    }
  },
});

/**
 * Record a failed summary generation attempt with failure caching
 *
 * Flow:
 * 1. Store failure in Convex database for persistent tracking
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
    let summaryId: string;

    // Step 1: Store failure in Convex database for persistent tracking
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
      summaryId = String(existingSummary._id);
    } else {
      // Create new failed summary record
      const newSummaryId = await ctx.db.insert("summaries", {
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
      summaryId = String(newSummaryId);
    }

    // Database storage complete

    return summaryId as any; // Cast back to Convex ID type
  },
});

/**
 * Check for recent summary generation failures in the database
 *
 * This function queries the database for recent failures to help prevent
 * repeated failed attempts. For Redis-based failure caching, use the action instead.
 */
export const checkRecentFailure = query({
  args: {
    bookId: v.string(),
    summaryType: v.union(
      v.literal("concise"),
      v.literal("detailed"),
      v.literal("analysis"),
      v.literal("practical")
    ),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    try {
      // Check database for recent failed attempts (last 10 minutes)
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

      const recentFailure = await ctx.db
        .query("summaries")
        .withIndex("byBookAndType", (q) =>
          q.eq("bookId", args.bookId).eq("summaryType", args.summaryType)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "failed"),
            q.gte(q.field("updatedAt"), tenMinutesAgo)
          )
        )
        .first();

      return recentFailure?.errorMessage || null;
    } catch (error) {
      console.error("Error checking recent failure:", error);
      return null;
    }
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
