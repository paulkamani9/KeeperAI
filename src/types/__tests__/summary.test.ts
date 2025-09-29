/**
 * Unit tests for summary types and schemas
 */

import { describe, it, expect } from "vitest";
import {
  SummaryType,
  CreateSummaryInput,
  SummaryGenerationParams,
  SummarySchema,
  CreateSummaryInputSchema,
  SummaryGenerationParamsSchema,
  SUMMARY_TYPE_DESCRIPTIONS,
  createSummaryCacheKey,
  calculateReadingTime,
  calculateWordCount,
  parseSummary,
  parseCreateSummaryInput,
  parseSummaryGenerationParams,
  isSummary,
  isCreateSummaryInput,
  isSummaryGenerationParams,
  isSummaryType,
  getSummaryTypeDescription,
  getAllSummaryTypes,
  isValidSummaryType,
} from "../summary";

describe("Summary Types", () => {
  describe("SummaryType validation", () => {
    it("should validate correct summary types", () => {
      expect(isSummaryType("concise")).toBe(true);
      expect(isSummaryType("detailed")).toBe(true);
      expect(isSummaryType("analysis")).toBe(true);
      expect(isSummaryType("practical")).toBe(true);
    });

    it("should reject invalid summary types", () => {
      expect(isSummaryType("invalid")).toBe(false);
      expect(isSummaryType("")).toBe(false);
      expect(isSummaryType(123)).toBe(false);
      expect(isSummaryType(null)).toBe(false);
    });

    it("should provide all summary types", () => {
      const types = getAllSummaryTypes();
      expect(types).toEqual(["concise", "detailed", "analysis", "practical"]);
    });

    it("should validate summary type strings", () => {
      expect(isValidSummaryType("concise")).toBe(true);
      expect(isValidSummaryType("invalid")).toBe(false);
    });
  });

  describe("Summary type descriptions", () => {
    it("should provide descriptions for all summary types", () => {
      const types: SummaryType[] = [
        "concise",
        "detailed",
        "analysis",
        "practical",
      ];

      types.forEach((type) => {
        const description = getSummaryTypeDescription(type);
        expect(description).toBeDefined();
        expect(description.title).toBeTruthy();
        expect(description.description).toBeTruthy();
        expect(description.readTime).toBeTruthy();
        expect(description.icon).toBeTruthy();
      });
    });

    it("should have consistent structure for all descriptions", () => {
      Object.values(SUMMARY_TYPE_DESCRIPTIONS).forEach((desc) => {
        expect(desc).toHaveProperty("title");
        expect(desc).toHaveProperty("description");
        expect(desc).toHaveProperty("readTime");
        expect(desc).toHaveProperty("icon");
      });
    });
  });

  describe("SummarySchema validation", () => {
    const validSummary = {
      id: "summary_123",
      bookId: "book_456",
      summaryType: "concise" as SummaryType,
      content: "This is a sample summary content.",
      status: "completed" as const,
      createdAt: new Date("2024-01-01T10:00:00Z"),
      updatedAt: new Date("2024-01-01T10:05:00Z"),
      generationTime: 5000,
      wordCount: 150,
      readingTime: 1,
      aiModel: "gpt-4",
      promptVersion: "v1.0",
      metadata: {
        bookDataSource: "google-books" as const,
        hadBookDescription: true,
        promptTokens: 100,
        completionTokens: 150,
        estimatedCost: 0.002,
        notes: "Generated successfully",
      },
    };

    it("should validate a complete valid summary", () => {
      const result = SummarySchema.safeParse(validSummary);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validSummary);
      }
    });

    it("should validate minimal valid summary", () => {
      const minimalSummary = {
        id: "summary_123",
        bookId: "book_456",
        summaryType: "concise" as SummaryType,
        content: "Content",
        status: "completed" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        wordCount: 1,
        readingTime: 1,
        aiModel: "gpt-4",
        promptVersion: "v1.0",
      };

      const result = SummarySchema.safeParse(minimalSummary);
      expect(result.success).toBe(true);
    });

    it("should reject invalid summary data", () => {
      // Missing required fields
      expect(SummarySchema.safeParse({})).toEqual(
        expect.objectContaining({ success: false })
      );

      // Invalid summary type
      expect(
        SummarySchema.safeParse({
          ...validSummary,
          summaryType: "invalid",
        })
      ).toEqual(expect.objectContaining({ success: false }));

      // Invalid status
      expect(
        SummarySchema.safeParse({
          ...validSummary,
          status: "invalid",
        })
      ).toEqual(expect.objectContaining({ success: false }));

      // Negative word count
      expect(
        SummarySchema.safeParse({
          ...validSummary,
          wordCount: -1,
        })
      ).toEqual(expect.objectContaining({ success: false }));
    });
  });

  describe("CreateSummaryInputSchema validation", () => {
    const validInput: CreateSummaryInput = {
      book: {
        id: "book_123",
        title: "Test Book",
        authors: ["Author One", "Author Two"],
        description: "A test book description",
        source: "google-books",
        originalId: "google_123",
        thumbnail: "https://example.com/image.jpg",
      },
      summaryType: "concise",
      userId: "user_456",
    };

    it("should validate complete valid input", () => {
      const result = CreateSummaryInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should validate minimal valid input", () => {
      const minimalInput = {
        book: {
          id: "book_123",
          title: "Test Book",
          authors: ["Author One"],
          source: "google-books" as const,
          originalId: "google_123",
        },
        summaryType: "concise" as SummaryType,
      };

      const result = CreateSummaryInputSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });

    it("should reject invalid input", () => {
      // Empty book title
      expect(
        CreateSummaryInputSchema.safeParse({
          ...validInput,
          book: { ...validInput.book, title: "" },
        })
      ).toEqual(expect.objectContaining({ success: false }));

      // Invalid summary type
      expect(
        CreateSummaryInputSchema.safeParse({
          ...validInput,
          summaryType: "invalid",
        })
      ).toEqual(expect.objectContaining({ success: false }));

      // Invalid source
      expect(
        CreateSummaryInputSchema.safeParse({
          ...validInput,
          book: { ...validInput.book, source: "invalid" },
        })
      ).toEqual(expect.objectContaining({ success: false }));
    });
  });

  describe("SummaryGenerationParamsSchema validation", () => {
    const validParams: SummaryGenerationParams = {
      book: {
        title: "Test Book",
        authors: ["Author One"],
        description: "A test description",
        categories: ["Fiction"],
        publishedDate: "2024-01-01",
        pageCount: 300,
      },
      summaryType: "detailed",
      additionalContext: "Focus on character development",
      maxTokens: 1000,
      model: "gpt-4",
    };

    it("should validate complete valid params", () => {
      const result = SummaryGenerationParamsSchema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it("should validate minimal valid params", () => {
      const minimalParams = {
        book: {
          title: "Test Book",
          authors: ["Author One"],
        },
        summaryType: "concise" as SummaryType,
      };

      const result = SummaryGenerationParamsSchema.safeParse(minimalParams);
      expect(result.success).toBe(true);
    });

    it("should reject invalid params", () => {
      // Empty authors array
      expect(
        SummaryGenerationParamsSchema.safeParse({
          ...validParams,
          book: { ...validParams.book, authors: [] },
        })
      ).toEqual(expect.objectContaining({ success: false }));

      // Negative page count
      expect(
        SummaryGenerationParamsSchema.safeParse({
          ...validParams,
          book: { ...validParams.book, pageCount: -1 },
        })
      ).toEqual(expect.objectContaining({ success: false }));
    });
  });
});

describe("Utility Functions", () => {
  describe("createSummaryCacheKey", () => {
    it("should create consistent cache keys", () => {
      expect(createSummaryCacheKey("book_123", "concise")).toBe(
        "summary:book_123:concise"
      );
      expect(createSummaryCacheKey("book_456", "detailed")).toBe(
        "summary:book_456:detailed"
      );
    });

    it("should create unique keys for different combinations", () => {
      const key1 = createSummaryCacheKey("book_123", "concise");
      const key2 = createSummaryCacheKey("book_123", "detailed");
      const key3 = createSummaryCacheKey("book_456", "concise");

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });
  });

  describe("calculateReadingTime", () => {
    it("should calculate reading time correctly", () => {
      expect(calculateReadingTime(225)).toBe(1); // 225 words = 1 minute
      expect(calculateReadingTime(450)).toBe(2); // 450 words = 2 minutes
      expect(calculateReadingTime(100)).toBe(1); // Rounds up to 1 minute minimum
    });

    it("should handle edge cases", () => {
      expect(calculateReadingTime(0)).toBe(0);
      expect(calculateReadingTime(1)).toBe(1); // Even 1 word takes at least 1 minute
    });
  });

  describe("calculateWordCount", () => {
    it("should count words correctly", () => {
      expect(calculateWordCount("Hello world")).toBe(2);
      expect(calculateWordCount("This is a test sentence")).toBe(5);
      expect(calculateWordCount("")).toBe(0);
    });

    it("should handle whitespace and punctuation", () => {
      expect(calculateWordCount("  Hello   world  ")).toBe(2);
      expect(calculateWordCount("Hello, world!")).toBe(2);
      expect(calculateWordCount("Don't count apostrophes as separate")).toBe(5);
    });

    it("should filter out empty strings", () => {
      expect(calculateWordCount("word1  word2   word3")).toBe(3);
    });
  });
});

describe("Parser Functions", () => {
  describe("parseSummary", () => {
    it("should parse valid summary data", () => {
      const validData = {
        id: "summary_123",
        bookId: "book_456",
        summaryType: "concise",
        content: "Content",
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
        wordCount: 1,
        readingTime: 1,
        aiModel: "gpt-4",
        promptVersion: "v1.0",
      };

      const result = parseSummary(validData);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(validData.id);
    });

    it("should return null for invalid data", () => {
      expect(parseSummary({})).toBeNull();
      expect(parseSummary(null)).toBeNull();
      expect(parseSummary("invalid")).toBeNull();
    });
  });

  describe("parseCreateSummaryInput", () => {
    it("should parse valid input data", () => {
      const validData = {
        book: {
          id: "book_123",
          title: "Test Book",
          authors: ["Author"],
          source: "google-books",
          originalId: "google_123",
        },
        summaryType: "concise",
      };

      const result = parseCreateSummaryInput(validData);
      expect(result).not.toBeNull();
      expect(result?.summaryType).toBe("concise");
    });

    it("should return null for invalid data", () => {
      expect(parseCreateSummaryInput({})).toBeNull();
      expect(parseCreateSummaryInput(null)).toBeNull();
    });
  });

  describe("parseSummaryGenerationParams", () => {
    it("should parse valid params", () => {
      const validData = {
        book: {
          title: "Test Book",
          authors: ["Author"],
        },
        summaryType: "detailed",
      };

      const result = parseSummaryGenerationParams(validData);
      expect(result).not.toBeNull();
      expect(result?.summaryType).toBe("detailed");
    });

    it("should return null for invalid data", () => {
      expect(parseSummaryGenerationParams({})).toBeNull();
      expect(parseSummaryGenerationParams(null)).toBeNull();
    });
  });
});

describe("Type Guards", () => {
  describe("isSummary", () => {
    it("should identify valid summary objects", () => {
      const validSummary = {
        id: "summary_123",
        bookId: "book_456",
        summaryType: "concise",
        content: "Content",
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
        wordCount: 1,
        readingTime: 1,
        aiModel: "gpt-4",
        promptVersion: "v1.0",
      };

      expect(isSummary(validSummary)).toBe(true);
    });

    it("should reject invalid objects", () => {
      expect(isSummary({})).toBe(false);
      expect(isSummary(null)).toBe(false);
      expect(isSummary("invalid")).toBe(false);
    });
  });

  describe("isCreateSummaryInput", () => {
    it("should identify valid input objects", () => {
      const validInput = {
        book: {
          id: "book_123",
          title: "Test Book",
          authors: ["Author"],
          source: "google-books",
          originalId: "google_123",
        },
        summaryType: "concise",
      };

      expect(isCreateSummaryInput(validInput)).toBe(true);
    });

    it("should reject invalid objects", () => {
      expect(isCreateSummaryInput({})).toBe(false);
      expect(isCreateSummaryInput(null)).toBe(false);
    });
  });

  describe("isSummaryGenerationParams", () => {
    it("should identify valid params objects", () => {
      const validParams = {
        book: {
          title: "Test Book",
          authors: ["Author"],
        },
        summaryType: "analysis",
      };

      expect(isSummaryGenerationParams(validParams)).toBe(true);
    });

    it("should reject invalid objects", () => {
      expect(isSummaryGenerationParams({})).toBe(false);
      expect(isSummaryGenerationParams(null)).toBe(false);
    });
  });
});
