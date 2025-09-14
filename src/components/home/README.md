# KeeperAI Home Page Components

This directory contains the modular components that make up the KeeperAI home page experience.

## Components

### HeroSearchBar

- **Purpose**: Central search interface with mode switching
- **Features**:
  - Large, immersive input field similar to ChatGPT
  - Toggle between "Search" and "AI Prompt" modes
  - Handles navigation to `/search` with proper query parameters
  - Theme-aware styling with focus animations
  - Future-ready structure for voice/image search

### BookCard

- **Purpose**: Reusable book display component for carousels
- **Features**:
  - Multiple sizes (sm, md, lg)
  - Book cover images with fallback design
  - Favorite toggle with heart icon
  - Rating display with stars
  - Title and author information
  - Categories and publication year
  - Hover animations and interactions

### BookCarousel

- **Purpose**: Horizontal scrollable container for BookCard collections
- **Features**:
  - Smooth horizontal scrolling with scroll buttons
  - Loading states with skeleton animations
  - Empty state handling
  - Staggered entrance animations
  - Responsive design with proper overflow handling
  - Book count indicators

### QuickExplore

- **Purpose**: Quick navigation to popular searches and genres
- **Features**:
  - Two variants: chips and buttons
  - Predefined popular searches and trending genres
  - Horizontal scrolling for mobile
  - Icon integration with search terms
  - Navigation to search page with pre-filled queries

## Data Types

### BookData

```typescript
interface BookData {
  id: string;
  title: string;
  authors: string[];
  description?: string;
  publishedDate?: string;
  isbn?: string;
  imageUrl?: string;
  categories?: string[];
  pageCount?: number;
  language?: string;
  isFavorite?: boolean;
  rating?: number;
}
```

## Usage

### Import Components

```typescript
import {
  HeroSearchBar,
  BookCard,
  BookCarousel,
  QuickExplore,
  popularSearches,
  trendingGenres,
} from "@/components/home";
```

### Basic Usage

```typescript
// Hero search bar
<HeroSearchBar />

// Book carousel with favorites
<BookCarousel
  title="Your Favorites"
  books={favoriteBooks}
  showFavorites={true}
  onFavoriteToggle={handleFavoriteToggle}
/>

// Quick explore sections
<QuickExplore
  title="Popular Searches"
  items={popularSearches}
  variant="chips"
/>
```

## Navigation

### Search Navigation

- **Search Mode**: `/search?query=<term>&mode=searchMode`
- **Prompt Mode**: `/search?query=<term>&mode=promptMode`
- **Book Details**: `/books/<bookId>`

## Styling

All components use:

- Tailwind CSS for styling
- shadcn/ui components as base
- Custom CSS variables for theming
- Smooth animations and transitions
- Responsive design principles

## Future Enhancements

### HeroSearchBar

- Voice input integration
- Image upload for book cover search
- Search suggestions and autocomplete
- Recent searches history

### BookCarousel

- Infinite scroll for large datasets
- Virtual scrolling optimization
- Advanced filtering options
- Drag-to-scroll gestures

### BookCard

- More detailed hover states
- Quick preview modals
- Social sharing options
- Reading progress indicators

### QuickExplore

- Dynamic trending topics
- Personalized suggestions
- Search analytics integration
- User-defined quick searches
