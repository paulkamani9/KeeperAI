"use client";

import React from "react";
import Image from "next/image";
import { Heart, ExternalLink, BookOpen, Calendar, Star } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Core book data interface
export interface Book {
  /** Unique identifier for the book */
  id: string;
  /** Book title */
  title: string;
  /** Author(s) - can be a string or array of strings */
  authors: string[] | string;
  /** Book description or summary */
  description?: string;
  /** Cover image URL */
  coverImage?: string;
  /** Publication date */
  publishedDate?: string;
  /** Page count */
  pageCount?: number;
  /** Average rating (0-5) */
  rating?: number;
  /** Number of ratings */
  ratingsCount?: number;
  /** Categories/genres */
  categories?: string[];
  /** ISBN identifiers */
  isbn?: {
    isbn10?: string;
    isbn13?: string;
  };
  /** External links */
  links?: {
    preview?: string;
    info?: string;
    buyLink?: string;
  };
}

interface BookCardProps {
  /** Book data to display */
  book: Book;
  /** Loading state for async operations */
  isLoading?: boolean;
  /** Whether this book is in user's favorites */
  isFavorite?: boolean;
  /** Callback when favorite button is clicked */
  onFavoriteToggle?: (bookId: string, isFavorite: boolean) => void;
  /** Callback when card is clicked (for navigation) */
  onClick?: (book: Book) => void;
  /** Variant for different display contexts */
  variant?: "default" | "compact" | "detailed";
  /** Additional CSS classes */
  className?: string;
  /** Whether to show action buttons */
  showActions?: boolean;
}

/**
 * Book display card component with multiple variants and states.
 *
 * Why this architecture:
 * - Flexible Book interface accommodates different API responses
 * - Multiple variants support different use cases (grid, list, detail views)
 * - Loading states provide smooth UX during data fetching
 * - Action handlers enable interactive functionality
 * - Responsive design ensures good experience across devices
 */
export const BookCard: React.FC<BookCardProps> = ({
  book,
  isLoading = false,
  isFavorite = false,
  onFavoriteToggle,
  onClick,
  variant = "default",
  className,
  showActions = true,
}) => {
  // Normalize authors to array format
  const authorsArray = Array.isArray(book.authors)
    ? book.authors
    : [book.authors];
  const authorsText = authorsArray.join(", ");

  // Extract year from publication date
  const publicationYear = book.publishedDate
    ? new Date(book.publishedDate).getFullYear()
    : null;

  // Handle card click
  const handleCardClick = () => {
    if (onClick && !isLoading) {
      onClick(book);
    }
  };

  // Handle favorite toggle
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onFavoriteToggle && !isLoading) {
      onFavoriteToggle(book.id, !isFavorite);
    }
  };

  // Handle external link click
  const handleLinkClick = (e: React.MouseEvent, url?: string) => {
    e.stopPropagation(); // Prevent card click
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader>
          <div className="flex gap-4">
            {variant !== "compact" && (
              <Skeleton className="h-24 w-16 rounded-md flex-shrink-0" />
            )}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              {variant === "detailed" && (
                <>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const isCompact = variant === "compact";
  const isDetailed = variant === "detailed";

  return (
    <Card
      className={cn(
        "group overflow-hidden transition-all duration-200 hover:shadow-card-hover cursor-pointer",
        "border-border/50 hover:border-primary/20",
        isCompact && "p-3",
        className
      )}
      onClick={handleCardClick}
    >
      <CardHeader className={cn(isCompact && "p-0 gap-3")}>
        <div className={cn("flex gap-4", isCompact && "gap-3")}>
          {/* Book Cover */}
          {!isCompact && (
            <div className="flex-shrink-0">
              <div className="relative h-24 w-16 rounded-md overflow-hidden bg-muted">
                {book.coverImage ? (
                  <Image
                    src={book.coverImage}
                    alt={`Cover of ${book.title}`}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="64px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <BookOpen className="h-6 w-6 text-primary/50" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Book Info */}
          <div className="flex-1 min-w-0">
            <CardTitle
              className={cn(
                "line-clamp-2 group-hover:text-primary transition-colors",
                isCompact ? "text-sm" : "text-base"
              )}
            >
              {book.title}
            </CardTitle>

            <CardDescription
              className={cn(
                "line-clamp-1 mt-1",
                isCompact ? "text-xs" : "text-sm"
              )}
            >
              {authorsText}
            </CardDescription>

            {/* Additional info for compact variant */}
            {isCompact && publicationYear && (
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{publicationYear}</span>
                {book.rating && (
                  <>
                    <Star className="h-3 w-3 fill-current text-yellow-500 ml-2" />
                    <span>{book.rating.toFixed(1)}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {showActions && (
            <CardAction className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
                  isFavorite && "opacity-100"
                )}
                onClick={handleFavoriteClick}
                title={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
              >
                <Heart
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isFavorite
                      ? "fill-red-500 text-red-500"
                      : "text-muted-foreground hover:text-red-500"
                  )}
                />
              </Button>

              {book.links?.preview && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleLinkClick(e, book.links?.preview)}
                  title="Preview book"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </CardAction>
          )}
        </div>
      </CardHeader>

      {/* Detailed content for non-compact variants */}
      {!isCompact && (
        <>
          {/* Description */}
          {book.description && (
            <CardContent>
              <p
                className={cn(
                  "text-sm text-muted-foreground leading-relaxed",
                  isDetailed ? "line-clamp-4" : "line-clamp-2"
                )}
              >
                {book.description}
              </p>
            </CardContent>
          )}

          {/* Footer with metadata */}
          <CardFooter className="pt-0">
            <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                {publicationYear && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{publicationYear}</span>
                  </div>
                )}

                {book.pageCount && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    <span>{book.pageCount} pages</span>
                  </div>
                )}
              </div>

              {/* Rating */}
              {book.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current text-yellow-500" />
                  <span className="font-medium">{book.rating.toFixed(1)}</span>
                  {book.ratingsCount && (
                    <span className="text-muted-foreground">
                      ({book.ratingsCount.toLocaleString()})
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardFooter>

          {/* Categories for detailed variant */}
          {isDetailed && book.categories && book.categories.length > 0 && (
            <CardFooter className="pt-0">
              <div className="flex flex-wrap gap-1">
                {book.categories.slice(0, 3).map((category) => (
                  <span
                    key={category}
                    className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                  >
                    {category}
                  </span>
                ))}
                {book.categories.length > 3 && (
                  <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full">
                    +{book.categories.length - 3} more
                  </span>
                )}
              </div>
            </CardFooter>
          )}
        </>
      )}
    </Card>
  );
};
