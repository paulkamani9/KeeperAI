/**
 * Tests for BookCover component
 * 
 * Coverage:
 * - Size variants rendering
 * - Image loading and fallback     it("renders loading skeleton", () => {
      render(<BookCover {...defaultProps} loading />);
      
      const skeleton = screen.getByTestId("book-cover-loading");
      expect(skeleton).toBeInTheDocument();
      
      // The animate-pulse class is on the inner div
      const pulseDiv = skeleton.querySelector('.animate-pulse');
      expect(pulseDiv).toBeInTheDocument();
    }); 
 * - Accessibility features
 * - Interactive behavior
 * - Error handling
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { BookCover, BookCoverSkeleton } from "../BookCover";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({ src, alt, onError, onLoad, ...props }: any) => {
    return (
      <img
        src={src}
        alt={alt}
        data-testid="next-image"
        onError={onError}
        onLoad={onLoad}
        {...props}
      />
    );
  },
}));

describe("BookCover", () => {
  const defaultProps = {
    title: "Test Book",
    authors: ["Test Author"],
  };

  describe("Size Variants", () => {
    it("renders small size correctly", () => {
      render(<BookCover {...defaultProps} size="small" />);
      const container = screen.getByTestId("book-cover-container");
      expect(container).toHaveClass("w-16", "sm:w-20");
    });

    it("renders medium size correctly", () => {
      render(<BookCover {...defaultProps} size="medium" />);
      const container = screen.getByTestId("book-cover-container");
      expect(container).toHaveClass("w-24", "sm:w-32");
    });

    it("renders large size correctly", () => {
      render(<BookCover {...defaultProps} size="large" />);
      const container = screen.getByTestId("book-cover-container");
      expect(container).toHaveClass("w-32", "sm:w-40", "md:w-48");
    });

    it("renders hero size correctly", () => {
      render(<BookCover {...defaultProps} size="hero" />);
      const container = screen.getByTestId("book-cover-container");
      expect(container).toHaveClass("w-48", "sm:w-56", "md:w-64", "lg:w-72");
    });
  });

  describe("Image Loading", () => {
    it("renders image when src is provided", () => {
      render(
        <BookCover
          {...defaultProps}
          src="https://example.com/cover.jpg"
          clickable={true}
        />
      );

      const image = screen.getByTestId("next-image");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", "https://example.com/cover.jpg");
    });

    it("shows fallback content when no src provided", () => {
      render(<BookCover {...defaultProps} />);

      expect(screen.getByText("Test Book")).toBeInTheDocument();
      expect(screen.getByText("Test Author")).toBeInTheDocument();
    });

    it("attempts to use fallback sources", () => {
      render(
        <BookCover
          {...defaultProps}
          src="https://example.com/broken.jpg"
          fallbackSrcs={["https://example.com/fallback.jpg"]}
          clickable={true}
        />
      );

      const image = screen.getByTestId("next-image");
      expect(image).toHaveAttribute("src", "https://example.com/broken.jpg");
    });

    it("shows fallback content when no valid images", () => {
      render(<BookCover {...defaultProps} src="" fallbackSrcs={[]} />);

      expect(screen.getByText("Test Book")).toBeInTheDocument();
      expect(screen.getByText("Test Author")).toBeInTheDocument();
    });
  });

  describe("Loading States", () => {
    it("renders loading skeleton", () => {
      render(<BookCover {...defaultProps} loading={true} />);

      const skeleton = screen.getByTestId("book-cover-loading");
      expect(skeleton).toBeInTheDocument();

      // The animate-pulse class is on the inner div
      const pulseDiv = skeleton.querySelector(".animate-pulse");
      expect(pulseDiv).toBeInTheDocument();
    });

    it("does not render content when loading", () => {
      render(
        <BookCover
          {...defaultProps}
          loading={true}
          src="https://example.com/cover.jpg"
        />
      );

      expect(screen.queryByTestId("next-image")).not.toBeInTheDocument();
      expect(screen.queryByText("Test Book")).not.toBeInTheDocument();
    });
  });

  describe("Interactive Behavior", () => {
    it("handles click events when clickable", async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();

      render(
        <BookCover {...defaultProps} clickable={true} onClick={onClick} />
      );

      const button = screen.getByRole("button");
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("handles keyboard events when clickable", async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();

      render(
        <BookCover {...defaultProps} clickable={true} onClick={onClick} />
      );

      const button = screen.getByRole("button");

      // Focus the button first
      button.focus();

      // Test Enter key with keyDown event (not type which can trigger multiple events)
      await user.keyboard("{Enter}");
      expect(onClick).toHaveBeenCalledTimes(1);

      // Reset the mock
      onClick.mockClear();

      // Test Space key
      await user.keyboard(" ");
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("does not handle clicks when not clickable", () => {
      const onClick = vi.fn();
      render(
        <BookCover {...defaultProps} clickable={false} onClick={onClick} />
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("has proper alt text for images", () => {
      render(
        <BookCover
          {...defaultProps}
          src="https://example.com/cover.jpg"
          clickable={true}
        />
      );

      const image = screen.getByTestId("next-image");
      expect(image).toHaveAttribute(
        "alt",
        'Cover of "Test Book" by Test Author'
      );
    });

    it("has proper aria-label when clickable", () => {
      render(<BookCover {...defaultProps} clickable={true} />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute(
        "aria-label",
        "View details for Test Book"
      );
    });

    it("has correct tabindex when clickable", () => {
      render(<BookCover {...defaultProps} clickable={true} />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("tabindex", "0");
    });

    it("does not have interactive attributes when not clickable", () => {
      render(<BookCover {...defaultProps} clickable={false} />);

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("Custom Props", () => {
    it("applies custom className", () => {
      render(
        <BookCover
          {...defaultProps}
          className="custom-class"
          clickable={true}
        />
      );

      // When clickable, the container div itself has role="button"
      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });

    it("handles multiple authors", () => {
      render(
        <BookCover {...defaultProps} authors={["Author One", "Author Two"]} />
      );

      expect(screen.getByText("Author One")).toBeInTheDocument();
    });

    it("handles empty authors array", () => {
      render(<BookCover {...defaultProps} authors={[]} />);

      expect(screen.getByText("Test Book")).toBeInTheDocument();
    });
  });
});

describe("BookCoverSkeleton", () => {
  it("renders skeleton with correct size", () => {
    render(<BookCoverSkeleton size="medium" />);

    const skeleton = screen.getByTestId("book-cover-skeleton");
    expect(skeleton).toHaveClass("w-24", "sm:w-32", "animate-pulse");
  });

  it("applies custom className", () => {
    render(<BookCoverSkeleton className="custom-skeleton" />);

    const skeleton = screen.getByTestId("book-cover-skeleton");
    expect(skeleton).toHaveClass("custom-skeleton");
  });

  it("defaults to medium size", () => {
    render(<BookCoverSkeleton />);

    const skeleton = screen.getByTestId("book-cover-skeleton");
    expect(skeleton).toHaveClass("w-24", "sm:w-32");
  });
});
