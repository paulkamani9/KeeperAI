"use client";

import React from "react";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { SidebarTrigger } from "../ui/sidebar";
import { KeeperSymbol } from "./Logo";
import { ModeToggle } from "../ModeToggle";
import { UserButton } from "@clerk/nextjs";
import { Button } from "../ui/button";

export const MobileNavbar = () => {
  const { user } = useUser();

  return (
    <header className="md:hidden right-0 sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Left side: Sidebar trigger + Logo symbol */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="h-9 w-9" />
          <Link href="/" className="flex items-center">
            <KeeperSymbol
              size="md"
              className="hover:scale-105 transition-transform duration-200"
            />
          </Link>
        </div>

        {/* Right side: Navigation actions */}
        <div className="flex items-center gap-2">
          {/* Favorites heart icon */}
          <Link href="/favorites">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-accent transition-colors"
              aria-label="Go to favorites"
            >
              <Heart className="h-4 w-4" />
            </Button>
          </Link>

          {/* Mode toggle */}
          <div className="scale-90">
            <ModeToggle />
          </div>

          {/* User button - only show if signed in */}
          {user && (
            <div className="scale-90">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-9 w-9",
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
