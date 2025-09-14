/**
 * Book Preview Recommendations API Route Handler
 *
 * Handles GET /api/book-recommendations/[bookId] requests with:
 * - Related book suggestions based on author, series, genre
 * - Book metadata fetching from multiple APIs
 * - Redis caching for performance
 * - Works for both authenticated and guest users
 * - Comprehensive error handling
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getGPTRecommendationService,
  GPTRecommendationRequest,
} from "../../../../services/gptRecommendationService";
import { getSearchOrchestrator } from "../../../../services/searchOrchestrator";
import {
  getRedisService,
  CacheKeys,
  CacheTTL,
} from "../../../../services/redis";
import { NormalizedBook, SearchRequest } from "../../../../types";

interface BookRecommendationRequest {
  maxRecommendations?: number;
  includeAuthorBooks?: boolean;
  includeGenreBooks?: boolean;
  excludeCurrentBook?: boolean;
}

interface BookRecommendationContext {
  title: string;
  authors: string[];
  genres: string[];
  description?: string;
  publishedDate?: string;
}

interface BookRecommendationResponse {
  success: boolean;
  data?: {
    recommendations: NormalizedBook[];
    context: BookRecommendationContext;
    strategies: string[];
    processingTime: number;
    cached: boolean;
  };
  error?: string;
  message?: string;
}

// Rate limiting configuration (generous for preview pages)
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator: (req: NextRequest, bookId: string, userId?: string) => string;
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
    bookId: string,
    userId?: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.config.keyGenerator(req, bookId, userId);
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

// Initialize rate limiter (generous for book previews)
const rateLimiter = new RateLimiter({
  maxRequests: 20, // 20 requests per window
  windowMs: 60 * 1000, // 1 minute
  keyGenerator: (req, bookId, userId) =>
    userId ? `book_recs:${userId}:${bookId}` : `book_recs:guest:${bookId}`,
});

// Validate request parameters
function validateBookRecommendationRequest(query: any): {
  valid: boolean;
  data?: BookRecommendationRequest;
  errors?: string[];
} {
  const errors: string[] = [];
  const data: BookRecommendationRequest = {};

  // Parse maxRecommendations
  if (query.maxRecommendations) {
    const max = parseInt(query.maxRecommendations);
    if (isNaN(max) || max < 1 || max > 20) {
      errors.push("maxRecommendations must be a number between 1 and 20");
    } else {
      data.maxRecommendations = max;
    }
  }

  // Parse boolean flags
  if (query.includeAuthorBooks !== undefined) {
    data.includeAuthorBooks = query.includeAuthorBooks === "true";
  }

  if (query.includeGenreBooks !== undefined) {
    data.includeGenreBooks = query.includeGenreBooks === "true";
  }

  if (query.excludeCurrentBook !== undefined) {
    data.excludeCurrentBook = query.excludeCurrentBook === "true";
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data };
}

// Extract book information from book ID or query parameters
async function extractBookContext(
  bookId: string,
  query: any
): Promise<BookRecommendationContext | null> {
  // If book metadata is provided in query params (for efficiency)
  if (query.title) {
    return {
      title: query.title,
      authors: query.authors
        ? query.authors.split(",").map((a: string) => a.trim())
        : [],
      genres: query.genres
        ? query.genres.split(",").map((g: string) => g.trim())
        : [],
      description: query.description || undefined,
      publishedDate: query.publishedDate || undefined,
    };
  }

  // Otherwise, try to fetch book metadata
  try {
    const searchOrchestrator = getSearchOrchestrator();
    const searchRequest: SearchRequest = {
      query: bookId,
      mode: "searchMode",
      maxResults: 1,
      useCache: true,
    };

    const searchResult = await searchOrchestrator.search(searchRequest);

    if (searchResult.books && searchResult.books.length > 0) {
      const book = searchResult.books[0];
      return {
        title: book.title,
        authors: book.authors,
        genres: (book as any).genres || [],
        description: book.description,
        publishedDate: book.publishedDate,
      };
    }
  } catch (error) {
    console.error(`Error fetching book context for "${bookId}":`, error);
  }

  return null;
}

// Generate recommendations using multiple strategies
async function generateRecommendations(
  context: BookRecommendationContext,
  request: BookRecommendationRequest,
  userId?: string
): Promise<{
  recommendations: NormalizedBook[];
  strategies: string[];
}> {
  const maxRecommendations = request.maxRecommendations || 10;
  const includeAuthorBooks = request.includeAuthorBooks !== false; // Default true
  const includeGenreBooks = request.includeGenreBooks !== false; // Default true

  const recommendations: NormalizedBook[] = [];
  const strategies: string[] = [];
  const searchOrchestrator = getSearchOrchestrator();

  // Strategy 1: Same author books
  if (includeAuthorBooks && context.authors.length > 0) {
    try {
      for (const author of context.authors.slice(0, 2)) {
        // Limit to first 2 authors
        const authorSearchRequest: SearchRequest = {
          query: `author:"${author}"`,
          mode: "searchMode",
          maxResults: 3,
          useCache: true,
        };

        const authorResult =
          await searchOrchestrator.search(authorSearchRequest);
        if (authorResult.books) {
          // Filter out the current book if requested
          const authorBooks = request.excludeCurrentBook
            ? authorResult.books.filter(
                (book) =>
                  !book.title
                    .toLowerCase()
                    .includes(context.title.toLowerCase())
              )
            : authorResult.books;

          recommendations.push(...authorBooks.slice(0, 3));
          if (authorBooks.length > 0) {
            strategies.push(`Books by ${author}`);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching author books:", error);
    }
  }

  // Strategy 2: Same genre books
  if (
    includeGenreBooks &&
    context.genres.length > 0 &&
    recommendations.length < maxRecommendations
  ) {
    try {
      for (const genre of context.genres.slice(0, 2)) {
        // Limit to first 2 genres
        const remaining = maxRecommendations - recommendations.length;
        if (remaining <= 0) break;

        const genreSearchRequest: SearchRequest = {
          query: `subject:"${genre}"`,
          mode: "searchMode",
          maxResults: Math.min(4, remaining + 1),
          useCache: true,
        };

        const genreResult = await searchOrchestrator.search(genreSearchRequest);
        if (genreResult.books) {
          // Filter out duplicates and current book
          const genreBooks = genreResult.books.filter((book) => {
            const isDuplicate = recommendations.some(
              (rec) => rec.id === book.id
            );
            const isCurrentBook =
              request.excludeCurrentBook &&
              book.title.toLowerCase().includes(context.title.toLowerCase());
            return !isDuplicate && !isCurrentBook;
          });

          recommendations.push(...genreBooks.slice(0, Math.min(3, remaining)));
          if (genreBooks.length > 0) {
            strategies.push(`${genre} books`);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching genre books:", error);
    }
  }

  // Strategy 3: AI-powered similar books (if we have room and previous strategies didn't yield enough)
  if (recommendations.length < maxRecommendations) {
    try {
      const remaining = maxRecommendations - recommendations.length;
      const gptService = getGPTRecommendationService();

      const gptRequest: GPTRecommendationRequest = {
        type: "similar",
        query: `${context.title} by ${context.authors.join(", ")}`,
        maxRecommendations: Math.min(remaining + 2, 5), // Get a few extra for filtering
        excludeBooks: recommendations.map((book) => book.title),
        context: {
          favoriteGenres: context.genres,
        },
      };

      const gptResult = await gptService.generateRecommendations(gptRequest);

      if (gptResult.recommendations.length > 0) {
        // Extract book titles for API search
        const bookTitles = gptService.extractBookTitles(
          gptResult.recommendations
        );

        // Fetch book metadata for GPT recommendations
        const gptBooks: NormalizedBook[] = [];
        for (const title of bookTitles.slice(0, remaining)) {
          try {
            const searchRequest: SearchRequest = {
              query: title,
              mode: "searchMode",
              maxResults: 1,
              useCache: true,
            };

            const searchResult = await searchOrchestrator.search(searchRequest);
            if (searchResult.books && searchResult.books.length > 0) {
              const book = searchResult.books[0];
              // Filter out duplicates
              const isDuplicate = recommendations.some(
                (rec) => rec.id === book.id
              );
              if (!isDuplicate) {
                gptBooks.push(book);
              }
            }
          } catch (error) {
            console.error(
              `Error fetching GPT recommended book "${title}":`,
              error
            );
          }
        }

        if (gptBooks.length > 0) {
          recommendations.push(...gptBooks);
          strategies.push("AI recommendations");
        }
      }
    } catch (error) {
      console.error("Error generating AI recommendations:", error);
    }
  }

  // Remove duplicates and limit to max recommendations
  const uniqueRecommendations = recommendations
    .filter(
      (book, index, arr) => arr.findIndex((b) => b.id === book.id) === index
    )
    .slice(0, maxRecommendations);

  return {
    recommendations: uniqueRecommendations,
    strategies,
  };
}

// Main GET handler
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const resolvedParams = await params;
  const bookId = resolvedParams.bookId;

  try {
    // Check authentication (optional for book recommendations)
    const { userId } = await auth();

    // Check rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(
      request,
      bookId,
      userId || undefined
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          message: "Too many requests for this book. Please try again later.",
        } satisfies BookRecommendationResponse,
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "20",
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

    // Parse and validate query parameters
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams);
    const validation = validateBookRecommendationRequest(query);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request parameters",
          message: validation.errors?.join(", "),
        } satisfies BookRecommendationResponse,
        { status: 400 }
      );
    }

    const requestData = validation.data!;

    // Check cache first
    const redis = getRedisService();
    const cacheKey = CacheKeys.bookMetadata(`recommendations:${bookId}`);

    const cached =
      await redis.get<BookRecommendationResponse["data"]>(cacheKey);
    if (cached) {
      return NextResponse.json(
        {
          success: true,
          data: {
            ...cached,
            processingTime: Date.now() - startTime,
            cached: true,
          },
        } satisfies BookRecommendationResponse,
        {
          status: 200,
          headers: {
            "X-RateLimit-Limit": "20",
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "Cache-Control": "public, max-age=3600", // 1 hour
          },
        }
      );
    }

    // Extract book context
    const context = await extractBookContext(bookId, query);
    if (!context) {
      return NextResponse.json(
        {
          success: false,
          error: "Book not found",
          message:
            "Could not find the specified book. Please provide book metadata or a valid book ID.",
        } satisfies BookRecommendationResponse,
        { status: 404 }
      );
    }

    // Generate recommendations
    const { recommendations, strategies } = await generateRecommendations(
      context,
      requestData,
      userId || undefined
    );

    // Prepare response data
    const responseData = {
      recommendations,
      context,
      strategies,
      processingTime: Date.now() - startTime,
      cached: false,
    };

    // Cache the result
    await redis.set(cacheKey, responseData, {
      ttl: CacheTTL.BOOK_METADATA, // 7 days
    });

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: responseData,
      } satisfies BookRecommendationResponse,
      {
        status: 200,
        headers: {
          "X-RateLimit-Limit": "20",
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "Cache-Control": "public, max-age=3600", // 1 hour for client
        },
      }
    );
  } catch (error) {
    console.error(
      `Book recommendations API error for bookId "${bookId}":`,
      error
    );

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message:
          "An unexpected error occurred while generating book recommendations",
      } satisfies BookRecommendationResponse,
      {
        status: 500,
        headers: {
          "X-RateLimit-Limit": "20",
          "X-RateLimit-Remaining": rateLimiter ? "0" : "20",
        },
      }
    );
  }
}

// Handle unsupported methods
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed",
      message: "This endpoint only supports GET requests",
    },
    { status: 405 }
  );
}

export async function PUT(): Promise<NextResponse> {
  return POST();
}

export async function DELETE(): Promise<NextResponse> {
  return POST();
}

export async function PATCH(): Promise<NextResponse> {
  return POST();
}
