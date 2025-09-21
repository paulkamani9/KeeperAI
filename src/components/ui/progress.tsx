import * as React from "react";

import { cn } from "../../lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  className?: string;
  /** Show smooth animation for scroll-based progress */
  smooth?: boolean;
  /** Custom color theme for the progress bar */
  variant?: "default" | "reading" | "success";
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    { className, value = 0, smooth = false, variant = "default", ...props },
    ref
  ) => {
    const clampedValue = Math.min(Math.max(value, 0), 100);

    const variantStyles = {
      default: "bg-primary",
      reading: "bg-gradient-to-r from-blue-500 to-indigo-500",
      success: "bg-gradient-to-r from-green-500 to-emerald-500",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-secondary",
          "h-4", // Default height
          className
        )}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        {...props}
      >
        <div
          className={cn(
            "h-full transition-all ease-in-out",
            smooth ? "duration-150" : "duration-300",
            variantStyles[variant],
            // Add subtle animation for reading progress
            variant === "reading" && "animate-pulse"
          )}
          style={{
            width: `${clampedValue}%`,
            // Add subtle glow effect for reading variant
            ...(variant === "reading" && {
              boxShadow: "0 0 10px rgba(59, 130, 246, 0.4)",
            }),
          }}
        />

        {/* Optional percentage label overlay */}
        {clampedValue > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="sr-only">{clampedValue}% complete</span>
          </div>
        )}
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
