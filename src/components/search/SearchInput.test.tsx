import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter, useSearchParams } from "next/navigation";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SearchInput } from "./SearchInput";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

const mockPush = vi.fn();
const mockSearchParams = {
  get: vi.fn(),
};

describe("SearchInput", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useSearchParams as any).mockReturnValue(mockSearchParams);
    mockSearchParams.get.mockReturnValue(null);

    // Mock timers for debouncing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Basic Rendering", () => {
    it("renders with default props", () => {
      render(<SearchInput />);

      const input = screen.getByRole("textbox", { name: /search for books/i });
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", "Search for books...");
    });

    it("renders with custom placeholder", () => {
      render(<SearchInput placeholder="Find your next read..." />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("placeholder", "Find your next read...");
    });

    it("renders with initial value from defaultValue", () => {
      render(<SearchInput defaultValue="Harry Potter" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("Harry Potter");
    });

    it("renders with initial value from URL search params", () => {
      mockSearchParams.get.mockReturnValue("JavaScript books");

      render(<SearchInput />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("JavaScript books");
    });

    it("prioritizes defaultValue over URL params", () => {
      mockSearchParams.get.mockReturnValue("URL value");

      render(<SearchInput defaultValue="Default value" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("Default value");
    });
  });

  describe("Variants and Styling", () => {
    it("renders default variant correctly", () => {
      render(<SearchInput />);

      const container = screen.getByRole("textbox").closest("div");
      expect(container).toHaveClass("h-12");
    });

    it("renders compact variant correctly", () => {
      render(<SearchInput variant="compact" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("h-10");
    });

    it("applies custom className", () => {
      render(<SearchInput className="custom-class" />);

      const form = screen.getByRole("textbox").closest("form");
      expect(form).toHaveClass("custom-class");
    });
  });

  describe("User Input and Debouncing", () => {
    it("handles typing and updates input value", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<SearchInput />);

      const input = screen.getByRole("textbox");

      await user.type(input, "React");

      expect(input).toHaveValue("React");
    });

    it("debounces validation with 300ms delay", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<SearchInput />);

      const input = screen.getByRole("textbox");

      // Type a long invalid string
      await user.type(input, "a".repeat(201));

      // Before debounce time, no error should be visible
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      // After debounce time, error should appear
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(
          screen.getByText(/must be 200 characters or less/i)
        ).toBeInTheDocument();
      });
    });

    it("shows loading indicator during validation debounce", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<SearchInput />);

      const input = screen.getByRole("textbox");

      await user.type(input, "test query");

      // Loading indicator should be visible during debounce
      expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();

      // After debounce, loading should disappear
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.queryByLabelText(/loading/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Clear Functionality", () => {
    it("shows clear button when input has value", async () => {
      const user = userEvent.setup();
      render(<SearchInput />);

      const input = screen.getByRole("textbox");

      await user.type(input, "test");

      const clearButton = screen.getByRole("button", { name: /clear search/i });
      expect(clearButton).toBeInTheDocument();
    });

    it("clears input when clear button is clicked", async () => {
      const user = userEvent.setup();
      render(<SearchInput />);

      const input = screen.getByRole("textbox");

      await user.type(input, "test");

      const clearButton = screen.getByRole("button", { name: /clear search/i });
      await user.click(clearButton);

      expect(input).toHaveValue("");
      expect(input).toHaveFocus();
    });

    it("hides clear button when input is empty", () => {
      render(<SearchInput />);

      const clearButton = screen.queryByRole("button", {
        name: /clear search/i,
      });
      expect(clearButton).not.toBeInTheDocument();
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("focuses input on Ctrl+K", async () => {
      const user = userEvent.setup();
      render(<SearchInput />);

      const input = screen.getByRole("textbox");

      // Focus should not be on input initially
      expect(input).not.toHaveFocus();

      // Press Ctrl+K
      await user.keyboard("{Control>}k{/Control}");

      expect(input).toHaveFocus();
    });

    it("focuses input on Cmd+K (macOS)", async () => {
      const user = userEvent.setup();
      render(<SearchInput />);

      const input = screen.getByRole("textbox");

      await user.keyboard("{Meta>}k{/Meta}");

      expect(input).toHaveFocus();
    });

    it("clears input on Escape when input has value", async () => {
      const user = userEvent.setup();
      render(<SearchInput defaultValue="test query" />);

      const input = screen.getByRole("textbox");
      input.focus();

      await user.keyboard("{Escape}");

      expect(input).toHaveValue("");
      expect(input).toHaveFocus();
    });

    it("blurs input on Escape when input is empty", async () => {
      const user = userEvent.setup();
      render(<SearchInput />);

      const input = screen.getByRole("textbox");
      input.focus();

      await user.keyboard("{Escape}");

      expect(input).not.toHaveFocus();
    });

    it("submits on Enter key", async () => {
      const user = userEvent.setup();
      render(<SearchInput />);

      const input = screen.getByRole("textbox");

      await user.type(input, "React books");
      await user.keyboard("{Enter}");

      expect(mockPush).toHaveBeenCalledWith("/search?q=React+books");
    });
  });

  describe("Form Submission", () => {
    it("navigates to search page with query on submit", async () => {
      const user = userEvent.setup();
      render(<SearchInput />);

      const input = screen.getByRole("textbox");
      const submitButton = screen.getByRole("button", {
        name: /search \(enter\)/i,
      });

      await user.type(input, "JavaScript books");
      await user.click(submitButton);

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

    it("trims whitespace from queries", async () => {
      const user = userEvent.setup();
      render(<SearchInput />);

      const input = screen.getByRole("textbox");

      await user.type(input, "  React books  ");
      await user.keyboard("{Enter}");

      expect(mockPush).toHaveBeenCalledWith("/search?q=React+books");
    });
  });

  describe("Validation", () => {
    it("shows error for queries over 200 characters", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<SearchInput />);

      const input = screen.getByRole("textbox");
      const longQuery = "a".repeat(201);

      await user.type(input, longQuery);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          /must be 200 characters or less/i
        );
        expect(input).toHaveAttribute("aria-invalid", "true");
      });
    });

    it("prevents submission of invalid queries", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<SearchInput />);

      const input = screen.getByRole("textbox");
      const submitButton = screen.getByRole("button", {
        name: /search \(enter\)/i,
      });
      const longQuery = "a".repeat(201);

      await user.type(input, longQuery);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      await user.click(submitButton);

      expect(mockPush).not.toHaveBeenCalled();
    });

    it("clears validation errors when input becomes valid", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<SearchInput />);

      const input = screen.getByRole("textbox");
      const longQuery = "a".repeat(201);

      // Type invalid query
      await user.type(input, longQuery);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Clear and type valid query
      await user.clear(input);
      await user.type(input, "valid query");

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(input).toHaveAttribute("aria-invalid", "false");
      });
    });
  });

  describe("Auto Focus", () => {
    it("auto-focuses input when autoFocus is true", () => {
      render(<SearchInput autoFocus />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveFocus();
    });

    it("does not auto-focus by default", () => {
      render(<SearchInput />);

      const input = screen.getByRole("textbox");
      expect(input).not.toHaveFocus();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels and roles", () => {
      render(<SearchInput />);

      const input = screen.getByRole("textbox", { name: /search for books/i });
      expect(input).toHaveAttribute("aria-label", "Search for books");
    });

    it("associates error messages with input", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<SearchInput />);

      const input = screen.getByRole("textbox");
      const longQuery = "a".repeat(201);

      await user.type(input, longQuery);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        const errorElement = screen.getByRole("alert");
        expect(input).toHaveAttribute("aria-describedby", "search-error");
        expect(errorElement).toHaveAttribute("id", "search-error");
      });
    });

    it("provides keyboard navigation hints", () => {
      render(<SearchInput />);

      expect(screen.getByText(/press.*ctrl\+k.*to focus/i)).toBeInTheDocument();
    });

    it("hides keyboard hints in compact mode", () => {
      render(<SearchInput variant="compact" />);

      expect(
        screen.queryByText(/press.*ctrl\+k.*to focus/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("Future Extension Slots", () => {
    it("renders disabled voice input button", () => {
      render(<SearchInput />);

      const voiceButton = screen.getByRole("button", {
        name: /voice search \(coming soon\)/i,
      });
      expect(voiceButton).toBeDisabled();
    });

    it("renders disabled image search button", () => {
      render(<SearchInput />);

      const imageButton = screen.getByRole("button", {
        name: /image search \(coming soon\)/i,
      });
      expect(imageButton).toBeDisabled();
    });

    it("hides extension icons on small screens", () => {
      // Note: This test relies on CSS classes for responsive behavior
      // In actual implementation, Tailwind's responsive classes handle this
      render(<SearchInput />);

      const voiceButton = screen.getByRole("button", {
        name: /voice search \(coming soon\)/i,
      });
      const imageButton = screen.getByRole("button", {
        name: /image search \(coming soon\)/i,
      });

      expect(voiceButton.closest("div")).toHaveClass("hidden", "sm:flex");
      expect(imageButton.closest("div")).toHaveClass("hidden", "sm:flex");
    });
  });
});
