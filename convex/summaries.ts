/**
 * Convex Summaries Functions
 *
 * Handles persistence and retrieval of AI-generated book summaries with Redis caching.
 * Does NOT handle AI generation - that's handled by the client-side summaryService.
 *
 * Redis Integration Strategy:
 * - Check Redis first for performance (24h TTL)
 * - Fall back to Convex on cache miss
 * - Hydrate Redis after Convex queries
 * - Use two cache keys per summary:
 *   1. summary:id:{summaryId} - for direct ID lookups
 *   2. summary:book:{bookId}:{summaryType} - for book+type lookups
 * - Cache failures with short TTL to prevent API hammering
 *
 * This module is responsible for:
 * - Storing completed summaries in the database
 * - Retrieving summaries by ID (with Redis caching)
 * - Querying existing summaries to avoid duplicates (with Redis caching)
 * - Managing summary metadata and status
 * - Redis cache hydration and invalidation
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getCachedSummaryById,
  getCachedSummaryByBook,
  setCachedSummary,
  invalidateCachedSummary,
  cacheFailure,
  getRecentFailure,
  clearFailure,
} from "../src/lib/cache";

/**
 * Store a completed AI-generated summary in the database with Redis caching
 *
 * Flow:
 * 1. Store/update in Convex database (source of truth)
 * 2. Clear any failure cache for this book+type
 * 3. Hydrate Redis cache with both keys for fast future access
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

    // Step 2: Clear any failure cache for this book+type combo
    try {
      await clearFailure(args.bookId, args.summaryType);
      console.log(
        `Cleared failure cache for successful summary ${args.bookId}:${args.summaryType}`
      );
    } catch (cacheError) {
      console.error(
        `Failed to clear failure cache for ${args.bookId}:${args.summaryType}:`,
        cacheError
      );
      // Don't fail the request if cache clearing fails
    }

    // Step 3: Hydrate Redis cache with both keys for fast future access
    try {
      const summaryForCache = {
        id: summaryId,
        bookId: args.bookId,
        summaryType: args.summaryType,
        content: args.content,
        status: "completed" as const,
        createdAt: new Date(now),
        updatedAt: new Date(now),
        generationTime: args.generationTime,
        wordCount: args.wordCount,
        readingTime: args.readingTime,
        aiModel: args.aiModel,
        promptVersion: args.promptVersion,
        errorMessage: undefined,
        metadata: args.metadata,
      };

      await setCachedSummary(summaryForCache);
      console.log(`Hydrated Redis cache for stored summary ${summaryId}`);
    } catch (cacheError) {
      console.error(
        `Failed to hydrate cache for stored summary ${summaryId}:`,
        cacheError
      );
      // Don't fail the request if caching fails
    }

    return summaryId as any; // Cast back to Convex ID type
  },
});

/**
 * Get a summary by its Convex ID with Redis caching
 *
 * Flow:
 * 1. Check Redis cache first (summary:id:{summaryId})
 * 2. If cache miss, query Convex database
 * 3. If found in Convex, hydrate Redis cache with both keys
 * 4. Return result
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
      // Step 1: Check Redis cache first
      const cachedSummary = await getCachedSummaryById(args.summaryId);
      if (cachedSummary) {
        console.log(
          `Cache HIT: Retrieved summary ${args.summaryId} from Redis`,
          {
            cachedSummary: {
              id: cachedSummary.id,
              bookId: cachedSummary.bookId,
            },
          }
        );
        return {
          _id: cachedSummary.id,
          _creationTime: new Date(cachedSummary.createdAt).getTime(),
          bookId: cachedSummary.bookId,
          summaryType: cachedSummary.summaryType,
          content: cachedSummary.content,
          status: cachedSummary.status,
          generationTime: cachedSummary.generationTime,
          wordCount: cachedSummary.wordCount,
          readingTime: cachedSummary.readingTime,
          aiModel: cachedSummary.aiModel,
          promptVersion: cachedSummary.promptVersion,
          errorMessage: cachedSummary.errorMessage,
          metadata: cachedSummary.metadata,
          createdAt: new Date(cachedSummary.createdAt).getTime(),
          updatedAt: new Date(cachedSummary.updatedAt).getTime(),
        };
      }

      console.log(`Cache MISS: Querying Convex for summary ${args.summaryId}`);

      // Step 2: Query Convex database on cache miss
      const result = await ctx.db.get(args.summaryId as any);

      if (!result) {
        console.log(`Summary ${args.summaryId} not found in Convex`);
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

      // Now TypeScript knows this is a summaries document
      const summary = result as any; // Cast to bypass strict typing for now

      // Step 3: Hydrate Redis cache for future requests
      try {
        const summaryForCache = {
          id: String(summary._id),
          bookId: summary.bookId,
          summaryType: summary.summaryType,
          content: summary.content,
          status: summary.status,
          createdAt: new Date(summary.createdAt || summary._creationTime),
          updatedAt: new Date(summary.updatedAt || summary._creationTime),
          generationTime: summary.generationTime,
          wordCount: summary.wordCount,
          readingTime: summary.readingTime,
          aiModel: summary.aiModel,
          promptVersion: summary.promptVersion,
          errorMessage: summary.errorMessage,
          metadata: summary.metadata,
        };

        await setCachedSummary(summaryForCache);
        console.log(`Hydrated Redis cache for summary ${args.summaryId}`);
      } catch (cacheError) {
        console.error(
          `Failed to hydrate cache for summary ${args.summaryId}:`,
          cacheError
        );
        // Don't fail the request if caching fails
      }

      return summary;
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
 * 1. Check Redis cache first (summary:book:{bookId}:{summaryType})
 * 2. If cache miss, query Convex database
 * 3. If found in Convex, hydrate Redis cache with both keys
 * 4. Return result
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
      // Step 1: Check Redis cache first
      const cachedSummary = await getCachedSummaryByBook(
        args.bookId,
        args.summaryType
      );
      if (cachedSummary) {
        console.log(
          `Cache HIT: Retrieved existing summary for ${args.bookId}:${args.summaryType} from Redis`
        );

        // For now, cached summaries are considered public access
        // User permission logic should be handled during the original query
        const hasAccess = true;

        if (hasAccess) {
          return {
            _id: cachedSummary.id,
            _creationTime: new Date(cachedSummary.createdAt).getTime(),
            bookId: cachedSummary.bookId,
            summaryType: cachedSummary.summaryType,
            content: cachedSummary.content,
            status: cachedSummary.status,
            generationTime: cachedSummary.generationTime,
            wordCount: cachedSummary.wordCount,
            readingTime: cachedSummary.readingTime,
            aiModel: cachedSummary.aiModel,
            promptVersion: cachedSummary.promptVersion,
            errorMessage: cachedSummary.errorMessage,
            metadata: cachedSummary.metadata,
            createdAt: new Date(cachedSummary.createdAt).getTime(),
            updatedAt: new Date(cachedSummary.updatedAt).getTime(),
          };
        }
      }

      console.log(
        `Cache MISS: Querying Convex for existing summary ${args.bookId}:${args.summaryType}`
      );

      // Step 2: Query Convex database on cache miss
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

      // Step 3: Hydrate Redis cache if summary found
      if (existingSummary) {
        try {
          const summaryForCache = {
            id: String(existingSummary._id),
            bookId: existingSummary.bookId,
            summaryType: existingSummary.summaryType,
            content: existingSummary.content,
            status: existingSummary.status,
            createdAt: new Date(
              existingSummary.createdAt || existingSummary._creationTime
            ),
            updatedAt: new Date(
              existingSummary.updatedAt || existingSummary._creationTime
            ),
            generationTime: existingSummary.generationTime,
            wordCount: existingSummary.wordCount,
            readingTime: existingSummary.readingTime,
            aiModel: existingSummary.aiModel,
            promptVersion: existingSummary.promptVersion,
            errorMessage: existingSummary.errorMessage,
            metadata: existingSummary.metadata,
          };

          await setCachedSummary(summaryForCache);
          console.log(
            `Hydrated Redis cache for existing summary ${args.bookId}:${args.summaryType}`
          );
        } catch (cacheError) {
          console.error(
            `Failed to hydrate cache for existing summary ${args.bookId}:${args.summaryType}:`,
            cacheError
          );
          // Don't fail the request if caching fails
        }
      }

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
 * 2. Cache failure in Redis with short TTL to prevent API hammering
 * 3. Invalidate any existing successful cache for this book+type
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

    // Step 2: Cache failure in Redis with short TTL to prevent API hammering
    try {
      await cacheFailure(args.bookId, args.summaryType, args.errorMessage);
      console.log(
        `Cached failure for ${args.bookId}:${args.summaryType} to prevent hammering`
      );
    } catch (cacheError) {
      console.error(
        `Failed to cache failure for ${args.bookId}:${args.summaryType}:`,
        cacheError
      );
      // Don't fail the request if caching fails
    }

    // Step 3: Invalidate any existing successful cache for this book+type
    try {
      await invalidateCachedSummary(summaryId, args.bookId, args.summaryType);
      console.log(
        `Invalidated cache for failed summary ${args.bookId}:${args.summaryType}`
      );
    } catch (cacheError) {
      console.error(
        `Failed to invalidate cache for failed summary ${args.bookId}:${args.summaryType}:`,
        cacheError
      );
      // Don't fail the request if cache invalidation fails
    }

    return summaryId as any; // Cast back to Convex ID type
  },
});

/**
 * Check for recent summary generation failures to prevent API hammering
 *
 * This function checks Redis cache for recent failures and returns the error
 * message if one exists within the TTL window (10 minutes).
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
      const recentFailure = await getRecentFailure(
        args.bookId,
        args.summaryType
      );
      if (recentFailure) {
        console.log(
          `Recent failure found for ${args.bookId}:${args.summaryType}: ${recentFailure}`
        );
      }
      return recentFailure;
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
