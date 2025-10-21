import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { bookToConvexBook } from "@/lib/convexBookHelpers";
import type { Book } from "@/types/book";
import { useCallback } from "react";

/**
 * Custom hook for managing user favorites with optimistic updates
 *
 * Features:
 * - Checks if a book is favorited
 * - Toggles favorite status with smart book persistence
 * - Supports both search results (with Book object) and detail page (with bookId string)
 * - Returns authentication status
 *
 * @param bookId - Optional book ID to check favorite status for
 * @returns Favorite state and toggle function
 */
export function useFavorites(bookId?: string) {
  const { user } = useUser();

  // Query to check if book is favorited
  const isFavorited = useQuery(
    api.favorites.isFavorited,
    user && bookId ? { userId: user.id, bookId } : "skip"
  );

  // Mutations for add/remove
  const addFavorite = useMutation(api.favorites.addFavorite);
  const removeFavorite = useMutation(api.favorites.removeFavorite);

  /**
   * Toggle favorite status
   *
   * Accepts either:
   * - Book object (from search results) - persists book first
   * - bookId string (from detail page) - book already persisted
   */
  const toggleFavorite = useCallback(
    async (bookOrId: Book | string) => {
      if (!user) {
        throw new Error("User must be authenticated to favorite books");
      }

      const isBookObject = typeof bookOrId !== "string";
      const targetBookId = isBookObject ? bookOrId.id : bookOrId;

      try {
        if (isFavorited) {
          // Remove from favorites
          await removeFavorite({
            userId: user.id,
            bookId: targetBookId,
          });
        } else {
          // Add to favorites
          if (isBookObject) {
            // From search results - include book object
            await addFavorite({
              userId: user.id,
              bookId: targetBookId,
              book: bookToConvexBook(bookOrId as Book),
            });
          } else {
            // From detail page - book already persisted
            await addFavorite({
              userId: user.id,
              bookId: targetBookId,
              // book is undefined (optional parameter)
            });
          }
        }
      } catch (error) {
        console.error("Error toggling favorite:", error);
        throw error;
      }
    },
    [user, isFavorited, addFavorite, removeFavorite]
  );

  return {
    /** Whether the book is currently favorited */
    isFavorited: isFavorited ?? false,
    /** Toggle favorite status (add or remove) */
    toggleFavorite,
    /** Whether the user is authenticated */
    isAuthenticated: !!user,
    /** Whether the favorite status is loading */
    isLoading: isFavorited === undefined && !!user && !!bookId,
  };
}
