/**
 * Analytics functions for tracking search behavior and performance
 *
 * This module provides anonymized search tracking to help improve
 * the search experience without compromising user privacy.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Log a search query for analytics purposes
 *
 * Tracks anonymized search data to understand:
 * - Popular search terms
 * - Search performance metrics
 * - API source effectiveness
 * - Cache hit rates
 */
export const logSearchQuery = mutation({
  args: {
    query: v.string(),
    mode: v.union(v.literal("searchMode"), v.literal("promptMode")),
    userId: v.optional(v.id("users")),
    resultCount: v.number(),
    searchTime: v.number(),
    source: v.string(), // "google-books", "open-library", "combined", "cache"
    cached: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Only log non-empty queries to avoid noise
    if (!args.query.trim()) return null;

    // Insert analytics record
    const analyticsId = await ctx.db.insert("searchAnalytics", {
      query: args.query.toLowerCase().trim(), // Normalize for analysis
      mode: args.mode,
      userId: args.userId,
      resultCount: args.resultCount,
      searchTime: args.searchTime,
      source: args.source,
      cached: args.cached,
      timestamp: Date.now(),
    });

    return analyticsId;
  },
});

/**
 * Get popular search terms for analytics dashboard
 */
export const getPopularSearchTerms = query({
  args: {
    limit: v.optional(v.number()),
    timeframe: v.optional(v.number()), // milliseconds back from now
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const timeframe = args.timeframe || 7 * 24 * 60 * 60 * 1000; // 7 days default
    const since = Date.now() - timeframe;

    // Get search analytics from the specified timeframe
    const searches = await ctx.db
      .query("searchAnalytics")
      .withIndex("byTimestamp")
      .filter((q) => q.gte(q.field("timestamp"), since))
      .collect();

    // Aggregate by query term
    const queryMap = new Map<
      string,
      {
        query: string;
        searchCount: number;
        totalResults: number;
        avgSearchTime: number;
        cacheHitRate: number;
      }
    >();

    for (const search of searches) {
      const existing = queryMap.get(search.query);
      if (existing) {
        existing.searchCount++;
        existing.totalResults += search.resultCount;
        existing.avgSearchTime =
          (existing.avgSearchTime + search.searchTime) / 2;
        existing.cacheHitRate =
          (existing.cacheHitRate + (search.cached ? 1 : 0)) /
          existing.searchCount;
      } else {
        queryMap.set(search.query, {
          query: search.query,
          searchCount: 1,
          totalResults: search.resultCount,
          avgSearchTime: search.searchTime,
          cacheHitRate: search.cached ? 1 : 0,
        });
      }
    }

    // Sort by search count and return top results
    return Array.from(queryMap.values())
      .sort((a, b) => b.searchCount - a.searchCount)
      .slice(0, limit);
  },
});

/**
 * Get search performance metrics
 */
export const getSearchMetrics = query({
  args: {
    timeframe: v.optional(v.number()), // milliseconds back from now
  },
  handler: async (ctx, args) => {
    const timeframe = args.timeframe || 24 * 60 * 60 * 1000; // 24 hours default
    const since = Date.now() - timeframe;

    const searches = await ctx.db
      .query("searchAnalytics")
      .withIndex("byTimestamp")
      .filter((q) => q.gte(q.field("timestamp"), since))
      .collect();

    if (searches.length === 0) {
      return {
        totalSearches: 0,
        avgSearchTime: 0,
        avgResults: 0,
        cacheHitRate: 0,
        sourceBreakdown: {},
        popularSources: [],
      };
    }

    // Calculate metrics
    const totalSearches = searches.length;
    const avgSearchTime =
      searches.reduce((sum, s) => sum + s.searchTime, 0) / totalSearches;
    const avgResults =
      searches.reduce((sum, s) => sum + s.resultCount, 0) / totalSearches;
    const cacheHitRate =
      searches.filter((s) => s.cached).length / totalSearches;

    // Source breakdown
    const sourceMap = new Map<string, number>();
    for (const search of searches) {
      sourceMap.set(search.source, (sourceMap.get(search.source) || 0) + 1);
    }

    const sourceBreakdown = Object.fromEntries(sourceMap);
    const popularSources = Array.from(sourceMap.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([source, count]) => ({
        source,
        count,
        percentage: count / totalSearches,
      }));

    return {
      totalSearches,
      avgSearchTime: Math.round(avgSearchTime),
      avgResults: Math.round(avgResults * 10) / 10,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      sourceBreakdown,
      popularSources,
    };
  },
});

/**
 * Record user activity for preference learning
 */
export const logUserActivity = mutation({
  args: {
    userId: v.optional(v.id("users")),
    activityType: v.union(
      v.literal("search"),
      v.literal("favorite"),
      v.literal("comment")
    ),
    searchTerm: v.optional(v.string()),
    bookTitle: v.optional(v.string()),
    bookAuthor: v.optional(v.string()),
    genre: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Only log if we have a user ID (authenticated users only)
    if (!args.userId) return null;

    return await ctx.db.insert("userActivities", {
      userId: args.userId,
      activityType: args.activityType,
      searchTerm: args.searchTerm,
      bookTitle: args.bookTitle,
      bookAuthor: args.bookAuthor,
      genre: args.genre,
      metadata: args.metadata,
      timestamp: Date.now(),
    });
  },
});

/**
 * Get user search preferences for recommendation system
 */
export const getUserSearchPreferences = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // Get recent search activities
    const activities = await ctx.db
      .query("userActivities")
      .withIndex("byUserAndType", (q) =>
        q.eq("userId", args.userId).eq("activityType", "search")
      )
      .order("desc")
      .take(limit);

    // Extract search terms and genres
    const searchTerms = activities
      .filter((a) => a.searchTerm)
      .map((a) => a.searchTerm!);

    const genres = activities.filter((a) => a.genre).map((a) => a.genre!);

    // Calculate frequency
    const termFrequency = new Map<string, number>();
    const genreFrequency = new Map<string, number>();

    for (const term of searchTerms) {
      termFrequency.set(term, (termFrequency.get(term) || 0) + 1);
    }

    for (const genre of genres) {
      genreFrequency.set(genre, (genreFrequency.get(genre) || 0) + 1);
    }

    return {
      topSearchTerms: Array.from(termFrequency.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([term, count]) => ({ term, count })),
      topGenres: Array.from(genreFrequency.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([genre, count]) => ({ genre, count })),
      recentActivities: activities.slice(0, 20),
    };
  },
});

/**
 * Log summary generation analytics
 *
 * Tracks performance and usage of AI summary generation to help optimize:
 * - Generation performance and reliability
 * - Popular summary types and books
 * - Cost analysis and model effectiveness
 * - Error patterns and troubleshooting
 */
export const logSummaryGeneration = mutation({
  args: {
    bookId: v.string(),
    summaryType: v.union(
      v.literal("concise"),
      v.literal("detailed"),
      v.literal("analysis"),
      v.literal("practical")
    ),
    userId: v.optional(v.id("users")),
    generationTime: v.number(),
    success: v.boolean(),
    errorType: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    aiModel: v.string(),
    promptVersion: v.string(),
    tokenUsage: v.optional(
      v.object({
        promptTokens: v.number(),
        completionTokens: v.number(),
        totalTokens: v.number(),
        estimatedCost: v.optional(v.number()),
      })
    ),
    cacheHit: v.boolean(),
    bookMetadata: v.object({
      title: v.string(),
      authors: v.array(v.string()),
      source: v.union(v.literal("google-books"), v.literal("open-library")),
      hadDescription: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("summaryAnalytics", {
      bookId: args.bookId,
      summaryType: args.summaryType,
      userId: args.userId,
      generationTime: args.generationTime,
      success: args.success,
      errorType: args.errorType,
      errorMessage: args.errorMessage,
      aiModel: args.aiModel,
      promptVersion: args.promptVersion,
      tokenUsage: args.tokenUsage,
      cacheHit: args.cacheHit,
      bookMetadata: args.bookMetadata,
      timestamp: Date.now(),
    });
  },
});

/**
 * Get summary generation metrics
 */
export const getSummaryMetrics = query({
  args: {
    timeframe: v.optional(v.number()), // milliseconds back from now
  },
  handler: async (ctx, args) => {
    const timeframe = args.timeframe || 24 * 60 * 60 * 1000; // 24 hours default
    const since = Date.now() - timeframe;

    const analytics = await ctx.db
      .query("summaryAnalytics")
      .withIndex("byTimestamp")
      .filter((q) => q.gte(q.field("timestamp"), since))
      .collect();

    if (analytics.length === 0) {
      return {
        totalGenerations: 0,
        successRate: 0,
        avgGenerationTime: 0,
        cacheHitRate: 0,
        totalCost: 0,
        popularSummaryTypes: [],
        popularBooks: [],
        modelBreakdown: {},
        errorBreakdown: {},
      };
    }

    const successful = analytics.filter((a) => a.success);
    const failed = analytics.filter((a) => !a.success);

    // Calculate basic metrics
    const totalGenerations = analytics.length;
    const successRate = successful.length / totalGenerations;
    const avgGenerationTime =
      successful.reduce((sum, a) => sum + a.generationTime, 0) /
        successful.length || 0;
    const cacheHitRate =
      analytics.filter((a) => a.cacheHit).length / totalGenerations;

    // Calculate total cost
    const totalCost = analytics.reduce((sum, a) => {
      return sum + (a.tokenUsage?.estimatedCost || 0);
    }, 0);

    // Summary type popularity
    const typeMap = new Map<string, number>();
    for (const analytic of analytics) {
      typeMap.set(
        analytic.summaryType,
        (typeMap.get(analytic.summaryType) || 0) + 1
      );
    }
    const popularSummaryTypes = Array.from(typeMap.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({
        type,
        count,
        percentage: count / totalGenerations,
      }));

    // Book popularity
    const bookMap = new Map<string, { title: string; count: number }>();
    for (const analytic of analytics) {
      const existing = bookMap.get(analytic.bookId);
      if (existing) {
        existing.count++;
      } else {
        bookMap.set(analytic.bookId, {
          title: analytic.bookMetadata.title,
          count: 1,
        });
      }
    }
    const popularBooks = Array.from(bookMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Model breakdown
    const modelMap = new Map<string, number>();
    for (const analytic of analytics) {
      modelMap.set(analytic.aiModel, (modelMap.get(analytic.aiModel) || 0) + 1);
    }
    const modelBreakdown = Object.fromEntries(modelMap);

    // Error breakdown
    const errorMap = new Map<string, number>();
    for (const analytic of failed) {
      const errorType = analytic.errorType || "unknown";
      errorMap.set(errorType, (errorMap.get(errorType) || 0) + 1);
    }
    const errorBreakdown = Object.fromEntries(errorMap);

    return {
      totalGenerations,
      successRate: Math.round(successRate * 100) / 100,
      avgGenerationTime: Math.round(avgGenerationTime),
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      totalCost: Math.round(totalCost * 10000) / 10000, // Round to 4 decimal places
      popularSummaryTypes,
      popularBooks,
      modelBreakdown,
      errorBreakdown,
    };
  },
});

/**
 * Get popular books for summary generation
 */
export const getPopularSummaryBooks = query({
  args: {
    limit: v.optional(v.number()),
    timeframe: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const timeframe = args.timeframe || 7 * 24 * 60 * 60 * 1000; // 7 days default
    const since = Date.now() - timeframe;

    const analytics = await ctx.db
      .query("summaryAnalytics")
      .withIndex("byTimestamp")
      .filter((q) => q.gte(q.field("timestamp"), since))
      .collect();

    // Group by book and calculate metrics
    const bookMap = new Map<
      string,
      {
        bookId: string;
        title: string;
        authors: string[];
        totalGenerations: number;
        successfulGenerations: number;
        summaryTypes: Set<string>;
        avgGenerationTime: number;
        totalCost: number;
      }
    >();

    for (const analytic of analytics) {
      const existing = bookMap.get(analytic.bookId);
      if (existing) {
        existing.totalGenerations++;
        if (analytic.success) {
          existing.successfulGenerations++;
          existing.avgGenerationTime =
            (existing.avgGenerationTime + analytic.generationTime) / 2;
        }
        existing.summaryTypes.add(analytic.summaryType);
        existing.totalCost += analytic.tokenUsage?.estimatedCost || 0;
      } else {
        bookMap.set(analytic.bookId, {
          bookId: analytic.bookId,
          title: analytic.bookMetadata.title,
          authors: analytic.bookMetadata.authors,
          totalGenerations: 1,
          successfulGenerations: analytic.success ? 1 : 0,
          summaryTypes: new Set([analytic.summaryType]),
          avgGenerationTime: analytic.generationTime,
          totalCost: analytic.tokenUsage?.estimatedCost || 0,
        });
      }
    }

    // Convert to array and sort by total generations
    return Array.from(bookMap.values())
      .map((book) => ({
        ...book,
        summaryTypes: Array.from(book.summaryTypes),
        successRate: book.successfulGenerations / book.totalGenerations,
      }))
      .sort((a, b) => b.totalGenerations - a.totalGenerations)
      .slice(0, limit);
  },
});

/**
 * Get detailed analytics for a specific book
 */
export const getBookSummaryAnalytics = query({
  args: {
    bookId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const analytics = await ctx.db
      .query("summaryAnalytics")
      .withIndex("byBookId", (q) => q.eq("bookId", args.bookId))
      .order("desc")
      .take(limit);

    if (analytics.length === 0) {
      return {
        bookId: args.bookId,
        totalGenerations: 0,
        recentGenerations: [],
        summaryTypeBreakdown: {},
        avgGenerationTimeByType: {},
        successRateByType: {},
      };
    }

    // Calculate metrics by summary type
    const typeMap = new Map<
      string,
      {
        count: number;
        successful: number;
        totalTime: number;
      }
    >();

    for (const analytic of analytics) {
      const existing = typeMap.get(analytic.summaryType);
      if (existing) {
        existing.count++;
        if (analytic.success) {
          existing.successful++;
          existing.totalTime += analytic.generationTime;
        }
      } else {
        typeMap.set(analytic.summaryType, {
          count: 1,
          successful: analytic.success ? 1 : 0,
          totalTime: analytic.success ? analytic.generationTime : 0,
        });
      }
    }

    const summaryTypeBreakdown = Object.fromEntries(
      Array.from(typeMap.entries()).map(([type, data]) => [
        type,
        {
          count: data.count,
          successRate: data.successful / data.count,
        },
      ])
    );

    const avgGenerationTimeByType = Object.fromEntries(
      Array.from(typeMap.entries()).map(([type, data]) => [
        type,
        data.successful > 0 ? Math.round(data.totalTime / data.successful) : 0,
      ])
    );

    const successRateByType = Object.fromEntries(
      Array.from(typeMap.entries()).map(([type, data]) => [
        type,
        Math.round((data.successful / data.count) * 100) / 100,
      ])
    );

    return {
      bookId: args.bookId,
      bookMetadata: analytics[0]?.bookMetadata,
      totalGenerations: analytics.length,
      recentGenerations: analytics.slice(0, 10),
      summaryTypeBreakdown,
      avgGenerationTimeByType,
      successRateByType,
    };
  },
});
