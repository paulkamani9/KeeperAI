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
    userId: v.id("users"),
    bookId: v.string(), // External book identifier
    content: v.string(), // AI-generated summary
    mode: v.union(
      v.literal("brief"),
      v.literal("concise"),
      v.literal("detailed"),
      v.literal("analysis"),
      v.literal("practical")
    ),
    generatedAt: v.number(),
  })
    .index("byUserId", ["userId"])
    .index("byUserAndBook", ["userId", "bookId"])
    .index("byBookAndMode", ["bookId", "mode"]),

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
});
