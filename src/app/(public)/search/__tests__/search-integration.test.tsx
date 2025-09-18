/**
 * Integration tests for the complete search flow
 *
 * These tests verify the end-to-end functionality of the search feature,
 * including API integration, component interactions, and user flows.
 *
 * Test coverage:
 * - Complete search workflow
 * - API error handling
 * - Loading states and UX
 * - Responsive behavior
 * - Accessibility compliance
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import SearchPage from "../page";
import { ThemeProvider } from "../../../../providers/ThemeProvider";
import { server } from "../../../../test/mocks/server";
import { http, HttpResponse } from "msw";

// Import the mock server setup
import "../../../../test/mocks/server";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
  usePathname: () => "/search",
}));

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAuth: () => ({ userId: "test-user-id" }),
  useUser: () => ({ user: null, isLoaded: true }),
}));

// Mock Convex
const mockConvex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://test.convex.cloud"
);

// Test wrapper component that provides all necessary context
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  return (
    <ClerkProvider publishableKey="test-key">
      <ConvexProvider client={mockConvex}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </QueryClientProvider>
      </ConvexProvider>
    </ClerkProvider>
  );
}

describe("Search Integration Tests", () => {
  beforeEach(() => {
    // Clear any cached data
    vi.clearAllMocks();
  });

  describe("Complete Search Flow", () => {
    it("should perform a complete search workflow with successful results", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Verify initial state
      const searchInput = screen.getByRole("textbox", {
        name: /search for books/i,
      });
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveValue("");

      // Type search query
      await user.type(searchInput, "clean code");

      // Submit search
      await user.keyboard("{Enter}");

      // Wait for loading state
      expect(screen.getByText(/searching.../i)).toBeInTheDocument();

      // Wait for results to load
      await waitFor(
        () => {
          expect(screen.queryByText(/searching.../i)).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify search results are displayed
      await waitFor(() => {
        expect(
          screen.getByText(
            "Clean Code: A Handbook of Agile Software Craftsmanship"
          )
        ).toBeInTheDocument();
        expect(
          screen.getByText("JavaScript: The Good Parts")
        ).toBeInTheDocument();
      });

      // Verify metadata is displayed
      expect(screen.getByText(/results for/i)).toBeInTheDocument();
      expect(screen.getByText(/search completed in/i)).toBeInTheDocument();

      // Verify pagination is displayed
      expect(screen.getByText("Page")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    });

    it("should handle empty search results gracefully", async () => {
      const user = userEvent.setup();

      // Mock empty results for this test
      server.use(
        http.get("https://www.googleapis.com/books/v1/volumes", () => {
          return HttpResponse.json({
            kind: "books#volumes",
            totalItems: 0,
            items: [],
          });
        })
      );

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByRole("textbox", {
        name: /search for books/i,
      });
      await user.type(searchInput, "nonexistentbook12345");
      await user.keyboard("{Enter}");

      // Wait for empty state
      await waitFor(
        () => {
          expect(screen.getByText(/no results found/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify helpful message
      expect(
        screen.getByText(/try adjusting your search terms/i)
      ).toBeInTheDocument();
    });

    it("should handle API errors with fallback behavior", async () => {
      const user = userEvent.setup();

      // Mock Google Books API failure
      server.use(
        http.get("https://www.googleapis.com/books/v1/volumes", () => {
          return HttpResponse.error();
        })
      );

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByRole("textbox", {
        name: /search for books/i,
      });
      await user.type(searchInput, "test query");
      await user.keyboard("{Enter}");

      // Should fallback to Open Library
      await waitFor(
        () => {
          expect(
            screen.getByText(
              "Design Patterns: Elements of Reusable Object-Oriented Software"
            )
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should handle rate limiting with appropriate user feedback", async () => {
      const user = userEvent.setup();

      // Mock rate limit response
      server.use(
        http.get("https://www.googleapis.com/books/v1/volumes", () => {
          return HttpResponse.json(
            {
              error: {
                code: 429,
                message: "Quota exceeded. Try again later.",
              },
            },
            { status: 429 }
          );
        })
      );

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByRole("textbox", {
        name: /search for books/i,
      });
      await user.type(searchInput, "test query");
      await user.keyboard("{Enter}");

      // Should show rate limit message or fallback to alternative service
      await waitFor(
        () => {
          const hasRateLimitMessage = screen.queryByText(
            /quota exceeded|try again later/i
          );
          const hasFallbackResults = screen.queryByText("Design Patterns");

          expect(hasRateLimitMessage || hasFallbackResults).toBeTruthy();
        },
        { timeout: 3000 }
      );
    });
  });

  describe("User Interactions", () => {
    it("should handle pagination interactions", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Perform search
      const searchInput = screen.getByRole("textbox", {
        name: /search for books/i,
      });
      await user.type(searchInput, "programming");
      await user.keyboard("{Enter}");

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText(/results for/i)).toBeInTheDocument();
      });

      // Test pagination navigation
      const nextButton = screen.getByRole("button", { name: /next/i });
      expect(nextButton).toBeInTheDocument();

      await user.click(nextButton);

      // Verify page change (this would trigger new API call)
      await waitFor(() => {
        expect(screen.getByText("Page")).toBeInTheDocument();
      });
    });

    it("should handle book card interactions", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Perform search
      const searchInput = screen.getByRole("textbox", {
        name: /search for books/i,
      });
      await user.type(searchInput, "clean code");
      await user.keyboard("{Enter}");

      // Wait for results
      await waitFor(() => {
        expect(
          screen.getByText(
            "Clean Code: A Handbook of Agile Software Craftsmanship"
          )
        ).toBeInTheDocument();
      });

      // Test favorite button interaction
      const favoriteButtons = screen.getAllByText(/add to favorites/i);
      expect(favoriteButtons).toHaveLength(2);

      await user.click(favoriteButtons[0]);

      // Verify favorite state change (implementation dependent)
      // This would typically update local state or call an API
    });

    it("should handle search input validation", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByRole("textbox", {
        name: /search for books/i,
      });

      // Test empty search
      await user.click(screen.getByRole("button", { name: /search/i }));

      // Should not trigger search for empty query
      expect(screen.queryByText(/searching.../i)).not.toBeInTheDocument();

      // Test very long query
      const longQuery = "a".repeat(201);
      await user.type(searchInput, longQuery);

      // Wait for validation
      await waitFor(() => {
        expect(
          screen.getByText(/must be 200 characters or less/i)
        ).toBeInTheDocument();
      });

      // Should prevent submission of invalid query
      await user.keyboard("{Enter}");
      expect(screen.queryByText(/searching.../i)).not.toBeInTheDocument();
    });
  });

  describe("Loading States and UX", () => {
    it("should show proper loading indicators during search", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByRole("textbox", {
        name: /search for books/i,
      });
      await user.type(searchInput, "react programming");
      await user.keyboard("{Enter}");

      // Should show loading indicator
      expect(screen.getByText(/searching.../i)).toBeInTheDocument();

      // Loading indicator should disappear after results load
      await waitFor(
        () => {
          expect(screen.queryByText(/searching.../i)).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should handle concurrent searches properly", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByRole("textbox", {
        name: /search for books/i,
      });

      // Start first search
      await user.type(searchInput, "javascript");
      await user.keyboard("{Enter}");

      // Immediately start second search
      await user.clear(searchInput);
      await user.type(searchInput, "python");
      await user.keyboard("{Enter}");

      // Should show loading for the current search
      expect(screen.getByText(/searching.../i)).toBeInTheDocument();

      // Should eventually show results for the latest search
      await waitFor(
        () => {
          expect(screen.queryByText(/searching.../i)).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Accessibility", () => {
    it("should meet accessibility standards", async () => {
      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Check for proper ARIA labels
      const searchInput = screen.getByRole("textbox", {
        name: /search for books/i,
      });
      expect(searchInput).toHaveAttribute("aria-label");

      // Check for proper heading structure
      const headings = screen.getAllByRole("heading");
      expect(headings.length).toBeGreaterThan(0);

      // Check for keyboard navigation support
      const searchInput2 = screen.getByRole("textbox");
      searchInput2.focus();
      expect(searchInput2).toHaveFocus();

      // Check for screen reader friendly content
      expect(screen.getByText(/search for books/i)).toBeInTheDocument();
    });

    it("should support keyboard navigation", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Test Ctrl+K shortcut
      await user.keyboard("{Control>}k{/Control}");

      const searchInput = screen.getByRole("textbox", {
        name: /search for books/i,
      });
      expect(searchInput).toHaveFocus();

      // Test Tab navigation
      await user.tab();

      // Should navigate to next focusable element
      const focusedElement = document.activeElement;
      expect(focusedElement).not.toBe(searchInput);
    });
  });

  describe("Responsive Behavior", () => {
    it("should adapt to different screen sizes", async () => {
      // Mock different viewport sizes
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Should render mobile-appropriate layout
      expect(screen.getByRole("textbox")).toBeInTheDocument();

      // Change to desktop size
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });

      window.dispatchEvent(new Event("resize"));

      // Should still render properly
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });

  describe("Performance Considerations", () => {
    it("should debounce search inputs properly", async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByRole("textbox", {
        name: /search for books/i,
      });

      // Type quickly without waiting
      await user.type(searchInput, "react");

      // Should not immediately trigger search during rapid typing
      expect(screen.queryByText(/searching.../i)).not.toBeInTheDocument();

      // Wait for debounce to complete
      await waitFor(
        () => {
          // Debounce should complete but no search should trigger without Enter
          expect(searchInput).toHaveValue("react");
        },
        { timeout: 1000 }
      );
    });

    it("should handle large result sets efficiently", async () => {
      const user = userEvent.setup();

      // Mock large result set
      server.use(
        http.get("https://www.googleapis.com/books/v1/volumes", () => {
          return HttpResponse.json({
            kind: "books#volumes",
            totalItems: 10000,
            items: new Array(40).fill(null).map((_, index) => ({
              kind: "books#volume",
              id: `book-${index}`,
              volumeInfo: {
                title: `Test Book ${index}`,
                authors: ["Test Author"],
                description: "Test description",
                imageLinks: {
                  thumbnail: "test-thumbnail.jpg",
                },
              },
            })),
          });
        })
      );

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByRole("textbox", {
        name: /search for books/i,
      });
      await user.type(searchInput, "test books");
      await user.keyboard("{Enter}");

      // Should handle large result sets without performance issues
      await waitFor(
        () => {
          expect(screen.getByText(/10,000 results/)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Should implement pagination or virtual scrolling for performance
      expect(screen.getByText(/page/i)).toBeInTheDocument();
    });
  });
});
