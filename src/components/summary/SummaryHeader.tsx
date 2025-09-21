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
        "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left Section - Navigation */}
          <div className="flex items-center space-x-4">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToBook}
              className="shrink-0 hover:bg-accent"
              aria-label="Back to book details"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline-block ml-2">Back to Book</span>
            </Button>

            {/* Vertical Divider */}
            <div className="h-6 w-px bg-border hidden sm:block" />

            {/* Summary Info */}
            <div className="flex items-center space-x-3 min-w-0">
              {/* Book Icon */}
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>

              {/* Summary Details */}
              <div className="min-w-0 hidden sm:block">
                <div className="flex items-center space-x-2">
                  <h1 className="text-sm font-medium text-foreground truncate">
                    {getSummaryTypeLabel(summary.summaryType)}
                  </h1>
                  {/* Summary metadata */}
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{summary.readingTime} min read</span>
                    <span>•</span>
                    <Calendar className="h-3 w-3" />
                    <span>{formatCreationDate(summary.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-2">
            {/* Reading Progress */}
            <div className="hidden md:flex items-center space-x-3 mr-4">
              <div className="text-xs text-muted-foreground">
                Progress: {readingProgress}%
              </div>
              <div className="w-16 h-1 bg-muted rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${readingProgress}%` }}
                />
              </div>
            </div>

            {/* Summary Info Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 hover:bg-accent h-8 w-8 p-0"
                  aria-label="Summary information"
                  onClick={() => setSheetOpen(true)}
                >
                  <Info className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[90vw] sm:w-[85vw] md:max-w-lg lg:max-w-xl overflow-y-auto p-0 pb-2"
              >
                <SheetHeader className="px-6 py-4 border-b">
                  <SheetTitle className="flex items-center space-x-2 text-base">
                    <Info className="h-5 w-5" />
                    <span>Summary Information</span>
                  </SheetTitle>
                </SheetHeader>

                {/* SummaryMetadata inside the sheet */}
                <div className="px-6 py-4">
                  <SummaryMetadata summary={summary} />
                </div>
              </SheetContent>
            </Sheet>

            {/* Action Buttons */}
            <SummaryActions summary={summary} />
          </div>
        </div>

        {/* Mobile Summary Info */}
        <div className="sm:hidden pb-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-medium text-foreground">
                {getSummaryTypeLabel(summary.summaryType)}
              </h1>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                <span>{summary.readingTime} min read</span>
                <span>•</span>
                <span>{formatCreationDate(summary.createdAt)}</span>
              </div>
            </div>

            {/* Mobile Progress */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">
                {readingProgress}%
              </span>
              <div className="w-12 h-1 bg-muted rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${readingProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
