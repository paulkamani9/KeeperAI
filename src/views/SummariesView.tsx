import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BookOpen, Sparkles } from "lucide-react";
import Link from "next/link";

export function SummariesView() {
  return (
    <div className="container mx-auto p-6 content-spacing">
      <div className="animate-fade-in">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <FileText className="h-10 w-10 text-primary" />
          Saved Summaries
        </h1>
        <p className="text-xl text-muted-foreground mb-8 reading-width">
          Access all your saved AI-generated book summaries in one place.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Powered Summaries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Generate intelligent, concise summaries for any book and save them
              here for quick access.
            </p>
            <Button asChild className="w-full">
              <Link href="/">
                <BookOpen className="mr-2 h-4 w-4" />
                Start Exploring
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
              📚 Smart Organization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your summaries are automatically organized and searchable, making
              it easy to find exactly what you need.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SummariesView;
