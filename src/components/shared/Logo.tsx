import React from "react";
import { cn } from "@/lib/utils";

interface LogoSymbolProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

interface LogoTextProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showText?: boolean;
}

// Keeper AI Symbol Component - Modern, minimal "K" inspired by streaming platforms
const KeeperSymbol = ({ size = "md", className }: LogoSymbolProps) => {
  const dimensions: Record<string, { width: number; height: number }> = {
    sm: { width: 24, height: 24 },
    md: { width: 32, height: 32 },
    lg: { width: 48, height: 48 },
    xl: { width: 64, height: 64 },
  };

  const { width, height } = dimensions[size];

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "flex-shrink-0 transition-transform duration-200 hover:scale-105",
        className
      )}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="keeperGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" className="[stop-color:hsl(var(--primary))]" />
          <stop
            offset="100%"
            className="[stop-color:hsl(var(--primary)/0.7)]"
          />
        </linearGradient>

        {/* Glow effect for dark mode */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Modern circular container */}
      <circle
        cx="16"
        cy="16"
        r="14"
        fill="url(#keeperGradient)"
        className="transition-all duration-300"
        filter="url(#glow)"
      />

      {/* Sleek "K" - Netflix/Spotify inspired */}
      <path
        d="M9 8V24M9 16L17 8M9 16L17 24"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-sm"
      />

      {/* AI indicator - subtle blue dot */}
      <circle cx="23" cy="9" r="2" fill="#4a9eff" className="animate-pulse" />
    </svg>
  );
};

// Keeper AI Text Component - Modern, minimal typography
const KeeperText = ({ size = "md", className }: LogoTextProps) => {
  const textSizes: Record<string, string> = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl",
    xl: "text-3xl",
  };

  return (
    <span
      className={cn(
        "font-black tracking-tight text-foreground",
        "transition-colors duration-300",
        textSizes[size],
        className
      )}
    >
      Keeper{" "}
      <span className="font-black bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
        AI
      </span>
    </span>
  );
};

// Combined Logo Component
const Logo = ({ size = "md", className, showText = true }: LogoProps) => {
  const gapSizes: Record<string, string> = {
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-3",
    xl: "gap-4",
  };

  return (
    <div className={cn("inline-flex items-center", gapSizes[size], className)}>
      <KeeperSymbol size={size} />
      {showText && <KeeperText size={size} />}
    </div>
  );
};

// Export individual components for flexibility
export { KeeperSymbol, KeeperText };
export default Logo;
