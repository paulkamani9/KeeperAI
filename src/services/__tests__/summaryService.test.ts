/**
 * Unit tests for summary service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createSummaryService,
  createDefaultSummaryService,
} from "../summaryService";
import type { Book } from "../../types/book";
import type {
  SummaryService,
  SummaryGenerationOptions,
} from "../summaryService";

// Mock OpenAI module
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

// Mock environment config
vi.mock("../../lib/environmentConfig", () => ({
  featureFlags: {
    openaiApi: false, // Default to false for testing
  },
}));

describe("SummaryService", () => {
  const mockBook: Book = {
    id: "test-book-123",
    title: "The Art of Testing",
    authors: ["Jane Developer", "John Coder"],
    description:
      "A comprehensive guide to writing effective tests for modern applications.",
    publishedDate: "2024-01-01",
    publisher: "Tech Press",
    pageCount: 300,
    categories: ["Programming", "Testing"],
    language: "en",
    source: "google-books",
    originalId: "google-123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createSummaryService factory", () => {
    it("should create mock service when useMock is true", () => {
      const service = createSummaryService(undefined, true);

      expect(service).toBeDefined();
      expect(service.isConfigured()).toBe(true);
      expect(service.getAvailableModels()).toContain("mock-gpt-4");
    });

    it("should create mock service when no API key and in development", () => {
      const originalEnv = process.env.NODE_ENV;
      vi.stubEnv("NODE_ENV", "development");

      const service = createSummaryService();

      expect(service).toBeDefined();
      expect(service.isConfigured()).toBe(true);

      vi.stubEnv("NODE_ENV", originalEnv);
    });

    it("should throw error when no API key and not using mock", () => {
      expect(() => {
        createSummaryService(undefined, false);
      }).toThrow("OpenAI API key is required");
    });

    it("should create OpenAI service with valid API key", () => {
      const service = createSummaryService("test-api-key", false);

      expect(service).toBeDefined();
      expect(service.getAvailableModels()).toContain("gpt-4o");
    });
  });

  describe("MockSummaryService", () => {
    let service: SummaryService;

    beforeEach(() => {
      service = createSummaryService(undefined, true);
    });

    it("should be configured", () => {
      expect(service.isConfigured()).toBe(true);
    });

    it("should have rate limit info", () => {
      const rateLimit = service.getRateLimit();
      expect(rateLimit.hasKey).toBe(true);
      expect(rateLimit.requestsLeft).toBe(1000);
    });

    it("should have available models", () => {
      const models = service.getAvailableModels();
      expect(models).toContain("mock-gpt-4");
      expect(models).toContain("mock-gpt-3.5");
    });

    it("should test connection successfully", async () => {
      const result = await service.testConnection();
      expect(result).toBe(true);
    });

    describe("generateSummary", () => {
      it("should generate concise summary", async () => {
        const result = await service.generateSummary(mockBook, "concise");

        expect(result).toBeDefined();
        expect(result.content).toBeTruthy();
        expect(result.generationTime).toBeGreaterThan(0);
        expect(result.aiModel).toBe("mock-gpt-4");
        expect(result.promptVersion).toBe("v1.0-mock");
        expect(result.usage).toBeDefined();
        expect(result.metadata.bookDataSource).toBe(mockBook.source);
        expect(result.metadata.hadBookDescription).toBe(true);
      });

      it("should generate detailed summary", async () => {
        const result = await service.generateSummary(mockBook, "detailed");

        expect(result.content).toContain("detailed");
        expect(result.content).toContain(mockBook.title);
      });

      it("should generate analysis summary", async () => {
        const result = await service.generateSummary(mockBook, "analysis");

        expect(result.content).toContain("analysis");
        expect(result.content).toContain(mockBook.title);
      });

      it("should generate practical summary", async () => {
        const result = await service.generateSummary(mockBook, "practical");

        expect(result.content).toContain("practical");
        expect(result.content).toContain(mockBook.title);
      });

      it("should handle book without description", async () => {
        const bookWithoutDescription = { ...mockBook, description: undefined };

        const result = await service.generateSummary(
          bookWithoutDescription,
          "concise"
        );

        expect(result.metadata.hadBookDescription).toBe(false);
        expect(result.content).toContain("No description available");
      });

      it("should respect generation options", async () => {
        const options: SummaryGenerationOptions = {
          model: "custom-model",
          maxTokens: 500,
          temperature: 0.5,
          additionalContext: "Focus on technical aspects",
        };

        const result = await service.generateSummary(
          mockBook,
          "concise",
          options
        );

        expect(result).toBeDefined();
        expect(result.content).toBeTruthy();
      });

      it("should calculate word count and reading time", async () => {
        const result = await service.generateSummary(mockBook, "concise");

        expect(result.usage?.completionTokens).toBeGreaterThan(0);
        expect(result.usage?.totalTokens).toBeGreaterThan(0);
        expect(result.usage?.estimatedCost).toBeDefined();
      });
    });
  });

  describe("OpenAISummaryService", () => {
    let mockOpenAI: any;
    let service: SummaryService;

    beforeEach(async () => {
      // Import the mocked OpenAI
      const { default: OpenAI } = await import("openai");
      mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn(),
          },
        },
      };
      vi.mocked(OpenAI).mockImplementation(() => mockOpenAI);

      service = createSummaryService("test-api-key", false);
    });

    it("should throw error without API key", () => {
      expect(() => {
        // Test by trying to create service without API key and not using mock
        createSummaryService(undefined, false);
      }).toThrow("OpenAI API key is required");
    });

    describe("generateSummary", () => {
      it("should validate inputs", async () => {
        const invalidBook = { ...mockBook, title: "" };

        await expect(
          service.generateSummary(invalidBook, "concise")
        ).rejects.toThrow("Book title is required");
      });

      it("should validate authors", async () => {
        const invalidBook = { ...mockBook, authors: [] };

        await expect(
          service.generateSummary(invalidBook, "concise")
        ).rejects.toThrow("Book authors are required");
      });

      it("should validate summary type", async () => {
        await expect(
          service.generateSummary(mockBook, "invalid" as any)
        ).rejects.toThrow("Invalid summary type");
      });

      it("should handle successful OpenAI response", async () => {
        const mockResponse = {
          choices: [
            {
              message: {
                content: "This is a generated summary of the test book.",
              },
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 200,
            total_tokens: 300,
          },
        };

        mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

        const result = await service.generateSummary(mockBook, "concise");

        expect(result.content).toBe(
          "This is a generated summary of the test book."
        );
        expect(result.usage?.promptTokens).toBe(100);
        expect(result.usage?.completionTokens).toBe(200);
        expect(result.usage?.totalTokens).toBe(300);
        expect(result.usage?.estimatedCost).toBeGreaterThan(0);
      });

      it("should handle empty OpenAI response", async () => {
        mockOpenAI.chat.completions.create.mockResolvedValue({
          choices: [{ message: { content: null } }],
        });

        await expect(
          service.generateSummary(mockBook, "concise")
        ).rejects.toThrow("No content generated by OpenAI");
      });

      it("should handle OpenAI API errors", async () => {
        mockOpenAI.chat.completions.create.mockRejectedValue(
          new Error("API rate limit exceeded")
        );

        await expect(
          service.generateSummary(mockBook, "concise")
        ).rejects.toThrow("Summary generation failed");
      });

      it("should handle timeout", async () => {
        // Mock a delayed response
        mockOpenAI.chat.completions.create.mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 2000))
        );

        await expect(
          service.generateSummary(mockBook, "concise", { timeout: 1000 })
        ).rejects.toThrow("OpenAI request timeout");
      });

      it("should use custom options", async () => {
        const mockResponse = {
          choices: [{ message: { content: "Generated content" } }],
          usage: {
            prompt_tokens: 50,
            completion_tokens: 100,
            total_tokens: 150,
          },
        };

        mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

        const options: SummaryGenerationOptions = {
          model: "gpt-4",
          maxTokens: 800,
          temperature: 0.3,
          additionalContext: "Focus on practical applications",
        };

        await service.generateSummary(mockBook, "practical", options);

        expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            model: "gpt-4",
            max_tokens: 800,
            temperature: 0.3,
          })
        );
      });
    });

    describe("testConnection", () => {
      it("should return true for successful connection", async () => {
        mockOpenAI.chat.completions.create.mockResolvedValue({
          choices: [{ message: { content: "Test response" } }],
        });

        const result = await service.testConnection();
        expect(result).toBe(true);
      });

      it("should return false for failed connection", async () => {
        mockOpenAI.chat.completions.create.mockRejectedValue(
          new Error("Connection failed")
        );

        const result = await service.testConnection();
        expect(result).toBe(false);
      });
    });

    it("should have correct available models", () => {
      const models = service.getAvailableModels();

      expect(models).toContain("gpt-4o");
      expect(models).toContain("gpt-4o-mini");
      expect(models).toContain("gpt-4-turbo");
      expect(models).toContain("gpt-4");
      expect(models).toContain("gpt-3.5-turbo");
    });
  });

  describe("createDefaultSummaryService", () => {
    it("should create service based on environment configuration", () => {
      const service = createDefaultSummaryService();

      expect(service).toBeDefined();
      // Should use mock service since featureFlags.openaiApi is false in our mock
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle various book formats", async () => {
      const service = createSummaryService(undefined, true);

      // Test with minimal book data
      const minimalBook: Book = {
        id: "minimal",
        title: "Minimal Book",
        authors: ["Author"],
        source: "open-library",
        originalId: "ol-123",
      };

      const result = await service.generateSummary(minimalBook, "concise");
      expect(result.content).toBeTruthy();
      expect(result.metadata.hadBookDescription).toBe(false);
    });

    it("should handle all summary types", async () => {
      const service = createSummaryService(undefined, true);
      const summaryTypes: Array<
        "concise" | "detailed" | "analysis" | "practical"
      > = ["concise", "detailed", "analysis", "practical"];

      for (const type of summaryTypes) {
        const result = await service.generateSummary(mockBook, type);
        expect(result.content).toBeTruthy();
        expect(result.content.toLowerCase()).toContain(type);
      }
    });

    it("should provide consistent metadata", async () => {
      const service = createSummaryService(undefined, true);

      const result = await service.generateSummary(mockBook, "concise");

      expect(result.metadata.bookDataSource).toBe(mockBook.source);
      expect(result.metadata.hadBookDescription).toBe(
        Boolean(mockBook.description)
      );
      expect(result.metadata.notes).toBeTruthy();
    });
  });
});
