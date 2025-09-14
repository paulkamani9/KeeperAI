"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Search, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { BookCarousel, BookData } from "@/components/home";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query") || "";
  const mode = searchParams.get("mode") || "searchMode";

  const [results, setResults] = useState<BookData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;

    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/search?query=${encodeURIComponent(query)}&mode=${mode}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch search results");
        }

        const data = await response.json();
        setResults(data.books || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query, mode]);

  if (!query) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Search className="h-12 w-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-semibold text-foreground">
            No search query
          </h1>
          <p className="text-muted-foreground">
            Please provide a search query to find books.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {mode === "promptMode" ? (
                <Sparkles className="h-6 w-6 text-primary" />
              ) : (
                <Search className="h-6 w-6 text-primary" />
              )}
              <h1 className="text-2xl font-bold text-foreground">
                {mode === "promptMode"
                  ? "AI Recommendations"
                  : "Search Results"}
              </h1>
            </div>

            <div className="space-y-1">
              <p className="text-lg text-muted-foreground">
                <span className="font-medium">"{query}"</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {mode === "promptMode"
                  ? "AI-powered recommendations based on your description"
                  : "Direct search results from our book database"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Results Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <div className="space-y-2">
                <h2 className="text-lg font-medium text-foreground">
                  {mode === "promptMode"
                    ? "Generating recommendations..."
                    : "Searching..."}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Please wait while we find the perfect books for you
                </p>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="text-4xl">⚠️</div>
              <div className="space-y-2">
                <h2 className="text-lg font-medium text-foreground">
                  Search Error
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {error}
                </p>
              </div>
            </div>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found {results.length} result{results.length !== 1 ? "s" : ""}
              </p>
            </div>

            <BookCarousel
              title=""
              books={results}
              size="md"
              showFavorites={true}
              showScrollButtons={false}
              className="space-y-6"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="text-4xl">📚</div>
              <div className="space-y-2">
                <h2 className="text-lg font-medium text-foreground">
                  No books found
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Try adjusting your search terms or browse our popular
                  categories
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
