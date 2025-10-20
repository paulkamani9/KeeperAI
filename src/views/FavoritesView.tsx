"use client";

import { useUser, SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { BookCard } from "@/components/search/BookCard";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import { convexBookToBook } from "@/lib/convexBookHelpers";
import Link from "next/link";
import MainContent from "@/components/shared/MainContent";
import type { Book } from "@/types/book";
import { fa } from "zod/v4/locales";

export function FavoritesView() {
  const { user, isLoaded } = useUser();

  // Query favorites only if user is signed in
  const favorites = useQuery(
    api.favorites.getFavorites,
    user ? { userId: user.id } : "skip"
  );

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

  // Not signed in - show sign in prompt
  if (!user) {
    return (
      <MainContent maxWidth="md" padding="lg">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Heart className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-4">Save Your Favorites</h1>
          <p className="text-muted-foreground mb-8">
            Sign in to save your favorite books and access them anywhere.
          </p>
          <SignInButton mode="modal">
            <Button size="lg">Sign In to Continue</Button>
          </SignInButton>
        </div>
      </MainContent>
    );
  }

  // Signed in - show favorites
  const favoritesWithBooks = favorites || [];

  return (
    <MainContent maxWidth="2xl" padding="lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Favorites</h1>
        <p className="text-muted-foreground">
          {favoritesWithBooks.length === 0
            ? "You haven't favorited any books yet"
            : `${favoritesWithBooks.length} ${
                favoritesWithBooks.length === 1 ? "book" : "books"
              } saved`}
        </p>
      </div>

      {favoritesWithBooks.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">
            Start exploring and favorite books to see them here.
          </p>
          <Button asChild>
            <Link href="/">Discover Books</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favoritesWithBooks.map((favorite) => {
            const book: Book = favorite.book;

            return (
              <BookCard
                key={favorite._id}
                book={book}
                isFavorite={true}
                showActions={true}
              />
            );
          })}
        </div>
      )}
    </MainContent>
  );
}

export default FavoritesView;
