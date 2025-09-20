import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect } from "vitest";

import { useSummaryGeneration } from "../useSummaryGeneration";
import {type  Book } from "@/types/book";

// Mock convex/react useConvex to return a fake client
vi.mock("convex/react", () => {
  return {
    useConvex: () => ({
      // For queries used by the hook (existing summary check)
      query: vi.fn().mockResolvedValue(null),
      // For the action call used to generate the summary
      action: vi.fn().mockResolvedValue({
        id: "0123456789abcdef0123456789abcdef", // 32-char hex (Convex-like)
        bookId: "book-123",
        summaryType: "concise",
        content: "# Summary\n\nThis is a test summary.",
        status: "completed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        generationTime: 1000,
        wordCount: 5,
        readingTime: 1,
        aiModel: "mock-gpt-4",
        promptVersion: "v1.0",
        metadata: {
          bookDataSource: "google-books",
          hadBookDescription: true,
        },
      }),
    }),
  };
});

describe("useSummaryGeneration", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const client = new QueryClient();
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };

  const book: Book = {
    id: "book-123",
    title: "Clean Code",
    authors: ["Robert C. Martin"],
    description: "Even bad code can function...",
    source: "google-books",
    originalId: "hjEFCAAAQBAJ",
  };

  it("returns a summary with a persisted Convex-like ID after generation", async () => {
    const { result } = renderHook(
      () =>
        useSummaryGeneration({
          book,
          summaryType: "concise",
          enabled: false,
        }),
      { wrapper }
    );

    // Trigger generation
    act(() => {
      result.current.generateSummary();
    });

    // Wait for success
    await waitFor(() => expect(result.current.isSuccess).toBeTruthy());

    const summary = result.current.summary!;
    expect(summary).toBeTruthy();
    // Ensure ID looks like a Convex doc id (our code accepts 32-char hex)
    expect(summary.id).toMatch(/^[a-f0-9]{32}$/);
    // Ensure navigation can use this ID (string)
    expect(typeof summary.id).toBe("string");
    // Sanity check
    expect(summary.bookId).toBe("book-123");
    expect(summary.summaryType).toBe("concise");
    expect(summary.status).toBe("completed");
  });
});
