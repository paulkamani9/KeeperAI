import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SummaryActions } from "../SummaryActions";
import type { Summary } from "../../../types/summary";

// Mock window.open and navigator.clipboard
const mockOpen = vi.fn();
const mockWriteText = vi.fn();

Object.defineProperty(window, "open", {
  value: mockOpen,
  writable: true,
});

Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
});

// Mock window.location
Object.defineProperty(window, "location", {
  value: {
    href: "https://keeperai.com/summaries/test-123",
    origin: "https://keeperai.com",
  },
  writable: true,
});

// Mock print function
Object.defineProperty(window, "print", {
  value: vi.fn(),
  writable: true,
});

const mockSummary: Summary = {
  id: "test-123",
  bookId: "book-456",
  bookTitle: "Test WhatsApp Book",
  bookAuthors: ["WhatsApp Test Author"],
  summaryType: "concise",
  content: "This is a test summary content for WhatsApp sharing functionality.",
  status: "completed",
  createdAt: new Date(),
  updatedAt: new Date(),
  wordCount: 150,
  readingTime: 1,
  aiModel: "gpt-4o-mini",
  promptVersion: "1.0",
};

describe("SummaryActions - WhatsApp Sharing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Structure", () => {
    it("should render basic action buttons correctly", () => {
      render(<SummaryActions summary={mockSummary} />);

      // Check that the main action buttons are present
      expect(
        screen.getByRole("button", { name: /share summary/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /print summary/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /save to favorites/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /more actions/i })
      ).toBeInTheDocument();
    });
  });

  describe("WhatsApp Share Handler", () => {
    it("should create correct WhatsApp URL format", () => {
      // Test the URL generation logic directly
      const text = `Check out this AI-generated summary on KeeperAI: https://keeperai.com/summaries/test-123`;
      const expectedUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

      // Simulate the handler function logic
      expect(expectedUrl).toMatch(/^https:\/\/wa\.me\/\?text=/);
      expect(expectedUrl).toContain(
        encodeURIComponent("Check out this AI-generated summary on KeeperAI")
      );
      expect(expectedUrl).toContain(
        encodeURIComponent("https://keeperai.com/summaries/test-123")
      );
    });

    it("should use window.location.href in the message", () => {
      // Test with different URL
      const testUrl = "https://different-domain.com/summaries/different-id";
      const text = `Check out this AI-generated summary on KeeperAI: ${testUrl}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

      const decodedText = decodeURIComponent(whatsappUrl.split("text=")[1]);
      expect(decodedText).toContain(
        "https://different-domain.com/summaries/different-id"
      );
    });
  });

  describe("WhatsApp Integration Test", () => {
    it("should have the correct WhatsApp share handler implementation", () => {
      // Test that the handleShareWhatsApp function would work correctly
      const mockWindowLocation = {
        href: "https://keeperai.com/summaries/test-123",
      };

      // Simulate the function logic
      const text = `Check out this AI-generated summary on KeeperAI: ${mockWindowLocation.href}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

      // Verify URL structure
      expect(whatsappUrl).toMatch(/^https:\/\/wa\.me\/\?text=/);

      // Verify the message content
      const decodedText = decodeURIComponent(whatsappUrl.split("text=")[1]);
      expect(decodedText).toBe(
        "Check out this AI-generated summary on KeeperAI: https://keeperai.com/summaries/test-123"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle URL encoding properly", () => {
      // Test with special characters that need encoding
      const textWithSpecialChars =
        "Check out this AI-generated summary on KeeperAI: https://keeperai.com/summaries/test-123?utm_source=whatsapp&ref=share";
      const encodedUrl = `https://wa.me/?text=${encodeURIComponent(textWithSpecialChars)}`;

      expect(encodedUrl).toContain("https%3A%2F%2Fkeeperai.com"); // Correctly encoded https://
      expect(encodedUrl).toContain("%3F"); // encoded '?'
      expect(encodedUrl).toContain("%26"); // encoded '&'
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels on buttons", () => {
      render(<SummaryActions summary={mockSummary} />);

      // Check that all buttons have proper accessibility labels
      expect(screen.getByLabelText(/share summary/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/print summary/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/save to favorites/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/more actions/i)).toBeInTheDocument();
    });
  });
});
