"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageCircle,
  Twitter,
  Facebook,
  Linkedin,
  Send,
  Copy,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareButtonsProps {
  /** The title to share (e.g., book title or summary title) */
  title: string;
  /** Optional description to include in the share */
  description?: string;
  /** The URL to share (defaults to current page) */
  url?: string;
  /** Custom class name for styling */
  className?: string;
  /** Show labels on buttons (default: false) */
  showLabels?: boolean;
  /** Button size variant */
  size?: "sm" | "default" | "lg";
  /** Button style variant */
  variant?: "default" | "ghost" | "outline";
}

/**
 * ShareButtons Component
 *
 * Reusable social sharing buttons for OutClever content.
 * Supports WhatsApp, Twitter/X, LinkedIn, Facebook, and Telegram.
 *
 * Features:
 * - Circular icon buttons with subtle hover animations
 * - Tooltips for better UX
 * - Copy link functionality
 * - Customizable styling
 * - Accessible with proper ARIA labels
 *
 * Usage:
 * ```tsx
 * <ShareButtons
 *   title="Atomic Habits"
 *   description="Check out this summary on OutClever"
 *   url="https://outclever.studio/summaries/123"
 * />
 * ```
 */
export function ShareButtons({
  title,
  description = "Check this out on OutClever — Smarter. Sharper. Faster.",
  url,
  className,
  showLabels = false,
  size = "sm",
  variant = "ghost",
}: ShareButtonsProps) {
  // Use provided URL or fallback to current page
  const shareUrl =
    url || (typeof window !== "undefined" ? window.location.href : "");
  const encodedUrl = encodeURIComponent(shareUrl);
  const shareText = description ? `${description}` : title;
  const encodedText = encodeURIComponent(shareText);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy link");
      console.error("Error copying link:", error);
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappText = `${shareText}: ${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
  };

  const handleLinkedInShare = () => {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    window.open(linkedinUrl, "_blank", "noopener,noreferrer");
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    window.open(facebookUrl, "_blank", "noopener,noreferrer");
  };

  const handleTelegramShare = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
    window.open(telegramUrl, "_blank", "noopener,noreferrer");
  };

  const shareButtons = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      onClick: handleWhatsAppShare,
      color: "hover:text-green-600 dark:hover:text-green-400",
    },
    {
      name: "Twitter",
      icon: Twitter,
      onClick: handleTwitterShare,
      color: "hover:text-blue-500 dark:hover:text-blue-400",
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      onClick: handleLinkedInShare,
      color: "hover:text-blue-700 dark:hover:text-blue-500",
    },
    {
      name: "Facebook",
      icon: Facebook,
      onClick: handleFacebookShare,
      color: "hover:text-blue-600 dark:hover:text-blue-400",
    },
    {
      name: "Telegram",
      icon: Send,
      onClick: handleTelegramShare,
      color: "hover:text-sky-500 dark:hover:text-sky-400",
    },
    {
      name: "Copy Link",
      icon: Copy,
      onClick: handleCopyLink,
      color: "hover:text-gray-900 dark:hover:text-gray-100",
    },
  ];

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2 flex-wrap", className)}>
        {shareButtons.map((button) => {
          const Icon = button.icon;
          return (
            <Tooltip key={button.name}>
              <TooltipTrigger asChild>
                <Button
                  variant={variant}
                  size={size}
                  onClick={button.onClick}
                  className={cn(
                    "transition-all duration-200",
                    !showLabels && "aspect-square",
                    button.color
                  )}
                  aria-label={`Share on ${button.name}`}
                >
                  <Icon className="h-4 w-4" />
                  {showLabels && <span className="ml-2">{button.name}</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {button.name === "Copy Link"
                    ? "Copy Link"
                    : `Share on ${button.name}`}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

/**
 * ShareButton Component (Single Button)
 *
 * A single share button that opens a native share dialog or falls back to copy link.
 */
interface ShareButtonProps {
  title: string;
  description?: string;
  url?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "ghost" | "outline";
}

export function ShareButton({
  title,
  description,
  url,
  className,
  size = "sm",
  variant = "ghost",
}: ShareButtonProps) {
  const shareUrl =
    url || (typeof window !== "undefined" ? window.location.href : "");

  const handleShare = async () => {
    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: shareUrl,
        });
        toast.success("Shared successfully!");
      } catch (error) {
        // User cancelled or error occurred
        if ((error as Error).name !== "AbortError") {
          console.error("Error sharing:", error);
        }
      }
    } else {
      // Fallback to copy link
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
      } catch (error) {
        toast.error("Failed to copy link");
        console.error("Error copying link:", error);
      }
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleShare}
            className={cn("transition-all duration-200", className)}
            aria-label="Share"
          >
            <Share2 className="h-4 w-4" />
            <span className="ml-2">Share</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Share this page</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
