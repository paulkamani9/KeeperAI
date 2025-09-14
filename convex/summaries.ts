import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";

// Define the summary mode union type
const summaryModeValidator = v.union(
  v.literal("brief"),
  v.literal("concise"),
  v.literal("detailed"),
  v.literal("analysis"),
  v.literal("practical")
);

// Define the summary object validator
const summaryObjectValidator = v.object({
  _id: v.id("summaries"),
  _creationTime: v.number(),
  bookId: v.string(),
  content: v.string(),
  mode: summaryModeValidator,
  generatedAt: v.number(),
});

export const createSummary = mutation({
  args: {
    bookId: v.string(),
    content: v.string(),
    mode: summaryModeValidator,
  },
  returns: v.id("summaries"),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Check if summary already exists for this user, book, and mode
    const existingSummary = await ctx.db
      .query("summaries")
      .withIndex("byUserAndBook", (q) =>
        q.eq("userId", user._id).eq("bookId", args.bookId)
      )
      .filter((q) => q.eq(q.field("mode"), args.mode))
      .first();

    if (existingSummary) {
      // Update existing summary
      await ctx.db.patch(existingSummary._id, {
        content: args.content,
        generatedAt: Date.now(),
      });
      return existingSummary._id;
    }

    // Create new summary
    return await ctx.db.insert("summaries", {
      userId: user._id,
      bookId: args.bookId,
      content: args.content,
      mode: args.mode,
      generatedAt: Date.now(),
    });
  },
});

export const getSummary = query({
  args: {
    bookId: v.string(),
    mode: summaryModeValidator,
  },
  returns: v.union(summaryObjectValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    return await ctx.db
      .query("summaries")
      .withIndex("byUserAndBook", (q) =>
        q.eq("userId", user._id).eq("bookId", args.bookId)
      )
      .filter((q) => q.eq(q.field("mode"), args.mode))
      .first();
  },
});

export const getUserSummaries = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  returns: v.array(summaryObjectValidator),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const { limit = 10, offset = 0 } = args;

    const allSummaries = await ctx.db
      .query("summaries")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return allSummaries.slice(offset, offset + limit);
  },
});

export const getSummariesForBook = query({
  args: {
    bookId: v.string(),
  },
  returns: v.array(summaryObjectValidator),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    return await ctx.db
      .query("summaries")
      .withIndex("byUserAndBook", (q) =>
        q.eq("userId", user._id).eq("bookId", args.bookId)
      )
      .order("desc")
      .collect();
  },
});

export const upsertSummary = mutation({
  args: {
    bookId: v.string(),
    content: v.string(),
    mode: summaryModeValidator,
  },
  returns: v.id("summaries"),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Check if summary already exists for this user, book, and mode
    const existingSummary = await ctx.db
      .query("summaries")
      .withIndex("byUserAndBook", (q) =>
        q.eq("userId", user._id).eq("bookId", args.bookId)
      )
      .filter((q) => q.eq(q.field("mode"), args.mode))
      .first();

    if (existingSummary) {
      // Update existing summary
      await ctx.db.patch(existingSummary._id, {
        content: args.content,
        generatedAt: Date.now(),
      });
      return existingSummary._id;
    }

    // Create new summary
    return await ctx.db.insert("summaries", {
      userId: user._id,
      bookId: args.bookId,
      content: args.content,
      mode: args.mode,
      generatedAt: Date.now(),
    });
  },
});

export const deleteSummary = mutation({
  args: {
    bookId: v.string(),
    mode: v.optional(summaryModeValidator),
  },
  returns: v.number(), // Return count of deleted summaries
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    let summaries;

    if (args.mode) {
      // Delete specific mode summary
      summaries = await ctx.db
        .query("summaries")
        .withIndex("byUserAndBook", (q) =>
          q.eq("userId", user._id).eq("bookId", args.bookId)
        )
        .filter((q) => q.eq(q.field("mode"), args.mode))
        .collect();
    } else {
      // Delete all summaries for this book
      summaries = await ctx.db
        .query("summaries")
        .withIndex("byUserAndBook", (q) =>
          q.eq("userId", user._id).eq("bookId", args.bookId)
        )
        .collect();
    }

    // Delete all found summaries
    for (const summary of summaries) {
      await ctx.db.delete(summary._id);
    }

    return summaries.length;
  },
});

// Additional helper function to get all available modes
export const getAvailableModes = query({
  args: {},
  returns: v.array(v.string()),
  handler: async () => {
    return ["brief", "concise", "detailed", "analysis", "practical"];
  },
});

// Helper function to get summary statistics for a user
export const getSummaryStats = query({
  args: {},
  returns: v.object({
    totalSummaries: v.number(),
    summariesByMode: v.object({
      brief: v.number(),
      concise: v.number(),
      detailed: v.number(),
      analysis: v.number(),
      practical: v.number(),
    }),
    lastGeneratedAt: v.union(v.number(), v.null()),
  }),
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    const allSummaries = await ctx.db
      .query("summaries")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .collect();

    const summariesByMode = {
      brief: 0,
      concise: 0,
      detailed: 0,
      analysis: 0,
      practical: 0,
    };

    let lastGeneratedAt: number | null = null;

    for (const summary of allSummaries) {
      summariesByMode[summary.mode as keyof typeof summariesByMode]++;
      if (!lastGeneratedAt || summary.generatedAt > lastGeneratedAt) {
        lastGeneratedAt = summary.generatedAt;
      }
    }

    return {
      totalSummaries: allSummaries.length,
      summariesByMode,
      lastGeneratedAt,
    };
  },
});
