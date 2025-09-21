import {
  SUMMARY_TYPE_DESCRIPTIONS,
  SummaryGenerationParams,
  SummaryType,
} from "@/types/summary";

/**
 * Build system prompt based on summary type
 */
export function buildSystemPrompt(summaryType: SummaryType): string {
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
export function buildUserPrompt(params: SummaryGenerationParams): string {
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
