# Keeper AI Development Workflows

## Add a new feature

1. Create `/features/<feature>/components` and `/features/<feature>/views`.
2. Place UI in `components`, compositions in `views`.
3. Add API/client logic in `lib` or `features/<feature>/lib`.
4. Add route in `/app`.
5. Add loading, empty, error states.
6. Write minimal test in `*.test.tsx`.
7. Commit (`feat: add <feature>`).
8. Update `/docs/workflows.md`.

## Example: Add Google Books Search

- Add `lib/googleBooks.ts` → typed client.
- Add `features/search/components/SearchBar.tsx`.
- Add `features/search/components/BookCard.tsx`.
- Add `features/search/views/SearchView.tsx`.
- Add `/app/page.tsx` → uses `SearchView`.
- Add `/api/search/route.ts` → calls Google Books via server.
- Test with Vitest.
- Commit + update docs.

## Example: Add Summarization

- Add `lib/openai.ts`.
- Add API route `/api/summarize/route.ts`.
- Add summary components in `features/summary`.
- Wire button on book detail page.
- Test minimal path.
- Commit + update docs.

## Example: Add Clerk Authentication

- Install Clerk: `npm install @clerk/nextjs`
- Create authentication utility in `lib/auth.ts`
- Add middleware in `/app/middleware.ts` for route protection
- Add authentication components to layout
- Update environment variables
- Protect the favorites route
- Add sign in and sign up UI components
- Test authentication flow
- Commit + update docs.

## Initial Setup

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd KeeperAI
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

4. Add your API keys to `.env.local`:

   - `GOOGLE_BOOKS_API_KEY`: Get from [Google Cloud Console](https://console.cloud.google.com/)
   - `OPENAI_API_KEY`: Get from [OpenAI Dashboard](https://platform.openai.com/account/api-keys)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Get from [Clerk Dashboard](https://dashboard.clerk.dev/)
   - `CLERK_SECRET_KEY`: Get from [Clerk Dashboard](https://dashboard.clerk.dev/)
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL`: Set to "/sign-in"
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: Set to "/sign-up"
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`: Set to "/"
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`: Set to "/"

5. Start the development server:
   ```bash
   npm run dev
   ```

## Component Development

1. Create new components in the `components/` directory
2. Follow the naming pattern: `PascalCase.tsx`
3. Use ShadCN UI components as base and style with TailwindCSS
4. Import and use the component in your pages or other components

Example:

```tsx
// components/BookCard.tsx
import { Card } from "@/components/ui/card";

export interface BookCardProps {
  title: string;
  author: string;
  coverUrl: string;
}

export const BookCard = ({ title, author, coverUrl }: BookCardProps) => {
  return <Card>{/* Card content */}</Card>;
};
```

## Page Development

1. Create new pages in the appropriate directories under `app/`
2. Follow Next.js App Router conventions
3. Use the page layout structure for consistent UI

Example:

```tsx
// app/books/page.tsx
export default function BooksPage() {
  return (
    <main className="container mx-auto py-6">
      <h1 className="text-3xl font-bold">Books</h1>
      {/* Page content */}
    </main>
  );
}
```

## API Integration

### Google Books API

1. Create API utility in `lib/api/google-books.ts`
2. Use the API key from environment variables
3. Implement search and get book details functions

Example:

```tsx
// lib/api/google-books.ts
export async function searchBooks(query: string) {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query
    )}&key=${apiKey}`
  );
  return response.json();
}
```

### OpenAI API

1. Create API utility in `lib/api/openai.ts`
2. Use the API key from environment variables
3. Implement summary generation function

Example:

```tsx
// lib/api/openai.ts
export async function generateBookSummary(bookInfo: any) {
  // Implementation
}
```

## Adding New Features

1. Create an issue or task in the project management system
2. Create a new branch from `main`:
   ```bash
   git checkout -b feature/feature-name
   ```
3. Implement the feature following the project's coding standards
4. Write tests for the new feature
5. Update documentation as needed
6. Create a pull request for review

## Deployment

1. Ensure all tests pass locally:

   ```bash
   npm run test
   ```

2. Commit and push changes:

   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin branch-name
   ```

3. Create a pull request to `main`

4. After approval and merge, Vercel will automatically deploy the changes

5. Verify the deployment on the Vercel dashboard and on the live site

## Troubleshooting Common Issues

### API Key Issues

If encountering API key errors:

1. Check that `.env.local` has the correct API keys
2. Verify the API keys are valid in their respective dashboards
3. Restart the development server

### Build Errors

If encountering build errors:

1. Check the error message in the terminal
2. Ensure all dependencies are installed
3. Clear the Next.js cache:
   ```bash
   npm run clean
   ```
4. Restart the build process

### TypeScript Errors

If encountering TypeScript errors:

1. Read the error message carefully
2. Check the file and line number indicated
3. Fix type issues following the project's TypeScript guidelines
4. Use explicit typing where necessary
