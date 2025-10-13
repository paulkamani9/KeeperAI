"use client";

import React from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

  return (
    <Link
      href={`/book/${book.originalBookId}`}
      className="block group"
      aria-label={`View ${book.title} by ${book.author}`}
    >
      <Card
        className={cn(
          "transition-all duration-300 cursor-pointer",
          "hover:shadow-lg hover:scale-[1.02]",
          "border-primary/10 hover:border-primary/30"
        )}
      >
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
