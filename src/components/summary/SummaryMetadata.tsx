"use client";

import React, { useState } from "react";
import { cn } from "../../lib/utils";
import {
  Sparkles,
  Clock,
  FileText,
  Zap,
  Calendar,
  ChevronDown,
  ChevronUp,
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
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

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
      {/* Summary Type and Description */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0 ring-1 ring-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {summaryTypeInfo.title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {summaryTypeInfo.description}
          </p>
        </div>
      </div>

      {/* Primary Metadata - Key reading information */}
      <div className="space-y-4">
        {/* Reading Time */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/20">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 shrink-0 ring-1 ring-blue-500/20">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Reading Time
            </p>
            <p className="text-xl font-bold text-foreground">
              {summary.readingTime}{" "}
              <span className="text-base font-medium text-muted-foreground">
                min
              </span>
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Status:
          </span>
          <div
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
              statusInfo.bgColor,
              statusInfo.color
            )}
          >
            {statusInfo.label}
          </div>
        </div>

        {/* Generated On */}
        <div className="flex items-start gap-3 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-muted-foreground">Generated on</p>
            <p className="text-foreground mt-0.5">
              {formatCreationDate(summary.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Technical Details - Collapsible Section */}
      <div className="border-t pt-4">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="flex items-center justify-between w-full text-left group hover:bg-muted/50 -mx-2 px-2 py-2 rounded-lg transition-colors"
        >
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
            Technical Details
          </span>
          {showTechnicalDetails ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          )}
        </button>

        {showTechnicalDetails && (
          <div className="mt-4 space-y-3 text-sm">
            {/* Word Count */}
            <div className="flex items-center justify-between py-2 border-b border-dashed">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Word Count</span>
              </div>
              <span className="font-medium text-foreground">
                {summary.wordCount.toLocaleString()}
              </span>
            </div>

            {/* AI Model */}
            <div className="flex items-center justify-between py-2 border-b border-dashed">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">AI Model</span>
              </div>
              <span className="font-medium text-foreground font-mono text-xs">
                {summary.aiModel}
              </span>
            </div>

            {/* Generation Time */}
            {summary.generationTime && (
              <div className="flex items-center justify-between py-2 border-b border-dashed">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Generation Time</span>
                </div>
                <span className="font-medium text-foreground">
                  {formatGenerationTime(summary.generationTime)}
                </span>
              </div>
            )}

            {/* Prompt Version */}
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Prompt Version</span>
              <span className="font-medium text-foreground font-mono text-xs">
                {summary.promptVersion}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
