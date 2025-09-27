// Test script to demonstrate the Redis caching functionality
// Run this file: npx tsx scripts/test-cache-functionality.ts

import { config } from "dotenv";
config({ path: ".env.local" });

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

async function testCacheFunctionality() {
  console.log("🚀 Testing Redis Cache Functionality\n");

  const convex = new ConvexHttpClient(CONVEX_URL);

  const testBookId = "test-book-" + Date.now();
  const summaryType = "concise";

  console.log(
    `📚 Testing with bookId: ${testBookId}, summaryType: ${summaryType}`
  );
  console.log(
    `🏃 ENABLE_SUMMARY_REDIS = ${process.env.ENABLE_SUMMARY_REDIS}\n`
  );

  try {
    // Test 1: First call should be a cache MISS
    console.log("🔍 Test 1: First call (should be MISS)");
    const start1 = Date.now();
    const result1 = await convex.action(
      api.summariesActions.getExistingSummaryAction,
      {
        bookId: testBookId,
        summaryType: summaryType as any,
      }
    );
    const elapsed1 = Date.now() - start1;
    console.log(
      `⏱️  Result: ${result1 ? "Found" : "Not found"} (${elapsed1}ms)\n`
    );

    // Test 2: Store a summary
    console.log("💾 Test 2: Storing a summary");
    const start2 = Date.now();
    const summaryId = await convex.action(
      api.summariesActions.storeSummaryAction,
      {
        bookId: testBookId,
        summaryType: summaryType as any,
        content:
          "This is a test summary for demonstrating cache functionality. It shows how Redis caching works with our actions layer.",
        wordCount: 20,
        readingTime: 1,
        aiModel: "gpt-4o-mini",
        promptVersion: "v1.0",
        metadata: {
          bookDataSource: "google-books" as any,
          hadBookDescription: true,
          notes: "Test summary for cache demo",
        },
      }
    );
    const elapsed2 = Date.now() - start2;
    console.log(`✅ Stored summary with ID: ${summaryId} (${elapsed2}ms)\n`);

    // Test 3: Second call should be a cache HIT
    console.log("🔍 Test 3: Second call (should be HIT)");
    const start3 = Date.now();
    const result3 = await convex.action(
      api.summariesActions.getExistingSummaryAction,
      {
        bookId: testBookId,
        summaryType: summaryType as any,
      }
    );
    const elapsed3 = Date.now() - start3;
    console.log(
      `⏱️  Result: ${result3 ? "Found" : "Not found"} (${elapsed3}ms)`
    );
    console.log(
      `📈 Performance improvement: ${Math.round(((elapsed1 - elapsed3) / elapsed1) * 100)}% faster\n`
    );

    // Test 4: Get by ID should also HIT
    console.log("🔍 Test 4: Get by ID (should be HIT)");
    const start4 = Date.now();
    const result4 = await convex.action(
      api.summariesActions.getSummaryByIdAction,
      {
        summaryId: String(summaryId),
      }
    );
    const elapsed4 = Date.now() - start4;
    console.log(
      `⏱️  Result: ${result4 ? "Found" : "Not found"} (${elapsed4}ms)\n`
    );

    console.log("✨ Cache functionality test completed!");
    console.log(
      "💡 Check your terminal for HIT/MISS logs to verify caching behavior."
    );
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testCacheFunctionality().catch(console.error);
