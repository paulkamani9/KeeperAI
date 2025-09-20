/**
 * Test suite for SummaryReader component
 *
 * Tests premium typography, accessibility, and reading experience
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SummaryReader } from "../SummaryReader";

// Mock summary content
const mockContent = `# Test Summary

This is a test paragraph with some content.

## Key Points

- First important point
- Second key insight
- Third takeaway

## Conclusion

This is the conclusion paragraph.`;

const defaultProps = {
  content: mockContent,
  summaryType: "concise" as const,
  wordCount: 150,
  readingTime: 2,
};

describe("SummaryReader", () => {
  it("renders summary content correctly", () => {
    render(<SummaryReader {...defaultProps} />);

    expect(screen.getByText("Test Summary")).toBeInTheDocument();
    expect(screen.getByText("Key Points")).toBeInTheDocument();
    expect(screen.getByText("First important point")).toBeInTheDocument();
    expect(
      screen.getByText("This is the conclusion paragraph.")
    ).toBeInTheDocument();
  });

  it("has proper accessibility attributes", () => {
    render(<SummaryReader {...defaultProps} />);

    const article = screen.getByRole("main");
    expect(article).toHaveAttribute(
      "aria-label",
      expect.stringContaining("concise summary")
    );
    expect(article).toHaveAttribute("tabIndex", "-1");
  });

  it("provides screen reader context", () => {
    render(<SummaryReader {...defaultProps} />);

    expect(screen.getByText("Summary Content")).toBeInTheDocument();
    expect(
      screen.getByText(/This is a concise summary with approximately 150 words/)
    ).toBeInTheDocument();
  });

  it("applies typography classes for optimal reading", () => {
    const { container } = render(<SummaryReader {...defaultProps} />);

    const article = container.querySelector("article");
    expect(article).toHaveClass("max-w-none");
    expect(article).toHaveClass("leading-relaxed");
  });

  it("handles empty content gracefully", () => {
    render(<SummaryReader {...defaultProps} content="" />);

    // Should still render the container and accessibility info
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByText("Summary Content")).toBeInTheDocument();
  });

  it("processes different summary types", () => {
    render(<SummaryReader {...defaultProps} summaryType="detailed" />);

    const article = screen.getByRole("main");
    expect(article).toHaveAttribute(
      "aria-label",
      expect.stringContaining("detailed summary")
    );
  });

  it("handles markdown formatting", () => {
    const markdownContent = `# Main Heading
## Subheading
### Sub-subheading

Regular paragraph text.

- List item 1
- List item 2`;

    render(<SummaryReader {...defaultProps} content={markdownContent} />);

    expect(screen.getByText("Main Heading")).toBeInTheDocument();
    expect(screen.getByText("Subheading")).toBeInTheDocument();
    expect(screen.getByText("Sub-subheading")).toBeInTheDocument();
    expect(screen.getByText("Regular paragraph text.")).toBeInTheDocument();
    expect(screen.getByText("List item 1")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <SummaryReader {...defaultProps} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("has print-friendly styles", () => {
    const { container } = render(<SummaryReader {...defaultProps} />);

    expect(container.firstChild).toHaveClass(
      "print:shadow-none",
      "print:border-none"
    );
  });
});
