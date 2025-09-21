/**
 * Summary Analytics Tracking Service
 *
 * Client-side service for tracking summary generation analytics
 * and performance metrics. Integrates with Convex backend.
 */

import { ConvexReactClient } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import type { Book } from "../../types/book";
import type { SummaryType, Summary } from "../../types/summary";
import type { SummaryGenerationResult } from "@/types/summary";

/**
 * Parameters for tracking summary generation
 */
interface SummaryGenerationTrackingParams {
  /** Book that was summarized */
  book: Book;

  /** Type of summary generated */
  summaryType: SummaryType;

  /** Generation result (success or failure) */
  result: SummaryGenerationResult | { error: Error; generationTime: number };

  /** Whether result came from cache */
  cacheHit: boolean;

  /** User ID if authenticated */
  userId?: Id<"users">;
}

/**
 * Analytics metrics for dashboard/debugging
 */
interface SummaryAnalyticsMetrics {
  totalGenerations: number;
  successRate: number;
  avgGenerationTime: number;
  cacheHitRate: number;
  totalCost: number;
  popularSummaryTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  popularBooks: Array<{
    title: string;
    count: number;
  }>;
  modelBreakdown: Record<string, number>;
  errorBreakdown: Record<string, number>;
}

/**
 * Analytics service for tracking summary generation behavior
 *
 * Why this architecture:
 * - Centralized analytics tracking
 * - Graceful degradation if analytics fail
 * - Performance-aware (fire-and-forget logging)
 * - Privacy-first approach (optional user ID)
 * - Rich metrics for optimization and debugging
 */
export class SummaryAnalyticsService {
  private convex: ConvexReactClient;
  private enableTracking: boolean;

  constructor(convex: ConvexReactClient, enableTracking: boolean = true) {
    this.convex = convex;
    this.enableTracking = enableTracking;
  }

  /**
   * Track a summary generation attempt (success or failure)
   *
   * @param params Summary generation tracking parameters
   * @returns Promise that resolves when logged (or immediately on error)
   */
  async trackSummaryGeneration(
    params: SummaryGenerationTrackingParams
  ): Promise<void> {
    if (!this.enableTracking) return;

    try {
      const isError = "error" in params.result;

      // Extract error information if generation failed
      let errorType: string | undefined;
      let errorMessage: string | undefined;

      if (isError) {
        const errorResult = params.result as {
          error: Error;
          generationTime: number;
        };
        errorType = this.categorizeError(errorResult.error);
        errorMessage = errorResult.error.message;
      }

      // Extract generation result data
      const resultData = isError
        ? null
        : (params.result as SummaryGenerationResult);

      // Fire-and-forget logging to avoid blocking the UI
      this.convex
        .mutation(api.analytics.logSummaryGeneration, {
          bookId: params.book.id,
          summaryType: params.summaryType,
          userId: params.userId,
          generationTime: isError
            ? (params.result as { error: Error; generationTime: number })
                .generationTime
            : resultData!.generationTime,
          success: !isError,
          errorType,
          errorMessage,
          aiModel: isError ? "unknown" : resultData!.aiModel,
          promptVersion: isError ? "unknown" : resultData!.promptVersion,
          tokenUsage: isError
            ? undefined
            : resultData!.usage
              ? {
                  promptTokens: resultData!.usage.promptTokens,
                  completionTokens: resultData!.usage.completionTokens,
                  totalTokens: resultData!.usage.totalTokens,
                  estimatedCost: resultData!.usage.estimatedCost,
                }
              : undefined,
          cacheHit: params.cacheHit,
          bookMetadata: {
            title: params.book.title,
            authors: params.book.authors,
            source: params.book.source,
            hadDescription: Boolean(params.book.description),
          },
        })
        .catch((error: Error) => {
          // Silently handle analytics errors to not disrupt user experience
          if (process.env.NODE_ENV === "development") {
            console.warn("Summary analytics logging failed:", error);
          }
        });
    } catch (error) {
      // Silently handle errors - analytics shouldn't break the app
      if (process.env.NODE_ENV === "development") {
        console.warn("Summary analytics error:", error);
      }
    }
  }

  /**
   * Track user activity related to summaries
   *
   * @param activityType Type of activity (viewing, sharing, etc.)
   * @param summary Summary being interacted with
   * @param userId User performing the activity
   * @param metadata Additional context
   */
  async trackSummaryActivity(
    activityType: "view" | "share" | "save" | "rate",
    summary: Pick<Summary, "bookId" | "summaryType">,
    userId?: Id<"users">,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!this.enableTracking || !userId) return;

    try {
      // Track as user activity for preference learning
      this.convex
        .mutation(api.analytics.logUserActivity, {
          userId,
          activityType: "favorite", // Map to existing activity type
          searchTerm: undefined,
          bookTitle: undefined, // We don't have book title in summary object
          bookAuthor: undefined,
          genre: undefined,
          metadata: {
            summaryActivity: activityType,
            summaryType: summary.summaryType,
            bookId: summary.bookId,
            ...metadata,
          },
        })
        .catch((error: Error) => {
          if (process.env.NODE_ENV === "development") {
            console.warn("Summary activity logging failed:", error);
          }
        });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("Summary activity analytics error:", error);
      }
    }
  }

  /**
   * Get summary generation metrics for dashboard/debugging
   *
   * @param timeframe Timeframe in milliseconds (default: 24 hours)
   * @returns Summary analytics metrics
   */
  async getSummaryMetrics(
    timeframe?: number
  ): Promise<SummaryAnalyticsMetrics | null> {
    try {
      return await this.convex.query(api.analytics.getSummaryMetrics, {
        timeframe,
      });
    } catch (error) {
      console.error("Failed to fetch summary metrics:", error);
      return null;
    }
  }

  /**
   * Get popular books for summary generation
   *
   * @param limit Maximum number of books to return
   * @param timeframe Timeframe in milliseconds
   * @returns Popular books with generation statistics
   */
  async getPopularSummaryBooks(limit?: number, timeframe?: number) {
    try {
      return await this.convex.query(api.analytics.getPopularSummaryBooks, {
        limit,
        timeframe,
      });
    } catch (error) {
      console.error("Failed to fetch popular summary books:", error);
      return [];
    }
  }

  /**
   * Get detailed analytics for a specific book
   *
   * @param bookId Book identifier
   * @param limit Maximum number of generations to return
   * @returns Book-specific analytics
   */
  async getBookAnalytics(bookId: string, limit?: number) {
    try {
      return await this.convex.query(api.analytics.getBookSummaryAnalytics, {
        bookId,
        limit,
      });
    } catch (error) {
      console.error("Failed to fetch book analytics:", error);
      return null;
    }
  }

  /**
   * Create a performance timer for measuring generation time
   *
   * @returns Object with start() and end() methods for timing
   */
  createPerformanceTimer() {
    let startTime: number;
    let endTime: number;

    return {
      start: () => {
        startTime = performance.now();
      },
      end: (): number => {
        endTime = performance.now();
        return Math.round(endTime - startTime);
      },
      getElapsed: (): number => {
        return Math.round(performance.now() - startTime);
      },
    };
  }

  /**
   * Enable or disable tracking
   *
   * @param enabled Whether to enable tracking
   */
  setTrackingEnabled(enabled: boolean): void {
    this.enableTracking = enabled;
  }

  /**
   * Check if tracking is enabled
   *
   * @returns Whether tracking is enabled
   */
  isTrackingEnabled(): boolean {
    return this.enableTracking;
  }

  /**
   * Categorize errors for analytics purposes
   *
   * @param error The error to categorize
   * @returns Error category string
   */
  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes("api key") || message.includes("authentication")) {
      return "auth_error";
    }

    if (message.includes("rate limit") || message.includes("quota")) {
      return "rate_limit";
    }

    if (message.includes("timeout") || message.includes("timed out")) {
      return "timeout";
    }

    if (message.includes("network") || message.includes("connection")) {
      return "network_error";
    }

    if (message.includes("validation") || message.includes("invalid")) {
      return "validation_error";
    }

    if (message.includes("openai") || message.includes("gpt")) {
      return "ai_service_error";
    }

    if (message.includes("cache")) {
      return "cache_error";
    }

    // Default category for unknown errors
    return "unknown_error";
  }
}

/**
 * Factory function to create summary analytics service
 */
export function createSummaryAnalyticsService(
  convex: ConvexReactClient,
  enableTracking: boolean = true
): SummaryAnalyticsService {
  return new SummaryAnalyticsService(convex, enableTracking);
}

/**
 * Helper function to track summary generation with error handling
 *
 * @param analyticsService The analytics service instance
 * @param params Tracking parameters
 */
export async function trackSummaryGenerationSafe(
  analyticsService: SummaryAnalyticsService,
  params: SummaryGenerationTrackingParams
): Promise<void> {
  try {
    await analyticsService.trackSummaryGeneration(params);
  } catch (error) {
    // Extra safety layer - never let analytics break the main flow
    if (process.env.NODE_ENV === "development") {
      console.warn("Safe summary tracking failed:", error);
    }
  }
}

// Export types for external use
export type { SummaryGenerationTrackingParams, SummaryAnalyticsMetrics };
