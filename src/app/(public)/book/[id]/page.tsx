import { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookDetailView } from "@/views/BookDetailView";
import { createUnifiedSearchService } from "@/services/searchService";

interface BookDetailPageProps {
  params: {
    id: string;
  };
}

/**
 * Generate metadata for SEO based on book information
 */
export async function generateMetadata({
  params,
}: BookDetailPageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const searchService = createUnifiedSearchService();
    const book = await searchService.getBookDetails(id);

    if (!book) {
      return {
        title: "Book Not Found | KeeperAI",
        description: "The requested book could not be found.",
      };
    }

    const title = `${book.title} | KeeperAI`;
    const description = book.description
      ? book.description.slice(0, 160) +
        (book.description.length > 160 ? "..." : "")
      : `Discover "${book.title}" by ${book.authors.join(", ")} on KeeperAI. Generate AI-powered summaries and add to your favorites.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: book.thumbnail
          ? [
              {
                url: book.thumbnail,
                width: 300,
                height: 450,
                alt: `Cover of ${book.title}`,
              },
            ]
          : [],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: book.thumbnail ? [book.thumbnail] : [],
      },
    };
  } catch (error) {
    console.error("Error generating metadata for book:", error);
    return {
      title: "Book Details | KeeperAI",
      description:
        "Discover books and generate AI-powered summaries on KeeperAI.",
    };
  }
}

/**
 * Book Detail Page - Shows immersive book preview with hero background
 *
 * Features:
 * - Dynamic route handling for both Google Books and Open Library IDs
 * - SEO-optimized metadata generation
 * - Fallback error handling with proper 404s
 * - Server-side book data fetching for better performance
 */
export default async function BookDetailPage({ params }: BookDetailPageProps) {
  try {
    const {id} = await params;
    const searchService = createUnifiedSearchService();
    const book = await searchService.getBookDetails(id);

    if (!book) {
      notFound();
    }

    return <BookDetailView book={book} />;
  } catch (error) {
    console.error("Error fetching book details:", error);
    notFound();
  }
}

/**
 * Generate static params for popular books (optional optimization)
 * This can be expanded later to include commonly searched books
 */
export function generateStaticParams() {
  // For now, return empty array - all pages will be dynamically generated
  // This can be expanded later with popular book IDs
  return [];
}
