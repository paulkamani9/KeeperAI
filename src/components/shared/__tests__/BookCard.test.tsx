import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import type { Book } from "@/types/book";
import { BookCard } from "../BookCard";

vi.mock("@/hooks/useFavorites", () => ({
  useFavorites: vi.fn(() => ({
    isFavorited: false,
    toggleFavorite: vi.fn(),
    isAuthenticated: true,
    isLoading: false,
  })),
}));

vi.mock("@/hooks/useReadList", () => ({
  useReadList: vi.fn(() => ({
    isInReadList: true,
    addBook: vi.fn(),
    removeBook: vi.fn(),
    updateReadingStatus: vi.fn(),
    isAuthenticated: true,
    isLoading: false,
  })),
}));

vi.mock("@/components/shared/BookCover", () => ({
  BookCover: vi.fn(({ title }: { title: string }) => (
    <div data-testid="book-cover">{title}</div>
  )),
}));

vi.mock("@/components/shared/ReadingListDropdown", () => ({
  ReadingListDropdown: vi.fn(() => (
    <button type="button" data-testid="reading-list-dropdown">
      Manage
    </button>
  )),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("BookCard responsive layout", () => {
  const baseBook: Book = {
    id: "book-123",
    title:
      "A Very Long Book Title That Should Wrap Gracefully On Smaller Cards",
    authors: ["Jane Doe", "John Smith"],
    source: "google-books",
    originalId: "orig-123",
  };

  it("keeps the reading list actions accessible on narrow cards", () => {
    const { container } = render(
      <BookCard
        book={baseBook}
        showActions
        showReadingListActions
        currentReadingStatus="reading"
        onStatusChange={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    const actionContainer = container.querySelector(
      '[data-slot="card-action"]'
    ) as HTMLElement | null;

    expect(actionContainer).not.toBeNull();
    expect(actionContainer?.className).toContain("col-span-full");
    expect(actionContainer?.className).toContain("ml-auto");
    expect(
      actionContainer?.querySelector('[data-testid="reading-list-dropdown"]')
    ).not.toBeNull();
  });

  it("applies word-breaking to prevent long content from pushing actions off screen", () => {
    render(
      <BookCard
        book={baseBook}
        showActions
        showReadingListActions
        currentReadingStatus="completed"
      />
    );

    const title = screen.getByText(baseBook.title);
    expect(title.className).toContain("break-words");
  });
});
