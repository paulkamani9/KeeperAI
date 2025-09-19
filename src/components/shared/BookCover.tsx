"use client";

import React from "react";
import Image from "next/image";
import { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Book, BookOpen } from "lucide-react";

interface BookCoverProps {
  /** Book title for accessibility and fallback display */
  title: string;
  /** Authors list for accessibility */
  authors?: string[];
  /** Primary cover image URL */
  src?: string;
  /** Alternative image URLs to try if primary fails */
  fallbackSrcs?: string[];
  /** Size variant of the book cover */
  size?: "small" | "medium" | "large" | "hero";
  /** Custom className for additional styling */
  className?: string;
  /** Loading state - shows skeleton */
  loading?: boolean;
  /** Click handler for interactive covers */
  onClick?: () => void;
  /** Whether the cover should be clickable */
  clickable?: boolean;
  /** Custom aspect ratio override */
  aspectRatio?: number;
  /** Priority loading for above-the-fold images */
  priority?: boolean;
}

/**
 * Size configuration for different book cover variants
 */
const sizeConfig = {
  small: {
    width: "w-16 sm:w-20", // 64px -> 80px
    height: "h-24 sm:h-30", // 96px -> 120px
    className: "rounded-md shadow-sm",
  },
  medium: {
    width: "w-24 sm:w-32", // 96px -> 128px
    height: "h-36 sm:h-48", // 144px -> 192px
    className: "rounded-lg shadow-md",
  },
  large: {
    width: "w-32 sm:w-40 md:w-48", // 128px -> 160px -> 192px
    height: "h-48 sm:h-60 md:h-72", // 192px -> 240px -> 288px
    className: "rounded-lg shadow-lg",
  },
  hero: {
    width: "w-48 sm:w-56 md:w-64 lg:w-72", // 192px -> 224px -> 256px -> 288px
    height: "h-72 sm:h-84 md:h-96 lg:h-108", // 288px -> 336px -> 384px -> 432px
    className: "rounded-xl shadow-2xl",
  },
} as const;

/**
 * BookCover Component - Reusable book cover with multiple size variants
 *
 * Features:
 * - Multiple size variants (small, medium, large, hero)
 * - Fallback image handling with graceful degradation
 * - Loading skeleton states
 * - Next.js Image optimization
 * - Accessibility with proper alt text
 * - Click interactions with hover states
 * - Responsive sizing across breakpoints
 */
export const BookCover = forwardRef<HTMLDivElement, BookCoverProps>(
  (
    {
      title,
      authors = [],
      src,
      fallbackSrcs = [],
      size = "medium",
      className,
      loading = false,
      onClick,
      clickable = false,
      aspectRatio = 0.67, // Standard book aspect ratio (2:3)
      priority = false,
    },
    ref
  ) => {
    const [currentSrcIndex, setCurrentSrcIndex] = useState(0);
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    // Prepare all possible image sources
    const allSrcs = [src, ...fallbackSrcs].filter(Boolean) as string[];
    const currentSrc = allSrcs[currentSrcIndex];
    const hasImage = allSrcs.length > 0 && !imageError && currentSrc;

    // Get size configuration
    const config = sizeConfig[size];

    // Create alt text for accessibility
    const altText = `Cover of "${title}"${authors.length > 0 ? ` by ${authors.join(", ")}` : ""}`;

    // Handle image load error - try next fallback
    const handleImageError = () => {
      if (currentSrcIndex < allSrcs.length - 1) {
        setCurrentSrcIndex(currentSrcIndex + 1);
        setImageLoading(true);
      } else {
        setImageError(true);
        setImageLoading(false);
      }
    };

    // Handle successful image load
    const handleImageLoad = () => {
      setImageLoading(false);
    };

    // Base container classes
    const containerClasses = cn(
      // Size classes
      config.width,
      config.height,
      config.className,
      // Interactive classes
      clickable && "cursor-pointer transition-transform hover:scale-105",
      clickable &&
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
      // Layout classes
      "relative overflow-hidden bg-gray-100 dark:bg-gray-800",
      "flex items-center justify-center",
      // Custom classes
      className
    );

    // Loading skeleton
    if (loading) {
      return (
        <div
          ref={ref}
          className={containerClasses}
          data-testid="book-cover-loading"
        >
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 w-full h-full rounded-inherit" />
        </div>
      );
    }

    // Fallback content when no image is available or loading failed
    const FallbackContent = () => (
      <div className="flex flex-col items-center justify-center text-center p-2 space-y-1">
        <BookOpen
          className={cn(
            "text-gray-400 dark:text-gray-500",
            size === "small" && "w-4 h-4",
            size === "medium" && "w-6 h-6",
            size === "large" && "w-8 h-8",
            size === "hero" && "w-10 h-10"
          )}
        />
        <div
          className={cn(
            "text-gray-600 dark:text-gray-400 leading-tight",
            size === "small" && "text-xs",
            size === "medium" && "text-xs",
            size === "large" && "text-sm",
            size === "hero" && "text-sm"
          )}
        >
          <div className="font-medium line-clamp-2 mb-1">{title}</div>
          {authors.length > 0 && (
            <div className="text-xs opacity-75 line-clamp-1">{authors[0]}</div>
          )}
        </div>
      </div>
    );

    return (
      <div
        ref={ref}
        className={containerClasses}
        data-testid="book-cover-container"
        onClick={clickable ? onClick : undefined}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        tabIndex={clickable ? 0 : undefined}
        role={clickable ? "button" : undefined}
        aria-label={clickable ? `View details for ${title}` : undefined}
      >
        {hasImage && currentSrc ? (
          <>
            <Image
              src={currentSrc}
              alt={altText}
              fill
              className={cn(
                "object-cover transition-opacity duration-200",
                imageLoading && "opacity-0"
              )}
              onError={handleImageError}
              onLoad={handleImageLoad}
              priority={priority}
              sizes={`
                (max-width: 640px) ${size === "small" ? "64px" : size === "medium" ? "96px" : size === "large" ? "128px" : "192px"},
                (max-width: 768px) ${size === "small" ? "80px" : size === "medium" ? "128px" : size === "large" ? "160px" : "224px"},
                (max-width: 1024px) ${size === "small" ? "80px" : size === "medium" ? "128px" : size === "large" ? "192px" : "256px"},
                ${size === "small" ? "80px" : size === "medium" ? "128px" : size === "large" ? "192px" : "288px"}
              `}
            />
            {/* Loading overlay */}
            {imageLoading && (
              <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 animate-pulse" />
            )}
          </>
        ) : (
          <FallbackContent />
        )}
      </div>
    );
  }
);

BookCover.displayName = "BookCover";

/**
 * BookCoverSkeleton - Loading skeleton for book covers
 */
export const BookCoverSkeleton = ({
  size = "medium",
  className,
}: {
  size?: BookCoverProps["size"];
  className?: string;
}) => {
  const config = sizeConfig[size!];

  return (
    <div
      className={cn(
        config.width,
        config.height,
        config.className,
        "bg-gray-100 dark:bg-gray-800 animate-pulse",
        className
      )}
      data-testid="book-cover-skeleton"
    />
  );
};

// Export types for external use
export type { BookCoverProps };
