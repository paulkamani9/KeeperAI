/**
 * Test suite for SummaryActions component
 *
 * Tests action buttons, sharing, and accessibility
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SummaryActions } from "../SummaryActions";

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

// Mock window.print
Object.defineProperty(window, "print", {
  value: vi.fn(),
});

// Mock window.open
Object.defineProperty(window, "open", {
  value: vi.fn(),
});

const mockSummary = {
  id: "test-summary-id",
  bookId: "book-123",
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

describe("SummaryActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn(); // Mock console.log for notifications
  });

  it("renders share and action buttons", () => {
    render(<SummaryActions {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: /share summary/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /print summary/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save to favorites/i })
    ).toBeInTheDocument();
  });

  it("handles copy link functionality", async () => {
    render(<SummaryActions {...defaultProps} />);

    // Click share button to open dropdown
    const shareButton = screen.getByRole("button", { name: /share summary/i });
    fireEvent.click(shareButton);

    // Click copy link option
    const copyLinkOption = screen.getByText("Copy Link");
    fireEvent.click(copyLinkOption);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `${window.location.origin}/summaries/test-summary-id`
      );
    });
  });

  it("handles print functionality", () => {
    render(<SummaryActions {...defaultProps} />);

    const printButton = screen.getByRole("button", { name: /print summary/i });
    fireEvent.click(printButton);

    expect(window.print).toHaveBeenCalled();
  });

  it("handles save to favorites toggle", () => {
    render(<SummaryActions {...defaultProps} />);

    const saveButton = screen.getByRole("button", {
      name: /save to favorites/i,
    });

    // Initially should show "Save"
    expect(saveButton).toHaveTextContent("Save");

    // Click to save
    fireEvent.click(saveButton);

    // Should now show "Saved"
    expect(saveButton).toHaveTextContent("Saved");
    expect(console.log).toHaveBeenCalledWith(
      "Notification: Summary has been saved to your favorites."
    );
  });

  it("handles social sharing - Twitter", async () => {
    render(<SummaryActions {...defaultProps} />);

    // Open share dropdown
    const shareButton = screen.getByRole("button", { name: /share summary/i });
    fireEvent.click(shareButton);

    // Click Twitter share
    const twitterOption = screen.getByText("Share on Twitter");
    fireEvent.click(twitterOption);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("twitter.com/intent/tweet"),
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("handles social sharing - Facebook", async () => {
    render(<SummaryActions {...defaultProps} />);

    // Open share dropdown
    const shareButton = screen.getByRole("button", { name: /share summary/i });
    fireEvent.click(shareButton);

    // Click Facebook share
    const facebookOption = screen.getByText("Share on Facebook");
    fireEvent.click(facebookOption);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("facebook.com/sharer"),
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("shows mobile dropdown menu", () => {
    render(<SummaryActions {...defaultProps} />);

    // Mobile dropdown should be present but hidden on desktop
    const mobileButton = screen.getByRole("button", { name: /more actions/i });
    expect(mobileButton.closest("div")).toHaveClass("sm:hidden");
  });

  it("handles clipboard copy error gracefully", async () => {
    // Mock clipboard failure
    navigator.clipboard.writeText = vi.fn(() =>
      Promise.reject(new Error("Clipboard error"))
    );

    render(<SummaryActions {...defaultProps} />);

    // Open share dropdown and click copy
    const shareButton = screen.getByRole("button", { name: /share summary/i });
    fireEvent.click(shareButton);

    const copyLinkOption = screen.getByText("Copy Link");
    fireEvent.click(copyLinkOption);

    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith(
        "Notification: Failed to copy link. Please try again."
      );
    });
  });

  it("applies custom className", () => {
    const { container } = render(
      <SummaryActions {...defaultProps} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("handles download placeholder", () => {
    render(<SummaryActions {...defaultProps} />);

    // Open mobile dropdown
    const mobileButton = screen.getByRole("button", { name: /more actions/i });
    fireEvent.click(mobileButton);

    // Click download option (should be disabled)
    const downloadOption = screen.getByText("Download (Coming Soon)");
    expect(downloadOption.closest("div")).toHaveAttribute(
      "data-disabled",
      "true"
    );
  });
});
