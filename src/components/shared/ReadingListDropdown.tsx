"use client";

import React from "react";
import { SignInButton } from "@clerk/nextjs";
import {
  BookmarkPlus,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ListPlus,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type ReadingStatus = "want-to-read" | "reading" | "completed";

interface ReadingListDropdownProps {
  /** Current reading status (if book is in list) */
  currentStatus?: ReadingStatus;
  /** Whether book is in reading list */
  isInReadList: boolean;
  /** Callback when status changes (for books already in list) */
  onStatusChange?: (status: ReadingStatus) => void;
  /** Callback when book is added to list (if not already in) */
  onAdd?: (status: ReadingStatus) => void;
  /** Callback when book is removed from list */
  onRemove?: () => void;
  /** Trigger element variant */
  variant?: "button" | "icon" | "compact";
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Click handler for the trigger (to prevent event bubbling) */
  onTriggerClick?: (e: React.MouseEvent) => void;
  /** Custom class name for the trigger button */
  className?: string;
}

/**
 * ReadingListDropdown - Reusable dropdown for managing reading list
 *
 * Features:
 * - Add books to reading list with status
 * - Change reading status (Want to Read, Reading, Completed)
 * - Remove from reading list
 * - Visual indicators for current status
 * - Multiple display variants (button, icon, compact)
 * - Authentication guard with sign-in prompt
 * - Color-coded status items
 *
 * @example
 * // In BookCard (icon variant)
 * <ReadingListDropdown
 *   currentStatus={currentReadingStatus}
 *   isInReadList={isInReadList}
 *   onStatusChange={handleStatusChange}
 *   onRemove={handleRemove}
 *   variant="icon"
 *   isAuthenticated={isAuthenticated}
 * />
 *
 * @example
 * // In BookDetailView (button variant)
 * <ReadingListDropdown
 *   currentStatus={currentStatus}
 *   isInReadList={isInReadList}
 *   onStatusChange={handleUpdateStatus}
 *   onAdd={handleAddToReadList}
 *   onRemove={handleRemoveFromReadList}
 *   variant="button"
 *   isAuthenticated={isAuthenticated}
 * />
 */
export function ReadingListDropdown({
  currentStatus,
  isInReadList,
  onStatusChange,
  onAdd,
  onRemove,
  variant = "button",
  isAuthenticated,
  isLoading = false,
  onTriggerClick,
  className,
}: ReadingListDropdownProps) {
  // Helper to get status display info
  const getStatusInfo = (status: ReadingStatus) => {
    switch (status) {
      case "want-to-read":
        return {
          label: "Want to Read",
          icon: BookmarkPlus,
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-950",
        };
      case "reading":
        return {
          label: "Reading",
          icon: BookOpen,
          color: "text-orange-600 dark:text-orange-400",
          bgColor: "bg-orange-50 dark:bg-orange-950",
        };
      case "completed":
        return {
          label: "Completed",
          icon: CheckCircle,
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-950",
        };
    }
  };

  // Handle status change/add
  const handleStatusSelect = (status: ReadingStatus) => {
    if (isInReadList && onStatusChange) {
      onStatusChange(status);
    } else if (!isInReadList && onAdd) {
      onAdd(status);
    }
  };

  // Handle remove
  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
  };

  // Handle trigger click
  const handleTriggerClick = (e: React.MouseEvent) => {
    if (onTriggerClick) {
      onTriggerClick(e);
    }
  };

  // Render trigger based on variant
  const renderTrigger = () => {
    if (variant === "icon") {
      return (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
            isInReadList && "opacity-100",
            className
          )}
          disabled={isLoading}
          title={isInReadList ? "Manage reading list" : "Add to reading list"}
          onClick={handleTriggerClick}
        >
          {variant === "icon" && isInReadList ? (
            <MoreVertical className="h-4 w-4" />
          ) : (
            <ListPlus
              className={cn(
                "h-4 w-4 transition-colors",
                isInReadList
                  ? "fill-blue-500 text-blue-500"
                  : "text-muted-foreground hover:text-blue-500"
              )}
            />
          )}
        </Button>
      );
    }

    if (variant === "compact") {
      const statusInfo = currentStatus ? getStatusInfo(currentStatus) : null;
      const StatusIcon = statusInfo?.icon || ListPlus;

      return (
        <Button
          variant={isInReadList ? "default" : "outline"}
          size="sm"
          className={cn("gap-2", className)}
          disabled={isLoading}
          onClick={handleTriggerClick}
        >
          <StatusIcon className="h-4 w-4" />
          {isInReadList ? statusInfo?.label : "Add to List"}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      );
    }

    // Default button variant
    const statusInfo = currentStatus ? getStatusInfo(currentStatus) : null;
    const StatusIcon = statusInfo?.icon || ListPlus;

    return (
      <Button
        variant={isInReadList ? "default" : "outline"}
        className={cn("flex-1 gap-2", className)}
        disabled={isLoading}
        onClick={handleTriggerClick}
      >
        <StatusIcon className="h-4 w-4" />
        {isInReadList ? statusInfo?.label : "Add to Reading List"}
        <ChevronDown className="h-3 w-3 opacity-50 ml-auto" />
      </Button>
    );
  };

  // If not authenticated, show sign-in button
  if (!isAuthenticated) {
    return (
      <SignInButton mode="modal">
        {variant === "icon" ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
              className
            )}
            title="Sign in to add to reading list"
            onClick={handleTriggerClick}
          >
            <ListPlus className="h-4 w-4 text-muted-foreground hover:text-blue-500" />
          </Button>
        ) : (
          <Button
            variant="outline"
            className={cn(
              variant === "compact" ? "gap-2" : "flex-1 gap-2",
              className
            )}
            onClick={handleTriggerClick}
          >
            <ListPlus className="h-4 w-4" />
            Add to Reading List
          </Button>
        )}
      </SignInButton>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{renderTrigger()}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <DropdownMenuLabel>
          {isInReadList ? "Change Status" : "Add to Reading List"}
        </DropdownMenuLabel>

        {/* Status Options */}
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleStatusSelect("want-to-read");
          }}
          className={cn(
            currentStatus === "want-to-read" &&
              getStatusInfo("want-to-read").bgColor
          )}
        >
          <BookmarkPlus
            className={cn("h-4 w-4 mr-2", getStatusInfo("want-to-read").color)}
          />
          Want to Read
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleStatusSelect("reading");
          }}
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
            handleStatusSelect("completed");
          }}
          className={cn(
            currentStatus === "completed" && getStatusInfo("completed").bgColor
          )}
        >
          <CheckCircle
            className={cn("h-4 w-4 mr-2", getStatusInfo("completed").color)}
          />
          Completed
        </DropdownMenuItem>

        {/* Remove Option (only if in list) */}
        {isInReadList && onRemove && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRemove();
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove from List
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
