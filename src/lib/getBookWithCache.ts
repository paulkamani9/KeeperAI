/**
 * Server-side book retrieval utility
 * This checks Convex first before falling back to external APIs
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { createUnifiedSearchService } from "@/services/search/searchService";
import { convexBookToBook, bookToConvexBook } from "@/lib/convexBookHelpers";
import type { Book } from "@/types/book";

/**
 * Get book details with Convex-first strategy
 * 1. Check Convex cache
 * 2. If not found, fetch from external API (without cache check)
 * 3. Persist to Convex and return
 */
export async function getBookWithCache(id: string): Promise<Book | null> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    console.warn("NEXT_PUBLIC_CONVEX_URL not set, using API fallback only");
    const searchService = createUnifiedSearchService();
    return searchService.getBookDetails(id);
  }

  const convex = new ConvexHttpClient(convexUrl);

  try {
    // Check Convex cache first
    const cachedBook = await convex.query(api.books.getBookById, { id });

    if (cachedBook) {
      console.log("📚 Book found in Convex cache:", id);
      return convexBookToBook(cachedBook);
    }

    console.log("🔍 Book not in cache, fetching from API:", id);

    // Not in cache, fetch from external API
    const searchService = createUnifiedSearchService();

    const book = await searchService.getBookDetails(id);

    // Persist to Convex if book was found
    if (book) {
      try {
        await convex.mutation(api.books.upsertBook, bookToConvexBook(book));
        console.log("💾 Book persisted to Convex:", book.id);
      } catch (error) {
        console.warn("Failed to persist book to Convex:", error);
        // Don't fail the request if persistence fails
      }
    }

    return book;
  } catch (error) {
    console.error("Error in getBookWithCache:", error);

    // Fallback to direct API call without caching
    const searchService = createUnifiedSearchService();

    return searchService.getBookDetails(id);
  }
}
