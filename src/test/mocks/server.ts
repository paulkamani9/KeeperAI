/**
 * Mock Service Worker (MSW) server setup for testing
 *
 * Provides realistic API mocking for Google Books and Open Library APIs
 * during testing to ensure reliable test behavior without network dependencies.
 */

import { setupServer } from "msw/node";
import { beforeAll, afterEach, afterAll } from "vitest";
import { http, HttpResponse } from "msw";

// Mock Google Books API responses
const mockGoogleBooksResponse = {
  kind: "books#volumes",
  totalItems: 2,
  items: [
    {
      kind: "books#volume",
      id: "hjEFCAAAQBAJ",
      etag: "test-etag",
      selfLink: "https://www.googleapis.com/books/v1/volumes/hjEFCAAAQBAJ",
      volumeInfo: {
        title: "Clean Code: A Handbook of Agile Software Craftsmanship",
        authors: ["Robert C. Martin"],
        publisher: "Prentice Hall",
        publishedDate: "2008-08-01",
        description:
          "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees.",
        industryIdentifiers: [
          { type: "ISBN_10", identifier: "0132350882" },
          { type: "ISBN_13", identifier: "9780132350884" },
        ],
        pageCount: 464,
        categories: ["Computers"],
        averageRating: 4.5,
        ratingsCount: 1254,
        language: "en",
        imageLinks: {
          smallThumbnail:
            "http://books.google.com/books/content?id=hjEFCAAAQBAJ&printsec=frontcover&img=1&zoom=5",
          thumbnail:
            "http://books.google.com/books/content?id=hjEFCAAAQBAJ&printsec=frontcover&img=1&zoom=1",
        },
        previewLink:
          "http://books.google.com/books?id=hjEFCAAAQBAJ&printsec=frontcover&dq=clean+code&hl=&cd=1&source=gbs_api",
        infoLink:
          "https://play.google.com/store/books/details?id=hjEFCAAAQBAJ&source=gbs_api",
      },
    },
  ],
};

// Mock Open Library API responses
const mockOpenLibraryResponse = {
  numFound: 1,
  start: 0,
  numFoundExact: true,
  docs: [
    {
      key: "/works/OL7353617W",
      title: "JavaScript: The Good Parts",
      author_name: ["Douglas Crockford"],
      first_publish_year: 2008,
      publisher: ["O'Reilly Media"],
      isbn: ["9780596517748"],
      language: ["eng"],
      subject: ["JavaScript (Computer program language)"],
      cover_i: 8231886,
    },
  ],
};

// MSW request handlers
const handlers = [
  // Google Books API
  http.get("https://www.googleapis.com/books/v1/volumes", ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q");

    // Handle special test cases
    if (query?.includes("network-error-trigger")) {
      return HttpResponse.error();
    }

    if (query?.includes("rate-limit-trigger")) {
      return HttpResponse.json(
        { error: { message: "Quota exceeded" } },
        { status: 429 }
      );
    }

    if (query?.includes("empty-results")) {
      return HttpResponse.json({
        ...mockGoogleBooksResponse,
        totalItems: 0,
        items: [],
      });
    }

    // Default successful response
    return HttpResponse.json(mockGoogleBooksResponse);
  }),

  // Open Library API
  http.get("https://openlibrary.org/search.json", ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q");

    // Handle special test cases
    if (query?.includes("network-error-trigger")) {
      return HttpResponse.error();
    }

    if (query?.includes("empty-results")) {
      return HttpResponse.json({
        ...mockOpenLibraryResponse,
        numFound: 0,
        docs: [],
      });
    }

    // Default successful response
    return HttpResponse.json(mockOpenLibraryResponse);
  }),

  // Convex API (for analytics)
  http.post("https://*.convex.cloud/*", () => {
    return HttpResponse.json({ success: true });
  }),
];

// Setup MSW server for Node.js environment (for tests)
export const server = setupServer(...handlers);

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: "warn",
  });
});

// Reset any request handlers that are declared as a part of our tests
// (i.e. for testing one-time error scenarios)
afterEach(() => {
  server.resetHandlers();
});

// Clean up after the tests are finished
afterAll(() => {
  server.close();
});

export { server as mockServer, handlers };
