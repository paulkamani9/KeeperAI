"use client";

import React, { useState, useEffect } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { SummaryActions } from "./SummaryActions";
import { SummaryMetadata } from "./SummaryMetadata";
import { ChevronLeft, BookOpen, Clock, Calendar, Info } from "lucide-react";
import type { Summary } from "../../types/summary";

interface SummaryHeaderProps {
  /** Summary data */
  summary: Summary;
  /** Current reading progress (0-100) */
  readingProgress?: number;
  /** Callback when back to book is clicked */
  onBackToBook: () => void;
  /** Custom className for styling */
  className?: string;
}

/**
 * SummaryHeader - Sticky navigation header for summary reading
 *
 * Features:
 * - Sticky positioning during reading
 * - Back to book navigation
 * - Summary type and timing info
 * - Action buttons (share, print, save)
 * - Reading progress (placeholder for future)
 * - Responsive design with mobile-first approach
 * - Accessible with proper ARIA labels
 */
export function SummaryHeader({
  summary,
  readingProgress = 0,
  onBackToBook,
  className,
}: SummaryHeaderProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  // Handle back button on mobile to close sheet
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (sheetOpen) {
        event.preventDefault();
        setSheetOpen(false);
        // Push the current state back to prevent navigation
        window.history.pushState(null, "", window.location.href);
      }
    };

    if (sheetOpen) {
      // Add a history entry when sheet opens
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", handlePopState);
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [sheetOpen]);

  // Format creation date for display
  const formatCreationDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  // Get summary type description
  const getSummaryTypeLabel = (type: string) => {
    const typeLabels = {
      concise: "Concise Summary",
      detailed: "Detailed Breakdown",
      analysis: "Critical Analysis",
      practical: "Practical Takeaways",
    };
    return typeLabels[type as keyof typeof typeLabels] || "Summary";
  };

  return (
    <header
      className={cn(
        "border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 transition-all duration-200",
        className
      )}
    >
      <div className="container mx-auto px-4">
        {/* Main Header Row */}
        <div className="flex h-14 md:h-16 items-center justify-between gap-3">
          {/* Left Section - Navigation */}
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToBook}
              className="shrink-0 hover:bg-accent h-8 md:h-9 px-2 md:px-3"
              aria-label="Back to book details"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden md:inline-block ml-1.5">Back</span>
            </Button>

            {/* Vertical Divider */}
            <div className="h-6 w-px bg-border/60 hidden sm:block" />

            {/* Summary Info */}
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              {/* Book Icon */}
              <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-md bg-primary/10 shrink-0 ring-1 ring-primary/20">
                <BookOpen className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
              </div>

              {/* Summary Details - Desktop */}
              <div className="min-w-0 hidden xl:flex flex-col">
                <h1 className="text-sm font-semibold text-foreground truncate leading-tight">
                  {getSummaryTypeLabel(summary.summaryType)}
                </h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{summary.readingTime} min</span>
                  </div>
                  <span className="text-muted-foreground/50">•</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatCreationDate(summary.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Summary Type Badge - Mobile/Tablet */}
              <div className="xl:hidden flex items-center gap-1.5 min-w-0">
                <span className="text-xs md:text-sm font-medium text-foreground truncate">
                  {getSummaryTypeLabel(summary.summaryType)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            {/* Reading Progress - Desktop */}
            <div className="hidden lg:flex items-center gap-3 mr-2">
              <div className="text-xs font-medium text-muted-foreground tabular-nums">
                {readingProgress}%
              </div>
              <div className="w-20 h-1.5 bg-muted/60 rounded-full overflow-hidden ring-1 ring-muted">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${readingProgress}%` }}
                  role="progressbar"
                  aria-valuenow={readingProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <SummaryActions summary={summary} />

            {/* Summary Info Sheet - Moved to end */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 hover:bg-accent h-8 w-8 p-0 md:h-9 md:w-9"
                  aria-label="Summary information"
                  onClick={() => setSheetOpen(true)}
                >
                  <Info className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[90vw] sm:w-[85vw] md:max-w-lg lg:max-w-xl overflow-y-auto p-0"
              >
                {/* Book Title Header */}
                <SheetHeader className="px-6 py-5 border-b bg-muted/30">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shrink-0 ring-1 ring-primary/20 shadow-sm">
                      <BookOpen className="h-7 w-7 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 py-1">
                      {summary.bookTitle ? (
                        <>
                          <SheetTitle className="text-xl font-bold text-foreground leading-tight text-left mb-1.5">
                            {summary.bookTitle}
                          </SheetTitle>
                          {summary.bookAuthors &&
                            summary.bookAuthors.length > 0 && (
                              <p className="text-sm text-muted-foreground font-medium">
                                by {summary.bookAuthors.join(", ")}
                              </p>
                            )}
                        </>
                      ) : (
                        <SheetTitle className="text-xl font-bold text-foreground leading-tight text-left">
                          {getSummaryTypeLabel(summary.summaryType)}
                        </SheetTitle>
                      )}
                    </div>
                  </div>
                </SheetHeader>

                {/* SummaryMetadata inside the sheet */}
                <div className="px-6 py-5">
                  <SummaryMetadata summary={summary} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile Summary Info Bar */}
        <div className="lg:hidden pb-2.5 border-t border-border/40">
          <div className="flex items-center justify-between pt-2.5">
            {/* Reading Time */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-medium">
                  {summary.readingTime} min read
                </span>
              </div>
              <span className="text-muted-foreground/40">•</span>
              <span>{formatCreationDate(summary.createdAt)}</span>
            </div>

            {/* Mobile Progress */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {readingProgress}%
              </span>
              <div className="w-16 h-1.5 bg-muted/60 rounded-full overflow-hidden ring-1 ring-muted">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${readingProgress}%` }}
                  role="progressbar"
                  aria-valuenow={readingProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
