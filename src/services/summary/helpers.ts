import { Book } from "@/types/book";
import { SummaryType } from "@/types/summary";

export const defaultModel = "gpt-4o-mini";
export const promptVersion = "v1.0";
export const defaultTimeout = 60000; // 60 seconds



/**
 * Get default max tokens based on summary type
 */
export function getDefaultMaxTokens(summaryType: SummaryType): number {
  const tokenLimits = {
    concise: 600, // ~400 words
    detailed: 1800, // ~1200 words
    analysis: 1350, // ~900 words
    practical: 1050, // ~700 words
  };

  return tokenLimits[summaryType];
}

/**
 * Estimate cost based on model and token usage
 * Note: These are approximate rates as of 2024 and may change
 */
export function estimateCost(
  promptTokens: number,
  completionTokens: number,
  model: string
): number {
  // Rates per 1K tokens (approximate as of 2024)
  const pricing = {
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4-turbo": { input: 0.01, output: 0.03 },
    "gpt-4": { input: 0.03, output: 0.06 },
    "gpt-3.5-turbo": { input: 0.0015, output: 0.002 },
  };

  const modelPricing =
    pricing[model as keyof typeof pricing] || pricing["gpt-4o-mini"];

  const inputCost = (promptTokens / 1000) * modelPricing.input;
  const outputCost = (completionTokens / 1000) * modelPricing.output;

  return inputCost + outputCost;
}

export function validateInputs(book: Book, summaryType: SummaryType): void {
  if (!book.title?.trim()) {
    throw new Error("Book title is required for summary generation");
  }

  if (!book.authors || book.authors.length === 0) {
    throw new Error("Book authors are required for summary generation");
  }

  if (!["concise", "detailed", "analysis", "practical"].includes(summaryType)) {
    throw new Error(`Invalid summary type: ${summaryType}`);
  }
}
