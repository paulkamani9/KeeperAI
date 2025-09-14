/**
 * Service Index
 *
 * Central export point for all backend services
 */

export * from "./redis";
export * from "./search";
export * from "./ai";
export * from "./googleBooksService";
export * from "./openLibraryService";
export * from "./gptRecommendationService";
export * from "./aiSummaryService";
export * from "./summaryEngine";
export * from "./monitoring";
export * from "./searchOrchestrator";

// Service initialization helper
export function initializeServices() {
  // Validate environment variables
  const requiredEnvVars = [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "OPENAI_API_KEY",
  ];

  const optionalEnvVars = [
    "GOOGLE_BOOKS_API_KEY", // Falls back to Open Library
  ];

  const missing = requiredEnvVars.filter((env) => !process.env[env]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Please check your .env.local file."
    );
  }

  const missingOptional = optionalEnvVars.filter((env) => !process.env[env]);
  if (missingOptional.length > 0) {
    console.warn(
      `Optional environment variables not set: ${missingOptional.join(", ")}. ` +
        "Some features may have reduced functionality."
    );
  }

  console.log("✅ Backend services initialized successfully");
}
