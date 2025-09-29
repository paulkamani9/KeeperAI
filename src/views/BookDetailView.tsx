"use client";

import React, { useEffect, useState } from "react";
import {
  Star,
  Calendar,
  Users,
  BookOpen,
  Globe,
  ExternalLink,
  Heart,
  Sparkles,
  ChevronLeft,
  BookOpenIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { BookCover } from "@/components/shared/BookCover";
import { BookDescription } from "@/components/shared/BookDescription";
import {
  SummaryTypeSelector,
  type SummaryType,
} from "@/components/summary/SummaryTypeSelector";
import { SummaryGenerationProgress } from "@/components/summary/SummaryGenerationProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Book } from "@/types/book";
import { useSummaryGeneration } from "@/hooks/useSummaryGeneration";

interface BookDetailViewProps {
  /** Book data to display */
  book: Book;
  /** Custom className for styling */
  className?: string;
}

/**
 * BookDetailView - Immersive book preview page with hero background
 *
 * Features:
 * - Hero section with blurred book cover background
 * - Elevated book card with comprehensive metadata
 * - Summary generation with type selection
 * - Add to favorites functionality (placeholder)
 * - Responsive design following design system
 * - Accessible with proper ARIA labels and keyboard navigation
 */
export function BookDetailView({ book, className }: BookDetailViewProps) {
  const router = useRouter();
  const [selectedSummaryType, setSelectedSummaryType] =
    useState<SummaryType>("concise");
  const [hasGeneratedSummary, setHasGeneratedSummary] = useState(false); // used when summary is generated the first time

  // Initialize summary generation hook
  const {
    summary,
    isGenerating,
    error,
    progress,
    estimatedTime,
    generateSummary,
    canGenerate,
  } = useSummaryGeneration({
    book,
    summaryType: selectedSummaryType,
    enabled: true,
  });

  // Handlers for viewing existing summary
  const handleViewSummary = () => {
    if (summary) {
      router.push(`/summaries/${summary.id}`);
    }
  };

  // Handler for navigating back to search
  // this handles going back to the last search page with context intact
  // we store the last search URL in localStorage when user performs a search
  // even if user navigates away from book view and comes back later
  // they can still go back to their last search results
  const handleBackToSearch = () => {
    const lastSearchUrl = localStorage.getItem("lastSearchUrl");
    if (lastSearchUrl) {
      router.push(lastSearchUrl);
    } else {
      router.push("/search");
    }
  };

  // set the current summary type in local storage
  useEffect(() => {
    const selectedSummaryType = localStorage.getItem("currentSummaryType");
    if (selectedSummaryType) {
      setSelectedSummaryType(selectedSummaryType as SummaryType);
    }
  }, [selectedSummaryType]);

  // Handlers for summary generation
  const handleGenerateSummary = () => {
    generateSummary();
    setHasGeneratedSummary(true);
  };

  const handleRetryGeneration = () => {
    generateSummary();
    setHasGeneratedSummary(true);
  };

  // Extract primary image for hero background
  const heroImage =
    book.largeThumbnail ||
    book.mediumThumbnail ||
    book.thumbnail ||
    book.smallThumbnail;

  // Format publication date
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.getFullYear().toString();
    } catch {
      return dateString;
    }
  };

  // Format rating display
  const formatRating = (rating?: number, count?: number) => {
    if (!rating) return null;
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    return {
      fullStars,
      hasHalfStar,
      rating: rating.toFixed(1),
      count: count
        ? count >= 1000
          ? `${(count / 1000).toFixed(1)}k`
          : count.toString()
        : null,
    };
  };

  // Navigate to summary when generation is complete
  /*** If user prefers to be redirected automatically,
   * then uncomment the router.push line below.
   */
  React.useEffect(() => {
    if (summary && !isGenerating && !error && hasGeneratedSummary) {
      // Show success notification before navigating
      toast.success("Summary ready, Click View summary button to view", {
        duration: 3000,
      });

      // Navigate to summary page when generation is successful
      // router.push(`/summaries/${summary.id}`);
    }
  }, [summary, isGenerating, error, router, hasGeneratedSummary]);

  // Show error notifications
  React.useEffect(() => {
    if (error && !isGenerating) {
      toast.error(`Summary generation failed: ${error.message}`);
    }
  }, [error, isGenerating]);

  // Handle add to favorites (placeholder for Phase 3)
  const handleAddToFavorites = () => {
    toast.info("Add to favorites functionality coming in Phase 3!");
  };

  const ratingInfo = formatRating(book.averageRating, book.ratingsCount);
  const publishedYear = formatDate(book.publishedDate);

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Hero Background Section */}
      <div className="relative">
        {/* Blurred Background */}
        {heroImage && (
          <div className="absolute inset-0 h-64 sm:h-80 md:h-96 overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center scale-120 filter blur-sm  opacity-80 dark:opacity-40"
              style={{ backgroundImage: `url(${heroImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/75 to-background" />
          </div>
        )}

        {/* Navigation */}
        <div className="relative z-10 p-4 sm:px-6 pt-16">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToSearch}
            className="mb-4 hover:bg-background/80 backdrop-blur-sm"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Button>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 px-4 sm:px-6 pb-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-start justify-center">
              {/* Book Cover */}
              <div className="flex-shrink-0">
                <BookCover
                  title={book.title}
                  authors={book.authors}
                  src={heroImage}
                  fallbackSrcs={
                    [
                      book.mediumThumbnail,
                      book.thumbnail,
                      book.smallThumbnail,
                    ].filter(Boolean) as string[]
                  }
                  size="hero"
                  priority
                  className="shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
                />
              </div>

              {/* Book Information */}
              <div className="flex-1 max-w-2xl text-center lg:text-left space-y-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight mb-3">
                    {book.title}
                  </h1>

                  {book.authors.length > 0 && (
                    <div className="flex items-center justify-center lg:justify-start gap-2 text-lg text-muted-foreground mb-4">
                      <Users className="h-4 w-4" />
                      <span>by {book.authors.join(", ")}</span>
                    </div>
                  )}

                  {/* Rating */}
                  {ratingInfo ? (
                    <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-5 w-5 transition-colors",
                              i < ratingInfo.fullStars
                                ? "text-yellow-500 fill-yellow-500"
                                : i === ratingInfo.fullStars &&
                                    ratingInfo.hasHalfStar
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-gray-300 dark:text-gray-600"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-base font-medium text-foreground">
                        {ratingInfo.rating}
                      </span>
                      {ratingInfo.count && (
                        <span className="text-sm text-muted-foreground">
                          ({ratingInfo.count} reviews)
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center lg:justify-start gap-2 mb-4 text-sm text-muted-foreground">
                      <Star className="h-4 w-4" />
                      <span>No ratings yet</span>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm text-muted-foreground">
                    {publishedYear && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{publishedYear}</span>
                      </div>
                    )}
                    {book.pageCount && (
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        <span>{book.pageCount} pages</span>
                      </div>
                    )}
                    {book.language && (
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <span>{book.language.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                  {/* Summary Generation */}
                  <Card className="backdrop-blur-sm bg-card/95">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Generate AI Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <SummaryTypeSelector
                        value={selectedSummaryType}
                        onValueChange={setSelectedSummaryType}
                        loading={isGenerating}
                        disabled={isGenerating || !canGenerate}
                      />

                      {!isGenerating && !error && summary && (
                        <Button
                          onClick={handleViewSummary}
                          disabled={!canGenerate}
                          className="w-full"
                          size="lg"
                        >
                          <BookOpenIcon className="h-4 w-4 mr-2" />
                          View Summary
                        </Button>
                      )}

                      {/* Show progress during generation */}
                      {isGenerating || error ? (
                        <SummaryGenerationProgress
                          isGenerating={isGenerating}
                          progress={progress}
                          estimatedTime={estimatedTime}
                          error={error}
                          canRetry={!isGenerating}
                          summaryType={selectedSummaryType}
                          onRetry={handleRetryGeneration}
                        />
                      ) : (
                        <Button
                          onClick={handleGenerateSummary}
                          disabled={!canGenerate}
                          className={cn("w-full", summary && "hidden")}
                          size="lg"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Summary
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {/* Secondary Actions */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleAddToFavorites}
                      className="flex-1"
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Add to Favorites
                    </Button>

                    {book.previewLink && (
                      <Button variant="outline" size="icon" asChild>
                        <Link
                          href={book.previewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="sr-only">Preview book</span>
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Information Section */}
      <div className="px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Description */}
          {book.description && (
            <Card>
              <CardHeader>
                <CardTitle>About This Book</CardTitle>
              </CardHeader>
              <CardContent>
                <BookDescription description={book.description} />
              </CardContent>
            </Card>
          )}

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle>Book Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {book.publisher && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground mb-1">
                      Publisher
                    </dt>
                    <dd className="text-sm">{book.publisher}</dd>
                  </div>
                )}

                {book.publishedDate && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground mb-1">
                      Published
                    </dt>
                    <dd className="text-sm">{book.publishedDate}</dd>
                  </div>
                )}

                {(book.isbn10 || book.isbn13) && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground mb-1">
                      ISBN
                    </dt>
                    <dd className="text-sm">
                      {book.isbn13 && `ISBN-13: ${book.isbn13}`}
                      {book.isbn10 && book.isbn13 && <br />}
                      {book.isbn10 && `ISBN-10: ${book.isbn10}`}
                    </dd>
                  </div>
                )}

                {book.categories && book.categories.length > 0 && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground mb-1">
                      Categories
                    </dt>
                    <dd className="text-sm">
                      <div className="flex flex-wrap gap-2">
                        {book.categories.map((category, index) => (
                          <span
                            key={index}
                            className="inline-block px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-md"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    </dd>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
