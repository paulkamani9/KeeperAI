"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Search, Hash, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface QuickExploreItem {
  id: string;
  label: string;
  query: string;
  type: "search" | "genre" | "trend";
  icon?: React.ReactNode;
}

interface QuickExploreProps {
  title?: string;
  items: QuickExploreItem[];
  variant?: "chips" | "buttons";
  className?: string;
}

export function QuickExplore({
  title = "Quick Explore",
  items,
  variant = "chips",
  className,
}: QuickExploreProps) {
  const router = useRouter();

  const handleItemClick = (item: QuickExploreItem) => {
    const searchParams = new URLSearchParams({
      query: item.query,
      mode: "searchMode",
    });

    router.push(`/search?${searchParams.toString()}`);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "trend":
        return <TrendingUp className="h-4 w-4" />;
      case "genre":
        return <Hash className="h-4 w-4" />;
      case "search":
        return <Search className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  if (variant === "buttons") {
    return (
      <section className={cn("space-y-4", className)}>
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {items.map((item) => (
            <Button
              key={item.id}
              variant="outline"
              onClick={() => handleItemClick(item)}
              className={cn(
                "h-auto flex-col gap-2 p-4 text-center hover:bg-accent/50",
                "border-border/50 hover:border-border transition-all duration-200"
              )}
            >
              <div className="text-muted-foreground">
                {item.icon || getIcon(item.type)}
              </div>
              <span className="text-sm font-medium leading-tight">
                {item.label}
              </span>
            </Button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-2">
          {items.map((item) => (
            <Button
              key={item.id}
              variant="secondary"
              size="sm"
              onClick={() => handleItemClick(item)}
              className={cn(
                "flex-shrink-0 gap-2 px-4 py-2 rounded-full",
                "bg-secondary/50 hover:bg-secondary text-secondary-foreground",
                "border border-border/50 hover:border-border",
                "transition-all duration-200 hover:scale-105 hover:shadow-sm"
              )}
            >
              <span className="text-muted-foreground">
                {item.icon || getIcon(item.type)}
              </span>
              <span className="font-medium">{item.label}</span>
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}

// Predefined popular searches and genres
export const popularSearches: QuickExploreItem[] = [
  {
    id: "productivity",
    label: "Productivity",
    query: "productivity self-help books",
    type: "search",
  },
  {
    id: "business",
    label: "Business Strategy",
    query: "business strategy leadership",
    type: "search",
  },
  {
    id: "sci-fi",
    label: "Science Fiction",
    query: "science fiction fantasy",
    type: "genre",
  },
  {
    id: "psychology",
    label: "Psychology",
    query: "psychology human behavior",
    type: "search",
  },
  {
    id: "biography",
    label: "Biography",
    query: "biography memoirs",
    type: "genre",
  },
  {
    id: "technology",
    label: "Technology",
    query: "technology programming artificial intelligence",
    type: "search",
  },
];

export const trendingGenres: QuickExploreItem[] = [
  {
    id: "fantasy",
    label: "Fantasy",
    query: "fantasy epic adventure",
    type: "trend",
  },
  {
    id: "mystery",
    label: "Mystery & Thriller",
    query: "mystery thriller suspense",
    type: "trend",
  },
  {
    id: "romance",
    label: "Romance",
    query: "romance contemporary",
    type: "trend",
  },
  {
    id: "history",
    label: "History",
    query: "history historical non-fiction",
    type: "trend",
  },
  {
    id: "health",
    label: "Health & Wellness",
    query: "health fitness wellness mindfulness",
    type: "trend",
  },
  {
    id: "cooking",
    label: "Cooking",
    query: "cooking recipes culinary",
    type: "trend",
  },
];
