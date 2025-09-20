/**
 * Test suite for SummaryMetadata component
 *
 * Tests metadata display, formatting, and accessibility
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SummaryMetadata } from "../SummaryMetadata";

const mockSummary = {
  id: "test-id",
  bookId: "book-123",
  summaryType: "analysis" as const,
  content: "Test content",
  status: "completed" as const,
  createdAt: new Date("2023-06-15T14:30:00Z"),
  updatedAt: new Date("2023-06-15T14:30:00Z"),
  generationTime: 25000, // 25 seconds
  wordCount: 1250,
  readingTime: 5,
  aiModel: "gpt-4",
  promptVersion: "1.0",
  metadata: {
    bookDataSource: "google-books" as const,
    hadBookDescription: true,
    promptTokens: 500,
    completionTokens: 800,
    estimatedCost: 0.05,
  },
};

const defaultProps = {
  summary: mockSummary,
};

describe("SummaryMetadata", () => {
  it("renders summary type and description", () => {
    render(<SummaryMetadata {...defaultProps} />);

    expect(screen.getByText("Critical Analysis")).toBeInTheDocument();
    expect(
      screen.getByText("Critical analysis of themes and style")
    ).toBeInTheDocument();
  });

  it("displays status badge correctly", () => {
    render(<SummaryMetadata {...defaultProps} />);

    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows reading time and word count", () => {
    render(<SummaryMetadata {...defaultProps} />);

    expect(screen.getByText("5 minutes")).toBeInTheDocument();
    expect(screen.getByText("1,250 words")).toBeInTheDocument();
  });

  it("formats generation time correctly", () => {
    render(<SummaryMetadata {...defaultProps} />);

    expect(screen.getByText("25s")).toBeInTheDocument();
  });

  it("displays AI model information", () => {
    render(<SummaryMetadata {...defaultProps} />);

    expect(screen.getByText("gpt-4")).toBeInTheDocument();
  });

  it("formats creation date correctly", () => {
    render(<SummaryMetadata {...defaultProps} />);

    expect(screen.getByText(/Thursday, June 15, 2023/)).toBeInTheDocument();
  });

  it("shows book context information", () => {
    render(<SummaryMetadata {...defaultProps} />);

    expect(screen.getByText("Book Context")).toBeInTheDocument();
    expect(screen.getByText("Book ID: book-123")).toBeInTheDocument();
  });

  it("displays technical metadata when available", () => {
    render(<SummaryMetadata {...defaultProps} />);

    expect(screen.getByText("Technical Details")).toBeInTheDocument();
    expect(screen.getByText("google books")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument(); // hadBookDescription
    expect(screen.getByText("500")).toBeInTheDocument(); // promptTokens
    expect(screen.getByText("800")).toBeInTheDocument(); // completionTokens
  });

  it("handles missing metadata gracefully", () => {
    const summaryWithoutMetadata = {
      ...mockSummary,
      metadata: undefined,
    };

    render(<SummaryMetadata summary={summaryWithoutMetadata} />);

    // Should still render basic information
    expect(screen.getByText("Critical Analysis")).toBeInTheDocument();
    expect(screen.getByText("5 minutes")).toBeInTheDocument();

    // Should not show technical details section
    expect(screen.queryByText("Technical Details")).not.toBeInTheDocument();
  });

  it("handles different summary statuses", () => {
    const pendingSummary = {
      ...mockSummary,
      status: "pending" as const,
    };

    render(<SummaryMetadata summary={pendingSummary} />);

    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("formats generation time for longer durations", () => {
    const longGenerationSummary = {
      ...mockSummary,
      generationTime: 125000, // 2 minutes 5 seconds
    };

    render(<SummaryMetadata summary={longGenerationSummary} />);

    expect(screen.getByText("2m 5s")).toBeInTheDocument();
  });

  it("handles missing generation time", () => {
    const summaryWithoutTime = {
      ...mockSummary,
      generationTime: undefined,
    };

    render(<SummaryMetadata summary={summaryWithoutTime} />);

    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <SummaryMetadata {...defaultProps} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("shows different summary type descriptions", () => {
    const conciseSummary = {
      ...mockSummary,
      summaryType: "concise" as const,
    };

    render(<SummaryMetadata summary={conciseSummary} />);

    expect(screen.getByText("Concise Summary")).toBeInTheDocument();
    expect(
      screen.getByText("Quick overview and key points")
    ).toBeInTheDocument();
  });

  it("handles number formatting for large values", () => {
    const largeSummary = {
      ...mockSummary,
      wordCount: 5250,
      metadata: {
        ...mockSummary.metadata!,
        promptTokens: 1500,
        completionTokens: 2800,
      },
    };

    render(<SummaryMetadata summary={largeSummary} />);

    expect(screen.getByText("5,250 words")).toBeInTheDocument();
    expect(screen.getByText("1,500")).toBeInTheDocument();
    expect(screen.getByText("2,800")).toBeInTheDocument();
  });
});
