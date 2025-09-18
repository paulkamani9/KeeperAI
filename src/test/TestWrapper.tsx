/**
 * Test Wrapper Component
 *
 * Provides all necessary providers for testing React components.
 * This wrapper ensures components have access to React Query, themes,
 * and other context providers during testing.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';

interface TestWrapperProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

/**
 * Creates a fresh QueryClient for each test to ensure isolation
 */
const createTestQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry during tests
        gcTime: 0, // Disable cache
        staleTime: 0, // Always consider data stale in tests
      },
      mutations: {
        retry: false,
      },
    },
  });
};

/**
 * Test wrapper that provides all necessary context providers
 */
export function TestWrapper({ children, queryClient }: TestWrapperProps) {
  const testQueryClient = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="keeperai-theme"
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/**
 * Hook to get a test query client for use in tests
 */
export function useTestQueryClient(): QueryClient {
  return createTestQueryClient();
}