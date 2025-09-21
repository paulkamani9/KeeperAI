"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useConvex } from "convex/react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../convex/_generated/api";
import { cn } from "../lib/utils";
import { SummaryHeader } from "../components/summary/SummaryHeader";
import { SummaryReader } from "../components/summary/SummaryReader";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Loader2, AlertCircle, BookOpen } from "lucide-react";
import type { Summary } from "../types/summary";

interface SummaryReadingViewProps {
  /** ID of the summary to display */
  summaryId: string;
  /** Custom className for styling */
  className?: string;
}

/**
 * SummaryReadingView - Premium reading experience for AI-generated summaries
 *
 * Features:
 * - Immersive typography optimized for reading
 * - Sticky navigation header with actions
 * - Reading progress tracking
 * - Accessible design with semantic markup
 * - Loading and error states
 * - SEO optimized with proper metadata
 */
export function SummaryReadingView({
  summaryId,
  className,
}: SummaryReadingViewProps) {
  const router = useRouter();
  const convex = useConvex();

  // Fetch summary data from Convex
  const {
    data: summary,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["summary", summaryId],
    queryFn: async (): Promise<Summary | null> => {
      try {
        // Query the summary by ID from Convex
        const result = await convex.query(api.summaries.getSummaryById, {
          summaryId: summaryId, // Pass as string, the function will validate
        });

        if (
          !result ||
          !("bookId" in result) ||
          !("summaryType" in result) ||
          !("content" in result) ||
          !("status" in result) ||
          !("wordCount" in result) ||
          !("readingTime" in result) ||
          !("aiModel" in result) ||
          !("promptVersion" in result) ||
          !("createdAt" in result) ||
          !("updatedAt" in result)
        ) {
          return null;
        }

        // Convert Convex result to our Summary type
        return {
          id: String(result._id),
          bookId: result.bookId as string,
          summaryType: result.summaryType as any,
          content: result.content as string,
          status: result.status as any,
          generationTime: result.generationTime as number | undefined,
          wordCount: result.wordCount as number,
          readingTime: result.readingTime as number,
          aiModel: result.aiModel as string,
          promptVersion: result.promptVersion as string,
          errorMessage: result.errorMessage as string | undefined,
          metadata: result.metadata as any,
          createdAt: new Date(result.createdAt as number),
          updatedAt: new Date(result.updatedAt as number),
        };
      } catch (error) {
        console.error("Failed to fetch summary:", error);
        throw new Error("Failed to load summary");
      }
    },
    enabled: !!summaryId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Handle navigation back to book
  const handleBackToBook = () => {
    if (summary?.bookId) {
      router.push(`/book/${summary.bookId}`);
    } else {
      router.back();
    }
  };

  // Handle retry on error
  const handleRetry = () => {
    refetch();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("min-h-screen bg-background", className)}>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Loading Summary</h2>
                <p className="text-muted-foreground">
                  Retrieving your summary content...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !summary) {
    return (
      <div className={cn("min-h-screen bg-background", className)}>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold">Summary Not Found</h2>
                    <p className="text-muted-foreground">
                      We couldn't find the summary you're looking for. It may
                      have been removed or the link is invalid.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={handleRetry} variant="outline">
                      Try Again
                    </Button>
                    <Button
                      onClick={() => router.push("/")}
                      className="min-w-[120px]"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Browse Books
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Fixed Summary Header - positioned beneath global navbar */}
      <SummaryHeader
        summary={summary}
        onBackToBook={handleBackToBook}
        className="fixed top-[60px] left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b"
      />

      {/* Main Reading Content - account for both navbar heights */}
      <main className="container mx-auto px-4 pt-[136px] pb-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Summary Content */}
          <SummaryReader
            content={summary.content}
            summaryType={summary.summaryType}
            wordCount={summary.wordCount}
            readingTime={summary.readingTime}
          />
        </div>
      </main>
    </div>
  );
}
