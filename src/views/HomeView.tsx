import MainContent from "@/components/shared/MainContent";
import { SearchInput } from "@/components/search/SearchInput";
import { BookOfTheDayCard } from "@/components/book-of-the-day/BookOfTheDayCard";

/**
 * Minimal Home view that shows the centered search input
 * with Book of the Day recommendation below.
 *
 * Layout:
 * - Primary: Search input (focused on load)
 * - Secondary: Book of the Day card (discovery highlight)
 */
export const HomeView = () => {
  return (
    <MainContent maxWidth="md" padding="none">
      {/* Hero Section - Minimal and Immersive with Prominent Search */}
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-xl px-6 text-center space-y-8">
          {/* Primary: Search Section */}
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4">
              What do you wanna read today?
            </h2>
            <SearchInput
              placeholder="Search for any book..."
              autoFocus
              className="mx-auto"
            />
          </div>

          {/* Secondary: Book of the Day */}
          <div className="pt-4">
            <BookOfTheDayCard />
          </div>
        </div>
      </div>
    </MainContent>
  );
};
