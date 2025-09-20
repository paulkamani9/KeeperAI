"use server";

import OpenAI from "openai";

/**
 * Check connectivity and API key validity for OpenAI.
 *
 * Get default max tokens based on summary type
 *
 * This performs a lightweight test call to the OpenAI chat completions endpoint
 * to verify the provided API key works and the service is reachable. Returns
 * true on success and false on any failure (errors are logged).
 */
export async function checkOpenAiConnectionStatus(): Promise<boolean> {
  try {
    const openAi = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY as string,
    });

    // Simple test call to verify API key and connection
    await openAi.chat.completions.create({
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
