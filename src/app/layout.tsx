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
                <SpeedInsights/>
              </ThemeProvider>
            </ReactQueryProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
