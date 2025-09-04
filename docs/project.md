# Keeper AI Project Overview

## Project Description

KeeperAI is a Next.js application that allows users to search for books using the Google Books API and request AI-powered summaries via OpenAI. The application provides an intuitive interface for searching books and generating comprehensive summaries to help users quickly understand book content.

Target users: Productivity nerds (self-help, business, psychology, history readers).

Design: Minimalist, IMDb-inspired card layout. Mobile-first.

### Logo & Branding

The KeeperAI logo consists of a modular design with:

- **Symbol**: Geometric "K" in protective container (represents knowledge keeping and security)
- **Wordmark**: "Keeper" in bold + "AI" in medium weight with primary color accent
- **Adaptive**: Automatically switches between light/dark themes using CSS custom properties

**Logo Usage Guidelines:**

- Always import from `@/components/shared/Logo` with proper component references
- Use `<Logo />` for full logo with symbol and text
- Use `<KeeperSymbol />` for symbol-only contexts (favicons, tight spaces)
- Use `<KeeperText />` for text-only contexts (when symbol is separate)
- Available sizes: "sm", "md", "lg", "xl"
- Use `showText={false}` to hide wordmark when needed

## Key Features

- **Book Search**: Search for books using the Google Books API
- **Book Details**: View comprehensive information about each book
- **AI Summaries**: Request AI-generated summaries of books using OpenAI
- **Responsive Design**: Mobile-friendly interface using TailwindCSS and ShadCN

## Technical Architecture

### Frontend

- **Framework**: Next.js with App Router and TypeScript
- **UI Components**: ShadCN UI components styled with TailwindCSS
- **State Management**: React Hooks and Context API

### Backend

- **API Routes**: Next.js API routes for server-side operations
- **External APIs**:
  - Google Books API for book search and metadata
  - OpenAI API for generating book summaries
- **Data Persistence**: Convex (if needed)

### Deployment

- **Hosting**: Vercel

## Project Structure

```
/
├── app/              # Next.js App Router directory
│   ├── page.tsx      # Search entry
│   ├── book/[id]/    # Book details + summarize
│   │   └── page.tsx
│   ├── favorites/    # Saved books
│   │   └── page.tsx
│   └── api/
│       ├── search/
│       │   └── route.ts
│       └── summarize/
│           └── route.ts
├── features/         # Feature-based organization
│   ├── search/
│   │   ├── components/
│   │   │   ├── SearchBar.tsx
│   │   │   └── BookCard.tsx
│   │   └── views/
│   │       └── SearchView.tsx
│   ├── summary/
│   │   ├── components/
│   │   │   ├── SummaryOptions.tsx
│   │   │   └── SummaryCard.tsx
│   │   └── views/
│   │       └── SummaryView.tsx
│   └── favorites/
│       ├── components/
│       │   ├── FavoriteButton.tsx
│       │   └── FavoriteList.tsx
│       └── views/
│           └── FavoritesView.tsx
├── lib/              # Utility functions and shared logic
│   ├── auth.ts       # Authentication utilities
│   ├── googleBooks.ts # Google Books API client
│   └── openai.ts     # OpenAI API client
├── components/       # Reusable UI components
│   └── ui/           # ShadCN generated components
├── public/           # Static assets
├── docs/             # Project documentation
├── tests/            # Vitest configuration
└── .env.example      # Environment variables template
```

## Environmental Requirements

The project requires the following environment variables:

- `GOOGLE_BOOKS_API_KEY`: For accessing the Google Books API
- `OPENAI_API_KEY`: For accessing the OpenAI API
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: For Clerk authentication (client-side)
- `CLERK_SECRET_KEY`: For Clerk authentication (server-side)
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`: Redirect URL for sign-in
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: Redirect URL for sign-up
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`: Redirect URL after sign-in
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`: Redirect URL after sign-up

See `.env.example` for reference.

## Development Roadmap

1. **Phase 1**: Basic project setup with Next.js, TailwindCSS, and ShadCN
2. **Phase 2**: Implement book search functionality using Google Books API
3. **Phase 3**: Implement book details view
4. **Phase 4**: Integrate OpenAI for AI-powered book summaries
5. **Phase 5**: Add Clerk authentication for user accounts
6. **Phase 6**: Implement favorites functionality for authenticated users
7. **Phase 7**: Add billing options for premium features
8. **Phase 8**: Optimization and deployment to Vercel
