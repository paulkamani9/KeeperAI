import React from "react";
import { BookOpen, Brain, Search, Zap } from "lucide-react";
import Logo from "@/components/shared/Logo";

export const AuthHero = () => {
  return (
    <div className="hidden flex-1 items-center justify-center p-6 md:p-10 lg:flex relative z-10">
      <div className="max-w-lg text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="xl" />
        </div>

        {/* Main heading */}
        <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          Unlock the Power of Books with AI
        </h1>

        {/* Subheading */}
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          Search millions of books and get instant, intelligent summaries
          powered by AI.
          <span className="block mt-2 font-medium text-primary">
            Transform how you discover and digest knowledge.
          </span>
        </p>

        {/* Feature list */}
        <ul className="space-y-6 text-left">
          <li className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
              <Search className="size-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Smart Book Discovery
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Search through millions of books with intelligent filtering and
                recommendations.
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
              <Zap className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Instant Insights</p>
              <p className="text-muted-foreground text-sm mt-1">
                Save hours of reading time with concise, actionable book
                summaries.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex-shrink-0">
              <BookOpen className="size-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Curated Knowledge</p>
              <p className="text-muted-foreground text-sm mt-1">
                Perfect for productivity enthusiasts exploring business,
                psychology, and self-improvement.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};
