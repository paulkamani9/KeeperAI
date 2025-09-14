"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRef } from "react";

type SearchMode = "search" | "prompt";

interface HeroSearchBarProps {
  className?: string;
  minimal?: boolean;
}

export function HeroSearchBar({
  className,
  minimal = false,
}: HeroSearchBarProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("search");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  // Autofocus input on mount, unless minimal is true
  React.useEffect(() => {
    if (minimal) return;
    // slight delay to ensure element is mounted and visible
    const t = setTimeout(() => {
      try {
        inputRef.current?.focus();
        const val = inputRef.current?.value ?? "";
        if (inputRef.current && typeof val === "string") {
          inputRef.current.selectionStart = val.length;
          inputRef.current.selectionEnd = val.length;
        }
      } catch (e) {
        // noop
      }
    }, 120);

    return () => clearTimeout(t);
  }, [minimal]);

  const handleSearch = () => {
    if (!query.trim()) return;

    const searchParams = new URLSearchParams({
      query: query.trim(),
      mode: mode === "search" ? "searchMode" : "promptMode",
    });

    router.push(`/search?${searchParams.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleModeChange = (newMode: SearchMode) => {
    setMode(newMode);
    // Keep focus on the input after switching modes
    // Slight timeout to let button blur complete then focus input
    setTimeout(() => {
      try {
        inputRef.current?.focus();
        // Move cursor to end
        const val = inputRef.current?.value ?? "";
        if (inputRef.current && typeof val === "string") {
          inputRef.current.selectionStart = val.length;
          inputRef.current.selectionEnd = val.length;
        }
      } catch (e) {
        // no-op if focus fails
      }
    }, 0);
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Main Search Container - Central and Large */}
      <div className="max-w-4xl mx-auto">
        <div
          className={cn(
            "relative bg-card/80 backdrop-blur-sm rounded-3xl border shadow-2xl transition-all duration-300",
            "hover:shadow-3xl focus-within:shadow-3xl",
            isFocused && "ring-2 ring-primary/30 shadow-3xl"
          )}
        >
          {/* Search Input - Hero Element */}
          <div className="p-8 pb-6">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-6 h-6 text-muted-foreground/60" />
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                // Attach ref to underlying input element. Input component should forwardRef.
                ref={inputRef}
                placeholder={
                  mode === "search"
                    ? "Search for books, authors, or topics..."
                    : "Describe what kind of books you're looking for..."
                }
                className={cn(
                  "h-20 sm:h-24 w-full text-xl sm:text-2xl bg-background/80",
                  "border-border/30 rounded-2xl pl-16 pr-8 py-6",
                  "focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:bg-background",
                  "placeholder:text-muted-foreground/50 font-medium",
                  "transition-all duration-200 shadow-inner"
                )}
                autoFocus={!minimal}
              />
            </div>
          </div>

          {/* Controls Section */}
          <div className="px-8 pb-8 space-y-6">
            {/* Mode Toggle - Simple Buttons */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant={mode === "search" ? "default" : "outline"}
                size="lg"
                onClick={() => handleModeChange("search")}
                className={cn(
                  "px-8 py-3 text-base font-medium rounded-xl transition-all duration-200",
                  mode === "search"
                    ? "shadow-lg hover:shadow-xl"
                    : "hover:bg-muted/50 border-border/50"
                )}
              >
                <Search className="w-5 h-5 mr-3" />
                Search Mode
              </Button>
              <Button
                variant={mode === "prompt" ? "default" : "outline"}
                size="lg"
                onClick={() => handleModeChange("prompt")}
                className={cn(
                  "px-8 py-3 text-base font-medium rounded-xl transition-all duration-200",
                  mode === "prompt"
                    ? "shadow-lg hover:shadow-xl"
                    : "hover:bg-muted/50 border-border/50"
                )}
              >
                <Sparkles className="w-5 h-5 mr-3" />
                AI Prompt
              </Button>
            </div>

            {/* Search Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleSearch}
                size="lg"
                className={cn(
                  "h-14 px-12 py-4 min-w-64",
                  "bg-primary hover:bg-primary/90 text-primary-foreground",
                  "shadow-lg hover:shadow-xl transition-all duration-200 text-lg font-semibold",
                  "rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                disabled={!query.trim()}
              >
                {mode === "search" ? "Find Books" : "Get AI Recommendations"}
              </Button>
            </div>

            {/* Mode Description */}
            {!minimal && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground/80 max-w-md mx-auto leading-relaxed">
                  {mode === "search"
                    ? "Search our vast collection by title, author, genre, or keyword"
                    : "Let AI understand your preferences and recommend perfect books for you"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
