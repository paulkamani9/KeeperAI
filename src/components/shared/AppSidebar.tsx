"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Heart, BookOpen, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar as SidebarComponent,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import Logo from "@/components/shared/Logo";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  shortcut?: string;
}

/**
 * Application sidebar using shadcn/ui sidebar component
 *
 * Features:
 * - Desktop: Toggleable between collapsed (logo+icons) and expanded (icons+text)
 * - Mobile: Fully hidden when closed, fully open when triggered
 * - Logo always visible in header for branding consistency
 * - Prominent, clickable icons in all states
 * - Clean, minimal design that can grow
 */
export default function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, state } = useSidebar();

  const navigationItems: NavItem[] = [
    {
      href: "/",
      label: "Home",
      icon: Home,
      shortcut: "H",
    },
    {
      href: pathname.startsWith("/search") ? "#search-header" : "/search",
      label: "Search",
      icon: Search,
      shortcut: "S",
    },
    {
      href: "/favorites",
      label: "Favorites",
      icon: Heart,
      shortcut: "F",
    },
    {
      href: "/summaries",
      label: "Summaries",
      icon: BookOpen,
      shortcut: "R",
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <SidebarComponent
      variant="sidebar"
      collapsible="icon"
      className={cn(
        "z-[51] transition-all duration-300 ease-in-out",
        // Clean, minimal design - no hover effects needed
        "border-r border-sidebar-border"
      )}
    >
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex flex-col justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center transition-opacity hover:opacity-80"
              aria-label="OutClever Home"
            >
              {state === "expanded" ? (  <Logo size="md" />) : <p>🚀</p>}
            </Link>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <div className="w-full flex">
          {!isMobile && (
            <SidebarTrigger
              className={cn(
                "h-10 w-10 flex-1 scale-150",
                state === "expanded" &&
                  "rotate-180 transition-transform translate-x-[10] duration-200"
              )}
            />
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel
            className={cn(
              "transition-all duration-300 ease-in-out",
              // Use group-data classes for better compatibility
              "group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:translate-x-2",
              "group-data-[collapsible=offcanvas]:opacity-100 group-data-[collapsible=offcanvas]:translate-x-0",
              "group-data-[state=expanded]:opacity-100 group-data-[state=expanded]:translate-x-0"
            )}
          >
            Main Menu
            {/* Sidebar trigger - only show on desktop */}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      size="lg"
                      className={cn(
                        "w-full justify-start",
                        "transition-all duration-300 ease-in-out",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        // Enhanced hover effects
                        "group/menu-item relative overflow-hidden"
                        // active &&
                        // "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                    >
                      <Link
                        href={item.href}
                        className="flex items-center gap-4 relative z-10"
                      >
                        <Icon
                          className={cn(
                            "flex-shrink-0 transition-all duration-300 ease-in-out md:scale-120",
                            // Prominent icons - larger and always visible
                            // "h-7 w-7",
                            // Icon effects for active state
                            // active && "scale-110"
                            state === "collapsed" && "ml-1"
                          )}
                        />
                        <span
                          className={cn(
                            "font-medium transition-all duration-300 ease-in-out",
                            // Text visibility using group-data classes
                            "group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden",
                            "group-data-[collapsible=offcanvas]:opacity-100 group-data-[collapsible=offcanvas]:w-auto",
                            "group-data-[state=expanded]:opacity-100 group-data-[state=expanded]:w-auto"
                          )}
                        >
                          {item.label}
                        </span>
                        {item.shortcut && !isMobile && (
                          <kbd
                            className={cn(
                              "ml-auto text-xs bg-sidebar-border px-1.5 py-0.5 rounded opacity-60 transition-all duration-300 ease-in-out",
                              // Show keyboard shortcuts only when expanded
                              "group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden",
                              "group-data-[collapsible=offcanvas]:opacity-100 group-data-[collapsible=offcanvas]:w-auto",
                              "group-data-[state=expanded]:opacity-100 group-data-[state=expanded]:w-auto"
                            )}
                          >
                            {item.shortcut}
                          </kbd>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div
          className={cn(
            "text-center text-xs text-sidebar-foreground/60 transition-all duration-300 ease-in-out",
            // Use group-data classes for better compatibility
            "group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:translate-x-2",
            "group-data-[collapsible=offcanvas]:opacity-100 group-data-[collapsible=offcanvas]:translate-x-0",
            "group-data-[state=expanded]:opacity-100 group-data-[state=expanded]:translate-x-0"
          )}
        >
          <p>KeeperAI v1.0</p>
        </div>
      </SidebarFooter>
    </SidebarComponent>
  );
}

AppSidebar.displayName = "AppSidebar";
