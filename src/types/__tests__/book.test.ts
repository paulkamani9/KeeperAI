import { describe, it, expect } from "vitest";
import {
  BookSchema,
  SearchParamsSchema,
  SearchResultsSchema,
  parseBook,
  parseSearchParams,
  parseSearchResults,
  isBook,
  isSearchParams,
  isSearchResults,
  type Book,
  type SearchParams,
  type SearchResults,
} from "../book";

describe("Book Types", () => {
  describe("BookSchema validation", () => {
    it("should validate a complete book object", () => {
      const validBook = {
        id: "book-123",
        title: "Test Book",
        authors: ["Author One", "Author Two"],
        description: "A test book description",
        publishedDate: "2023-01-01",
        publisher: "Test Publisher",
        pageCount: 200,
        categories: ["Fiction", "Mystery"],
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
        source: "google-books" as const,
        originalId: "original-123",
      };

      const result = BookSchema.safeParse(validBook);
      expect(result.success).toBe(true);
    });

    it("should validate a minimal book object", () => {
      const minimalBook = {
        id: "book-123",
        title: "Test Book",
        authors: ["Author One"],
        source: "google-books" as const,
        originalId: "original-123",
      };

      const result = BookSchema.safeParse(minimalBook);
      expect(result.success).toBe(true);
    });

    it("should reject book without required fields", () => {
      const invalidBook = {
        title: "Test Book",
        // missing id, authors, source, originalId
      };

      const result = BookSchema.safeParse(invalidBook);
      expect(result.success).toBe(false);
      expect(result.error?.issues).toHaveLength(3); // 3 missing required fields (authors has default)
    });

    it("should reject book with invalid URL", () => {
      const bookWithInvalidUrl = {
        id: "book-123",
        title: "Test Book",
        authors: ["Author One"],
        thumbnail: "not-a-url",
        source: "google-books" as const,
        originalId: "original-123",
      };

      const result = BookSchema.safeParse(bookWithInvalidUrl);
      expect(result.success).toBe(false);
    });

    it("should reject book with invalid rating", () => {
      const bookWithInvalidRating = {
        id: "book-123",
        title: "Test Book",
        authors: ["Author One"],
        averageRating: 6, // Invalid: > 5
        source: "google-books" as const,
        originalId: "original-123",
      };

      const result = BookSchema.safeParse(bookWithInvalidRating);
      expect(result.success).toBe(false);
    });

    it("should set default empty array for authors", () => {
      const bookWithoutAuthors = {
        id: "book-123",
        title: "Test Book",
        source: "google-books" as const,
        originalId: "original-123",
      };

      const result = BookSchema.safeParse(bookWithoutAuthors);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.authors).toEqual([]);
      }
    });
  });

  describe("SearchParamsSchema validation", () => {
    it("should validate complete search params", () => {
      const validParams = {
        query: "test search",
        maxResults: 20,
        startIndex: 0,
        searchIn: "all" as const,
        language: "en",
        publishedAfter: 2000,
        publishedBefore: 2023,
      };

      const result = SearchParamsSchema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it("should validate minimal search params", () => {
      const minimalParams = {
        query: "test search",
      };

      const result = SearchParamsSchema.safeParse(minimalParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxResults).toBe(20); // default
        expect(result.data.startIndex).toBe(0); // default
        expect(result.data.searchIn).toBe("all"); // default
      }
    });

    it("should reject empty query", () => {
      const invalidParams = {
        query: "", // Empty query should fail
      };

      const result = SearchParamsSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });

    it("should reject invalid maxResults", () => {
      const invalidParams = {
        query: "test",
        maxResults: 0, // Invalid: must be positive
      };

      const result = SearchParamsSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });

    it("should reject maxResults > 100", () => {
      const invalidParams = {
        query: "test",
        maxResults: 150, // Invalid: exceeds limit
      };

      const result = SearchParamsSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });
  });

  describe("SearchResultsSchema validation", () => {
    it("should validate complete search results", () => {
      const book: Book = {
        id: "book-123",
        title: "Test Book",
        authors: ["Author One"],
        source: "google-books",
        originalId: "original-123",
      };

      const validResults = {
        books: [book],
        totalItems: 1,
        startIndex: 0,
        itemsPerPage: 20,
        hasMore: false,
        query: "test search",
        source: "google-books" as const,
      };

      const result = SearchResultsSchema.safeParse(validResults);
      expect(result.success).toBe(true);
    });

    it("should validate empty search results", () => {
      const emptyResults = {
        books: [],
        totalItems: 0,
        startIndex: 0,
        itemsPerPage: 20,
        hasMore: false,
        query: "no results",
        source: "google-books" as const,
      };

      const result = SearchResultsSchema.safeParse(emptyResults);
      expect(result.success).toBe(true);
    });
  });

  describe("Parser functions", () => {
    it("parseBook should return valid book", () => {
      const validBookData = {
        id: "book-123",
        title: "Test Book",
        authors: ["Author One"],
        source: "google-books",
        originalId: "original-123",
      };

      const result = parseBook(validBookData);
      expect(result).not.toBeNull();
      expect(result?.id).toBe("book-123");
    });

    it("parseBook should return null for invalid data", () => {
      const invalidBookData = {
        title: "Test Book",
        // missing required fields
      };

      const result = parseBook(invalidBookData);
      expect(result).toBeNull();
    });

    it("parseSearchParams should return valid params", () => {
      const validParamsData = {
        query: "test search",
        maxResults: 10,
      };

      const result = parseSearchParams(validParamsData);
      expect(result).not.toBeNull();
      expect(result?.query).toBe("test search");
      expect(result?.maxResults).toBe(10);
    });

    it("parseSearchParams should return null for invalid data", () => {
      const invalidParamsData = {
        query: "", // empty query is invalid
      };

      const result = parseSearchParams(invalidParamsData);
      expect(result).toBeNull();
    });
  });

  describe("Type guards", () => {
    it("isBook should return true for valid book", () => {
      const validBook = {
        id: "book-123",
        title: "Test Book",
        authors: ["Author One"],
        source: "google-books",
        originalId: "original-123",
      };

      expect(isBook(validBook)).toBe(true);
    });

    it("isBook should return false for invalid book", () => {
      const invalidBook = {
        title: "Test Book",
        // missing required fields
      };

      expect(isBook(invalidBook)).toBe(false);
    });

    it("isSearchParams should return true for valid params", () => {
      const validParams = {
        query: "test search",
        maxResults: 20,
      };

      expect(isSearchParams(validParams)).toBe(true);
    });

    it("isSearchParams should return false for invalid params", () => {
      const invalidParams = {
        query: "", // empty query is invalid
      };

      expect(isSearchParams(invalidParams)).toBe(false);
    });

    it("isSearchResults should return true for valid results", () => {
      const validResults = {
        books: [],
        totalItems: 0,
        startIndex: 0,
        itemsPerPage: 20,
        hasMore: false,
        query: "test search",
        source: "google-books",
      };

      expect(isSearchResults(validResults)).toBe(true);
    });
  });

  describe("Type safety", () => {
    it("should provide proper TypeScript types", () => {
      const book: Book = {
        id: "book-123",
        title: "Test Book",
        authors: ["Author One"],
        source: "google-books",
        originalId: "original-123",
      };

      // TypeScript should infer these types correctly
      expect(typeof book.id).toBe("string");
      expect(typeof book.title).toBe("string");
      expect(Array.isArray(book.authors)).toBe(true);
      expect(book.source).toBe("google-books");
    });

    it("should support optional fields", () => {
      const bookWithOptionals: Book = {
        id: "book-123",
        title: "Test Book",
        authors: ["Author One"],
        description: "Optional description",
        pageCount: 200,
        averageRating: 4.5,
        source: "google-books",
        originalId: "original-123",
      };

      expect(bookWithOptionals.description).toBe("Optional description");
      expect(bookWithOptionals.pageCount).toBe(200);
      expect(bookWithOptionals.averageRating).toBe(4.5);
    });
  });
});
