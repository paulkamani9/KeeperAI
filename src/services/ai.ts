/**
 * AI Service for GPT Integration
 *
 * This service handles AI-powered book recommendations and search enhancement.
 */

import { getRedisService, CacheKeys, CacheTTL } from "./redis";
import { NormalizedBook } from "./search";

export interface BookRecommendationRequest {
  preferences: string[];
  excludeBooks?: string[];
  maxRecommendations?: number;
  category?: string;
}

export interface BookSuggestion {
  title: string;
  author: string;
  reason: string;
  confidence: number;
  category?: string;
}

export interface AIRecommendationResponse {
  suggestions: BookSuggestion[];
  reasoning: string;
  confidence: number;
}

export interface PromptSearchRequest {
  query: string;
  context?: {
    previousSearches?: string[];
    userPreferences?: string[];
    currentBooks?: NormalizedBook[];
  };
}

export interface GPTSearchResponse {
  searchTerms: string[];
  explanation: string;
  suggestedFilters?: {
    genre?: string;
    author?: string;
    publishYear?: string;
  };
}

export class AIService {
  private redis = getRedisService();
  private apiKey: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
      );
    }
    this.apiKey = apiKey;
  }

  /**
   * Generate book recommendations based on user preferences
   */
  async generateRecommendations(
    request: BookRecommendationRequest
  ): Promise<AIRecommendationResponse> {
    const { preferences, excludeBooks = [], maxRecommendations = 5 } = request;

    // Create cache key based on preferences
    const preferencesHash = this.createPreferencesHash(preferences);
    const cacheKey = CacheKeys.gptRecommendations("user", preferencesHash);

    // Check cache first
    const cached = await this.redis.get<AIRecommendationResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const prompt = this.createRecommendationPrompt(request);

    try {
      const response = await this.callOpenAI(prompt, {
        maxTokens: 1000,
        temperature: 0.7,
      });

      const recommendations = JSON.parse(response) as AIRecommendationResponse;

      // Cache the results
      await this.redis.set(cacheKey, recommendations, {
        ttl: CacheTTL.GPT_RECOMMENDATIONS,
      });

      return recommendations;
    } catch (error) {
      console.error("GPT recommendations error:", error);
      return this.getFallbackRecommendations(request);
    }
  }

  /**
   * Process natural language search queries
   */
  async processPromptSearch(
    request: PromptSearchRequest
  ): Promise<GPTSearchResponse> {
    const prompt = this.createSearchPrompt(request);

    try {
      const response = await this.callOpenAI(prompt, {
        maxTokens: 500,
        temperature: 0.3,
      });

      return JSON.parse(response) as GPTSearchResponse;
    } catch (error) {
      console.error("GPT search processing error:", error);
      return this.getFallbackSearchResponse(request);
    }
  }

  /**
   * Generate book summary in different modes
   */
  async generateSummary(
    book: Pick<NormalizedBook, "title" | "authors" | "description">,
    mode: "brief" | "detailed" | "analysis"
  ): Promise<string> {
    const prompt = this.createSummaryPrompt(book, mode);

    try {
      return await this.callOpenAI(prompt, {
        maxTokens: mode === "brief" ? 200 : mode === "detailed" ? 500 : 800,
        temperature: 0.5,
      });
    } catch (error) {
      console.error("GPT summary generation error:", error);
      return this.getFallbackSummary(book, mode);
    }
  }

  /**
   * Call OpenAI API with error handling and rate limiting
   */
  private async callOpenAI(
    prompt: string,
    options: {
      maxTokens: number;
      temperature: number;
    }
  ): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Cost-effective model
        messages: [
          {
            role: "system",
            content:
              "You are a knowledgeable book recommendation assistant. Always respond with valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: options.maxTokens,
        temperature: options.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Create recommendation prompt for GPT
   */
  private createRecommendationPrompt(
    request: BookRecommendationRequest
  ): string {
    const {
      preferences,
      excludeBooks = [],
      maxRecommendations = 5,
      category,
    } = request;

    return `Based on these user preferences: ${preferences.join(", ")}
${category ? `Focus on the "${category}" category.` : ""}
${excludeBooks.length > 0 ? `Exclude these books: ${excludeBooks.join(", ")}` : ""}

Generate ${maxRecommendations} book recommendations. Return a JSON object with this exact structure:
{
  "suggestions": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "reason": "Why this book matches the user's preferences",
      "confidence": 0.8,
      "category": "Genre/Category"
    }
  ],
  "reasoning": "Overall explanation of the recommendation strategy",
  "confidence": 0.85
}

Focus on well-known books that are likely to be found in major book databases.`;
  }

  /**
   * Create search prompt for GPT
   */
  private createSearchPrompt(request: PromptSearchRequest): string {
    const { query, context } = request;

    return `Convert this natural language query into effective book search terms: "${query}"
${context?.userPreferences ? `User preferences: ${context.userPreferences.join(", ")}` : ""}
${context?.previousSearches ? `Previous searches: ${context.previousSearches.join(", ")}` : ""}

Return a JSON object with this structure:
{
  "searchTerms": ["term1", "term2", "term3"],
  "explanation": "Why these terms were chosen",
  "suggestedFilters": {
    "genre": "Genre if applicable",
    "author": "Author if mentioned",
    "publishYear": "Year range if mentioned"
  }
}`;
  }

  /**
   * Create summary prompt for GPT
   */
  private createSummaryPrompt(
    book: Pick<NormalizedBook, "title" | "authors" | "description">,
    mode: "brief" | "detailed" | "analysis"
  ): string {
    const modeInstructions = {
      brief:
        "Write a brief 2-3 sentence summary highlighting the main theme and appeal.",
      detailed:
        "Write a detailed summary covering plot, themes, characters, and what readers can expect.",
      analysis:
        "Write a critical analysis discussing themes, literary significance, and target audience.",
    };

    return `Book: "${book.title}" by ${book.authors.join(", ")}
${book.description ? `Description: ${book.description}` : ""}

${modeInstructions[mode]}
Return only the summary text, no additional formatting or labels.`;
  }

  /**
   * Create hash from preferences array for caching
   */
  private createPreferencesHash(preferences: string[]): string {
    return Buffer.from(preferences.sort().join("|"))
      .toString("base64")
      .slice(0, 16);
  }

  /**
   * Fallback recommendations when AI fails
   */
  private getFallbackRecommendations(
    request: BookRecommendationRequest
  ): AIRecommendationResponse {
    return {
      suggestions: [
        {
          title: "Popular Fiction",
          author: "Various Authors",
          reason: "AI service unavailable - showing fallback recommendations",
          confidence: 0.5,
          category: "General Fiction",
        },
      ],
      reasoning: "AI recommendations temporarily unavailable",
      confidence: 0.5,
    };
  }

  /**
   * Fallback search response when AI fails
   */
  private getFallbackSearchResponse(
    request: PromptSearchRequest
  ): GPTSearchResponse {
    return {
      searchTerms: [request.query],
      explanation: "AI search processing unavailable - using direct query",
      suggestedFilters: {},
    };
  }

  /**
   * Fallback summary when AI fails
   */
  private getFallbackSummary(
    book: Pick<NormalizedBook, "title" | "authors" | "description">,
    mode: string
  ): string {
    return (
      book.description ||
      `No summary available for "${book.title}" by ${book.authors.join(", ")}.`
    );
  }
}

// Singleton instance
let aiInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiInstance) {
    aiInstance = new AIService();
  }
  return aiInstance;
}
