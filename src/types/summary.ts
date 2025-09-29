import { z } from "zod";
import type { Book } from "./book";

/**
 * Summary generation result with detailed metadata
 **/

interface SummaryGenerationResult {
  /** Generated summary content */
  content: string;

  /** Time taken to generate (milliseconds) */
  generationTime: number;

  /** AI model used */
  aiModel: string;

  /** Prompt version */
  promptVersion: string;

  /** Token usage information */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost?: number;
  };

  /** Additional metadata */
  metadata: {
    bookDataSource: "google-books" | "open-library";
    hadBookDescription: boolean;
    notes?: string;
  };
}

/**
 * Summary generation options
 */
interface SummaryGenerationOptions {
  /** AI model to use (defaults to gpt-4o-mini) */
  model?: string;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Temperature for creativity (0-1) */
  temperature?: number;

  /** Additional context or instructions */
  additionalContext?: string;

  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Summary service interface
 */
export interface SummaryService {
  /** Generate an AI summary for a book */
  generateSummary(
    book: Book,
    summaryType: SummaryType,
    options?: SummaryGenerationOptions
  ): Promise<SummaryGenerationResult>;

  /** Check if the service is properly configured */
  isConfigured(): boolean;

  /** Get rate limiting information */
  getRateLimit(): { hasKey: boolean; requestsLeft?: number };

  /** Get available models */
  getAvailableModels(): string[];

  /** Test the OpenAI connection */
  testConnection(): Promise<boolean>;
}

/**
 * Summary Types for KeeperAI
 *
 * Defines the types and schemas for AI-generated book summaries
 * with multiple summary types to serve different user needs.
 */

/**
 * Available summary types with different purposes and lengths
 */
export type SummaryType = "concise" | "detailed" | "analysis" | "practical";

/**
 * Summary type enum for better IDE support
 */
export const SUMMARY_TYPES = {
  concise: "concise",
  detailed: "detailed",
  analysis: "analysis",
  practical: "practical",
} as const;

/**
 * Summary type descriptions for UI display
 */
export const SUMMARY_TYPE_DESCRIPTIONS = {
  concise: {
    title: "Concise Summary",
    description: "Quick overview and key points",
    readTime: "2-3 minutes read",
    icon: "⚡",
  },
  detailed: {
    title: "Detailed Breakdown",
    description: "Chapter-by-chapter breakdown",
    readTime: "8-10 minutes read",
    icon: "📚",
  },
  analysis: {
    title: "Critical Analysis",
    description: "Critical analysis of themes and style",
    readTime: "5-7 minutes read",
    icon: "🔍",
  },
  practical: {
    title: "Practical Takeaways",
    description: "Actionable takeaways for your life",
    readTime: "4-6 minutes read",
    icon: "💡",
  },
} as const;

/**
 * Summary generation status
 */
export type SummaryStatus = "pending" | "generating" | "completed" | "failed";

/**
 * Core Summary interface
 */
export interface Summary {
  /** Unique identifier for this summary */
  id: string;

  /** ID of the book this summary is for */
  bookId: string;

  /** Title of the book */
  bookTitle: string;

  /** Authors of the book */
  bookAuthors: string[];

  /** Type of summary */
  summaryType: SummaryType;

  /** Generated summary content in markdown format */
  content: string;

  /** Summary generation status */
  status: SummaryStatus;

  /** When this summary was created */
  createdAt: Date;

  /** When this summary was last updated */
  updatedAt: Date;

  /** Time taken to generate the summary (in milliseconds) */
  generationTime?: number;

  /** Word count of the summary content */
  wordCount: number;

  /** Estimated reading time in minutes */
  readingTime: number;

  /** AI model used for generation */
  aiModel: string;

  /** Version of the summary generation prompt/system */
  promptVersion: string;

  /** Error message if generation failed */
  errorMessage?: string;

  /** Additional metadata for analytics and debugging */
  metadata?: {
    /** Source of book information used for generation */
    bookDataSource: "google-books" | "open-library";

    /** Whether book had a description to work with */
    hadBookDescription: boolean;

    /** Number of prompt tokens used */
    promptTokens?: number;

    /** Number of completion tokens generated */
    completionTokens?: number;

    /** Total cost in USD (if available) */
    estimatedCost?: number;

    /** Any additional context or notes */
    notes?: string;
  };
}

/**
 * Zod schema for Summary validation
 */
export const SummarySchema = z.object({
  id: z.string().min(1, "Summary ID is required"),
  bookId: z.string().min(1, "Book ID is required"),
  bookTitle: z.string().min(1, "Book title is required"),
  bookAuthors: z.array(z.string()).min(1, "At least one author is required"),
  summaryType: z.enum(["concise", "detailed", "analysis", "practical"]),
  content: z.string().min(1, "Summary content is required"),
  status: z.enum(["pending", "generating", "completed", "failed"]),
  createdAt: z.date(),
  updatedAt: z.date(),
  generationTime: z.number().int().positive().optional(),
  wordCount: z.number().int().min(0),
  readingTime: z.number().min(0),
  aiModel: z.string().min(1, "AI model is required"),
  promptVersion: z.string().min(1, "Prompt version is required"),
  errorMessage: z.string().optional(),
  metadata: z
    .object({
      bookDataSource: z.enum(["google-books", "open-library"]),
      hadBookDescription: z.boolean(),
      promptTokens: z.number().int().positive().optional(),
      completionTokens: z.number().int().positive().optional(),
      estimatedCost: z.number().positive().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

/**
 * Input for creating a new summary
 */
export interface CreateSummaryInput {
  /** Book to generate summary for */
  book: Book;

  /** Type of summary to generate */
  summaryType: SummaryType;

  /** User ID if authenticated (for analytics) */
  userId?: string;
}

export const CreateSummaryInputSchema = z.object({
  book: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    authors: z.array(z.string()),
    description: z.string().optional(),
    source: z.enum(["google-books", "open-library"]),
    originalId: z.string().min(1),
  }),
  summaryType: z.enum(["concise", "detailed", "analysis", "practical"]),
  userId: z.string().optional(),
});

/**
 * Summary generation parameters for AI service
 */
export interface SummaryGenerationParams {
  /** Book information to summarize */
  book: {
    title: string;
    authors: string[];
    description?: string;
    categories?: string[];
    publishedDate?: string;
    pageCount?: number;
  };

  /** Type of summary to generate */
  summaryType: SummaryType;

  /** Additional context or instructions */
  additionalContext?: string;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** AI model to use */
  model?: string;
}

export const SummaryGenerationParamsSchema = z.object({
  book: z.object({
    title: z.string().min(1),
    authors: z.array(z.string()).min(1),
    description: z.string().optional(),
    categories: z.array(z.string()).optional(),
    publishedDate: z.string().optional(),
    pageCount: z.number().int().positive().optional(),
  }),
  summaryType: z.enum(["concise", "detailed", "analysis", "practical"]),
  additionalContext: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  model: z.string().optional(),
});

/**
 * Summary cache key helpers
 */
export const createSummaryCacheKey = (
  bookId: string,
  summaryType: SummaryType
): string => {
  return `summary:${bookId}:${summaryType}`;
};

/**
 * Reading time calculator
 * Assumes average reading speed of 200-250 words per minute
 */
export const calculateReadingTime = (wordCount: number): number => {
  const wordsPerMinute = 225; // Average reading speed
  return Math.ceil(wordCount / wordsPerMinute);
};

/**
 * Word count calculator for text content
 */
export const calculateWordCount = (content: string): number => {
  return content
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
};

/**
 * Validation helper functions
 */

/** Safely parse and validate a Summary object */
export const parseSummary = (data: unknown): Summary | null => {
  try {
    return SummarySchema.parse(data);
  } catch (error) {
    console.error("Summary validation failed:", error);
    return null;
  }
};

/** Safely parse and validate CreateSummaryInput */
export const parseCreateSummaryInput = (
  data: unknown
): CreateSummaryInput | null => {
  try {
    return CreateSummaryInputSchema.parse(data);
  } catch (error) {
    console.error("CreateSummaryInput validation failed:", error);
    return null;
  }
};

/** Safely parse and validate SummaryGenerationParams */
export const parseSummaryGenerationParams = (
  data: unknown
): SummaryGenerationParams | null => {
  try {
    return SummaryGenerationParamsSchema.parse(data);
  } catch (error) {
    console.error("SummaryGenerationParams validation failed:", error);
    return null;
  }
};

/**
 * Type guards for runtime type checking
 */

export const isSummary = (obj: unknown): obj is Summary => {
  return SummarySchema.safeParse(obj).success;
};

export const isCreateSummaryInput = (
  obj: unknown
): obj is CreateSummaryInput => {
  return CreateSummaryInputSchema.safeParse(obj).success;
};

export const isSummaryGenerationParams = (
  obj: unknown
): obj is SummaryGenerationParams => {
  return SummaryGenerationParamsSchema.safeParse(obj).success;
};

export const isSummaryType = (obj: unknown): obj is SummaryType => {
  return (
    typeof obj === "string" &&
    Object.values(SUMMARY_TYPES).includes(obj as SummaryType)
  );
};

/**
 * Summary utility functions
 */

/** Get summary type description for UI */
export const getSummaryTypeDescription = (type: SummaryType) => {
  return SUMMARY_TYPE_DESCRIPTIONS[type];
};

/** Get all available summary types */
export const getAllSummaryTypes = (): SummaryType[] => {
  return Object.values(SUMMARY_TYPES);
};

/** Check if a summary type is valid */
export const isValidSummaryType = (type: string): type is SummaryType => {
  return Object.values(SUMMARY_TYPES).includes(type as SummaryType);
};

/**
 * Type exports for external use
 */

export { type SummaryGenerationResult, type SummaryGenerationOptions };
export type InferredSummary = z.infer<typeof SummarySchema>;
export type InferredCreateSummaryInput = z.infer<
  typeof CreateSummaryInputSchema
>;
export type InferredSummaryGenerationParams = z.infer<
  typeof SummaryGenerationParamsSchema
>;
