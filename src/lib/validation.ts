/**
 * Validation Utilities
 *
 * Input validation and sanitization helpers
 */

import { ValidationError } from "./errors";

/**
 * Validate search query parameters
 */
export function validateSearchQuery(query: unknown): string {
  if (typeof query !== "string") {
    throw new ValidationError("Search query must be a string", "query");
  }

  const trimmed = query.trim();

  if (trimmed.length === 0) {
    throw new ValidationError("Search query cannot be empty", "query");
  }

  if (trimmed.length > 200) {
    throw new ValidationError(
      "Search query is too long (max 200 characters)",
      "query"
    );
  }

  // Remove potentially dangerous characters
  const sanitized = trimmed.replace(/[<>\"\']/g, "");

  return sanitized;
}

/**
 * Validate book ID
 */
export function validateBookId(bookId: unknown): string {
  if (typeof bookId !== "string") {
    throw new ValidationError("Book ID must be a string", "bookId");
  }

  const trimmed = bookId.trim();

  if (trimmed.length === 0) {
    throw new ValidationError("Book ID cannot be empty", "bookId");
  }

  if (trimmed.length > 100) {
    throw new ValidationError(
      "Book ID is too long (max 100 characters)",
      "bookId"
    );
  }

  // Basic pattern validation (alphanumeric, dashes, underscores)
  if (!/^[a-zA-Z0-9\-_]+$/.test(trimmed)) {
    throw new ValidationError("Book ID contains invalid characters", "bookId");
  }

  return trimmed;
}

/**
 * Validate summary mode
 */
export function validateSummaryMode(
  mode: unknown
): "brief" | "detailed" | "analysis" {
  if (typeof mode !== "string") {
    throw new ValidationError("Summary mode must be a string", "mode");
  }

  const validModes = ["brief", "detailed", "analysis"] as const;

  if (!validModes.includes(mode as any)) {
    throw new ValidationError(
      `Summary mode must be one of: ${validModes.join(", ")}`,
      "mode"
    );
  }

  return mode as "brief" | "detailed" | "analysis";
}

/**
 * Validate pagination parameters
 */
export function validatePagination(params: {
  limit?: unknown;
  offset?: unknown;
}): { limit: number; offset: number } {
  let limit = 10; // default
  let offset = 0; // default

  if (params.limit !== undefined) {
    if (typeof params.limit !== "number" && typeof params.limit !== "string") {
      throw new ValidationError("Limit must be a number", "limit");
    }

    const parsedLimit = Number(params.limit);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      throw new ValidationError("Limit must be between 1 and 50", "limit");
    }

    limit = parsedLimit;
  }

  if (params.offset !== undefined) {
    if (
      typeof params.offset !== "number" &&
      typeof params.offset !== "string"
    ) {
      throw new ValidationError("Offset must be a number", "offset");
    }

    const parsedOffset = Number(params.offset);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      throw new ValidationError("Offset must be 0 or greater", "offset");
    }

    offset = parsedOffset;
  }

  return { limit, offset };
}

/**
 * Validate user preferences array
 */
export function validatePreferences(preferences: unknown): string[] {
  if (!Array.isArray(preferences)) {
    throw new ValidationError("Preferences must be an array", "preferences");
  }

  if (preferences.length > 50) {
    throw new ValidationError("Too many preferences (max 50)", "preferences");
  }

  const validated = preferences.map((pref, index) => {
    if (typeof pref !== "string") {
      throw new ValidationError(
        `Preference at index ${index} must be a string`,
        "preferences"
      );
    }

    const trimmed = pref.trim();
    if (trimmed.length === 0) {
      throw new ValidationError(
        `Preference at index ${index} cannot be empty`,
        "preferences"
      );
    }

    if (trimmed.length > 100) {
      throw new ValidationError(
        `Preference at index ${index} is too long (max 100 characters)`,
        "preferences"
      );
    }

    return trimmed;
  });

  // Remove duplicates
  return [...new Set(validated)];
}

/**
 * Sanitize HTML content (basic)
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validate email format (basic)
 */
export function validateEmail(email: unknown): string {
  if (typeof email !== "string") {
    throw new ValidationError("Email must be a string", "email");
  }

  const trimmed = email.trim().toLowerCase();

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    throw new ValidationError("Invalid email format", "email");
  }

  if (trimmed.length > 254) {
    throw new ValidationError(
      "Email is too long (max 254 characters)",
      "email"
    );
  }

  return trimmed;
}

/**
 * Validate and normalize book title
 */
export function validateBookTitle(title: unknown): string {
  if (typeof title !== "string") {
    throw new ValidationError("Book title must be a string", "title");
  }

  const trimmed = title.trim();

  if (trimmed.length === 0) {
    throw new ValidationError("Book title cannot be empty", "title");
  }

  if (trimmed.length > 500) {
    throw new ValidationError(
      "Book title is too long (max 500 characters)",
      "title"
    );
  }

  return trimmed;
}

/**
 * Validate and normalize author name
 */
export function validateAuthorName(author: unknown): string {
  if (typeof author !== "string") {
    throw new ValidationError("Author name must be a string", "author");
  }

  const trimmed = author.trim();

  if (trimmed.length === 0) {
    throw new ValidationError("Author name cannot be empty", "author");
  }

  if (trimmed.length > 200) {
    throw new ValidationError(
      "Author name is too long (max 200 characters)",
      "author"
    );
  }

  return trimmed;
}
