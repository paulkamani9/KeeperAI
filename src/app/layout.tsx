import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import ConvexClientProvider from "@/providers/ConvexClientProvider";
import { ClerkProvider } from "@/providers/ClerkProvider";
import ReactQueryProvider from "@/providers/ReactQueryProvider";
import { validateEnvironment } from "@/lib/environmentConfig";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title:
    "Book Keeper - Powerful AI Powered Book search with AI generated summaries",
  description:
    "Book Keeper helps you discover books and get AI-generated summaries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Validate environment configuration on app start
  try {
    validateEnvironment();
  } catch (error) {
    // In development, show detailed error in console
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
    // In production, the error will be handled by the ConvexClientProvider
    // which already has proper error handling for missing CONVEX_URL
  }

  return (
    <html lang="en" suppressHydrationWarning>
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
              </ThemeProvider>
            </ReactQueryProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
