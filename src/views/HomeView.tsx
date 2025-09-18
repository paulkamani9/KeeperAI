import MainContent from "@/components/layout/MainContent";
import { SearchInput } from "@/components/search/SearchInput";

/**
 * Minimal Home view that shows only the centered search input.
 * Requirement: as soon as the page loads the input should be focused and
 * nothing else should be visible in the UI.
 */
export const HomeView = () => {
  return (
    <MainContent maxWidth="md" padding="none">
      {/* Hero Section - Minimal and Immersive with Prominent Search */}

      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-xl px-6 text-center">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4">
            What do you wanna read today?
          </h2>
          <SearchInput
            placeholder="Search for any book..."
            autoFocus
            className="mx-auto"
          />
        </div>
      </div>
    </MainContent>
  );
};
