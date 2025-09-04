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
        <SidebarGroup>
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
        <SidebarMenu>
          <SidebarUserButton />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
