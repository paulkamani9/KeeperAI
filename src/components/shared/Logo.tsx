import React from "react";
import { cn } from "@/lib/utils";
import { Montserrat } from "next/font/google";




// Import Montserrat Extra Bold (900) using Next.js 15 font optimization
export const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["900"],
  display: "swap",
  variable: "--font-montserrat",
});

interface LogoTextProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  layout?: "horizontal" | "vertical"; // Kept for backward compatibility
}

/**
 * OutClever Text-Only Logo Component
 *
 * Philosophy: Presence over noise.
 * OUTCLEVER itself is the icon — strong, geometric, timeless.
 * When users see the word, they should feel: Smarter. Sharper. Faster.
 */
const OutCleverText = ({ size = "md", className }: LogoTextProps) => {
  const textSizes: Record<string, string> = {
    sm: "text-sm md:text-base",
    md: "text-lg md:text-xl",
    lg: "text-2xl md:text-3xl",
    xl: "text-3xl md:text-4xl lg:text-5xl",
  };

  return (
    <span
      className={cn(
        montserrat.className,
        "font-black uppercase tracking-wide select-none",
        "text-black dark:text-white",
        "transition-colors duration-300",
        // Subtle hover effect for interactivity
        "hover:opacity-90",
        textSizes[size],
        className
      )}
      style={{
        fontWeight: 900,
        letterSpacing: "0.02em",
      }}
      aria-label="OutClever"
    >
      OUTCLEVER
    </span>
  );
};

/**
 * OutClever Logo Component (Text-Only)
 *
 * Simplified to render only the wordmark.
 * The text itself carries the brand identity with bold, confident typography.
 */
const Logo = ({
  size = "md",
  className,
  layout = "horizontal", // Kept for backward compatibility but not used
}: LogoProps) => {
  // Suppress unused variable warning - layout kept for backward compatibility
  void layout;

  return (
    <div className={cn("inline-flex items-center justify-center", className)}>
      <OutCleverText size={size} />
    </div>
  );
};

// Export individual component for flexibility
export { OutCleverText };
export default Logo;
