import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    externalId: v.string(), // Clerk user ID
    preferences: v.array(v.string()), // Last N interaction terms for recommendations
    createdAt: v.number(),
  }).index("byExternalId", ["externalId"]),

  favorites: defineTable({
    userId: v.id("users"),
    bookId: v.string(), // External book identifier (ISBN/API ID)
    bookTitle: v.string(),
    bookAuthor: v.string(),
    genre: v.optional(v.string()),
    addedAt: v.number(),
  })
    .index("byUserId", ["userId"])
    .index("byUserAndBook", ["userId", "bookId"]),

  summaries: defineTable({
    userId: v.optional(v.id("users")),
    bookId: v.string(), // External book identifier from Google Books or Open Library
    bookTitle: v.string(), // Title of the book
    bookAuthors: v.array(v.string()), // Authors of the book
    summaryType: v.union(
      v.literal("concise"),
      v.literal("detailed"),
      v.literal("analysis"),
      v.literal("practical")
    ),
    content: v.string(), // AI-generated summary content
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed")
    ),
    generationTime: v.optional(v.number()), // Time taken to generate in milliseconds
    wordCount: v.number(),
    readingTime: v.number(), // Estimated reading time in minutes
    aiModel: v.string(), // AI model used for generation
    promptVersion: v.string(), // Version of prompt used
    errorMessage: v.optional(v.string()), // Error message if failed
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byUserId", ["userId"])
    .index("byUserAndBook", ["userId", "bookId"])
    .index("byBookAndType", ["bookId", "summaryType"])
    .index("byStatus", ["status"])
    .index("byCreatedAt", ["createdAt"]),

  // New: User activity tracking for preferences
  userActivities: defineTable({
    userId: v.id("users"),
    activityType: v.union(
      v.literal("search"),
      v.literal("favorite"),
      v.literal("comment")
    ),
    searchTerm: v.optional(v.string()), // For search activities
    bookTitle: v.optional(v.string()), // For book-related activities
    bookAuthor: v.optional(v.string()), // For book-related activities
    genre: v.optional(v.string()), // Extracted or provided genre
    metadata: v.optional(v.any()), // Additional context data
    timestamp: v.number(),
  })
    .index("byUserId", ["userId"])
    .index("byUserAndType", ["userId", "activityType"])
    .index("byTimestamp", ["timestamp"]),

  // New: Search analytics and caching
  searchAnalytics: defineTable({
    query: v.string(),
    mode: v.union(v.literal("searchMode"), v.literal("promptMode")),
    userId: v.optional(v.id("users")),
    resultCount: v.number(),
    searchTime: v.number(),
    source: v.string(), // "cache", "google", "openlibrary", "ai"
    cached: v.boolean(),
    timestamp: v.number(),
  })
    .index("byQuery", ["query"])
    .index("byUserId", ["userId"])
    .index("byTimestamp", ["timestamp"]),

  // New: Summary generation analytics
  summaryAnalytics: defineTable({
    bookId: v.string(),
    summaryType: v.union(
      v.literal("concise"),
      v.literal("detailed"),
      v.literal("analysis"),
      v.literal("practical")
    ),
    userId: v.optional(v.id("users")),
    generationTime: v.number(), // milliseconds
    success: v.boolean(),
    errorType: v.optional(v.string()), // Error category if failed
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
    timestamp: v.number(),
  })
    .index("byBookId", ["bookId"])
    .index("bySummaryType", ["summaryType"])
    .index("byUserId", ["userId"])
    .index("byTimestamp", ["timestamp"])
    .index("bySuccess", ["success"])
    .index("byBookAndType", ["bookId", "summaryType"]),
});
