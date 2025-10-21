"use client";

import { useUser, SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Clock, BookOpen } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookCover } from "@/components/shared/BookCover";
import MainContent from "@/components/shared/MainContent";

export function SavedSummariesView() {
  const { user, isLoaded } = useUser();

  const savedSummaries = useQuery(
    api.savedSummaries.getSavedSummaries,
    user ? { userId: user.id } : "skip"
  );

  if (!isLoaded) {
    return (
      <MainContent maxWidth="2xl" padding="lg">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainContent>
    );
  }

  if (!user) {
    return (
      <MainContent maxWidth="md" padding="lg">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <FileText className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-4">Save Your Summaries</h1>
          <p className="text-muted-foreground mb-8">
            Sign in to save AI-generated summaries and access them anytime.
          </p>
          <SignInButton mode="modal">
            <Button size="lg">Sign In to Continue</Button>
          </SignInButton>
        </div>
      </MainContent>
    );
  }

  const summaries = savedSummaries || [];

  return (
    <MainContent maxWidth="2xl" padding="lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Saved Summaries</h1>
        <p className="text-muted-foreground">
          {summaries.length === 0
            ? "You haven't saved any summaries yet"
            : `${summaries.length} ${
                summaries.length === 1 ? "summary" : "summaries"
              } saved`}
        </p>
      </div>

      {summaries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">
            Generate and save book summaries to see them here.
          </p>
          <Button asChild>
            <Link href="/">Discover Books</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {summaries.map((saved) => (
            <Link
              key={saved._id}
              href={`/book/${saved.book.id}/summary?type=${saved.summary.summaryType}`}
              className="block"
            >
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    {/* Book Cover */}
                    {saved.book.thumbnail && (
                      <BookCover
                        title={saved.book.title}
                        authors={saved.book.authors}
                        src={saved.book.thumbnail}
                        size="small"
                        clickable={false}
                        className="flex-shrink-0"
                      />
                    )}

                    {/* Summary Info */}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-1">
                        {saved.book.title}
                      </CardTitle>
                      <CardDescription className="mb-3">
                        {saved.book.authors.join(", ")}
                      </CardDescription>

                      {/* Summary Metadata */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span className="capitalize">
                            {saved.summary.summaryType.replace("-", " ")}{" "}
                            Summary
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          <span>{saved.summary.wordCount} words</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{saved.summary.readingTime} min read</span>
                        </div>

                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            saved.summary.status === "completed"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400"
                              : saved.summary.status === "generating"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {saved.summary.status}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {/* Summary Preview */}
                {saved.summary.content && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {saved.summary.content}
                    </p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </MainContent>
  );
}

export default SavedSummariesView;
