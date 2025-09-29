/**
 * Test suite for SummaryHeader component
 *
 * Tests navigation, accessibility, and responsive behavior
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SummaryHeader } from "../SummaryHeader";
import type { Summary } from "../../../types/summary";

// Mock summary data
const mockSummary: Summary = {
  id: "summary-123",
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
  onBackToBook: vi.fn(),
};

describe("SummaryHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders summary information correctly", () => {
    render(<SummaryHeader {...defaultProps} />);

    expect(screen.getByText("Concise Summary")).toBeInTheDocument();
    expect(screen.getByText("2 min read")).toBeInTheDocument();
    expect(screen.getByText("Jun 15, 2023")).toBeInTheDocument();
  });

  it("calls onBackToBook when back button is clicked", () => {
    render(<SummaryHeader {...defaultProps} />);

    const backButton = screen.getByRole("button", { name: /back to book/i });
    fireEvent.click(backButton);

    expect(defaultProps.onBackToBook).toHaveBeenCalledTimes(1);
  });

  it("has proper accessibility attributes", () => {
    render(<SummaryHeader {...defaultProps} />);

    const backButton = screen.getByRole("button", { name: /back to book/i });
    expect(backButton).toHaveAttribute("aria-label", "Back to book details");
  });

  it("displays different summary types correctly", () => {
    const detailedSummary = {
      ...mockSummary,
      summaryType: "detailed" as const,
    };

    render(<SummaryHeader {...defaultProps} summary={detailedSummary} />);

    expect(screen.getAllByText("Detailed Breakdown")[0]).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <SummaryHeader {...defaultProps} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("shows reading progress placeholder", () => {
    render(<SummaryHeader {...defaultProps} />);

    expect(screen.getByText("Progress: 0%")).toBeInTheDocument();
  });

  it("renders mobile and desktop versions", () => {
    render(<SummaryHeader {...defaultProps} />);

    // Should have multiple instances of the summary title
    const summaryTitles = screen.getAllByText("Concise Summary");
    expect(summaryTitles.length).toBeGreaterThan(1);
  });

  it("has backdrop blur styling", () => {
    const { container } = render(<SummaryHeader {...defaultProps} />);

    expect(container.firstChild).toHaveClass("backdrop-blur");
  });

  it("formats creation date correctly", () => {
    render(<SummaryHeader {...defaultProps} />);

    // Should show abbreviated date format (may appear multiple times)
    expect(screen.getAllByText("Jun 15, 2023")[0]).toBeInTheDocument();
  });
});
