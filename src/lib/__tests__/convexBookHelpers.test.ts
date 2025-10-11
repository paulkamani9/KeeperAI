/**
 * Tests for book persistence to Convex
 */
import { describe, it, expect, beforeEach } from "vitest";
import { convexBookToBook, bookToConvexBook } from "@/lib/convexBookHelpers";
import type { Book } from "@/types/book";

describe("Book Convex Helpers", () => {
  const mockBook: Book = {
    id: "google-books:abc123",
    title: "Test Book",
    authors: ["John Doe", "Jane Smith"],
    description: "A comprehensive test book",
    publishedDate: "2024-01-01",
    publisher: "Test Publisher",
    pageCount: 300,
    categories: ["Fiction", "Adventure"],
    language: "en",
    isbn10: "1234567890",
    isbn13: "9781234567890",
    thumbnail: "https://example.com/thumb.jpg",
    smallThumbnail: "https://example.com/small.jpg",
    mediumThumbnail: "https://example.com/medium.jpg",
    largeThumbnail: "https://example.com/large.jpg",
    averageRating: 4.5,
    ratingsCount: 100,
    previewLink: "https://example.com/preview",
    infoLink: "https://example.com/info",
    source: "google-books",
    originalId: "abc123",
  };

  describe("bookToConvexBook", () => {
    it("should convert a Book to Convex format", () => {
      const convexBook = bookToConvexBook(mockBook);

      expect(convexBook).toEqual({
        id: mockBook.id,
        title: mockBook.title,
        authors: mockBook.authors,
        description: mockBook.description,
        publishedDate: mockBook.publishedDate,
        publisher: mockBook.publisher,
        pageCount: mockBook.pageCount,
        categories: mockBook.categories,
        language: mockBook.language,
        isbn10: mockBook.isbn10,
        isbn13: mockBook.isbn13,
        thumbnail: mockBook.thumbnail,
        smallThumbnail: mockBook.smallThumbnail,
        mediumThumbnail: mockBook.mediumThumbnail,
        largeThumbnail: mockBook.largeThumbnail,
        averageRating: mockBook.averageRating,
        ratingsCount: mockBook.ratingsCount,
        previewLink: mockBook.previewLink,
        infoLink: mockBook.infoLink,
        source: mockBook.source,
        originalId: mockBook.originalId,
      });
    });

    it("should handle books with minimal data", () => {
      const minimalBook: Book = {
        id: "google-books:xyz789",
        title: "Minimal Book",
        authors: [],
        source: "google-books",
        originalId: "xyz789",
      };

      const convexBook = bookToConvexBook(minimalBook);

      expect(convexBook.id).toBe(minimalBook.id);
      expect(convexBook.title).toBe(minimalBook.title);
      expect(convexBook.authors).toEqual([]);
      expect(convexBook.source).toBe("google-books");
      expect(convexBook.originalId).toBe("xyz789");
    });
  });

  describe("convexBookToBook", () => {
    it("should convert a Convex document to Book format", () => {
      const convexDoc = {
        _id: "convex-id-123" as any,
        _creationTime: Date.now(),
        id: mockBook.id,
        title: mockBook.title,
        authors: mockBook.authors,
        description: mockBook.description,
        publishedDate: mockBook.publishedDate,
        publisher: mockBook.publisher,
        pageCount: mockBook.pageCount,
        categories: mockBook.categories,
        language: mockBook.language,
        isbn10: mockBook.isbn10,
        isbn13: mockBook.isbn13,
        thumbnail: mockBook.thumbnail,
        smallThumbnail: mockBook.smallThumbnail,
        mediumThumbnail: mockBook.mediumThumbnail,
        largeThumbnail: mockBook.largeThumbnail,
        averageRating: mockBook.averageRating,
        ratingsCount: mockBook.ratingsCount,
        previewLink: mockBook.previewLink,
        infoLink: mockBook.infoLink,
        source: mockBook.source,
        originalId: mockBook.originalId,
        cachedAt: Date.now(),
        lastAccessedAt: Date.now(),
      };

      const book = convexBookToBook(convexDoc);

      expect(book).toMatchObject({
        id: mockBook.id,
        title: mockBook.title,
        authors: mockBook.authors,
        description: mockBook.description,
        source: mockBook.source,
        originalId: mockBook.originalId,
      });

      // Convex-specific fields should not be in Book
      expect(book).not.toHaveProperty("_id");
      expect(book).not.toHaveProperty("_creationTime");
      expect(book).not.toHaveProperty("cachedAt");
      expect(book).not.toHaveProperty("lastAccessedAt");
    });
  });

  describe("Round-trip conversion", () => {
    it("should preserve all Book data through round-trip conversion", () => {
      // Convert to Convex format
      const convexBook = bookToConvexBook(mockBook);

      // Simulate Convex document
      const convexDoc = {
        _id: "test-id" as any,
        _creationTime: Date.now(),
        ...convexBook,
        cachedAt: Date.now(),
        lastAccessedAt: Date.now(),
      };

      // Convert back to Book
      const roundTripBook = convexBookToBook(convexDoc);

      // All original fields should be preserved
      expect(roundTripBook).toMatchObject(mockBook);
    });
  });
});
