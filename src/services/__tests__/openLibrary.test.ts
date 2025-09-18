import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenLibraryService, createOpenLibraryService } from "../openLibrary";
import type { SearchParams } from "../../types/book";
import type { OpenLibrarySearchResponse } from "../../types/api";

// Mock the API client
vi.mock("../../lib/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from "../../lib/apiClient";
const mockApiClient = vi.mocked(apiClient);

describe("OpenLibraryService", () => {
  let service: OpenLibraryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OpenLibraryService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should create service with default URLs", () => {
      const defaultService = new OpenLibraryService();
      expect(defaultService.isConfigured()).toBe(true);
    });

    it("should create service with custom URLs", () => {
      const customService = new OpenLibraryService(
        "https://custom-openlibrary.com",
        "https://custom-covers.com"
      );
      expect(customService).toBeInstanceOf(OpenLibraryService);
    });
  });

  describe("searchBooks", () => {
    const mockOpenLibraryResponse: OpenLibrarySearchResponse = {
      start: 0,
      num_found: 2,
      numFound: 2,
      docs: [
        {
          key: "/works/OL123W",
          type: "work",
          title: "Test Open Library Book 1",
          subtitle: "A Test Subtitle",
          author_name: ["Open Library Author 1", "Open Library Author 2"],
          author_key: ["/authors/OL1A", "/authors/OL2A"],
          first_publish_year: 2023,
          isbn: ["9781234567890", "1234567890"],
          cover_i: 123456,
          edition_count: 5,
          publisher: ["Test Publisher"],
          language: ["eng"],
          subject: ["Fiction", "Mystery", "Thriller"],
          number_of_pages_median: 250,
        },
        {
          key: "/works/OL456W",
          type: "work",
          title: "Test Open Library Book 2",
          author_name: ["Open Library Author 3"],
          author_key: ["/authors/OL3A"],
          first_publish_year: 2022,
        },
      ],
    };

    it("should search books successfully", async () => {
      mockApiClient.get.mockResolvedValue(mockOpenLibraryResponse);

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
      expect(result.source).toBe("open-library");
      expect(result.hasMore).toBe(false);
    });

    it("should handle title-specific search", async () => {
      mockApiClient.get.mockResolvedValue(mockOpenLibraryResponse);

      const searchParams: SearchParams = {
        query: "javascript",
        searchIn: "title",
      };

      await service.searchBooks(searchParams);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("q=title%3Ajavascript")
      );
    });

    it("should handle author-specific search", async () => {
      mockApiClient.get.mockResolvedValue(mockOpenLibraryResponse);

      const searchParams: SearchParams = {
        query: "john doe",
        searchIn: "author",
      };

      await service.searchBooks(searchParams);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("q=author%3Ajohn+doe")
      );
    });

    it("should handle pagination parameters", async () => {
      mockApiClient.get.mockResolvedValue(mockOpenLibraryResponse);

      const searchParams: SearchParams = {
        query: "test",
        maxResults: 10,
        startIndex: 20,
      };

      await service.searchBooks(searchParams);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("offset=20")
      );
      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("limit=10")
      );
    });

    it("should handle language filter", async () => {
      mockApiClient.get.mockResolvedValue(mockOpenLibraryResponse);

      const searchParams: SearchParams = {
        query: "test",
        language: "es",
      };

      await service.searchBooks(searchParams);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("language=es")
      );
    });

    it("should limit maxResults to 100", async () => {
      mockApiClient.get.mockResolvedValue(mockOpenLibraryResponse);

      const searchParams: SearchParams = {
        query: "test",
        maxResults: 150, // Should be limited to 100
      };

      await service.searchBooks(searchParams);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("limit=100")
      );
    });

    it("should handle publication year filters", async () => {
      mockApiClient.get.mockResolvedValue(mockOpenLibraryResponse);

      const searchParams: SearchParams = {
        query: "test",
        publishedAfter: 2000,
        publishedBefore: 2023,
      };

      await service.searchBooks(searchParams);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("first_publish_year%3A%5B2000+TO+2023%5D")
      );
    });

    it("should handle empty results", async () => {
      const emptyResponse: OpenLibrarySearchResponse = {
        start: 0,
        num_found: 0,
        numFound: 0,
        docs: [],
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
        "Open Library API is temporarily unavailable"
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
        "Network error while contacting Open Library API"
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
        "Open Library API request timed out"
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
        "Open Library API rate limit exceeded"
      );
    });
  });

  describe("getWorkDetails", () => {
    const mockWorkResponse = {
      key: "/works/OL123W",
      title: "Test Work Details",
      description: "Detailed work description",
      subjects: ["Fiction", "Mystery"],
      authors: [
        { author: { key: "/authors/OL1A" } },
        { author: { key: "/authors/OL2A" } },
      ],
      covers: [789012],
      first_publish_date: "2023-01-15",
    };

    const mockAuthorResponse = {
      name: "Test Author Name",
      personal_name: "Test Personal Name",
    };

    it("should get work details successfully", async () => {
      mockApiClient.get
        .mockResolvedValueOnce(mockWorkResponse) // Work details
        .mockResolvedValue(mockAuthorResponse); // Author details (multiple calls)

      const result = await service.getWorkDetails("OL123W");

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("works/OL123W.json")
      );
      expect(result).not.toBeNull();
      expect(result?.title).toBe("Test Work Details");
      expect(result?.description).toBe("Detailed work description");
      expect(result?.source).toBe("open-library");
      expect(result?.originalId).toBe("OL123W");
    });

    it("should handle work key with /works/ prefix", async () => {
      mockApiClient.get
        .mockResolvedValueOnce(mockWorkResponse)
        .mockResolvedValue(mockAuthorResponse);

      const result = await service.getWorkDetails("/works/OL123W");

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("works/OL123W.json")
      );
      expect(result).not.toBeNull();
    });

    it("should return null for 404 errors", async () => {
      const notFoundError = new Error("Not Found");
      (notFoundError as any).status = 404;
      mockApiClient.get.mockRejectedValue(notFoundError);

      const result = await service.getWorkDetails("nonexistent-id");

      expect(result).toBeNull();
    });

    it("should throw for other API errors", async () => {
      const serverError = new Error("Server Error");
      (serverError as any).status = 500;
      mockApiClient.get.mockRejectedValue(serverError);

      await expect(service.getWorkDetails("test-id")).rejects.toThrow(
        "Open Library API is temporarily unavailable"
      );
    });

    it("should handle description as object", async () => {
      const workWithDescriptionObject = {
        ...mockWorkResponse,
        description: {
          type: "/type/text",
          value: "Description from object value",
        },
      };

      mockApiClient.get
        .mockResolvedValueOnce(workWithDescriptionObject)
        .mockResolvedValue(mockAuthorResponse);

      const result = await service.getWorkDetails("OL123W");

      expect(result?.description).toBe("Description from object value");
    });

    it("should handle failed author lookups gracefully", async () => {
      mockApiClient.get
        .mockResolvedValueOnce(mockWorkResponse) // Work details
        .mockRejectedValue(new Error("Author not found")); // Author details fail

      const result = await service.getWorkDetails("OL123W");

      expect(result).not.toBeNull();
      expect(result?.authors).toEqual([]); // Should return empty array when author lookup fails
    });
  });

  describe("Data transformation", () => {
    it("should transform doc with complete data", async () => {
      const completeDoc = {
        key: "/works/OL789W",
        type: "work",
        title: "Complete Open Library Book",
        subtitle: "A Complete Subtitle",
        author_name: ["Complete Author One", "Complete Author Two"],
        author_key: ["/authors/OL1A", "/authors/OL2A"],
        first_publish_year: 2023,
        isbn: ["9781234567890", "1234567890"],
        cover_i: 654321,
        edition_count: 3,
        publisher: ["Complete Publisher", "Another Publisher"],
        language: ["eng", "spa"],
        subject: [
          "Technology",
          "Programming",
          "Software",
          "Computer Science",
          "Web Development",
        ],
        number_of_pages_median: 300,
      };

      mockApiClient.get.mockResolvedValue({
        start: 0,
        num_found: 1,
        numFound: 1,
        docs: [completeDoc],
      });

      const result = await service.searchBooks({ query: "test" });
      const book = result.books[0];

      expect(book.id).toBe("open-library-OL789W");
      expect(book.title).toBe("Complete Open Library Book");
      expect(book.authors).toEqual([
        "Complete Author One",
        "Complete Author Two",
      ]);
      expect(book.publishedDate).toBe("2023-01-01");
      expect(book.publisher).toBe("Complete Publisher"); // First publisher only
      expect(book.pageCount).toBe(300);
      expect(book.categories).toHaveLength(5); // Limited to 5 categories
      expect(book.language).toBe("eng"); // First language only
      expect(book.isbn10).toBe("1234567890");
      expect(book.isbn13).toBe("9781234567890");
      expect(book.thumbnail).toContain("654321-M.jpg"); // Medium cover
      expect(book.smallThumbnail).toContain("654321-S.jpg"); // Small cover
      expect(book.previewLink).toContain("/works/OL789W");
      expect(book.source).toBe("open-library");
      expect(book.originalId).toBe("OL789W");
    });

    it("should handle docs with minimal data", async () => {
      const minimalDoc = {
        key: "/works/OL999W",
        type: "work",
        title: "Minimal Book",
      };

      mockApiClient.get.mockResolvedValue({
        start: 0,
        num_found: 1,
        numFound: 1,
        docs: [minimalDoc],
      });

      const result = await service.searchBooks({ query: "test" });
      const book = result.books[0];

      expect(book.id).toBe("open-library-OL999W");
      expect(book.title).toBe("Minimal Book");
      expect(book.authors).toEqual([]); // Default empty array
      expect(book.source).toBe("open-library");
      expect(book.originalId).toBe("OL999W");
    });

    it("should generate correct cover URLs", async () => {
      const docWithCover = {
        key: "/works/OL888W",
        type: "work", // Required field for validation
        title: "Book with Cover",
        cover_i: 123456,
      };

      mockApiClient.get.mockResolvedValue({
        start: 0,
        num_found: 1,
        numFound: 1,
        docs: [docWithCover],
      });

      const result = await service.searchBooks({ query: "test" });
      const book = result.books[0];

      expect(book.smallThumbnail).toBe(
        "https://covers.openlibrary.org/b/id/123456-S.jpg"
      );
      expect(book.thumbnail).toBe(
        "https://covers.openlibrary.org/b/id/123456-M.jpg"
      );
      expect(book.mediumThumbnail).toBe(
        "https://covers.openlibrary.org/b/id/123456-L.jpg"
      );
      expect(book.largeThumbnail).toBe(
        "https://covers.openlibrary.org/b/id/123456-L.jpg"
      );
    });
  });

  describe("Configuration and utilities", () => {
    it("should report configuration status", () => {
      expect(service.isConfigured()).toBe(true);
    });

    it("should report rate limit information", () => {
      const rateLimit = service.getRateLimit();
      expect(rateLimit.hasKey).toBe(false); // No API key needed
      expect(rateLimit.unlimited).toBe(false); // Still has rate limits
    });
  });

  describe("Factory functions", () => {
    it("should create service with createOpenLibraryService", () => {
      const factoryService = createOpenLibraryService();
      expect(factoryService).toBeInstanceOf(OpenLibraryService);
    });

    it("should create service with custom URLs", () => {
      const customService = createOpenLibraryService(
        "https://custom-openlibrary.com",
        "https://custom-covers.com"
      );
      expect(customService).toBeInstanceOf(OpenLibraryService);
    });
  });

  describe("Error handling", () => {
    it("should handle invalid search queries", async () => {
      const badRequestError = new Error("Bad Request");
      (badRequestError as any).status = 400;
      mockApiClient.get.mockRejectedValue(badRequestError);

      await expect(service.searchBooks({ query: "test" })).rejects.toThrow(
        'Invalid search query for "test"'
      );
    });

    it("should handle parsing errors", async () => {
      const parseError = new Error(
        "Invalid Open Library API response: parsing failed"
      );
      mockApiClient.get.mockRejectedValue(parseError);

      await expect(service.searchBooks({ query: "test" })).rejects.toThrow(
        "Received invalid response from Open Library API"
      );
    });
  });
});
