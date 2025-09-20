import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
 * This runs on the server and provides SEO optimization
 */
export async function generateMetadata({
  params,
}: SummaryPageProps): Promise<Metadata> {
  const { id: summaryId } = await params;

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

      return {
        title: `${titleCase} Summary | KeeperAI`,
        description: description,
        robots: {
          index: true,
          follow: true,
        },
        openGraph: {
          title: `${titleCase} Summary | KeeperAI`,
          description: description,
          type: "article",
          url: `/summaries/${summaryId}`,
        },
        twitter: {
          card: "summary",
          title: `${titleCase} Summary | KeeperAI`,
          description: description,
        },
      };
    }
  } catch (error) {
    console.error("Failed to fetch summary for metadata:", error);
    // Fall back to basic metadata
  }

  // Fallback metadata if fetch fails
  return {
    title: `Summary | KeeperAI`,
    description: `Read an AI-generated book summary on KeeperAI`,
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `Summary | KeeperAI`,
      description: `Read an AI-generated book summary on KeeperAI`,
      type: "article",
      url: `/summaries/${summaryId}`,
    },
    twitter: {
      card: "summary",
      title: `Summary | KeeperAI`,
      description: `Read an AI-generated book summary on KeeperAI`,
    },
  };
}

/**
 * Summary reading page component
 * Provides immersive reading experience for AI-generated summaries
 */
export default async function SummaryPage({ params }: SummaryPageProps) {
  const { id: summaryId } = await params;

  // Validate summary ID format (Convex ID should be 32 char hex string)
  // if (
  //   !summaryId ||
  //   summaryId.trim() === "" ||
  //   summaryId.length !== 32 ||
  //   !/^[a-f0-9]{32}$/.test(summaryId)
  // ) {
  //   notFound();
  // }

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
