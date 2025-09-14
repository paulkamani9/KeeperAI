/**
 * GPT Recommendation Service
 *
 * Handles AI-powered book recommendations using OpenAI GPT models:
 * - Generate book title recommendations from user queries
 * - Structured JSON output for consistent parsing
 * - Error handling and fallback mechanisms
 */

import { getRedisService, CacheKeys, CacheTTL } from "./redis";
import { NormalizedBook } from "../types";

export interface GPTBookRecommendation {
  title: string;
  author?: string;
  reason: string;
  confidence: number;
}

export interface GPTRecommendationRequest {
  query?: string;
  userPreferences?: string[];
  maxRecommendations?: number;
  excludeBooks?: string[];
  context?: {
    previousSearches?: string[];
    favoriteGenres?: string[];
    recentActivities?: {
      type: "search" | "favorite" | "comment";
      term: string;
      timestamp: number;
    }[];
  };
  type?: "search" | "home" | "similar";
}

export interface GPTRecommendationResponse {
  recommendations: GPTBookRecommendation[];
  reasoning: string;
  confidence: number;
  processingTime: number;
  cached: boolean;
}

export interface GPTServiceConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export class GPTRecommendationService {
  private redis = getRedisService();
  private config: GPTServiceConfig;

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
      maxTokens: 1000,
      temperature: 0.7,
      timeout: 15000, // 15 seconds for AI requests
    };
  }

  /**
   * Generate book recommendations from user query using GPT
   */
  async generateRecommendations(
    request: GPTRecommendationRequest
  ): Promise<GPTRecommendationResponse> {
    const startTime = Date.now();
    const { maxRecommendations = 5 } = request;

    try {
      // Create cache key based on request parameters
      const cacheKey = this.createCacheKey(request);

      // Check cache first
      const cached = await this.redis.get<GPTRecommendationResponse>(cacheKey);
      if (cached) {
        return {
          ...cached,
          processingTime: Date.now() - startTime,
          cached: true,
        };
      }

      // Generate prompt
      const prompt = this.createRecommendationPrompt(request);

      // Call OpenAI API
      const gptResponse = await this.callOpenAI(prompt);

      // Parse response
      const parsedResponse = this.parseGPTResponse(gptResponse);

      const result: GPTRecommendationResponse = {
        recommendations: parsedResponse.recommendations.slice(
          0,
          maxRecommendations
        ),
        reasoning: parsedResponse.reasoning,
        confidence: parsedResponse.confidence,
        processingTime: Date.now() - startTime,
        cached: false,
      };

      // Cache the result
      await this.redis.set(cacheKey, result, {
        ttl: CacheTTL.GPT_RECOMMENDATIONS,
      });

      return result;
    } catch (error) {
      console.error("GPT recommendation error:", error);

      // Return fallback recommendations
      return {
        recommendations: this.getFallbackRecommendations(request),
        reasoning:
          "AI service temporarily unavailable - showing fallback recommendations",
        confidence: 0.3,
        processingTime: Date.now() - startTime,
        cached: false,
      };
    }
  }

  /**
   * Extract book titles from GPT recommendations for API fetching
   */
  extractBookTitles(recommendations: GPTBookRecommendation[]): string[] {
    return recommendations.map((rec) => {
      // If author is provided, include it in the search query for better results
      return rec.author ? `${rec.title} ${rec.author}` : rec.title;
    });
  }

  /**
   * Match GPT recommendations with fetched book data
   */
  matchRecommendationsWithBooks(
    recommendations: GPTBookRecommendation[],
    books: NormalizedBook[]
  ): NormalizedBook[] {
    const matchedBooks: NormalizedBook[] = [];

    for (const rec of recommendations) {
      // Find the best matching book
      const matchedBook = books.find((book) => this.isBookMatch(book, rec));

      if (matchedBook) {
        // Add recommendation metadata to the book
        matchedBooks.push({
          ...matchedBook,
          confidence: rec.confidence,
          score: rec.confidence,
        });
      }
    }

    return matchedBooks;
  }

  /**
   * Create OpenAI API prompt for book recommendations
   */
  private createRecommendationPrompt(
    request: GPTRecommendationRequest
  ): string {
    const {
      query,
      userPreferences,
      maxRecommendations = 5,
      excludeBooks,
      context,
      type = "search",
    } = request;

    let prompt = "";

    if (type === "home") {
      prompt = `Generate ${maxRecommendations} personalized book recommendations for a user's home feed.\n\n`;

      if (userPreferences && userPreferences.length > 0) {
        prompt += `User's reading interests and past interactions: ${userPreferences.join(", ")}\n`;
      }

      if (context?.recentActivities && context.recentActivities.length > 0) {
        prompt += `Recent user activity:\n`;
        context.recentActivities.slice(-5).forEach((activity) => {
          prompt += `- ${activity.type}: "${activity.term}"\n`;
        });
        prompt += "\n";
      }
    } else if (type === "similar") {
      const bookInfo = query || "the specified book";
      prompt = `Generate ${maxRecommendations} books similar to ${bookInfo}.\n\n`;
      prompt += `Find books that share similar themes, genres, writing style, or target audience.\n\n`;
    } else {
      prompt = `Generate ${maxRecommendations} book recommendations based on this query: "${query || "general interest"}"\n\n`;
    }

    if (userPreferences && userPreferences.length > 0) {
      prompt += `User preferences: ${userPreferences.join(", ")}\n`;
    }

    if (context?.favoriteGenres && context.favoriteGenres.length > 0) {
      prompt += `User's favorite genres: ${context.favoriteGenres.join(", ")}\n`;
    }

    if (excludeBooks && excludeBooks.length > 0) {
      prompt += `Exclude these books: ${excludeBooks.join(", ")}\n`;
    }

    if (context?.previousSearches && context.previousSearches.length > 0) {
      prompt += `Recent searches: ${context.previousSearches.slice(-3).join(", ")}\n`;
    }

    prompt += `
Focus on well-known books that are likely to be found in major book databases like Google Books or Open Library.

Return a JSON object with this exact structure:
{
  "recommendations": [
    {
      "title": "Book Title",
      "author": "Author Name (optional but preferred)",
      "reason": "Brief explanation of why this book matches the user's query",
      "confidence": 0.85
    }
  ],
  "reasoning": "Overall explanation of the recommendation strategy",
  "confidence": 0.80
}

Guidelines:
- Confidence should be between 0.1 and 1.0
- Include author names when possible to improve book matching
- Focus on popular, well-known books
- Consider both fiction and non-fiction when appropriate
- Provide diverse recommendations when possible
- Keep reasons concise but informative`;

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
              "You are a knowledgeable book recommendation assistant. Always respond with valid JSON following the exact format requested.",
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

    return data.choices[0].message.content;
  }

  /**
   * Parse GPT response with error handling
   */
  private parseGPTResponse(gptResponse: string): {
    recommendations: GPTBookRecommendation[];
    reasoning: string;
    confidence: number;
  } {
    try {
      // Clean the response (remove markdown formatting if present)
      const cleanedResponse = gptResponse
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(cleanedResponse);

      // Validate the structure
      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error("Invalid recommendations format");
      }

      // Validate and normalize each recommendation
      const recommendations: GPTBookRecommendation[] = parsed.recommendations
        .filter((rec: any) => rec.title && rec.reason)
        .map((rec: any) => ({
          title: String(rec.title).trim(),
          author: rec.author ? String(rec.author).trim() : undefined,
          reason: String(rec.reason).trim(),
          confidence: Math.min(
            Math.max(Number(rec.confidence) || 0.5, 0.1),
            1.0
          ),
        }));

      return {
        recommendations,
        reasoning: parsed.reasoning || "No reasoning provided",
        confidence: Math.min(
          Math.max(Number(parsed.confidence) || 0.5, 0.1),
          1.0
        ),
      };
    } catch (error) {
      console.error("Error parsing GPT response:", error);
      console.error("Raw response:", gptResponse);

      // Fallback: try to extract book titles from raw text
      return this.extractTitlesFromText(gptResponse);
    }
  }

  /**
   * Fallback method to extract book titles from raw text
   */
  private extractTitlesFromText(text: string): {
    recommendations: GPTBookRecommendation[];
    reasoning: string;
    confidence: number;
  } {
    const lines = text.split("\n").filter((line) => line.trim());
    const recommendations: GPTBookRecommendation[] = [];

    for (const line of lines) {
      // Look for patterns like "1. Title by Author" or "- Title"
      const match =
        line.match(/^\d+\.\s*(.+?)(?:\s+by\s+(.+?))?$/i) ||
        line.match(/^-\s*(.+?)(?:\s+by\s+(.+?))?$/i);

      if (match) {
        recommendations.push({
          title: match[1].trim(),
          author: match[2]?.trim(),
          reason: "Extracted from AI response",
          confidence: 0.4,
        });
      }
    }

    return {
      recommendations: recommendations.slice(0, 5),
      reasoning: "Partial extraction from AI response",
      confidence: 0.3,
    };
  }

  /**
   * Create cache key for recommendations
   */
  private createCacheKey(request: GPTRecommendationRequest): string {
    const keyParts = [
      request.query,
      (request.userPreferences || []).sort().join(","),
      (request.excludeBooks || []).sort().join(","),
      request.maxRecommendations || 5,
    ];

    const keyString = keyParts.join("|");
    const hash = Buffer.from(keyString).toString("base64").slice(0, 16);

    return CacheKeys.gptRecommendations("system", hash);
  }

  /**
   * Check if a book matches a GPT recommendation
   */
  private isBookMatch(
    book: NormalizedBook,
    recommendation: GPTBookRecommendation
  ): boolean {
    const bookTitle = book.title.toLowerCase();
    const recTitle = recommendation.title.toLowerCase();

    // Exact title match
    if (bookTitle === recTitle) {
      return true;
    }

    // Title similarity (contains or significant overlap)
    if (bookTitle.includes(recTitle) || recTitle.includes(bookTitle)) {
      return true;
    }

    // If author is specified, check author match too
    if (recommendation.author) {
      const bookAuthors = book.authors.map((a) => a.toLowerCase()).join(" ");
      const recAuthor = recommendation.author.toLowerCase();

      // Fuzzy title match + author match
      if (
        this.isSimilarTitle(bookTitle, recTitle) &&
        bookAuthors.includes(recAuthor)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if two titles are similar (fuzzy matching)
   */
  private isSimilarTitle(title1: string, title2: string): boolean {
    // Remove common words and normalize
    const normalize = (title: string) =>
      title
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\b(the|a|an|and|or|of|in|on|at|to|for)\b/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const norm1 = normalize(title1);
    const norm2 = normalize(title2);

    // Check if one contains the other after normalization
    return norm1.includes(norm2) || norm2.includes(norm1);
  }

  /**
   * Get fallback recommendations when GPT fails
   */
  private getFallbackRecommendations(
    request: GPTRecommendationRequest
  ): GPTBookRecommendation[] {
    const query = (request.query || "").toLowerCase();

    // Simple keyword-based fallback recommendations
    const fallbacks: GPTBookRecommendation[] = [
      {
        title: "To Kill a Mockingbird",
        author: "Harper Lee",
        reason: "Classic literature recommendation",
        confidence: 0.3,
      },
      {
        title: "1984",
        author: "George Orwell",
        reason: "Popular dystopian fiction",
        confidence: 0.3,
      },
      {
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        reason: "Highly regarded American novel",
        confidence: 0.3,
      },
    ];

    // Simple keyword matching for better fallbacks
    if (query.includes("science") || query.includes("sci-fi")) {
      fallbacks.unshift({
        title: "Dune",
        author: "Frank Herbert",
        reason: "Popular science fiction novel",
        confidence: 0.4,
      });
    }

    if (query.includes("mystery") || query.includes("detective")) {
      fallbacks.unshift({
        title: "The Girl with the Dragon Tattoo",
        author: "Stieg Larsson",
        reason: "Popular mystery thriller",
        confidence: 0.4,
      });
    }

    if (query.includes("romance")) {
      fallbacks.unshift({
        title: "Pride and Prejudice",
        author: "Jane Austen",
        reason: "Classic romance novel",
        confidence: 0.4,
      });
    }

    // Use user preferences for better fallbacks if no query
    if (!request.query && request.userPreferences) {
      const preferences = request.userPreferences.join(" ").toLowerCase();

      if (preferences.includes("fantasy") || preferences.includes("magic")) {
        fallbacks.unshift({
          title: "The Name of the Wind",
          author: "Patrick Rothfuss",
          reason: "Popular fantasy novel based on your interests",
          confidence: 0.4,
        });
      }

      if (
        preferences.includes("history") ||
        preferences.includes("historical")
      ) {
        fallbacks.unshift({
          title: "Sapiens",
          author: "Yuval Noah Harari",
          reason: "Popular historical non-fiction",
          confidence: 0.4,
        });
      }
    }

    return fallbacks.slice(0, request.maxRecommendations || 5);
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
let gptRecommendationInstance: GPTRecommendationService | null = null;

export function getGPTRecommendationService(): GPTRecommendationService {
  if (!gptRecommendationInstance) {
    gptRecommendationInstance = new GPTRecommendationService();
  }
  return gptRecommendationInstance;
}
