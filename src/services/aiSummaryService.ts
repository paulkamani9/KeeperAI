/**
 * AI Summary Service
 *
 * Handles AI-powered book summary generation using OpenAI GPT models:
 * - Generate summaries from book metadata and descriptions
 * - Support different summary modes (brief, detailed, analysis)
 * - Structured JSON output for consistent parsing
 * - Error handling and fallback mechanisms
 */

import { getRedisService, CacheKeys, CacheTTL } from "./redis";

export interface BookSummaryRequest {
  bookId: string;
  title: string;
  authors: string[];
  description?: string;
  genres?: string[];
  mode: "brief" | "detailed" | "analysis" | "concise" | "practical";
  regeneratePrompt?: string; // Custom prompt for regeneration
}

export interface BookSummaryResponse {
  summary: string;
  mode: "brief" | "detailed" | "analysis" | "concise" | "practical";
  confidence: number;
  processingTime: number;
  cached: boolean;
  wordCount: number;
}

export interface AIServiceConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export class AISummaryService {
  private redis = getRedisService();
  private config: AIServiceConfig;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
      );
    }

    this.config = {
      apiKey,
      model: "gpt-4o-mini", // Cost-effective model
      maxTokens: 1500, // Longer for summaries
      temperature: 0.3, // Lower temperature for consistent summaries
      timeout: 20000, // 20 seconds for summary generation
    };
  }

  /**
   * Generate a book summary using AI
   */
  async generateSummary(
    request: BookSummaryRequest
  ): Promise<BookSummaryResponse> {
    const startTime = Date.now();

    try {
      // Create cache key based on request parameters
      const cacheKey = this.createSummaryCacheKey(request);

      // Check cache first
      const cached = await this.redis.get<BookSummaryResponse>(cacheKey);
      if (cached) {
        return {
          ...cached,
          processingTime: Date.now() - startTime,
          cached: true,
        };
      }

      // Generate prompt
      const prompt = this.createSummaryPrompt(request);

      // Call OpenAI API
      const aiResponse = await this.callOpenAI(prompt);

      // Parse and validate response
      const summary = this.parseSummaryResponse(aiResponse, request.mode);

      const result: BookSummaryResponse = {
        summary,
        mode: request.mode,
        confidence: this.calculateConfidence(summary, request),
        processingTime: Date.now() - startTime,
        cached: false,
        wordCount: this.countWords(summary),
      };

      // Cache the result
      await this.redis.set(cacheKey, result, {
        ttl: CacheTTL.GPT_RECOMMENDATIONS, // 24 hours
      });

      return result;
    } catch (error) {
      console.error("AI summary generation error:", error);

      // Return fallback summary
      return {
        summary: this.getFallbackSummary(request),
        mode: request.mode,
        confidence: 0.2,
        processingTime: Date.now() - startTime,
        cached: false,
        wordCount: 0,
      };
    }
  }

  /**
   * Create OpenAI API prompt for book summary generation
   */
  private createSummaryPrompt(request: BookSummaryRequest): string {
    const { title, authors, description, genres, mode, regeneratePrompt } =
      request;

    let prompt = "";

    // Custom regeneration prompt
    if (regeneratePrompt) {
      prompt = `Generate a book summary for "${title}" by ${authors.join(", ")} with the following specific request: ${regeneratePrompt}\n\n`;
    } else {
      // Standard prompts based on mode
      switch (mode) {
        case "brief":
          prompt = `Generate a brief summary (100-150 words) of "${title}" by ${authors.join(", ")}.\n\n`;
          break;
        case "detailed":
          prompt = `Generate a detailed summary (300-500 words) of "${title}" by ${authors.join(", ")}.\n\n`;
          break;
        case "analysis":
          prompt = `Generate a literary analysis (400-600 words) of "${title}" by ${authors.join(", ")}. Focus on themes, literary devices, cultural significance, and critical reception.\n\n`;
          break;
      }
    }

    // Add available metadata
    if (description) {
      prompt += `Book description: ${description}\n\n`;
    }

    if (genres && genres.length > 0) {
      prompt += `Genres: ${genres.join(", ")}\n\n`;
    }

    // Add specific instructions based on mode
    if (mode === "brief") {
      prompt += `Instructions:
- Keep the summary concise and engaging (100-150 words)
- Focus on the main plot points and characters
- Include the book's central theme or message
- Avoid spoilers for major plot twists or endings
- Make it accessible to readers unfamiliar with the book
- Write in an engaging, informative tone`;
    } else if (mode === "detailed") {
      prompt += `Instructions:
- Provide a comprehensive summary (300-500 words)
- Include main plot points, character development, and setting
- Discuss the book's themes and literary significance
- Mention the author's writing style if notable
- Include historical or cultural context if relevant
- Avoid major spoilers but can hint at character arcs
- Write for readers considering whether to read the book`;
    } else if (mode === "analysis") {
      prompt += `Instructions:
- Provide a literary analysis rather than just a plot summary (400-600 words)
- Analyze major themes, symbols, and literary devices
- Discuss the book's cultural or historical significance
- Compare to other works by the author or in the genre if relevant
- Include critical reception or academic perspectives if known
- Analyze character development and narrative structure
- Write for readers interested in deeper literary understanding`;
    }

    prompt += `\n\nImportant: Return only the summary text without any prefacing phrases like "This book is about" or "Here is a summary." Start directly with the content.`;

    return prompt;
  }

  /**
   * Call OpenAI API with error handling
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: "system",
            content:
              "You are a knowledgeable literature assistant. Generate well-written, accurate book summaries and analyses. Focus on being informative, engaging, and appropriate for the requested summary type.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response format from OpenAI API");
    }

    return data.choices[0].message.content.trim();
  }

  /**
   * Parse and validate AI summary response
   */
  private parseSummaryResponse(
    aiResponse: string,
    mode: "brief" | "detailed" | "analysis" | "concise" | "practical"
  ): string {
    let summary = aiResponse.trim();

    // Remove common prefacing phrases
    const prefacePatterns = [
      /^This book is about\s*/i,
      /^Here is a summary[:\s]*/i,
      /^Summary[:\s]*/i,
      /^The following is a summary[:\s]*/i,
      /^Brief summary[:\s]*/i,
      /^Detailed summary[:\s]*/i,
      /^Analysis[:\s]*/i,
    ];

    for (const pattern of prefacePatterns) {
      summary = summary.replace(pattern, "");
    }

    // Validate length based on mode
    const wordCount = this.countWords(summary);
    const expectedRanges = {
      brief: { min: 50, max: 200 },
      concise: { min: 150, max: 400 },
      detailed: { min: 600, max: 1200 },
      analysis: { min: 500, max: 900 },
      practical: { min: 400, max: 800 },
    };

    const range = expectedRanges[mode] || expectedRanges.brief;
    if (wordCount < range.min) {
      console.warn(
        `Summary too short for ${mode} mode: ${wordCount} words (expected ${range.min}-${range.max})`
      );
    } else if (wordCount > range.max) {
      console.warn(
        `Summary too long for ${mode} mode: ${wordCount} words (expected ${range.min}-${range.max})`
      );
    }

    // Ensure minimum quality
    if (summary.length < 100) {
      throw new Error("Generated summary is too short or empty");
    }

    return summary;
  }

  /**
   * Calculate confidence score for the generated summary
   */
  private calculateConfidence(
    summary: string,
    request: BookSummaryRequest
  ): number {
    let confidence = 0.8; // Base confidence

    const wordCount = this.countWords(summary);
    const expectedRanges = {
      brief: { min: 50, max: 200 },
      concise: { min: 150, max: 400 },
      detailed: { min: 600, max: 1200 },
      analysis: { min: 500, max: 900 },
      practical: { min: 400, max: 800 },
    };

    const range = expectedRanges[request.mode] || expectedRanges.brief;

    // Adjust confidence based on length appropriateness
    if (wordCount >= range.min && wordCount <= range.max) {
      confidence += 0.1;
    } else if (wordCount < range.min * 0.7 || wordCount > range.max * 1.3) {
      confidence -= 0.2;
    }

    // Adjust confidence based on available input information
    if (request.description && request.description.length > 100) {
      confidence += 0.05;
    }

    if (request.genres && request.genres.length > 0) {
      confidence += 0.05;
    }

    // Adjust confidence based on regeneration prompt
    if (request.regeneratePrompt) {
      confidence -= 0.1; // Slightly lower confidence for custom prompts
    }

    return Math.min(Math.max(confidence, 0.1), 1.0);
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  /**
   * Create cache key for summaries
   */
  private createSummaryCacheKey(request: BookSummaryRequest): string {
    const keyParts = [
      request.bookId,
      request.mode,
      request.regeneratePrompt || "standard",
    ];

    const keyString = keyParts.join("|");
    const hash = Buffer.from(keyString).toString("base64").slice(0, 16);

    return CacheKeys.gptRecommendations("summary", hash);
  }

  /**
   * Get fallback summary when AI fails
   */
  private getFallbackSummary(request: BookSummaryRequest): string {
    const { title, authors, description } = request;

    let fallback = `"${title}" by ${authors.join(", ")}`;

    if (description && description.length > 0) {
      // Use the existing description if available
      fallback += ` - ${description}`;
    } else {
      // Generic fallback
      fallback += " is a notable work in literature. ";

      if (request.mode === "brief") {
        fallback +=
          "This book explores significant themes and presents engaging characters in a compelling narrative.";
      } else if (request.mode === "detailed") {
        fallback +=
          "This work is recognized for its literary merit and contribution to its genre. The author's writing style and thematic content have garnered attention from readers and critics alike.";
      } else {
        fallback +=
          "This work represents an important contribution to literature, offering rich thematic content and sophisticated narrative techniques that warrant scholarly analysis.";
      }
    }

    return fallback;
  }

  /**
   * Check if the service is available
   */
  isAvailable(): boolean {
    return !!this.config.apiKey;
  }

  /**
   * Get service status
   */
  getStatus(): { available: boolean; configured: boolean; model: string } {
    return {
      available: this.isAvailable(),
      configured: !!this.config.apiKey,
      model: this.config.model,
    };
  }
}

// Singleton instance
let aiSummaryInstance: AISummaryService | null = null;

export function getAISummaryService(): AISummaryService {
  if (!aiSummaryInstance) {
    aiSummaryInstance = new AISummaryService();
  }
  return aiSummaryInstance;
}
