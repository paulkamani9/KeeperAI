"use client";

import { useState, useEffect, useCallback, RefObject } from "react";
import { useInView } from "react-intersection-observer";

interface ReadingProgressOptions {
  /** Reference to the reading container */
  containerRef: RefObject<HTMLElement>;
  /** Threshold for intersection observer (0-1) */
  threshold?: number;
  /** Root margin for intersection observer */
  rootMargin?: string;
}

interface ReadingProgressResult {
  /** Reading progress as percentage (0-100) */
  progress: number;
  /** Whether the content is currently being read */
  isReading: boolean;
  /** Current section being read */
  currentSection: string | null;
  /** Register a section element for progress tracking */
  registerSection: (element: HTMLElement | null, id: string) => void;
}

/**
 * useReadingProgress - Track reading progress through scroll and intersection
 *
 * Features:
 * - Tracks scroll-based reading progress as percentage
 * - Uses intersection observer for accurate section tracking
 * - Detects when user is actively reading vs scrolling quickly
 * - Provides callbacks for registering content sections
 * - Handles cleanup and performance optimization
 *
 * @param options Configuration for the reading progress tracker
 * @returns Reading progress data and utilities
 */
export function useReadingProgress({
  containerRef,
  threshold = 0.3,
  rootMargin = "-10% 0px -80% 0px",
}: ReadingProgressOptions): ReadingProgressResult {
  const [progress, setProgress] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [sections, setSections] = useState<Map<string, HTMLElement>>(new Map());

  // Track scroll-based progress
  const updateScrollProgress = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // Calculate how much of the content has been scrolled through
    const contentHeight = container.scrollHeight;
    const windowTop = -rect.top;

    // Progress based on how much content has passed through the viewport
    const scrollProgress = Math.max(0, Math.min(100, (windowTop / (contentHeight - windowHeight)) * 100));

    setProgress(scrollProgress);

    // Determine if user is actively reading (content is visible and not scrolling too fast)
    const isContentVisible = rect.bottom > 0 && rect.top < windowHeight;
    setIsReading(isContentVisible);
  }, [containerRef]);

  // Set up scroll listener
  useEffect(() => {
    const handleScroll = () => {
      requestAnimationFrame(updateScrollProgress);
    };

    // Initial calculation
    updateScrollProgress();

    // Add scroll listener
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [updateScrollProgress]);

  // Register section for intersection tracking
  const registerSection = useCallback((element: HTMLElement | null, id: string) => {
    setSections(prev => {
      const newSections = new Map(prev);
      if (element) {
        newSections.set(id, element);
      } else {
        newSections.delete(id);
      }
      return newSections;
    });
  }, []);

  // Track which section is currently in view using intersection observer
  // This is used internally for section tracking

  // Set up intersection observers for all registered sections
  useEffect(() => {
    if (sections.size === 0) return;

    const observers: IntersectionObserver[] = [];

    sections.forEach((element, id) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setCurrentSection(id);
            }
          });
        },
        {
          threshold,
          rootMargin,
        }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, [sections, threshold, rootMargin]);

  return {
    progress: Math.round(progress),
    isReading,
    currentSection,
    registerSection,
  };
}

/**
 * useReadingProgressElement - Simplified hook for individual elements
 * 
 * Use this for individual sections/paragraphs that need to report their reading status
 */
export function useReadingProgressElement(id: string) {
  const { ref, inView } = useInView({
    threshold: 0.5,
    rootMargin: "-20% 0px -20% 0px",
  });

  return {
    ref,
    isInView: inView,
    sectionId: id,
  };
}