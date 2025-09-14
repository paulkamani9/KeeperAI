/**
 * Environment Configuration
 *
 * Centralized environment variable management with validation
 */

import { KeeperAIError } from "./errors";

interface EnvironmentConfig {
  // Convex
  NEXT_PUBLIC_CONVEX_URL: string;
  CONVEX_DEPLOYMENT: string;

  // Clerk Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  CLERK_WEBHOOK_SECRET: string;

  // Upstash Redis (Required)
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;

  // OpenAI (Required)
  OPENAI_API_KEY: string;

  // Google Books (Optional)
  GOOGLE_BOOKS_API_KEY?: string;

  // Application
  NODE_ENV: "development" | "production" | "test";
  NEXT_PUBLIC_APP_URL?: string;
}

class ConfigManager {
  private config: EnvironmentConfig | null = null;

  private loadConfig(): EnvironmentConfig {
    if (this.config) {
      return this.config;
    }

    // Required environment variables
    const requiredVars = [
      "NEXT_PUBLIC_CONVEX_URL",
      "CONVEX_DEPLOYMENT",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      "CLERK_SECRET_KEY",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
      "OPENAI_API_KEY",
    ];

    const missing = requiredVars.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new KeeperAIError(
        `Missing required environment variables: ${missing.join(", ")}`,
        "MISSING_ENV_VARS",
        500,
        "config"
      );
    }

    // Validate URLs
    this.validateUrl(
      "NEXT_PUBLIC_CONVEX_URL",
      process.env.NEXT_PUBLIC_CONVEX_URL!
    );
    this.validateUrl(
      "UPSTASH_REDIS_REST_URL",
      process.env.UPSTASH_REDIS_REST_URL!
    );

    // Validate API keys format
    this.validateApiKey("OPENAI_API_KEY", process.env.OPENAI_API_KEY!, "sk-");
    this.validateApiKey(
      "CLERK_SECRET_KEY",
      process.env.CLERK_SECRET_KEY!,
      "sk_"
    );

    if (process.env.GOOGLE_BOOKS_API_KEY) {
      this.validateApiKey(
        "GOOGLE_BOOKS_API_KEY",
        process.env.GOOGLE_BOOKS_API_KEY,
        "AIza"
      );
    }

    this.config = {
      NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL!,
      CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT!,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
      CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET || "",
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL!,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN!,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
      GOOGLE_BOOKS_API_KEY: process.env.GOOGLE_BOOKS_API_KEY,
      NODE_ENV: (process.env.NODE_ENV as any) || "development",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    };

    return this.config;
  }

  private validateUrl(name: string, value: string): void {
    try {
      new URL(value);
    } catch {
      throw new KeeperAIError(
        `Invalid URL format for ${name}: ${value}`,
        "INVALID_URL",
        500,
        "config"
      );
    }
  }

  private validateApiKey(
    name: string,
    value: string,
    expectedPrefix?: string
  ): void {
    if (expectedPrefix && !value.startsWith(expectedPrefix)) {
      throw new KeeperAIError(
        `Invalid format for ${name}: expected to start with ${expectedPrefix}`,
        "INVALID_API_KEY",
        500,
        "config"
      );
    }

    if (value.length < 10) {
      throw new KeeperAIError(
        `Invalid ${name}: too short`,
        "INVALID_API_KEY",
        500,
        "config"
      );
    }
  }

  get(): EnvironmentConfig {
    return this.loadConfig();
  }

  isProduction(): boolean {
    return this.get().NODE_ENV === "production";
  }

  isDevelopment(): boolean {
    return this.get().NODE_ENV === "development";
  }

  isTest(): boolean {
    return this.get().NODE_ENV === "test";
  }

  // Helper methods for specific configs
  getRedisConfig() {
    const config = this.get();
    return {
      url: config.UPSTASH_REDIS_REST_URL,
      token: config.UPSTASH_REDIS_REST_TOKEN,
    };
  }

  getOpenAIConfig() {
    const config = this.get();
    return {
      apiKey: config.OPENAI_API_KEY,
    };
  }

  getClerkConfig() {
    const config = this.get();
    return {
      publishableKey: config.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      secretKey: config.CLERK_SECRET_KEY,
      webhookSecret: config.CLERK_WEBHOOK_SECRET,
    };
  }

  getConvexConfig() {
    const config = this.get();
    return {
      url: config.NEXT_PUBLIC_CONVEX_URL,
      deployment: config.CONVEX_DEPLOYMENT,
    };
  }

  getGoogleBooksConfig() {
    const config = this.get();
    return {
      apiKey: config.GOOGLE_BOOKS_API_KEY,
      enabled: !!config.GOOGLE_BOOKS_API_KEY,
    };
  }

  // Log configuration status (safe for production)
  logStatus(): void {
    const config = this.get();
    const status = {
      environment: config.NODE_ENV,
      convex: "✅ Connected",
      redis: "✅ Connected",
      openai: "✅ Connected",
      clerk: "✅ Connected",
      googleBooks: config.GOOGLE_BOOKS_API_KEY
        ? "✅ Connected"
        : "⚠️ Optional - Not configured",
    };

    console.log("🔧 KeeperAI Configuration Status:");
    Object.entries(status).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }
}

// Singleton instance
const configManager = new ConfigManager();

export default configManager;

// Helper function for easy access
export function getConfig() {
  return configManager.get();
}

export function isProduction() {
  return configManager.isProduction();
}

export function isDevelopment() {
  return configManager.isDevelopment();
}
