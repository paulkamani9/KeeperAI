import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useConvex } from "convex/react";

import type { Book } from "../types/book";
import type {
  Summary,
  SummaryType,
  CreateSummaryInput,
} from "../types/summary";
import { createSummaryCacheKey } from "../types/summary";
import { createSummaryAnalyticsService } from "../lib/analytics/summaryTracking";
import { api } from "../../convex/_generated/api";

/**
 * Custom hook for AI summary generation using React Query
 *
 * Provides caching, loading states, and error handling for summary generation.
 * Integrates with Convex backend and analytics tracking.
 *
 * Why React Query:
 * - Automatic background refetching
 * - Intelligent caching with TTL
 * - Loading and error state management
 * - Deduplication of identical requests
 * - Optimistic updates support
 * - Integration with existing search patterns from Phase 1
 */

interface UseSummaryGenerationParams {
  /** Book to generate summary for */
  book: Book;
  /** Type of summary to generate */
  summaryType: SummaryType;
  /** Whether to enable automatic generation */
  enabled?: boolean;
  /** User ID if authenticated (for analytics) */
  userId?: string;
}

interface UseSummaryGenerationReturn {
  /** Generated summary data */
  summary: Summary | undefined;
  /** Whether the initial request is loading */
  isLoading: boolean;
  /** Whether any request is currently fetching */
  isFetching: boolean;
  /** Whether a summary is currently being generated */
  isGenerating: boolean;
  /** Error from the generation request */
  error: Error | null;
  /** Whether the generation was successful */
  isSuccess: boolean;
  /** Whether the generation failed */
  isError: boolean;
  /** Generation progress (0-100, estimated) */
  progress?: number;
  /** Manually trigger summary generation */
  generateSummary: () => void;
  /** Whether generation can be triggered */
  canGenerate: boolean;
  /** Estimated generation time in seconds */
  estimatedTime?: number;
}

/**
 * Hook for generating AI summaries with caching and analytics
 *
 * @param params Generation parameters including book and summary type
 * @returns React Query result with summary data and generation controls
 *
 * @example
 * ```tsx
 * const {
 *   summary,
 *   isGenerating,
 *   generateSummary,
 *   error
 * } = useSummaryGeneration({
 *   book: selectedBook,
 *   summaryType: "concise",
 *   enabled: false // Manual generation only
 * });
 *
 * // Trigger generation manually
 * const handleGenerate = () => {
 *   generateSummary();
 * };
 * ```
 */
export function useSummaryGeneration(
  params: UseSummaryGenerationParams
): UseSummaryGenerationReturn {
  const convex = useConvex();
  const queryClient = useQueryClient();

  // Create analytics service instance
  const analyticsService = useMemo(
    () => createSummaryAnalyticsService(convex),
    [convex]
  );

  // Create query cache key
  const queryKey = useMemo(
    () => ["summary", params.book.id, params.summaryType],
    [params.book.id, params.summaryType]
  );

  // Check if summary already exists (query existing summaries)
  const existingSummaryQuery = useQuery({
    queryKey: ["existingSummary", params.book.id, params.summaryType],
    queryFn: async (): Promise<Summary | null> => {
      try {
        const result = await convex.query(api.summaries.getSummary, {
          bookId: params.book.id,
          summaryType: params.summaryType,
          userId: params.userId,
        });

        if (!result) return null;

        // Convert Convex dates to JS Date objects
        return {
          ...result,
          createdAt: new Date(result.createdAt),
          updatedAt: new Date(result.updatedAt),
        };
      } catch (error) {
        console.error("Error checking existing summary:", error);
        return null;
      }
    },
    enabled: params.enabled !== false, // Enable by default unless explicitly disabled
    staleTime: 1000 * 60 * 10, // Consider existing summaries fresh for 10 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });

  // Summary generation mutation
  const generateMutation = useMutation({
    mutationFn: async (input: CreateSummaryInput): Promise<Summary> => {
      const timer = analyticsService.createPerformanceTimer();
      timer.start();

      try {
        const result = await convex.action(api.summaries.generateSummary, {
          book: input.book,
          summaryType: input.summaryType,
          userId: input.userId as any, // Cast to handle Convex ID type
        });

        const generationTime = timer.end();

        // Convert Convex dates to JS Date objects
        const summary: Summary = {
          ...result,
          createdAt: new Date(result.createdAt),
          updatedAt: new Date(result.updatedAt),
        };

        // Track successful generation analytics (fire-and-forget)
        analyticsService.trackSummaryGeneration({
          book: input.book,
          summaryType: input.summaryType,
          result: {
            content: summary.content,
            generationTime,
            aiModel: summary.aiModel,
            promptVersion: summary.promptVersion,
            metadata: {
              bookDataSource: input.book.source,
              hadBookDescription: Boolean(input.book.description?.trim()),
            },
          },
          cacheHit: false,
          userId: input.userId as any,
        });

        return summary;
      } catch (error) {
        const generationTime = timer.end();

        // Track failed generation analytics (fire-and-forget)
        analyticsService.trackSummaryGeneration({
          book: input.book,
          summaryType: input.summaryType,
          result: {
            error: error as Error,
            generationTime,
          },
          cacheHit: false,
          userId: input.userId as any,
        });

        // Transform API errors into user-friendly messages
        if (error instanceof Error) {
          if (
            error.message.includes("rate limit") ||
            error.message.includes("Rate limit")
          ) {
            throw new Error(
              "Too many summary requests. Please try again in a few minutes."
            );
          }
          if (error.message.includes("timeout")) {
            throw new Error("Summary generation timed out. Please try again.");
          }
          if (
            error.message.includes("authentication") ||
            error.message.includes("API key")
          ) {
            throw new Error("AI service is not available at the moment.");
          }
          if (
            error.message.includes("network") ||
            error.message.includes("Network")
          ) {
            throw new Error("Network error. Please check your connection.");
          }
          // Re-throw original error for other cases
          throw error;
        }

        // Fallback for unknown error types
        throw new Error("Failed to generate summary. Please try again.");
      }
    },
    onSuccess: (data) => {
      // Invalidate and refetch existing summary query
      queryClient.invalidateQueries({
        queryKey: ["existingSummary", params.book.id, params.summaryType],
      });

      // Set the data in the cache directly
      queryClient.setQueryData(queryKey, data);
    },
    // Retry configuration
    retry: (failureCount, error) => {
      // Don't retry authentication or configuration errors
      if (
        error.message.includes("authentication") ||
        error.message.includes("API key")
      ) {
        return false;
      }
      // Don't retry rate limit errors immediately
      if (
        error.message.includes("rate limit") ||
        error.message.includes("Rate limit")
      ) {
        return false;
      }
      // Retry network and timeout errors up to 2 times
      if (
        error.message.includes("network") ||
        error.message.includes("timeout")
      ) {
        return failureCount < 2;
      }
      // Don't retry other errors
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Determine the final summary data
  const summary = useMemo(() => {
    // If we have a successfully generated summary, use that
    if (generateMutation.data) {
      return generateMutation.data;
    }

    // Otherwise, use existing summary if available
    return existingSummaryQuery.data || undefined;
  }, [generateMutation.data, existingSummaryQuery.data]);

  // Calculate estimated generation time based on summary type
  const estimatedTime = useMemo(() => {
    const timeMap = {
      concise: 15, // 15 seconds
      detailed: 45, // 45 seconds
      analysis: 35, // 35 seconds
      practical: 25, // 25 seconds
    };
    return timeMap[params.summaryType];
  }, [params.summaryType]);

  // Simple progress estimation during generation
  const progress = useMemo(() => {
    if (!generateMutation.isPending) return undefined;

    // This is a simple time-based progress estimation
    // In a real implementation, you might use streaming or WebSockets for actual progress
    const elapsed = Date.now() - (generateMutation.submittedAt || Date.now());
    const estimated = (estimatedTime || 30) * 1000; // Convert to milliseconds
    return Math.min(Math.floor((elapsed / estimated) * 100), 95); // Cap at 95% until completion
  }, [generateMutation.isPending, generateMutation.submittedAt, estimatedTime]);

  // Generate summary function
  const generateSummary = useMemo(() => {
    return () => {
      generateMutation.mutate({
        book: params.book,
        summaryType: params.summaryType,
        userId: params.userId,
      });
    };
  }, [generateMutation, params.book, params.summaryType, params.userId]);

  // Check if generation can be triggered
  const canGenerate = useMemo(() => {
    // Can't generate if already generating
    if (generateMutation.isPending) return false;

    // Can't generate if book data is incomplete
    if (!params.book.title?.trim() || !params.book.authors?.length)
      return false;

    // Can generate if no existing summary or if we want to regenerate
    return true;
  }, [generateMutation.isPending, params.book]);

  return {
    summary,
    isLoading: existingSummaryQuery.isLoading,
    isFetching: existingSummaryQuery.isFetching || generateMutation.isPending,
    isGenerating: generateMutation.isPending,
    error: generateMutation.error || existingSummaryQuery.error,
    isSuccess:
      Boolean(summary) &&
      !generateMutation.isError &&
      !existingSummaryQuery.isError,
    isError: generateMutation.isError || existingSummaryQuery.isError,
    progress,
    generateSummary,
    canGenerate,
    estimatedTime,
  };
}

/**
 * Hook for checking if a summary already exists
 * Useful for showing "Generate Summary" vs "View Summary" buttons
 */
export function useSummaryExists(
  bookId: string,
  summaryType: SummaryType,
  userId?: string
) {
  const convex = useConvex();

  return useQuery({
    queryKey: ["summaryExists", bookId, summaryType, userId],
    queryFn: async (): Promise<boolean> => {
      try {
        const summary = await convex.query(api.summaries.getSummary, {
          bookId,
          summaryType,
          userId: userId as any, // Cast to handle Convex ID type
        });
        return Boolean(summary);
      } catch (error) {
        console.error("Error checking summary existence:", error);
        return false;
      }
    },
    enabled: true, // Now enabled since Convex functions are implemented
    staleTime: 1000 * 60 * 5, // Consider fresh for 5 minutes
    gcTime: 1000 * 60 * 15, // Keep in cache for 15 minutes
  });
}

/**
 * Hook for getting summary generation service status
 * Useful for showing service availability and rate limits
 */
export function useSummaryGenerationService() {
  const convex = useConvex();

  return useQuery({
    queryKey: ["summaryServiceStatus"],
    queryFn: async () => {
      try {
        const status = await convex.query(api.summaries.getServiceStatus);
        return status;
      } catch (error) {
        console.error("Error checking summary service status:", error);
        return {
          isConfigured: false,
          rateLimit: { hasKey: false },
          availableModels: [],
        };
      }
    },
    enabled: true, // Now enabled since Convex functions are implemented
    staleTime: 1000 * 60 * 2, // Consider fresh for 2 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
  });
}

// Export types for external use
export type { UseSummaryGenerationParams, UseSummaryGenerationReturn };
