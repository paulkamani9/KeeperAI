/**
 * User Preferences Convex Mutations
 *
 * Handles asynchronous updates to user preferences based on:
 * - Search activities
 * - Book favorites
 * - Comments and interactions
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Record user search activity and update preferences
 */
export const recordSearchActivity = mutation({
  args: {
    userId: v.id("users"),
    searchTerm: v.string(),
    mode: v.union(v.literal("searchMode"), v.literal("promptMode")),
    resultCount: v.number(),
    searchTime: v.number(),
    source: v.string(),
    cached: v.boolean(),
  },
  handler: async (ctx, args) => {
    const {
      userId,
      searchTerm,
      mode,
      resultCount,
      searchTime,
      source,
      cached,
    } = args;

    // Record the search activity
    await ctx.db.insert("userActivities", {
      userId,
      activityType: "search",
      searchTerm,
      timestamp: Date.now(),
    });

    // Record search analytics
    await ctx.db.insert("searchAnalytics", {
      query: searchTerm,
      mode,
      userId,
      resultCount,
      searchTime,
      source,
      cached,
      timestamp: Date.now(),
    });

    // Update user preferences asynchronously
    await updateUserPreferencesFromSearch(ctx, userId, searchTerm);
  },
});

/**
 * Record book favorite activity and update preferences
 */
export const recordFavoriteActivity = mutation({
  args: {
    userId: v.id("users"),
    bookId: v.string(),
    bookTitle: v.string(),
    bookAuthor: v.string(),
    genre: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, bookId, bookTitle, bookAuthor, genre } = args;

    // Record the favorite activity
    await ctx.db.insert("userActivities", {
      userId,
      activityType: "favorite",
      bookTitle,
      bookAuthor,
      genre,
      timestamp: Date.now(),
    });

    // Update user preferences based on favorite
    await updateUserPreferencesFromFavorite(
      ctx,
      userId,
      bookTitle,
      bookAuthor,
      genre
    );
  },
});

/**
 * Record comment/interaction activity and update preferences
 */
export const recordCommentActivity = mutation({
  args: {
    userId: v.id("users"),
    bookId: v.string(),
    bookTitle: v.string(),
    bookAuthor: v.string(),
    genre: v.optional(v.string()),
    commentText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, bookId, bookTitle, bookAuthor, genre, commentText } = args;

    // Record the comment activity
    await ctx.db.insert("userActivities", {
      userId,
      activityType: "comment",
      bookTitle,
      bookAuthor,
      genre,
      metadata: commentText ? { commentText } : undefined,
      timestamp: Date.now(),
    });

    // Update user preferences based on interaction
    await updateUserPreferencesFromInteraction(
      ctx,
      userId,
      bookTitle,
      bookAuthor,
      genre
    );
  },
});

/**
 * Get user preferences for AI recommendations
 */
export const getUserPreferences = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return [];
    }

    return user.preferences;
  },
});

/**
 * Get recent user activities for context
 */
export const getRecentUserActivities = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    activityType: v.optional(
      v.union(v.literal("search"), v.literal("favorite"), v.literal("comment"))
    ),
  },
  handler: async (ctx, args) => {
    const { userId, limit = 20, activityType } = args;

    let query = ctx.db
      .query("userActivities")
      .withIndex("byUserId", (q) => q.eq("userId", userId));

    if (activityType) {
      query = query.filter((q) => q.eq(q.field("activityType"), activityType));
    }

    const activities = await query.order("desc").take(limit);

    return activities;
  },
});

/**
 * Get search analytics for popular queries
 */
export const getPopularQueries = query({
  args: {
    limit: v.optional(v.number()),
    timeframe: v.optional(v.number()), // milliseconds ago
  },
  handler: async (ctx, args) => {
    const { limit = 10, timeframe } = args;

    let query = ctx.db.query("searchAnalytics");

    if (timeframe) {
      const cutoff = Date.now() - timeframe;
      query = query.filter((q) => q.gte(q.field("timestamp"), cutoff));
    }

    const searches = await query.order("desc").take(1000); // Get recent searches

    // Group by query and count occurrences
    const queryStats = new Map<
      string,
      { count: number; avgResults: number; lastSearched: number }
    >();

    for (const search of searches) {
      const existing = queryStats.get(search.query) || {
        count: 0,
        avgResults: 0,
        lastSearched: 0,
      };
      queryStats.set(search.query, {
        count: existing.count + 1,
        avgResults:
          (existing.avgResults * existing.count + search.resultCount) /
          (existing.count + 1),
        lastSearched: Math.max(existing.lastSearched, search.timestamp),
      });
    }

    // Sort by count and return top queries
    return Array.from(queryStats.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([query, stats]) => ({ query, ...stats }));
  },
});

/**
 * Internal helper: Update user preferences from search activity
 */
async function updateUserPreferencesFromSearch(
  ctx: any,
  userId: any,
  searchTerm: string
) {
  const user = await ctx.db.get(userId);
  if (!user) return;

  // Extract meaningful terms from search
  const terms = extractSearchTerms(searchTerm);
  const updatedPreferences = updatePreferencesArray(user.preferences, terms);

  // Update user preferences if changed
  if (JSON.stringify(updatedPreferences) !== JSON.stringify(user.preferences)) {
    await ctx.db.patch(userId, {
      preferences: updatedPreferences,
    });
  }
}

/**
 * Internal helper: Update user preferences from favorite activity
 */
async function updateUserPreferencesFromFavorite(
  ctx: any,
  userId: any,
  bookTitle: string,
  bookAuthor: string,
  genre?: string
) {
  const user = await ctx.db.get(userId);
  if (!user) return;

  const terms: string[] = [];

  // Add genre with higher weight (favorites are strong signals)
  if (genre) {
    terms.push(genre, genre); // Add twice for higher weight
  }

  // Add author
  terms.push(bookAuthor);

  // Extract meaningful terms from book title
  const titleTerms = extractBookTitleTerms(bookTitle);
  terms.push(...titleTerms);

  const updatedPreferences = updatePreferencesArray(user.preferences, terms);

  if (JSON.stringify(updatedPreferences) !== JSON.stringify(user.preferences)) {
    await ctx.db.patch(userId, {
      preferences: updatedPreferences,
    });
  }
}

/**
 * Internal helper: Update user preferences from interaction activity
 */
async function updateUserPreferencesFromInteraction(
  ctx: any,
  userId: any,
  bookTitle: string,
  bookAuthor: string,
  genre?: string
) {
  // Similar to favorite but with lower weight
  const user = await ctx.db.get(userId);
  if (!user) return;

  const terms: string[] = [];

  if (genre) {
    terms.push(genre);
  }

  // Add author with lower weight than favorites
  if (Math.random() > 0.5) {
    // 50% chance to reduce noise
    terms.push(bookAuthor);
  }

  const updatedPreferences = updatePreferencesArray(user.preferences, terms);

  if (JSON.stringify(updatedPreferences) !== JSON.stringify(user.preferences)) {
    await ctx.db.patch(userId, {
      preferences: updatedPreferences,
    });
  }
}

/**
 * Extract meaningful search terms for preferences
 */
function extractSearchTerms(searchTerm: string): string[] {
  const terms: string[] = [];
  const cleaned = searchTerm
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ");

  // Filter out common words and short words
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "book",
    "books",
    "novel",
    "story",
    "read",
    "reading",
    "author",
    "writer",
    "fiction",
  ]);

  for (const word of words) {
    if (word.length > 2 && !stopWords.has(word)) {
      terms.push(word);
    }
  }

  return terms.slice(0, 3); // Limit to 3 terms to avoid noise
}

/**
 * Extract meaningful terms from book titles
 */
function extractBookTitleTerms(title: string): string[] {
  const terms: string[] = [];
  const cleaned = title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ");

  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
  ]);

  // Take first few significant words from title
  let count = 0;
  for (const word of words) {
    if (word.length > 3 && !stopWords.has(word) && count < 2) {
      terms.push(word);
      count++;
    }
  }

  return terms;
}

/**
 * Update preferences array with new terms, maintaining recency and frequency
 */
function updatePreferencesArray(
  currentPreferences: string[],
  newTerms: string[]
): string[] {
  const maxPreferences = 50; // Maximum number of preferences to store
  const preferences = [...currentPreferences];

  // Add new terms to the front (most recent)
  for (const term of newTerms) {
    // Remove existing occurrence if present
    const existingIndex = preferences.indexOf(term);
    if (existingIndex !== -1) {
      preferences.splice(existingIndex, 1);
    }

    // Add to front
    preferences.unshift(term);
  }

  // Trim to maximum length
  return preferences.slice(0, maxPreferences);
}
