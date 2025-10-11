import { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookDetailView } from "@/views/BookDetailView";
import { getBookWithCache } from "@/lib/getBookWithCache";

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
    const book = await getBookWithCache(id);

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://outclever.studio";
    const bookUrl = `${baseUrl}/book/${id}`;
    const defaultImage = `${baseUrl}/logo-og.png`;

    if (!book) {
      return {
        title: "Book Not Found — OutClever",
        description: "The requested book could not be found on OutClever.",
        openGraph: {
          images: [defaultImage],
        },
      };
    }

    const title = `${book.title} — OutClever`;
    const description = book.description
      ? book.description.slice(0, 160) +
        (book.description.length > 160 ? "..." : "")
      : `Discover "${book.title}" by ${book.authors.join(", ")} on OutClever. Generate AI-powered summaries and add to your favorites. Smarter. Sharper. Faster.`;

    return {
      title,
      description,
      keywords: [
        book.title,
        ...book.authors,
        "OutClever",
        "AI summaries",
        "book insights",
        ...(book.categories || []),
      ],
      openGraph: {
        title,
        description,
        url: bookUrl,
        siteName: "OutClever",
        images: book.thumbnail
          ? [
              {
                url: book.thumbnail,
                width: 300,
                height: 450,
                alt: `Cover of ${book.title}`,
              },
              {
                url: defaultImage,
                width: 1200,
                height: 630,
                alt: "OutClever Logo",
              },
            ]
          : [
              {
                url: defaultImage,
                width: 1200,
                height: 630,
                alt: "OutClever Logo — Smarter. Sharper. Faster.",
              },
            ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        site: "@OutClever",
        title,
        description,
        images: book.thumbnail
          ? [book.thumbnail, defaultImage]
          : [defaultImage],
      },
    };
  } catch (error) {
    console.error("Error generating metadata for book:", error);
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://outclever.studio";
    return {
      title: "Book Details — OutClever",
      description:
        "Discover books and generate AI-powered summaries on OutClever — Smarter. Sharper. Faster.",
      openGraph: {
        images: [`${baseUrl}/logo-og.png`],
      },
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
    const { id } = await params;
    const book = await getBookWithCache(id);

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
