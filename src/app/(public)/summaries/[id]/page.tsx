import type { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { SummaryReadingView } from "@/views/SummaryReadingView";
import { api } from "../../../../../convex/_generated/api";

interface SummaryPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Generate metadata for the summary page
 * This runs on the server and provides SEO optimization for OutClever
 */
export async function generateMetadata({
  params,
}: SummaryPageProps): Promise<Metadata> {
  const { id: summaryId } = await params;

  // Get base URL from environment or fallback
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://outclever.studio";
  const absoluteUrl = `${baseUrl}/summaries/${summaryId}`;
  const defaultImage = `${baseUrl}/logo-og.png`;

  try {
    // Create a server-side Convex client to fetch data for metadata
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // Fetch summary data
    const summary = await convex.query(api.summaries.getSummaryById, {
      summaryId: summaryId,
    });

    if (summary && "content" in summary && "summaryType" in summary) {
      // Extract meaningful content for description (first 160 characters)
      const description =
        summary.content.length > 160
          ? summary.content.substring(0, 157) + "..."
          : summary.content;

      const titleCase =
        summary.summaryType.charAt(0).toUpperCase() +
        summary.summaryType.slice(1);

      const pageTitle = `${titleCase} Summary — OutClever`;
      const pageDescription = `${description} | AI-powered book insights on OutClever — Smarter. Sharper. Faster.`;

      return {
        title: pageTitle,
        description: pageDescription,
        keywords: [
          "AI summaries",
          "book insights",
          titleCase,
          "OutClever",
          "intelligent summaries",
          "book analysis",
        ],
        robots: {
          index: true,
          follow: true,
        },
        openGraph: {
          title: pageTitle,
          description: pageDescription,
          type: "article",
          url: absoluteUrl,
          siteName: "OutClever",
          images: [
            {
              url: defaultImage,
              width: 1200,
              height: 630,
              alt: "OutClever Logo — Smarter. Sharper. Faster.",
            },
          ],
        },
        twitter: {
          card: "summary_large_image",
          site: "@OutClever",
          title: pageTitle,
          description: pageDescription,
          images: [defaultImage],
        },
      };
    }
  } catch (error) {
    console.error("Failed to fetch summary for metadata:", error);
    // Fall through to fallback metadata
  }

  // Fallback metadata if fetch fails
  return {
    title: "AI-Powered Summary — OutClever",
    description:
      "Discover intelligent book summaries on OutClever — Smarter. Sharper. Faster.",
    keywords: [
      "AI summaries",
      "book insights",
      "OutClever",
      "intelligent summaries",
    ],
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: "AI-Powered Summary — OutClever",
      description:
        "Discover intelligent book summaries on OutClever — Smarter. Sharper. Faster.",
      type: "article",
      url: absoluteUrl,
      siteName: "OutClever",
      images: [
        {
          url: defaultImage,
          width: 1200,
          height: 630,
          alt: "OutClever Logo — Smarter. Sharper. Faster.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@OutClever",
      title: "AI-Powered Summary — OutClever",
      description:
        "Discover intelligent book summaries on OutClever — Smarter. Sharper. Faster.",
      images: [defaultImage],
    },
  };
}

/**
 * Summary reading page component
 * Provides immersive reading experience for AI-generated summaries
 */
export default async function SummaryPage({ params }: SummaryPageProps) {
  const { id: summaryId } = await params;

  return <SummaryReadingView summaryId={summaryId} />;
}

/**
 * Generate static params for known summary routes
 * This can be expanded later for better performance
 */
export function generateStaticParams(): { id: string }[] {
  // For now, return empty array to use dynamic rendering
  // In the future, we might pre-generate popular summaries
  return [];
}
