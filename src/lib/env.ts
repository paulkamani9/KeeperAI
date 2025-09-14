/**
 * Environment Configuration and Validation
 *
 * Centralized environment variable management with validation
 */

export interface EnvConfig {
  // Convex
  NEXT_PUBLIC_CONVEX_URL: string;
  CONVEX_DEPLOYMENT: string;

  // Redis (Upstash)
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;

  // AI Services
  OPENAI_API_KEY: string;

  // External APIs (Optional)
  GOOGLE_BOOKS_API_KEY?: string;

  // App Configuration
  NODE_ENV: "development" | "production" | "test";
  APP_URL?: string;
}

class EnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvironmentError";
  }
}

/**
 * Validate and return environment configuration
 */
export function getEnvConfig(): EnvConfig {
  const requiredEnvVars = [
    "NEXT_PUBLIC_CONVEX_URL",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "OPENAI_API_KEY",
  ] as const;

  const optionalEnvVars = [
    "GOOGLE_BOOKS_API_KEY",
    "APP_URL",
    "CONVEX_DEPLOYMENT",
  ] as const;

  // Check required variables
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new EnvironmentError(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  // Validate URLs
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL!;
  if (!redisUrl.startsWith("https://")) {
    throw new EnvironmentError(
      "UPSTASH_REDIS_REST_URL must be a valid HTTPS URL"
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
  if (!convexUrl.startsWith("https://")) {
    throw new EnvironmentError(
      "NEXT_PUBLIC_CONVEX_URL must be a valid HTTPS URL"
    );
  }

  return {
    NEXT_PUBLIC_CONVEX_URL: convexUrl,
    CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT || "dev",
    UPSTASH_REDIS_REST_URL: redisUrl,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN!,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    GOOGLE_BOOKS_API_KEY: process.env.GOOGLE_BOOKS_API_KEY,
    NODE_ENV: (process.env.NODE_ENV as any) || "development",
    APP_URL: process.env.APP_URL,
  };
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Get the base URL for the application
 */
export function getBaseUrl(): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }

  if (isProduction()) {
    return "https://your-app-domain.com"; // Update this with your production domain
  }

  return "http://localhost:3000";
}
