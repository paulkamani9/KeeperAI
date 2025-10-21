"use client";

import React from "react";
import { useUser } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import { Library, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FavoriteToggle } from "@/components/shared/FavoriteToggle";
import { ReadingListDropdown } from "@/components/shared/ReadingListDropdown";
import { useReadList, type ReadingStatus } from "@/hooks/useReadList";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LibraryActionsDropdownProps {
  /** Book ID for library actions */
  bookId: string;
  /** Custom className */
  className?: string;
  /** Display variant */
  variant?: "default" | "compact";
}

/**
 * LibraryActionsDropdown - Dropdown for managing favorites and reading list
 *
 * Features:
 * - Add/Remove from Favorites
 * - Reading List management (Want to Read, Reading, Completed)
 * - Auth guard with sign-in prompt
 * - Visual status indicators
 * - Responsive design
 * - Accessible with proper ARIA labels
 *
 * Desktop-only component for summary actions
 */
export function LibraryActionsDropdown({
  bookId,
  className,
  variant = "default",
}: LibraryActionsDropdownProps) {
  const { user } = useUser();
  const {
    isInReadList,
    currentStatus,
    addBook,
    removeBook,
    updateReadingStatus,
    isLoading,
  } = useReadList(bookId);

  // Handle reading status change
  const handleStatusChange = async (status: ReadingStatus) => {
    try {
      if (!isInReadList) {
        await addBook(bookId, status);
        toast.success(`Added to Reading List: ${formatStatus(status)}`);
      } else if (currentStatus === status) {
        await removeBook(bookId);
        toast.success("Removed from Reading List");
      } else {
        await updateReadingStatus(bookId, status);
        toast.success(`Reading status updated: ${formatStatus(status)}`);
      }
    } catch (error) {
      toast.error("Failed to update reading list");
      console.error(error);
    }
  };

  // Handle add to reading list
  const handleAdd = async (status: ReadingStatus) => {
    try {
      await addBook(bookId, status);
      toast.success(`Added to Reading List: ${formatStatus(status)}`);
    } catch (error) {
      toast.error("Failed to add to reading list");
      console.error(error);
    }
  };

  // Handle remove from reading list
  const handleRemove = async () => {
    try {
      await removeBook(bookId);
      toast.success("Removed from Reading List");
    } catch (error) {
      toast.error("Failed to remove from reading list");
      console.error(error);
    }
  };

  // Format status for display
  const formatStatus = (status: ReadingStatus): string => {
    const labels = {
      "want-to-read": "Want to Read",
      reading: "Reading",
      completed: "Completed",
    };
    return labels[status];
  };

  // If not authenticated, show sign-in button
  if (!user) {
    return (
      <SignInButton mode="modal">
        <Button
          variant="ghost"
          size="sm"
          className={cn("shrink-0", className)}
          title="Sign in to manage library"
        >
          <Library className="h-4 w-4" />
          {variant === "default" && (
            <span className="hidden lg:inline-block ml-2">Library</span>
          )}
        </Button>
      </SignInButton>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("shrink-0", className)}
          aria-label="Manage library"
        >
          <Library className="h-4 w-4" />
          {variant === "default" && (
            <>
              <span className="hidden lg:inline-block ml-2">Library</span>
              <ChevronDown className="h-3 w-3 ml-1 opacity-50 hidden lg:inline-block" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <DropdownMenuLabel>Library Actions</DropdownMenuLabel>

        {/* Favorite Toggle */}
        <FavoriteToggle bookId={bookId} variant="menu-item" />

        <DropdownMenuSeparator />

        {/* Reading List Section - Embedded ReadingListDropdown content */}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Reading List
        </DropdownMenuLabel>

        <ReadingListDropdown
          currentStatus={currentStatus}
          isInReadList={isInReadList}
          onStatusChange={handleStatusChange}
          onAdd={handleAdd}
          onRemove={handleRemove}
          variant="icon"
          isAuthenticated={!!user}
          isLoading={isLoading}
          className="w-full justify-start hover:bg-accent"
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
