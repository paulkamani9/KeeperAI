/**
 * Book Summaries API Route Handler
 *
 * Handles requests for /api/summaries with:
 * - POST: Generate new book summary (authenticated users only)
 * - GET: Retrieve existing summaries for a user
 * - PUT: Regenerate summary with custom prompt
 * - DELETE: Remove a summary
 * - Redis caching and Convex storage
 * - Comprehensive error handling and rate limiting
 */

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { auth } from "@clerk/nextjs/server";
import {
  getSummaryEngine,
  SummaryRequest,
  SummaryResponse,
} from "../../../services/summaryEngine";
import { monitoring } from "../../../services/monitoring";
import { api } from "../../../../convex/_generated/api";

interface CreateSummaryRequest {
  bookId: string;
  title: string;
  authors: string[];
  description?: string;
  genres?: string[];
  mode: "concise" | "detailed" | "analysis" | "practical";
}

interface RegenerateSummaryRequest extends CreateSummaryRequest {
  regeneratePrompt: string;
}

interface GetSummariesRequest {
  bookId?: string;
  mode?: "brief" | "detailed" | "analysis";
  limit?: number;
  offset?: number;
}

interface DeleteSummaryRequest {
  bookId: string;
  mode?: "brief" | "detailed" | "analysis";
}

interface SummaryAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  processingTime?: number;
}

// Rate limiting configuration
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator: (req: NextRequest, userId: string, action: string) => string;
}

// In-memory rate limiting store
const rateLimitStore = new Map<
  string,
  { requests: number; resetTime: number }
>();

class RateLimiter {
  constructor(private config: RateLimitConfig) {}

  async checkLimit(
    req: NextRequest,
    userId: string,
    action: string = "general"
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.config.keyGenerator(req, userId, action);
    const now = Date.now();

    // Clean up expired entries periodically
    if (rateLimitStore.size > 1000) {
      for (const [k, v] of rateLimitStore.entries()) {
        if (v.resetTime < now) {
          rateLimitStore.delete(k);
        }
      }
    }

    const current = rateLimitStore.get(key);

    if (!current || current.resetTime < now) {
      // Reset window
      const resetTime = now + this.config.windowMs;
      rateLimitStore.set(key, { requests: 1, resetTime });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime,
      };
    }

    if (current.requests >= this.config.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: current.resetTime };
    }

    current.requests++;
    rateLimitStore.set(key, current);
    return {
      allowed: true,
      remaining: this.config.maxRequests - current.requests,
      resetTime: current.resetTime,
    };
  }
}

// Initialize rate limiter (more restrictive for AI operations)
const rateLimiter = new RateLimiter({
  maxRequests: 5, // 5 requests per window for AI operations
  windowMs: 60 * 1000, // 1 minute
  keyGenerator: (req, userId, action) => `summaries:${userId}:${action}`,
});

// Initialize Convex client
function getConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
  }
  return new ConvexHttpClient(convexUrl);
}

// Validation functions
function validateCreateSummaryRequest(body: any): {
  valid: boolean;
  data?: CreateSummaryRequest;
  errors?: string[];
} {
  const errors: string[] = [];

  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Request body must be a JSON object"] };
  }

  // Validate required fields
  if (!body.bookId || typeof body.bookId !== "string") {
    errors.push("bookId is required and must be a string");
  }

  if (!body.title || typeof body.title !== "string") {
    errors.push("title is required and must be a string");
  }

  if (
    !body.authors ||
    !Array.isArray(body.authors) ||
    body.authors.length === 0
  ) {
    errors.push("authors is required and must be a non-empty array of strings");
  }

  if (
    !body.mode ||
    !["concise", "detailed", "analysis", "practical"].includes(body.mode)
  ) {
    errors.push(
      "mode is required and must be one of: concise, detailed, analysis, practical"
    );
  }

  // Validate optional fields
  if (body.description !== undefined && typeof body.description !== "string") {
    errors.push("description must be a string if provided");
  }

  if (
    body.genres !== undefined &&
    (!Array.isArray(body.genres) ||
      !body.genres.every((g: any) => typeof g === "string"))
  ) {
    errors.push("genres must be an array of strings if provided");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      bookId: body.bookId.trim(),
      title: body.title.trim(),
      authors: body.authors
        .map((a: string) => a.trim())
        .filter((a: string) => a.length > 0),
      description: body.description?.trim(),
      genres: body.genres
        ?.map((g: string) => g.trim())
        .filter((g: string) => g.length > 0),
      mode: body.mode,
    },
  };
}

function validateRegenerateSummaryRequest(body: any): {
  valid: boolean;
  data?: RegenerateSummaryRequest;
  errors?: string[];
} {
  const createValidation = validateCreateSummaryRequest(body);
  if (!createValidation.valid) {
    return { valid: false, errors: createValidation.errors };
  }

  const errors: string[] = [];

  if (!body.regeneratePrompt || typeof body.regeneratePrompt !== "string") {
    errors.push("regeneratePrompt is required and must be a string");
  } else if (body.regeneratePrompt.trim().length < 10) {
    errors.push("regeneratePrompt must be at least 10 characters long");
  } else if (body.regeneratePrompt.length > 500) {
    errors.push("regeneratePrompt must be 500 characters or less");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      ...createValidation.data!,
      regeneratePrompt: body.regeneratePrompt.trim(),
    },
  };
}

// POST handler - Create new summary
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Authentication required to generate summaries",
        } satisfies SummaryAPIResponse,
        { status: 401 }
      );
    }

    // Check rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(
      request,
      userId,
      "create"
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          message: "Too many summary requests. Please try again later.",
        } satisfies SummaryAPIResponse,
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(
              rateLimitResult.resetTime
            ).toISOString(),
            "Retry-After": Math.ceil(
              (rateLimitResult.resetTime - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    // Parse and validate request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON",
          message: "Request body must be valid JSON",
        } satisfies SummaryAPIResponse,
        { status: 400 }
      );
    }

    const validation = validateCreateSummaryRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          message: validation.errors?.join(", "),
        } satisfies SummaryAPIResponse,
        { status: 400 }
      );
    }

    const requestData = validation.data!;

    // Initialize services
    const convex = getConvexClient();
    const summaryEngine = getSummaryEngine();

    // Check if summary already exists
    const existingSummary = await convex.query(api.summaries.getSummary, {
      bookId: requestData.bookId,
      mode: requestData.mode,
    });

    if (existingSummary) {
      return NextResponse.json(
        {
          success: false,
          error: "Summary exists",
          message:
            "A summary already exists for this book and mode. Use PUT to regenerate.",
        } satisfies SummaryAPIResponse,
        { status: 409 }
      );
    }

    // Generate AI summary using new engine
    const summaryRequest: SummaryRequest = {
      bookId: requestData.bookId,
      title: requestData.title,
      authors: requestData.authors,
      description: requestData.description,
      genres: requestData.genres,
      mode: requestData.mode,
      userContext: {
        userId,
      },
    };

    const summaryResult = await summaryEngine.generateSummary(summaryRequest);

    // Save summary to Convex
    const summaryId = await convex.mutation(api.summaries.createSummary, {
      bookId: requestData.bookId,
      content: summaryResult.content,
      mode: requestData.mode,
    });

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: {
          summaryId,
          summary: summaryResult.content,
          mode: requestData.mode,
          bookId: requestData.bookId,
          confidence: summaryResult.confidence,
          wordCount: summaryResult.wordCount,
          cached: summaryResult.cached,
          keyPoints: summaryResult.keyPoints,
          estimatedReadTime: summaryResult.estimatedReadTime,
        },
        processingTime: Date.now() - startTime,
      } satisfies SummaryAPIResponse,
      {
        status: 201,
        headers: {
          "X-RateLimit-Limit": "5",
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Create summary API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "An unexpected error occurred while generating the summary",
        processingTime: Date.now() - startTime,
      } satisfies SummaryAPIResponse,
      { status: 500 }
    );
  }
}

// GET handler - Retrieve summaries
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Authentication required to view summaries",
        } satisfies SummaryAPIResponse,
        { status: 401 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const bookId = url.searchParams.get("bookId");
    const mode = url.searchParams.get("mode") as
      | "brief"
      | "detailed"
      | "analysis"
      | null;
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Validate parameters
    if (
      mode &&
      !["brief", "concise", "detailed", "analysis", "practical"].includes(mode)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid mode",
          message:
            "Mode must be one of: brief, concise, detailed, analysis, practical",
        } satisfies SummaryAPIResponse,
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 50) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid limit",
          message: "Limit must be between 1 and 50",
        } satisfies SummaryAPIResponse,
        { status: 400 }
      );
    }

    // Initialize Convex client
    const convex = getConvexClient();

    let summaries;

    if (bookId) {
      if (mode) {
        // Get specific summary
        const summary = await convex.query(api.summaries.getSummary, {
          bookId,
          mode,
        });
        summaries = summary ? [summary] : [];
      } else {
        // Get all summaries for a book
        summaries = await convex.query(api.summaries.getSummariesForBook, {
          bookId,
        });
      }
    } else {
      // Get all user summaries with pagination
      summaries = await convex.query(api.summaries.getUserSummaries, {
        limit,
        offset,
      });
    }

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: {
          summaries,
          count: summaries.length,
          limit,
          offset,
        },
        processingTime: Date.now() - startTime,
      } satisfies SummaryAPIResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error("Get summaries API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "An unexpected error occurred while retrieving summaries",
        processingTime: Date.now() - startTime,
      } satisfies SummaryAPIResponse,
      { status: 500 }
    );
  }
}

// PUT handler - Regenerate summary with custom prompt
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Authentication required to regenerate summaries",
        } satisfies SummaryAPIResponse,
        { status: 401 }
      );
    }

    // Check rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(
      request,
      userId,
      "regenerate"
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          message: "Too many regeneration requests. Please try again later.",
        } satisfies SummaryAPIResponse,
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(
              rateLimitResult.resetTime
            ).toISOString(),
          },
        }
      );
    }

    // Parse and validate request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON",
          message: "Request body must be valid JSON",
        } satisfies SummaryAPIResponse,
        { status: 400 }
      );
    }

    const validation = validateRegenerateSummaryRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          message: validation.errors?.join(", "),
        } satisfies SummaryAPIResponse,
        { status: 400 }
      );
    }

    const requestData = validation.data!;

    // Initialize services
    const convex = getConvexClient();
    const summaryEngine = getSummaryEngine();

    // Generate AI summary with custom prompt
    const summaryRequest: SummaryRequest = {
      bookId: requestData.bookId,
      title: requestData.title,
      authors: requestData.authors,
      description: requestData.description,
      genres: requestData.genres,
      mode: requestData.mode,
      customPrompt: requestData.regeneratePrompt,
      userContext: {
        userId,
      },
    };

    const summaryResult = await summaryEngine.generateSummary(summaryRequest);

    // Update or create summary in Convex
    const summaryId = await convex.mutation(api.summaries.upsertSummary, {
      bookId: requestData.bookId,
      content: summaryResult.content,
      mode: requestData.mode,
    });

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: {
          summaryId,
          summary: summaryResult.content,
          mode: requestData.mode,
          bookId: requestData.bookId,
          confidence: summaryResult.confidence,
          wordCount: summaryResult.wordCount,
          cached: summaryResult.cached,
          keyPoints: summaryResult.keyPoints,
          estimatedReadTime: summaryResult.estimatedReadTime,
          regenerated: true,
        },
        processingTime: Date.now() - startTime,
      } satisfies SummaryAPIResponse,
      {
        status: 200,
        headers: {
          "X-RateLimit-Limit": "5",
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Regenerate summary API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "An unexpected error occurred while regenerating the summary",
        processingTime: Date.now() - startTime,
      } satisfies SummaryAPIResponse,
      { status: 500 }
    );
  }
}

// DELETE handler - Remove summary
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Authentication required to delete summaries",
        } satisfies SummaryAPIResponse,
        { status: 401 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const bookId = url.searchParams.get("bookId");
    const mode = url.searchParams.get("mode") as
      | "brief"
      | "detailed"
      | "analysis"
      | null;

    if (!bookId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing bookId",
          message: "bookId parameter is required",
        } satisfies SummaryAPIResponse,
        { status: 400 }
      );
    }

    if (
      mode &&
      !["brief", "concise", "detailed", "analysis", "practical"].includes(mode)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid mode",
          message:
            "Mode must be one of: brief, concise, detailed, analysis, practical",
        } satisfies SummaryAPIResponse,
        { status: 400 }
      );
    }

    // Initialize Convex client
    const convex = getConvexClient();

    // Delete summary(ies)
    const deletedCount = await convex.mutation(api.summaries.deleteSummary, {
      bookId,
      mode: mode || undefined,
    });

    if (deletedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Summary not found",
          message: "No summary found matching the specified criteria",
        } satisfies SummaryAPIResponse,
        { status: 404 }
      );
    }

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: {
          deletedCount,
          bookId,
          mode,
        },
        processingTime: Date.now() - startTime,
      } satisfies SummaryAPIResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete summary API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "An unexpected error occurred while deleting the summary",
        processingTime: Date.now() - startTime,
      } satisfies SummaryAPIResponse,
      { status: 500 }
    );
  }
}
