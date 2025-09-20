"use server";

import OpenAI from "openai";

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
