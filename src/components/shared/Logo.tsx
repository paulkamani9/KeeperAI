import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** show or hide the wordmark next to the icon */
  showText?: boolean;
  /** accent color for the AI node (hex or any valid CSS color) */
  accentColor?: string;
}

const Logo = ({
  size = "md",
  className,
  showText = true,
  accentColor = "#4f46e5",
}: LogoProps) => {
  const dimensions: Record<
    string,
    { width: number; height: number; fontSize: string }
  > = {
    sm: { width: 20, height: 20, fontSize: "text-sm" },
    md: { width: 28, height: 28, fontSize: "text-base" },
    lg: { width: 40, height: 40, fontSize: "text-lg" },
    xl: { width: 56, height: 56, fontSize: "text-2xl" },
  };

  const { width, height, fontSize } = dimensions[size];

  return (
    <div
      className={cn("inline-flex items-center gap-3", className)}
      style={{ lineHeight: 1 }}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="text-slate-900 dark:text-white"
      >
        {/* Left page */}
        <path
          d="M3.5 5.5C3.5 5.22386 3.72386 5 4 5H11.2C11.4972 5 11.7589 5.15018 11.8995 5.39391C12.0401 5.63765 12.0491 5.94186 11.925 6.196L10.2 9.5C9.987 9.950 9.8 10.8 9.8 11.5V18.5C9.8 18.7761 9.57614 19 9.3 19H4C3.72386 19 3.5 18.7761 3.5 18.5V5.5Z"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Right page */}
        <path
          d="M12.5 5C12.5 4.72386 12.7239 4.5 13 4.5H20C20.2761 4.5 20.5 4.72386 20.5 5V18.5C20.5 18.7761 20.2761 19 20 19H13.7C13.4239 19 13.2 18.7761 13.2 18.5V6.5C13.2 6 13 5 12.5 5Z"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Page lines (minimal) */}
        <path
          d="M6.5 9.5H14.5"
          stroke="currentColor"
          strokeWidth={1}
          strokeLinecap="round"
        />
        <path
          d="M6.5 12.5H12.2"
          stroke="currentColor"
          strokeWidth={1}
          strokeLinecap="round"
        />

        {/* Small AI node (accent) */}
        <circle cx="17.5" cy="7.5" r="1.2" fill={accentColor} />
      </svg>

      {showText && (
        <span
          className={cn(
            "font-semibold tracking-tight text-slate-900 dark:text-white",
            fontSize
          )}
        >
          KeeperAI
        </span>
      )}
    </div>
  );
};

export default Logo;
