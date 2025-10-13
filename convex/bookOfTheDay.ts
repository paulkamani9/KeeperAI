/**
 * Book of the Day - Daily Book Recommendation System
 *
 * This module handles the automated selection and retrieval of the daily book recommendation.
 * It implements a rolling 300-day window to ensure variety while avoiding recent duplicates.
 *
 * Key Features:
 * - Automated daily selection via cron job
 * - Rolling 300-day window (no book appears twice within 300 days)
 * - Stable snapshot data (title, author, thumbnail, reason)
 * - Idempotent - safe to run multiple times per day
 *
 * Architecture:
 * 1. Cron runs daily at midnight UTC
 * 2. Checks if today's book exists (idempotency)
 * 3. Queries curated books (isBookOfTheDay === true)
 * 4. Maintains 300-record rolling window
 * 5. Picks random book not in recent window
 * 6. Stores snapshot data for stable rendering
 */

import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Get today's Book of the Day
 *
 * Returns the most recent book recommendation based on date.
 * Frontend uses this to display the "Book of the Day" card.
 *
 * @returns The book of the day with snapshot data, or null if none exists
 */
export const getBookOfTheDay = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("bookOfTheDay"),
      _creationTime: v.number(),
      date: v.string(),
      bookId: v.id("books"),
      title: v.string(),
      author: v.string(),
      thumbnail: v.optional(v.string()),
      reason: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Get the most recent entry by date (descending order)
    const todaysBook = await ctx.db
      .query("bookOfTheDay")
      .withIndex("byDate")
      .order("desc")
      .first();

    return todaysBook;
  },
});

/**
 * Pick Book of the Day - Internal Mutation (Run by Cron)
 *
 * This function implements the rolling 300-day window logic:
 * 1. Check if today's book already exists (idempotency)
 * 2. Query all curated books (isBookOfTheDay === true)
 * 3. Get recently used books from the window
 * 4. Pick a random book not in the recent set
 * 5. If window is full (300 records), delete oldest entry
 * 6. Insert new book with snapshot data
 *
 * Rolling Window Logic:
 * - Maintains exactly 300 records maximum
 * - No book repeats within the 300-day window
 * - Automatic cleanup of oldest entries
 * - Random selection ensures variety
 *
 * @internal Called by cron job only
 */
export const pickBookOfTheDay = internalMutation({
  args: {},
  returns: v.union(
    v.object({
      success: v.boolean(),
      action: v.union(
        v.literal("already_exists"),
        v.literal("picked_new_book"),
        v.literal("no_books_available")
      ),
      bookId: v.optional(v.id("books")),
      title: v.optional(v.string()),
      date: v.string(),
      windowSize: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Get today's date in YYYY-MM-DD format (UTC)
    const today = new Date().toISOString().split("T")[0];

    // 1. Check if today's book already exists (idempotency)
    const existingToday = await ctx.db
      .query("bookOfTheDay")
      .withIndex("byDate", (q) => q.eq("date", today))
      .first();

    if (existingToday) {
      console.log(`📚 Book of the Day already exists for ${today}`);
      return {
        success: true,
        action: "already_exists" as const,
        bookId: existingToday.bookId,
        title: existingToday.title,
        date: today,
        windowSize: 0,
      };
    }

    // 2. Query all curated books (isBookOfTheDay === true)
    const curatedBooks = await ctx.db
      .query("books")
      .filter((q) => q.eq(q.field("isBookOfTheDay"), true))
      .collect();

    if (curatedBooks.length === 0) {
      console.error("❌ No curated books found (isBookOfTheDay === true)");
      return {
        success: false,
        action: "no_books_available" as const,
        date: today,
        windowSize: 0,
      };
    }

    console.log(`📚 Found ${curatedBooks.length} curated books`);

    // 3. Get all records from bookOfTheDay sorted by date (oldest first)
    const allRecords = await ctx.db
      .query("bookOfTheDay")
      .withIndex("byDate")
      .order("asc") // Oldest first for deletion
      .collect();

    console.log(`📊 Current window size: ${allRecords.length} records`);

    // 4. Extract recently used book IDs
    const recentlyUsedIds = new Set(allRecords.map((record) => record.bookId));

    // 5. Filter books not in the recent window
    const availableBooks = curatedBooks.filter(
      (book) => !recentlyUsedIds.has(book._id)
    );

    console.log(`✨ Available books (not in window): ${availableBooks.length}`);

    // 6. If no available books, we need to reset the window
    let booksToChooseFrom = availableBooks;

    if (availableBooks.length === 0) {
      console.log(
        "🔄 All books have been used, selecting from full curated set"
      );
      booksToChooseFrom = curatedBooks;
    }

    // 7. Pick a random book
    const randomIndex = Math.floor(Math.random() * booksToChooseFrom.length);
    const selectedBook = booksToChooseFrom[randomIndex];

    // 8. If window is at 300 records, delete the oldest entry
    if (allRecords.length >= 300) {
      const oldestRecord = allRecords[0]; // First in ascending order
      await ctx.db.delete(oldestRecord._id);
      console.log(
        `🗑️ Deleted oldest record: ${oldestRecord.title} (${oldestRecord.date})`
      );
    }

    // 9. Get best available thumbnail with fallback chain
    const thumbnail =
      selectedBook.largeThumbnail ||
      selectedBook.mediumThumbnail ||
      selectedBook.thumbnail ||
      selectedBook.smallThumbnail;

    // 10. Get primary author with fallback
    const author =
      selectedBook.authors && selectedBook.authors.length > 0
        ? selectedBook.authors[0]
        : "Unknown Author";

    // 11. Insert new record with snapshot data
    const newRecord = await ctx.db.insert("bookOfTheDay", {
      date: today,
      bookId: selectedBook._id,
      title: selectedBook.title,
      author,
      thumbnail,
      reason: selectedBook.seedReason,
    });

    console.log(
      `✅ Picked Book of the Day: "${selectedBook.title}" by ${author}`
    );
    console.log(`📅 Date: ${today}`);
    console.log(`🔗 Book ID: ${selectedBook._id}`);
    console.log(
      `📊 New window size: ${allRecords.length >= 300 ? 300 : allRecords.length + 1}`
    );

    return {
      success: true,
      action: "picked_new_book" as const,
      bookId: selectedBook._id,
      title: selectedBook.title,
      date: today,
      windowSize: allRecords.length >= 300 ? 300 : allRecords.length + 1,
    };
  },
});

/**
 * Get Book of the Day Stats - Helper Query for Testing
 *
 * Returns statistics about the book of the day system:
 * - Total records in window
 * - Oldest and newest dates
 * - Number of curated books available
 *
 * @returns Statistics object
 */
export const getBookOfTheDayStats = query({
  args: {},
  returns: v.object({
    windowSize: v.number(),
    oldestDate: v.optional(v.string()),
    newestDate: v.optional(v.string()),
    curatedBooksCount: v.number(),
  }),
  handler: async (ctx) => {
    // Get all records
    const allRecords = await ctx.db.query("bookOfTheDay").collect();

    // Get curated books count
    const curatedBooks = await ctx.db
      .query("books")
      .filter((q) => q.eq(q.field("isBookOfTheDay"), true))
      .collect();

    // Get oldest and newest dates
    const dates = allRecords.map((r) => r.date).sort();
    const oldestDate = dates[0];
    const newestDate = dates[dates.length - 1];

    return {
      windowSize: allRecords.length,
      oldestDate,
      newestDate,
      curatedBooksCount: curatedBooks.length,
    };
  },
});
