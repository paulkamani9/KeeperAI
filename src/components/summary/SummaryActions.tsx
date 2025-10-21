"use client";

import React, { useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { toast } from "sonner";
import {
  Share2,
  Printer,
  Copy,
  Twitter,
  Facebook,
  MessageCircle,
  MoreVertical,
  BookMarkedIcon,
  BookmarkPlus,
  BookOpen,
  CheckCircle,
  Trash2,
  Library,
  ChevronDown,
} from "lucide-react";
import type { Summary } from "../../types/summary";
import { FavoriteToggle } from "../shared/FavoriteToggle";
import { useUser } from "@clerk/nextjs";
import { useReadList, type ReadingStatus } from "@/hooks/useReadList";
import { useFavorites } from "@/hooks/useFavorites";

interface SummaryActionsProps {
  /** Summary data */
  summary: Summary;
  /** Custom className for styling */
  className?: string;
}

/**
 * SummaryActions - Action buttons for summary reading
 *
 * Features:
 * - Share functionality (copy link, social sharing)
 * - Print support
 * - Save to favorites (placeholder for Phase 3)
 * - Download options (placeholder for future)
 * - Responsive design with dropdown on mobile
 * - Accessible with proper ARIA labels
 * - Extensible for future actions
 */
export function SummaryActions({ summary, className }: SummaryActionsProps) {
  const { user } = useUser();
  const [isSaved, setIsSaved] = useState(false); // TODO: Replace with real state in Phase 3

  // Reading list hook
  const {
    isInReadList,
    currentStatus,
    addBook,
    removeBook,
    updateReadingStatus,
    isLoading: readListLoading,
  } = useReadList(summary.bookId);

  // Favorites hook
  const {
    isFavorited,
    toggleFavorite,
    isLoading: favoriteLoading,
  } = useFavorites(summary.bookId);

  // Handle copy summary link
  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/summaries/${summary.id}`;
      await navigator.clipboard.writeText(url);
      toast.success("Summary link copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy link. Please try again.");
      console.error("Error copying link:", error);
    }
  };

  // Handle print summary
  const handlePrint = () => {
    window.print();
  };

  // Handle save summary (placeholder)
  const handleSaveSummary = () => {
    setIsSaved(!isSaved);
    toast.success(
      isSaved
        ? "Summary removed from saved summaries"
        : "Summary saved to saved summaries"
    );
  };

  // Handle social sharing
  const handleShareTwitter = () => {
    let text = "";
    if (summary.bookTitle && summary.summaryType) {
      text = `Check out the ${summary.summaryType} summary of ${summary.bookTitle}`;
    } else {
      text = `Check out this AI-generated summary on OUTCLEVR`;
    }
    const url = `${window.location.origin}/summaries/${summary.id}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
  };

  const handleShareFacebook = () => {
    const url = `${window.location.origin}/summaries/${summary.id}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, "_blank", "noopener,noreferrer");
  };

  // Handle WhatsApp sharing
  const handleShareWhatsApp = () => {
    let text = "";
    if (summary.bookTitle && summary.summaryType) {
      text = `Check out the ${summary.summaryType} summary of ${summary.bookTitle}: ${window.location.href}`;
    } else {
      text = `Check out this AI-generated summary on OUTCLEVR: ${window.location.href}`;
    }
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  // Handle download (placeholder for future)
  const handleDownload = () => {
    toast.info("Download functionality coming soon!");
  };

  // Handle reading status change for mobile dropdown
  const handleStatusChange = async (status: ReadingStatus) => {
    try {
      if (!isInReadList) {
        await addBook(summary.bookId, status);
        toast.success(`Added to Reading List: ${formatStatus(status)}`);
      } else if (currentStatus === status) {
        await removeBook(summary.bookId);
        toast.success("Removed from Reading List");
      } else {
        await updateReadingStatus(summary.bookId, status);
        toast.success(`Reading status updated: ${formatStatus(status)}`);
      }
    } catch (error) {
      toast.error("Failed to update reading list");
      console.error(error);
    }
  };

  // Handle favorite toggle for mobile dropdown
  const handleFavoriteToggle = async () => {
    try {
      await toggleFavorite(summary.bookId);
      toast.success(
        isFavorited ? "Removed from Favorites" : "Added to Favorites"
      );
    } catch (error) {
      toast.error("Failed to update favorites");
      console.error(error);
    }
  };

  // Format reading status for display
  const formatStatus = (status: ReadingStatus): string => {
    const labels = {
      "want-to-read": "Want to Read",
      reading: "Reading",
      completed: "Completed",
    };
    return labels[status];
  };

  // Get status icon and color
  const getStatusInfo = (status: ReadingStatus) => {
    switch (status) {
      case "want-to-read":
        return {
          icon: BookmarkPlus,
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-950",
        };
      case "reading":
        return {
          icon: BookOpen,
          color: "text-orange-600 dark:text-orange-400",
          bgColor: "bg-orange-50 dark:bg-orange-950",
        };
      case "completed":
        return {
          icon: CheckCircle,
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-950",
        };
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Desktop Actions - Consolidated */}
      <div className="hidden sm:flex items-center gap-2">
        {/* Share Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              aria-label="Share summary"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden lg:inline-block ml-2">Share</span>
              <ChevronDown className="h-3 w-3 ml-1 opacity-50 hidden lg:inline-block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleCopyLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleShareTwitter}>
              <Twitter className="h-4 w-4 mr-2" />
              Twitter
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShareFacebook}>
              <Facebook className="h-4 w-4 mr-2" />
              Facebook
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShareWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Print action */}
            <DropdownMenuItem onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Library Actions Dropdown (Favorites, Reading List, Save Summary) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              aria-label="Library actions"
            >
              <Library className="h-4 w-4" />
              <span className="hidden lg:inline-block ml-2">Library</span>
              <ChevronDown className="h-3 w-3 ml-1 opacity-50 hidden lg:inline-block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {/* Favorite Toggle */}
            <FavoriteToggle bookId={summary.bookId} variant="menu-item" />

            <DropdownMenuSeparator />

            {/* Save Summary */}
            <DropdownMenuItem onClick={handleSaveSummary}>
              <BookMarkedIcon
                className={cn("h-4 w-4 mr-2", isSaved && "fill-current")}
              />
              {isSaved ? "Unsave Summary" : "Save Summary"}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Reading List Section */}
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Reading List
            </DropdownMenuLabel>

            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleStatusChange("want-to-read");
              }}
              disabled={!user || readListLoading}
              className={cn(
                currentStatus === "want-to-read" &&
                  getStatusInfo("want-to-read").bgColor
              )}
            >
              <BookmarkPlus
                className={cn(
                  "h-4 w-4 mr-2",
                  getStatusInfo("want-to-read").color
                )}
              />
              Want to Read
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleStatusChange("reading");
              }}
              disabled={!user || readListLoading}
              className={cn(
                currentStatus === "reading" && getStatusInfo("reading").bgColor
              )}
            >
              <BookOpen
                className={cn("h-4 w-4 mr-2", getStatusInfo("reading").color)}
              />
              Reading
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleStatusChange("completed");
              }}
              disabled={!user || readListLoading}
              className={cn(
                currentStatus === "completed" &&
                  getStatusInfo("completed").bgColor
              )}
            >
              <CheckCircle
                className={cn("h-4 w-4 mr-2", getStatusInfo("completed").color)}
              />
              Completed
            </DropdownMenuItem>

            {/* Remove from Reading List (if in list) */}
            {isInReadList && user && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      await removeBook(summary.bookId);
                      toast.success("Removed from Reading List");
                    } catch (error) {
                      toast.error("Failed to remove from reading list");
                    }
                  }}
                  disabled={readListLoading}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove from List
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Actions - Dropdown */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              aria-label="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {/* Share Options */}
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Share
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={handleCopyLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShareTwitter}>
              <Twitter className="h-4 w-4 mr-2" />
              Share on Twitter
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShareFacebook}>
              <Facebook className="h-4 w-4 mr-2" />
              Share on Facebook
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShareWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Share on WhatsApp
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Action Options */}
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Actions
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Summary
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSaveSummary}>
              <BookMarkedIcon
                className={cn("h-4 w-4 mr-2", isSaved && "stroke-white")}
              />
              {isSaved ? "Remove Summary" : "Save Summary"}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Library Actions */}
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Library
            </DropdownMenuLabel>

            {/* Favorite Toggle */}
            <FavoriteToggle bookId={summary.bookId} variant="menu-item" />

            {/* Reading List Options */}
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleStatusChange("want-to-read");
              }}
              disabled={!user || readListLoading}
              className={cn(
                currentStatus === "want-to-read" &&
                  getStatusInfo("want-to-read").bgColor
              )}
            >
              <BookmarkPlus
                className={cn(
                  "h-4 w-4 mr-2",
                  getStatusInfo("want-to-read").color
                )}
              />
              Want to Read
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleStatusChange("reading");
              }}
              disabled={!user || readListLoading}
              className={cn(
                currentStatus === "reading" && getStatusInfo("reading").bgColor
              )}
            >
              <BookOpen
                className={cn("h-4 w-4 mr-2", getStatusInfo("reading").color)}
              />
              Reading
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleStatusChange("completed");
              }}
              disabled={!user || readListLoading}
              className={cn(
                currentStatus === "completed" &&
                  getStatusInfo("completed").bgColor
              )}
            >
              <CheckCircle
                className={cn("h-4 w-4 mr-2", getStatusInfo("completed").color)}
              />
              Completed
            </DropdownMenuItem>

            {/* Remove from Reading List (if in list) */}
            {isInReadList && user && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      await removeBook(summary.bookId);
                      toast.success("Removed from Reading List");
                    } catch (error) {
                      toast.error("Failed to remove from reading list");
                    }
                  }}
                  disabled={readListLoading}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove from List
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
