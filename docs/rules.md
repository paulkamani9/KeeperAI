# Keeper AI Coding Rules and Standards

This document outlines the coding standards, naming conventions, testing requirements, and other rules for the Keeper AI project.

## Code Style and Formatting

### TypeScript

- All code must be written in TypeScript with proper typing
- Use TypeScript strict mode
- Define interfaces or types for all props, states, and complex objects
- Avoid using `any` type; use proper typing or `unknown` when necessary
- Use type inference where appropriate to reduce verbosity

### Naming Conventions

- **Variables**: Use `camelCase`
  ```typescript
  const bookTitle = "Clean Code";
  ```
- **Components**: Use `PascalCase`
  ```typescript
  const BookCard = () => {
    /* ... */
  };
  ```
- **Files**:
  - Component files: `PascalCase.tsx`
  - Utility files: `kebab-case.ts`
  - Page files: `page.tsx` (following Next.js App Router conventions)
  - Layout files: `layout.tsx`
- **CSS classes**: Use `kebab-case` in Tailwind class names
  ```jsx
  <div className="book-card flex items-center">
  ```
- **Constants**: Use `UPPER_SNAKE_CASE` for global constants
  ```typescript
  const MAX_RESULTS_PER_PAGE = 10;
  ```

## Project Structure

- Follow Next.js App Router conventions with `app/` folder
- Never mix UI and API logic in the same file
- Organize code by features in the `/features` directory
- Keep shared utilities in `/lib`
- Organize files by feature/domain:
  ```
  /app
    /page.tsx
    /book
      /[id]
        /page.tsx
    /favorites
      /page.tsx
    /api
      /search
        /route.ts
      /summarize
        /route.ts
  /features
    /search
      /components
      /views
    /summary
      /components
      /views
    /favorites
      /components
      /views
  ```

## Component Structure

- Use functional components with hooks
- Use TypeScript interfaces for props
- Follow this general structure:

  ```tsx
  import { useState } from "react";

  interface ComponentProps {
    prop1: string;
    prop2?: number;
  }

  export function Component({ prop1, prop2 = 0 }: ComponentProps) {
    const [state, setState] = useState("");

    // Functions

    return <div>{/* Component markup */}</div>;
  }
  ```

## UI Components

- Use ShadCN UI components as a foundation
- Style components with TailwindCSS
- Create reusable UI components in `/components/ui`
- Create feature-specific components in `/components/features`

## API Integration

- Keep API logic separate from UI components
- Create API utility functions in `/lib/`
- Handle errors properly in all API calls
- Use TypeScript types for API responses
- Never expose API keys on client side
- Use server-side API routes for sensitive operations

## Authentication

- Use Clerk for authentication
- Protect sensitive routes with middleware
- Handle authentication states (loading, error, authenticated)
- Use the auth utility functions from `lib/auth.ts`
- Only require authentication for favorites functionality
- Handle unauthenticated states gracefully with proper UI feedback

## State Management

- Use React Hooks for local state
- Use React Context for shared state when needed
- Avoid prop drilling by using context or composition

## Testing

- Write tests for all components and functions
- Use Jest for unit testing
- Use React Testing Library for component testing
- Name test files with `.test.ts` or `.test.tsx` suffix
- Follow this pattern for test files:
  ```
  ComponentName.test.tsx
  ```

## Error Handling

- Use try-catch blocks for API calls
- Display user-friendly error messages
- Log errors for debugging
- Implement error boundaries for component errors

## Documentation

- Add JSDoc comments for functions and components
- Comment complex logic
- Update documentation when changing existing features

## Accessibility

- Use semantic HTML elements
- Add ARIA attributes when necessary
- Ensure keyboard navigation works
- Maintain proper contrast ratios

## Performance

- Use Next.js Image component for images
- Implement lazy loading for components when appropriate
- Optimize API calls with caching
- Minimize bundle size

## Development Workflow

- Check for linting errors after implementing a feature using the linting tools
- Only restart the development server (`npm run dev`) when necessary (configuration changes, etc.)
- If the development server is already running, avoid restarting it unnecessarily
- Use the linting feedback to fix issues before committing code

## Git Workflow

- Create feature branches from `main`
- Use descriptive branch names: `feature/feature-name`
- Make small, focused commits
- Write meaningful commit messages
- Squash commits before merging when appropriate

## Pull Requests

- Create descriptive pull request titles and descriptions
- Reference issues in pull requests
- Keep pull requests focused on a single feature or fix
- Request reviews from appropriate team members
- Address review comments promptly
