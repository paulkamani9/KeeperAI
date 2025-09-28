import { z } from "zod";

/**
 * Generic API response wrapper
 * Most APIs return data in a structured format
 */
export interface ApiResponse<T = any> {
  /** Whether the request was successful */
  success: boolean;

  /** Response data (if successful) */
  data?: T;

  /** Error message (if failed) */
  error?: string;

  /** HTTP status code */
  status: number;

  /** Additional metadata */
  meta?: {
    /** Total items available (for pagination) */
    totalItems?: number;

    /** Current page/offset */
    page?: number;

    /** Items per page */
    perPage?: number;

    /** Query that generated this response */
    query?: string;

    /** Response time in milliseconds */
    responseTime?: number;

    /** API source */
    source?: string;

    /** Rate limit information */
    rateLimit?: {
      limit: number;
      remaining: number;
      resetTime: number;
    };
  };
}

/**
 * Google Books API specific types
 * Based on Google Books API v1 documentation
 */

/** Google Books API volume response */
export interface GoogleBooksVolume {
  kind: string;
  id: string;
  etag?: string;
  selfLink?: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    readingModes?: {
      text: boolean;
      image: boolean;
    };
    pageCount?: number;
    printType?: string;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    maturityRating?: string;
    allowAnonLogging?: boolean;
    contentVersion?: string;
    panelizationSummary?: {
      containsEpubBubbles: boolean;
      containsImageBubbles: boolean;
    };
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
    language?: string;
    previewLink?: string;
    infoLink?: string;
    canonicalVolumeLink?: string;
  };
  saleInfo?: {
    country?: string;
    saleability?: string;
    isEbook?: boolean;
    listPrice?: {
      amount: number;
      currencyCode: string;
    };
    retailPrice?: {
      amount: number;
      currencyCode: string;
    };
    buyLink?: string;
  };
  accessInfo?: {
    country?: string;
    viewability?: string;
    embeddable?: boolean;
    publicDomain?: boolean;
    textToSpeechPermission?: string;
    epub?: {
      isAvailable: boolean;
      acsTokenLink?: string;
    };
    pdf?: {
      isAvailable: boolean;
      acsTokenLink?: string;
    };
    webReaderLink?: string;
    accessViewStatus?: string;
    quoteSharingAllowed?: boolean;
  };
  searchInfo?: {
    textSnippet?: string;
  };
}

/** Google Books API search response */
export interface GoogleBooksResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBooksVolume[];
}

/**
 * Open Library API specific types
 * Based on Open Library API documentation
 */

/** Open Library work response */
export interface OpenLibraryWork {
  key: string;
  title: string;
  subtitle?: string;
  authors?: Array<{
    author: {
      key: string;
    };
    type: {
      key: string;
    };
  }>;
  type: {
    key: string;
  };
  description?:
    | string
    | {
        type: string;
        value: string;
      };
  covers?: number[];
  subject_places?: string[];
  subjects?: string[];
  subject_people?: string[];
  subject_times?: string[];
  first_publish_date?: string;
  links?: Array<{
    title: string;
    url: string;
    type: {
      key: string;
    };
  }>;
}

/** Open Library author response */
export interface OpenLibraryAuthor {
  key: string;
  type: {
    key: string;
  };
  name: string;
  personal_name?: string;
  bio?:
    | string
    | {
        type: string;
        value: string;
      };
  birth_date?: string;
  death_date?: string;
  alternate_names?: string[];
  links?: Array<{
    title: string;
    url: string;
    type: {
      key: string;
    };
  }>;
}

/** Open Library search response */
export interface OpenLibrarySearchResponse {
  start: number;
  num_found: number;
  numFound: number;
  docs: Array<{
    key: string;
    type: string;
    seed?: string[];
    title: string;
    title_suggest?: string;
    subtitle?: string;
    alternative_title?: string[];
    alternative_subtitle?: string[];
    cover_i?: number;
    cover_edition_key?: string;
    isbn?: string[];
    last_modified_i?: number;
    ebook_count_i?: number;
    ebook_access?: string;
    has_fulltext?: boolean;
    public_scan_b?: boolean;
    readinglog_count?: number;
    want_to_read_count?: number;
    currently_reading_count?: number;
    already_read_count?: number;
    publisher?: string[];
    language?: string[];
    author_key?: string[];
    author_name?: string[];
    author_alternative_name?: string[];
    person?: string[];
    place?: string[];
    subject?: string[];
    time?: string[];
    publish_date?: string[];
    publish_year?: number[];
    first_publish_year?: number;
    number_of_pages_median?: number;
    edition_count?: number;
    edition_key?: string[];
    publisher_facet?: string[];
    person_key?: string[];
    place_key?: string[];
    subject_facet?: string[];
    subject_key?: string[];
    time_facet?: string[];
    time_key?: string[];
  }>;
  facet_counts?: any;
}

/**
 * Zod schemas for API validation
 */

/** Google Books Volume schema */
export const GoogleBooksVolumeSchema = z.object({
  kind: z.string(),
  id: z.string(),
  etag: z.string().optional(),
  selfLink: z.string().url().optional(),
  volumeInfo: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    authors: z.array(z.string()).optional(),
    publisher: z.string().optional(),
    publishedDate: z.string().optional(),
    description: z.string().optional(),
    industryIdentifiers: z
      .array(
        z.object({
          type: z.string(),
          identifier: z.string(),
        })
      )
      .optional(),
    pageCount: z.number().optional(),
    categories: z.array(z.string()).optional(),
    averageRating: z.number().optional(),
    ratingsCount: z.number().optional(),
    imageLinks: z
      .object({
        smallThumbnail: z.string().url().optional(),
        thumbnail: z.string().url().optional(),
        small: z.string().url().optional(),
        medium: z.string().url().optional(),
        large: z.string().url().optional(),
        extraLarge: z.string().url().optional(),
      })
      .optional(),
    language: z.string().optional(),
    previewLink: z.string().url().optional(),
    infoLink: z.string().url().optional(),
    canonicalVolumeLink: z.string().url().optional(),
  }),
  saleInfo: z.any().optional(),
  accessInfo: z.any().optional(),
  searchInfo: z
    .object({
      textSnippet: z.string().optional(),
    })
    .optional(),
});

/** Google Books Response schema */
export const GoogleBooksResponseSchema = z.object({
  kind: z.string(),
  totalItems: z.number(),
  items: z.array(GoogleBooksVolumeSchema).optional(),
});

/** Open Library Search Response schema - Flexible to handle API variations */
export const OpenLibrarySearchResponseSchema = z
  .object({
    start: z.number().optional().default(0),
    num_found: z.number(),
    numFound: z.number(),
    docs: z.array(
      z
        .object({
          key: z.string(),
          type: z.string(),
          title: z.string(),
          subtitle: z.string().optional(),
          cover_i: z.number().optional(),
          isbn: z.array(z.string()).optional(),
          author_key: z.array(z.string()).optional(),
          author_name: z.array(z.string()).optional(),
          publisher: z.array(z.string()).optional(),
          language: z.array(z.string()).optional(),
          subject: z.array(z.string()).optional(),
          publish_date: z.array(z.string()).optional(),
          publish_year: z.array(z.number()).optional(),
          first_publish_year: z.number().optional(),
          number_of_pages_median: z.number().optional(),
          edition_count: z.number().optional(),
          // Allow additional fields to pass through without breaking validation
        })
        .passthrough()
    ),
  })
  .passthrough(); // Allow additional fields at response level too

/**
 * API Error types
 */

export interface ApiErrorDetails {
  /** Error code from the API */
  code?: string | number;

  /** Human readable error message */
  message: string;

  /** Additional details about the error */
  details?: Record<string, any>;

  /** Field-specific validation errors */
  fieldErrors?: Record<string, string[]>;

  /** Stack trace (only in development) */
  stack?: string;

  /** Request ID for debugging */
  requestId?: string;

  /** Timestamp when error occurred */
  timestamp: string;
}

/** Common API error codes */
export const API_ERROR_CODES = {
  // Network errors
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  CONNECTION_FAILED: "CONNECTION_FAILED",

  // Client errors (4xx)
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",

  // Server errors (5xx)
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  BAD_GATEWAY: "BAD_GATEWAY",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  GATEWAY_TIMEOUT: "GATEWAY_TIMEOUT",

  // API specific errors
  INVALID_API_KEY: "INVALID_API_KEY",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  INVALID_QUERY: "INVALID_QUERY",
  NO_RESULTS: "NO_RESULTS",

  // Parse/validation errors
  PARSE_ERROR: "PARSE_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",

  // Unknown/generic
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type ApiErrorCode =
  (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/**
 * Request/Response interceptor types
 */

export interface RequestInterceptor {
  onRequest?: (config: any) => any | Promise<any>;
  onRequestError?: (error: any) => any | Promise<any>;
}

export interface ResponseInterceptor {
  onResponse?: (response: any) => any | Promise<any>;
  onResponseError?: (error: any) => any | Promise<any>;
}

/**
 * Cache configuration types
 */

export interface CacheConfig {
  /** Enable/disable caching */
  enabled: boolean;

  /** Default TTL in milliseconds */
  defaultTTL: number;

  /** Maximum cache size (number of entries) */
  maxSize: number;

  /** Cache key prefix */
  keyPrefix: string;

  /** TTL for different types of requests */
  ttlByType?: {
    search?: number;
    details?: number;
    author?: number;
  };
}

/**
 * Rate limiting configuration
 */

export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;

  /** Time window in milliseconds */
  windowMs: number;

  /** Delay between requests in milliseconds */
  requestDelay?: number;

  /** Queue size for pending requests */
  queueSize?: number;
}

/**
 * Validation helpers
 */

export const parseGoogleBooksResponse = (
  data: unknown
): GoogleBooksResponse | null => {
  try {
    return GoogleBooksResponseSchema.parse(data);
  } catch (error) {
    console.error("Google Books response validation failed:", error);
    return null;
  }
};

export const parseOpenLibraryResponse = (
  data: unknown
): OpenLibrarySearchResponse | null => {
  try {
    return OpenLibrarySearchResponseSchema.parse(data);
  } catch (error) {
    console.error("Open Library response validation failed:", error);
    return null;
  }
};

/**
 * Type inference helpers
 */

export type InferredGoogleBooksVolume = z.infer<typeof GoogleBooksVolumeSchema>;
export type InferredGoogleBooksResponse = z.infer<
  typeof GoogleBooksResponseSchema
>;
export type InferredOpenLibrarySearchResponse = z.infer<
  typeof OpenLibrarySearchResponseSchema
>;
