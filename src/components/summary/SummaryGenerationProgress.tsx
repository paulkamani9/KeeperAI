/**
 * Summary Generation Progress Component
 *
 * Displays progress, loading states, and error handling for AI summary generation.
 * Provides user feedback during the generation process with retry capabilities.
 */

import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import type { SummaryType } from "../../types/summary";
import { getSummaryTypeDescription } from "../../types/summary";

/**
 * Props for SummaryGenerationProgress component
 */
interface SummaryGenerationProgressProps {
  /** Current generation state */
  isGenerating: boolean;

  /** Generation progress (0-100) */
  progress?: number;

  /** Estimated time remaining in seconds */
  estimatedTime?: number;

  /** Error message if generation failed */
  error: Error | null;

  /** Whether retry is possible */
  canRetry: boolean;

  /** Summary type being generated */
  summaryType: SummaryType;

  /** Function to retry generation */
  onRetry: () => void;

  /** Function to cancel generation */
  onCancel?: () => void;

  /** Whether generation was successful */
  isSuccess?: boolean;

  /** Custom class name */
  className?: string;
}

/**
 * Summary generation progress states
 */
type GenerationState = "idle" | "generating" | "success" | "error";

/**
 * Progress messages for different stages
 */
const PROGRESS_MESSAGES = {
  0: "Initializing AI summary generation...",
  10: "Analyzing book content and structure...",
  25: "Processing key themes and concepts...",
  50: "Generating structured summary content...",
  75: "Refining and formatting output...",
  90: "Finalizing summary...",
  100: "Summary generation complete!",
} as const;

/**
 * SummaryGenerationProgress Component
 *
 * Provides visual feedback during summary generation with progress indication,
 * error handling, and retry capabilities. Follows the design system patterns.
 *
 * @example
 * ```tsx
 * <SummaryGenerationProgress
 *   isGenerating={isGenerating}
 *   progress={progress}
 *   estimatedTime={30}
 *   error={error}
 *   canRetry={canRetry}
 *   summaryType="concise"
 *   onRetry={handleRetry}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export function SummaryGenerationProgress({
  isGenerating,
  progress = 0,
  estimatedTime,
  error,
  canRetry,
  summaryType,
  onRetry,
  onCancel,
  isSuccess = false,
  className = "",
}: SummaryGenerationProgressProps) {
  // Determine current state
  const state: GenerationState = error
    ? "error"
    : isSuccess
      ? "success"
      : isGenerating
        ? "generating"
        : "idle";

  // Get progress message based on current progress
  const progressMessage = React.useMemo(() => {
    if (error) return "Generation failed";
    if (isSuccess) return "Summary generated successfully!";
    if (!isGenerating) return "Ready to generate summary";

    // Find the appropriate progress message
    const progressKeys = Object.keys(PROGRESS_MESSAGES)
      .map(Number)
      .sort((a, b) => a - b);

    const currentKey = progressKeys.find((key) => progress <= key) || 100;
    return PROGRESS_MESSAGES[currentKey as keyof typeof PROGRESS_MESSAGES];
  }, [progress, isGenerating, error, isSuccess]);

  // Calculate time remaining
  const timeRemaining = React.useMemo(() => {
    if (!isGenerating || !estimatedTime || !progress) return null;

    const progressFraction = Math.max(progress / 100, 0.1); // Avoid division by zero
    const elapsed = (progress / 100) * estimatedTime;
    const remaining = Math.max(estimatedTime - elapsed, 0);

    return Math.ceil(remaining);
  }, [progress, estimatedTime, isGenerating]);

  // Format time display
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Get summary type description
  const summaryDescription = getSummaryTypeDescription(summaryType);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary Type Header */}
      <div className="flex items-center gap-3">
        <div
          className="text-2xl"
          role="img"
          aria-label={summaryDescription.title}
        >
          {summaryDescription.icon}
        </div>
        <div>
          <h3 className="font-semibold text-foreground">
            {summaryDescription.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {summaryDescription.description} • {summaryDescription.readTime}
          </p>
        </div>
      </div>

      {/* Progress State Display */}
      {state === "generating" && (
        <div className="space-y-3">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Summary generation progress"
              className="relative w-full overflow-hidden rounded-full bg-secondary h-2"
            >
              <div
                className="h-full bg-primary transition-all duration-300 ease-in-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{progressMessage}</span>
              {timeRemaining && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(timeRemaining)} remaining
                </span>
              )}
            </div>
          </div>

          {/* Generation Animation */}
          <div className="flex items-center justify-center p-4 rounded-lg bg-muted/30">
            <Sparkles className="h-5 w-5 mr-2 animate-spin text-primary" />
            <span className="text-sm font-medium">
              Generating {summaryDescription.title.toLowerCase()}...
            </span>
          </div>

          {/* Cancel Button */}
          {onCancel && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="text-muted-foreground"
              >
                Cancel Generation
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Success State */}
      {state === "success" && (
        <Alert className="border-green-200 bg-green-50 text-green-900">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>Summary Generated Successfully!</AlertTitle>
          <AlertDescription>
            Your {summaryDescription.title.toLowerCase()} is ready to read.
          </AlertDescription>
        </Alert>
      )}

      {/* Error State */}
      {state === "error" && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Generation Failed</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">{error.message}</p>

            {canRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Idle State Helper */}
      {state === "idle" && (
        <div className="text-center p-4 rounded-lg border-2 border-dashed border-muted-foreground/30">
          <p className="text-sm text-muted-foreground mb-2">
            Ready to generate {summaryDescription.title.toLowerCase()}
          </p>
          <p className="text-xs text-muted-foreground">
            Estimated generation time: ~{formatTime(estimatedTime || 30)}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Simplified progress indicator for compact displays
 */
interface SummaryGenerationIndicatorProps {
  /** Whether generation is active */
  isActive: boolean;

  /** Progress percentage */
  progress?: number;

  /** Summary type */
  summaryType: SummaryType;

  /** Custom class name */
  className?: string;
}

/**
 * Compact summary generation indicator
 */
export function SummaryGenerationIndicator({
  isActive,
  progress = 0,
  summaryType,
  className = "",
}: SummaryGenerationIndicatorProps) {
  const summaryDescription = getSummaryTypeDescription(summaryType);

  if (!isActive) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}
    >
      <Sparkles className="h-4 w-4 animate-spin text-primary" />
      <span>
        Generating {summaryDescription.title.toLowerCase()}...{" "}
        {Math.round(progress)}%
      </span>
    </div>
  );
}

/**
 * Generation time estimate component
 */
interface GenerationTimeEstimateProps {
  /** Summary type */
  summaryType: SummaryType;

  /** Whether to show detailed estimate */
  detailed?: boolean;

  /** Custom class name */
  className?: string;
}

/**
 * Shows estimated generation time for a summary type
 */
export function GenerationTimeEstimate({
  summaryType,
  detailed = false,
  className = "",
}: GenerationTimeEstimateProps) {
  const summaryDescription = getSummaryTypeDescription(summaryType);

  // Estimate generation time based on summary type
  const estimatedSeconds = {
    concise: 15,
    detailed: 45,
    analysis: 35,
    practical: 25,
  }[summaryType];

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `~${seconds}s`;
    return `~${Math.ceil(seconds / 60)}min`;
  };

  return (
    <div
      className={`flex items-center gap-1 text-sm text-muted-foreground ${className}`}
    >
      <Clock className="h-3 w-3" />
      <span>
        {detailed ? (
          <>Generation time: {formatTime(estimatedSeconds)}</>
        ) : (
          formatTime(estimatedSeconds)
        )}
      </span>
    </div>
  );
}

// Export types for external use
export type { SummaryGenerationProgressProps };
