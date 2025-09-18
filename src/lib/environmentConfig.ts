/**
 * Environment Configuration Checker
 *
 * Provides runtime validation of required environment variables
 * with clear error messages and development guidance.
 */

interface EnvironmentConfig {
  /** Required environment variables */
  required: Record<string, string>;
  /** Optional environment variables with descriptions */
  optional: Record<string, string>;
  /** Environment-specific requirements */
  conditionalRequirements?: Record<
    string,
    {
      condition: () => boolean;
      variables: string[];
      description: string;
    }
  >;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Validates environment configuration and provides helpful error messages
 */
export class EnvironmentValidator {
  private config: EnvironmentConfig;

  constructor(config: EnvironmentConfig) {
    this.config = config;
  }

  /**
   * Validate all environment variables and return detailed results
   */
  validate(): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // Check required variables
    for (const [variable, description] of Object.entries(
      this.config.required
    )) {
      if (!process.env[variable]) {
        result.isValid = false;
        result.errors.push(
          `Missing required environment variable: ${variable}\n` +
            `  Purpose: ${description}\n` +
            `  Add this to your .env.local file`
        );
      }
    }

    // Check optional variables
    for (const [variable, description] of Object.entries(
      this.config.optional
    )) {
      if (!process.env[variable]) {
        result.warnings.push(
          `Optional environment variable not set: ${variable}\n` +
            `  Purpose: ${description}\n` +
            `  This may limit some functionality`
        );
      }
    }

    // Check conditional requirements
    if (this.config.conditionalRequirements) {
      for (const [name, requirement] of Object.entries(
        this.config.conditionalRequirements
      )) {
        if (requirement.condition()) {
          for (const variable of requirement.variables) {
            if (!process.env[variable]) {
              result.isValid = false;
              result.errors.push(
                `Missing conditionally required environment variable: ${variable}\n` +
                  `  Required for: ${requirement.description}\n` +
                  `  Context: ${name}`
              );
            }
          }
        }
      }
    }

    // Add suggestions based on current configuration
    this.addSuggestions(result);

    return result;
  }

  /**
   * Validate and throw error if configuration is invalid
   */
  validateOrThrow(): void {
    const result = this.validate();

    if (!result.isValid) {
      const errorMessage = [
        "❌ Environment Configuration Error",
        "",
        ...result.errors.map((error) => `• ${error}`),
        "",
        "💡 Suggestions:",
        ...result.suggestions.map((suggestion) => `• ${suggestion}`),
        "",
        "📖 See docs/setup.md for detailed configuration guide",
      ].join("\n");

      throw new Error(errorMessage);
    }

    // Log warnings in development
    if (process.env.NODE_ENV === "development" && result.warnings.length > 0) {
      console.warn(
        "⚠️ Environment Configuration Warnings:\n" +
          result.warnings.map((warning) => `• ${warning}`).join("\n")
      );
    }
  }

  /**
   * Add contextual suggestions based on missing variables
   */
  private addSuggestions(result: ValidationResult): void {
    const missingVariables = result.errors
      .map((error) => error.match(/Missing.*environment variable: (\w+)/)?.[1])
      .filter(Boolean);

    if (missingVariables.includes("NEXT_PUBLIC_CONVEX_URL")) {
      result.suggestions.push("Set up Convex deployment at https://convex.dev");
    }

    if (missingVariables.includes("NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY")) {
      result.suggestions.push(
        "Get Google Books API key at https://console.developers.google.com"
      );
    }

    if (missingVariables.includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")) {
      result.suggestions.push(
        "Set up Clerk authentication at https://clerk.dev"
      );
    }

    // Generic suggestion
    result.suggestions.push(
      "Create .env.local file in project root with required variables",
      "Restart development server after adding environment variables"
    );
  }

  /**
   * Get environment status report for debugging
   */
  getStatusReport(): {
    environment: string;
    configuredVariables: string[];
    missingRequired: string[];
    missingOptional: string[];
  } {
    const configuredVariables = Object.keys(process.env).filter(
      (key) =>
        key.startsWith("NEXT_PUBLIC_") ||
        Object.keys(this.config.required).includes(key) ||
        Object.keys(this.config.optional).includes(key)
    );

    const missingRequired = Object.keys(this.config.required).filter(
      (key) => !process.env[key]
    );

    const missingOptional = Object.keys(this.config.optional).filter(
      (key) => !process.env[key]
    );

    return {
      environment: process.env.NODE_ENV || "development",
      configuredVariables: configuredVariables.sort(),
      missingRequired,
      missingOptional,
    };
  }
}

/**
 * KeeperAI Environment Configuration
 */
const keeperAIEnvironmentConfig: EnvironmentConfig = {
  required: {
    NEXT_PUBLIC_CONVEX_URL:
      "Convex database connection URL for backend services",
  },
  optional: {
    NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY:
      "Google Books API access for enhanced search results and book metadata",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      "Clerk authentication for user accounts and favorites (future phases)",
    UPSTASH_REDIS_REST_URL:
      "Redis caching service URL for improved performance",
    UPSTASH_REDIS_REST_TOKEN: "Redis authentication token",
    NEXT_PUBLIC_VERCEL_ANALYTICS_ID:
      "Vercel analytics for usage tracking and optimization",
  },
  conditionalRequirements: {
    "Redis Caching": {
      condition: () => Boolean(process.env.UPSTASH_REDIS_REST_URL),
      variables: ["UPSTASH_REDIS_REST_TOKEN"],
      description: "Redis URL is configured but missing authentication token",
    },
    "Production Environment": {
      condition: () => process.env.NODE_ENV === "production",
      variables: ["NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY"],
      description:
        "Google Books API key is recommended for production to avoid rate limiting",
    },
  },
};

/**
 * Default environment validator instance for KeeperAI
 */
export const environmentValidator = new EnvironmentValidator(
  keeperAIEnvironmentConfig
);

/**
 * Validate KeeperAI environment configuration
 * Call this early in your application lifecycle
 */
export function validateEnvironment(): void {
  environmentValidator.validateOrThrow();
}

/**
 * Get current environment status (for debugging/admin pages)
 */
export function getEnvironmentStatus() {
  return environmentValidator.getStatusReport();
}

/**
 * Check if specific features are available based on environment
 */
export const featureFlags = {
  /**
   * Whether Google Books API is available
   */
  get googleBooksApi(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY);
  },

  /**
   * Whether Redis caching is available
   */
  get redisCaching(): boolean {
    return Boolean(
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    );
  },

  /**
   * Whether Clerk authentication is available
   */
  get clerkAuth(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  },

  /**
   * Whether analytics tracking is enabled
   */
  get analytics(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID);
  },

  /**
   * Whether application is in development mode
   */
  get isDevelopment(): boolean {
    return process.env.NODE_ENV === "development";
  },

  /**
   * Whether application is in production mode
   */
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};
