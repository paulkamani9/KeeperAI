import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GoogleBooksService, createGoogleBooksService } from "../googleBooks";
import type { SearchParams } from "../../types/book";
import type { GoogleBooksResponse } from "../../types/api";

// Mock the API client
vi.mock("../../lib/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from "../../lib/apiClient";
const mockApiClient = vi.mocked(apiClient);

describe("GoogleBooksService", () => {
  let service: GoogleBooksService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GoogleBooksService("test-api-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should create service with API key", () => {
      const serviceWithKey = new GoogleBooksService("my-api-key");
      expect(serviceWithKey.isConfigured()).toBe(true);
    });

    it("should create service without API key", () => {
      const serviceWithoutKey = new GoogleBooksService();
      expect(serviceWithoutKey.isConfigured()).toBe(true);
    });

    it("should create service with custom base URL", () => {
      const customService = new GoogleBooksService(
        "key",
        "https://custom.api.com"
      );
      expect(customService).toBeInstanceOf(GoogleBooksService);
    });
  });

  describe("searchBooks", () => {
    const mockGoogleBooksResponse: GoogleBooksResponse = {
      kind: "books#volumes",
      totalItems: 2,
      items: [
        {
          kind: "books#volume",
          id: "test-id-1",
          etag: "test-etag",
          selfLink: "https://www.googleapis.com/books/v1/volumes/test-id-1",
          volumeInfo: {
            title: "Test Book 1",
            authors: ["Test Author 1"],
            publisher: "Test Publisher",
            publishedDate: "2023-01-01",
            description: "Test description for book 1",
            industryIdentifiers: [
              {
                type: "ISBN_13",
                identifier: "9781234567890",
              },
            ],
            pageCount: 200,
            categories: ["Fiction", "Mystery"],
            averageRating: 4.5,
            ratingsCount: 100,
            imageLinks: {
              smallThumbnail: "http://example.com/small.jpg",
              thumbnail: "http://example.com/thumb.jpg",
            },
            language: "en",
            previewLink: "https://books.google.com/preview/test-id-1",
            infoLink: "https://books.google.com/books?id=test-id-1",
          },
        },
        {
          kind: "books#volume",
          id: "test-id-2",
          volumeInfo: {
            title: "Test Book 2",
            authors: ["Test Author 2"],
            description: "Test description for book 2",
            language: "en",
          },
        },
      ],
    };

    it("should search books successfully", async () => {
      mockApiClient.get.mockResolvedValue(mockGoogleBooksResponse);

      const searchParams: SearchParams = {
        query: "test query",
        maxResults: 20,
        startIndex: 0,
      };

      const result = await service.searchBooks(searchParams);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("q=test+query")
      );
      expect(result.books).toHaveLength(2);
      expect(result.totalItems).toBe(2);
      expect(result.query).toBe("test query");
      expect(result.source).toBe("google-books");
      expect(result.hasMore).toBe(false);
    });

    it("should handle title-specific search", async () => {
      mockApiClient.get.mockResolvedValue(mockGoogleBooksResponse);

      const searchParams: SearchParams = {
        query: "javascript",
        searchIn: "title",
      };

      await service.searchBooks(searchParams);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("q=intitle%3Ajavascript")
      );
    });

    it("should handle author-specific search", async () => {
      mockApiClient.get.mockResolvedValue(mockGoogleBooksResponse);

      const searchParams: SearchParams = {
        query: "john doe",
        searchIn: "author",
      };

      await service.searchBooks(searchParams);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("q=inauthor%3Ajohn+doe")
      );
    });

    it("should handle pagination parameters", async () => {
      mockApiClient.get.mockResolvedValue(mockGoogleBooksResponse);

      const searchParams: SearchParams = {
        query: "test",
        maxResults: 10,
        startIndex: 20,
      };

      await service.searchBooks(searchParams);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("startIndex=20")
      );
      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("maxResults=10")
      );
    });

    it("should handle language filter", async () => {
      mockApiClient.get.mockResolvedValue(mockGoogleBooksResponse);

      const searchParams: SearchParams = {
        query: "test",
        language: "es",
      };

      await service.searchBooks(searchParams);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("langRestrict=es")
      );
    });

    it("should include API key when provided", async () => {
      mockApiClient.get.mockResolvedValue(mockGoogleBooksResponse);

      const searchParams: SearchParams = {
        query: "test",
      };

      await service.searchBooks(searchParams);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("key=test-api-key")
      );
    });

    it("should limit maxResults to 40", async () => {
      mockApiClient.get.mockResolvedValue(mockGoogleBooksResponse);

      const searchParams: SearchParams = {
        query: "test",
        maxResults: 100, // Should be limited to 40
      };

      await service.searchBooks(searchParams);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("maxResults=40")
      );
    });

    it("should handle empty results", async () => {
      const emptyResponse: GoogleBooksResponse = {
        kind: "books#volumes",
        totalItems: 0,
        items: [],
      };

      mockApiClient.get.mockResolvedValue(emptyResponse);

      const searchParams: SearchParams = {
        query: "nonexistent book",
      };

      const result = await service.searchBooks(searchParams);

      expect(result.books).toHaveLength(0);
      expect(result.totalItems).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it("should handle API errors gracefully", async () => {
      const apiError = new Error("API Error");
      (apiError as any).status = 500;
      mockApiClient.get.mockRejectedValue(apiError);

      const searchParams: SearchParams = {
        query: "test",
      };

      await expect(service.searchBooks(searchParams)).rejects.toThrow(
        "Google Books API is temporarily unavailable"
      );
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network Error");
      (networkError as any).isNetworkError = true;
      mockApiClient.get.mockRejectedValue(networkError);

      const searchParams: SearchParams = {
        query: "test",
      };

      await expect(service.searchBooks(searchParams)).rejects.toThrow(
        "Network error while contacting Google Books API"
      );
    });

    it("should handle timeout errors", async () => {
      const timeoutError = new Error("Timeout Error");
      (timeoutError as any).isTimeout = true;
      mockApiClient.get.mockRejectedValue(timeoutError);

      const searchParams: SearchParams = {
        query: "test",
      };

      await expect(service.searchBooks(searchParams)).rejects.toThrow(
        "Google Books API request timed out"
      );
    });

    it("should handle rate limit errors", async () => {
      const rateLimitError = new Error("Rate Limited");
      (rateLimitError as any).status = 429;
      mockApiClient.get.mockRejectedValue(rateLimitError);

      const searchParams: SearchParams = {
        query: "test",
      };

      await expect(service.searchBooks(searchParams)).rejects.toThrow(
        "Google Books API rate limit exceeded"
      );
    });
  });

  describe("getBookDetails", () => {
    const mockVolumeResponse = {
      kind: "books#volume",
      id: "test-id",
      etag: "test-etag",
      volumeInfo: {
        title: "Test Book Details",
        authors: ["Detail Author"],
        description: "Detailed description",
        publishedDate: "2023-01-01",
        publisher: "Detail Publisher",
        pageCount: 300,
        language: "en",
      },
    };

    it("should get book details successfully", async () => {
      mockApiClient.get.mockResolvedValue(mockVolumeResponse);

      const result = await service.getBookDetails("test-id");

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("volumes/test-id")
      );
      expect(result).not.toBeNull();
      expect(result?.title).toBe("Test Book Details");
      expect(result?.authors).toEqual(["Detail Author"]);
      expect(result?.source).toBe("google-books");
      expect(result?.originalId).toBe("test-id");
    });

    it("should return null for 404 errors", async () => {
      const notFoundError = new Error("Not Found");
      (notFoundError as any).status = 404;
      mockApiClient.get.mockRejectedValue(notFoundError);

      const result = await service.getBookDetails("nonexistent-id");

      expect(result).toBeNull();
    });

    it("should throw for other API errors", async () => {
      const serverError = new Error("Server Error");
      (serverError as any).status = 500;
      mockApiClient.get.mockRejectedValue(serverError);

      await expect(service.getBookDetails("test-id")).rejects.toThrow(
        "Google Books API is temporarily unavailable"
      );
    });
  });

  describe("Data transformation", () => {
    it("should transform volume with complete data", async () => {
      const completeVolume = {
        kind: "books#volume",
        id: "complete-id",
        volumeInfo: {
          title: "Complete Book",
          authors: ["Author One", "Author Two"],
          publisher: "Complete Publisher",
          publishedDate: "2023-05-15",
          description: "<p>HTML <b>description</b> with &amp; entities</p>",
          industryIdentifiers: [
            { type: "ISBN_10", identifier: "1234567890" },
            { type: "ISBN_13", identifier: "9781234567890" },
          ],
          pageCount: 250,
          categories: ["Technology", "Programming"],
          averageRating: 4.2,
          ratingsCount: 75,
          imageLinks: {
            smallThumbnail: "http://example.com/small.jpg",
            thumbnail: "http://example.com/thumb.jpg",
            small: "http://example.com/small-alt.jpg",
            medium: "http://example.com/medium.jpg",
          },
          language: "en",
          previewLink: "https://books.google.com/preview/complete-id",
          infoLink: "https://books.google.com/info/complete-id",
        },
      };

      mockApiClient.get.mockResolvedValue({
        kind: "books#volumes",
        totalItems: 1,
        items: [completeVolume],
      });

      const result = await service.searchBooks({ query: "test" });
      const book = result.books[0];

      expect(book.id).toBe("google-books-complete-id");
      expect(book.title).toBe("Complete Book");
      expect(book.authors).toEqual(["Author One", "Author Two"]);
      expect(book.publisher).toBe("Complete Publisher");
      expect(book.publishedDate).toBe("2023-05-15");
      expect(book.description).toBe("HTML description with & entities"); // HTML cleaned
      expect(book.isbn10).toBe("1234567890");
      expect(book.isbn13).toBe("9781234567890");
      expect(book.pageCount).toBe(250);
      expect(book.categories).toEqual(["Technology", "Programming"]);
      expect(book.averageRating).toBe(4.2);
      expect(book.ratingsCount).toBe(75);
      expect(book.thumbnail).toBe("https://example.com/thumb.jpg"); // HTTP -> HTTPS
      expect(book.smallThumbnail).toBe("https://example.com/small.jpg");
      expect(book.language).toBe("en");
      expect(book.previewLink).toBe(
        "https://books.google.com/preview/complete-id"
      );
      expect(book.infoLink).toBe("https://books.google.com/info/complete-id");
      expect(book.source).toBe("google-books");
      expect(book.originalId).toBe("complete-id");
    });

    it("should handle volumes with minimal data", async () => {
      const minimalVolume = {
        kind: "books#volume",
        id: "minimal-id",
        volumeInfo: {
          title: "Minimal Book",
        },
      };

      mockApiClient.get.mockResolvedValue({
        kind: "books#volumes",
        totalItems: 1,
        items: [minimalVolume],
      });

      const result = await service.searchBooks({ query: "test" });
      const book = result.books[0];

      expect(book.id).toBe("google-books-minimal-id");
      expect(book.title).toBe("Minimal Book");
      expect(book.authors).toEqual([]); // Default empty array
      expect(book.source).toBe("google-books");
      expect(book.originalId).toBe("minimal-id");
    });
  });

  describe("Configuration and utilities", () => {
    it("should report configuration status", () => {
      expect(service.isConfigured()).toBe(true);
    });

    it("should report rate limit information with API key", () => {
      const rateLimit = service.getRateLimit();
      expect(rateLimit.hasKey).toBe(true);
      expect(rateLimit.unlimited).toBe(false);
    });

    it("should report rate limit information without API key", () => {
      const serviceWithoutKey = new GoogleBooksService();
      const rateLimit = serviceWithoutKey.getRateLimit();
      expect(rateLimit.hasKey).toBe(false);
      expect(rateLimit.unlimited).toBe(false);
    });
  });

  describe("Factory functions", () => {
    it("should create service with createGoogleBooksService", () => {
      const factoryService = createGoogleBooksService("factory-key");
      expect(factoryService).toBeInstanceOf(GoogleBooksService);
    });

    it("should create service with custom base URL", () => {
      const customService = createGoogleBooksService(
        "key",
        "https://custom.api.com"
      );
      expect(customService).toBeInstanceOf(GoogleBooksService);
    });
  });
});
