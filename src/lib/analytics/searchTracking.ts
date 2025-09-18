/**
 * Analytics client for tracking search behavior
 *
 * Provides a clean interface for logging search analytics
 * while maintaining user privacy and performance.
 */

import { ConvexReactClient } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface SearchAnalyticsParams {
  /** Search query string */
  query: string;
  /** Number of results returned */
  resultCount: number;
  /** Time taken for search in milliseconds */
  searchTime: number;
  /** Data source used */
  source: "google-books" | "open-library" | "combined" | "cache";
  /** Whether result came from cache */
  cached: boolean;
  /** User ID if authenticated */
  userId?: Id<"users">;
}

interface UserActivityParams {
  /** Type of user activity */
  activityType: "search" | "favorite" | "comment";
  /** Search term for search activities */
  searchTerm?: string;
  /** Book title for book-related activities */
  bookTitle?: string;
  /** Book author for book-related activities */
  bookAuthor?: string;
  /** Genre if available */
  genre?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** User ID if authenticated */
  userId?: Id<"users">;
}

/**
 * Analytics service for tracking search behavior
 *
 * Why this architecture:
 * - Centralized analytics logging
 * - Graceful degradation if analytics fail
 * - Privacy-first approach (optional user ID)
 * - Performance-aware (fire-and-forget logging)
 */
export class SearchAnalyticsService {
  private convex: ConvexReactClient;

  constructor(convex: ConvexReactClient) {
    this.convex = convex;
  }

  /**
   * Log a search query for analytics
   *
   * @param params Search analytics parameters
   * @returns Promise that resolves when logged (or immediately on error)
   */
  async logSearchQuery(params: SearchAnalyticsParams): Promise<void> {
    try {
      // Don't log empty queries
      if (!params.query.trim()) return;

      // Fire-and-forget logging to avoid blocking the UI
      this.convex
        .mutation(api.analytics.logSearchQuery, {
          query: params.query.trim(),
          mode: "searchMode" as const,
          userId: params.userId,
          resultCount: params.resultCount,
          searchTime: params.searchTime,
          source: params.source,
          cached: params.cached,
        })
        .catch((error: Error) => {
          // Silently handle analytics errors to not disrupt user experience
          if (process.env.NODE_ENV === "development") {
            console.warn("Analytics logging failed:", error);
          }
        });
    } catch (error) {
      // Silently handle errors - analytics shouldn't break the app
      if (process.env.NODE_ENV === "development") {
        console.warn("Search analytics error:", error);
      }
    }
  }

  /**
   * Log user activity for preference learning
   *
   * @param params User activity parameters
   * @returns Promise that resolves when logged (or immediately on error)
   */
  async logUserActivity(params: UserActivityParams): Promise<void> {
    try {
      // Only log if user is authenticated
      if (!params.userId) return;

      // Fire-and-forget logging
      this.convex
        .mutation(api.analytics.logUserActivity, {
          userId: params.userId,
          activityType: params.activityType,
          searchTerm: params.searchTerm,
          bookTitle: params.bookTitle,
          bookAuthor: params.bookAuthor,
          genre: params.genre,
          metadata: params.metadata,
        })
        .catch((error: Error) => {
          if (process.env.NODE_ENV === "development") {
            console.warn("User activity logging failed:", error);
          }
        });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("User activity analytics error:", error);
      }
    }
  }

  /**
   * Create a search timing helper
   *
   * @returns Object with start() and end() methods for timing searches
   */
  createSearchTimer() {
    let startTime: number;

    return {
      start: () => {
        startTime = performance.now();
      },
      end: (): number => {
        return Math.round(performance.now() - startTime);
      },
    };
  }
}

/**
 * Factory function to create analytics service
 */
export function createSearchAnalyticsService(
  convex: ConvexReactClient
): SearchAnalyticsService {
  return new SearchAnalyticsService(convex);
}

// Export types for external use
export type { SearchAnalyticsParams, UserActivityParams };
