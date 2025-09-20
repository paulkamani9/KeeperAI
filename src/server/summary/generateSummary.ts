"use server";

import { Book } from "@/types/book";
import {
  SummaryGenerationOptions,
  SummaryGenerationParams,
  SummaryGenerationResult,
  SummaryType,
} from "@/types/summary";
import { callOpenAI } from "./callOpenAi";
import { defaultModel, promptVersion, validateInputs } from "./helpers";
import { generateMockSummary } from "./mockSummary";

export async function generateBookSummary(
  book: Book,
  summaryType: SummaryType,
  options: SummaryGenerationOptions = {}
): Promise<SummaryGenerationResult> {
  const startTime = performance.now();

  try {
    // Validate inputs
    validateInputs(book, summaryType);

    // Prepare generation parameters
    const params: SummaryGenerationParams = {
      book: {
        title: book.title,
        authors: book.authors,
        description: book.description,
        categories: book.categories,
        publishedDate: book.publishedDate,
        pageCount: book.pageCount,
      },
      summaryType,
      additionalContext: options.additionalContext,
      maxTokens: options.maxTokens,
      model: options.model || defaultModel,
    };

    // Generate the summary
    const result = await callOpenAI(params, options);
    const generationTime = Math.round(performance.now() - startTime);

    return {
      content: result.content,
      generationTime,
      aiModel: params.model || defaultModel,
      promptVersion: promptVersion,
      usage: result.usage,
      metadata: {
        bookDataSource: book.source,
        hadBookDescription: Boolean(book.description),
        notes: result.notes,
      },
    };
  } catch (error) {
    const generationTime = Math.round(performance.now() - startTime);

    // Re-throw with enhanced error information
    console.error(`Summary generation error after ${generationTime}ms: `, {
      error,
      book,
      summaryType,
      options,
    });

    const mockSummary = await generateMockSummary(book, summaryType, options);
    return {
      ...mockSummary,
    };
  }
}
