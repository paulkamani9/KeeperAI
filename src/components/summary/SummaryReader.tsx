"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import { Card, CardContent } from "../ui/card";
import type { SummaryType } from "../../types/summary";

interface SummaryReaderProps {
  /** Summary content in markdown format */
  content: string;
  /** Type of summary for styling context */
  summaryType: SummaryType;
  /** Word count for reading analytics */
  wordCount: number;
  /** Estimated reading time in minutes */
  readingTime: number;
  /** Custom className for styling */
  className?: string;
}

/**
 * SummaryReader - Premium typography component for reading AI summaries
 *
 * Features:
 * - Optimized typography with 65ch max-width for readability
 * - Premium line height and spacing (1.7 line-height)
 * - Accessible font scaling and contrast
 * - Dark/light mode support
 * - Print-friendly styles
 * - Semantic HTML markup for screen readers
 * - Focus management for keyboard navigation
 * - Responsive design with comfortable margins
 *
 * Typography Guidelines:
 * - Max-width: 65ch (optimal reading line length)
 * - Line height: 1.7 (comfortable reading)
 * - Font size: 16px base with responsive scaling
 * - Margins: Generous spacing between elements
 * - Headings: Clear hierarchy with proper contrast
 */
export function SummaryReader({
  content,
  summaryType,
  wordCount,
  readingTime,
  className,
}: SummaryReaderProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Process markdown content into HTML
  // For now, using simple text processing - in a full implementation,
  // you might want to use a markdown parser like react-markdown
  const processMarkdown = (markdown: string) => {
    return markdown
      .split("\n")
      .map((line, index) => {
        // Handle headings (line by line)
        if (line.startsWith("# ")) {
          return (
            <h1
              key={index}
              className="text-3xl font-bold text-foreground mb-6 mt-8 first:mt-0"
            >
              {line.substring(2)}
            </h1>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h2
              key={index}
              className="text-2xl font-semibold text-foreground mb-4 mt-7"
            >
              {line.substring(3)}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3
              key={index}
              className="text-xl font-semibold text-foreground mb-3 mt-6"
            >
              {line.substring(4)}
            </h3>
          );
        }

        // Handle bullet points
        if (line.startsWith("- ")) {
          return (
            <li key={index} className="mb-2 list-disc ml-4">
              {line.substring(2)}
            </li>
          );
        }

        // Handle regular paragraphs (non-empty lines)
        if (line.trim()) {
          return (
            <p key={index} className="text-foreground mb-6 leading-relaxed">
              {line}
            </p>
          );
        }

        return null;
      })
      .filter(Boolean);
  };

  const processedContent = processMarkdown(content);

  // Focus management for accessibility
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.focus({ preventScroll: true });
    }
  }, [content]);

  return (
    <Card className={cn("print:shadow-none print:border-none", className)}>
      <CardContent className="pt-8 pb-12">
        {/* Reading Container with Optimal Typography */}
        <article
          ref={contentRef}
          tabIndex={-1}
          className={cn(
            // Container and layout
            "mx-auto max-w-none", // Allow full width on container
            "prose prose-lg dark:prose-invert", // Base prose styles
            "focus:outline-none",

            // Typography optimization for reading
            "[&>*]:max-w-[65ch]", // Optimal line length for readability
            "[&>*]:mx-auto", // Center content blocks

            // Text sizing and spacing
            "text-base sm:text-lg", // Responsive font size
            "leading-relaxed", // 1.625 line height
            "[&>p]:leading-[1.7]", // Optimal paragraph line height
            "[&>li]:leading-[1.7]", // Consistent list item spacing

            // Spacing between elements
            "[&>*+*]:mt-6", // Consistent vertical rhythm
            "[&>h1+*]:mt-8", // More space after main headings
            "[&>h2+*]:mt-6", // Balanced space after section headings
            "[&>h3+*]:mt-4", // Tighter space after sub-headings

            // Heading styles
            "[&>h1]:text-2xl [&>h1]:sm:text-3xl [&>h1]:font-bold [&>h1]:text-foreground",
            "[&>h2]:text-xl [&>h2]:sm:text-2xl [&>h2]:font-semibold [&>h2]:text-foreground",
            "[&>h3]:text-lg [&>h3]:sm:text-xl [&>h3]:font-medium [&>h3]:text-foreground",

            // Paragraph and text styles
            "[&>p]:text-foreground [&>p]:text-base [&>p]:sm:text-lg",
            "[&>li]:text-foreground [&>li]:text-base [&>li]:sm:text-lg",

            // List styles
            "[&>ul]:pl-6 [&>ul]:list-disc",
            "[&>ol]:pl-6 [&>ol]:list-decimal",
            "[&>ul>li]:mb-3 [&>ol>li]:mb-3",

            // Link styles (if any)
            "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
            "[&_a]:hover:text-primary/80 [&_a]:transition-colors",

            // Print optimizations
            "print:text-black print:bg-white",
            "print:[&>*]:max-w-none", // Full width for print
            "print:text-sm print:leading-normal"
          )}
          role="main"
          aria-label={`${summaryType} summary content, estimated ${readingTime} minute read`}
        >
          {/* Screen reader information */}
          <div className="sr-only">
            <h1>Summary Content</h1>
            <p>
              This is a {summaryType} summary with approximately {wordCount}{" "}
              words, estimated to take {readingTime} minutes to read.
            </p>
          </div>

          {/* Processed content */}
          {processedContent}
        </article>

        {/* Reading completion indicator (hidden for now, placeholder for future) */}
        <div className="hidden mt-12 pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground">
            You've finished reading this summary
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
