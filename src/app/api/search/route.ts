/**
 * Search API Route Handler
 *
 * Handles POST /api/search requests with:
 * - Input validation and sanitization
 * - Rate limiting
 * - Dual-mode search orchestration
 * - Asynchronous preference updates
 * - Comprehensive error handling
 */

import { NextRequest, NextResponse } from "next/server";
import { getSearchOrchestrator } from "../../../services/searchOrchestrator";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { SearchRequest, SearchResponse } from "../../../types";

// Rate limiting configuration
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator: (req: NextRequest) => string;
}

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map<
  string,
  { requests: number; resetTime: number }
>();

class RateLimiter {
  constructor(private config: RateLimitConfig) {}

  async checkLimit(
    req: NextRequest
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.config.keyGenerator(req);
    const now = Date.now();

    // Clean up expired entries
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

// Initialize rate limiter
const rateLimiter = new RateLimiter({
  maxRequests: 30, // 30 requests per window
  windowMs: 60 * 1000, // 1 minute
  keyGenerator: (req) => {
    // Use IP address or user ID for rate limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0]
      : req.headers.get("x-real-ip") || "unknown";
    return `search:${ip}`;
  },
});

// Input validation schema
interface SearchRequestBody {
  query: string;
  mode: "searchMode" | "promptMode";
  userId?: string;
  maxResults?: number;
  useCache?: boolean;
}

function validateSearchRequest(body: any): {
  valid: boolean;
  data?: SearchRequestBody;
  errors?: string[];
} {
  const errors: string[] = [];

  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Request body must be a JSON object"] };
  }

  // Validate query
  if (!body.query || typeof body.query !== "string") {
    errors.push("Query is required and must be a string");
  } else if (body.query.trim().length === 0) {
    errors.push("Query cannot be empty");
  } else if (body.query.length > 500) {
    errors.push("Query must be 500 characters or less");
  }

  // Validate mode
  if (
    !body.mode ||
    (body.mode !== "searchMode" && body.mode !== "promptMode")
  ) {
    errors.push(
      "Mode is required and must be either 'searchMode' or 'promptMode'"
    );
  }

  // Validate optional fields
  if (body.userId !== undefined && typeof body.userId !== "string") {
    errors.push("UserId must be a string if provided");
  }

  if (body.maxResults !== undefined) {
    if (
      typeof body.maxResults !== "number" ||
      body.maxResults < 1 ||
      body.maxResults > 50
    ) {
      errors.push("MaxResults must be a number between 1 and 50");
    }
  }

  if (body.useCache !== undefined && typeof body.useCache !== "boolean") {
    errors.push("UseCache must be a boolean if provided");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      query: body.query.trim(),
      mode: body.mode,
      userId: body.userId,
      maxResults: body.maxResults || 20,
      useCache: body.useCache !== false, // Default to true
    },
  };
}

// Initialize Convex client
function getConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
  }
  return new ConvexHttpClient(convexUrl);
}

// Main POST handler
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Check rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(request);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          message: "Too many requests. Please try again later.",
          cached: false,
          processingTime: 0,
        } satisfies SearchResponse,
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "30",
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
          cached: false,
          processingTime: 0,
        } satisfies SearchResponse,
        {
          status: 400,
          headers: {
            "X-RateLimit-Limit": "30",
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          },
        }
      );
    }

    const validation = validateSearchRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          message: validation.errors?.join(", ") || "Invalid request",
          cached: false,
          processingTime: 0,
        } satisfies SearchResponse,
        {
          status: 400,
          headers: {
            "X-RateLimit-Limit": "30",
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          },
        }
      );
    }

    const requestData = validation.data!;

    // Execute search
    const searchOrchestrator = getSearchOrchestrator();
    const searchRequest: SearchRequest = {
      query: requestData.query,
      mode: requestData.mode,
      userId: requestData.userId,
      maxResults: requestData.maxResults,
      useCache: requestData.useCache,
    };

    const searchResult = await searchOrchestrator.search(searchRequest);

    // Record search activity asynchronously (fire and forget)
    if (requestData.userId) {
      recordSearchActivity(requestData, searchResult).catch((error) => {
        console.error("Failed to record search activity:", error);
        // Don't fail the request if logging fails
      });
    }

    // Return successful response
    const response: SearchResponse = {
      success: true,
      data: searchResult,
      cached: searchResult.source === "cache",
      processingTime: Date.now() - startTime,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "X-RateLimit-Limit": "30",
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        "Cache-Control":
          searchResult.source === "cache" ? "public, max-age=300" : "no-cache",
      },
    });
  } catch (error) {
    console.error("Search API error:", error);

    // Return error response
    const response: SearchResponse = {
      success: false,
      error: "Internal server error",
      message: "An unexpected error occurred while processing your search",
      cached: false,
      processingTime: Date.now() - startTime,
    };

    return NextResponse.json(response, {
      status: 500,
      headers: {
        "X-RateLimit-Limit": "30",
        "X-RateLimit-Remaining": rateLimiter ? "0" : "30", // Fallback if rate limiter fails
      },
    });
  }
}

// Async function to record search activity
async function recordSearchActivity(
  requestData: SearchRequestBody,
  searchResult: any
): Promise<void> {
  try {
    if (!requestData.userId) return;

    const convex = getConvexClient();

    // TODO: Use api.preferences.recordSearchActivity after Convex deployment
    // For now, we'll implement a fallback or skip the recording
    console.log("Search activity recorded (placeholder):", {
      userId: requestData.userId,
      searchTerm: requestData.query,
      mode: requestData.mode,
      resultCount: searchResult.totalResults || 0,
      searchTime: searchResult.searchTime || 0,
      source: searchResult.source || "unknown",
      cached: searchResult.source === "cache",
    });
  } catch (error) {
    console.error("Failed to record search activity:", error);
    // Don't throw - this is fire-and-forget
  }
}

// Handle unsupported methods
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed",
      message: "This endpoint only supports POST requests",
    },
    { status: 405 }
  );
}

export async function PUT(): Promise<NextResponse> {
  return GET();
}

export async function DELETE(): Promise<NextResponse> {
  return GET();
}

export async function PATCH(): Promise<NextResponse> {
  return GET();
}
