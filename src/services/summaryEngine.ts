/**
 * Modular Summary Engine
 *
 * Extensible book summary system supporting multiple modes:
 * 1. Concise - Short, straight-to-the-point summaries
 * 2. Detailed - Comprehensive explanation of book content
 * 3. Analysis - Interprets key ideas and provides insights
 * 4. Practical - Focuses on lessons and actionable takeaways
 *
 * Architecture designed for easy extension of new summary modes.
 */

import { getAISummaryService } from "./aiSummaryService";
import { monitoring } from "./monitoring";

export type SummaryMode = "concise" | "detailed" | "analysis" | "practical";

export interface SummaryRequest {
  bookId: string;
  title: string;
  authors: string[];
  description?: string;
  genres?: string[];
  pageCount?: number;
  publishedDate?: string;
  mode: SummaryMode;
  customPrompt?: string;
  userContext?: {
    userId: string;
    preferences?: string[];
    previousSummaries?: string[];
  };
}

export interface SummaryResponse {
  content: string;
  mode: SummaryMode;
  confidence: number;
  wordCount: number;
  estimatedReadTime: string;
  keyPoints: string[];
  processingTime: number;
  cached: boolean;
  metadata: {
    bookId: string;
    generatedAt: number;
    model: string;
    version: string;
  };
}

export interface SummaryModeConfig {
  name: SummaryMode;
  displayName: string;
  description: string;
  maxTokens: number;
  temperature: number;
  promptTemplate: (request: SummaryRequest) => string;
  postProcessor: (
    content: string,
    request: SummaryRequest
  ) => {
    content: string;
    keyPoints: string[];
    estimatedReadTime: string;
  };
  validator?: (content: string) => { valid: boolean; issues?: string[] };
}

/**
 * Abstract base class for summary mode implementations
 */
abstract class SummaryModeHandler {
  abstract readonly mode: SummaryMode;
  abstract readonly config: SummaryModeConfig;

  /**
   * Generate summary for this mode
   */
  async generateSummary(
    request: SummaryRequest
  ): Promise<Omit<SummaryResponse, "processingTime" | "cached" | "metadata">> {
    const startTime = Date.now();

    try {
      // Generate AI content
      const aiService = getAISummaryService();
      const aiRequest = {
        ...request,
        mode: this.mode,
        regeneratePrompt: request.customPrompt,
      };

      const aiResponse = await aiService.generateSummary(aiRequest);

      // Post-process the content
      const processed = this.config.postProcessor(aiResponse.summary, request);

      // Validate if validator exists
      if (this.config.validator) {
        const validation = this.config.validator(processed.content);
        if (!validation.valid) {
          throw new Error(
            `Summary validation failed: ${validation.issues?.join(", ")}`
          );
        }
      }

      return {
        content: processed.content,
        mode: this.mode,
        confidence: aiResponse.confidence,
        wordCount: aiResponse.wordCount,
        estimatedReadTime: processed.estimatedReadTime,
        keyPoints: processed.keyPoints,
      };
    } catch (error) {
      await monitoring.recordError(
        "summary_engine",
        `generate_${this.mode}`,
        error as Error
      );
      throw error;
    }
  }

  /**
   * Extract key points from summary content
   */
  protected extractKeyPoints(content: string): string[] {
    // Generic key point extraction - can be overridden by specific modes
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    const keyPoints: string[] = [];

    for (const line of lines) {
      // Look for bullet points, numbered lists, or "Key:" patterns
      if (
        line.match(/^[-•*]\s+/) ||
        line.match(/^\d+\.\s+/) ||
        line.toLowerCase().includes("key")
      ) {
        keyPoints.push(line.replace(/^[-•*\d.]\s*/, "").trim());
      }
    }

    // If no structured points found, extract first sentences from paragraphs
    if (keyPoints.length === 0) {
      const paragraphs = content.split("\n\n");
      for (const paragraph of paragraphs.slice(0, 5)) {
        const firstSentence = paragraph.split(".")[0];
        if (firstSentence.length > 20 && firstSentence.length < 150) {
          keyPoints.push(firstSentence.trim() + ".");
        }
      }
    }

    return keyPoints.slice(0, 8); // Limit to 8 key points
  }

  /**
   * Calculate estimated reading time
   */
  protected calculateReadingTime(wordCount: number): string {
    const wordsPerMinute = 200;
    const minutes = Math.ceil(wordCount / wordsPerMinute);

    if (minutes < 1) return "< 1 min";
    if (minutes === 1) return "1 min";
    if (minutes < 60) return `${minutes} mins`;

    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;

    if (remainingMins === 0) return `${hours}h`;
    return `${hours}h ${remainingMins}m`;
  }
}

/**
 * Concise Summary Mode
 * Short, straight-to-the-point summaries (200-400 words)
 */
class ConciseSummaryHandler extends SummaryModeHandler {
  readonly mode: SummaryMode = "concise";
  readonly config: SummaryModeConfig = {
    name: "concise",
    displayName: "Concise",
    description:
      "Short, straight-to-the-point summary perfect for quick understanding",
    maxTokens: 600,
    temperature: 0.3,
    promptTemplate: (request: SummaryRequest) =>
      `
Create a concise, straight-to-the-point summary of "${request.title}" by ${request.authors.join(", ")}.

Book Description: ${request.description || "No description available"}
${request.genres ? `Genres: ${request.genres.join(", ")}` : ""}

Requirements:
- 200-400 words maximum
- Focus on the main concept and core message
- Include 3-5 key takeaways as bullet points
- Write in clear, accessible language
- Avoid unnecessary details or examples

Format:
[Main summary paragraph]

Key Takeaways:
• [Point 1]
• [Point 2]
• [Point 3]
• [Point 4]
• [Point 5]

${request.customPrompt ? `\nAdditional Context: ${request.customPrompt}` : ""}
    `.trim(),

    postProcessor: (content: string, request: SummaryRequest) => {
      const handler = new ConciseSummaryHandler();
      return {
        content,
        keyPoints: handler.extractKeyPoints(content),
        estimatedReadTime: handler.calculateReadingTime(
          content.split(" ").length
        ),
      };
    },

    validator: (content: string) => {
      const wordCount = content.split(" ").length;
      const issues: string[] = [];

      if (wordCount < 150) issues.push("Summary too short");
      if (wordCount > 500) issues.push("Summary too long for concise mode");
      if (!content.includes("•") && !content.includes("-")) {
        issues.push("Missing key takeaways bullets");
      }

      return { valid: issues.length === 0, issues };
    },
  };
}

/**
 * Detailed Summary Mode
 * Comprehensive explanation of book content (800-1200 words)
 */
class DetailedSummaryHandler extends SummaryModeHandler {
  readonly mode: SummaryMode = "detailed";
  readonly config: SummaryModeConfig = {
    name: "detailed",
    displayName: "Detailed",
    description:
      "Comprehensive overview covering all major concepts and chapters",
    maxTokens: 1500,
    temperature: 0.4,
    promptTemplate: (request: SummaryRequest) =>
      `
Create a comprehensive, detailed summary of "${request.title}" by ${request.authors.join(", ")}.

Book Description: ${request.description || "No description available"}
${request.genres ? `Genres: ${request.genres.join(", ")}` : ""}
${request.pageCount ? `Pages: ${request.pageCount}` : ""}

Requirements:
- 800-1200 words
- Cover main themes, concepts, and chapter-by-chapter breakdown
- Include context about the author's background/expertise if relevant
- Explain key methodologies, frameworks, or theories presented
- Provide specific examples or case studies mentioned
- Maintain scholarly yet accessible tone

Structure:
1. Overview and Author Background
2. Main Themes and Concepts
3. Chapter-by-Chapter Breakdown
4. Key Methodologies/Frameworks
5. Notable Examples and Case Studies
6. Conclusions and Impact

${request.customPrompt ? `\nAdditional Focus: ${request.customPrompt}` : ""}
    `.trim(),

    postProcessor: (content: string, request: SummaryRequest) => {
      const handler = new DetailedSummaryHandler();
      return {
        content,
        keyPoints: handler.extractKeyPoints(content),
        estimatedReadTime: handler.calculateReadingTime(
          content.split(" ").length
        ),
      };
    },

    validator: (content: string) => {
      const wordCount = content.split(" ").length;
      const issues: string[] = [];

      if (wordCount < 600) issues.push("Summary too short for detailed mode");
      if (wordCount > 1500) issues.push("Summary too long");

      return { valid: issues.length === 0, issues };
    },
  };
}

/**
 * Analysis Summary Mode
 * Interprets key ideas and provides insights (600-900 words)
 */
class AnalysisSummaryHandler extends SummaryModeHandler {
  readonly mode: SummaryMode = "analysis";
  readonly config: SummaryModeConfig = {
    name: "analysis",
    displayName: "Analysis",
    description:
      "Deep interpretation of key ideas with critical insights and commentary",
    maxTokens: 1200,
    temperature: 0.5,
    promptTemplate: (request: SummaryRequest) =>
      `
Provide an analytical summary of "${request.title}" by ${request.authors.join(", ")}.

Book Description: ${request.description || "No description available"}
${request.genres ? `Genres: ${request.genres.join(", ")}` : ""}

Requirements:
- 600-900 words
- Focus on interpreting and analyzing key ideas rather than just describing them
- Provide critical insights and commentary
- Discuss the book's significance, impact, and relevance
- Compare with other works in the field if applicable
- Evaluate strengths and weaknesses of arguments
- Consider different perspectives on the topics

Structure:
1. Central Thesis and Core Arguments
2. Critical Analysis of Key Concepts
3. Strengths and Limitations
4. Broader Context and Significance
5. Comparative Perspectives
6. Personal Reflection and Implications

${request.customPrompt ? `\nAnalytical Focus: ${request.customPrompt}` : ""}
    `.trim(),

    postProcessor: (content: string, request: SummaryRequest) => {
      const handler = new AnalysisSummaryHandler();
      return {
        content,
        keyPoints: handler.extractKeyPoints(content),
        estimatedReadTime: handler.calculateReadingTime(
          content.split(" ").length
        ),
      };
    },

    validator: (content: string) => {
      const wordCount = content.split(" ").length;
      const issues: string[] = [];

      if (wordCount < 500) issues.push("Analysis too short");
      if (wordCount > 1100) issues.push("Analysis too long");
      if (
        !content.toLowerCase().includes("analys") &&
        !content.toLowerCase().includes("interpret")
      ) {
        issues.push("Missing analytical language");
      }

      return { valid: issues.length === 0, issues };
    },
  };
}

/**
 * Practical Summary Mode
 * Focuses on lessons and actionable takeaways (500-800 words)
 */
class PracticalSummaryHandler extends SummaryModeHandler {
  readonly mode: SummaryMode = "practical";
  readonly config: SummaryModeConfig = {
    name: "practical",
    displayName: "Practical",
    description:
      "Action-oriented summary focusing on implementable lessons and takeaways",
    maxTokens: 1000,
    temperature: 0.3,
    promptTemplate: (request: SummaryRequest) =>
      `
Create a practical, action-oriented summary of "${request.title}" by ${request.authors.join(", ")}.

Book Description: ${request.description || "No description available"}
${request.genres ? `Genres: ${request.genres.join(", ")}` : ""}

Requirements:
- 500-800 words
- Focus exclusively on actionable lessons and practical takeaways
- Provide step-by-step guidance where applicable
- Include specific techniques, tools, or methods mentioned
- Organize content for easy implementation
- Use action-oriented language ("do this", "try that", "implement", etc.)

Structure:
1. Quick Overview
2. Key Actionable Principles
3. Specific Techniques and Methods
4. Implementation Steps
5. Common Pitfalls to Avoid
6. Getting Started Checklist

Format each actionable item clearly with:
- What to do
- How to do it
- Why it matters
- When to apply it

${request.customPrompt ? `\nPractical Focus: ${request.customPrompt}` : ""}
    `.trim(),

    postProcessor: (content: string, request: SummaryRequest) => {
      const handler = new PracticalSummaryHandler();
      const keyPoints = handler.extractPracticalActions(content);

      return {
        content,
        keyPoints,
        estimatedReadTime: handler.calculateReadingTime(
          content.split(" ").length
        ),
      };
    },

    validator: (content: string) => {
      const wordCount = content.split(" ").length;
      const issues: string[] = [];

      if (wordCount < 400) issues.push("Practical summary too short");
      if (wordCount > 1000) issues.push("Practical summary too long");

      const actionWords = [
        "implement",
        "apply",
        "use",
        "try",
        "do",
        "start",
        "begin",
        "practice",
      ];
      const hasActionWords = actionWords.some((word) =>
        content.toLowerCase().includes(word)
      );
      if (!hasActionWords) issues.push("Missing action-oriented language");

      return { valid: issues.length === 0, issues };
    },
  };

  /**
   * Extract practical actions from content
   */
  private extractPracticalActions(content: string): string[] {
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    const actions: string[] = [];

    for (const line of lines) {
      // Look for action items (numbered, bulleted, or action verbs)
      const actionVerbs =
        /^(implement|apply|use|try|do|start|begin|practice|create|develop|build)/i;
      const structuredList = /^[-•*\d.]\s+/;

      if (structuredList.test(line) || actionVerbs.test(line)) {
        const action = line.replace(/^[-•*\d.]\s*/, "").trim();
        if (action.length > 10 && action.length < 120) {
          actions.push(action);
        }
      }
    }

    return actions.slice(0, 10); // Limit to 10 practical actions
  }
}

/**
 * Main Summary Engine
 * Coordinates different summary modes and provides extensible architecture
 */
export class SummaryEngine {
  private handlers: Map<SummaryMode, SummaryModeHandler>;

  constructor() {
    this.handlers = new Map([
      ["concise", new ConciseSummaryHandler()],
      ["detailed", new DetailedSummaryHandler()],
      ["analysis", new AnalysisSummaryHandler()],
      ["practical", new PracticalSummaryHandler()],
    ]);
  }

  /**
   * Generate summary using specified mode
   */
  async generateSummary(request: SummaryRequest): Promise<SummaryResponse> {
    const startTime = Date.now();

    try {
      const handler = this.handlers.get(request.mode);
      if (!handler) {
        throw new Error(`Unsupported summary mode: ${request.mode}`);
      }

      // Record GPT request for monitoring
      await monitoring.recordGPTRequest("summary", 0, true, 0, 0, {
        mode: request.mode,
        bookId: request.bookId,
      });

      // Generate summary
      const result = await handler.generateSummary(request);
      const processingTime = Date.now() - startTime;

      // Record successful completion
      await monitoring.recordGPTRequest("summary", processingTime, true);

      return {
        ...result,
        processingTime,
        cached: false, // This will be set by the AI service if cached
        metadata: {
          bookId: request.bookId,
          generatedAt: Date.now(),
          model: "gpt-4o-mini",
          version: "1.0",
        },
      };
    } catch (error) {
      await monitoring.recordError(
        "summary_engine",
        "generate",
        error as Error
      );
      throw error;
    }
  }

  /**
   * Get available summary modes
   */
  getAvailableModes(): Array<{ mode: SummaryMode; config: SummaryModeConfig }> {
    return Array.from(this.handlers.entries()).map(([mode, handler]) => ({
      mode,
      config: handler.config,
    }));
  }

  /**
   * Register a new summary mode (for extensibility)
   */
  registerMode(mode: SummaryMode, handler: SummaryModeHandler): void {
    this.handlers.set(mode, handler);
  }

  /**
   * Validate a summary mode
   */
  isSupportedMode(mode: string): mode is SummaryMode {
    return this.handlers.has(mode as SummaryMode);
  }

  /**
   * Get mode configuration
   */
  getModeConfig(mode: SummaryMode): SummaryModeConfig | null {
    const handler = this.handlers.get(mode);
    return handler ? handler.config : null;
  }
}

// Singleton instance
let summaryEngineInstance: SummaryEngine | null = null;

export function getSummaryEngine(): SummaryEngine {
  if (!summaryEngineInstance) {
    summaryEngineInstance = new SummaryEngine();
  }
  return summaryEngineInstance;
}

// Convenience export for common usage
export const summaryEngine = {
  generate: (request: SummaryRequest) =>
    getSummaryEngine().generateSummary(request),
  getModes: () => getSummaryEngine().getAvailableModes(),
  isSupported: (mode: string) => getSummaryEngine().isSupportedMode(mode),
  getConfig: (mode: SummaryMode) => getSummaryEngine().getModeConfig(mode),
};
