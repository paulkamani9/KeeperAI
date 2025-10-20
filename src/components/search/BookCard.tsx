"use client";

import React from "react";
import Link from "next/link";
import {
  Heart,
  ExternalLink,
  BookOpen,
  Calendar,
  Star,
  ListPlus,
} from "lucide-react";
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
import { BookCover } from "@/components/shared/BookCover";
import { cn } from "@/lib/utils";
import type { Book } from "@/types/book";
import { useFavorites } from "@/hooks/useFavorites";
import { SignInButton } from "@clerk/nextjs";
import { toast } from "sonner";
import { useReadList } from "@/hooks/useReadList";

interface BookCardProps {
  /** Book data to display */
  book: Book;
  /** Loading state for async operations */
  isLoading?: boolean;
  /** Whether this book is in user's favorites */
  isFavorite?: boolean;
  /** Callback when favorite button is clicked */
  onFavoriteToggle?: (bookId: string, isFavorite: boolean) => void;
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
 * Features:
 * - Uses standardized Book interface from types
 * - Multiple variants support different use cases (grid, list, detail views)
 * - Loading states provide smooth UX during data fetching
 * - Navigates to book detail page on click
 * - Action handlers for favorites and external links
 * - Responsive design ensures good experience across devices
 */
export const BookCard: React.FC<BookCardProps> = ({
  book,
  isLoading = false,
  isFavorite: isFavoriteProp,
  onFavoriteToggle,
  variant = "default",
  className,
  showActions = true,
}) => {
  // Use favorites hook for state management
  const {
    isFavorited,
    toggleFavorite,
    isAuthenticated,
    isLoading: isFavoriteLoading,
  } = useFavorites(book.id);

  const {
    isInReadList,
    addBook,
    isAuthenticated: isReadListAuthenticated,
    isLoading: isReadListLoading,
  } = useReadList(book.id);

  // Use prop value if provided, otherwise use hook value
  const isFavorite = isFavoriteProp ?? isFavorited;

  // Format authors for display
  const authorsText = book.authors.join(", ");

  // Extract year from publication date
  const publicationYear = book.publishedDate
    ? new Date(book.publishedDate).getFullYear()
    : null;

  // Handle favorite toggle with authentication check
  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Prevent card click

    // If callback provided, use it (for custom handling)
    if (onFavoriteToggle && !isLoading) {
      onFavoriteToggle(book.id, !isFavorite);
      return;
    }

    // Otherwise use hook's toggle function
    if (!isAuthenticated) {
      toast.error("Please sign in to favorite books");
      return;
    }

    try {
      // Pass full Book object (from search results context)
      await toggleFavorite(book);
      toast.success(
        isFavorite ? "Removed from favorites" : "Added to favorites"
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Failed to update favorites. Please try again.");
    }
  };

  // Handle reading list toggle with authentication check
  const handleReadListClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Prevent card click

    if (!isReadListAuthenticated) {
      toast.error("Please sign in to manage your reading list");
      return;
    }

    try {
      // Pass full Book object (from search results context)
      await addBook(book, "want-to-read");
      toast.success("Added to reading list");
    } catch (error) {
      console.error("Error adding to reading list:", error);
      toast.error("Failed to add to reading list. Please try again.");
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
    <Link href={`/book/${book.id}`} className="block">
      <Card
        className={cn(
          "group overflow-hidden transition-all duration-200 hover:shadow-card-hover cursor-pointer",
          "border-border/50 hover:border-primary/20",
          isCompact && "p-3",
          className
        )}
      >
        <CardHeader className={cn(isCompact && "p-0 gap-3")}>
          <div className={cn("flex gap-4", isCompact && "gap-3")}>
            {/* Book Cover */}
            {!isCompact && (
              <div className="flex-shrink-0">
                <BookCover
                  title={book.title}
                  authors={book.authors}
                  src={
                    book.largeThumbnail ||
                    book.mediumThumbnail ||
                    book.thumbnail ||
                    book.smallThumbnail
                  }
                  fallbackSrcs={
                    [
                      book.mediumThumbnail,
                      book.thumbnail,
                      book.smallThumbnail,
                    ].filter(Boolean) as string[]
                  }
                  size="small"
                  clickable={false}
                  className="transition-transform group-hover:scale-105"
                />
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
                  {book.averageRating && (
                    <>
                      <Star className="h-3 w-3 fill-current text-yellow-500 ml-2" />
                      <span>{book.averageRating.toFixed(1)}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            {showActions && (
              <CardAction className="flex flex-col gap-1">
                {isAuthenticated ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
                        isFavorite && "opacity-100"
                      )}
                      onClick={handleFavoriteClick}
                      disabled={isFavoriteLoading}
                      title={
                        isFavorite
                          ? "Remove from favorites"
                          : "Add to favorites"
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
                        isInReadList && "opacity-100"
                      )}
                      onClick={handleReadListClick}
                      disabled={isReadListLoading}
                      title={
                        isInReadList ? "In reading list" : "Add to reading list"
                      }
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
                  </>
                ) : (
                  <>
                    <SignInButton mode="modal">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Sign in to favorite"
                      >
                        <Heart className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                      </Button>
                    </SignInButton>
                    <SignInButton mode="modal">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Sign in to add to reading list"
                      >
                        <ListPlus className="h-4 w-4 text-muted-foreground hover:text-blue-500" />
                      </Button>
                    </SignInButton>
                  </>
                )}

                {book.previewLink && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleLinkClick(e, book.previewLink)}
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
                {book.averageRating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current text-yellow-500" />
                    <span className="font-medium">
                      {book.averageRating.toFixed(1)}
                    </span>
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
    </Link>
  );
};
