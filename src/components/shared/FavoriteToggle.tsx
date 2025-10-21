"use client";

import React from "react";
import { SignInButton } from "@clerk/nextjs";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useFavorites } from "@/hooks/useFavorites";

interface FavoriteToggleProps {
  /** Book ID to favorite/unfavorite */
  bookId: string;
  /** Display variant */
  variant?: "icon" | "button" | "menu-item";
  /** Custom className */
  className?: string;
  /** Click handler to prevent event bubbling */
  onClick?: (e: React.MouseEvent) => void;
  /** Whether to show label text */
  showLabel?: boolean;
}

/**
 * FavoriteToggle - Reusable favorite button/menu item
 *
 * Features:
 * - Toggle favorite status with visual feedback
 * - Auth guard with sign-in prompt
 * - Loading states
 * - Multiple display variants
 * - Optimistic UI updates
 * - Toast notifications
 *
 * @example
 * // Icon button variant
 * <FavoriteToggle bookId={book.id} variant="icon" />
 *
 * @example
 * // Menu item variant (for dropdowns)
 * <FavoriteToggle bookId={book.id} variant="menu-item" />
 *
 * @example
 * // Full button variant
 * <FavoriteToggle bookId={book.id} variant="button" showLabel />
 */
export function FavoriteToggle({
  bookId,
  variant = "icon",
  className,
  onClick,
  showLabel = false,
}: FavoriteToggleProps) {
  const { isFavorited, toggleFavorite, isAuthenticated, isLoading } =
    useFavorites(bookId);

  // Handle toggle with error handling
  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onClick) {
      onClick(e);
    }

    try {
      await toggleFavorite(bookId);
      toast.success(
        isFavorited ? "Removed from Favorites" : "Added to Favorites"
      );
    } catch (error) {
      toast.error("Failed to update favorites. Please try again.");
      console.error("Error toggling favorite:", error);
    }
  };

  // If not authenticated, show sign-in prompt
  if (!isAuthenticated) {
    if (variant === "menu-item") {
      return (
        <SignInButton mode="modal">
          <button
            className={cn(
              "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground w-full",
              className
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Heart className="h-4 w-4 mr-2" />
            Add to Favorites
          </button>
        </SignInButton>
      );
    }

    return (
      <SignInButton mode="modal">
        <Button
          variant={variant === "button" ? "outline" : "ghost"}
          size={variant === "icon" ? "icon" : "sm"}
          className={cn(variant === "icon" && "h-8 w-8", className)}
          title="Sign in to add to favorites"
        >
          <Heart className="h-4 w-4" />
          {showLabel && variant === "button" && (
            <span className="ml-2">Add to Favorites</span>
          )}
        </Button>
      </SignInButton>
    );
  }

  // Menu item variant (for use in dropdowns)
  if (variant === "menu-item") {
    return (
      <button
        className={cn(
          "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 w-full",
          className
        )}
        onClick={handleToggle}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Heart
            className={cn(
              "h-4 w-4 mr-2 transition-all",
              isFavorited && "fill-red-500 text-red-500"
            )}
          />
        )}
        {isFavorited ? "Remove from Favorites" : "Add to Favorites"}
      </button>
    );
  }

  // Icon or button variant
  return (
    <Button
      variant={
        variant === "button" ? (isFavorited ? "default" : "outline") : "ghost"
      }
      size={variant === "icon" ? "icon" : "sm"}
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        variant === "icon" && "h-8 w-8",
        isFavorited && variant === "button" && "bg-red-500 hover:bg-red-600",
        className
      )}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart
          className={cn(
            "h-4 w-4 transition-all",
            isFavorited && "fill-current text-white"
          )}
        />
      )}
      {showLabel && variant === "button" && (
        <span className="ml-2">
          {isFavorited ? "Favorited" : "Add to Favorites"}
        </span>
      )}
    </Button>
  );
}
