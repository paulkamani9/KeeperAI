/**
 * Convex Summaries Actions - Redis Integration Layer
 *
 * This module provides actions that wrap the database-only queries/mutations
 * with Redis caching logic. Actions run in the Node.js runtime and can access
 * external services like Redis.
 *
 * Actions check Redis first, fall back to database operations, and hydrate
 * the cache on misses. All caching respects the feature flag.
 */

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import {
  getCachedSummaryById,
  getCachedSummaryByBook,
  setCachedSummary,
  invalidateCachedSummary,
  cacheFailure,
  getRecentFailure,
  clearFailure,
} from "../src/lib/cache";
import type { Summary } from "../src/types/summary";

// Feature flag to enable/disable Redis caching
const ENABLE_SUMMARY_REDIS = process.env.ENABLE_SUMMARY_REDIS

/**
 * Helper function to convert Convex document to Summary type for caching
 */
function toSummaryFromDb(doc: any): Summary {
  return {
    id: String(doc._id),
    bookId: doc.bookId,
    summaryType: doc.summaryType,
    content: doc.content,
    status: doc.status,
    createdAt: new Date(doc.createdAt ?? doc._creationTime),
    updatedAt: new Date(doc.updatedAt ?? doc._creationTime),
    generationTime: doc.generationTime,
    wordCount: doc.wordCount,
    readingTime: doc.readingTime,
    aiModel: doc.aiModel,
    promptVersion: doc.promptVersion,
    errorMessage: doc.errorMessage,
    metadata: doc.metadata,
  };
}

/**
 * Get a summary by its Convex ID with Redis caching
 */
export const getSummaryByIdAction = action({
  args: {
    summaryId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const cacheKey = `summary:id:${args.summaryId}`;

    try {
      // Step 1: Check Redis cache if enabled
      if (ENABLE_SUMMARY_REDIS) {
        const cachedSummary = await getCachedSummaryById(args.summaryId);
        if (cachedSummary) {
          const elapsed = Date.now() - startTime;
          console.log(`HIT ${cacheKey} (${elapsed}ms)`);

          // Convert back to Convex document format
          return {
            _id: cachedSummary.id,
            _creationTime: cachedSummary.createdAt.getTime(),
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
            createdAt: cachedSummary.createdAt.getTime(),
            updatedAt: cachedSummary.updatedAt.getTime(),
          };
        }
      }

      // Step 2: Cache miss or flag disabled - query database
      const dbResult: any = await ctx.runQuery(api.summaries.getSummaryById, {
        summaryId: args.summaryId,
      });

      const elapsed = Date.now() - startTime;
      if (ENABLE_SUMMARY_REDIS) {
        console.log(`MISS ${cacheKey} (${elapsed}ms)`);
      } else {
        console.log(`DB-ONLY ${cacheKey} (${elapsed}ms)`);
      }

      // Step 3: Hydrate cache if result found and flag enabled
      if (dbResult && ENABLE_SUMMARY_REDIS) {
        try {
          const summaryForCache = toSummaryFromDb(dbResult);
          await setCachedSummary(summaryForCache);
        } catch (cacheError) {
          console.error(
            `Failed to cache summary ${args.summaryId}:`,
            cacheError
          );
          // Don't fail the request on cache errors
        }
      }

      return dbResult;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`ERROR ${cacheKey} (${elapsed}ms):`, error);
      throw error;
    }
  },
});

/**
 * Check if a summary exists for a book and type with Redis caching
 */
export const getExistingSummaryAction = action({
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
  returns: v.any(),
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const cacheKey = `summary:book:${args.bookId}:${args.summaryType}`;

    try {
      // Step 1: Check Redis cache if enabled
      if (ENABLE_SUMMARY_REDIS) {
        const cachedSummary = await getCachedSummaryByBook(
          args.bookId,
          args.summaryType
        );
        if (cachedSummary) {
          const elapsed = Date.now() - startTime;
          console.log(`HIT ${cacheKey} (${elapsed}ms)`);

          // Convert back to Convex document format
          return {
            _id: cachedSummary.id,
            _creationTime: cachedSummary.createdAt.getTime(),
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
            createdAt: cachedSummary.createdAt.getTime(),
            updatedAt: cachedSummary.updatedAt.getTime(),
          };
        }
      }

      // Step 2: Cache miss or flag disabled - query database
      const dbResult: any = await ctx.runQuery(
        api.summaries.getExistingSummary,
        {
          bookId: args.bookId,
          summaryType: args.summaryType,
          userId: args.userId,
        }
      );

      const elapsed = Date.now() - startTime;
      if (ENABLE_SUMMARY_REDIS) {
        console.log(`MISS ${cacheKey} (${elapsed}ms)`);
      } else {
        console.log(`DB-ONLY ${cacheKey} (${elapsed}ms)`);
      }

      // Step 3: Hydrate cache if result found and flag enabled
      if (dbResult && ENABLE_SUMMARY_REDIS) {
        try {
          const summaryForCache = toSummaryFromDb(dbResult);
          await setCachedSummary(summaryForCache);
        } catch (cacheError) {
          console.error(
            `Failed to cache existing summary ${args.bookId}:${args.summaryType}:`,
            cacheError
          );
          // Don't fail the request on cache errors
        }
      }

      return dbResult;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`ERROR ${cacheKey} (${elapsed}ms):`, error);
      throw error;
    }
  },
});

/**
 * Store a completed summary with Redis cache hydration
 */
export const storeSummaryAction = action({
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
    const startTime = Date.now();

    try {
      // Step 1: Store in database first (source of truth)
      const summaryId: any = await ctx.runMutation(
        api.summaries.storeSummary,
        args
      );

      // Step 2: If Redis enabled, fetch fresh data and hydrate cache
      if (ENABLE_SUMMARY_REDIS) {
        try {
          // Fetch the fresh document from database
          const freshDoc = await ctx.runQuery(api.summaries.getSummaryById, {
            summaryId: String(summaryId),
          });

          if (freshDoc) {
            // Convert and cache
            const summaryForCache = toSummaryFromDb(freshDoc);
            await setCachedSummary(summaryForCache);

            // Clear any failure cache for this book+type
            await clearFailure(args.bookId, args.summaryType);

            const elapsed = Date.now() - startTime;
            console.log(
              `STORED+CACHED summary:book:${args.bookId}:${args.summaryType} (${elapsed}ms)`
            );
          }
        } catch (cacheError) {
          console.error(
            `Failed to hydrate cache after storing summary:`,
            cacheError
          );
          // Don't fail the request on cache errors
        }
      } else {
        const elapsed = Date.now() - startTime;
        console.log(
          `STORED summary:book:${args.bookId}:${args.summaryType} (${elapsed}ms)`
        );
      }

      return summaryId;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(
        `ERROR storing summary:book:${args.bookId}:${args.summaryType} (${elapsed}ms):`,
        error
      );
      throw error;
    }
  },
});

/**
 * Record a summary generation failure with Redis cache management
 */
export const recordSummaryFailureAction = action({
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
    const startTime = Date.now();

    try {
      // Step 1: Record failure in database
      const summaryId: any = await ctx.runMutation(
        api.summaries.recordSummaryFailure,
        args
      );

      // Step 2: If Redis enabled, manage cache
      if (ENABLE_SUMMARY_REDIS) {
        try {
          // Cache the failure with short TTL to prevent API hammering
          await cacheFailure(args.bookId, args.summaryType, args.errorMessage);

          // Invalidate any existing successful cache
          await invalidateCachedSummary(
            String(summaryId),
            args.bookId,
            args.summaryType
          );

          const elapsed = Date.now() - startTime;
          console.log(
            `FAILED+CACHED summary:book:${args.bookId}:${args.summaryType} (${elapsed}ms)`
          );
        } catch (cacheError) {
          console.error(
            `Failed to manage cache after recording failure:`,
            cacheError
          );
          // Don't fail the request on cache errors
        }
      } else {
        const elapsed = Date.now() - startTime;
        console.log(
          `FAILED summary:book:${args.bookId}:${args.summaryType} (${elapsed}ms)`
        );
      }

      return summaryId;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(
        `ERROR recording failure summary:book:${args.bookId}:${args.summaryType} (${elapsed}ms):`,
        error
      );
      throw error;
    }
  },
});

/**
 * Check for recent failures with Redis caching
 */
export const checkRecentFailureAction = action({
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
  handler: async (ctx, args): Promise<string | null> => {
    const startTime = Date.now();
    const cacheKey = `fail:summary:${args.bookId}:${args.summaryType}`;

    try {
      // If Redis enabled, check cache first
      if (ENABLE_SUMMARY_REDIS) {
        const recentFailure = await getRecentFailure(
          args.bookId,
          args.summaryType
        );
        const elapsed = Date.now() - startTime;

        if (recentFailure) {
          console.log(`HIT ${cacheKey} (${elapsed}ms)`);
          return recentFailure;
        } else {
          console.log(`MISS ${cacheKey} (${elapsed}ms)`);
        }
      } else {
        // Fall back to database check
        const dbResult: string | null = await ctx.runQuery(
          api.summaries.checkRecentFailure,
          {
            bookId: args.bookId,
            summaryType: args.summaryType,
          }
        );

        const elapsed = Date.now() - startTime;
        console.log(`DB-ONLY ${cacheKey} (${elapsed}ms)`);
        return dbResult;
      }

      return null;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`ERROR ${cacheKey} (${elapsed}ms):`, error);
      return null; // Don't throw on failure check errors
    }
  },
});
