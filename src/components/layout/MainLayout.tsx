"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import { KeeperSidebar } from "./Sidebar";
import { KeeperNavbar } from "./Navbar";
import { KeeperLoadingScreen } from "./KeeperLoadingScreen";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

// Routes that should NOT show the sidebar/navbar layout
const excludedRoutes = ["/sign-in", "/sign-up", "/auth"];

// Check if current path is an auth route (should be excluded)
function isAuthRoute(pathname: string): boolean {
  return excludedRoutes.some(
    (route) => pathname.startsWith(route) || pathname.includes("/(auth)")
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const { isLoaded } = useAuth();

  // Don't render layout for auth pages
  if (isAuthRoute(pathname)) {
    return <>{children}</>;
  }

  // Show beautiful loading state while auth is loading
  if (!isLoaded) {
    return <KeeperLoadingScreen />;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full bg-background">
        {/* Responsive Layout Container */}
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar - Responsive behavior */}
          <KeeperSidebar />

          {/* Main Content Area - Properly constrained */}
          <SidebarInset className="flex flex-col flex-1 min-w-0 overflow-hidden">
            {/* Navbar - Always visible */}
            <KeeperNavbar />

            {/* Page Content - Properly scrollable within constraints */}
            <main
              className={cn(
                "flex-1 overflow-auto bg-muted/30", // Subtle background contrast
                "animate-fade-in"
              )}
            >
              <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
