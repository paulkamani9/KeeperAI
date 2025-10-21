"use client";

import React from "react";
import Link from "next/link";
import { Search, Heart, BookOpen, BookMarked, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/ModeToggle";
import Logo from "@/components/shared/Logo";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePathname } from "next/navigation";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";

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
  const { isSignedIn, isLoaded } = useUser();

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
    // {
    //   href: "/readlist",
    //   label: "Reading List",
    //   icon: BookMarked,
    // },
    // {
    //   href: "/summaries",
    //   label: "Books",
    //   icon: BookOpen,
    // },
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

          {/* Right Section - Navigation Icons + Auth + Mode Toggle */}
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

            {/* Authentication UI */}
            {!isLoaded && (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            )}

            {isLoaded && !isSignedIn && (
              <SignInButton mode="modal">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Sign In"
                >
                  <User className="h-5 w-5" />
                </Button>
              </SignInButton>
            )}

            {isLoaded && isSignedIn && (
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-6 w-6",
                  },
                }}
              />
            )}
          </div>
        </>
      ) : (
        // Desktop Layout: Auth + Mode Toggle (sidebar has its own trigger)
        <>
          {/* Left Section - Empty (sidebar has its own trigger) */}
          <div />

          {/* Center Section - Empty */}
          <div />

          {/* Right Section - Auth + Mode Toggle */}
          <div className="flex items-center gap-4">
            {/* Authentication UI */}
            {!isLoaded && (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            )}

            {isLoaded && !isSignedIn && (
              <SignInButton mode="modal">
                <Button variant="outline" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </SignInButton>
            )}

            {isLoaded && isSignedIn && (
              <div className="flex items-center gap-4">
                <Link href="/favorites">
                  <Button variant="ghost" size="sm">
                    <Heart className="h-4 w-4 mr-2" />
                    Favorites
                  </Button>
                </Link>
                <Link href="/readlist">
                  <Button variant="ghost" size="sm">
                    <BookMarked className="h-4 w-4 mr-2" />
                    Reading List
                  </Button>
                </Link>
                <Link href="/saved-summaries">
                  <Button variant="ghost" size="sm">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Saved
                  </Button>
                </Link>
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "h-7 w-7",
                    },
                  }}
                />
              </div>
            )}

            <ModeToggle />
          </div>
        </>
      )}
    </nav>
  );
}

Navbar.displayName = "Navbar";
