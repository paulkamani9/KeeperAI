/**
 * Strongly-typed, defensive TypeScript declarations for external book APIs.
 *
 * - Google Books API (Volumes): https://developers.google.com/books/docs/v1
 * - OpenLibrary API (Works / Editions): https://openlibrary.org/developers
 *
 * These types aim to be permissive and resilient to variations in the
 * JSON returned by each API (fields may be missing, in different shapes,
 * or be present in multiple formats).
// small helpers
type MaybeArray<T> = T | T[] | undefined | null;
type Maybe<T> = T | undefined | null;
/** ----------------------------- Google Books ----------------------------- */

/** Root search/list response for Google Books volumes */
export interface GoogleBooksVolumesResponse {
  kind?: string;
  totalItems?: number;
  items?: GoogleBooksVolume[];
  // Some responses may include additional top-level properties
  [k: string]: any;
}

export interface GoogleBooksVolume {
  kind?: string;
  id?: string;
  etag?: string;
  selfLink?: string;
  volumeInfo?: GoogleBooksVolumeInfo;
  saleInfo?: GoogleBooksSaleInfo;
  accessInfo?: GoogleBooksAccessInfo;
  searchInfo?: GoogleBooksSearchInfo;
  // preserve any unknown fields
  [k: string]: any;
}

export interface GoogleBooksVolumeInfo {
  title?: string;
  subtitle?: string;
  // authors are typically string[], but some backends or proxies may send a single string
  authors?: MaybeArray<string>;
  publisher?: string;
  publishedDate?: string; // can be YYYY or YYYY-MM-DD etc
  description?: string;
  industryIdentifiers?: GoogleBooksIndustryIdentifier[];
  readingModes?: GoogleBooksReadingModes;
  pageCount?: number;
  printType?: string;
  categories?: MaybeArray<string>;
  averageRating?: number;
  ratingsCount?: number;
  maturityRating?: string;
  allowAnonLogging?: boolean;
  contentVersion?: string;
  imageLinks?: GoogleBooksImageLinks;
  language?: string;
  previewLink?: string;
  infoLink?: string;
  canonicalVolumeLink?: string;
  panelizationSummary?: GoogleBooksPanelizationSummary;
  // non-standard / additional properties
  [k: string]: any;
}

export interface GoogleBooksIndustryIdentifier {
  type?: string; // e.g. "ISBN_10", "ISBN_13"
  identifier?: string;
}
export interface GoogleBooksReadingModes {
  text?: boolean;
  image?: boolean;
  [k: string]: any;
}

export interface GoogleBooksImageLinks {
  smallThumbnail?: string;
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
  extraLarge?: string;
  // Some responses include alternate keys or nested objects
  [k: string]: any;
}
export interface GoogleBooksPanelizationSummary {
  containsEpubBubbles?: boolean;
  containsImageBubbles?: boolean;
  [k: string]: any;
}

export interface GoogleBooksSaleInfoPrice {
  amount?: number;
  currencyCode?: string;
}
export interface GoogleBooksSaleInfo {
  country?: string;
  saleability?: string; // e.g. "FOR_SALE", "NOT_FOR_SALE"
  isEbook?: boolean;
  listPrice?: GoogleBooksSaleInfoPrice;
  retailPrice?: GoogleBooksSaleInfoPrice;
  buyLink?: string;
  // keep unknowns
  [k: string]: any;
}

export interface GoogleBooksAccessEpubOrPdf {
  isAvailable?: boolean;
  acsTokenLink?: string;
  // sometimes there are other fields such as downloadLink
  [k: string]: any;
}

export interface GoogleBooksAccessInfo {
  country?: string;
  viewability?: string;
  embeddable?: boolean;
  publicDomain?: boolean;
  textToSpeechPermission?: string;
  epub?: GoogleBooksAccessEpubOrPdf;
  pdf?: GoogleBooksAccessEpubOrPdf;
  webReaderLink?: string;
  accessViewStatus?: string;
  quoteSharingAllowed?: boolean;
  // catch-all
  [k: string]: any;
}

export interface GoogleBooksSearchInfo {
  textSnippet?: string;
  [k: string]: any;
}

/** ---------------------------- Open Library ---------------------------- */

/** Root result for OpenLibrary work (a 'work' or 'book' object returned by /works/ or search) */
export interface OpenLibraryWork {
  key?: string; // e.g. "/works/OL12345W"
  title?: string;
  subtitle?: string;
  description?: string | { type?: string; value?: string } | null;
  // subjects can be an array or a single comma-separated string in odd responses
  subjects?: MaybeArray<string>;
  subject_places?: MaybeArray<string>;
  subject_people?: MaybeArray<string>;
  subject_times?: MaybeArray<string>;
  covers?: number[];
  subject?: MaybeArray<string>;
  links?: OpenLibraryLink[];
  excerpts?: OpenLibraryExcerpt[];
  authors?: OpenLibraryWorkAuthor[];
  // created/last_modified may be objects in the JSON
  created?: OpenLibraryTimestamp;
  last_modified?: OpenLibraryTimestamp;
  first_publish_date?: string;
  latest_revision?: number;
  revision?: number;
  type?: { key?: string } | string;
  // editions are not always embedded; use separate editions endpoint when needed
  [k: string]: any;
}

export interface OpenLibraryTimestamp {
  type?: string;
  value?: string; // ISO timestamp
  // sometimes OpenLibrary returns an object with different shape
  [k: string]: any;
}

export interface OpenLibraryLink {
  title?: string;
  url?: string;
  // additional fields sometimes present
  [k: string]: any;
}

export interface OpenLibraryExcerpt {
  comment?: string;
  excerpt?: { type?: string; value?: string } | string;
  [k: string]: any;
}

export interface OpenLibraryWorkAuthor {
  author?: { key?: string; name?: string } | string;
  type?: { key?: string } | string;
  [k: string]: any;
}

/** Edition-level representation (from /books/ or /editions/ endpoints) */
export interface OpenLibraryEdition {
  key?: string; // e.g. "/books/OL12345M"
  title?: string;
  subtitle?: string;
  publishers?: string[];
  publish_date?: string;
  publish_places?: string[];
  number_of_pages?: number;
  physical_format?: string;
  physical_dimensions?: string;
  weight?: string;
  isbn_10?: string[];
  isbn_13?: string[];
  other_identifiers?: Record<string, MaybeArray<string>>;
  identifiers?: Record<string, MaybeArray<string>>;
  covers?: number[];
  authors?: Array<{ key?: string; name?: string } | string>;
  languages?: Array<{ key?: string } | string>;
  subjects?: MaybeArray<string>;
  lc_classifications?: string[];
  // many editions contain unexpected keys: keep open
  [k: string]: any;
}

/** --------------- Small utility / union types exported for convenience --------------- */
export type GoogleAPIBook = GoogleBooksVolume;
export type GoogleAPIBooksResponse = GoogleBooksVolumesResponse;

export type OpenLibraryBook = OpenLibraryWork | OpenLibraryEdition;

// Generic mapping for ISBN-like identifiers across both APIs
export interface IdentifierMap {
  isbn_10?: string[];
  isbn_13?: string[];
  lccn?: string[];
  oclc?: string[];
  [scheme: string]: MaybeArray<string> | undefined;
}

// Helpful convenience function signature shape if you create helpers
export type FetcherResult<T> = {
  ok: boolean;
  data?: T;
  raw?: any;
  error?: any;
};

/** End of types */
