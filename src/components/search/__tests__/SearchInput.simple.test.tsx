import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SearchInput } from "../SearchInput";

const mockPush = vi.fn();
const mockGet = vi.fn();

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

describe("SearchInput - Simple Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(null);
  });

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

  it("handles basic typing", () => {
    render(<SearchInput />);

    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "React" } });

    expect(input).toHaveValue("React");
  });

  it("renders compact variant correctly", () => {
    render(<SearchInput variant="compact" />);

    // Should not show keyboard hint in compact mode
    const keyboardHint = screen.queryByText(/press.*ctrl\+k.*to focus/i);
    expect(keyboardHint).not.toBeInTheDocument();
  });

  it("shows keyboard hint in default variant", () => {
    render(<SearchInput />);

    // Look for the keyboard hint by finding the paragraph element
    const keyboardHints = screen.getAllByText((content, element) => {
      return (
        element?.textContent === "Press Ctrl+K to focus" &&
        element.tagName === "P"
      );
    });
    expect(keyboardHints[0]).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<SearchInput className="custom-class" />);

    const form = screen.getByRole("textbox").closest("form");
    expect(form).toHaveClass("custom-class");
  });

  it("renders future extension slots", () => {
    render(<SearchInput />);

    // Should have disabled voice and image buttons
    const voiceButton = screen.getByTitle(/voice search.*coming soon/i);
    const imageButton = screen.getByTitle(/image search.*coming soon/i);

    expect(voiceButton).toBeInTheDocument();
    expect(voiceButton).toBeDisabled();
    expect(imageButton).toBeInTheDocument();
    expect(imageButton).toBeDisabled();
  });

  it("handles form submission with valid input", () => {
    render(<SearchInput />);

    const input = screen.getByRole("textbox");
    const form = input.closest("form");

    fireEvent.change(input, { target: { value: "React books" } });
    fireEvent.submit(form!);

    // Should navigate to search page
    expect(mockPush).toHaveBeenCalledWith("/search?q=React+books");
  });

  it("does not submit with empty input", () => {
    render(<SearchInput />);

    const input = screen.getByRole("textbox");
    const form = input.closest("form");

    fireEvent.submit(form!);

    // Should not navigate
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("calls onSearch callback when provided", () => {
    const mockOnSearch = vi.fn();
    render(<SearchInput onSearch={mockOnSearch} />);

    const input = screen.getByRole("textbox");
    const form = input.closest("form");

    fireEvent.change(input, { target: { value: "React books" } });
    fireEvent.submit(form!);

    expect(mockOnSearch).toHaveBeenCalledWith("React books");
    // Should not navigate when callback provided
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("has proper accessibility attributes", () => {
    render(<SearchInput />);

    const input = screen.getByRole("textbox");

    expect(input).toHaveAttribute("aria-label", "Search for books");
    expect(input).toHaveAttribute("aria-invalid", "false");
  });

  it("renders with initial value from defaultValue", () => {
    render(<SearchInput defaultValue="test query" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("test query");
  });

  it("renders with initial value from URL search params", () => {
    mockGet.mockReturnValue("url query");
    render(<SearchInput />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("url query");
  });

  it("prioritizes defaultValue over URL params", () => {
    mockGet.mockReturnValue("url query");
    render(<SearchInput defaultValue="prop query" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("prop query");
  });
});
