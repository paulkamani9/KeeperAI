import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import {
  SummaryGenerationProgress,
  SummaryGenerationIndicator,
  GenerationTimeEstimate,
} from "../SummaryGenerationProgress";
import type { SummaryType } from "../../../types/summary";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  AlertCircle: ({ className, ...props }: any) => (
    <div data-testid="alert-circle" className={className} {...props} />
  ),
  CheckCircle2: ({ className, ...props }: any) => (
    <div data-testid="check-circle" className={className} {...props} />
  ),
  Clock: ({ className, ...props }: any) => (
    <div data-testid="clock" className={className} {...props} />
  ),
  RefreshCw: ({ className, ...props }: any) => (
    <div data-testid="refresh-cw" className={className} {...props} />
  ),
  Sparkles: ({ className, ...props }: any) => (
    <div data-testid="sparkles" className={className} {...props} />
  ),
}));

const defaultProps = {
  isGenerating: false,
  error: null,
  canRetry: true,
  summaryType: "concise" as SummaryType,
  onRetry: vi.fn(),
};

describe("SummaryGenerationProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Idle State", () => {
    it("should render idle state correctly", () => {
      render(<SummaryGenerationProgress {...defaultProps} />);

      expect(screen.getByText("Concise Summary")).toBeInTheDocument();
      expect(
        screen.getByText("Quick overview and key points")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Ready to generate concise summary")
      ).toBeInTheDocument();
    });

    it("should show estimated generation time", () => {
      render(
        <SummaryGenerationProgress {...defaultProps} estimatedTime={30} />
      );

      expect(screen.getByText(/~30s/)).toBeInTheDocument();
    });

    it("should display summary type icon and description", () => {
      render(<SummaryGenerationProgress {...defaultProps} />);

      expect(
        screen.getByRole("img", { name: "Concise Summary" })
      ).toBeInTheDocument();
      expect(screen.getByText("2-3 minutes read")).toBeInTheDocument();
    });
  });

  describe("Generating State", () => {
    it("should show progress bar when generating", () => {
      render(
        <SummaryGenerationProgress
          {...defaultProps}
          isGenerating={true}
          progress={50}
        />
      );

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
      expect(
        screen.getByText(/Generating structured summary content/)
      ).toBeInTheDocument();
      expect(screen.getByTestId("sparkles")).toBeInTheDocument();
    });

    it("should display progress messages based on progress value", () => {
      const { rerender } = render(
        <SummaryGenerationProgress
          {...defaultProps}
          isGenerating={true}
          progress={10}
        />
      );

      expect(screen.getByText(/Analyzing book content/)).toBeInTheDocument();

      rerender(
        <SummaryGenerationProgress
          {...defaultProps}
          isGenerating={true}
          progress={75}
        />
      );

      expect(
        screen.getByText(/Refining and formatting output/)
      ).toBeInTheDocument();
    });

    it("should show time remaining calculation", () => {
      render(
        <SummaryGenerationProgress
          {...defaultProps}
          isGenerating={true}
          progress={50}
          estimatedTime={30}
        />
      );

      expect(screen.getByText(/remaining/)).toBeInTheDocument();
      expect(screen.getByTestId("clock")).toBeInTheDocument();
    });

    it("should show cancel button when onCancel is provided", () => {
      const mockCancel = vi.fn();
      render(
        <SummaryGenerationProgress
          {...defaultProps}
          isGenerating={true}
          onCancel={mockCancel}
        />
      );

      const cancelButton = screen.getByRole("button", {
        name: /cancel generation/i,
      });
      expect(cancelButton).toBeInTheDocument();

      fireEvent.click(cancelButton);
      expect(mockCancel).toHaveBeenCalledOnce();
    });
  });

  describe("Success State", () => {
    it("should show success message when generation is complete", () => {
      render(<SummaryGenerationProgress {...defaultProps} isSuccess={true} />);

      expect(
        screen.getByText("Summary Generated Successfully!")
      ).toBeInTheDocument();
      expect(screen.getByText(/concise summary is ready/)).toBeInTheDocument();
      expect(screen.getByTestId("check-circle")).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    const errorProps = {
      ...defaultProps,
      error: new Error("Network connection failed"),
    };

    it("should show error message and retry button", () => {
      render(<SummaryGenerationProgress {...errorProps} />);

      expect(screen.getByText("Generation Failed")).toBeInTheDocument();
      expect(screen.getByText("Network connection failed")).toBeInTheDocument();
      expect(screen.getByTestId("alert-circle")).toBeInTheDocument();

      const retryButton = screen.getByRole("button", { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });

    it("should call onRetry when retry button is clicked", () => {
      const mockRetry = vi.fn();
      render(<SummaryGenerationProgress {...errorProps} onRetry={mockRetry} />);

      const retryButton = screen.getByRole("button", { name: /try again/i });
      fireEvent.click(retryButton);

      expect(mockRetry).toHaveBeenCalledOnce();
    });

    it("should not show retry button when canRetry is false", () => {
      render(<SummaryGenerationProgress {...errorProps} canRetry={false} />);

      expect(
        screen.queryByRole("button", { name: /try again/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("Different Summary Types", () => {
    it("should display correct information for detailed summary", () => {
      render(
        <SummaryGenerationProgress {...defaultProps} summaryType="detailed" />
      );

      expect(screen.getByText("Detailed Breakdown")).toBeInTheDocument();
      expect(
        screen.getByText("Chapter-by-chapter breakdown")
      ).toBeInTheDocument();
      expect(screen.getByText("8-10 minutes read")).toBeInTheDocument();
    });

    it("should display correct information for analysis summary", () => {
      render(
        <SummaryGenerationProgress {...defaultProps} summaryType="analysis" />
      );

      expect(screen.getByText("Critical Analysis")).toBeInTheDocument();
      expect(
        screen.getByText("Critical analysis of themes and style")
      ).toBeInTheDocument();
    });

    it("should display correct information for practical summary", () => {
      render(
        <SummaryGenerationProgress {...defaultProps} summaryType="practical" />
      );

      expect(screen.getByText("Practical Takeaways")).toBeInTheDocument();
      expect(
        screen.getByText("Actionable takeaways for your life")
      ).toBeInTheDocument();
    });
  });
});

describe("SummaryGenerationIndicator", () => {
  it("should render when active", () => {
    render(
      <SummaryGenerationIndicator
        isActive={true}
        progress={30}
        summaryType="concise"
      />
    );

    expect(screen.getByText(/Generating concise summary/)).toBeInTheDocument();
    expect(screen.getByText(/30%/)).toBeInTheDocument();
    expect(screen.getByTestId("sparkles")).toBeInTheDocument();
  });

  it("should not render when not active", () => {
    const { container } = render(
      <SummaryGenerationIndicator isActive={false} summaryType="concise" />
    );

    expect(container.firstChild).toBeNull();
  });
});

describe("GenerationTimeEstimate", () => {
  it("should show estimated time for concise summary", () => {
    render(<GenerationTimeEstimate summaryType="concise" />);

    expect(screen.getByText("~15s")).toBeInTheDocument();
    expect(screen.getByTestId("clock")).toBeInTheDocument();
  });

  it("should show detailed estimate when detailed prop is true", () => {
    render(<GenerationTimeEstimate summaryType="detailed" detailed={true} />);

    expect(screen.getByText("Generation time: ~1min")).toBeInTheDocument();
  });

  it("should format time correctly for different summary types", () => {
    const { rerender } = render(
      <GenerationTimeEstimate summaryType="concise" />
    );
    expect(screen.getByText("~15s")).toBeInTheDocument();

    rerender(<GenerationTimeEstimate summaryType="detailed" />);
    expect(screen.getByText("~1min")).toBeInTheDocument();

    rerender(<GenerationTimeEstimate summaryType="analysis" />);
    expect(screen.getByText("~1min")).toBeInTheDocument();

    rerender(<GenerationTimeEstimate summaryType="practical" />);
    expect(screen.getByText("~25s")).toBeInTheDocument();
  });
});

describe("Accessibility", () => {
  it("should have proper ARIA labels", () => {
    render(
      <SummaryGenerationProgress
        {...defaultProps}
        isGenerating={true}
        progress={50}
      />
    );

    expect(
      screen.getByLabelText("Summary generation progress")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Concise Summary" })
    ).toBeInTheDocument();
  });

  it("should maintain proper heading structure", () => {
    render(<SummaryGenerationProgress {...defaultProps} />);

    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });
});

describe("Progress Calculations", () => {
  it("should calculate time remaining correctly", () => {
    render(
      <SummaryGenerationProgress
        {...defaultProps}
        isGenerating={true}
        progress={25}
        estimatedTime={40}
      />
    );

    // Should show remaining time calculation
    expect(screen.getByText(/remaining/)).toBeInTheDocument();
  });

  it("should handle edge cases in progress calculation", () => {
    render(
      <SummaryGenerationProgress
        {...defaultProps}
        isGenerating={true}
        progress={0}
        estimatedTime={30}
      />
    );

    // Should not crash with zero progress
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
