/**
 * Summary Persistence Test
 *
 * Tests the Convex functions for storing and retrieving summaries
 */

import { describe, it, expect } from "vitest";

describe("Summary Persistence Functions", () => {
  it("should have the correct Convex function signatures", () => {
    // This test verifies that our Convex functions are correctly defined
    // and can be imported from the API
    const { api } = require("../../../convex/_generated/api");

    // Verify the functions exist in the API
    expect(api.summaries.storeSummary).toBeDefined();
    expect(api.summaries.getSummaryById).toBeDefined();
    expect(api.summaries.getExistingSummary).toBeDefined();
    expect(api.summaries.recordSummaryFailure).toBeDefined();
    expect(api.summaries.getSummariesByBook).toBeDefined();
  });

  it("should define the correct types for summary operations", async () => {
    // Test that our types are properly defined and exported
    const summaryTypes = await import("../../types/summary");

    expect(summaryTypes.SUMMARY_TYPES).toBeDefined();
    expect(summaryTypes.SUMMARY_TYPE_DESCRIPTIONS).toBeDefined();
    expect(summaryTypes.calculateWordCount).toBeDefined();
    expect(summaryTypes.calculateReadingTime).toBeDefined();
    expect(summaryTypes.createSummaryCacheKey).toBeDefined();

    // Verify helper functions work
    expect(summaryTypes.calculateWordCount("Hello world test")).toBe(3);
    expect(summaryTypes.calculateReadingTime(200)).toBe(1); // 200 words / 200 wpm = 1 minute
  });

  it("should properly integrate summary service with types", async () => {
    // Test that the summary service can be imported and configured
    const { createDefaultSummaryService } = await import(
      "../../services/summaryService"
    );

    const service = createDefaultSummaryService();
    expect(service).toBeDefined();
    expect(service.isConfigured).toBeDefined();
    expect(service.getRateLimit).toBeDefined();
    expect(service.getAvailableModels).toBeDefined();

    // These should work without throwing errors
    const rateLimit = service.getRateLimit();
    expect(rateLimit).toHaveProperty("hasKey");

    const models = service.getAvailableModels();
    expect(Array.isArray(models)).toBe(true);
  });

  it("should validate summary type constants", () => {
    const {
      SUMMARY_TYPES,
      SUMMARY_TYPE_DESCRIPTIONS,
    } = require("../../types/summary");

    // Verify all summary types have descriptions
    Object.values(SUMMARY_TYPES).forEach((type) => {
      const typeKey = type as keyof typeof SUMMARY_TYPE_DESCRIPTIONS;
      expect(SUMMARY_TYPE_DESCRIPTIONS[typeKey]).toBeDefined();
      expect(SUMMARY_TYPE_DESCRIPTIONS[typeKey].title).toBeDefined();
      expect(SUMMARY_TYPE_DESCRIPTIONS[typeKey].description).toBeDefined();
      expect(SUMMARY_TYPE_DESCRIPTIONS[typeKey].readTime).toBeDefined();
    });
  });
});
