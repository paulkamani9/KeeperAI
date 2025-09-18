import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts", "./src/test/mocks/server.ts"],
    globals: true,
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/*.test.*",
        "**/*.spec.*",
        "**/coverage/**",
        "**/dist/**",
        "**/.next/**",
      ],
      // Coverage thresholds
      thresholds: {
        global: {
          branches: 75,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Critical paths require higher coverage
        "src/services/": {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        "src/hooks/": {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
    // Enable benchmarking
    benchmark: {
      include: ["**/*.{bench,benchmark}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
      exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
    },
    // Test timeout settings - reduced to catch hanging tests faster
    testTimeout: 10000,
    hookTimeout: 10000,
    // Retry failed tests once to handle flaky tests
    retry: 1,
    // Reporter configuration for better output
    reporters: ["verbose"],
    // Test file patterns
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/coverage/**",
    ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
