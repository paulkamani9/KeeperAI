"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, FileText, Home } from "lucide-react";

import { cn } from "@/lib/utils";
import Logo from "@/components/shared/Logo";
import { UserButton } from "./UserButton";
import {
  Sidebar as UISidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/ModeToggle";

const navigationItems = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Favorites",
    url: "/favorites",
    icon: Heart,
  },
  {
    title: "Saved Summaries",
    url: "/summaries",
    icon: FileText,
  },
];

export function KeeperSidebar() {
  const pathname = usePathname();

  return (
    <UISidebar variant="sidebar" className="border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-6">
        <div className="animate-fade-in">
          <Logo size="lg" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4">
        <SidebarMenu>
          {navigationItems.map((item) => {
            const isActive = pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  size="lg"
                  className={cn(
                    "group transition-all duration-200 hover:translate-x-1",
                    "focus-visible:translate-x-1 focus-visible:shadow-md",
                    isActive && "bg-sidebar-accent shadow-sm"
                  )}
                  tooltip={item.title}
                >
                  <Link href={item.url} className="flex items-center gap-3">
                    <item.icon
                      className={cn(
                        "h-5 w-5 transition-colors",
                        isActive
                          ? "text-sidebar-accent-foreground"
                          : "text-sidebar-foreground group-hover:text-sidebar-accent-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "font-medium transition-colors",
                        isActive
                          ? "text-sidebar-accent-foreground"
                          : "text-sidebar-foreground group-hover:text-sidebar-accent-foreground"
                      )}
                    >
                      {item.title}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarSeparator className="mx-4" />

      <SidebarFooter className="p-4 space-y-3">
        {/* Theme Toggle */}
        <div className="flex justify-center">
          <ModeToggle />
        </div>

        {/* User Button - Shows for all users */}
        <UserButton variant="sidebar" />
      </SidebarFooter>
    </UISidebar>
  );
}
