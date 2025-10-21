import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCallback } from "react";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Hook for managing saved summaries
 *
 * Provides functionality to:
 * - Check if a summary is saved
 * - Save a summary to user's collection
 * - Remove a saved summary
 *
 * @param summaryId - The ID of the summary to manage (string or Convex ID)
 * @returns Object with saved state and mutation functions
 */
export function useSavedSummaries(summaryId?: string | Id<"summaries">) {
  const { user } = useUser();
  const saveSummaryMutation = useMutation(api.savedSummaries.saveSummary);
  const removeSummaryMutation = useMutation(
    api.savedSummaries.removeSavedSummary
  );

  // Cast string to Convex ID type
  const convexSummaryId = summaryId as Id<"summaries"> | undefined;

  // Check if specific summary is saved
  const isSaved = useQuery(
    api.savedSummaries.isSummarySaved,
    user && convexSummaryId
      ? { userId: user.id, summaryId: convexSummaryId }
      : "skip"
  );

  /**
   * Toggle save state for a summary
   * If saved, removes it; if not saved, saves it
   *
   * @param bookId - The book ID associated with the summary
   * @throws Error if user is not authenticated
   */
  const toggleSave = useCallback(
    async (bookId: string) => {
      if (!user) {
        throw new Error("Must be authenticated to save summaries");
      }

      if (!convexSummaryId) {
        throw new Error("Summary ID is required");
      }

      if (isSaved) {
        // Remove from saved summaries
        await removeSummaryMutation({
          userId: user.id,
          summaryId: convexSummaryId,
        });
      } else {
        // Save summary
        // Note: Book is already persisted since summaries are only generated from detail pages
        await saveSummaryMutation({
          userId: user.id,
          bookId,
          summaryId: convexSummaryId,
          // book parameter omitted - book already persisted
        });
      }
    },
    [user, convexSummaryId, isSaved, saveSummaryMutation, removeSummaryMutation]
  );

  return {
    isSaved: isSaved ?? false,
    toggleSave,
    isAuthenticated: !!user,
    isLoading: isSaved === undefined,
  };
}
