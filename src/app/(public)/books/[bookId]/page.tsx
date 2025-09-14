"use client";

import React from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function BookDetailPage() {
  const params = useParams();
  const bookId = params.bookId as string;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Placeholder Content */}
        <div className="text-center py-12 space-y-4">
          <div className="text-4xl">📖</div>
          <h1 className="text-2xl font-bold text-foreground">
            Book Details Page
          </h1>
          <p className="text-muted-foreground">Book ID: {bookId}</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This is a placeholder for the book detail page. The full
            implementation would show book information, summaries, comments, and
            recommendations.
          </p>
        </div>
      </div>
    </div>
  );
}
