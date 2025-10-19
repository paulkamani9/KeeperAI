"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  X,
  Loader2,
  Mic,
  ImageIcon,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import TextareaAutosize from "react-textarea-autosize";

// Validation schema for search queries
const searchQuerySchema = z
  .string()
  .min(1, "Search query cannot be empty")
  .max(200, "Search query must be 200 characters or less")
  .trim();

// Validation schema for author query (optional)
const authorQuerySchema = z
  .string()
  .max(200, "Author query must be 200 characters or less")
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
 * - Collapsible advanced filters enable power users without overwhelming casual users
 * - Optional author field provides precise search filtering (backwards compatible)
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
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const authorInputRef = useRef<HTMLInputElement>(null);

  // Get initial values from URL params or props
  const initialValue = defaultValue || searchParams.get("q") || "";
  const initialAuthorValue = searchParams.get("author") || "";

  const [query, setQuery] = useState(initialValue);
  const [authorQuery, setAuthorQuery] = useState(initialAuthorValue);
  const [showAdvanced, setShowAdvanced] = useState(Boolean(initialAuthorValue));
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [authorValidationError, setAuthorValidationError] = useState<
    string | null
  >(null);
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

  // Handle input changes (for both input and textarea)
  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setQuery(value);
    validateQuery(value);
  };

  // Handle author input changes
  const handleAuthorInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setAuthorQuery(value);

    // Validate author query
    try {
      if (value.length > 0) {
        authorQuerySchema.parse(value);
      }
      setAuthorValidationError(null);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setAuthorValidationError(error.issues[0].message);
      }
    }
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
        // Navigate to search page with query parameters
        const params = new URLSearchParams();
        params.set("q", validatedQuery);

        // Add author query if provided
        if (authorQuery.trim()) {
          const validatedAuthorQuery = authorQuerySchema.parse(authorQuery);
          params.set("author", validatedAuthorQuery);
        }

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
    setAuthorQuery("");
    setValidationError(null);
    setAuthorValidationError(null);
    setIsValidating(false);
    inputRef.current?.focus();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    if (event.key === "Escape") {
      if (query) {
        handleClear();
      } else {
        inputRef.current?.blur();
      }
      return;
    }

    if (event.key === "Enter" && !event.shiftKey && variant === "default") {
      event.preventDefault();
      handleSubmit();
    } else if (event.key === "Enter" && variant === "compact") {
      // compact stays single-line; Enter submits
      event.preventDefault();
      handleSubmit();
    }
  };

  const isCompact = variant === "compact";
  const hasError = !!validationError;
  const showLoader = isValidating && query.length > 0;

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      {isCompact ? (
        // Compact variant: Keep original single-line layout
        <div
          className={cn(
            "relative flex items-center rounded-full transition-all duration-200",
            "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-2",
            "bg-white/90 border border-slate-200 dark:bg-transparent",
            hasError &&
              "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
            "h-10",
            "shadow-sm hover:shadow-md focus-within:shadow-lg"
          )}
        >
          {/* Search Icon */}
          <div className="flex items-center pl-3">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Input Field */}
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="bg-transparent placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-full border-0 text-sm h-10 px-3"
            aria-label="Search for books"
            aria-describedby={hasError ? "search-error" : undefined}
            aria-invalid={hasError}
          />

          {/* Action Icons Container */}
          <div className="flex items-center space-x-1 pr-2">
            {/* Future extension slots for voice/image input */}
            <div className="hidden sm:flex items-center space-x-1 opacity-50">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground h-8 w-8"
                disabled
                title="Voice search (coming soon)"
              >
                <Mic className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground h-8 w-8"
                disabled
                title="Image search (coming soon)"
                aria-label="Image search (coming soon)"
              >
                <ImageIcon className="h-3 w-3" aria-hidden="true" />
              </Button>
            </div>

            {/* Loading Indicator */}
            {showLoader && (
              <div className="flex items-center">
                <Loader2 className="animate-spin text-muted-foreground h-4 w-4" />
              </div>
            )}

            {/* Clear Button */}
            {query && !showLoader && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground transition-colors h-8 w-8"
                title="Clear search (Esc)"
              >
                <X className="h-3 w-3" />
              </Button>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              disabled={!query.trim() || hasError}
              className="text-primary hover:text-primary/80 hover:bg-primary/10 transition-colors h-8 w-8"
              title="Search (Enter)"
            >
              <Search className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        // Default variant: ChatGPT-style with auto-growing textarea
        <div
          className={cn(
            "rounded-2xl border bg-white/90 dark:bg-transparent shadow-sm",
            "p-3 md:p-4 transition-all duration-200",
            "focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring",
            hasError &&
              "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
            "hover:shadow-md focus-within:shadow-lg"
          )}
        >
          {/* Top: textarea only (no leading Search icon) */}
          <TextareaAutosize
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            minRows={3}
            maxRows={12}
            className="w-full resize-none bg-transparent outline-none placeholder:text-muted-foreground/70 text-base md:text-lg leading-6 md:leading-7"
            aria-label="Search for books"
            aria-describedby={hasError ? "search-error" : undefined}
            aria-invalid={hasError}
          />

          {/* Advanced Filters Section (collapsible) */}
          {showAdvanced && (
            <div className="mt-3 pt-3 border-t">
              <label
                htmlFor="author-search"
                className="block text-sm font-medium text-muted-foreground mb-2"
              >
                Filter by Author (optional)
              </label>
              <Input
                ref={authorInputRef}
                id="author-search"
                type="text"
                value={authorQuery}
                onChange={handleAuthorInputChange}
                placeholder="e.g., George Orwell"
                className="bg-transparent"
                aria-label="Filter by author"
                aria-describedby={
                  authorValidationError ? "author-error" : undefined
                }
                aria-invalid={!!authorValidationError}
              />
              {authorValidationError && (
                <p
                  id="author-error"
                  className="mt-1 text-sm text-destructive"
                  role="alert"
                >
                  {authorValidationError}
                </p>
              )}
            </div>
          )}

          {/* Bottom toolbar: utilities left, submit button right */}
          <div className="mt-2 pt-2 flex items-center gap-2 justify-between flex-wrap">
            {/* Left: utilities */}
            <div className="flex items-center gap-1">
              {/* Advanced Filters Toggle */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-muted-foreground hover:text-foreground h-9 px-3"
                title={showAdvanced ? "Hide filters" : "Show advanced filters"}
              >
                <span className="text-xs sm:text-sm">Advanced</span>
                {showAdvanced ? (
                  <ChevronUp className="ml-1 h-3 w-3" />
                ) : (
                  <ChevronDown className="ml-1 h-3 w-3" />
                )}
              </Button>

              {/* Future extension slots for voice/image input */}
              <div className="hidden sm:flex items-center gap-1 opacity-50">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground h-9 w-9"
                  disabled
                  title="Voice search (coming soon)"
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground h-9 w-9"
                  disabled
                  title="Image search (coming soon)"
                  aria-label="Image search (coming soon)"
                >
                  <ImageIcon className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              {/* Loading Indicator */}
              {showLoader && (
                <div className="flex items-center">
                  <Loader2 className="animate-spin text-muted-foreground h-5 w-5" />
                </div>
              )}

              {/* Clear Button */}
              {query && !showLoader && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
                  className="text-muted-foreground hover:text-foreground transition-colors h-9 w-9"
                  title="Clear search (Esc)"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Right: only primary Search button with ArrowRight */}
            <div className="ml-auto">
              <Button
                type="submit"
                variant="default"
                size="icon"
                disabled={!query.trim() || hasError}
                title="Search (Enter)"
                className="rounded-full shadow-sm transition-all hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] group h-9 w-9"
              >
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                <span className="sr-only">Search</span>
              </Button>
            </div>
          </div>
        </div>
      )}

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
