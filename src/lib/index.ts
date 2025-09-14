/**
 * Library Utilities Index
 *
 * Central export point for all utility functions
 */

export * from "./errors";
export * from "./validation";

// Re-export the existing utils
export { cn } from "./utils";

/**
 * Generate a hash from a string (simple implementation)
 */
export function generateHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Debounce function for API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  } else {
    return "Just now";
  }
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Sleep utility for testing and rate limiting
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        break;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 0.1 * delay;
      await sleep(delay + jitter);
    }
  }

  throw lastError;
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format book authors array to display string
 */
export function formatAuthors(authors: string[]): string {
  if (authors.length === 0) {
    return "Unknown Author";
  } else if (authors.length === 1) {
    return authors[0];
  } else if (authors.length === 2) {
    return authors.join(" and ");
  } else {
    return `${authors[0]} and ${authors.length - 1} others`;
  }
}

/**
 * Generate a readable book ID from title and author
 */
export function generateBookSlug(title: string, author?: string): string {
  const text = author ? `${title}-${author}` : title;
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Calculate reading time estimate (words per minute)
 */
export function calculateReadingTime(
  pageCount: number,
  wordsPerPage: number = 250,
  wordsPerMinute: number = 200
): string {
  const totalWords = pageCount * wordsPerPage;
  const minutes = Math.round(totalWords / wordsPerMinute);

  if (minutes < 60) {
    return `${minutes} min read`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hour${hours === 1 ? "" : "s"} read`;
  }

  return `${hours}h ${remainingMinutes}m read`;
}
