/**
 * Structured Data (JSON-LD) Utilities
 *
 * Helper functions for generating Schema.org structured data
 * for SEO and rich results in search engines.
 *
 * Philosophy: Make OutClever content discoverable and rich in search results.
 */

import { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://outclever.studio";
const APP_NAME = "OutClever";

/**
 * Organization Schema
 * Use this for the main site and brand representation
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: APP_NAME,
    url: APP_URL,
    logo: `${APP_URL}/logo-og.png`,
    description:
      "OutClever — Smarter. Sharper. Faster. AI-powered book insights and intelligent summaries.",
    sameAs: ["https://github.com/outclever", "https://twitter.com/outclever"],
  };
}

/**
 * WebSite Schema
 * Use this for search box functionality
 */
export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: APP_NAME,
    url: APP_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${APP_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Book Schema
 * Use this for individual book pages
 */
export interface BookSchemaProps {
  title: string;
  authors: string[];
  description?: string;
  url: string;
  image?: string;
  isbn?: string;
  publishedDate?: string;
}

export function generateBookSchema(props: BookSchemaProps) {
  return {
    "@context": "https://schema.org",
    "@type": "Book",
    name: props.title,
    author: props.authors.map((author) => ({
      "@type": "Person",
      name: author,
    })),
    publisher: {
      "@type": "Organization",
      name: APP_NAME,
    },
    description: props.description,
    url: props.url,
    image: props.image || `${APP_URL}/logo-og.png`,
    ...(props.isbn && { isbn: props.isbn }),
    ...(props.publishedDate && { datePublished: props.publishedDate }),
  };
}

/**
 * Article Schema
 * Use this for summary/content pages
 */
export interface ArticleSchemaProps {
  headline: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  image?: string;
  author?: string;
}

export function generateArticleSchema(props: ArticleSchemaProps) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: props.headline,
    description: props.description,
    url: props.url,
    image: props.image || `${APP_URL}/logo-og.png`,
    datePublished: props.datePublished,
    dateModified: props.dateModified || props.datePublished,
    author: props.author
      ? {
          "@type": "Person",
          name: props.author,
        }
      : {
          "@type": "Organization",
          name: APP_NAME,
        },
    publisher: {
      "@type": "Organization",
      name: APP_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${APP_URL}/logo-og.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": props.url,
    },
  };
}

/**
 * BreadcrumbList Schema
 * Use this for navigation hierarchy
 */
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * FAQ Schema
 * Use this for FAQ pages or sections
 */
export interface FAQItem {
  question: string;
  answer: string;
}

export function generateFAQSchema(items: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/**
 * Helper to inject structured data into page metadata
 * Note: Structured data should typically be added via script tags in the page
 */
export function injectStructuredData(
  metadata: Metadata,
  schema: object | object[]
): Metadata {
  // We return metadata as-is since structured data is better handled via script tags
  // Use StructuredDataScript component in your page instead
  return metadata;
}

/**
 * Helper to create a structured data script tag
 * Use this in page components when metadata API isn't sufficient
 */
export function StructuredDataScript({
  schema,
}: {
  schema: object | object[];
}) {
  const schemaArray = Array.isArray(schema) ? schema : [schema];
  const schemaString = JSON.stringify(
    schemaArray.length === 1 ? schemaArray[0] : schemaArray
  );

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: schemaString }}
    />
  );
}

/**
 * Generate default metadata for OutClever pages
 */
export interface DefaultMetadataProps {
  title: string;
  description: string;
  url: string;
  image?: string;
  keywords?: string[];
  noIndex?: boolean;
}

export function generateDefaultMetadata(props: DefaultMetadataProps): Metadata {
  const image = props.image || `${APP_URL}/logo-og.png`;

  return {
    title: props.title,
    description: props.description,
    keywords: props.keywords || ["OutClever", "AI summaries", "book insights"],
    robots: {
      index: !props.noIndex,
      follow: !props.noIndex,
    },
    openGraph: {
      title: props.title,
      description: props.description,
      url: props.url,
      siteName: APP_NAME,
      images: [
        {
          url: image,
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
      title: props.title,
      description: props.description,
      images: [image],
    },
  };
}
