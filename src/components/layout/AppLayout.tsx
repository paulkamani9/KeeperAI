import React from "react";
import { cn } from "@/lib/utils";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "./AppSidebar";
import Navbar from "./Navbar";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Main application layout using shadcn/ui sidebar components
 *
 * Features:
 * - SidebarProvider wrapper for proper context
 * - Desktop: Sidebar collapsed by default (icons only)
 * - Mobile: Sidebar closed by default
 * - Responsive navbar with different behavior per device
 * - Proper semantic HTML structure
 */
export default function AppLayout({ children, className }: AppLayoutProps) {
  return (
    <SidebarProvider
      defaultOpen={false} // Collapsed by default on desktop, closed on mobile
    >
      <div
        className={cn(
          "min-h-screen w-full flex",
          "bg-background text-foreground",
          "transition-colors duration-300",
          className
        )}
      >
        {/* Sidebar - handles its own responsive behavior */}
        <AppSidebar />

        {/* Main content area - pushes with sidebar instead of overlaying */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Navbar - Fixed at top */}
          <header
            className="fixed left-0 top-0 z-50 w-full border-b border-border/40 glass-navbar"
            role="banner"
          >
            <Navbar />
          </header>

          {/* Main content */}
          <main
            className="flex-1 overflow-y-auto pt-4 pb-6"
            role="main"
            id="main-content"
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

AppLayout.displayName = "AppLayout";
