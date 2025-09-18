import Link from "next/link";
import { Search, Heart, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MainContent from "@/components/layout/MainContent";

/**
 * Home view with immersive, content-first design
 *
 * Features minimal text and focuses on visual hierarchy
 * Inspired by streaming platform landing pages
 */
export const HomeView = () => {
  const features = [
    {
      icon: Search,
      title: "Discover",
      description: "Find your next favorite book",
      href: "/search",
    },
    {
      icon: Heart,
      title: "Save",
      description: "Curate your reading list",
      href: "/favorites",
    },
    {
      icon: BookOpen,
      title: "Summarize",
      description: "Get AI-powered insights",
      href: "/summaries",
    },
  ];

  return (
    <MainContent maxWidth="xl" padding="lg">
      {/* Hero Section - Minimal and Immersive */}
      <section className="text-center py-16 md:py-24">
        <h1 className="text-4xl md:text-6xl font-black text-foreground mb-6">
          Your Books.
          <br />
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Organized.
          </span>
        </h1>

        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Discover, organize, and explore books with AI-powered insights
        </p>

        <Button
          size="lg"
          asChild
          className="text-lg px-8 py-6 shadow-glow hover:shadow-immersive transition-all duration-300"
        >
          <Link href="/search" className="flex items-center gap-2">
            Start Exploring
            <ArrowRight className="h-5 w-5" />
          </Link>
        </Button>
      </section>

      {/* Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 py-16">
        {features.map((feature, index) => {
          const Icon = feature.icon;

          return (
            <Card
              key={feature.title}
              className="group p-8 hover:shadow-card-hover transition-all duration-300 cursor-pointer glass-card animate-fade-up border-border/50"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <Link href={feature.href} className="block">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-6">
                    <Icon className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                  </div>

                  <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>

                  <p className="text-muted-foreground group-hover:text-foreground transition-colors">
                    {feature.description}
                  </p>
                </div>
              </Link>
            </Card>
          );
        })}
      </section>

      {/* CTA Section */}
      <section className="text-center py-16 border-t border-border/20">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Ready to dive in?
        </h2>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="outline" size="lg" asChild>
            <Link href="/search">Browse Books</Link>
          </Button>

          <Button size="lg" asChild>
            <Link href="/favorites">My Library</Link>
          </Button>
        </div>
      </section>
    </MainContent>
  );
};
