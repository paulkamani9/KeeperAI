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
- **Page Structure Rule**: All `page.tsx` files should only contain view components
- Create actual view components in `/src/views` directory
- Keep shared utilities in `/lib`
- Organize files by feature/domain:
  ```
  /app
    /page.tsx                    # Only imports and renders HomePage view
    /book
      /[id]
        /page.tsx               # Only imports and renders BookDetailPage view
    /favorites
      /page.tsx                 # Only imports and renders FavoritesPage view
    /api
      /search
        /route.ts
      /summarize
        /route.ts
  /views
    /HomePage.tsx               # Actual home page implementation
    /SearchPage.tsx             # Actual search page implementation
    /BookDetailPage.tsx         # Actual book detail page implementation
    /FavoritesPage.tsx          # Actual favorites page implementation
  /components
    /ui                         # Reusable UI components
    /layout                     # Layout-specific components
  ```

### Page Structure Pattern

All `page.tsx` files should follow this minimal pattern:

```tsx
import { ViewName } from "@/views/ViewName";

export default function PageName() {
  return <ViewName />;
}
```

This keeps routing logic separate from view implementation and makes views more reusable and testable.

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
- Organize components by domain/feature:
  - `/components/ui/` - Base ShadCN UI components (button, card, input, etc.)
  - `/components/home/` - Home page specific components
  - `/components/search/` - Search page specific components
  - `/components/shared/` - Components used across multiple pages
  - `/components/layout/` - Layout-specific components (navbar, sidebar, etc.)

## Logo & Branding Standards

### Logo Component Usage

- **ALWAYS** import logo components from `@/components/shared/Logo`
- **NEVER** create custom logo implementations or copy logo code
- Use the provided modular logo system for consistency

### Logo Import Patterns

```tsx
// Import main logo component (recommended for most cases)
import Logo from "@/components/shared/Logo";

// Import individual components when needed
import { KeeperSymbol, KeeperText } from "@/components/shared/Logo";
```

### Logo Usage Examples

```tsx
// Full logo (default)
<Logo size="md" />

// Logo without text (for tight spaces)
<Logo size="sm" showText={false} />

// Symbol only (for favicons, mobile nav, etc.)
<KeeperSymbol size="lg" />

// Text only (when symbol is placed separately)
<KeeperText size="xl" />
```

### Logo Size Guidelines

- **sm** (20x20px): Mobile nav, inline elements, small buttons
- **md** (28x28px): Default size for most UI contexts
- **lg** (40x40px): Sidebar headers, prominent navigation
- **xl** (56x56px): Hero sections, landing pages, large headers

### Logo Placement Rules

- Logo automatically adapts to light/dark themes - no manual color management needed
- Logo uses CSS custom properties (`--primary`) for consistent brand colors
- Maintain proper spacing around logo using provided gap sizing system
- Never stretch, skew, or modify logo proportions

### Component Organization Rules

- **Domain-based organization**: Group components by the page/feature they belong to
- **Shared components**: Place reusable components that are used across multiple domains in `/shared/`
- **Base UI components**: Keep ShadCN and other foundational UI components in `/ui/`
- **Layout components**: Keep navigation, headers, and layout components in `/layout/`

Example structure:

```
components/
├── home/
│   ├── hero-section.tsx
│   ├── feature-card.tsx
│   ├── how-it-works-section.tsx
│   └── cta-section.tsx
├── search/
│   ├── book-card.tsx
│   ├── search-filters.tsx
│   └── search-results.tsx
├── shared/
│   ├── page-footer.tsx
│   └── loading-spinner.tsx
├── layout/
│   ├── Navbar.tsx
│   └── Sidebar.tsx
└── ui/                     # ShadCN components
    ├── button.tsx
    ├── card.tsx
    └── input.tsx
```

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
