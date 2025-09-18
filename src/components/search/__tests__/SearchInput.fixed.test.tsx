import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter, useSearchParams } from "next/navigation";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SearchInput } from "../SearchInput";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

const mockPush = vi.fn();
const mockSearchParams = {
  get: vi.fn(),
};

describe("SearchInput - Simplified Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useSearchParams as any).mockReturnValue(mockSearchParams);
    mockSearchParams.get.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Functionality", () => {
    it("renders with default props", () => {
      render(<SearchInput />);

      const input = screen.getByRole("textbox", { name: /search for books/i });
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", "Search for books...");
    });

    it("handles basic user input", async () => {
      const user = userEvent.setup();
      render(<SearchInput />);

      const input = screen.getByRole("textbox");
      await user.type(input, "React");

      expect(input).toHaveValue("React");
    });

    it("submits search on Enter key", async () => {
      const user = userEvent.setup();
      render(<SearchInput />);

      const input = screen.getByRole("textbox");
      await user.type(input, "JavaScript books");
      await user.keyboard("{Enter}");

      expect(mockPush).toHaveBeenCalledWith("/search?q=JavaScript+books");
    });

    it("calls onSearch callback when provided", async () => {
      const mockOnSearch = vi.fn();
      const user = userEvent.setup();

      render(<SearchInput onSearch={mockOnSearch} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "React books");
      await user.keyboard("{Enter}");

      expect(mockOnSearch).toHaveBeenCalledWith("React books");
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("does not submit empty queries", async () => {
      const user = userEvent.setup();
      render(<SearchInput />);

      const submitButton = screen.getByRole("button", {
        name: /search \(enter\)/i,
      });

      await user.click(submitButton);

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("Variants and Props", () => {
    it("renders compact variant", () => {
      render(<SearchInput variant="compact" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("h-10");
    });

    it("applies custom className", () => {
      render(<SearchInput className="custom-class" />);

      const form = screen.getByRole("textbox").closest("form");
      expect(form).toHaveClass("custom-class");
    });

    it("shows initial value from defaultValue", () => {
      render(<SearchInput defaultValue="Harry Potter" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("Harry Potter");
    });
  });

  describe("Clear Functionality", () => {
    it("shows and uses clear button", async () => {
      const user = userEvent.setup();
      render(<SearchInput />);

      const input = screen.getByRole("textbox");
      await user.type(input, "test");

      const clearButton = screen.getByRole("button", { name: /clear search/i });
      expect(clearButton).toBeInTheDocument();

      await user.click(clearButton);
      expect(input).toHaveValue("");
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("focuses input on Ctrl+K", async () => {
      const user = userEvent.setup();
      render(<SearchInput />);

      const input = screen.getByRole("textbox");
      await user.keyboard("{Control>}k{/Control}");

      expect(input).toHaveFocus();
    });

    it("clears input on Escape when it has value", async () => {
      const user = userEvent.setup();
      render(<SearchInput defaultValue="test query" />);

      const input = screen.getByRole("textbox");
      input.focus();

      await user.keyboard("{Escape}");
      expect(input).toHaveValue("");
    });
  });

  describe("Validation", () => {
    it("shows error for very long queries", async () => {
      const user = userEvent.setup();
      render(<SearchInput />);

      const input = screen.getByRole("textbox");
      const longQuery = "a".repeat(201);

      await user.type(input, longQuery);

      await waitFor(
        () => {
          expect(screen.getByRole("alert")).toHaveTextContent(
            /must be 200 characters or less/i
          );
        },
        { timeout: 1000 }
      );
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      render(<SearchInput />);

      const input = screen.getByRole("textbox", { name: /search for books/i });
      expect(input).toHaveAttribute("aria-label", "Search for books");
    });

    it("includes keyboard hints", () => {
      render(<SearchInput />);

      expect(screen.getByText("Press")).toBeInTheDocument();
      expect(screen.getByText("Ctrl+K")).toBeInTheDocument();
    });
  });
});
