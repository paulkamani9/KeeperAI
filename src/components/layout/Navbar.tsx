"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import Logo from "@/components/shared/Logo";
import { UserButton } from "./UserButton";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/ModeToggle";



interface NavbarProps {
  className?: string;
}

export function KeeperNavbar({ className }: NavbarProps) {
  const pathname = usePathname();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border/40",
        "glass backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "animate-slide-up",
        className
      )}
    >
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left Section - Sidebar Toggle + Logo */}
        <div className="flex items-center gap-3">
          {/* Sidebar Toggle (Mobile only) */}
          <SidebarTrigger className="md:hidden" />

          {/* Logo (Always visible, memorable branding) */}
          <Link href="/" className="flex items-center">
            <Logo size="md" />
          </Link>
        </div>

        {/* Right Section - Navigation */}
        <div className="flex items-center gap-2">

          {/* Compact Icon Buttons (Shown on mobile and desktop) */}
          <div className="flex items-center gap-1">
            {/* Favorites */}
            <Button asChild variant="ghost" size="icon" aria-label="Favorites">
              <Link href="/favorites">
                <Heart className="h-5 w-5" />
              </Link>
            </Button>

            {/* Saved Summaries */}
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Saved Summaries"
            >
              <Link href="/summaries">
                <FileText className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Theme Toggle (Always visible) */}
          <div>
            <ModeToggle />
          </div>

          {/* User Button (Shows avatar or sign-in) */}
          <div>
            <UserButton variant="navbar" />
          </div>
        </div>
      </div>
    </header>
  );
}
