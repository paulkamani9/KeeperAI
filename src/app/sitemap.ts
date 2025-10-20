import { MetadataRoute } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";

/**
 * Dynamic sitemap generation for OutClever
 *
 * This sitemap intelligently discovers:
 * 1. Static routes from the app directory structure
 * 2. Dynamic book pages from Convex database
 * 3. Dynamic summary pages from Convex database
 *
 * The sitemap is regenerated on each deployment, ensuring
 * search engines always have access to the latest content.
 */

const BASE_URL = "https://outclever.studio";

/**
 * Static routes detected from /src/app/(public) directory
 * These are the core public pages of the application
 */
const STATIC_ROUTES = [
  {
    path: "/",
    changeFrequency: "daily" as const,
    priority: 1.0,
  },
  {
    path: "/search",
    changeFrequency: "daily" as const,
    priority: 0.9,
  },
  {
    path: "/favorites",
    changeFrequency: "weekly" as const,
    priority: 0.8,
  },
  {
    path: "/readlist",
    changeFrequency: "weekly" as const,
    priority: 0.8,
  },
  {
    path: "/saved-summaries",
    changeFrequency: "weekly" as const,
    priority: 0.8,
  },
] as const;

/**
 * Fetch all persisted books from Convex database
 */
async function getAllBooks() {
  try {
    const books = await fetchQuery(api.books.getAllBooks, {});
    return books || [];
  } catch (error) {
    console.error("Error fetching books for sitemap:", error);
    return [];
  }
}

/**
 * Fetch all completed summaries from Convex database
 */
async function getAllSummaries() {
  try {
    const summaries = await fetchQuery(
      api.summaries.getAllCompletedSummaries,
      {}
    );
    return summaries || [];
  } catch (error) {
    console.error("Error fetching summaries for sitemap:", error);
    return [];
  }
}

/**
 * Generate complete sitemap with static and dynamic routes
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = new Date();

  // 1. Static routes
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: currentDate,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // 2. Dynamic book pages
  let bookEntries: MetadataRoute.Sitemap = [];
  try {
    const books = await getAllBooks();
    bookEntries = books.map((book: any) => ({
      url: `${BASE_URL}/book/${book.originalId}`,
      lastModified: new Date(book.lastAccessedAt || book.cachedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error("Failed to generate book entries for sitemap:", error);
  }

  // 3. Dynamic summary pages
  let summaryEntries: MetadataRoute.Sitemap = [];
  try {
    const summaries = await getAllSummaries();
    summaryEntries = summaries.map((summary: any) => ({
      url: `${BASE_URL}/summaries/${summary._id}`,
      lastModified: new Date(summary.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch (error) {
    console.error("Failed to generate summary entries for sitemap:", error);
  }

  // Combine all entries
  const allEntries = [...staticEntries, ...bookEntries, ...summaryEntries];

  // Log summary for deployment verification
  console.log(`✅ Sitemap generated successfully:`);
  console.log(`   - Total URLs: ${allEntries.length}`);
  console.log(`   - Static routes: ${staticEntries.length}`);
  console.log(`   - Dynamic book pages: ${bookEntries.length}`);
  console.log(`   - Dynamic summary pages: ${summaryEntries.length}`);

  if (bookEntries.length > 0) {
    console.log(`   - Sample book URL: ${bookEntries[0].url}`);
  }
  if (summaryEntries.length > 0) {
    console.log(`   - Sample summary URL: ${summaryEntries[0].url}`);
  }

  return allEntries;
}
