/**
 * Test suite for SummaryActions component - Save Summary functionality
 *
 * Tests the save/unsave summary feature with authentication
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SummaryActions } from "../SummaryActions";

// Mock hooks
vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock("@/hooks/useSavedSummaries", () => ({
  useSavedSummaries: vi.fn(),
}));

vi.mock("@/hooks/useReadList", () => ({
  useReadList: vi.fn(),
}));

vi.mock("@/hooks/useFavorites", () => ({
  useFavorites: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Import mocked modules
import { useUser } from "@clerk/nextjs";
import { useSavedSummaries } from "@/hooks/useSavedSummaries";
import { useReadList } from "@/hooks/useReadList";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "sonner";

const mockSummary = {
  id: "test-summary-id",
  bookId: "book-123",
  bookTitle: "Test Book Title",
  bookAuthors: ["Test Author"],
  summaryType: "concise" as const,
  content: "Test content",
  status: "completed" as const,
  createdAt: new Date("2023-06-15T10:30:00Z"),
  updatedAt: new Date("2023-06-15T10:30:00Z"),
  generationTime: 15000,
  wordCount: 150,
  readingTime: 2,
  aiModel: "gpt-4",
  promptVersion: "1.0",
};

const defaultProps = {
  summary: mockSummary,
};

describe("SummaryActions - Save Summary Feature", () => {
  const mockUser = { id: "user_123" };
  const mockToggleSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    (useReadList as any).mockReturnValue({
      isInReadList: false,
      currentStatus: undefined,
      addBook: vi.fn(),
      removeBook: vi.fn(),
      updateReadingStatus: vi.fn(),
      isLoading: false,
    });

    (useFavorites as any).mockReturnValue({
      isFavorited: false,
      toggleFavorite: vi.fn(),
    });
  });

  describe("Authentication State", () => {
    it("should show save button when not authenticated", () => {
      (useUser as any).mockReturnValue({ user: null });
      (useSavedSummaries as any).mockReturnValue({
        isSaved: false,
        toggleSave: mockToggleSave,
        isAuthenticated: false,
        isLoading: false,
      });

      render(<SummaryActions {...defaultProps} />);

      // Open library dropdown
      const libraryButton = screen
        .getAllByRole("button")
        .find(
          (button) => button.getAttribute("aria-label") === "Library actions"
        );

      expect(libraryButton).toBeInTheDocument();
    });

    it("should show save button when authenticated", () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useSavedSummaries as any).mockReturnValue({
        isSaved: false,
        toggleSave: mockToggleSave,
        isAuthenticated: true,
        isLoading: false,
      });

      render(<SummaryActions {...defaultProps} />);

      const libraryButton = screen
        .getAllByRole("button")
        .find(
          (button) => button.getAttribute("aria-label") === "Library actions"
        );

      expect(libraryButton).toBeInTheDocument();
    });
  });

  describe("Save Summary Button", () => {
    it("should display 'Save Summary' when not saved", () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useSavedSummaries as any).mockReturnValue({
        isSaved: false,
        toggleSave: mockToggleSave,
        isAuthenticated: true,
        isLoading: false,
      });

      render(<SummaryActions {...defaultProps} />);

      // Open library dropdown to see menu items
      const libraryButton = screen
        .getAllByRole("button")
        .find(
          (button) => button.getAttribute("aria-label") === "Library actions"
        );

      if (libraryButton) {
        fireEvent.click(libraryButton);

        // Look for save summary text in dropdown
        const saveMenuItem = screen.getByText(/Save Summary/i);
        expect(saveMenuItem).toBeInTheDocument();
      }
    });

    it("should display 'Saved' when already saved", () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useSavedSummaries as any).mockReturnValue({
        isSaved: true,
        toggleSave: mockToggleSave,
        isAuthenticated: true,
        isLoading: false,
      });

      render(<SummaryActions {...defaultProps} />);

      const libraryButton = screen
        .getAllByRole("button")
        .find(
          (button) => button.getAttribute("aria-label") === "Library actions"
        );

      if (libraryButton) {
        fireEvent.click(libraryButton);

        const savedMenuItem = screen.getByText(/Remove Summary/i);
        expect(savedMenuItem).toBeInTheDocument();
      }
    });
  });

  describe("Save Functionality", () => {
    it("should call toggleSave when save button is clicked", async () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useSavedSummaries as any).mockReturnValue({
        isSaved: false,
        toggleSave: mockToggleSave,
        isAuthenticated: true,
        isLoading: false,
      });

      mockToggleSave.mockResolvedValue(undefined);

      render(<SummaryActions {...defaultProps} />);

      // Open library dropdown
      const libraryButton = screen
        .getAllByRole("button")
        .find(
          (button) => button.getAttribute("aria-label") === "Library actions"
        );

      if (libraryButton) {
        fireEvent.click(libraryButton);

        const saveMenuItem = screen.getByText(/Save Summary/i);
        fireEvent.click(saveMenuItem);

        await waitFor(() => {
          expect(mockToggleSave).toHaveBeenCalledWith(mockSummary.bookId);
        });
      }
    });

    it("should show success toast when save succeeds", async () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useSavedSummaries as any).mockReturnValue({
        isSaved: false,
        toggleSave: mockToggleSave,
        isAuthenticated: true,
        isLoading: false,
      });

      mockToggleSave.mockResolvedValue(undefined);

      render(<SummaryActions {...defaultProps} />);

      const libraryButton = screen
        .getAllByRole("button")
        .find(
          (button) => button.getAttribute("aria-label") === "Library actions"
        );

      if (libraryButton) {
        fireEvent.click(libraryButton);

        const saveMenuItem = screen.getByText(/Save Summary/i);
        fireEvent.click(saveMenuItem);

        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith(
            "Summary saved to your collection"
          );
        });
      }
    });

    it("should show error toast when save fails", async () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useSavedSummaries as any).mockReturnValue({
        isSaved: false,
        toggleSave: mockToggleSave,
        isAuthenticated: true,
        isLoading: false,
      });

      mockToggleSave.mockRejectedValue(new Error("Network error"));

      render(<SummaryActions {...defaultProps} />);

      const libraryButton = screen
        .getAllByRole("button")
        .find(
          (button) => button.getAttribute("aria-label") === "Library actions"
        );

      if (libraryButton) {
        fireEvent.click(libraryButton);

        const saveMenuItem = screen.getByText(/Save Summary/i);
        fireEvent.click(saveMenuItem);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith(
            "Failed to save summary. Please try again."
          );
        });
      }
    });
  });

  describe("Unsave Functionality", () => {
    it("should call toggleSave when unsave button is clicked", async () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useSavedSummaries as any).mockReturnValue({
        isSaved: true,
        toggleSave: mockToggleSave,
        isAuthenticated: true,
        isLoading: false,
      });

      mockToggleSave.mockResolvedValue(undefined);

      render(<SummaryActions {...defaultProps} />);

      const libraryButton = screen
        .getAllByRole("button")
        .find(
          (button) => button.getAttribute("aria-label") === "Library actions"
        );

      if (libraryButton) {
        fireEvent.click(libraryButton);

        const unsaveMenuItem = screen.getByText(/Remove Summary/i);
        fireEvent.click(unsaveMenuItem);

        await waitFor(() => {
          expect(mockToggleSave).toHaveBeenCalledWith(mockSummary.bookId);
        });
      }
    });

    it("should show success toast when unsave succeeds", async () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useSavedSummaries as any).mockReturnValue({
        isSaved: true,
        toggleSave: mockToggleSave,
        isAuthenticated: true,
        isLoading: false,
      });

      mockToggleSave.mockResolvedValue(undefined);

      render(<SummaryActions {...defaultProps} />);

      const libraryButton = screen
        .getAllByRole("button")
        .find(
          (button) => button.getAttribute("aria-label") === "Library actions"
        );

      if (libraryButton) {
        fireEvent.click(libraryButton);

        const unsaveMenuItem = screen.getByText(/Remove Summary/i);
        fireEvent.click(unsaveMenuItem);

        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith(
            "Summary removed from saved summaries"
          );
        });
      }
    });
  });

  describe("Unauthenticated User", () => {
    it("should show error toast when unauthenticated user tries to save", async () => {
      (useUser as any).mockReturnValue({ user: null });
      (useSavedSummaries as any).mockReturnValue({
        isSaved: false,
        toggleSave: mockToggleSave,
        isAuthenticated: false,
        isLoading: false,
      });

      render(<SummaryActions {...defaultProps} />);

      const libraryButton = screen
        .getAllByRole("button")
        .find(
          (button) => button.getAttribute("aria-label") === "Library actions"
        );

      if (libraryButton) {
        fireEvent.click(libraryButton);

        const saveMenuItem = screen.getByText(/Save Summary/i);
        fireEvent.click(saveMenuItem);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith(
            "Please sign in to save summaries"
          );
        });
      }
    });

    it("should not call toggleSave when user is not authenticated", async () => {
      (useUser as any).mockReturnValue({ user: null });
      (useSavedSummaries as any).mockReturnValue({
        isSaved: false,
        toggleSave: mockToggleSave,
        isAuthenticated: false,
        isLoading: false,
      });

      render(<SummaryActions {...defaultProps} />);

      const libraryButton = screen
        .getAllByRole("button")
        .find(
          (button) => button.getAttribute("aria-label") === "Library actions"
        );

      if (libraryButton) {
        fireEvent.click(libraryButton);

        const saveMenuItem = screen.getByText(/Save Summary/i);
        fireEvent.click(saveMenuItem);

        await waitFor(() => {
          expect(mockToggleSave).not.toHaveBeenCalled();
        });
      }
    });
  });

  describe("Loading State", () => {
    it("should handle loading state gracefully", () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useSavedSummaries as any).mockReturnValue({
        isSaved: false,
        toggleSave: mockToggleSave,
        isAuthenticated: true,
        isLoading: true,
      });

      render(<SummaryActions {...defaultProps} />);

      const libraryButton = screen
        .getAllByRole("button")
        .find(
          (button) => button.getAttribute("aria-label") === "Library actions"
        );

      expect(libraryButton).toBeInTheDocument();
      // Component should render without errors during loading
    });
  });
});
