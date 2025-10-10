import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import ConvexClientProvider from "@/providers/ConvexClientProvider";
import { ClerkProvider } from "@/providers/ClerkProvider";
import ReactQueryProvider from "@/providers/ReactQueryProvider";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Global Metadata Configuration for OutClever
 *
 * Philosophy: Every shared link or Google result should immediately say:
 * "This is OutClever — Smarter. Sharper. Faster."
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://outclever.studio";
const APP_NAME = "OUTCLEVER";
const APP_TITLE = "OUTCLEVER — Smarter. Sharper. Faster.";
const APP_DESCRIPTION =
  "Discover, summarize, and outthink with OutClever — the intelligent platform for AI-powered book insights.";
const APP_KEYWORDS = [
  "OutClever",
  "AI summaries",
  "book insights",
  "AI tools",
  "smarter tools",
  "AI productivity",
  "intelligent summaries",
  "OutClever Studio",
  "AI book app",
  "creative intelligence",
  "articifial intellegence",
  "books",
  "google books",
  "open library",
  "free books",
  "summaries",
  "book summaries",
];

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: APP_TITLE,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: APP_KEYWORDS,
  authors: [{ name: APP_NAME }],
  creator: APP_NAME,
  publisher: APP_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: APP_NAME,
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    images: [
      {
        url: "logo/logo-og.png",
        width: 1200,
        height: 630,
        alt: "OutClever Logo — Smarter. Sharper. Faster.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@OutClever",
    creator: "@OutClever",
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    images: ["logo/logo-og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "logo/favicon.ico", sizes: "any" },
      { url: "logo/logo-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "logo/logo-apple.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // JSON-LD Structured Data for Organization
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: APP_NAME,
    url: APP_URL,
    logo: `${APP_URL}/logo/logo-og.png`,
    description: APP_DESCRIPTION,
    sameAs: [
      "https://github.com/paulkamani9/outclever",
      // "https://twitter.com/outclever",
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        {/* Theme Color - Adapts to light/dark mode */}
        <meta
          name="theme-color"
          content="#ffffff"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#000000"
          media="(prefers-color-scheme: dark)"
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <ClerkProvider>
          <ConvexClientProvider>
            <ReactQueryProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                {children}
                <Toaster />
                <Analytics />
                <SpeedInsights />
              </ThemeProvider>
            </ReactQueryProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
