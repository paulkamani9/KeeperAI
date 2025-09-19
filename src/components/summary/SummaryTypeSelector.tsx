"use client";

import React from "react";
import { useState } from "react";
import { ChevronDown, Clock, Brain, Target, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Summary types available for generation
 */
export type SummaryType = "concise" | "detailed" | "analysis" | "practical";

interface SummaryTypeOption {
  /** Unique identifier */
  value: SummaryType;
  /** Display name */
  label: string;
  /** Short description */
  description: string;
  /** Estimated reading time */
  readingTime: string;
  /** Icon component */
  icon: typeof Clock;
  /** Example of what this type provides */
  example: string;
}

/**
 * Configuration for each summary type
 */
const SUMMARY_TYPES: SummaryTypeOption[] = [
  {
    value: "concise",
    label: "Concise",
    description: "Quick overview and key points",
    readingTime: "2-3 min read",
    icon: Clock,
    example: "Main themes, key takeaways, and essential insights",
  },
  {
    value: "detailed",
    label: "Detailed",
    description: "Chapter-by-chapter breakdown",
    readingTime: "8-10 min read",
    icon: Brain,
    example: "Comprehensive analysis of each chapter and section",
  },
  {
    value: "analysis",
    label: "Analysis",
    description: "Critical analysis of themes and style",
    readingTime: "5-7 min read",
    icon: Target,
    example: "Writing style, literary techniques, and deeper meaning",
  },
  {
    value: "practical",
    label: "Practical",
    description: "Actionable takeaways for your life",
    readingTime: "4-6 min read",
    icon: Lightbulb,
    example: "Apply lessons, tips, and strategies to daily life",
  },
];

interface SummaryTypeSelectorProps {
  /** Currently selected summary type */
  value?: SummaryType;
  /** Callback when selection changes */
  onValueChange?: (value: SummaryType) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Loading state for summary generation */
  loading?: boolean;
  /** Custom className for styling */
  className?: string;
  /** Compact variant for smaller spaces */
  variant?: "default" | "compact";
}

/**
 * SummaryTypeSelector - Dropdown component for selecting summary type
 *
 * Features:
 * - Four predefined summary types with descriptions
 * - Icons and reading time estimates
 * - Keyboard navigation support
 * - Accessible with proper ARIA labels
 * - Loading and disabled states
 * - Compact variant for smaller layouts
 */
export function SummaryTypeSelector({
  value = "concise",
  onValueChange,
  disabled = false,
  loading = false,
  className,
  variant = "default",
}: SummaryTypeSelectorProps) {
  // Find the currently selected option
  const selectedOption =
    SUMMARY_TYPES.find((option) => option.value === value) || SUMMARY_TYPES[0];
  const SelectedIcon = selectedOption.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || loading}
          className={cn(
            "justify-between text-left font-normal",
            variant === "compact" ? "h-9 px-3 text-sm" : "h-11 px-4",
            loading && "opacity-50 cursor-not-allowed",
            className
          )}
          aria-label={`Select summary type. Currently selected: ${selectedOption.label}`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <SelectedIcon
              className={cn(
                "shrink-0 text-muted-foreground",
                variant === "compact" ? "h-3 w-3" : "h-4 w-4"
              )}
            />
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "font-medium truncate",
                  variant === "compact" ? "text-sm" : "text-sm"
                )}
              >
                {selectedOption.label}
              </div>
              {variant === "default" && (
                <div className="text-xs text-muted-foreground truncate">
                  {selectedOption.readingTime}
                </div>
              )}
            </div>
          </div>
          <ChevronDown
            className={cn(
              "shrink-0 text-muted-foreground",
              variant === "compact" ? "h-3 w-3" : "h-4 w-4"
            )}
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-80 p-0"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <DropdownMenuLabel className="px-4 py-3 text-sm font-semibold">
          Choose Summary Type
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(newValue) => {
            if (
              onValueChange &&
              (newValue === "concise" ||
                newValue === "detailed" ||
                newValue === "analysis" ||
                newValue === "practical")
            ) {
              onValueChange(newValue as SummaryType);
            }
          }}
          className="p-2 space-y-1"
        >
          {SUMMARY_TYPES.map((option) => {
            const Icon = option.icon;
            const isSelected = value === option.value;

            return (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-colors",
                  "focus:bg-accent/50 data-[state=checked]:bg-accent/30",
                  "hover:bg-accent/20"
                )}
                disabled={disabled || loading}
              >
                <div className="flex items-start gap-3 w-full min-w-0">
                  <Icon
                    className={cn(
                      "shrink-0 mt-0.5",
                      "h-4 w-4",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={cn(
                          "font-medium text-sm",
                          isSelected ? "text-foreground" : "text-foreground/90"
                        )}
                      >
                        {option.label}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {option.readingTime}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                      {option.description}
                    </p>

                    <p className="text-xs text-muted-foreground/80 italic leading-relaxed">
                      {option.example}
                    </p>
                  </div>
                </div>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>

        {loading && (
          <>
            <DropdownMenuSeparator />
            <div className="px-4 py-3 text-xs text-muted-foreground text-center">
              Generating summary...
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Hook to get summary type configuration
 */
export function useSummaryTypeConfig(type: SummaryType) {
  return (
    SUMMARY_TYPES.find((option) => option.value === type) || SUMMARY_TYPES[0]
  );
}

/**
 * Get all available summary types
 */
export function getSummaryTypes(): SummaryTypeOption[] {
  return [...SUMMARY_TYPES];
}

// Export types for external use
export type { SummaryTypeOption };
