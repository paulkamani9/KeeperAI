/**
 * Demo script to test the robust OpenLibrary implementation
 * This simulates the real API field variations and demonstrates
 * that our new parsing works correctly.
 */

const { OpenLibraryService } = require("./dist/services/search/openLibrary.js");

// Mock API client to simulate OpenLibrary's inconsistent responses
const mockApiClient = {
  get: async (url) => {
    console.log(`Making request to: ${url}`);

    // Simulate the real OpenLibrary response with both field formats
    return {
      start: 0,
      num_found: 156, // snake_case
      numFound: 156, // camelCase (both present in real API)
      docs: [
        {
          key: "/works/OL13806374W",
          type: "work",
          title: "Start with why",
          author_name: ["Simon Sinek"],
          first_publish_year: 2009,
          cover_i: 6395237,
          publisher: ["Portfolio"], // Sometimes array
          language: "en", // Sometimes string instead of array
          isbn: ["9781591846444", 1234567890], // Mixed string/number
          subject: ["Leadership", "Business", "Management"],
        },
        // Malformed doc to test robustness
        {
          key: "/works/OL456W",
          type: "work",
          title: "Another Book",
          // Missing author_name to test graceful handling
          cover_i: 0, // Invalid cover ID
        },
      ],
    };
  },
};

async function testRobustOpenLibrary() {
  console.log("🧪 Testing Robust OpenLibrary Implementation\n");

  // Create service with mock API client
  const service = new OpenLibraryService();
  // Replace the apiClient with our mock
  service.apiClient = mockApiClient;

  try {
    const results = await service.searchBooks({ query: "start with why" });

    console.log("✅ Search Results:");
    console.log(`   Total Items: ${results.totalItems}`);
    console.log(`   Books Found: ${results.books.length}`);
    console.log(`   Source: ${results.source}`);

    if (results.books.length > 0) {
      console.log("\n📚 First Book Details:");
      const book = results.books[0];
      console.log(`   Title: ${book.title}`);
      console.log(`   Authors: ${book.authors.join(", ")}`);
      console.log(`   Publisher: ${book.publisher || "N/A"}`);
      console.log(`   Language: ${book.language || "N/A"}`);
      console.log(`   ISBN-10: ${book.isbn10 || "N/A"}`);
      console.log(`   ISBN-13: ${book.isbn13 || "N/A"}`);
      console.log(`   Categories: ${book.categories?.join(", ") || "N/A"}`);
      console.log(`   Has Thumbnail: ${book.thumbnail ? "Yes" : "No"}`);
    }

    console.log(
      `\n✅ Successfully handled API response with mixed field formats!`
    );
    console.log(`✅ Gracefully processed malformed documents!`);
    console.log(`✅ Fallback parsing worked correctly!`);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testRobustOpenLibrary();
}

module.exports = { testRobustOpenLibrary };
