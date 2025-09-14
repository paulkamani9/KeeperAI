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

// Keeper AI Symbol Component - Abstract geometric "K" that suggests protection/keeping
const KeeperSymbol = ({ size = "md", className }: LogoSymbolProps) => {
  const dimensions: Record<string, { width: number; height: number }> = {
    sm: { width: 20, height: 20 },
    md: { width: 28, height: 28 },
    lg: { width: 40, height: 40 },
    xl: { width: 56, height: 56 },
  };

  const { width, height } = dimensions[size];

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-shrink-0", className)}
      aria-hidden="true"
    >
      {/* Main protective container shape - inspired by vault/keeping concept */}
      <defs>
        <linearGradient id="keeperGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" className="[stop-color:hsl(var(--primary))]" />
          <stop
            offset="100%"
            className="[stop-color:hsl(var(--primary)/0.8)]"
          />
        </linearGradient>
      </defs>

      {/* Outer protective frame */}
      <path
        d="M4 8C4 5.79086 5.79086 4 8 4H24C26.2091 4 28 5.79086 28 8V24C28 26.2091 26.2091 28 24 28H8C5.79086 28 4 26.2091 4 24V8Z"
        fill="url(#keeperGradient)"
        className="transition-colors duration-200"
      />

      {/* Inner geometric "K" - powerful and angular */}
      <path
        d="M10 10V22M10 16L18 10M10 16L18 22"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* AI accent dot - small but significant */}
      <circle
        cx="22"
        cy="10"
        r="2"
        fill="#00afa7"
        className="opacity-90"
      />
    </svg>
  );
};

// Keeper AI Text Component
const KeeperText = ({ size = "md", className }: LogoTextProps) => {
  const textSizes: Record<string, string> = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-2xl",
  };

  return (
    <span
      className={cn(
        "font-bold tracking-tight text-foreground",
        "transition-colors duration-200",
        textSizes[size],
        className
      )}
    >
      Keeper <span className="text-primary font-medium">AI</span>
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
