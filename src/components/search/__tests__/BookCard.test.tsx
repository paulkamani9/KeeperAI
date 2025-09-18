import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookCard, type Book } from "../BookCard";
import Image from "next/image";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({ src, alt, className, ...props }: any) => (
    <Image src={src} alt={alt} className={className} {...props} />
  ),
}));

describe("BookCard", () => {
  const mockBook: Book = {
    id: "1",
    title: "The Art of Clean Code",
    authors: ["Robert C. Martin", "Martin Fowler"],
    description:
      "A comprehensive guide to writing clean, maintainable code that stands the test of time. Learn principles and practices that will make you a better developer.",
    coverImage: "https://example.com/cover.jpg",
    publishedDate: "2020-05-15",
    pageCount: 350,
    rating: 4.7,
    ratingsCount: 1250,
    categories: ["Programming", "Software Engineering", "Technology"],
    isbn: {
      isbn10: "1234567890",
      isbn13: "9781234567890",
    },
    links: {
      preview: "https://example.com/preview",
      info: "https://example.com/info",
      buyLink: "https://example.com/buy",
    },
  };

  const mockBookMinimal: Book = {
    id: "2",
    title: "Simple Book",
    authors: "Single Author",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders book with all properties", () => {
      render(<BookCard book={mockBook} />);

      expect(screen.getByText("The Art of Clean Code")).toBeInTheDocument();
      expect(
        screen.getByText("Robert C. Martin, Martin Fowler")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/comprehensive guide to writing clean/)
      ).toBeInTheDocument();
    });

    it("renders book with minimal properties", () => {
      render(<BookCard book={mockBookMinimal} />);

      expect(screen.getByText("Simple Book")).toBeInTheDocument();
      expect(screen.getByText("Single Author")).toBeInTheDocument();
    });

    it("normalizes authors from string to display format", () => {
      render(<BookCard book={mockBookMinimal} />);

      expect(screen.getByText("Single Author")).toBeInTheDocument();
    });

    it("normalizes authors from array to display format", () => {
      render(<BookCard book={mockBook} />);

      expect(
        screen.getByText("Robert C. Martin, Martin Fowler")
      ).toBeInTheDocument();
    });

    it("displays publication year when date is provided", () => {
      render(<BookCard book={mockBook} />);

      expect(screen.getByText("2020")).toBeInTheDocument();
    });

    it("displays page count when provided", () => {
      render(<BookCard book={mockBook} />);

      expect(screen.getByText("350 pages")).toBeInTheDocument();
    });

    it("displays rating when provided", () => {
      render(<BookCard book={mockBook} />);

      expect(screen.getByText("4.7")).toBeInTheDocument();
      expect(screen.getByText("(1,250)")).toBeInTheDocument();
    });
  });

  describe("Variants", () => {
    it("renders default variant with cover image", () => {
      render(<BookCard book={mockBook} />);

      const image = screen.getByRole("img", {
        name: /cover of the art of clean code/i,
      });
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", "https://example.com/cover.jpg");
    });

    it("renders compact variant without cover image", () => {
      render(<BookCard book={mockBook} variant="compact" />);

      const image = screen.queryByRole("img", { name: /cover of/i });
      expect(image).not.toBeInTheDocument();
    });

    it("shows rating in compact variant info line", () => {
      render(<BookCard book={mockBook} variant="compact" />);

      // In compact mode, rating appears in the same line as publication year
      expect(screen.getByText("2020")).toBeInTheDocument();
      expect(screen.getByText("4.7")).toBeInTheDocument();
    });

    it("renders detailed variant with categories", () => {
      render(<BookCard book={mockBook} variant="detailed" />);

      expect(screen.getByText("Programming")).toBeInTheDocument();
      expect(screen.getByText("Software Engineering")).toBeInTheDocument();
      expect(screen.getByText("Technology")).toBeInTheDocument();
    });

    it("limits categories display to 3 with overflow indicator", () => {
      const bookWithManyCategories = {
        ...mockBook,
        categories: ["Cat1", "Cat2", "Cat3", "Cat4", "Cat5"],
      };

      render(<BookCard book={bookWithManyCategories} variant="detailed" />);

      expect(screen.getByText("Cat1")).toBeInTheDocument();
      expect(screen.getByText("Cat2")).toBeInTheDocument();
      expect(screen.getByText("Cat3")).toBeInTheDocument();
      expect(screen.getByText("+2 more")).toBeInTheDocument();
      expect(screen.queryByText("Cat4")).not.toBeInTheDocument();
    });

    it("shows longer description in detailed variant", () => {
      render(<BookCard book={mockBook} variant="detailed" />);

      const description = screen.getByText(/comprehensive guide/);
      expect(description).toHaveClass("line-clamp-4");
    });

    it("shows shorter description in default variant", () => {
      render(<BookCard book={mockBook} />);

      const description = screen.getByText(/comprehensive guide/);
      expect(description).toHaveClass("line-clamp-2");
    });
  });

  describe("Loading State", () => {
    it("renders loading skeleton when isLoading is true", () => {
      render(<BookCard book={mockBook} isLoading />);

      // Should not render actual content
      expect(
        screen.queryByText("The Art of Clean Code")
      ).not.toBeInTheDocument();

      // Should render skeletons
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("renders different skeleton for compact variant", () => {
      render(<BookCard book={mockBook} isLoading variant="compact" />);

      // Compact variant should not have cover image skeleton
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("renders more skeletons for detailed variant", () => {
      const { container: defaultContainer } = render(
        <BookCard book={mockBook} isLoading />
      );
      const defaultSkeletons = defaultContainer.querySelectorAll(
        '[data-slot="skeleton"]'
      );

      const { container: detailedContainer } = render(
        <BookCard book={mockBook} isLoading variant="detailed" />
      );
      const detailedSkeletons = detailedContainer.querySelectorAll(
        '[data-slot="skeleton"]'
      );

      expect(detailedSkeletons.length).toBeGreaterThanOrEqual(
        defaultSkeletons.length
      );
    });
  });

  describe("Interactive Features", () => {
    it("calls onClick when card is clicked", async () => {
      const mockOnClick = vi.fn();
      const user = userEvent.setup();

      render(<BookCard book={mockBook} onClick={mockOnClick} />);

      const card = screen
        .getByText("The Art of Clean Code")
        .closest('[data-slot="card"]');
      await user.click(card!);

      expect(mockOnClick).toHaveBeenCalledWith(mockBook);
    });

    it("does not call onClick when loading", async () => {
      const mockOnClick = vi.fn();
      const user = userEvent.setup();

      render(<BookCard book={mockBook} onClick={mockOnClick} isLoading />);

      const card = document.querySelector('[data-slot="card"]');
      await user.click(card!);

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it("toggles favorite when favorite button is clicked", async () => {
      const mockOnFavoriteToggle = vi.fn();
      const user = userEvent.setup();

      render(
        <BookCard book={mockBook} onFavoriteToggle={mockOnFavoriteToggle} />
      );

      const favoriteButton = screen.getByRole("button", {
        name: /add to favorites/i,
      });
      await user.click(favoriteButton);

      expect(mockOnFavoriteToggle).toHaveBeenCalledWith(mockBook.id, true);
    });

    it("shows different favorite button state when book is favorited", async () => {
      const mockOnFavoriteToggle = vi.fn();
      const user = userEvent.setup();

      render(
        <BookCard
          book={mockBook}
          isFavorite
          onFavoriteToggle={mockOnFavoriteToggle}
        />
      );

      const favoriteButton = screen.getByRole("button", {
        name: /remove from favorites/i,
      });
      await user.click(favoriteButton);

      expect(mockOnFavoriteToggle).toHaveBeenCalledWith(mockBook.id, false);
    });

    it("does not trigger card click when favorite button is clicked", async () => {
      const mockOnClick = vi.fn();
      const mockOnFavoriteToggle = vi.fn();
      const user = userEvent.setup();

      render(
        <BookCard
          book={mockBook}
          onClick={mockOnClick}
          onFavoriteToggle={mockOnFavoriteToggle}
        />
      );

      const favoriteButton = screen.getByRole("button", {
        name: /add to favorites/i,
      });
      await user.click(favoriteButton);

      expect(mockOnFavoriteToggle).toHaveBeenCalled();
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it("opens preview link in new tab", async () => {
      const mockOpen = vi.fn();
      global.window.open = mockOpen;
      const user = userEvent.setup();

      render(<BookCard book={mockBook} />);

      const previewButton = screen.getByRole("button", {
        name: /preview book/i,
      });
      await user.click(previewButton);

      expect(mockOpen).toHaveBeenCalledWith(
        "https://example.com/preview",
        "_blank",
        "noopener,noreferrer"
      );
    });

    it("does not render preview button when no preview link", () => {
      const bookWithoutPreview = { ...mockBook };
      delete bookWithoutPreview.links;

      render(<BookCard book={bookWithoutPreview} />);

      const previewButton = screen.queryByRole("button", {
        name: /preview book/i,
      });
      expect(previewButton).not.toBeInTheDocument();
    });

    it("does not trigger card click when preview button is clicked", async () => {
      const mockOnClick = vi.fn();
      const mockOpen = vi.fn();
      global.window.open = mockOpen;
      const user = userEvent.setup();

      render(<BookCard book={mockBook} onClick={mockOnClick} />);

      const previewButton = screen.getByRole("button", {
        name: /preview book/i,
      });
      await user.click(previewButton);

      expect(mockOpen).toHaveBeenCalled();
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe("Action Buttons", () => {
    it("shows action buttons by default", () => {
      render(<BookCard book={mockBook} />);

      expect(
        screen.getByRole("button", { name: /add to favorites/i })
      ).toBeInTheDocument();
    });

    it("hides action buttons when showActions is false", () => {
      render(<BookCard book={mockBook} showActions={false} />);

      expect(
        screen.queryByRole("button", { name: /add to favorites/i })
      ).not.toBeInTheDocument();
    });

    it("does not call favorite toggle when loading", async () => {
      const mockOnFavoriteToggle = vi.fn();

      render(
        <BookCard
          book={mockBook}
          onFavoriteToggle={mockOnFavoriteToggle}
          isLoading
        />
      );

      // Loading state should not render action buttons
      const favoriteButton = screen.queryByRole("button", {
        name: /favorite/i,
      });
      expect(favoriteButton).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper alt text for cover image", () => {
      render(<BookCard book={mockBook} />);

      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("alt", "Cover of The Art of Clean Code");
    });

    it("shows placeholder when no cover image is provided", () => {
      const bookWithoutCover = { ...mockBook };
      delete bookWithoutCover.coverImage;

      render(<BookCard book={bookWithoutCover} />);

      expect(screen.queryByRole("img")).not.toBeInTheDocument();

      // Should show book icon placeholder
      const bookIcon = document.querySelector('[data-lucide="book-open"]');
      expect(bookIcon).toBeTruthy();
    });

    it("has proper button titles for screen readers", () => {
      render(<BookCard book={mockBook} />);

      const favoriteButton = screen.getByRole("button", {
        name: /add to favorites/i,
      });
      expect(favoriteButton).toHaveAttribute("title", "Add to favorites");

      const previewButton = screen.getByRole("button", {
        name: /preview book/i,
      });
      expect(previewButton).toHaveAttribute("title", "Preview book");
    });

    it("updates favorite button title based on state", () => {
      render(<BookCard book={mockBook} isFavorite />);

      const favoriteButton = screen.getByRole("button", {
        name: /remove from favorites/i,
      });
      expect(favoriteButton).toHaveAttribute("title", "Remove from favorites");
    });
  });

  describe("Visual States", () => {
    it("applies hover styles on card", () => {
      render(<BookCard book={mockBook} />);

      const card = screen
        .getByText("The Art of Clean Code")
        .closest('[data-slot="card"]');
      expect(card).toHaveClass("hover:shadow-card-hover");
    });

    it("shows favorite button as filled when book is favorited", () => {
      render(<BookCard book={mockBook} isFavorite />);

      const heartIcon = document.querySelector('[data-lucide="heart"]');
      expect(heartIcon).toHaveClass("fill-red-500", "text-red-500");
    });

    it("shows favorite button as outline when book is not favorited", () => {
      render(<BookCard book={mockBook} />);

      const heartIcon = document.querySelector('[data-lucide="heart"]');
      expect(heartIcon).not.toHaveClass("fill-red-500");
      expect(heartIcon).toHaveClass("text-muted-foreground");
    });

    it("applies custom className", () => {
      render(<BookCard book={mockBook} className="custom-class" />);

      const card = screen
        .getByText("The Art of Clean Code")
        .closest('[data-slot="card"]');
      expect(card).toHaveClass("custom-class");
    });
  });

  describe("Content Display", () => {
    it("truncates long titles appropriately", () => {
      const bookWithLongTitle = {
        ...mockBook,
        title:
          "This is a Very Long Book Title That Should Be Truncated When Displayed in the Card Component",
      };

      render(<BookCard book={bookWithLongTitle} />);

      const title = screen.getByText(/This is a Very Long Book Title/);
      expect(title).toHaveClass("line-clamp-2");
    });

    it("truncates author list appropriately", () => {
      render(<BookCard book={mockBook} />);

      const authors = screen.getByText("Robert C. Martin, Martin Fowler");
      expect(authors).toHaveClass("line-clamp-1");
    });

    it("does not render description section when description is empty", () => {
      const bookWithoutDescription = { ...mockBook };
      delete bookWithoutDescription.description;

      render(<BookCard book={bookWithoutDescription} />);

      // Should not render card content section
      const cardContent = document.querySelector('[data-slot="card-content"]');
      expect(cardContent).not.toBeInTheDocument();
    });

    it("formats rating count with proper localization", () => {
      render(<BookCard book={mockBook} />);

      // 1250 should be formatted as "1,250"
      expect(screen.getByText("(1,250)")).toBeInTheDocument();
    });

    it("formats rating to one decimal place", () => {
      const bookWithRating = { ...mockBook, rating: 4.6789 };

      render(<BookCard book={bookWithRating} />);

      expect(screen.getByText("4.7")).toBeInTheDocument();
    });
  });
});
