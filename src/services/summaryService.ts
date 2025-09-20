/**
 * AI Summary Service
 *
 * Provides AI-powered book summary generation using OpenAI's GPT models.
 * Follows Phase 1 service patterns with factory functions and interface-based design.
 */

import OpenAI from "openai";
import type { Book } from "../types/book";
import type {
  SummaryType,
  SummaryGenerationParams,
 
} from "../types/summary";
import { calculateWordCount, SUMMARY_TYPE_DESCRIPTIONS } from "../types/summary";
import { featureFlags } from "../lib/environmentConfig";
import {
  
} from "../types/summary";

/**
 * Summary generation result with detailed metadata
 */
interface SummaryGenerationResult {
  /** Generated summary content */
  content: string;

  /** Time taken to generate (milliseconds) */
  generationTime: number;

  /** AI model used */
  aiModel: string;

  /** Prompt version */
  promptVersion: string;

  /** Token usage information */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost?: number;
  };

  /** Additional metadata */
  metadata: {
    bookDataSource: "google-books" | "open-library";
    hadBookDescription: boolean;
    notes?: string;
  };
}

/**
 * Summary generation options
 */
interface SummaryGenerationOptions {
  /** AI model to use (defaults to gpt-4o-mini) */
  model?: string;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Temperature for creativity (0-1) */
  temperature?: number;

  /** Additional context or instructions */
  additionalContext?: string;

  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Summary service interface
 */
export interface SummaryService {
  /** Generate an AI summary for a book */
  generateSummary(
    book: Book,
    summaryType: SummaryType,
    options?: SummaryGenerationOptions
  ): Promise<SummaryGenerationResult>;

  /** Check if the service is properly configured */
  isConfigured(): boolean;

  /** Get rate limiting information */
  getRateLimit(): { hasKey: boolean; requestsLeft?: number };

  /** Get available models */
  getAvailableModels(): string[];

  /** Test the OpenAI connection */
  testConnection(): Promise<boolean>;
}

/**
 * OpenAI-based summary service implementation
 */
class OpenAISummaryService implements SummaryService {
  private openai: OpenAI;
  private defaultModel: string = "gpt-4o-mini";
  private promptVersion: string = "v1.0";
  private defaultTimeout: number = 30000; // 30 seconds

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new Error("OpenAI API key is required for summary generation");
    }

    this.openai = new OpenAI({
      apiKey,
    });
  }

  async generateSummary(
    book: Book,
    summaryType: SummaryType,
    options: SummaryGenerationOptions = {}
  ): Promise<SummaryGenerationResult> {
    const startTime = performance.now();

    try {
      // Validate inputs
      this.validateInputs(book, summaryType);

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
        model: options.model || this.defaultModel,
      };

      // Generate the summary
      const result = await this.callOpenAI(params, options);
      const generationTime = Math.round(performance.now() - startTime);

      return {
        content: result.content,
        generationTime,
        aiModel: params.model || this.defaultModel,
        promptVersion: this.promptVersion,
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
      if (error instanceof Error) {
        throw new Error(
          `Summary generation failed after ${generationTime}ms: ${error.message}`
        );
      }

      throw new Error(
        `Summary generation failed after ${generationTime}ms: Unknown error`
      );
    }
  }

  isConfigured(): boolean {
    return featureFlags.openaiApi;
  }

  getRateLimit() {
    return {
      hasKey: this.isConfigured(),
      // OpenAI doesn't provide rate limit info in headers by default
      // This would need to be implemented based on your tier/usage
      requestsLeft: undefined,
    };
  }

  getAvailableModels(): string[] {
    return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"];
  }

  async testConnection(): Promise<boolean> {
    try {
      // Simple test call to verify API key and connection
      await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Test" }],
        max_tokens: 5,
      });
      return true;
    } catch (error) {
      console.error("OpenAI connection test failed:", error);
      return false;
    }
  }

  /**
   * Validate generation inputs
   */
  private validateInputs(book: Book, summaryType: SummaryType): void {
    if (!book.title?.trim()) {
      throw new Error("Book title is required for summary generation");
    }

    if (!book.authors || book.authors.length === 0) {
      throw new Error("Book authors are required for summary generation");
    }

    if (
      !["concise", "detailed", "analysis", "practical"].includes(summaryType)
    ) {
      throw new Error(`Invalid summary type: ${summaryType}`);
    }
  }

  /**
   * Call OpenAI API with proper error handling and timeout
   */
  private async callOpenAI(
    params: SummaryGenerationParams,
    options: SummaryGenerationOptions
  ): Promise<{
    content: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCost?: number;
    };
    notes?: string;
  }> {
    const timeout = options.timeout || this.defaultTimeout;

    // Create the prompt
    const systemPrompt = this.buildSystemPrompt(params.summaryType);
    const userPrompt = this.buildUserPrompt(params);

    // Create the completion with timeout
    const completion = await Promise.race([
      this.openai.chat.completions.create({
        model: params.model || this.defaultModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens:
          params.maxTokens || this.getDefaultMaxTokens(params.summaryType),
        temperature: options.temperature || 0.7,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("OpenAI request timeout")), timeout)
      ),
    ]);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content generated by OpenAI");
    }

    // Calculate usage and estimated cost
    const usage = completion.usage
      ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
          estimatedCost: this.estimateCost(
            completion.usage.prompt_tokens,
            completion.usage.completion_tokens,
            params.model || this.defaultModel
          ),
        }
      : undefined;

    return {
      content: content.trim(),
      usage,
      notes: `Generated using ${params.model || this.defaultModel}`,
    };
  }

  /**
   * Build system prompt based on summary type
   */
  private buildSystemPrompt(summaryType: SummaryType): string {
    const typeInfo = SUMMARY_TYPE_DESCRIPTIONS[summaryType];

    const basePrompt = `You are an expert book summarizer and literary analyst. Your task is to create engaging, well-structured book summaries that help readers understand and appreciate literature.

Key Guidelines:
- Write in clear, engaging prose that flows naturally
- Structure your content with appropriate headings and sections
- Focus on the most important aspects relevant to the summary type
- Avoid spoilers for plot-driven books unless specifically requested
- Use formatting (headings, bullet points) to improve readability
- Write for an educated general audience
- Always maintain accuracy to the source material`;

    const typeSpecificPrompts = {
      concise: `
Create a CONCISE SUMMARY (${typeInfo.readTime}):
- Provide a brief overview of the book's main premise and themes
- Highlight 3-4 key points or takeaways
- Keep it engaging but succinct
- Structure: Brief intro, main points, conclusion
- Target length: 200-400 words`,

      detailed: `
Create a DETAILED BREAKDOWN (${typeInfo.readTime}):  
- Provide chapter-by-chapter or section-by-section analysis
- Explain the book's structure and progression
- Include major themes, concepts, and their development
- Discuss key characters, events, or ideas as relevant
- Structure: Introduction, main sections/chapters, synthesis
- Target length: 800-1200 words`,

      analysis: `
Create a CRITICAL ANALYSIS (${typeInfo.readTime}):
- Analyze the book's themes, literary techniques, and significance
- Discuss the author's style, approach, and effectiveness  
- Place the work in its broader context (historical, literary, cultural)
- Evaluate strengths and potential limitations
- Structure: Introduction, thematic analysis, literary assessment, conclusion
- Target length: 600-900 words`,

      practical: `
Create PRACTICAL TAKEAWAYS (${typeInfo.readTime}):
- Focus on actionable insights and lessons readers can apply
- Highlight practical strategies, principles, or frameworks
- Explain how to implement key concepts in real life
- Include specific examples and applications
- Structure: Key principles, implementation strategies, real-world applications
- Target length: 400-700 words`,
    };

    return `${basePrompt}

${typeSpecificPrompts[summaryType]}

Format your response using markdown with appropriate headings and structure.`;
  }

  /**
   * Build user prompt with book information
   */
  private buildUserPrompt(params: SummaryGenerationParams): string {
    const { book, summaryType, additionalContext } = params;

    let prompt = `Please create a ${summaryType} summary for the following book:

**Title:** ${book.title}
**Authors:** ${book.authors.join(", ")}`;

    if (book.publishedDate) {
      prompt += `\n**Published:** ${book.publishedDate}`;
    }

    if (book.categories && book.categories.length > 0) {
      prompt += `\n**Categories:** ${book.categories.join(", ")}`;
    }

    if (book.pageCount) {
      prompt += `\n**Pages:** ${book.pageCount}`;
    }

    if (book.description) {
      prompt += `\n\n**Book Description:**\n${book.description}`;
    } else {
      prompt += `\n\n*Note: No book description available. Please generate the summary based on the title, authors, and any general knowledge of this work.*`;
    }

    if (additionalContext) {
      prompt += `\n\n**Additional Context:**\n${additionalContext}`;
    }

    return prompt;
  }

  /**
   * Get default max tokens based on summary type
   */
  private getDefaultMaxTokens(summaryType: SummaryType): number {
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
  private estimateCost(
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
}

/**
 * Mock summary service for development/testing
 */
class MockSummaryService implements SummaryService {
  async generateSummary(
    book: Book,
    summaryType: SummaryType,
    options: SummaryGenerationOptions = {}
  ): Promise<SummaryGenerationResult> {
    console.log("🚀 MockSummaryService.generateSummary called with:", { book, summaryType, options });
    // Simulate generation time
    const delay = Math.random() * 2000 + 1000; // 1-3 seconds
    await new Promise((resolve) => setTimeout(resolve, delay));

    const mockContent = this.generateMockContent(book, summaryType);

    return {
      content: mockContent,
      generationTime: Math.round(delay),
      aiModel: "mock-gpt-4",
      promptVersion: "v1.0-mock",
      usage: {
        promptTokens: 150,
        completionTokens: calculateWordCount(mockContent) * 1.3, // Rough token estimate
        totalTokens: 150 + calculateWordCount(mockContent) * 1.3,
        estimatedCost: 0.01,
      },
      metadata: {
        bookDataSource: book.source,
        hadBookDescription: Boolean(book.description),
        notes: "Generated by mock service for development",
      },
    };
  }

  isConfigured(): boolean {
    return true; // Mock service is always "configured"
  }

  getRateLimit() {
    return {
      hasKey: true,
      requestsLeft: 1000, // Mock unlimited requests
    };
  }

  getAvailableModels(): string[] {
    return ["mock-gpt-4", "mock-gpt-3.5"];
  }

  async testConnection(): Promise<boolean> {
    return true; // Mock service always "connects"
  }

  private generateMockContent(book: Book, summaryType: SummaryType): string {
    const typeInfo = SUMMARY_TYPE_DESCRIPTIONS[summaryType];

    return `# ${typeInfo.title}: ${book.title}

*${typeInfo.description} - ${typeInfo.readTime}*

## Overview

This is a mock summary of "${book.title}" by ${book.authors.join(", ")}. In a real implementation, this would contain an AI-generated ${summaryType} summary based on the book's content.

${book.description ? `Based on the book description: "${book.description.substring(0, 200)}..."` : "No description available for this book."}

## Key Points

- This is a placeholder summary generated for development purposes
- The actual implementation uses OpenAI to generate real summaries
- Each summary type (${summaryType}) has its own specific format and focus
- Content would be tailored to the specific book and user needs

## Mock Content Structure

The real service would analyze the book's content and generate structured, insightful summaries that help readers understand and appreciate the work.

---

*This mock summary demonstrates the expected format and structure. Enable OpenAI integration for real summary generation.*`;
  }
}

/**
 * Factory function to create the appropriate summary service
 */
export function createSummaryService(
  apiKey?: string,
  useMock: boolean = false
): SummaryService {
  console.log("🚀 createDefaultSummaryService called:");

  // Use mock service in development if no API key or if explicitly requested
  if (useMock || (!apiKey)) {
    return new MockSummaryService();
  }

  // Use real OpenAI service
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OpenAI API key is required. Set OPENAI_API_KEY environment variable or use mock service for development."
    );
  }

  return new OpenAISummaryService(key);
}

/**
 * Create summary service instance with environment-based configuration
 */
export function createDefaultSummaryService(): SummaryService {
  console.log("🚀 createDefaultSummaryService called:");
  return createSummaryService(
    process.env.OPENAI_API_KEY,
    !featureFlags.openaiApi // Use mock if OpenAI not configured
  );
}

// Export types for external use
export type { SummaryGenerationResult, SummaryGenerationOptions };
