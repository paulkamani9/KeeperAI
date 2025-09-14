"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

import { cn } from "@/lib/utils";
import {
  HeroSearchBar,
  BookCarousel,
  QuickExplore,
  popularSearches,
  trendingGenres,
  BookData,
} from "@/components/home";

export const HomeView = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const [favorites, setFavorites] = useState<BookData[]>([]);
  const [recommendations, setRecommendations] = useState<BookData[]>([]);
  const [curatedBooks, setCuratedBooks] = useState<BookData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for demonstration - replace with real API calls
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock book data - in production, this would come from your APIs
      const mockBooks: BookData[] = [
        {
          id: "1",
          title: "Atomic Habits",
          authors: ["James Clear"],
          description:
            "An Easy & Proven Way to Build Good Habits & Break Bad Ones",
          publishedDate: "2018-10-16",
          imageUrl:
            "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1655988385i/40121378.jpg",
          categories: ["Self-Help", "Productivity"],
          isFavorite: false,
          rating: 4.4,
        },
        {
          id: "2",
          title: "The Psychology of Money",
          authors: ["Morgan Housel"],
          description: "Timeless lessons on wealth, greed, and happiness",
          publishedDate: "2020-09-08",
          imageUrl:
            "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1581527774i/41881472.jpg",
          categories: ["Finance", "Business"],
          isFavorite: true,
          rating: 4.3,
        },
        {
          id: "3",
          title: "Dune",
          authors: ["Frank Herbert"],
          description: "The epic science fiction masterpiece",
          publishedDate: "1965-08-01",
          imageUrl:
            "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1555447414i/44767458.jpg",
          categories: ["Science Fiction", "Fantasy"],
          isFavorite: false,
          rating: 4.2,
        },
        {
          id: "4",
          title: "Thinking, Fast and Slow",
          authors: ["Daniel Kahneman"],
          description: "The groundbreaking insights into human decision-making",
          publishedDate: "2011-10-25",
          imageUrl:
            "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1317793965i/11468377.jpg",
          categories: ["Psychology", "Science"],
          isFavorite: false,
          rating: 4.1,
        },
        {
          id: "5",
          title: "The Midnight Library",
          authors: ["Matt Haig"],
          description:
            "A novel about all the choices that go into a life well-lived",
          publishedDate: "2020-08-13",
          imageUrl:
            "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1602190253i/52578297.jpg",
          categories: ["Fiction", "Philosophy"],
          isFavorite: true,
          rating: 4.0,
        },
        {
          id: "6",
          title: "Sapiens",
          authors: ["Yuval Noah Harari"],
          description: "A Brief History of Humankind",
          publishedDate: "2014-09-04",
          imageUrl:
            "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1420585954i/23692271.jpg",
          categories: ["History", "Anthropology"],
          isFavorite: false,
          rating: 4.4,
        },
      ];

      // Simulate different data for different sections
      setFavorites(mockBooks.filter((book) => book.isFavorite));
      setRecommendations(mockBooks.slice(0, 4));
      setCuratedBooks(mockBooks.slice(2, 6));
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const handleFavoriteToggle = (bookId: string) => {
    // Update favorites state
    setFavorites((prev) => {
      const book = [...recommendations, ...curatedBooks].find(
        (b) => b.id === bookId
      );
      if (!book) return prev;

      const isFavorite = prev.some((fav) => fav.id === bookId);
      if (isFavorite) {
        return prev.filter((fav) => fav.id !== bookId);
      } else {
        return [...prev, { ...book, isFavorite: true }];
      }
    });

    // Update other arrays
    const updateBookFavoriteStatus = (books: BookData[]) =>
      books.map((book) =>
        book.id === bookId ? { ...book, isFavorite: !book.isFavorite } : book
      );

    setRecommendations(updateBookFavoriteStatus);
    setCuratedBooks(updateBookFavoriteStatus);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section with Search Bar */}
      <section className="relative py-16 sm:py-20 lg:py-24">
        <div className="text-center space-y-8">
          {/* Welcome Text - Minimal and Clean */}
          <div className="animate-fade-in">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Discover Your Next
              <span className="text-primary"> Great Read</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Search millions of books or let AI recommend the perfect ones for
              you
            </p>
          </div>

          {/* Hero Search Bar - Central and Prominent */}
          <div className="animate-slide-up [animation-delay:200ms] px-4 sm:px-6 lg:px-8">
            <HeroSearchBar />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="pb-16 space-y-16">
        {/* Quick Explore Sections */}
        <div className="space-y-8 animate-slide-up [animation-delay:400ms]">
          <QuickExplore
            title="Popular Searches"
            items={popularSearches}
            variant="chips"
          />

          <QuickExplore
            title="Trending Genres"
            items={trendingGenres}
            variant="buttons"
          />
        </div>

        {/* Conditional Content Based on Authentication */}
        <div className="space-y-16">
          {isLoaded && isSignedIn ? (
            // Authenticated User Content
            <div className="space-y-16 animate-fade-in [animation-delay:600ms]">
              {/* Favorites Section */}
              {favorites.length > 0 && (
                <BookCarousel
                  title="Your Favorites"
                  books={favorites}
                  size="md"
                  showFavorites={true}
                  onFavoriteToggle={handleFavoriteToggle}
                  isLoading={isLoading}
                  emptyMessage="No favorites yet. Start exploring and save books you love!"
                />
              )}

              {/* Personalized Recommendations */}
              <BookCarousel
                title="Recommended for You"
                books={recommendations}
                size="md"
                showFavorites={true}
                onFavoriteToggle={handleFavoriteToggle}
                isLoading={isLoading}
                emptyMessage="We're learning your preferences. Start searching to get personalized recommendations!"
              />

              {/* Continue Reading / Recent Activity */}
              <BookCarousel
                title="Continue Exploring"
                books={curatedBooks}
                size="md"
                showFavorites={true}
                onFavoriteToggle={handleFavoriteToggle}
                isLoading={isLoading}
              />
            </div>
          ) : (
            // Guest User Content
            <div className="space-y-16 animate-fade-in [animation-delay:600ms]">
              {/* Curated Self-Help & Productivity */}
              <BookCarousel
                title="Discover Self-Help & Productivity Books"
                books={curatedBooks}
                size="md"
                showFavorites={false}
                isLoading={isLoading}
                emptyMessage="Loading curated picks for you..."
              />

              {/* Popular Books */}
              <BookCarousel
                title="Popular This Month"
                books={recommendations}
                size="md"
                showFavorites={false}
                isLoading={isLoading}
              />

              {/* Sign Up Call to Action */}
              <div className="mx-4 sm:mx-6 lg:mx-8">
                <div className="text-center py-16 space-y-8 bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl border border-border/30 backdrop-blur-sm">
                  <div className="space-y-4">
                    <h3 className="text-3xl sm:text-4xl font-bold text-foreground">
                      Want Personalized Recommendations?
                    </h3>
                    <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                      Sign up to save favorites, get AI-powered recommendations,
                      and access exclusive features.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                    <a
                      href="/sign-up"
                      className={cn(
                        "inline-flex items-center justify-center rounded-2xl px-10 py-4",
                        "bg-primary text-primary-foreground font-semibold text-lg",
                        "hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl"
                      )}
                    >
                      Get Started Free
                    </a>
                    <a
                      href="/sign-in"
                      className="text-primary hover:text-primary/80 font-semibold text-lg transition-colors"
                    >
                      Already have an account? Sign in
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
