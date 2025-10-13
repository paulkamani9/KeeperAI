"use client";

import React from "react";
import Link from "next/link";
import { Search, Heart, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/ModeToggle";
import Logo from "@/components/shared/Logo";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePathname } from "next/navigation";

interface NavbarProps {
  className?: string;
}

/**
 * Responsive navigation bar
 *
 * Desktop/PC View:
 * - Mode toggle only (sidebar has its own trigger)
 *
 * Mobile View:
 * - Sidebar trigger button
 * - Logo symbol
 * - Navigation icons (search, favorites, books)
 * - Mode toggle (theme switching)
 */
export default function Navbar({ className }: NavbarProps) {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  const mobileNavigationItems = [
    {
      href: pathname.startsWith("/search") ? "#search-header" : "/search",
      label: "Search",
      icon: Search,
    },
    {
      href: "/favorites",
      label: "Favorites",
      icon: Heart,
    },
    {
      href: "/summaries",
      label: "Books",
      icon: BookOpen,
    },
  ];

  return (
    <nav
      className={cn(
        "flex h-[60px] w-full items-center justify-between",
        "px-4 md:px-6 lg:px-8",
        "backdrop-blur-xl bg-background/20",
        "border-b border-border/20",
        className
      )}
      role="navigation"
      aria-label="Primary navigation"
    >
      {isMobile ? (
        // Mobile Layout: Trigger + Logo + Navigation Icons
        <>
          {/* Left Section - Sidebar Trigger */}
          <div className="flex items-center">
            <SidebarTrigger className="h-8 w-8" />
          </div>

          {/* Center Section - Logo */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center transition-opacity hover:opacity-80"
              aria-label="OutClever Home"
            >
              {/* <Logo size="sm" /> */}
            </Link>
          </div>

          {/* Right Section - Navigation Icons + Mode Toggle */}
          <div className="flex items-center gap-1">
            {mobileNavigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  size="icon"
                  asChild
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Link href={item.href} aria-label={item.label}>
                    <Icon className="h-5 w-5" />
                  </Link>
                </Button>
              );
            })}
            <ModeToggle />
          </div>
        </>
      ) : (
        // Desktop Layout: Mode Toggle Only (sidebar has its own trigger)
        <>
          {/* Left Section - Empty (sidebar has its own trigger) */}
          <div />

          {/* Center Section - Empty */}
          <div />

          {/* Right Section - Mode Toggle */}
          <div className="flex items-center">
            <ModeToggle />
          </div>
        </>
      )}
    </nav>
  );
}

Navbar.displayName = "Navbar";
