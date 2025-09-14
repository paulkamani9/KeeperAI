"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BookCard, BookData } from "./BookCard";

interface BookCarouselProps {
  title: string;
  books: BookData[];
  size?: "sm" | "md" | "lg";
  showFavorites?: boolean;
  onFavoriteToggle?: (bookId: string) => void;
  isLoading?: boolean;
  className?: string;
  emptyMessage?: string;
  showScrollButtons?: boolean;
}

export function BookCarousel({
  title,
  books,
  size = "md",
  showFavorites = true,
  onFavoriteToggle,
  isLoading = false,
  className,
  emptyMessage = "No books found",
  showScrollButtons = true,
}: BookCarouselProps) {
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const scrollArea = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (!scrollArea) return;

    const scrollAmount = direction === "left" ? -320 : 320;
    scrollArea.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <section className={cn("space-y-4", className)}>
        {/* Loading Header */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-48 bg-muted rounded-md animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-9 bg-muted rounded-md animate-pulse" />
            <div className="h-9 w-9 bg-muted rounded-md animate-pulse" />
          </div>
        </div>

        {/* Loading Cards */}
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-40 flex-shrink-0 space-y-3">
              <div className="h-56 bg-muted rounded-lg animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!books.length) {
    return (
      <section className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        </div>
        <div className="flex items-center justify-center py-12 text-center">
          <div className="space-y-2">
            <div className="text-4xl">📚</div>
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("space-y-4 group", className)}>
      {/* Header with Title and Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground tracking-tight">
          {title}
        </h2>

        {showScrollButtons && books.length > 4 && (
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll("left")}
              className="h-9 w-9 rounded-full border-border/50 hover:border-border bg-background/80 backdrop-blur-sm"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll("right")}
              className="h-9 w-9 rounded-full border-border/50 hover:border-border bg-background/80 backdrop-blur-sm"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Scrollable Books Container */}
      <ScrollArea ref={scrollAreaRef} className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4">
          {books.map((book, index) => (
            <div
              key={book.id}
              className={cn(
                "flex-shrink-0 animate-fade-in",
                // Stagger animation delay for smooth entrance
                `[animation-delay:${Math.min(index * 50, 300)}ms]`
              )}
            >
              <BookCard
                book={book}
                size={size}
                showFavorite={showFavorites}
                onFavoriteToggle={onFavoriteToggle}
                className="hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
              />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="mt-2" />
      </ScrollArea>

      {/* Book Count Indicator */}
      {books.length > 0 && (
        <div className="flex justify-center">
          <span className="text-xs text-muted-foreground">
            {books.length} book{books.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </section>
  );
}
