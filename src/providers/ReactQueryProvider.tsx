"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

interface ReactQueryProviderProps {
  children: ReactNode;
}

/**
 * React Query Provider with optimized configuration for KeeperAI
 *
 * Configured for book search caching with:
 * - 5-minute cache time for search results
 * - 30-second stale time for background refetches
 * - Retry logic optimized for book API endpoints
 */
export default function ReactQueryProvider({
  children,
}: ReactQueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache search results for 5 minutes
            gcTime: 1000 * 60 * 5,
            // Data considered fresh for 30 seconds
            staleTime: 1000 * 30,
            // Refetch on window focus for fresh book data
            refetchOnWindowFocus: true,
            // Retry failed requests with exponential backoff
            retry: (failureCount, error: any) => {
              // Don't retry on 404s (book not found)
              if (error?.status === 404) return false;
              // Don't retry on 401/403 (API key issues)
              if (error?.status === 401 || error?.status === 403) return false;
              // Retry up to 2 times for other errors
              return failureCount < 2;
            },
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            // Analytics mutations should not retry aggressively
            retry: 1,
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show devtools in development only */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
