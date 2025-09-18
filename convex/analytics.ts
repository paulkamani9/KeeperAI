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
