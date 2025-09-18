"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2, Mic, Image } from "lucide-react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Validation schema for search queries
const searchQuerySchema = z
  .string()
  .min(1, "Search query cannot be empty")
  .max(200, "Search query must be 200 characters or less")
  .trim();

interface SearchInputProps {
  /**
   * Initial value for the search input
   */
  defaultValue?: string;
  /**
   * Placeholder text for the input
   */
  placeholder?: string;
  /**
   * Whether to show the search input in a compact form (for headers)
   */
  variant?: "default" | "compact";
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Callback when search is submitted (optional - defaults to navigation)
   */
  onSearch?: (query: string) => void;
  /**
   * Whether to auto-focus the input on mount
   */
  autoFocus?: boolean;
}

/**
 * Modern, minimal search input component inspired by ChatGPT's interface.
 * Features debounced input, keyboard shortcuts, and extensible icon slots.
 *
 * Why this architecture:
 * - Debouncing prevents excessive API calls during typing
 * - Keyboard shortcuts provide power user experience
 * - Icon container allows future extensions (voice, image search)
 * - Zod validation ensures data quality
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  defaultValue = "",
  placeholder = "Search for books...",
  variant = "default",
  className,
  onSearch,
  autoFocus = false,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  // Get initial value from URL params or props
  const initialValue = defaultValue || searchParams.get("q") || "";

  const [query, setQuery] = useState(initialValue);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  // Focus input on Ctrl+K
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Debounced validation
  const validateQuery = useCallback(
    (value: string) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      setIsValidating(true);
      setValidationError(null);

      const timer = setTimeout(() => {
        try {
          if (value.length > 0) {
            searchQuerySchema.parse(value);
          }
          setValidationError(null);
        } catch (error) {
          if (error instanceof z.ZodError) {
            setValidationError(error.issues[0].message);
          }
        } finally {
          setIsValidating(false);
        }
      }, 300);

      setDebounceTimer(timer);
    },
    [debounceTimer]
  );

  // Handle input changes
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);
    validateQuery(value);
  };

  // Handle form submission
  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!query.trim()) {
      inputRef.current?.focus();
      return;
    }

    try {
      // Final validation before submit
      const validatedQuery = searchQuerySchema.parse(query);

      if (onSearch) {
        onSearch(validatedQuery);
      } else {
        // Navigate to search page with query parameter
        const params = new URLSearchParams();
        params.set("q", validatedQuery);
        router.push(`/search?${params.toString()}`);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setValidationError(error.issues[0].message);
      }
    }
  };

  // Clear input and focus
  const handleClear = () => {
    setQuery("");
    setValidationError(null);
    setIsValidating(false);
    inputRef.current?.focus();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      if (query) {
        handleClear();
      } else {
        inputRef.current?.blur();
      }
    } else if (event.key === "Enter") {
      handleSubmit();
    }
  };

  const isCompact = variant === "compact";
  const hasError = !!validationError;
  const showLoader = isValidating && query.length > 0;

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div
        className={cn(
          // base styles + light-mode enhancement (white background + soft border)
          "relative flex items-center rounded-full transition-all duration-200",
          "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-2",
          // Show a visible background and border in light mode while preserving dark styling
          "bg-white/90 border border-slate-200 dark:bg-transparent",
          hasError &&
            "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
          isCompact ? "h-10" : "h-12 md:h-14",
          "shadow-sm hover:shadow-md focus-within:shadow-lg"
        )}
      >
        {/* Search Icon */}
        <div
          className={cn("flex items-center pl-4", isCompact ? "pl-3" : "pl-4")}
        >
          <Search
            className={cn(
              "text-muted-foreground",
              isCompact ? "h-4 w-4" : "h-5 w-5"
            )}
          />
        </div>

        {/* Input Field */}
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            // make the input visually inset on light bg, keep transparent in dark
            "bg-transparent placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-full border-0",
            // when in light mode, ensure the input text area has padding and no extra border
            isCompact
              ? "text-sm h-10 px-3"
              : "text-base h-12 md:h-14 px-4 md:text-lg"
          )}
          aria-label="Search for books"
          aria-describedby={hasError ? "search-error" : undefined}
          aria-invalid={hasError}
        />

        {/* Action Icons Container - Future extensible slot */}
        <div className="flex items-center space-x-1 pr-2">
          {/* Future extension slots for voice/image input */}
          <div className="hidden sm:flex items-center space-x-1 opacity-50">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "text-muted-foreground hover:text-foreground",
                isCompact ? "h-8 w-8" : "h-9 w-9"
              )}
              disabled
              title="Voice search (coming soon)"
            >
              <Mic className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "text-muted-foreground hover:text-foreground",
                isCompact ? "h-8 w-8" : "h-9 w-9"
              )}
              disabled
              title="Image search (coming soon)"
              aria-label="Image search (coming soon)"
            >
              <Image className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} aria-hidden="true" />
            </Button>
          </div>

          {/* Loading Indicator */}
          {showLoader && (
            <div className="flex items-center">
              <Loader2
                className={cn(
                  "animate-spin text-muted-foreground",
                  isCompact ? "h-4 w-4" : "h-5 w-5"
                )}
              />
            </div>
          )}

          {/* Clear Button */}
          {query && !showLoader && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className={cn(
                "text-muted-foreground hover:text-foreground transition-colors",
                isCompact ? "h-8 w-8" : "h-9 w-9"
              )}
              title="Clear search (Esc)"
            >
              <X className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} />
            </Button>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            disabled={!query.trim() || hasError}
            className={cn(
              "text-primary hover:text-primary/80 hover:bg-primary/10 transition-colors",
              isCompact ? "h-8 w-8" : "h-9 w-9"
            )}
            title="Search (Enter)"
          >
            <Search className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} />
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {hasError && (
        <p
          id="search-error"
          className="absolute top-full left-0 mt-2 text-sm text-destructive animate-fade-up"
          role="alert"
        >
          {validationError}
        </p>
      )}

      {/* Keyboard Hint */}
      {!isCompact && (
        <p className="absolute top-full right-0 mt-2 text-xs text-muted-foreground">
          Press{" "}
          <kbd className="px-1.5 py-0.5 rounded text-xs border bg-muted">
            Ctrl+K
          </kbd>{" "}
          to focus
        </p>
      )}
    </form>
  );
};
