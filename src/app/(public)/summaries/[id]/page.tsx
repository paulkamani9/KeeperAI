import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { SummaryReadingView } from "@/views/SummaryReadingView";
import { api } from "../../../../../convex/_generated/api";

interface SummaryPageProps {
  params: {
    id: string;
  };
}

/**
 * Generate metadata for the summary page
 * This runs on the server and provides SEO optimization
 */
export async function generateMetadata({
  params,
}: SummaryPageProps): Promise<Metadata> {
  const summaryId = params.id;

  // Create Convex client for server-side data fetching
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    // Fallback metadata if Convex URL is not configured
    return {
      title: `Summary | KeeperAI`,
      description: `Read an AI-generated book summary on KeeperAI`,
      robots: { index: false, follow: false }, // Don't index if we can't fetch data
    };
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const summary = await convex.query(api.summaries.getSummaryById, {
      summaryId,
    });

    if (!summary) {
      // Summary not found - return basic metadata
      return {
        title: `Summary Not Found | KeeperAI`,
        description: `The requested summary could not be found.`,
        robots: { index: false, follow: false },
      };
    }

    // Extract meaningful content for description (first 160 chars)
    const content = summary.content
      .replace(/[#*\n]/g, " ") // Remove markdown formatting
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
    const description = content.length > 160 
      ? content.substring(0, 157) + "..." 
      : content;

    // Generate summary type display name
    const typeNames = {
      concise: "Concise Summary",
      detailed: "Detailed Analysis", 
      analysis: "Critical Analysis",
      practical: "Practical Insights"
    };
    const summaryTypeName = typeNames[summary.summaryType] || "Summary";

    return {
      title: `${summaryTypeName} | KeeperAI`,
      description: description || `Read an AI-generated ${summaryTypeName.toLowerCase()} on KeeperAI`,
      keywords: [
        "AI summary",
        "book summary", 
        summary.summaryType,
        "artificial intelligence",
        "reading",
      ].join(", "),
      robots: {
        index: true,
        follow: true,
      },
      openGraph: {
        title: `${summaryTypeName} | KeeperAI`,
        description: description || `Read an AI-generated ${summaryTypeName.toLowerCase()} on KeeperAI`,
        type: "article",
        url: `/summaries/${summaryId}`,
        publishedTime: summary.createdAt,
        modifiedTime: summary.updatedAt,
        authors: ["KeeperAI"],
        section: "Summaries",
        tags: ["AI", "Summary", summary.summaryType],
      },
      twitter: {
        card: "summary_large_image",
        title: `${summaryTypeName} | KeeperAI`,
        description: description || `Read an AI-generated ${summaryTypeName.toLowerCase()} on KeeperAI`,
        creator: "@KeeperAI",
      },
      other: {
        "article:reading_time": summary.readingTime.toString(),
        "article:word_count": summary.wordCount.toString(),
      },
    };
  } catch (error) {
    console.error("Error fetching summary metadata:", error);
    
    // Fallback metadata on error
    return {
      title: `Summary | KeeperAI`,
      description: `Read an AI-generated book summary on KeeperAI`,
      robots: { index: false, follow: false }, // Don't index on error
    };
  }
}

/**
 * Summary reading page component
 * Provides immersive reading experience for AI-generated summaries
 */
export default function SummaryPage({ params }: SummaryPageProps) {
  const summaryId = params.id;

  // Validate summary ID format (basic validation)
  if (!summaryId || summaryId.trim() === "") {
    notFound();
  }

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
