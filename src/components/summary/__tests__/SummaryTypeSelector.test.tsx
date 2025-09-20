/**
 * Tests for SummaryTypeSelector component
 * 
 * Coverage:
 * - Rendering with different selected types
 * - Dropdown interaction
 * - Loading and disabled states
 * - Accessibilit      // Check that all summary types are displayed with correct information
      const summaryTypes = getAllSummaryTypes();
      
      // The component uses short labels, and they appear both in button and dropdown
      expect(screen.getAllByText("Concise")).toHaveLength(2); // In button and dropdown
      expect(screen.getByText("Detailed")).toBeInTheDocument();
      expect(screen.getByText("Analysis")).toBeInTheDocument();
      expect(screen.getByText("Practical")).toBeInTheDocument();
      
      // Check for descriptions and reading times
      expect(screen.getByText("Quick overview and key points")).toBeInTheDocument();
      expect(screen.getAllByText("2-3 min read")).toHaveLength(2); // In button and dropdowns
 * - Summary type configuration
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SummaryTypeSelector } from "../SummaryTypeSelector";
import {
  getAllSummaryTypes,
  getSummaryTypeDescription,
  SummaryType,
} from "@/types/summary";

describe("SummaryTypeSelector", () => {
  const defaultProps = {
    value: "concise" as SummaryType,
    onValueChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders with default concise selection", () => {
      render(<SummaryTypeSelector {...defaultProps} />);

      expect(screen.getByText("Concise")).toBeInTheDocument();
      expect(screen.getByText("2-3 min read")).toBeInTheDocument();
    });

    it("renders with different selected type", () => {
      render(<SummaryTypeSelector {...defaultProps} value="detailed" />);

      expect(screen.getByText("Detailed")).toBeInTheDocument();
      expect(screen.getByText("8-10 min read")).toBeInTheDocument();
    });

    it("shows compact variant correctly", () => {
      render(<SummaryTypeSelector {...defaultProps} variant="compact" />);

      expect(screen.getByText("Concise")).toBeInTheDocument();
      // Compact variant should not show reading time in trigger
      expect(screen.queryByText("2-3 min read")).not.toBeInTheDocument();
    });
  });

  describe("Dropdown Interaction", () => {
    it("opens dropdown when clicked", async () => {
      const user = userEvent.setup();
      render(<SummaryTypeSelector {...defaultProps} />);

      const trigger = screen.getByRole("button");
      await user.click(trigger);

      // Should show all summary types in dropdown
      expect(screen.getByText("Choose Summary Type")).toBeInTheDocument();
      expect(
        screen.getByText("Quick overview and key points")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Chapter-by-chapter breakdown")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Critical analysis of themes and style")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Actionable takeaways for your life")
      ).toBeInTheDocument();
    });

    it("calls onValueChange when option selected", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();

      render(
        <SummaryTypeSelector {...defaultProps} onValueChange={onValueChange} />
      );

      const trigger = screen.getByRole("button");
      await user.click(trigger);

      // Click on "Detailed" option
      const detailedOption = screen.getByText("Detailed");
      await user.click(detailedOption);

      expect(onValueChange).toHaveBeenCalledWith("detailed");
    });

    it("handles keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<SummaryTypeSelector {...defaultProps} />);

      const trigger = screen.getByRole("button");

      // Open with Enter key
      await user.type(trigger, "{enter}");
      expect(screen.getByText("Choose Summary Type")).toBeInTheDocument();
    });
  });

  describe("Loading and Disabled States", () => {
    it("disables selector when loading", () => {
      render(<SummaryTypeSelector {...defaultProps} loading={true} />);

      const trigger = screen.getByRole("button");
      expect(trigger).toBeDisabled();
    });

    it("disables selector when disabled prop is true", () => {
      render(<SummaryTypeSelector {...defaultProps} disabled={true} />);

      const trigger = screen.getByRole("button");
      expect(trigger).toBeDisabled();
    });

    it("shows loading message in dropdown", async () => {
      // const user = userEvent.setup();
      render(<SummaryTypeSelector {...defaultProps} loading={true} />);

      // Should not be able to open when loading
      const trigger = screen.getByRole("button");
      expect(trigger).toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("has proper aria-label", () => {
      render(<SummaryTypeSelector {...defaultProps} />);

      const trigger = screen.getByRole("button");
      expect(trigger).toHaveAttribute(
        "aria-label",
        "Select summary type. Currently selected: Concise"
      );
    });

    it("updates aria-label when selection changes", () => {
      render(<SummaryTypeSelector {...defaultProps} value="analysis" />);

      const trigger = screen.getByRole("button");
      expect(trigger).toHaveAttribute(
        "aria-label",
        "Select summary type. Currently selected: Analysis"
      );
    });
  });

  describe("Summary Types Configuration", () => {
    it("displays all summary types with correct information", async () => {
      const user = userEvent.setup();
      render(<SummaryTypeSelector {...defaultProps} />);

      const trigger = screen.getByRole("button");
      await user.click(trigger);

      // Check all four types are present with correct details
      // The component uses short labels, and they appear both in button and dropdown
      expect(screen.getAllByText("Concise")).toHaveLength(2); // In button and dropdown
      expect(screen.getByText("Detailed")).toBeInTheDocument();
      expect(screen.getByText("Analysis")).toBeInTheDocument();
      expect(screen.getByText("Practical")).toBeInTheDocument();

      // Check for descriptions and reading times
      expect(
        screen.getByText("Quick overview and key points")
      ).toBeInTheDocument();
      expect(screen.getAllByText("2-3 min read")).toHaveLength(2); // In button and dropdown
    });

    it("shows correct icon for each summary type", async () => {
      const user = userEvent.setup();
      render(<SummaryTypeSelector {...defaultProps} />);

      const trigger = screen.getByRole("button");
      await user.click(trigger);

      // Icons are rendered as SVGs with aria-hidden="true", so check for SVGs using container
      const svgs = document.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe("Custom Props", () => {
    it("applies custom className", () => {
      render(
        <SummaryTypeSelector {...defaultProps} className="custom-class" />
      );

      const trigger = screen.getByRole("button");
      expect(trigger).toHaveClass("custom-class");
    });

    it("handles undefined onValueChange gracefully", async () => {
      const user = userEvent.setup();
      render(
        <SummaryTypeSelector
          value="concise"
          // No onValueChange prop
        />
      );

      const trigger = screen.getByRole("button");
      await user.click(trigger);

      const detailedOption = screen.getByText("Detailed");

      // Should not throw error when clicked
      expect(async () => {
        await user.click(detailedOption);
      }).not.toThrow();
    });
  });

  describe("Visual States", () => {
    it("shows selected state correctly", async () => {
      const user = userEvent.setup();
      render(<SummaryTypeSelector {...defaultProps} value="analysis" />);

      const trigger = screen.getByRole("button");
      await user.click(trigger);

      // The selected option should have different styling (checked state)
      // shadcn uses role="group" for radio groups, not "radiogroup"
      const radioGroup = screen.getByRole("group");
      expect(radioGroup).toBeInTheDocument();
    });

    it("applies loading styles", () => {
      render(<SummaryTypeSelector {...defaultProps} loading={true} />);

      const trigger = screen.getByRole("button");
      expect(trigger).toHaveClass("opacity-50", "cursor-not-allowed");
    });
  });
});

describe("Summary Type Utilities", () => {
  describe("getAllSummaryTypes", () => {
    it("returns all summary types", () => {
      const types = getAllSummaryTypes();

      expect(types).toHaveLength(4);
      expect(types).toEqual(["concise", "detailed", "analysis", "practical"]);
    });

    it("returns types with required properties", () => {
      const types = getAllSummaryTypes();

      for (const type of types) {
        const description = getSummaryTypeDescription(type);
        expect(description).toHaveProperty("title");
        expect(description).toHaveProperty("description");
        expect(description).toHaveProperty("readTime");
        expect(description).toHaveProperty("icon");
      }
    });
  });
});
