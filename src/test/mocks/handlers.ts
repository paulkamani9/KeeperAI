import { http, HttpResponse } from "msw";
import type { Book } from "../../types/book";

// Mock data for Google Books API
export const mockGoogleBooksResponse = {
  kind: "books#volumes",
  totalItems: 1000,
  items: [
    {
      kind: "books#volume",
      id: "mock-book-1",
      etag: "mock-etag",
      selfLink: "https://www.googleapis.com/books/v1/volumes/mock-book-1",
      volumeInfo: {
        title: "Clean Code: A Handbook of Agile Software Craftsmanship",
        authors: ["Robert C. Martin"],
        publisher: "Prentice Hall",
        publishedDate: "2008-08-01",
        description:
          "A comprehensive guide to writing clean, maintainable code.",
        industryIdentifiers: [
          { type: "ISBN_10", identifier: "0132350882" },
          { type: "ISBN_13", identifier: "9780132350884" },
        ],
        readingModes: { text: true, image: true },
        pageCount: 464,
        printType: "BOOK",
        categories: ["Computers"],
        averageRating: 4.5,
        ratingsCount: 1500,
        maturityRating: "NOT_MATURE",
        allowAnonLogging: true,
        contentVersion: "1.2.2.0.preview.2",
        panelizationSummary: {
          containsEpubBubbles: false,
          containsImageBubbles: false,
        },
        imageLinks: {
          smallThumbnail:
            "http://books.google.com/books/content?id=mock-book-1&printsec=frontcover&img=1&zoom=5&source=gbs_api",
          thumbnail:
            "http://books.google.com/books/content?id=mock-book-1&printsec=frontcover&img=1&zoom=1&source=gbs_api",
        },
        language: "en",
        previewLink:
          "http://books.google.com/books?id=mock-book-1&dq=clean+code&hl=&source=gbs_api",
        infoLink:
          "https://play.google.com/store/books/details?id=mock-book-1&source=gbs_api",
        canonicalVolumeLink:
          "https://play.google.com/store/books/details?id=mock-book-1",
      },
      saleInfo: {
        country: "US",
        saleability: "FOR_SALE",
        isEbook: true,
      },
      accessInfo: {
        country: "US",
        viewability: "PARTIAL",
        embeddable: true,
        publicDomain: false,
        textToSpeechPermission: "ALLOWED_FOR_ACCESSIBILITY",
        epub: { isAvailable: true },
        pdf: { isAvailable: true },
        webReaderLink:
          "http://play.google.com/books/reader?id=mock-book-1&hl=&printsec=frontcover&source=gbs_api",
        accessViewStatus: "SAMPLE",
        quoteSharingAllowed: false,
      },
      searchInfo: {
        textSnippet:
          "A comprehensive guide to writing clean, maintainable code that follows agile software development principles.",
      },
    },
    {
      kind: "books#volume",
      id: "mock-book-2",
      etag: "mock-etag-2",
      selfLink: "https://www.googleapis.com/books/v1/volumes/mock-book-2",
      volumeInfo: {
        title: "JavaScript: The Good Parts",
        authors: ["Douglas Crockford"],
        publisher: "O'Reilly Media",
        publishedDate: "2008-05-08",
        description: "A deep dive into the good parts of JavaScript.",
        industryIdentifiers: [
          { type: "ISBN_10", identifier: "0596517742" },
          { type: "ISBN_13", identifier: "9780596517748" },
        ],
        readingModes: { text: true, image: true },
        pageCount: 176,
        printType: "BOOK",
        categories: ["Computers"],
        averageRating: 4.2,
        ratingsCount: 890,
        maturityRating: "NOT_MATURE",
        allowAnonLogging: true,
        contentVersion: "1.1.1.0.preview.2",
        imageLinks: {
          smallThumbnail:
            "http://books.google.com/books/content?id=mock-book-2&printsec=frontcover&img=1&zoom=5&source=gbs_api",
          thumbnail:
            "http://books.google.com/books/content?id=mock-book-2&printsec=frontcover&img=1&zoom=1&source=gbs_api",
        },
        language: "en",
      },
      saleInfo: {
        country: "US",
        saleability: "FOR_SALE",
        isEbook: true,
      },
      accessInfo: {
        country: "US",
        viewability: "PARTIAL",
        embeddable: true,
        publicDomain: false,
        textToSpeechPermission: "ALLOWED_FOR_ACCESSIBILITY",
        epub: { isAvailable: true },
        pdf: { isAvailable: true },
        accessViewStatus: "SAMPLE",
      },
    },
  ],
};

// Mock data for Open Library API
export const mockOpenLibraryResponse = {
  numFound: 500,
  start: 0,
  numFoundExact: true,
  docs: [
    {
      key: "/works/OL123456W",
      type: "work",
      seed: ["/books/OL123456M", "/works/OL123456W"],
      title: "Design Patterns: Elements of Reusable Object-Oriented Software",
      title_suggest:
        "Design Patterns: Elements of Reusable Object-Oriented Software",
      edition_count: 15,
      edition_key: ["OL123456M"],
      publish_date: ["1994"],
      publish_year: [1994],
      first_publish_year: 1994,
      number_of_pages_median: 395,
      lccn: ["94034264"],
      publish_place: ["Reading, Mass."],
      oclc: ["31171684"],
      contributor: ["Gang of Four"],
      lcc: ["QA76.64.G36 1995"],
      isbn: ["0201633612", "9780201633610"],
      last_modified_i: 1609459200,
      ebook_count_i: 1,
      ebook_access: "borrowable",
      has_fulltext: true,
      public_scan_b: false,
      ia: ["designpatternsel00gamm"],
      ia_collection_s: "printdisabled;librarygenesis",
      lending_edition_s: "OL123456M",
      lending_identifier_s: "designpatternsel00gamm",
      printdisabled_s: "OL123456M",
      ratings_average: 4.3,
      ratings_sortable: 4.3,
      ratings_count: 25,
      readinglog_count: 150,
      want_to_read_count: 75,
      currently_reading_count: 12,
      already_read_count: 63,
      cover_edition_key: "OL123456M",
      cover_i: 388761,
      publisher: ["Addison-Wesley Professional"],
      language: ["eng"],
      author_key: ["OL123A", "OL123B", "OL123C", "OL123D"],
      author_name: [
        "Erich Gamma",
        "Richard Helm",
        "Ralph Johnson",
        "John Vlissides",
      ],
      author_alternative_name: ["Gang of Four"],
      person: [
        "Erich Gamma",
        "Richard Helm",
        "Ralph Johnson",
        "John Vlissides",
      ],
      place: ["Reading, Mass."],
      subject: [
        "Object-oriented programming (Computer science)",
        "Software patterns",
        "Computer programming",
      ],
      publisher_facet: ["Addison-Wesley Professional"],
      person_key: ["OL123A", "OL123B", "OL123C", "OL123D"],
      place_key: ["reading_mass"],
      person_facet: [
        "Erich Gamma",
        "Richard Helm",
        "Ralph Johnson",
        "John Vlissides",
      ],
      subject_facet: [
        "Object-oriented programming (Computer science)",
        "Software patterns",
      ],
      _version_: 1234567890123456789,
      place_facet: ["Reading, Mass."],
      lcc_sort: "QA-0076.64000000-.G36-1995",
      author_facet: ["OL123A Erich Gamma", "OL123B Richard Helm"],
      subject_key: ["object-oriented_programming", "software_patterns"],
    },
  ],
  num_found: 500,
  q: "programming",
  offset: null,
};

// Request handlers for MSW
export const handlers = [
  // Google Books API handler
  http.get("https://www.googleapis.com/books/v1/volumes", ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    const startIndex = url.searchParams.get("startIndex") || "0";
    const maxResults = url.searchParams.get("maxResults") || "10";

    // Simulate API delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          HttpResponse.json({
            ...mockGoogleBooksResponse,
            totalItems: mockGoogleBooksResponse.totalItems,
            items: mockGoogleBooksResponse.items.slice(
              parseInt(startIndex),
              parseInt(startIndex) + parseInt(maxResults)
            ),
          })
        );
      }, 150);
    });
  }),

  // Open Library API handler
  http.get("https://openlibrary.org/search.json", ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    const offset = url.searchParams.get("offset") || "0";
    const limit = url.searchParams.get("limit") || "10";

    // Simulate API delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          HttpResponse.json({
            ...mockOpenLibraryResponse,
            start: parseInt(offset),
            docs: mockOpenLibraryResponse.docs.slice(
              0,
              Math.min(parseInt(limit), mockOpenLibraryResponse.docs.length)
            ),
          })
        );
      }, 200);
    });
  }),

  // Rate limit error handler (can be activated in tests)
  http.get("https://www.googleapis.com/books/v1/volumes/rate-limit", () => {
    return HttpResponse.json(
      {
        error: {
          code: 429,
          message: "Quota exceeded. Try again later.",
          errors: [
            {
              message: "Quota exceeded. Try again later.",
              domain: "usageLimits",
              reason: "rateLimitExceeded",
            },
          ],
        },
      },
      { status: 429 }
    );
  }),

  // Network error handler (can be activated in tests)
  http.get("https://www.googleapis.com/books/v1/volumes/network-error", () => {
    return HttpResponse.error();
  }),

  // Empty results handler
  http.get("https://www.googleapis.com/books/v1/volumes/empty", () => {
    return HttpResponse.json({
      kind: "books#volumes",
      totalItems: 0,
      items: [],
    });
  }),
];

export { http, HttpResponse };
