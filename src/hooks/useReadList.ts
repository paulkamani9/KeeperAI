import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { bookToConvexBook } from "@/lib/convexBookHelpers";
import type { Book } from "@/types/book";
import { useCallback } from "react";

/**
 * Reading status types matching Convex schema
 */
export type ReadingStatus = "want-to-read" | "reading" | "completed";

/**
 * Custom hook for managing user reading list
 *
 * Features:
 * - Checks if a book is in reading list
 * - Adds/removes books from reading list
 * - Updates reading status
 * - Supports both search results and detail page contexts
 *
 * @param bookId - Optional book ID to check reading list status for
 * @returns Reading list state and mutation functions
 */
export function useReadList(bookId?: string) {
  const { user } = useUser();

  // Query to check if book is in reading list
  const readListStatus = useQuery(
    api.readList.isInReadList,
    user && bookId ? { userId: user.id, bookId } : "skip"
  );

  // Mutations
  const addToReadList = useMutation(api.readList.addToReadList);
  const removeFromReadList = useMutation(api.readList.removeFromReadList);
  const updateStatus = useMutation(api.readList.updateReadingStatus);

  /**
   * Add book to reading list with optional status
   *
   * Accepts either:
   * - Book object (from search results) - persists book first
   * - bookId string (from detail page) - book already persisted
   */
  const addBook = useCallback(
    async (bookOrId: Book | string, status?: ReadingStatus) => {
      if (!user) {
        throw new Error("User must be authenticated to manage reading list");
      }

      const isBookObject = typeof bookOrId !== "string";
      const targetBookId = isBookObject ? bookOrId.id : bookOrId;

      try {
        if (isBookObject) {
          // From search results - include book object
          await addToReadList({
            userId: user.id,
            bookId: targetBookId,
            book: bookToConvexBook(bookOrId as Book),
            status,
          });
        } else {
          // From detail page - book already persisted
          await addToReadList({
            userId: user.id,
            bookId: targetBookId,
            status,
            // book is undefined (optional parameter)
          });
        }
      } catch (error) {
        console.error("Error adding to reading list:", error);
        throw error;
      }
    },
    [user, addToReadList]
  );

  /**
   * Remove book from reading list
   */
  const removeBook = useCallback(
    async (bookIdToRemove: string) => {
      if (!user) {
        throw new Error("User must be authenticated to manage reading list");
      }

      try {
        await removeFromReadList({
          userId: user.id,
          bookId: bookIdToRemove,
        });
      } catch (error) {
        console.error("Error removing from reading list:", error);
        throw error;
      }
    },
    [user, removeFromReadList]
  );

  /**
   * Update reading status for a book
   */
  const updateReadingStatus = useCallback(
    async (bookIdToUpdate: string, status: ReadingStatus) => {
      if (!user) {
        throw new Error("User must be authenticated to update reading status");
      }

      try {
        await updateStatus({
          userId: user.id,
          bookId: bookIdToUpdate,
          status,
        });
      } catch (error) {
        console.error("Error updating reading status:", error);
        throw error;
      }
    },
    [user, updateStatus]
  );

  return {
    /** Whether the book is in the reading list */
    isInReadList: readListStatus?.inList ?? false,
    /** Current reading status if in list */
    currentStatus: readListStatus?.status,
    /** Add book to reading list */
    addBook,
    /** Remove book from reading list */
    removeBook,
    /** Update reading status */
    updateReadingStatus,
    /** Whether the user is authenticated */
    isAuthenticated: !!user,
    /** Whether the reading list status is loading */
    isLoading: readListStatus === undefined && !!user && !!bookId,
  };
}
