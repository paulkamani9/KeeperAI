/**
 * Home Recommendations API Route Handler
 *
 * Handles GET /api/home-recommendations requests with:
 * - User authentication via Clerk
 * - GPT-based recommendations using user preferences
 * - User favorites section
 * - Book metadata fetching from multiple APIs
 * - Redis caching for performance
 * - Comprehensive error handling
 */

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { auth } from "@clerk/nextjs/server";
import {
  getGPTRecommendationService,
  GPTRecommendationRequest,
} from "../../../services/gptRecommendationService";
import { getSearchOrchestrator } from "../../../services/searchOrchestrator";
import { getRedisService, CacheKeys, CacheTTL } from "../../../services/redis";
import { api } from "../../../../convex/_generated/api";
import { NormalizedBook, APIResponse, SearchRequest } from "../../../types";

interface HomeRecommendationRequest {
  maxRecommendations?: number;
  includeFavorites?: boolean;
  refresh?: boolean; // Force refresh cache
}

interface HomeRecommendationSection {
  title: string;
  books: NormalizedBook[];
  type: "favorites" | "gpt_recommendations" | "trending";
  cached: boolean;
  processingTime: number;
}

interface HomeRecommendationResponse {
  success: boolean;
  data?: {
    sections: HomeRecommendationSection[];
    totalBooks: number;
    processingTime: number;
    cached: boolean;
  };
  error?: string;
  message?: string;
}

// Rate limiting configuration (lighter for home page)
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator: (req: NextRequest, userId: string) => string;
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
    userId: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.config.keyGenerator(req, userId);
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

// Initialize rate limiter
const rateLimiter = new RateLimiter({
  maxRequests: 10, // 10 requests per window (generous for home page)
  windowMs: 60 * 1000, // 1 minute
  keyGenerator: (req, userId) => `home_recs:${userId}`,
});

// Initialize services
function getConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
  }
  return new ConvexHttpClient(convexUrl);
}

// Validate request parameters
function validateHomeRecommendationRequest(query: any): {
  valid: boolean;
  data?: HomeRecommendationRequest;
  errors?: string[];
} {
  const errors: string[] = [];
  const data: HomeRecommendationRequest = {};

  // Parse maxRecommendations
  if (query.maxRecommendations) {
    const max = parseInt(query.maxRecommendations);
    if (isNaN(max) || max < 1 || max > 50) {
      errors.push("maxRecommendations must be a number between 1 and 50");
    } else {
      data.maxRecommendations = max;
    }
  }

  // Parse includeFavorites
  if (query.includeFavorites !== undefined) {
    data.includeFavorites = query.includeFavorites === "true";
  }

  // Parse refresh flag
  if (query.refresh !== undefined) {
    data.refresh = query.refresh === "true";
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data };
}

// Main GET handler
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
          message: "Authentication required for home recommendations",
        } satisfies HomeRecommendationResponse,
        { status: 401 }
      );
    }

    // Check rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(request, userId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          message: "Too many requests. Please try again later.",
        } satisfies HomeRecommendationResponse,
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "10",
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
    const validation = validateHomeRecommendationRequest(query);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request parameters",
          message: validation.errors?.join(", "),
        } satisfies HomeRecommendationResponse,
        { status: 400 }
      );
    }

    const requestData = validation.data!;
    const maxRecommendations = requestData.maxRecommendations || 10;
    const includeFavorites = requestData.includeFavorites !== false; // Default true

    // Check cache first (unless refresh requested)
    const redis = getRedisService();
    const cacheKey = CacheKeys.gptRecommendations(userId, "home");

    if (!requestData.refresh) {
      const cached =
        await redis.get<HomeRecommendationResponse["data"]>(cacheKey);
      if (cached) {
        return NextResponse.json(
          {
            success: true,
            data: {
              ...cached,
              processingTime: Date.now() - startTime,
              cached: true,
            },
          } satisfies HomeRecommendationResponse,
          {
            status: 200,
            headers: {
              "X-RateLimit-Limit": "10",
              "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
              "Cache-Control": "public, max-age=1800", // 30 minutes
            },
          }
        );
      }
    }

    // Initialize Convex client
    const convex = getConvexClient();

    // Get user data and preferences
    const user = await convex.query(api.users.current);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
          message: "User profile not found. Please try signing in again.",
        } satisfies HomeRecommendationResponse,
        { status: 404 }
      );
    }

    const sections: HomeRecommendationSection[] = [];
    let totalBooks = 0;

    // Section 1: User Favorites (if requested)
    if (includeFavorites) {
      const favoritesStartTime = Date.now();
      try {
        const favorites = await convex.query(api.favorites.getFavorites);

        // Convert favorites to NormalizedBook format
        const favoriteBooks: NormalizedBook[] = favorites
          .slice(0, 10)
          .map((fav: any) => ({
            id: fav.bookId,
            title: fav.bookTitle,
            authors: [fav.bookAuthor],
            description: "",
            publishedDate: "",
            genres: fav.genre ? [fav.genre] : [],
            imageUrl: "",
            identifiers: {},
            source: "google" as const,
            score: 1.0,
            addedAt: fav.addedAt,
          }));

        if (favoriteBooks.length > 0) {
          sections.push({
            title: "Your Favorites",
            books: favoriteBooks,
            type: "favorites",
            cached: false,
            processingTime: Date.now() - favoritesStartTime,
          });
          totalBooks += favoriteBooks.length;
        }
      } catch (error) {
        console.error("Error fetching favorites:", error);
        // Don't fail the entire request if favorites fail
      }
    }

    // Section 2: GPT-based Recommendations
    const gptStartTime = Date.now();
    try {
      // Get user preferences and recent activities
      const preferences = await convex.query(api.users.getPreferences);

      const recentActivities = await convex.query(
        api.preferences.getRecentUserActivities,
        {
          userId: user._id,
          limit: 10,
        }
      );

      // Prepare GPT request
      const gptRequest: GPTRecommendationRequest = {
        type: "home",
        maxRecommendations,
        userPreferences: preferences,
        context: {
          recentActivities: recentActivities.map((activity: any) => ({
            type: activity.activityType,
            term: activity.searchTerm || activity.bookTitle || "unknown",
            timestamp: activity.timestamp,
          })),
        },
      };

      // Generate GPT recommendations
      const gptService = getGPTRecommendationService();
      const gptResult = await gptService.generateRecommendations(gptRequest);

      if (gptResult.recommendations.length > 0) {
        // Extract book titles for API search
        const bookTitles = gptService.extractBookTitles(
          gptResult.recommendations
        );

        // Fetch book metadata from external APIs
        const searchOrchestrator = getSearchOrchestrator();
        const bookMetadata: NormalizedBook[] = [];

        for (const title of bookTitles) {
          try {
            const searchRequest: SearchRequest = {
              query: title,
              mode: "searchMode",
              maxResults: 1,
              useCache: true,
            };

            const searchResult = await searchOrchestrator.search(searchRequest);
            if (searchResult.books && searchResult.books.length > 0) {
              bookMetadata.push(searchResult.books[0]);
            }
          } catch (error) {
            console.error(`Error fetching metadata for "${title}":`, error);
          }
        }

        // Match GPT recommendations with fetched metadata
        const recommendedBooks = gptService.matchRecommendationsWithBooks(
          gptResult.recommendations,
          bookMetadata
        );

        if (recommendedBooks.length > 0) {
          sections.push({
            title: "Recommended for You",
            books: recommendedBooks,
            type: "gpt_recommendations",
            cached: gptResult.cached,
            processingTime: Date.now() - gptStartTime,
          });
          totalBooks += recommendedBooks.length;
        }
      }
    } catch (error) {
      console.error("Error generating GPT recommendations:", error);
      // Continue without GPT recommendations
    }

    // Section 3: Trending/Popular Books (fallback if no personalized recommendations)
    if (sections.length === 0 || totalBooks < 5) {
      const trendingStartTime = Date.now();
      try {
        // Get popular queries to generate trending recommendations
        const popularQueries = await convex.query(
          api.preferences.getPopularQueries,
          {
            limit: 3,
            timeframe: 7 * 24 * 60 * 60 * 1000, // Last week
          }
        );

        if (popularQueries.length > 0) {
          const searchOrchestrator = getSearchOrchestrator();
          const trendingBooks: NormalizedBook[] = [];

          for (const queryData of popularQueries.slice(0, 2)) {
            try {
              const searchRequest: SearchRequest = {
                query: queryData.query,
                mode: "searchMode",
                maxResults: 3,
                useCache: true,
              };

              const searchResult =
                await searchOrchestrator.search(searchRequest);
              if (searchResult.books) {
                trendingBooks.push(...searchResult.books.slice(0, 3));
              }
            } catch (error) {
              console.error(
                `Error fetching trending books for "${queryData.query}":`,
                error
              );
            }
          }

          // Remove duplicates and limit results
          const uniqueTrending = trendingBooks
            .filter(
              (book, index, arr) =>
                arr.findIndex((b) => b.id === book.id) === index
            )
            .slice(0, 6);

          if (uniqueTrending.length > 0) {
            sections.push({
              title: "Trending Now",
              books: uniqueTrending,
              type: "trending",
              cached: false,
              processingTime: Date.now() - trendingStartTime,
            });
            totalBooks += uniqueTrending.length;
          }
        }
      } catch (error) {
        console.error("Error fetching trending books:", error);
      }
    }

    // Prepare response
    const responseData = {
      sections,
      totalBooks,
      processingTime: Date.now() - startTime,
      cached: false,
    };

    // Cache the result
    await redis.set(cacheKey, responseData, {
      ttl: CacheTTL.GPT_RECOMMENDATIONS, // 24 hours
    });

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: responseData,
      } satisfies HomeRecommendationResponse,
      {
        status: 200,
        headers: {
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "Cache-Control": "public, max-age=1800", // 30 minutes for client
        },
      }
    );
  } catch (error) {
    console.error("Home recommendations API error:", error);

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message:
          "An unexpected error occurred while generating recommendations",
      } satisfies HomeRecommendationResponse,
      {
        status: 500,
        headers: {
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": rateLimiter ? "0" : "10",
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
