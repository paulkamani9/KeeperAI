"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BookDescriptionProps {
  description: string;
  className?: string;
}

export function BookDescription({
  description,
  className,
}: BookDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const descriptionElement = descriptionRef.current;
    if (descriptionElement) {
      // Check if the content is overflowing
      setIsOverflowing(
        descriptionElement.scrollHeight > descriptionElement.clientHeight
      );
    }
  }, [description]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={cn("relative", className)}>
      <p
        ref={descriptionRef}
        data-testid="book-description"
        className={cn(
          "text-muted-foreground leading-relaxed whitespace-pre-wrap",
          !isExpanded && "max-h-32 overflow-hidden"
        )}
      >
        {description}
      </p>
      {(isOverflowing || isExpanded) && (
        <div className="mt-2">
          <Button
            variant="link"
            size="sm"
            onClick={toggleExpanded}
            aria-expanded={isExpanded}
            className="px-0"
          >
            {isExpanded ? "Read Less" : "Read More"}
          </Button>
        </div>
      )}
    </div>
  );
}
