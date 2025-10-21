"use client";

import React from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { BookOpen, Heart, ListPlus } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";
import { useReadList } from "@/hooks/useReadList";
import { SignInButton } from "@clerk/nextjs";
import { toast } from "sonner";

/**
 * BookOfTheDayCard Component
 *
 * Displays the daily recommended book on the homepage.
 * Fetches data from Convex and navigates to the book detail page on click.
 *
 * Design Principles:
 * - Cohesive with KeeperAI design language
 * - Elegant through simplicity - minimal UI with breathing space
 * - Visual prominence without overpowering search
 * - Responsive: mobile stacked, desktop horizontal
 * - Smooth interactions with subtle hover effects
 */
export function BookOfTheDayCard() {
  const book = useQuery(api.bookOfTheDay.getBookOfTheDay);

  // Hooks for favorites and reading list (using originalBookId - book already in DB)
  const {
    isFavorited,
    toggleFavorite,
    isAuthenticated: isFavoritesAuthenticated,
    isLoading: isFavoriteLoading,
  } = useFavorites(book?.originalBookId);

  const {
    isInReadList,
    addBook,
    isAuthenticated: isReadListAuthenticated,
    isLoading: isReadListLoading,
  } = useReadList(book?.originalBookId);

  // Loading state with skeleton
  if (book === undefined) {
    return <BookOfTheDayCardSkeleton />;
  }

  // Gracefully hide if no book is available
  if (book === null) {
    return null;
  }

  // Get best available thumbnail with fallback
  const thumbnail = book.thumbnail;

  // Handle favorite toggle with authentication check
  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isFavoritesAuthenticated) {
      toast.error("Please sign in to favorite books");
      return;
    }

    try {
      // Pass bookId string (book already persisted in DB)
      await toggleFavorite(book.originalBookId);
      toast.success(
        isFavorited ? "Removed from favorites" : "Added to favorites"
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Failed to update favorites. Please try again.");
    }
  };

  // Handle reading list toggle with authentication check
  const handleReadListClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isReadListAuthenticated) {
      toast.error("Please sign in to manage your reading list");
      return;
    }

    try {
      // Pass bookId string (book already persisted in DB)
      await addBook(book.originalBookId, "want-to-read");
      toast.success("Added to reading list");
    } catch (error) {
      console.error("Error adding to reading list:", error);
      toast.error("Failed to add to reading list. Please try again.");
    }
  };

  return (
    <Link
      href={`/book/${book.originalBookId}`}
      className="block group"
      aria-label={`View ${book.title} by ${book.author}`}
    >
      <Card
        className={cn(
          "relative transition-all duration-300 cursor-pointer",
          "hover:shadow-lg hover:scale-[1.02]",
          "border-primary/10 hover:border-primary/30"
        )}
      >
        {/* Action Buttons - Top Right Overlay (appears on hover) */}
        <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {isFavoritesAuthenticated ? (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background/95",
                isFavorited && "bg-background/95"
              )}
              onClick={handleFavoriteClick}
              disabled={isFavoriteLoading}
              title={isFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart
                className={cn(
                  "h-4 w-4 transition-colors",
                  isFavorited
                    ? "fill-red-500 text-red-500"
                    : "text-muted-foreground hover:text-red-500"
                )}
              />
            </Button>
          ) : (
            <SignInButton mode="modal">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background/95"
                title="Sign in to favorite"
              >
                <Heart className="h-4 w-4 text-muted-foreground hover:text-red-500" />
              </Button>
            </SignInButton>
          )}

          {isReadListAuthenticated ? (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background/95",
                isInReadList && "bg-background/95"
              )}
              onClick={handleReadListClick}
              disabled={isReadListLoading}
              title={isInReadList ? "In reading list" : "Add to reading list"}
            >
              <ListPlus
                className={cn(
                  "h-4 w-4 transition-colors",
                  isInReadList
                    ? "fill-blue-500 text-blue-500"
                    : "text-muted-foreground hover:text-blue-500"
                )}
              />
            </Button>
          ) : (
            <SignInButton mode="modal">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background/95"
                title="Sign in to add to reading list"
              >
                <ListPlus className="h-4 w-4 text-muted-foreground hover:text-blue-500" />
              </Button>
            </SignInButton>
          )}
        </div>

        {/* Header with subtle label */}
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
            <CardTitle className="text-sm font-medium text-primary">
              Book of the Day
            </CardTitle>
          </div>
        </CardHeader>

        {/* Content: Fully Responsive Layout */}
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            {/* Book Cover - Centered on mobile, left on desktop */}
            {thumbnail && (
              <div className="flex-shrink-0">
                <div
                  className={cn(
                    "relative overflow-hidden rounded-lg",
                    "w-32 h-48 sm:w-28 sm:h-42",
                    "shadow-md group-hover:shadow-xl transition-shadow duration-300"
                  )}
                >
                  <img
                    src={thumbnail}
                    alt={`Cover of ${book.title}`}
                    className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </div>
            )}

            {/* Book Details - Centered on mobile, left-aligned on desktop */}
            <div className="flex-1 space-y-2 min-w-0 text-center sm:text-left">
              {/* Title */}
              <h3
                className={cn(
                  "font-semibold text-lg sm:text-xl leading-tight",
                  "group-hover:text-primary transition-colors duration-200",
                  "line-clamp-2"
                )}
              >
                {book.title}
              </h3>

              {/* Author */}
              <p className="text-sm text-muted-foreground">by {book.author}</p>

              {/* Reason/Tagline */}
              {book.reason && (
                <CardDescription className="pt-1 line-clamp-2 sm:line-clamp-3 italic">
                  "{book.reason}"
                </CardDescription>
              )}

              {/* Subtle call-to-action hint */}
              <p className="text-xs text-muted-foreground pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Click to explore →
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * Skeleton loader for BookOfTheDayCard
 * Maintains same structure and spacing as actual card
 */
function BookOfTheDayCardSkeleton() {
  return (
    <Card className="border-primary/10">
      {/* Header skeleton */}
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 justify-center sm:justify-start">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
      </CardHeader>

      {/* Content skeleton */}
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          {/* Cover skeleton */}
          <div className="flex-shrink-0">
            <Skeleton className="w-32 h-48 sm:w-28 sm:h-42 rounded-lg" />
          </div>

          {/* Details skeleton - centered on mobile */}
          <div className="flex-1 space-y-2 w-full">
            <Skeleton className="h-6 w-3/4 mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-1/2 mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6 mx-auto sm:mx-0" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

BookOfTheDayCard.displayName = "BookOfTheDayCard";
