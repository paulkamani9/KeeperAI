import { MetadataRoute } from "next";

/**
 * Robots.txt configuration for OutClever
 *
 * This file controls search engine crawler access to the site.
 * - Allows all crawlers to access all public pages
 * - References the sitemap for efficient indexing
 * - No disallowed paths (all content is public)
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // No disallow rules - all content is public and indexable
    },
    sitemap: "https://outclever.studio/sitemap.xml",
  };
}
