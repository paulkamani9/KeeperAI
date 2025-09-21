"use client";

import React from "react";
import { cn } from "../../lib/utils";
import {
  Sparkles,
  Clock,
  FileText,
  Zap,
  Calendar,
  BookOpen,
} from "lucide-react";
import { getSummaryTypeDescription } from "../../types/summary";
import type { Summary } from "../../types/summary";

interface SummaryMetadataProps {
  /** Summary data */
  summary: Summary;
  /** Custom className for styling */
  className?: string;
}

/**
 * SummaryMetadata - Display summary metadata and context
 *
 * Features:
 * - Summary type with icon and description
 * - Reading time estimate and word count
 * - Generation timestamp and AI model info
 * - Book context information (placeholder for book data)
 * - Accessible with semantic markup and ARIA labels
 * - Clean, card-based design following design system
 */
export function SummaryMetadata({ summary, className }: SummaryMetadataProps) {
  // Format creation date for display
  const formatCreationDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Format generation time
  const formatGenerationTime = (timeMs?: number) => {
    if (!timeMs) return "Unknown";
    const seconds = Math.round(timeMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  };

  // Get summary type info
  const summaryTypeInfo = getSummaryTypeDescription(summary.summaryType);

  // Get status display info
  const getStatusInfo = (status: string) => {
    const statusMap = {
      pending: {
        label: "Pending",
        color: "text-yellow-600",
        bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
      },
      generating: {
        label: "Generating",
        color: "text-blue-600",
        bgColor: "bg-blue-100 dark:bg-blue-900/20",
      },
      completed: {
        label: "Completed",
        color: "text-green-600",
        bgColor: "bg-green-100 dark:bg-green-900/20",
      },
      failed: {
        label: "Failed",
        color: "text-red-600",
        bgColor: "bg-red-100 dark:bg-red-900/20",
      },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  const statusInfo = getStatusInfo(summary.status);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Type and Status */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">
              {summaryTypeInfo.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {summaryTypeInfo.description}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium w-fit",
            statusInfo.bgColor,
            statusInfo.color
          )}
        >
          {statusInfo.label}
        </div>
      </div>

      {/* Metadata Grid - Responsive for sheet container */}
      <div className="grid grid-cols-1 gap-4">
        {/* Reading Time */}
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/20">
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Reading Time</p>
            <p className="text-sm text-muted-foreground">
              {summary.readingTime} minutes
            </p>
          </div>
        </div>

        {/* Word Count */}
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/20">
            <FileText className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Word Count</p>
            <p className="text-sm text-muted-foreground">
              {summary.wordCount.toLocaleString()} words
            </p>
          </div>
        </div>

        {/* Generation Time */}
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/20">
            <Zap className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Generated In</p>
            <p className="text-sm text-muted-foreground">
              {formatGenerationTime(summary.generationTime)}
            </p>
          </div>
        </div>

        {/* AI Model */}
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-100 dark:bg-orange-900/20">
            <Sparkles className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">AI Model</p>
            <p className="text-sm text-muted-foreground">{summary.aiModel}</p>
          </div>
        </div>
      </div>

      {/* Generation Details */}
      <div className="border-t pt-4">
        <div className="flex items-start space-x-3">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Generated On</p>
            <p className="text-sm text-muted-foreground">
              {formatCreationDate(summary.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Book Context (Placeholder for future book data integration) */}
      <div className="border-t pt-4">
        <div className="flex items-start space-x-3">
          <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Book Context</p>
            <p className="text-sm text-muted-foreground">
              Book ID: {summary.bookId}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Book details integration will be completed in Phase 3
            </p>
          </div>
        </div>
      </div>

      {/* Additional Metadata (if available) */}
      {summary.metadata && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-foreground mb-3">
            Technical Details
          </h3>
          <div className="grid grid-cols-1 gap-3 text-xs">
            <div>
              <span className="font-medium text-muted-foreground">
                Data Source:
              </span>
              <span className="ml-2 capitalize">
                {summary.metadata.bookDataSource.replace("-", " ")}
              </span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">
                Had Description:
              </span>
              <span className="ml-2">
                {summary.metadata.hadBookDescription ? "Yes" : "No"}
              </span>
            </div>
            {summary.metadata.promptTokens && (
              <div>
                <span className="font-medium text-muted-foreground">
                  Prompt Tokens:
                </span>
                <span className="ml-2">
                  {summary.metadata.promptTokens.toLocaleString()}
                </span>
              </div>
            )}
            {summary.metadata.completionTokens && (
              <div>
                <span className="font-medium text-muted-foreground">
                  Completion Tokens:
                </span>
                <span className="ml-2">
                  {summary.metadata.completionTokens.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
