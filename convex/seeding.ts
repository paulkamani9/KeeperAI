/**
 * Seeding workflow for curated Book of the Day books
 *
 * This module implements a two-gate idempotency system using Convex's action + mutation pattern:
 * - Actions handle external API calls (fetch)
 * - Internal mutations handle database writes
 *
 * Two-gate system:
 * - Gate A: Check by normalized title/author
 * - Gate B: Check by external API identifiers (source + originalId)
 */

import { v } from "convex/values";
import { action, internalMutation, query, mutation } from "./_generated/server";
import type { ActionCtx, MutationCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { seedBookList } from "../src/lib/booksOfTheDay";
import {
  normalize,
  validateBookData,
  type BookMetadata,
} from "./seedingHelpers";

/**
 * Sleep utility for rate limiting (only works in actions)
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch from Google Books API (only in actions)
 */
async function fetchGoogleBooks(title: string, author: string): Promise<any[]> {
  try {
    const query = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Google Books API returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.warn("Google Books API error:", error);
    return [];
  }
}

/**
 * Fetch from Open Library API (only in actions)
 */
async function fetchOpenLibrary(title: string, author: string): Promise<any[]> {
  try {
    const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=5`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Open Library API returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.docs || [];
  } catch (error) {
    console.warn("Open Library API error:", error);
    return [];
  }
}

/**
 * Normalize Google Books API response
 */
function normalizeGoogleBooksResult(item: any): BookMetadata {
  const volumeInfo = item.volumeInfo || {};
  const imageLinks = volumeInfo.imageLinks || {};

  return {
    id: `google-books-${item.id}`,
    source: "google-books",
    originalId: item.id,
    title: volumeInfo.title || "Unknown Title",
    authors: volumeInfo.authors || [],
    description: volumeInfo.description,
    publishedDate: volumeInfo.publishedDate,
    publisher: volumeInfo.publisher,
    pageCount: volumeInfo.pageCount,
    categories: volumeInfo.categories,
    language: volumeInfo.language,
    isbn10: volumeInfo.industryIdentifiers?.find(
      (id: any) => id.type === "ISBN_10"
    )?.identifier,
    isbn13: volumeInfo.industryIdentifiers?.find(
      (id: any) => id.type === "ISBN_13"
    )?.identifier,
    thumbnail: imageLinks.thumbnail,
    smallThumbnail: imageLinks.smallThumbnail,
    mediumThumbnail: imageLinks.medium,
    largeThumbnail: imageLinks.large,
    averageRating: volumeInfo.averageRating,
    ratingsCount: volumeInfo.ratingsCount,
    previewLink: volumeInfo.previewLink,
    infoLink: volumeInfo.infoLink,
  };
}

/**
 * Normalize Open Library API response
 */
function normalizeOpenLibraryResult(doc: any): BookMetadata {
  const workKey = doc.key || doc.work_key?.[0] || "";
  const editionKey = doc.edition_key?.[0] || "";
  const id = workKey || editionKey;

  return {
    id: `open-library-${id.replace(/^\/works\//, "")}`,
    source: "open-library",
    originalId: id,
    title: doc.title || "Unknown Title",
    authors: doc.author_name || [],
    description: doc.first_sentence?.[0],
    publishedDate: doc.first_publish_year?.toString(),
    publisher: doc.publisher?.[0],
    pageCount: doc.number_of_pages_median,
    categories: doc.subject?.slice(0, 5),
    language: doc.language?.[0],
    isbn10: doc.isbn?.[0],
    isbn13: doc.isbn?.find((isbn: string) => isbn.length === 13),
    thumbnail: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : undefined,
    smallThumbnail: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg`
      : undefined,
    mediumThumbnail: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : undefined,
    largeThumbnail: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : undefined,
  };
}

/**
 * Fetch book metadata with fallback strategy (only in actions)
 */
async function fetchBookMetadata(
  title: string,
  author: string
): Promise<BookMetadata | null> {
  // Try Google Books first
  try {
    const googleResults = await fetchGoogleBooks(title, author);
    if (googleResults && googleResults.length > 0) {
      return normalizeGoogleBooksResult(googleResults[0]);
    }
  } catch (error) {
    console.warn("Google Books failed, trying Open Library:", error);
  }

  // Fallback to Open Library
  try {
    const olResults = await fetchOpenLibrary(title, author);
    if (olResults && olResults.length > 0) {
      return normalizeOpenLibraryResult(olResults[0]);
    }
  } catch (error) {
    console.error("Both APIs failed for:", title, "by", author, error);
  }

  return null;
}

/**
 * Seeding statistics interface
 */
const seedingStatsValidator = v.object({
  totalBooks: v.number(),
  processedBooks: v.number(),
  updatedByTitleAuthor: v.number(),
  updatedByExternalId: v.number(),
  newInserts: v.number(),
  skipped: v.number(),
  errors: v.number(),
  duration: v.number(),
  errorDetails: v.optional(
    v.array(
      v.object({
        title: v.string(),
        author: v.string(),
        error: v.string(),
      })
    )
  ),
});

export interface SeedingStats {
  totalBooks: number;
  processedBooks: number;
  updatedByTitleAuthor: number;
  updatedByExternalId: number;
  newInserts: number;
  skipped: number;
  errors: number;
  duration: number;
  errorDetails?: Array<{ title: string; author: string; error: string }>;
}

/**
 * Internal mutation: Update existing book with Book of the Day flags
 */
export const updateBookFlags = internalMutation({
  args: {
    bookId: v.id("books"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.bookId, {
      isBookOfTheDay: true,
      seedReason: args.reason,
    });
  },
});

/**
 * Internal mutation: Insert new book with all metadata
 */
export const insertNewBook = internalMutation({
  args: {
    bookData: v.object({
      id: v.string(),
      originalId: v.string(),
      source: v.union(v.literal("google-books"), v.literal("open-library")),
      title: v.string(),
      authors: v.array(v.string()),
      description: v.optional(v.string()),
      publishedDate: v.optional(v.string()),
      publisher: v.optional(v.string()),
      pageCount: v.optional(v.number()),
      categories: v.optional(v.array(v.string())),
      language: v.optional(v.string()),
      isbn10: v.optional(v.string()),
      isbn13: v.optional(v.string()),
      thumbnail: v.optional(v.string()),
      smallThumbnail: v.optional(v.string()),
      mediumThumbnail: v.optional(v.string()),
      largeThumbnail: v.optional(v.string()),
      averageRating: v.optional(v.number()),
      ratingsCount: v.optional(v.number()),
      previewLink: v.optional(v.string()),
      infoLink: v.optional(v.string()),
    }),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("books", {
      ...args.bookData,
      isBookOfTheDay: true,
      seedReason: args.reason,
      cachedAt: Date.now(),
      lastAccessedAt: Date.now(),
    });
  },
});

/**
 * Action: Seed curated books with two-gate idempotency
 */
export const runSeeding = action({
  args: {
    dryRun: v.optional(v.boolean()),
    maxBooks: v.optional(v.number()),
  },
  returns: seedingStatsValidator,
  handler: async (ctx, args): Promise<SeedingStats> => {
    const { dryRun = false, maxBooks } = args;
    const startTime = Date.now();

    // Limit books for testing if specified
    const booksToSeed = maxBooks
      ? seedBookList.slice(0, maxBooks)
      : seedBookList;

    const stats: SeedingStats = {
      totalBooks: booksToSeed.length,
      processedBooks: 0,
      updatedByTitleAuthor: 0,
      updatedByExternalId: 0,
      newInserts: 0,
      skipped: 0,
      errors: 0,
      duration: 0,
      errorDetails: [],
    };

    console.log(
      `🌱 Starting seeding workflow (dry-run: ${dryRun}, books: ${stats.totalBooks})`
    );

    for (const { title, author, reason } of booksToSeed) {
      try {
        stats.processedBooks++;

        // Log progress every 10 books
        if (stats.processedBooks % 10 === 0) {
          console.log(
            `📚 Progress: ${stats.processedBooks}/${stats.totalBooks} books processed...`
          );
        }

        // GATE A: Check by Title/Author (using query via runQuery)
        const normalizedTitle = normalize(title);
        const normalizedAuthor = normalize(author);

        const existingByTitleAuthor = await ctx.runQuery(
          internal.seedingHelpers.findByTitleAuthorQuery,
          {
            normalizedTitle,
            normalizedAuthor,
          }
        );

        if (existingByTitleAuthor) {
          // Book found by title/author - update flags
          if (!dryRun) {
            await ctx.runMutation(internal.seeding.updateBookFlags, {
              bookId: existingByTitleAuthor._id,
              reason,
            });
          }
          stats.updatedByTitleAuthor++;
          console.log(`✅ [Gate A] Updated: "${title}" by ${author}`);
          continue;
        }

        // GATE B: Fetch from External APIs (actions can call fetch!)
        console.log(`🔍 Fetching metadata for: "${title}" by ${author}`);
        const bookData = await fetchBookMetadata(title, author);

        if (!bookData || !validateBookData(bookData)) {
          stats.skipped++;
          console.warn(`⚠️  Skipped (no API results): "${title}" by ${author}`);
          continue;
        }

        // Check if book exists by external ID
        const existingByExternalId = await ctx.runQuery(
          internal.seedingHelpers.findByExternalIdQuery,
          {
            originalId: bookData.originalId,
            source: bookData.source,
          }
        );

        if (existingByExternalId) {
          // Book found by external ID - update flags
          if (!dryRun) {
            await ctx.runMutation(internal.seeding.updateBookFlags, {
              bookId: existingByExternalId._id,
              reason,
            });
          }
          stats.updatedByExternalId++;
          console.log(`✅ [Gate B] Updated by external ID: "${title}"`);
        } else {
          // New book - insert with all data
          if (!dryRun) {
            await ctx.runMutation(internal.seeding.insertNewBook, {
              bookData,
              reason,
            });
          }
          stats.newInserts++;
          console.log(`✨ [Insert] New book added: "${title}"`);
        }

        // Rate limiting: 100ms between API calls
        await sleep(100);
      } catch (error) {
        stats.errors++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        stats.errorDetails?.push({
          title,
          author,
          error: errorMessage,
        });
        console.error(`❌ Error processing "${title}" by ${author}:`, error);
        // Continue with next book instead of crashing
      }
    }

    stats.duration = Date.now() - startTime;

    // Final summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 Seeding Complete!");
    console.log("=".repeat(60));
    console.log(`📊 Statistics:`);
    console.log(`   Total Books: ${stats.totalBooks}`);
    console.log(`   Processed: ${stats.processedBooks}`);
    console.log(
      `   Updated (Gate A - Title/Author): ${stats.updatedByTitleAuthor}`
    );
    console.log(
      `   Updated (Gate B - External ID): ${stats.updatedByExternalId}`
    );
    console.log(`   New Inserts: ${stats.newInserts}`);
    console.log(`   Skipped (not found): ${stats.skipped}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(`   Duration: ${(stats.duration / 1000).toFixed(2)}s`);
    console.log("=".repeat(60) + "\n");

    if (
      stats.errors > 0 &&
      stats.errorDetails &&
      stats.errorDetails.length > 0
    ) {
      console.log("❌ Error Details:");
      stats.errorDetails.forEach(({ title, author, error }) => {
        console.log(`   - "${title}" by ${author}: ${error}`);
      });
    }

    return stats;
  },
});

/**
 * Action: Run seeding in dry-run mode (no changes)
 */
export const runSeedingDryRun = action({
  args: {},
  returns: seedingStatsValidator,
  handler: async (ctx): Promise<SeedingStats> => {
    console.log("🔍 Starting dry-run seeding (no changes will be made)...");
    const startTime = Date.now();

    // Run the full seeding logic with dryRun=true
    const booksToSeed = seedBookList;

    const stats: SeedingStats = {
      totalBooks: booksToSeed.length,
      processedBooks: 0,
      updatedByTitleAuthor: 0,
      updatedByExternalId: 0,
      newInserts: 0,
      skipped: 0,
      errors: 0,
      duration: 0,
      errorDetails: [],
    };

    console.log(
      `🌱 Starting seeding workflow (dry-run: true, books: ${stats.totalBooks})`
    );

    for (const { title, author, reason } of booksToSeed) {
      try {
        stats.processedBooks++;

        if (stats.processedBooks % 10 === 0) {
          console.log(
            `📚 Progress: ${stats.processedBooks}/${stats.totalBooks} books processed...`
          );
        }

        const normalizedTitle = normalize(title);
        const normalizedAuthor = normalize(author);

        const existingByTitleAuthor = await ctx.runQuery(
          internal.seedingHelpers.findByTitleAuthorQuery,
          {
            normalizedTitle,
            normalizedAuthor,
          }
        );

        if (existingByTitleAuthor) {
          stats.updatedByTitleAuthor++;
          console.log(
            `✅ [Gate A - Dry Run] Would update: "${title}" by ${author}`
          );
          continue;
        }

        console.log(`🔍 Fetching metadata for: "${title}" by ${author}`);
        const bookData = await fetchBookMetadata(title, author);

        if (!bookData || !validateBookData(bookData)) {
          stats.skipped++;
          console.warn(`⚠️  Skipped (no API results): "${title}" by ${author}`);
          continue;
        }

        const existingByExternalId = await ctx.runQuery(
          internal.seedingHelpers.findByExternalIdQuery,
          {
            originalId: bookData.originalId,
            source: bookData.source,
          }
        );

        if (existingByExternalId) {
          stats.updatedByExternalId++;
          console.log(
            `✅ [Gate B - Dry Run] Would update by external ID: "${title}"`
          );
        } else {
          stats.newInserts++;
          console.log(`✨ [Insert - Dry Run] Would add new book: "${title}"`);
        }

        await sleep(100);
      } catch (error) {
        stats.errors++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        stats.errorDetails?.push({
          title,
          author,
          error: errorMessage,
        });
        console.error(`❌ Error processing "${title}" by ${author}:`, error);
      }
    }

    stats.duration = Date.now() - startTime;

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Dry-Run Complete!");
    console.log("=".repeat(60));
    console.log(`📊 Statistics:`);
    console.log(`   Total Books: ${stats.totalBooks}`);
    console.log(`   Processed: ${stats.processedBooks}`);
    console.log(
      `   Would Update (Gate A - Title/Author): ${stats.updatedByTitleAuthor}`
    );
    console.log(
      `   Would Update (Gate B - External ID): ${stats.updatedByExternalId}`
    );
    console.log(`   Would Insert: ${stats.newInserts}`);
    console.log(`   Skipped (not found): ${stats.skipped}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(`   Duration: ${(stats.duration / 1000).toFixed(2)}s`);
    console.log("=".repeat(60) + "\n");

    return stats;
  },
});

/**
 * Action: Test seeding with limited books
 */
export const runSeedingTest = action({
  args: {
    maxBooks: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  returns: seedingStatsValidator,
  handler: async (ctx, args): Promise<SeedingStats> => {
    const maxBooks = args.maxBooks ?? 5;
    const dryRun = args.dryRun ?? false;
    console.log(
      `🧪 Starting test seeding (${maxBooks} books, dry-run: ${dryRun})...`
    );

    // Just call the main runSeeding action with parameters
    return await ctx.runAction(api.seeding.runSeeding, { maxBooks, dryRun });
  },
});

/**
 * Query: Get seeding statistics
 */
export const getSeedingStats = query({
  args: {},
  handler: async (ctx) => {
    const allBooks = await ctx.db.query("books").collect();
    const curatedBooks = allBooks.filter(
      (book: any) => book.isBookOfTheDay === true
    );

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentlyCached = curatedBooks.filter(
      (book: any) => book.cachedAt > oneDayAgo
    );

    return {
      totalBooks: allBooks.length,
      curatedBooks: curatedBooks.length,
      recentlyCached: recentlyCached.length,
      curatedPercentage: (
        (curatedBooks.length / allBooks.length) *
        100
      ).toFixed(2),
    };
  },
});

/**
 * Mutation: Rollback seeding (remove all Book of the Day flags)
 */
export const rollbackSeeding = mutation({
  args: {
    confirm: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.confirm) {
      throw new Error("Must explicitly confirm rollback with confirm: true");
    }

    console.log("🔄 Starting rollback of all Book of the Day flags...");

    const curatedBooks = await ctx.db
      .query("books")
      .filter((q: any) => q.eq(q.field("isBookOfTheDay"), true))
      .collect();

    let count = 0;
    for (const book of curatedBooks) {
      await ctx.db.patch(book._id, {
        isBookOfTheDay: false,
        seedReason: undefined,
      });
      count++;
    }

    console.log(`✅ Rollback complete! Reset ${count} books.`);
    return { success: true, booksReset: count };
  },
});
