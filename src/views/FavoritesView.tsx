import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, BookOpen } from "lucide-react";
import Link from "next/link";

export function FavoritesView() {
  return (
    <div className="container mx-auto p-6 content-spacing">
      <div className="animate-fade-in">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Heart className="h-10 w-10 text-primary" />
          Your Favorites
        </h1>
        <p className="text-xl text-muted-foreground mb-8 reading-width">
          Keep track of your favorite books and discover new ones based on your
          preferences.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💟 Save Your Favorites
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Start exploring books and add them to your favorites to see them
              here!
            </p>
            <Button asChild className="w-full">
              <Link href="/">
                <BookOpen className="mr-2 h-4 w-4" />
                Discover Books
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card
          className="glass animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🤖 AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Get personalized book recommendations based on your favorite
              titles and reading history.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default FavoritesView;
