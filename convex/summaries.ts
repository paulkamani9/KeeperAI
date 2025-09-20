/**
 * Convex Functions for AI Summary Generation
 *
 * Provides server-side actions, mutations, and queries for managing
 * AI-generated book summaries using OpenAI's GPT models.
 */

import {
  action,
  internalAction,
  query,
  mutation,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";

import type { Doc, Id } from "./_generated/dataModel";

/**
 * Input validation schemas using Convex validators
 */

// Book input validator for summary generation
const BookInputValidator = v.object({
  id: v.string(),
  title: v.string(),
  authors: v.array(v.string()),
  description: v.optional(v.string()),
  publishedDate: v.optional(v.string()),
  publisher: v.optional(v.string()),
  pageCount: v.optional(v.float64()),
  categories: v.optional(v.array(v.string())),
  language: v.optional(v.string()),
  isbn10: v.optional(v.string()),
  isbn13: v.optional(v.string()),
  thumbnail: v.optional(v.string()),
  smallThumbnail: v.optional(v.string()),
  mediumThumbnail: v.optional(v.string()),
  largeThumbnail: v.optional(v.string()),
  averageRating: v.optional(v.float64()),
  ratingsCount: v.optional(v.number()),
  previewLink: v.optional(v.string()),
  infoLink: v.optional(v.string()),
  source: v.union(v.literal("google-books"), v.literal("open-library")),
  originalId: v.string(),
});

// Summary generation request validator
const SummaryGenerationRequestValidator = v.object({
  book: BookInputValidator,
  summaryType: v.union(
    v.literal("concise"),
    v.literal("detailed"),
    v.literal("analysis"),
    v.literal("practical")
  ),
  userId: v.optional(v.string()),
});

// Summary response validator
const SummaryResponseValidator = v.object({
  id: v.string(),
  bookId: v.string(),
  summaryType: v.union(
    v.literal("concise"),
    v.literal("detailed"),
    v.literal("analysis"),
    v.literal("practical")
  ),
  content: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("completed"),
    v.literal("failed")
  ),
  createdAt: v.string(), // ISO date string
  updatedAt: v.string(), // ISO date string
  generationTime: v.optional(v.number()),
  wordCount: v.number(),
  readingTime: v.number(),
  aiModel: v.string(),
  promptVersion: v.string(),
  errorMessage: v.optional(v.string()),
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
});

/**
 * PUBLIC QUERIES
 */

/**
 * Get an existing summary for a book and summary type
 */
export const getSummary = query({
  args: {
    bookId: v.string(),
    summaryType: v.union(
      v.literal("concise"),
      v.literal("detailed"),
      v.literal("analysis"),
      v.literal("practical")
    ),
    userId: v.optional(v.string()),
  },
  returns: v.union(SummaryResponseValidator, v.null()),
  handler: async (ctx, args) => {
    // Query the summaries table based on the existing schema
    // The schema uses mode instead of summaryType, so we need to map it
    const modeMap = {
      concise: "concise" as const,
      detailed: "detailed" as const,
      analysis: "analysis" as const,
      practical: "practical" as const,
    };

    // First, try to find user-specific summary if userId is provided
    if (args.userId) {
      // Note: We need to handle userId conversion in the actual implementation
      // For now, we'll search without user constraint
    }

    // Query by book and mode (the existing schema structure)
    const summary = await ctx.db
      .query("summaries")
      .withIndex("byBookAndMode", (q) =>
        q.eq("bookId", args.bookId).eq("mode", modeMap[args.summaryType])
      )
      .first();

    if (!summary) {
      return null;
    }

    // Convert the database record to our API format
    return {
      id: summary._id,
      bookId: summary.bookId,
      summaryType: args.summaryType,
      content: summary.content,
      status: "completed" as const, // Existing summaries are completed
      createdAt: new Date(summary.generatedAt).toISOString(),
      updatedAt: new Date(summary.generatedAt).toISOString(),
      wordCount: calculateWordCount(summary.content),
      readingTime: calculateReadingTime(summary.content),
      aiModel: "gpt-4o-mini", // Default for existing summaries
      promptVersion: "v1.0", // Default for existing summaries
    };
  },
});

/**
 * Get summary by ID
 */
export const getSummaryById = query({
  args: {
    summaryId: v.string(), // Accept string from URL params, we'll convert internally
  },
  returns: v.union(SummaryResponseValidator, v.null()),
  handler: async (ctx, args) => {
    // Validate the summary ID format first
    if (
      !args.summaryId ||
      args.summaryId.length !== 32 ||
      !/^[a-f0-9]{32}$/.test(args.summaryId)
    ) {
      return null;
    }

    let summary;
    try {
      // Query the summaries table by document ID
      summary = await ctx.db.get(args.summaryId as any);

      if (!summary || summary === null) {
        return null;
      }
    } catch (error) {
      // Handle invalid ID format errors
      console.error("Error fetching summary by ID:", error);
      return null;
    }

    // Check if this is actually a summary document (not another table)
    if (
      !("content" in summary) ||
      !("mode" in summary) ||
      !("bookId" in summary)
    ) {
      return null;
    }

    // Map database mode to valid summaryType
    const modeToSummaryType = {
      brief: "concise" as const,
      concise: "concise" as const,
      detailed: "detailed" as const,
      analysis: "analysis" as const,
      practical: "practical" as const,
    };

    const summaryType =
      modeToSummaryType[summary.mode as keyof typeof modeToSummaryType] ||
      "concise";

    // Calculate word count and reading time from content
    const wordCount = summary.content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // 200 words per minute

    // Return formatted response matching the expected structure
    return {
      id: summary._id,
      bookId: summary.bookId,
      summaryType,
      content: summary.content,
      status: "completed" as const,
      createdAt: new Date(summary.generatedAt).toISOString(),
      updatedAt: new Date(summary.generatedAt).toISOString(),
      generationTime: 15, // Default estimation
      wordCount,
      readingTime,
      aiModel: "gpt-4",
      promptVersion: "v1.0",
      metadata: {
        bookDataSource: "google-books" as const,
        hadBookDescription: true, // Default assumption
      },
    };
  },
});

/**
 * Get service status and configuration
 */
export const getServiceStatus = query({
  args: {},
  returns: v.object({
    isConfigured: v.boolean(),
    rateLimit: v.object({
      hasKey: v.boolean(),
      requestsLeft: v.optional(v.number()),
    }),
    availableModels: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const isConfigured = Boolean(openaiApiKey);

    return {
      isConfigured,
      rateLimit: {
        hasKey: isConfigured,
        requestsLeft: undefined, // We don't track this in the basic implementation
      },
      availableModels: isConfigured
        ? ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]
        : [],
    };
  },
});

/**
 * Get summaries for a specific book
 */
export const getBookSummaries = query({
  args: {
    bookId: v.string(),
    userId: v.optional(v.string()),
  },
  returns: v.array(SummaryResponseValidator),
  handler: async (ctx, args) => {
    // Get all summaries for this book
    const summaries = await ctx.db
      .query("summaries")
      .withIndex(
        "byUserId",
        (q) =>
          // For now, get all summaries since we need userId conversion logic
          q.eq("userId", "placeholder" as any) // This will be fixed when implementing user management
      )
      .collect();

    // Filter by bookId and convert to API format
    return summaries
      .filter((summary) => summary.bookId === args.bookId)
      .map((summary) => ({
        id: summary._id,
        bookId: summary.bookId,
        summaryType: summary.mode as any, // Type assertion for now
        content: summary.content,
        status: "completed" as const,
        createdAt: new Date(summary.generatedAt).toISOString(),
        updatedAt: new Date(summary.generatedAt).toISOString(),
        wordCount: calculateWordCount(summary.content),
        readingTime: calculateReadingTime(summary.content),
        aiModel: "gpt-4o-mini",
        promptVersion: "v1.0",
      }));
  },
});

/**
 * INTERNAL QUERIES (Helper functions)
 */



/**
 * PUBLIC ACTIONS
 */

/**
 * Generate a new AI summary for a book
 * Uses existing summaryService and persists results to database
 */
export const generateSummary = action({
  args: SummaryGenerationRequestValidator,
  returns: SummaryResponseValidator,
  handler: async (ctx, args) => {
    const startTime = Date.now();

    try {
      // Check if summary already exists using public query
      // Import api at runtime to avoid circular dependencies
      const { api } = await import("./_generated/api");
      const existingSummary: any = await ctx.runQuery(api.summaries.getSummary, {
        bookId: args.book.id,
        summaryType: args.summaryType,
        userId: args.userId,
      });

      if (existingSummary) {
        return existingSummary;
      }

      // Generate summary using OpenAI directly (to avoid complex imports in Convex)
      // This centralizes the AI logic while keeping Convex functions simple
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new Error("OpenAI API key not configured");
      }

      const openai = new OpenAI({
        apiKey: openaiApiKey,
      });

      // Build prompts based on summary type  
      const systemPrompt = buildSystemPrompt(args.summaryType);
      const userPrompt = buildUserPrompt(args.book);

      // Generate summary using OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: getMaxTokensForSummaryType(args.summaryType),
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content generated by OpenAI");
      }

      // Create generation result in the same format as summaryService
      const generationResult = {
        content: content.trim(),
        generationTime: Date.now() - startTime,
        aiModel: "gpt-4o-mini",
        promptVersion: "v1.0",
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
          estimatedCost: estimateCost(
            completion.usage?.prompt_tokens || 0,
            completion.usage?.completion_tokens || 0,
            "gpt-4o-mini"
          ),
        },
        metadata: {
          bookDataSource: args.book.source,
          hadBookDescription: Boolean(args.book.description),
        },
      };

      const generationTime = Date.now() - startTime;
      const wordCount = calculateWordCount(generationResult.content);
      const readingTime = calculateReadingTime(generationResult.content);

      // Save summary to database using internal mutation
      const summaryId: string = await ctx.runMutation(internal.summaries.saveSummary, {
        bookId: args.book.id,
        bookTitle: args.book.title,
        bookAuthor: args.book.authors.join(", "),
        summaryType: args.summaryType,
        content: generationResult.content,
        userId: args.userId, // Will be handled as optional in the mutation
        generationTime: generationResult.generationTime,
        metadata: {
          bookDataSource: generationResult.metadata.bookDataSource,
          hadBookDescription: generationResult.metadata.hadBookDescription,
          promptTokens: generationResult.usage?.promptTokens,
          completionTokens: generationResult.usage?.completionTokens,
          estimatedCost: generationResult.usage?.estimatedCost,
        },
      });

      // Return the complete summary object
      return {
        id: summaryId,
        bookId: args.book.id,
        summaryType: args.summaryType,
        content: generationResult.content,
        status: "completed" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        generationTime: generationResult.generationTime,
        wordCount,
        readingTime,
        aiModel: generationResult.aiModel,
        promptVersion: generationResult.promptVersion,
        metadata: {
          bookDataSource: generationResult.metadata.bookDataSource,
          hadBookDescription: generationResult.metadata.hadBookDescription,
          promptTokens: generationResult.usage?.promptTokens,
          completionTokens: generationResult.usage?.completionTokens,
          estimatedCost: generationResult.usage?.estimatedCost,
        },
      };
    } catch (error) {
      const generationTime = Date.now() - startTime;

      // Log error for debugging
      console.error("Summary generation failed:", error);

      // Re-throw with user-friendly message
      if (error instanceof Error) {
        if (error.message.includes("API key") || error.message.includes("not configured")) {
          throw new Error("AI service is not available at the moment");
        }
        if (error.message.includes("rate limit")) {
          throw new Error(
            "Too many requests. Please try again in a few minutes"
          );
        }
        if (error.message.includes("timeout")) {
          throw new Error("Summary generation timed out. Please try again");
        }
      }

      throw new Error("Failed to generate summary. Please try again");
    }
  },
});

/**
 * INTERNAL MUTATIONS
 */

/**
 * Save a generated summary to the database
 */
export const saveSummary = internalMutation({
  args: {
    bookId: v.string(),
    bookTitle: v.string(),
    bookAuthor: v.string(),
    summaryType: v.union(
      v.literal("concise"),
      v.literal("detailed"),
      v.literal("analysis"),
      v.literal("practical")
    ),
    content: v.string(),
    userId: v.optional(v.string()),
    generationTime: v.number(),
    metadata: v.object({
      bookDataSource: v.union(
        v.literal("google-books"),
        v.literal("open-library")
      ),
      hadBookDescription: v.boolean(),
      promptTokens: v.optional(v.number()),
      completionTokens: v.optional(v.number()),
      estimatedCost: v.optional(v.number()),
    }),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Create a placeholder user for non-authenticated summaries
    // This allows the system to work without auth while maintaining data integrity
    let actualUserId: Id<"users">;
    
    if (args.userId) {
      // If user ID is provided, try to find the user
      const user = await ctx.db
        .query("users")
        .withIndex("byExternalId", (q) => q.eq("externalId", args.userId!))
        .first();
      
      if (user) {
        actualUserId = user._id;
      } else {
        // Create a temporary user record for this session
        actualUserId = await ctx.db.insert("users", {
          name: "Anonymous User",
          email: `temp-${args.userId}@keeperai.com`,
          externalId: args.userId,
          preferences: [],
          createdAt: Date.now(),
        });
      }
    } else {
      // Create a completely anonymous user for this summary
      actualUserId = await ctx.db.insert("users", {
        name: "Anonymous User",
        email: `anonymous-${Date.now()}@keeperai.com`,
        externalId: `anon-${Date.now()}`,
        preferences: [],
        createdAt: Date.now(),
      });
    }

    // Map summaryType to existing schema mode field
    const modeMap = {
      concise: "concise" as const,
      detailed: "detailed" as const,
      analysis: "analysis" as const,
      practical: "practical" as const,
    };

    // Insert summary using existing schema structure
    const summaryId = await ctx.db.insert("summaries", {
      userId: actualUserId,
      bookId: args.bookId,
      content: args.content,
      mode: modeMap[args.summaryType],
      generatedAt: Date.now(),
    });

    return summaryId;
  },
});

/**
 * HELPER FUNCTIONS
 */

/**
 * Build system prompt based on summary type
 */
function buildSystemPrompt(summaryType: string): string {
  const basePrompt = `You are an expert book summarizer and literary analyst. Your task is to create engaging, well-structured book summaries that help readers understand and appreciate literature.

Key Guidelines:
- Write in clear, engaging prose that flows naturally
- Structure your content with appropriate headings and sections
- Focus on the most important aspects relevant to the summary type
- Avoid spoilers for plot-driven books unless specifically requested
- Use formatting (headings, bullet points) to improve readability
- Write for an educated general audience
- Always maintain accuracy to the source material`;

  const typeSpecific = {
    concise: `
Create a CONCISE summary (400-600 words) that provides:
- Brief overview of the book's main premise
- Key themes and central arguments
- Most important takeaways
- Target audience and relevance

Structure: Overview, Main Points, Key Takeaways`,

    detailed: `
Create a DETAILED breakdown (1200-1500 words) that provides:
- Comprehensive chapter-by-chapter analysis
- Detailed exploration of themes and concepts
- Character development and plot progression
- Historical context and significance

Structure: Introduction, Chapter Analysis, Themes, Conclusion`,

    analysis: `
Create a CRITICAL ANALYSIS (800-1000 words) that provides:
- Literary techniques and writing style analysis
- Thematic depth and symbolic meaning
- Historical and cultural context
- Critical reception and impact
- Strengths and weaknesses

Structure: Style Analysis, Thematic Analysis, Context, Assessment`,

    practical: `
Create PRACTICAL TAKEAWAYS (600-800 words) that provide:
- Actionable lessons and insights
- Real-world applications
- Key strategies and methods
- Implementation guidance

Structure: Key Lessons, How to Apply, Action Steps, Further Reading`,
  };

  return (
    basePrompt +
    "\n\n" +
    (typeSpecific[summaryType as keyof typeof typeSpecific] ||
      typeSpecific.concise)
  );
}

/**
 * Build user prompt with book information
 */
function buildUserPrompt(book: any): string {
  let prompt = `Please summarize the following book:

Title: ${book.title}
Author(s): ${book.authors.join(", ")}`;

  if (book.description) {
    prompt += `\nDescription: ${book.description}`;
  }

  if (book.categories && book.categories.length > 0) {
    prompt += `\nGenres: ${book.categories.join(", ")}`;
  }

  if (book.publishedDate) {
    prompt += `\nPublished: ${book.publishedDate}`;
  }

  if (book.pageCount) {
    prompt += `\nPage Count: ${book.pageCount}`;
  }

  prompt +=
    "\n\nPlease provide a comprehensive summary following the guidelines above.";

  return prompt;
}

/**
 * Get maximum tokens for summary type
 */
function getMaxTokensForSummaryType(summaryType: string): number {
  const tokenMap = {
    concise: 800, // ~600 words
    detailed: 2000, // ~1500 words
    analysis: 1300, // ~1000 words
    practical: 1100, // ~800 words
  };
  return tokenMap[summaryType as keyof typeof tokenMap] || 800;
}

/**
 * Calculate word count
 */
function calculateWordCount(content: string): number {
  return content
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

/**
 * Calculate reading time (assuming 225 WPM)
 */
function calculateReadingTime(content: string): number {
  const wordCount = calculateWordCount(content);
  return Math.ceil(wordCount / 225);
}

/**
 * Estimate cost based on token usage
 */
function estimateCost(
  promptTokens: number,
  completionTokens: number,
  model: string
): number {
  // Approximate pricing for GPT-4o-mini (as of 2024)
  const inputCostPer1K = 0.00015; // $0.15 per 1K input tokens
  const outputCostPer1K = 0.0006; // $0.60 per 1K output tokens

  const inputCost = (promptTokens / 1000) * inputCostPer1K;
  const outputCost = (completionTokens / 1000) * outputCostPer1K;

  return inputCost + outputCost;
}

/**
 * Categorize errors for analytics
 */
function categorizeError(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes("api key") || message.includes("authentication")) {
    return "auth_error";
  }
  if (message.includes("rate limit") || message.includes("quota")) {
    return "rate_limit";
  }
  if (message.includes("timeout")) {
    return "timeout";
  }
  if (message.includes("network")) {
    return "network_error";
  }
  if (message.includes("validation")) {
    return "validation_error";
  }

  return "unknown_error";
}

// TODO: Import internal and api once functions are properly generated
// import { internal } from "./_generated/api";
// import { api } from "./_generated/api";
