"use client";

import { useUser, SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { BookCard } from "@/components/shared/BookCard";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2 } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import MainContent from "@/components/shared/MainContent";
import { useReadList } from "@/hooks/useReadList";
import { toast } from "sonner";
import type { Book } from "@/types/book";

type StatusFilter = "all" | "want-to-read" | "reading" | "completed";

export function ReadListView() {
  const { user, isLoaded } = useUser();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Query read list
  const readList = useQuery(
    api.readList.getReadList,
    user
      ? {
          userId: user.id,
          status: statusFilter === "all" ? undefined : statusFilter,
        }
      : "skip"
  );

  // Initialize reading list hook for managing books
  const { updateReadingStatus, removeBook } = useReadList();

  // Handler for status changes
  const handleStatusChange = async (
    bookId: string,
    status: "want-to-read" | "reading" | "completed"
  ) => {
    if (!user) return;

    try {
      await updateReadingStatus(bookId, status);
      toast.success(
        `Status updated to "${getStatusLabel(status).replace(/-/g, " ")}"`
      );
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status. Please try again.");
    }
  };

  // Handler for removing from reading list
  const handleRemove = async (bookId: string) => {
    if (!user) return;

    try {
      await removeBook(bookId);
      toast.success("Removed from reading list");
    } catch (error) {
      console.error("Error removing book:", error);
      toast.error("Failed to remove book. Please try again.");
    }
  };

  // Helper to get readable status label
  const getStatusLabel = (status: "want-to-read" | "reading" | "completed") => {
    switch (status) {
      case "want-to-read":
        return "Want to Read";
      case "reading":
        return "Reading";
      case "completed":
        return "Completed";
      default:
        return status;
    }
  };

  // Loading state
  if (!isLoaded) {
    return (
      <MainContent maxWidth="2xl" padding="lg">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainContent>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <MainContent maxWidth="md" padding="lg">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <BookOpen className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-4">Track Your Reading</h1>
          <p className="text-muted-foreground mb-8">
            Sign in to create your reading list and track your progress.
          </p>
          <SignInButton mode="modal">
            <Button size="lg">Sign In to Continue</Button>
          </SignInButton>
        </div>
      </MainContent>
    );
  }

  const readListItems = readList || [];

  return (
    <MainContent maxWidth="2xl" padding="lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Reading List</h1>
        <p className="text-muted-foreground">
          {readListItems.length === 0
            ? "Your reading list is empty"
            : `${readListItems.length} ${
                readListItems.length === 1 ? "book" : "books"
              } in your list`}
        </p>
      </div>

      {/* Status Filter Tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={(v: string) => setStatusFilter(v as StatusFilter)}
        className="mb-8"
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="want-to-read">Want to Read</TabsTrigger>
          <TabsTrigger value="reading">Reading</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6">
          {readListItems.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">
                {statusFilter === "all"
                  ? "Start adding books to your reading list."
                  : `No books in "${statusFilter.replace("-", " ")}" status.`}
              </p>
              <Button asChild>
                <Link href="/">Discover Books</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {readListItems.map((item) => {
                const book: Book = item.book;

                return (
                  <BookCard
                    key={item._id}
                    book={book}
                    showActions={true}
                    showReadingListActions={true}
                    currentReadingStatus={item.status}
                    onStatusChange={handleStatusChange}
                    onRemove={handleRemove}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </MainContent>
  );
}

export default ReadListView;
