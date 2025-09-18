/**
 * Standardized Error Handling System
 *
 * Provides consistent error types, handling, and user-friendly messages
 * across all services and components in the application.
 */

import * as React from "react";

/**
 * Standard error categories for consistent handling
 */
export enum ErrorCategory {
  /** Network connectivity issues */
  NETWORK = "NETWORK",
  /** API service errors (rate limits, authentication, etc.) */
  API = "API",
  /** Client-side validation errors */
  VALIDATION = "VALIDATION",
  /** Application configuration errors */
  CONFIGURATION = "CONFIGURATION",
  /** Unexpected runtime errors */
  RUNTIME = "RUNTIME",
  /** User permission/authorization errors */
  AUTHORIZATION = "AUTHORIZATION",
}

/**
 * Severity levels for error reporting and UI handling
 */
export enum ErrorSeverity {
  /** Low severity - informational, doesn't block functionality */
  LOW = "LOW",
  /** Medium severity - limits some functionality */
  MEDIUM = "MEDIUM",
  /** High severity - blocks core functionality */
  HIGH = "HIGH",
  /** Critical severity - application unusable */
  CRITICAL = "CRITICAL",
}

/**
 * Standardized error interface
 */
export interface StandardizedError extends Error {
  /** Error category for consistent handling */
  category: ErrorCategory;
  /** Severity level for UI and logging decisions */
  severity: ErrorSeverity;
  /** User-friendly error message */
  userMessage: string;
  /** Technical details for logging/debugging */
  technicalMessage?: string;
  /** Suggested actions for the user */
  suggestions?: string[];
  /** Whether error should be retryable */
  retryable?: boolean;
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Additional context data */
  context?: Record<string, unknown>;
  /** Original error that was wrapped */
  originalError?: Error;
  /** Timestamp when error occurred */
  timestamp: Date;
  /** Unique identifier for tracking */
  errorId: string;
}

/**
 * Create a standardized error with consistent properties
 */
export function createStandardizedError(config: {
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage: string;
  technicalMessage?: string;
  suggestions?: string[];
  retryable?: boolean;
  statusCode?: number;
  context?: Record<string, unknown>;
  originalError?: Error;
}): StandardizedError {
  const errorId = generateErrorId();

  const error = new Error(
    config.technicalMessage || config.userMessage
  ) as StandardizedError;

  error.name = `${config.category}_ERROR`;
  error.category = config.category;
  error.severity = config.severity;
  error.userMessage = config.userMessage;
  error.technicalMessage = config.technicalMessage;
  error.suggestions = config.suggestions || [];
  error.retryable = config.retryable ?? false;
  error.statusCode = config.statusCode;
  error.context = config.context;
  error.originalError = config.originalError;
  error.timestamp = new Date();
  error.errorId = errorId;

  return error;
}

/**
 * Generate unique error ID for tracking
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Pre-defined error factories for common scenarios
 */
export const ErrorFactories = {
  /**
   * Network connectivity error
   */
  network: (originalError?: Error, context?: Record<string, unknown>) =>
    createStandardizedError({
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      userMessage:
        "Network error. Please check your internet connection and try again.",
      technicalMessage: "Network request failed",
      suggestions: [
        "Check your internet connection",
        "Try refreshing the page",
        "Contact support if the problem persists",
      ],
      retryable: true,
      originalError,
      context,
    }),

  /**
   * API rate limit exceeded
   */
  rateLimit: (originalError?: Error, context?: Record<string, unknown>) =>
    createStandardizedError({
      category: ErrorCategory.API,
      severity: ErrorSeverity.MEDIUM,
      userMessage: "Too many requests. Please wait a moment and try again.",
      technicalMessage: "API rate limit exceeded",
      suggestions: [
        "Wait a few minutes before trying again",
        "Reduce the frequency of your requests",
      ],
      retryable: true,
      statusCode: 429,
      originalError,
      context,
    }),

  /**
   * API authentication/authorization error
   */
  unauthorized: (originalError?: Error, context?: Record<string, unknown>) =>
    createStandardizedError({
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.HIGH,
      userMessage: "Authentication required. Please sign in to continue.",
      technicalMessage: "API authentication failed",
      suggestions: [
        "Sign in to your account",
        "Check your account permissions",
        "Contact support if you believe this is an error",
      ],
      retryable: false,
      statusCode: 401,
      originalError,
      context,
    }),

  /**
   * Invalid user input
   */
  validation: (
    field: string,
    reason: string,
    context?: Record<string, unknown>
  ) =>
    createStandardizedError({
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      userMessage: `Invalid ${field}: ${reason}`,
      technicalMessage: `Validation failed for field '${field}': ${reason}`,
      suggestions: [
        `Please check your ${field} and try again`,
        "Make sure all required fields are filled out correctly",
      ],
      retryable: false,
      statusCode: 400,
      context: { field, reason, ...context },
    }),

  /**
   * Service configuration error
   */
  configuration: (
    service: string,
    originalError?: Error,
    context?: Record<string, unknown>
  ) =>
    createStandardizedError({
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.CRITICAL,
      userMessage: "Service temporarily unavailable. Please try again later.",
      technicalMessage: `${service} service is not properly configured`,
      suggestions: [
        "Try again in a few minutes",
        "Contact support if the problem persists",
      ],
      retryable: true,
      originalError,
      context: { service, ...context },
    }),

  /**
   * Unexpected runtime error
   */
  runtime: (
    message: string,
    originalError?: Error,
    context?: Record<string, unknown>
  ) =>
    createStandardizedError({
      category: ErrorCategory.RUNTIME,
      severity: ErrorSeverity.HIGH,
      userMessage: "An unexpected error occurred. Please try again.",
      technicalMessage: message,
      suggestions: [
        "Refresh the page and try again",
        "Contact support if the problem continues",
      ],
      retryable: true,
      originalError,
      context,
    }),

  /**
   * Search service specific errors
   */
  search: {
    noResults: (query: string, context?: Record<string, unknown>) =>
      createStandardizedError({
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        userMessage: `No results found for "${query}". Try different search terms.`,
        technicalMessage: `Search returned no results for query: ${query}`,
        suggestions: [
          "Try different or broader search terms",
          "Check your spelling",
          "Use fewer specific keywords",
        ],
        retryable: false,
        context: { query, ...context },
      }),

    serviceUnavailable: (
      originalError?: Error,
      context?: Record<string, unknown>
    ) =>
      createStandardizedError({
        category: ErrorCategory.API,
        severity: ErrorSeverity.HIGH,
        userMessage:
          "Search service is temporarily unavailable. Please try again later.",
        technicalMessage: "Book search service is not accessible",
        suggestions: [
          "Try again in a few minutes",
          "Use a different search method if available",
        ],
        retryable: true,
        originalError,
        context,
      }),

    invalidQuery: (
      query: string,
      reason: string,
      context?: Record<string, unknown>
    ) =>
      createStandardizedError({
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        userMessage: `Invalid search query: ${reason}`,
        technicalMessage: `Search validation failed: ${reason}`,
        suggestions: [
          "Make sure your search query is not empty",
          "Use only letters, numbers, and common punctuation",
          "Keep queries under 200 characters",
        ],
        retryable: false,
        context: { query, reason, ...context },
      }),
  },
};

/**
 * Convert unknown error to standardized error
 */
export function standardizeError(
  error: unknown,
  context?: Record<string, unknown>
): StandardizedError {
  // Already standardized
  if (error && typeof error === "object" && "category" in error) {
    return error as StandardizedError;
  }

  // Standard Error object
  if (error instanceof Error) {
    // Check for common error patterns
    const message = error.message.toLowerCase();

    if (message.includes("network") || message.includes("fetch")) {
      return ErrorFactories.network(error, context);
    }

    if (
      message.includes("rate limit") ||
      message.includes("too many requests")
    ) {
      return ErrorFactories.rateLimit(error, context);
    }

    if (
      message.includes("unauthorized") ||
      message.includes("authentication")
    ) {
      return ErrorFactories.unauthorized(error, context);
    }

    if (message.includes("not configured") || message.includes("missing")) {
      return ErrorFactories.configuration("API", error, context);
    }

    // Generic error wrapping
    return ErrorFactories.runtime(error.message, error, context);
  }

  // String error
  if (typeof error === "string") {
    return ErrorFactories.runtime(error, undefined, context);
  }

  // Unknown error type
  return ErrorFactories.runtime("An unknown error occurred", undefined, {
    originalType: typeof error,
    ...context,
  });
}

/**
 * Error logging utility
 */
export class ErrorLogger {
  static log(
    error: StandardizedError,
    additionalContext?: Record<string, unknown>
  ): void {
    const logData = {
      errorId: error.errorId,
      category: error.category,
      severity: error.severity,
      userMessage: error.userMessage,
      technicalMessage: error.technicalMessage,
      timestamp: error.timestamp,
      context: { ...error.context, ...additionalContext },
    };

    // In development, log full error details
    if (process.env.NODE_ENV === "development") {
      console.error("StandardizedError:", logData);
      if (error.originalError) {
        console.error("Original Error:", error.originalError);
      }
    }

    // In production, send to analytics/monitoring service
    if (process.env.NODE_ENV === "production") {
      // TODO: Integrate with your logging service (e.g., Sentry, LogRocket)
      // Example: Sentry.captureException(error, { extra: logData });
    }
  }

  static logAndThrow(
    error: StandardizedError,
    additionalContext?: Record<string, unknown>
  ): never {
    this.log(error, additionalContext);
    throw error;
  }
}

/**
 * React hook for error handling
 */
export interface UseErrorHandlerReturn {
  handleError: (
    error: unknown,
    context?: Record<string, unknown>
  ) => StandardizedError;
  clearError: () => void;
  currentError: StandardizedError | null;
}

/**
 * Hook for consistent error handling in React components
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [currentError, setCurrentError] =
    React.useState<StandardizedError | null>(null);

  const handleError = React.useCallback(
    (error: unknown, context?: Record<string, unknown>): StandardizedError => {
      const standardError = standardizeError(error, context);
      ErrorLogger.log(standardError);
      setCurrentError(standardError);
      return standardError;
    },
    []
  );

  const clearError = React.useCallback(() => {
    setCurrentError(null);
  }, []);

  return {
    handleError,
    clearError,
    currentError,
  };
}
