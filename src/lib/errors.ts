/**
 * Error Handling Utilities
 *
 * Centralized error handling for the KeeperAI backend
 */

export class KeeperAIError extends Error {
  public code: string;
  public statusCode: number;
  public service?: string;
  public details?: any;

  constructor(
    message: string,
    code: string = "UNKNOWN_ERROR",
    statusCode: number = 500,
    service?: string,
    details?: any
  ) {
    super(message);
    this.name = "KeeperAIError";
    this.code = code;
    this.statusCode = statusCode;
    this.service = service;
    this.details = details;
  }
}

export class ValidationError extends KeeperAIError {
  constructor(message: string, field?: string) {
    super(message, "VALIDATION_ERROR", 400, undefined, { field });
    this.name = "ValidationError";
  }
}

export class ServiceUnavailableError extends KeeperAIError {
  constructor(service: string, originalError?: any) {
    super(
      `Service ${service} is currently unavailable`,
      "SERVICE_UNAVAILABLE",
      503,
      service,
      { originalError }
    );
    this.name = "ServiceUnavailableError";
  }
}

export class RateLimitError extends KeeperAIError {
  constructor(service: string, retryAfter?: number) {
    super(
      `Rate limit exceeded for ${service}`,
      "RATE_LIMIT_EXCEEDED",
      429,
      service,
      { retryAfter }
    );
    this.name = "RateLimitError";
  }
}

export class NotFoundError extends KeeperAIError {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` with id ${id}` : ""} not found`,
      "NOT_FOUND",
      404,
      undefined,
      { resource, id }
    );
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends KeeperAIError {
  constructor(message: string = "Unauthorized access") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

/**
 * Safe error handler that doesn't expose internal details in production
 */
export function handleError(error: unknown): {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
} {
  const isProduction = process.env.NODE_ENV === "production";

  if (error instanceof KeeperAIError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: isProduction ? undefined : error.details,
    };
  }

  if (error instanceof Error) {
    return {
      message: isProduction ? "Internal server error" : error.message,
      code: "INTERNAL_ERROR",
      statusCode: 500,
      details: isProduction ? undefined : { stack: error.stack },
    };
  }

  return {
    message: "Unknown error occurred",
    code: "UNKNOWN_ERROR",
    statusCode: 500,
  };
}

/**
 * Async function wrapper with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const handled = handleError(error);
      throw new KeeperAIError(
        handled.message,
        handled.code,
        handled.statusCode,
        undefined,
        handled.details
      );
    }
  };
}

/**
 * Log error with structured data
 */
export function logError(error: unknown, context?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const errorInfo = handleError(error);

  const logData = {
    timestamp,
    level: "error",
    ...errorInfo,
    context,
  };

  // In development, log to console with pretty formatting
  if (process.env.NODE_ENV === "development") {
    console.error("🚨 KeeperAI Error:", logData);
  } else {
    // In production, log as JSON for structured logging
    console.error(JSON.stringify(logData));
  }
}

/**
 * Create a circuit breaker for external service calls
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailTime: number = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailTime > this.timeout) {
        this.state = "half-open";
      } else {
        throw new ServiceUnavailableError("Circuit breaker is open");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = "open";
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailTime: this.lastFailTime,
    };
  }
}
