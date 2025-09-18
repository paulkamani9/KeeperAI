import React from "react";
import { cn } from "@/lib/utils";

interface MainContentProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
}

/**
 * Main content wrapper with responsive constraints and padding
 *
 * Features:
 * - Content-first responsive design
 * - Customizable max-width constraints
 * - Consistent padding system
 * - Optimized for immersive content browsing
 */
export default function MainContent({
  children,
  className,
  maxWidth = "2xl",
  padding = "md",
}: MainContentProps) {
  const maxWidthClasses = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    full: "max-w-none",
  };

  const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-6 md:p-8",
    lg: "p-8 md:p-12",
  };

  return (
    <div
      className={cn(
        "mx-auto w-full",
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

MainContent.displayName = "MainContent";
