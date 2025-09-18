import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ResultsList,
  type SearchResults,
  type PaginationInfo,
} from "./ResultsList";
import { type Book } from "./BookCard";

// Mock BookCard component to avoid complex rendering in tests
vi.mock("./BookCard", () => ({
  BookCard: ({
    book,
    isLoading,
    variant,
    isFavorite,
    onClick,
    onFavoriteToggle,
  }: any) => {
    if (isLoading) {
      return <div data-testid="book-card-skeleton">Loading...</div>;
    }
    return (
      <div
        data-testid="book-card"
        data-book-id={book.id}
        data-variant={variant}
        data-favorite={isFavorite}
        onClick={() => onClick?.(book)}
      >
        <span>{book.title}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle?.(book.id, !isFavorite);
          }}
        >
          {isFavorite ? "Remove from favorites" : "Add to favorites"}
        </button>
      </div>
    );
  },
}));

describe("ResultsList", () => {
  const mockBooks: Book[] = [
    {
      id: "1",
      title: "Clean Code",
      authors: ["Robert C. Martin"],
      description: "A handbook of agile software craftsmanship.",
    },
    {
      id: "2",
      title: "JavaScript: The Good Parts",
      authors: ["Douglas Crockford"],
      description: "Unearthing the excellence in JavaScript.",
    },
    {
      id: "3",
      title: "Design Patterns",
      authors: ["Gang of Four"],
      description: "Elements of reusable object-oriented software.",
    },
  ];

  const mockPagination: PaginationInfo = {
    currentPage: 0,
    totalPages: 3,
    pageSize: 10,
    totalItems: 25,
    hasNextPage: true,
    hasPrevPage: false,
  };

  const mockResults: SearchResults = {
    books: mockBooks,
    pagination: mockPagination,
    query: "programming books",
    searchTime: 150,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading State", () => {
    it("renders loading skeleton cards", () => {
      render(<ResultsList isLoading />);

      const skeletons = screen.getAllByTestId("book-card-skeleton");
      expect(skeletons).toHaveLength(12); // default skeleton count
    });

    it("renders custom number of skeleton cards", () => {
      render(<ResultsList isLoading skeletonCount={6} />);

      const skeletons = screen.getAllByTestId("book-card-skeleton");
      expect(skeletons).toHaveLength(6);
    });

    it("shows searching indicator", () => {
      render(<ResultsList isLoading />);

      expect(screen.getByText("Searching...")).toBeInTheDocument();
    });

    it("hides metadata during loading when showMetadata is false", () => {
      render(<ResultsList isLoading showMetadata={false} />);

      expect(screen.queryByText("Searching...")).not.toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("renders error message", () => {
      const errorMessage = "Failed to fetch search results";
      render(<ResultsList error={errorMessage} />);

      expect(screen.getByText("Search Error")).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it("renders try again button", async () => {
      const mockReload = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: mockReload },
        writable: true,
      });

      const user = userEvent.setup();
      render(<ResultsList error="Network error" />);

      const tryAgainButton = screen.getByRole("button", { name: /try again/i });
      await user.click(tryAgainButton);

      expect(mockReload).toHaveBeenCalled();
    });

    it("does not show error when loading", () => {
      render(<ResultsList error="Some error" isLoading />);

      expect(screen.queryByText("Search Error")).not.toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("renders empty state with no results", () => {
      render(
        <ResultsList results={{ books: [], pagination: mockPagination }} />
      );

      expect(screen.getByText("No books found")).toBeInTheDocument();
    });

    it("shows query-specific empty message", () => {
      const emptyResults: SearchResults = {
        books: [],
        pagination: mockPagination,
        query: "nonexistent book",
      };

      render(<ResultsList results={emptyResults} />);

      expect(
        screen.getByText(/No results found for "nonexistent book"/)
      ).toBeInTheDocument();
    });

    it("shows generic empty message without query", () => {
      const emptyResults: SearchResults = {
        books: [],
        pagination: mockPagination,
      };

      render(<ResultsList results={emptyResults} />);

      expect(
        screen.getByText("Start typing to search for books.")
      ).toBeInTheDocument();
    });

    it("provides search suggestions", () => {
      render(
        <ResultsList results={{ books: [], pagination: mockPagination }} />
      );

      expect(screen.getByText("• Try different keywords")).toBeInTheDocument();
      expect(screen.getByText("• Check your spelling")).toBeInTheDocument();
      expect(screen.getByText("• Use more general terms")).toBeInTheDocument();
    });
  });

  describe("Results Display", () => {
    it("renders search results", () => {
      render(<ResultsList results={mockResults} />);

      expect(screen.getByText("Clean Code")).toBeInTheDocument();
      expect(
        screen.getByText("JavaScript: The Good Parts")
      ).toBeInTheDocument();
      expect(screen.getByText("Design Patterns")).toBeInTheDocument();
    });

    it("applies correct grid classes for different variants", () => {
      const { container: gridContainer } = render(
        <ResultsList results={mockResults} variant="grid" />
      );
      const gridElement = gridContainer.querySelector(".grid");
      expect(gridElement).toHaveClass(
        "grid-cols-1",
        "sm:grid-cols-2",
        "lg:grid-cols-3"
      );

      const { container: listContainer } = render(
        <ResultsList results={mockResults} variant="list" />
      );
      const listElement = listContainer.querySelector(".grid");
      expect(listElement).toHaveClass("grid-cols-1");

      const { container: compactContainer } = render(
        <ResultsList results={mockResults} variant="compact" />
      );
      const compactElement = compactContainer.querySelector(".grid");
      expect(compactElement).toHaveClass(
        "grid-cols-1",
        "sm:grid-cols-2",
        "lg:grid-cols-3"
      );
    });

    it("passes correct variant to BookCard components", () => {
      render(<ResultsList results={mockResults} variant="compact" />);

      const bookCards = screen.getAllByTestId("book-card");
      bookCards.forEach((card) => {
        expect(card).toHaveAttribute("data-variant", "compact");
      });
    });

    it("passes favorite state to BookCard components", () => {
      const favoriteIds = new Set(["1", "3"]);
      render(
        <ResultsList results={mockResults} favoriteBookIds={favoriteIds} />
      );

      const book1 = screen
        .getByTestId("book-card")
        .querySelector('[data-book-id="1"]');
      const book2 = screen
        .getByTestId("book-card")
        .querySelector('[data-book-id="2"]');

      expect(book1).toHaveAttribute("data-favorite", "true");
      expect(book2).toHaveAttribute("data-favorite", "false");
    });
  });

  describe("Search Metadata", () => {
    it("displays results count and query", () => {
      render(<ResultsList results={mockResults} />);

      expect(
        screen.getByText(/Showing 1-10 of 25 results for "programming books"/)
      ).toBeInTheDocument();
    });

    it("displays search time", () => {
      render(<ResultsList results={mockResults} />);

      expect(screen.getByText("Search completed in 150ms")).toBeInTheDocument();
    });

    it("hides metadata when showMetadata is false", () => {
      render(<ResultsList results={mockResults} showMetadata={false} />);

      expect(
        screen.queryByText(/Showing 1-10 of 25 results/)
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/Search completed in/)).not.toBeInTheDocument();
    });

    it("calculates correct result range for different pages", () => {
      const secondPageResults = {
        ...mockResults,
        pagination: { ...mockPagination, currentPage: 1 },
      };

      render(<ResultsList results={secondPageResults} />);

      expect(
        screen.getByText(/Showing 11-20 of 25 results/)
      ).toBeInTheDocument();
    });

    it("handles last page result range correctly", () => {
      const lastPageResults = {
        ...mockResults,
        pagination: { ...mockPagination, currentPage: 2, hasNextPage: false },
      };

      render(<ResultsList results={lastPageResults} />);

      expect(
        screen.getByText(/Showing 21-25 of 25 results/)
      ).toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    it("renders pagination controls", () => {
      render(<ResultsList results={mockResults} />);

      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /previous/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    });

    it("disables previous button on first page", () => {
      render(<ResultsList results={mockResults} />);

      const prevButton = screen.getByRole("button", { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });

    it("disables next button on last page", () => {
      const lastPageResults = {
        ...mockResults,
        pagination: {
          ...mockPagination,
          currentPage: 2,
          hasNextPage: false,
          hasPrevPage: true,
        },
      };

      render(<ResultsList results={lastPageResults} />);

      const nextButton = screen.getByRole("button", { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it("calls onPageChange when navigation buttons are clicked", async () => {
      const mockOnPageChange = vi.fn();
      const user = userEvent.setup();

      const resultsWithPrev = {
        ...mockResults,
        pagination: { ...mockPagination, currentPage: 1, hasPrevPage: true },
      };

      render(
        <ResultsList
          results={resultsWithPrev}
          onPageChange={mockOnPageChange}
        />
      );

      const prevButton = screen.getByRole("button", { name: /previous/i });
      const nextButton = screen.getByRole("button", { name: /next/i });

      await user.click(prevButton);
      expect(mockOnPageChange).toHaveBeenCalledWith(0);

      await user.click(nextButton);
      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it("renders page number buttons", () => {
      render(<ResultsList results={mockResults} />);

      expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    });

    it("highlights current page button", () => {
      render(<ResultsList results={mockResults} />);

      const currentPageButton = screen.getByRole("button", { name: "1" });
      expect(currentPageButton).toHaveClass("pointer-events-none");
    });

    it("calls onPageChange when page number is clicked", async () => {
      const mockOnPageChange = vi.fn();
      const user = userEvent.setup();

      render(
        <ResultsList results={mockResults} onPageChange={mockOnPageChange} />
      );

      const page2Button = screen.getByRole("button", { name: "2" });
      await user.click(page2Button);

      expect(mockOnPageChange).toHaveBeenCalledWith(1); // 0-indexed
    });

    it("does not render pagination for single page", () => {
      const singlePageResults = {
        ...mockResults,
        pagination: { ...mockPagination, totalPages: 1 },
      };

      render(<ResultsList results={singlePageResults} />);

      expect(screen.queryByText("Page 1 of")).not.toBeInTheDocument();
    });

    it("handles pagination with ellipsis for many pages", () => {
      const manyPagesResults = {
        ...mockResults,
        pagination: { ...mockPagination, currentPage: 5, totalPages: 20 },
      };

      render(<ResultsList results={manyPagesResults} />);

      expect(screen.getByText("...")).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("calls onBookClick when book is clicked", async () => {
      const mockOnBookClick = vi.fn();
      const user = userEvent.setup();

      render(
        <ResultsList results={mockResults} onBookClick={mockOnBookClick} />
      );

      const firstBook = screen.getByText("Clean Code");
      await user.click(firstBook);

      expect(mockOnBookClick).toHaveBeenCalledWith(mockBooks[0]);
    });

    it("calls onFavoriteToggle when favorite button is clicked", async () => {
      const mockOnFavoriteToggle = vi.fn();
      const user = userEvent.setup();

      render(
        <ResultsList
          results={mockResults}
          onFavoriteToggle={mockOnFavoriteToggle}
        />
      );

      const favoriteButton = screen.getAllByText("Add to favorites")[0];
      await user.click(favoriteButton);

      expect(mockOnFavoriteToggle).toHaveBeenCalledWith("1", true);
    });

    it("handles favorite toggle for already favorited book", async () => {
      const mockOnFavoriteToggle = vi.fn();
      const favoriteIds = new Set(["1"]);
      const user = userEvent.setup();

      render(
        <ResultsList
          results={mockResults}
          favoriteBookIds={favoriteIds}
          onFavoriteToggle={mockOnFavoriteToggle}
        />
      );

      const removeFavoriteButton = screen.getByText("Remove from favorites");
      await user.click(removeFavoriteButton);

      expect(mockOnFavoriteToggle).toHaveBeenCalledWith("1", false);
    });
  });

  describe("Styling and Layout", () => {
    it("applies custom className", () => {
      const { container } = render(
        <ResultsList results={mockResults} className="custom-class" />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("custom-class");
    });

    it("applies correct grid layout classes", () => {
      const { container } = render(
        <ResultsList results={mockResults} variant="grid" />
      );

      const grid = container.querySelector(".grid");
      expect(grid).toHaveClass(
        "grid-cols-1",
        "sm:grid-cols-2",
        "lg:grid-cols-3",
        "xl:grid-cols-4",
        "2xl:grid-cols-5"
      );
    });

    it("applies list layout classes", () => {
      const { container } = render(
        <ResultsList results={mockResults} variant="list" />
      );

      const grid = container.querySelector(".grid");
      expect(grid).toHaveClass("grid-cols-1");
    });

    it("applies compact layout classes", () => {
      const { container } = render(
        <ResultsList results={mockResults} variant="compact" />
      );

      const grid = container.querySelector(".grid");
      expect(grid).toHaveClass(
        "grid-cols-1",
        "sm:grid-cols-2",
        "lg:grid-cols-3",
        "xl:grid-cols-4"
      );
    });
  });

  describe("Edge Cases", () => {
    it("handles missing pagination gracefully", () => {
      const resultsNoPagination = {
        books: mockBooks,
      } as SearchResults;

      render(<ResultsList results={resultsNoPagination} />);

      expect(screen.getByText("Clean Code")).toBeInTheDocument();
      expect(screen.queryByText("Page 1 of")).not.toBeInTheDocument();
    });

    it("handles empty favoriteBookIds set", () => {
      render(<ResultsList results={mockResults} favoriteBookIds={new Set()} />);

      const bookCards = screen.getAllByTestId("book-card");
      bookCards.forEach((card) => {
        expect(card).toHaveAttribute("data-favorite", "false");
      });
    });

    it("handles missing search time", () => {
      const resultsNoTime = { ...mockResults };
      delete resultsNoTime.searchTime;

      render(<ResultsList results={resultsNoTime} />);

      expect(screen.queryByText(/Search completed in/)).not.toBeInTheDocument();
    });

    it("handles missing query in results", () => {
      const resultsNoQuery = { ...mockResults };
      delete resultsNoQuery.query;

      render(<ResultsList results={resultsNoQuery} />);

      expect(
        screen.getByText(/Showing 1-10 of 25 results$/)
      ).toBeInTheDocument();
    });

    it("does not call onPageChange for same page", async () => {
      const mockOnPageChange = vi.fn();
      const user = userEvent.setup();

      render(
        <ResultsList results={mockResults} onPageChange={mockOnPageChange} />
      );

      const currentPageButton = screen.getByRole("button", { name: "1" });
      await user.click(currentPageButton);

      expect(mockOnPageChange).not.toHaveBeenCalled();
    });
  });
});
