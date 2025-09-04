"use client";

import { Heart, Home } from "lucide-react";
import Logo from "../shared/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
} from "../ui/sidebar";
import { SidebarNavItem } from "./SidebarNavItem";
import SidebarUserButton from "./SidebarUserButton";
import { ModeToggle } from "../ModeToggle";

// Navigation menu items
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
];

export const MainSidebar = () => {
  return (
    <Sidebar>
      <SidebarHeader>
        <Logo size="xl" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarNavItem
                  key={item.title}
                  title={item.title}
                  url={item.url}
                  icon={item.icon}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu className="">
          <SidebarUserButton />
          <div className="flex items-center justify-between pl-2">
            <div className="text-xs text-muted-foreground text-center flex-1">
              <p>© {new Date().getFullYear()} Keeper AI.</p>
              <a href="/terms" className="text-muted-foreground underline">Terms and Conditions</a>
             
            </div>
            <ModeToggle />
          </div>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
