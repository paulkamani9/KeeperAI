"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface BookData {
  id: string;
  title: string;
  authors: string[];
  description?: string;
  publishedDate?: string;
  isbn?: string;
  imageUrl?: string;
  categories?: string[];
  pageCount?: number;
  language?: string;
  isFavorite?: boolean;
  rating?: number;
}

interface BookCardProps {
  book: BookData;
  size?: "sm" | "md" | "lg";
  showFavorite?: boolean;
  onFavoriteToggle?: (bookId: string) => void;
  className?: string;
}

export function BookCard({
  book,
  size = "md",
  showFavorite = true,
  onFavoriteToggle,
  className,
}: BookCardProps) {
  const sizeClasses = {
    sm: {
      container: "w-32",
      image: "h-48",
      content: "p-2",
      title: "text-xs",
      author: "text-xs",
    },
    md: {
      container: "w-40",
      image: "h-56",
      content: "p-3",
      title: "text-sm",
      author: "text-xs",
    },
    lg: {
      container: "w-48",
      image: "h-64",
      content: "p-4",
      title: "text-base",
      author: "text-sm",
    },
  };

  const sizes = sizeClasses[size];

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle?.(book.id);
  };

  return (
    <Card
      className={cn(
        sizes.container,
        "group cursor-pointer transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-1",
        "bg-card border-border/50 hover:border-border",
        className
      )}
    >
      <Link href={`/books/${book.id}`} className="block">
        <CardContent className={cn("relative", sizes.content)}>
          {/* Book Cover */}
          <div
            className={cn(
              "relative overflow-hidden rounded-lg bg-muted mb-3",
              sizes.image,
              "group-hover:scale-105 transition-transform duration-300"
            )}
          >
            {book.imageUrl ? (
              <Image
                src={book.imageUrl}
                alt={`Cover of ${book.title}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 128px, (max-width: 1200px) 160px, 192px"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gradient-to-br from-muted to-muted/60">
                <div className="text-center p-2">
                  <div className="text-2xl font-bold text-muted-foreground/40">
                    📖
                  </div>
                  <div
                    className={cn(
                      "font-medium text-muted-foreground/60 mt-1",
                      sizes.title
                    )}
                  >
                    No Cover
                  </div>
                </div>
              </div>
            )}

            {/* Favorite Button Overlay */}
            {showFavorite && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFavoriteClick}
                className={cn(
                  "absolute top-2 right-2 h-8 w-8 rounded-full",
                  "bg-background/80 backdrop-blur-sm hover:bg-background/90",
                  "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                  "border border-border/50"
                )}
                aria-label={
                  book.isFavorite ? "Remove from favorites" : "Add to favorites"
                }
              >
                <Heart
                  className={cn(
                    "h-4 w-4 transition-colors",
                    book.isFavorite
                      ? "fill-red-500 text-red-500"
                      : "text-muted-foreground hover:text-red-500"
                  )}
                />
              </Button>
            )}

            {/* Rating Badge (if available) */}
            {book.rating && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-background/80 backdrop-blur-sm rounded-md border border-border/50">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-medium">
                  {book.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Book Info */}
          <div className="space-y-1">
            {/* Title */}
            <h3
              className={cn(
                "font-semibold leading-tight text-foreground line-clamp-2",
                "group-hover:text-primary transition-colors",
                sizes.title
              )}
              title={book.title}
            >
              {book.title}
            </h3>

            {/* Authors */}
            {book.authors && book.authors.length > 0 && (
              <p
                className={cn(
                  "text-muted-foreground line-clamp-1",
                  sizes.author
                )}
                title={book.authors.join(", ")}
              >
                {book.authors.join(", ")}
              </p>
            )}

            {/* Published Date & Categories */}
            <div className="flex flex-wrap gap-1 text-xs text-muted-foreground/80">
              {book.publishedDate && (
                <span>{new Date(book.publishedDate).getFullYear()}</span>
              )}
              {book.categories && book.categories.length > 0 && (
                <>
                  {book.publishedDate && <span>•</span>}
                  <span className="line-clamp-1">{book.categories[0]}</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
