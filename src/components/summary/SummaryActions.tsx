"use client";

import React, { useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { toast } from "sonner";
import {
  Share2,
  Printer,
  Heart,
  Download,
  Copy,
  Twitter,
  Facebook,
  MoreVertical,
} from "lucide-react";
import type { Summary } from "../../types/summary";

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
  const [isSaved, setIsSaved] = useState(false); // TODO: Replace with real state in Phase 3

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

  // Handle save to favorites (placeholder)
  const handleSaveToFavorites = () => {
    setIsSaved(!isSaved);
    toast.success(
      isSaved ? "Summary removed from favorites" : "Summary saved to favorites"
    );
  };

  // Handle social sharing
  const handleShareTwitter = () => {
    const text = `Check out this AI-generated summary on KeeperAI`;
    const url = `${window.location.origin}/summaries/${summary.id}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
  };

  const handleShareFacebook = () => {
    const url = `${window.location.origin}/summaries/${summary.id}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, "_blank", "noopener,noreferrer");
  };

  // Handle download (placeholder for future)
  const handleDownload = () => {
    toast.info("Download functionality coming soon!");
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Desktop Actions */}
      <div className="hidden sm:flex items-center space-x-2">
        {/* Share Button with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              aria-label="Share summary"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden md:inline-block ml-2">Share</span>
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
              Share on Twitter
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShareFacebook}>
              <Facebook className="h-4 w-4 mr-2" />
              Share on Facebook
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Print Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrint}
          className="shrink-0"
          aria-label="Print summary"
        >
          <Printer className="h-4 w-4" />
          <span className="hidden lg:inline-block ml-2">Print</span>
        </Button>

        {/* Save to Favorites Button (Placeholder for Phase 3) */}
        <Button
          variant={isSaved ? "default" : "ghost"}
          size="sm"
          onClick={handleSaveToFavorites}
          className="shrink-0"
          aria-label={isSaved ? "Remove from favorites" : "Save to favorites"}
        >
          <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
          <span className="hidden lg:inline-block ml-2">
            {isSaved ? "Saved" : "Save"}
          </span>
        </Button>
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
          <DropdownMenuContent align="end" className="w-48">
            {/* Share Options */}
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

            <DropdownMenuSeparator />

            {/* Action Options */}
            <DropdownMenuItem onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Summary
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSaveToFavorites}>
              <Heart
                className={cn("h-4 w-4 mr-2", isSaved && "fill-current")}
              />
              {isSaved ? "Remove from Favorites" : "Save to Favorites"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownload} disabled>
              <Download className="h-4 w-4 mr-2" />
              Download (Coming Soon)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
