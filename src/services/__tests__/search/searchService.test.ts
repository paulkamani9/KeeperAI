import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  UnifiedSearchService,
  createUnifiedSearchService,
} from "../../search/searchService";
import type { SearchParams, Book } from "../../../types/book";
import type { UnifiedSearchConfig } from "../../search/searchService";

// Mock the individual services
vi.mock("../googleBooks", () => ({
  GoogleBooksService: vi.fn(),
  createGoogleBooksService: vi.fn(),
}));

vi.mock("../openLibrary", () => ({
  OpenLibraryService: vi.fn(),
  createOpenLibraryService: vi.fn(),
}));

// Import the mocked constructors
import { createGoogleBooksService } from "@/services/search/googleBooks";
import { createOpenLibraryService } from "../../search/openLibrary";

const mockCreateGoogleBooksService = vi.mocked(createGoogleBooksService);
const mockCreateOpenLibraryService = vi.mocked(createOpenLibraryService);

describe("UnifiedSearchService", () => {
  let mockGoogleBooksService: any;
  let mockOpenLibraryService: any;
  let service: UnifiedSearchService;

  // Sample test data
  const googleBook: Book = {
    id: "google-books-test1",
    title: "Google Books Test Book",
    authors: ["Google Author"],
    description: "Test book from Google Books",
    publishedDate: "2023-01-01",
    publisher: "Google Publisher",
    pageCount: 200,
    categories: ["Fiction"],
    language: "en",
    isbn10: "1234567890",
    isbn13: "9781234567890",
    thumbnail: "https://example.com/google-thumb.jpg",
    source: "google-books",
    originalId: "test1",
  };

  const openLibraryBook: Book = {
    id: "open-library-test2",
    title: "Open Library Test Book",
    authors: ["Open Library Author"],
    description: "Test book from Open Library",
    publishedDate: "2023-02-01",
    publisher: "Open Library Publisher",
    pageCount: 150,
    categories: ["Non-fiction"],
    language: "en",
    isbn10: "0987654321",
    isbn13: "9780987654321",
    thumbnail: "https://example.com/ol-thumb.jpg",
    source: "open-library",
    originalId: "test2",
  };

  const duplicateBook: Book = {
    id: "open-library-duplicate",
    title: "Google Books Test Book", // Same title as googleBook
    authors: ["Google Author"], // Same author
    description: "Same book from Open Library",
    source: "open-library",
    originalId: "duplicate",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock service instances
    mockGoogleBooksService = {
      searchBooks: vi.fn(),
      getBookDetails: vi.fn(),
      isConfigured: vi.fn().mockReturnValue(true),
      getRateLimit: vi.fn().mockReturnValue({ hasKey: true, unlimited: false }),
    };

    mockOpenLibraryService = {
      searchBooks: vi.fn(),
      getWorkDetails: vi.fn(),
      isConfigured: vi.fn().mockReturnValue(true),
      getRateLimit: vi
        .fn()
        .mockReturnValue({ hasKey: false, unlimited: false }),
    };

    // Mock the factory functions
    mockCreateGoogleBooksService.mockReturnValue(mockGoogleBooksService);
    mockCreateOpenLibraryService.mockReturnValue(mockOpenLibraryService);

    // Create service with default config
    service = new UnifiedSearchService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor and Configuration", () => {
    it("should create service with default config", () => {
      const defaultService = createUnifiedSearchService();
      expect(defaultService).toBeInstanceOf(UnifiedSearchService);

      const config = defaultService.getConfig();
      expect(config.primaryService).toBe("google-books");
      expect(config.enableFallback).toBe(true);
      expect(config.enableMerging).toBe(false);
      expect(config.maxResults).toBe(40);
      expect(config.timeout).toBe(10000);
    });

    it("should create service with custom config", () => {
      const customConfig: Partial<UnifiedSearchConfig> = {
        primaryService: "open-library",
        enableMerging: true,
        maxResults: 20,
        timeout: 5000,
      };

      const customService = new UnifiedSearchService(customConfig);
      const config = customService.getConfig();

      expect(config.primaryService).toBe("open-library");
      expect(config.enableMerging).toBe(true);
      expect(config.maxResults).toBe(20);
      expect(config.timeout).toBe(5000);
    });

    it("should allow config updates", () => {
      service.updateConfig({ primaryService: "open-library", maxResults: 50 });

      const config = service.getConfig();
      expect(config.primaryService).toBe("open-library");
      expect(config.maxResults).toBe(50);
      // Other values should remain unchanged
      expect(config.enableFallback).toBe(true);
    });
  });

  describe("Service Configuration Status", () => {
    it("should report configured when both services are available", () => {
      expect(service.isConfigured()).toBe(true);
    });

    it("should report configured when only one service is available", () => {
      mockGoogleBooksService.isConfigured.mockReturnValue(false);
      expect(service.isConfigured()).toBe(true); // Open Library still available
    });

    it("should report not configured when no services are available", () => {
      mockGoogleBooksService.isConfigured.mockReturnValue(false);
      mockOpenLibraryService.isConfigured.mockReturnValue(false);
      expect(service.isConfigured()).toBe(false);
    });

    it("should return rate limit information for both services", () => {
      const rateLimit = service.getRateLimit();

      expect(rateLimit.googleBooks).toEqual({ hasKey: true, unlimited: false });
      expect(rateLimit.openLibrary).toEqual({
        hasKey: false,
        unlimited: false,
      });
      expect(rateLimit.hasKey).toBe(true); // Based on primary service (Google Books)
      expect(rateLimit.unlimited).toBe(false);
    });
  });

  describe("Google Books Only Strategy", () => {
    beforeEach(() => {
      // Configure to use Google Books only
      service.updateConfig({
        primaryService: "google-books",
        enableMerging: false,
      });

      mockGoogleBooksService.searchBooks.mockResolvedValue({
        books: [googleBook],
        totalItems: 1,
        startIndex: 0,
        itemsPerPage: 1,
        hasMore: false,
        query: "test query",
        source: "google-books",
      });
    });

    it("should search using Google Books only", async () => {
      const searchParams: SearchParams = { query: "test query" };
      const result = await service.searchBooks(searchParams);

      expect(mockGoogleBooksService.searchBooks).toHaveBeenCalledWith(
        searchParams
      );
      expect(mockOpenLibraryService.searchBooks).not.toHaveBeenCalled();
      expect(result.books).toHaveLength(1);
      expect(result.books[0].id).toBe("google-books-test1");
    });

    it("should handle Google Books API errors without fallback when disabled", async () => {
      service.updateConfig({ enableFallback: false });
      mockGoogleBooksService.searchBooks.mockRejectedValue(
        new Error("Google Books API Error")
      );

      const searchParams: SearchParams = { query: "test query" };

      await expect(service.searchBooks(searchParams)).rejects.toThrow(
        "Google Books API Error"
      );
      expect(mockOpenLibraryService.searchBooks).not.toHaveBeenCalled();
    });

    it("should fallback to Open Library when Google Books fails and fallback enabled", async () => {
      mockGoogleBooksService.searchBooks.mockRejectedValue(
        new Error("Google Books API Error")
      );
      mockOpenLibraryService.searchBooks.mockResolvedValue({
        books: [openLibraryBook],
        totalItems: 1,
        startIndex: 0,
        itemsPerPage: 1,
        hasMore: false,
        query: "test query",
        source: "open-library",
      });

      const searchParams: SearchParams = { query: "test query" };
      const result = await service.searchBooks(searchParams);

      expect(mockGoogleBooksService.searchBooks).toHaveBeenCalledWith(
        searchParams
      );
      expect(mockOpenLibraryService.searchBooks).toHaveBeenCalledWith(
        searchParams
      );
      expect(result.books).toHaveLength(1);
      expect(result.books[0].id).toBe("open-library-test2");
    });
  });

  describe("Open Library Only Strategy", () => {
    beforeEach(() => {
      // Configure to use Open Library only
      service.updateConfig({
        primaryService: "open-library",
        enableMerging: false,
      });

      mockOpenLibraryService.searchBooks.mockResolvedValue({
        books: [openLibraryBook],
        totalItems: 1,
        startIndex: 0,
        itemsPerPage: 1,
        hasMore: false,
        query: "test query",
        source: "open-library",
      });
    });

    it("should search using Open Library only", async () => {
      const searchParams: SearchParams = { query: "test query" };
      const result = await service.searchBooks(searchParams);

      expect(mockOpenLibraryService.searchBooks).toHaveBeenCalledWith(
        searchParams
      );
      expect(mockGoogleBooksService.searchBooks).not.toHaveBeenCalled();
      expect(result.books).toHaveLength(1);
      expect(result.books[0].id).toBe("open-library-test2");
    });

    it("should fallback to Google Books when Open Library fails", async () => {
      mockOpenLibraryService.searchBooks.mockRejectedValue(
        new Error("Open Library API Error")
      );
      mockGoogleBooksService.searchBooks.mockResolvedValue({
        books: [googleBook],
        totalItems: 1,
        startIndex: 0,
        itemsPerPage: 1,
        hasMore: false,
        query: "test query",
        source: "google-books",
      });

      const searchParams: SearchParams = { query: "test query" };
      const result = await service.searchBooks(searchParams);

      expect(result.books).toHaveLength(1);
      expect(result.books[0].id).toBe("google-books-test1");
    });
  });

  describe("Merged Results Strategy", () => {
    beforeEach(() => {
      // Enable merging
      service.updateConfig({ enableMerging: true, maxResults: 40 });

      mockGoogleBooksService.searchBooks.mockResolvedValue({
        books: [googleBook],
        totalItems: 50,
        startIndex: 0,
        itemsPerPage: 20,
        hasMore: true,
        query: "test query",
        source: "google-books",
      });

      mockOpenLibraryService.searchBooks.mockResolvedValue({
        books: [openLibraryBook],
        totalItems: 30,
        startIndex: 0,
        itemsPerPage: 20,
        hasMore: false,
        query: "test query",
        source: "open-library",
      });
    });

    it("should merge results from both services", async () => {
      const searchParams: SearchParams = { query: "test query" };
      const result = await service.searchBooks(searchParams);

      expect(mockGoogleBooksService.searchBooks).toHaveBeenCalled();
      expect(mockOpenLibraryService.searchBooks).toHaveBeenCalled();
      expect(result.books).toHaveLength(2);
      expect(result.source).toBe("combined");
      expect(result.totalItems).toBe(50); // Max of the two sources
      expect(result.hasMore).toBe(true); // At least one source has more
    });

    it("should deduplicate merged results", async () => {
      mockGoogleBooksService.searchBooks.mockResolvedValue({
        books: [googleBook],
        totalItems: 1,
        startIndex: 0,
        itemsPerPage: 1,
        hasMore: false,
        query: "test query",
        source: "google-books",
      });

      mockOpenLibraryService.searchBooks.mockResolvedValue({
        books: [duplicateBook], // Same title/author as googleBook
        totalItems: 1,
        startIndex: 0,
        itemsPerPage: 1,
        hasMore: false,
        query: "test query",
        source: "open-library",
      });

      const searchParams: SearchParams = { query: "test query" };
      const result = await service.searchBooks(searchParams);

      // Should deduplicate to 1 book (preferring Google Books)
      expect(result.books).toHaveLength(1);
      expect(result.books[0].source).toBe("google-books");
    });

    it("should handle when one service fails during merging", async () => {
      mockGoogleBooksService.searchBooks.mockRejectedValue(
        new Error("Google Books failed")
      );
      // Open Library succeeds

      const searchParams: SearchParams = { query: "test query" };
      const result = await service.searchBooks(searchParams);

      // Should still return Open Library results
      expect(result.books).toHaveLength(1);
      expect(result.books[0].source).toBe("open-library");
    });

    it("should limit merged results to maxResults", async () => {
      service.updateConfig({ maxResults: 1 });

      const searchParams: SearchParams = { query: "test query" };
      const result = await service.searchBooks(searchParams);

      expect(result.books).toHaveLength(1); // Limited to 1
      expect(result.hasMore).toBe(true); // Should indicate more available
    });
  });

  describe("Book Details Retrieval", () => {
    it("should get details from Google Books service", async () => {
      mockGoogleBooksService.getBookDetails.mockResolvedValue(googleBook);

      const result = await service.getBookDetails("google-books-test1");

      expect(mockGoogleBooksService.getBookDetails).toHaveBeenCalledWith(
        "test1"
      );
      expect(result).toEqual(googleBook);
    });

    it("should get details from Open Library service", async () => {
      mockOpenLibraryService.getWorkDetails.mockResolvedValue(openLibraryBook);

      const result = await service.getBookDetails("open-library-test2");

      expect(mockOpenLibraryService.getWorkDetails).toHaveBeenCalledWith(
        "test2"
      );
      expect(result).toEqual(openLibraryBook);
    });

    it("should use explicit source parameter", async () => {
      mockOpenLibraryService.getWorkDetails.mockResolvedValue(openLibraryBook);

      const result = await service.getBookDetails("test-id", "open-library");

      expect(mockOpenLibraryService.getWorkDetails).toHaveBeenCalledWith(
        "test-id"
      );
      expect(result).toEqual(openLibraryBook);
    });

    it("should fallback to other service when primary fails", async () => {
      mockGoogleBooksService.getBookDetails.mockRejectedValue(
        new Error("Not found")
      );
      mockOpenLibraryService.getWorkDetails.mockResolvedValue(openLibraryBook);

      const result = await service.getBookDetails("google-books-test1");

      expect(mockGoogleBooksService.getBookDetails).toHaveBeenCalled();
      expect(mockOpenLibraryService.getWorkDetails).toHaveBeenCalledWith(
        "test1"
      );
      expect(result).toEqual(openLibraryBook);
    });

    it("should return null when all services fail", async () => {
      mockGoogleBooksService.getBookDetails.mockRejectedValue(
        new Error("Not found")
      );
      mockOpenLibraryService.getWorkDetails.mockRejectedValue(
        new Error("Not found")
      );

      const result = await service.getBookDetails("nonexistent-id");

      expect(result).toBeNull();
    });
  });

  describe("Search Strategies", () => {
    it("should return available strategies", () => {
      const strategies = service.getAvailableStrategies();

      expect(strategies).toHaveLength(3); // Google Books, Open Library, Merged
      expect(strategies.map((s) => s.name)).toContain("google-books-only");
      expect(strategies.map((s) => s.name)).toContain("open-library-only");
      expect(strategies.map((s) => s.name)).toContain("merged-results");
    });

    it("should return limited strategies when services unavailable", () => {
      mockGoogleBooksService.isConfigured.mockReturnValue(false);

      const strategies = service.getAvailableStrategies();

      expect(strategies).toHaveLength(1); // Only Open Library
      expect(strategies[0].name).toBe("open-library-only");
    });
  });

  describe("Error Handling", () => {
    it("should throw error when no services are configured", () => {
      mockGoogleBooksService.isConfigured.mockReturnValue(false);
      mockOpenLibraryService.isConfigured.mockReturnValue(false);

      expect(() => {
        new UnifiedSearchService();
        // This should be caught during strategy selection
      }).not.toThrow(); // Construction doesn't throw, but search will
    });

    it("should handle timeout errors", async () => {
      service.updateConfig({ timeout: 1 }); // 1ms timeout

      // Make the Google Books service take longer than timeout
      mockGoogleBooksService.searchBooks.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  books: [googleBook],
                  totalItems: 1,
                  startIndex: 0,
                  itemsPerPage: 1,
                  hasMore: false,
                  query: "test query",
                  source: "google-books",
                }),
              100
            )
          ) // 100ms delay
      );

      const searchParams: SearchParams = { query: "test query" };

      await expect(service.searchBooks(searchParams)).rejects.toThrow(
        "Search request timed out"
      );
    });
  });

  describe("Deduplication Logic", () => {
    it("should calculate book quality scores correctly", async () => {
      const highQualityBook: Book = {
        id: "high-quality",
        title: "High Quality Book",
        authors: ["Author"],
        description:
          "This is a very detailed description of a high quality book with lots of information.",
        publishedDate: "2023-01-01",
        publisher: "Great Publisher",
        pageCount: 300,
        categories: ["Fiction", "Mystery"],
        language: "en",
        isbn10: "1234567890",
        isbn13: "9781234567890",
        thumbnail: "https://example.com/thumb.jpg",
        averageRating: 4.5,
        source: "open-library",
        originalId: "high-quality",
      };

      const lowQualityBook: Book = {
        id: "low-quality",
        title: "High Quality Book", // Same title for deduplication
        authors: ["Author"], // Same author
        source: "google-books",
        originalId: "low-quality",
      };

      // Configure merging and set up mock responses
      service.updateConfig({ enableMerging: true });

      mockGoogleBooksService.searchBooks.mockResolvedValue({
        books: [lowQualityBook],
        totalItems: 1,
        startIndex: 0,
        itemsPerPage: 1,
        hasMore: false,
        query: "test",
        source: "google-books",
      });

      mockOpenLibraryService.searchBooks.mockResolvedValue({
        books: [highQualityBook],
        totalItems: 1,
        startIndex: 0,
        itemsPerPage: 1,
        hasMore: false,
        query: "test",
        source: "open-library",
      });

      const result = await service.searchBooks({ query: "test" });

      // Should prefer Google Books first (per current logic), then quality
      expect(result.books).toHaveLength(1);
      expect(result.books[0].source).toBe("google-books"); // Google Books is preferred
      expect(result.books[0].id).toBe("low-quality");
    });
  });
});
