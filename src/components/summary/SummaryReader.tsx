"use client";

import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkSmartypants from "remark-smartypants";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { cn } from "../../lib/utils";
import { Card, CardContent } from "../ui/card";
import { useReadingProgress } from "../../hooks/useReadingProgress";
import type { SummaryType } from "../../types/summary";

// Import highlight.js CSS for code syntax highlighting
// Note: We'll use CSS variables to handle dark/light theme switching
import "highlight.js/styles/github.css";

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
  /** Optional callback for progress updates */
  onProgressChange?: (progress: number) => void;
}

/**
 * SummaryReader - Premium typography component for reading AI summaries
 *
 * Features:
 * - ReactMarkdown with premium plugins for enhanced typography
 * - GitHub Flavored Markdown support (tables, strikethrough, etc.)
 * - Smart typography with proper quotes, dashes, and ellipses
 * - Syntax-highlighted code blocks with rehype-highlight
 * - Linkable headings with automatic anchors
 * - Scroll-based reading progress tracking (reports to parent via callback)
 * - Optimized typography with 65ch max-width for readability
 * - Premium line height and spacing (1.7 line-height)
 * - Accessible font scaling and contrast
 * - Dark/light mode support with proper code highlighting
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
  onProgressChange,
}: SummaryReaderProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Set up reading progress tracking (reports to parent only)
  // Account for fixed header heights: mobile 180px, desktop (sm+) 136px
  const { progress } = useReadingProgress({
    containerRef: contentRef as React.RefObject<HTMLElement>,
    threshold: 0.3,
    rootMargin: "-10% 0px -80% 0px",
    headerOffset: {
      mobile: 180, // pt-[180px] on mobile
      desktop: 136, // sm:pt-[136px] on desktop
    },
  });

  // Notify parent of progress changes
  useEffect(() => {
    if (onProgressChange) {
      onProgressChange(progress);
    }
  }, [progress, onProgressChange]);

  // Focus management for accessibility
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.focus({ preventScroll: true });
    }
  }, [content]);

  // Custom components for ReactMarkdown
  const markdownComponents = {
    // Enhanced headings with better spacing and linkable anchors
    h1: ({ children, id, ...props }: any) => (
      <h1
        id={id}
        className={cn(
          "text-2xl sm:text-3xl font-bold text-foreground",
          "mb-6 mt-8 first:mt-0",
          "scroll-mt-24", // Account for sticky header
          "group relative"
        )}
        {...props}
      >
        {children}
        {id && (
          <a
            href={`#${id}`}
            className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
            aria-label={`Link to ${children}`}
          >
            #
          </a>
        )}
      </h1>
    ),
    h2: ({ children, id, ...props }: any) => (
      <h2
        id={id}
        className={cn(
          "text-xl sm:text-2xl font-semibold text-foreground",
          "mb-4 mt-7",
          "scroll-mt-24",
          "group relative"
        )}
        {...props}
      >
        {children}
        {id && (
          <a
            href={`#${id}`}
            className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
            aria-label={`Link to ${children}`}
          >
            #
          </a>
        )}
      </h2>
    ),
    h3: ({ children, id, ...props }: any) => (
      <h3
        id={id}
        className={cn(
          "text-lg sm:text-xl font-medium text-foreground",
          "mb-3 mt-6",
          "scroll-mt-24",
          "group relative"
        )}
        {...props}
      >
        {children}
        {id && (
          <a
            href={`#${id}`}
            className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
            aria-label={`Link to ${children}`}
          >
            #
          </a>
        )}
      </h3>
    ),
    // Enhanced paragraphs with optimal reading properties
    p: ({ children, ...props }: any) => (
      <p
        className={cn(
          "text-foreground text-base sm:text-lg",
          "mb-6 leading-[1.7]",
          "max-w-[65ch]"
        )}
        {...props}
      >
        {children}
      </p>
    ),
    // Enhanced lists with proper spacing
    ul: ({ children, ...props }: any) => (
      <ul className="pl-6 mb-6 space-y-3 list-disc max-w-[65ch]" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol className="pl-6 mb-6 space-y-3 list-decimal max-w-[65ch]" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }: any) => (
      <li
        className="text-foreground text-base sm:text-lg leading-[1.7]"
        {...props}
      >
        {children}
      </li>
    ),
    // Enhanced code blocks with syntax highlighting
    pre: ({ children, ...props }: any) => (
      <pre
        className={cn(
          "bg-muted/50 rounded-lg p-4 mb-6 overflow-x-auto",
          "border border-border",
          "text-sm font-mono",
          "max-w-[65ch]",
          // Dark mode specific styles
          "dark:bg-gray-900 dark:border-gray-700"
        )}
        {...props}
      >
        {children}
      </pre>
    ),
    code: ({ inline, children, ...props }: any) => (
      <code
        className={cn(
          inline
            ? "bg-muted/50 px-1.5 py-0.5 rounded text-sm font-mono"
            : "block",
          "text-foreground"
        )}
        {...props}
      >
        {children}
      </code>
    ),
    // Enhanced blockquotes
    blockquote: ({ children, ...props }: any) => (
      <blockquote
        className={cn(
          "border-l-4 border-primary/30 pl-6 py-2 mb-6",
          "text-muted-foreground italic",
          "max-w-[65ch]"
        )}
        {...props}
      >
        {children}
      </blockquote>
    ),
    // Enhanced tables
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto mb-6 max-w-[65ch]">
        <table
          className="min-w-full border-collapse border border-border"
          {...props}
        >
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...props }: any) => (
      <th
        className="border border-border bg-muted/50 px-4 py-2 text-left font-semibold text-foreground"
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }: any) => (
      <td className="border border-border px-4 py-2 text-foreground" {...props}>
        {children}
      </td>
    ),
    // Enhanced links
    a: ({ children, href, ...props }: any) => (
      <a
        href={href}
        className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        target={href?.startsWith("http") ? "_blank" : undefined}
        rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
        {...props}
      >
        {children}
      </a>
    ),
  };

  return (
    <Card className={cn("print:shadow-none print:border-none", className)}>
      <CardContent className="pt-8 pb-12">
        {/* Reading Container with Premium Typography */}
        <article
          ref={contentRef}
          tabIndex={-1}
          className={cn(
            // Container and layout
            "mx-auto max-w-none", // Allow full width on container
            "focus:outline-none",

            // Typography optimization for reading
            "prose prose-lg dark:prose-invert", // Base prose styles

            // Override prose styles for our custom components
            "prose-headings:scroll-mt-24",
            "prose-p:max-w-[65ch] prose-p:mx-auto",
            "prose-ul:max-w-[65ch] prose-ul:mx-auto",
            "prose-ol:max-w-[65ch] prose-ol:mx-auto",
            "prose-blockquote:max-w-[65ch] prose-blockquote:mx-auto",
            "prose-pre:max-w-[65ch] prose-pre:mx-auto",

            // Print optimizations
            "print:text-black print:bg-white",
            "print:prose-headings:text-black print:prose-p:text-black",
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

          {/* ReactMarkdown with premium plugins and components */}
          <ReactMarkdown
            components={markdownComponents}
            remarkPlugins={[
              remarkGfm,
              [
                remarkSmartypants,
                {
                  quotes: true,
                  ellipses: true,
                  backticks: true,
                  dashes: true,
                },
              ],
            ]}
            rehypePlugins={[
              rehypeHighlight,
              rehypeSlug,
              [
                rehypeAutolinkHeadings,
                {
                  behavior: "append",
                  properties: {
                    className: [
                      "ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary",
                    ],
                    ariaLabel: "Link to heading",
                  },
                },
              ],
            ]}
          >
            {content}
          </ReactMarkdown>
        </article>

        {/* Reading completion indicator */}
        {progress >= 95 && (
          <div className="mt-12 pt-8 border-t text-center animate-in fade-in-50 duration-500">
            <p className="text-sm text-muted-foreground">
              🎉 You&apos;ve finished reading this summary
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
