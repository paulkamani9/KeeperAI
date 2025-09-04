"use client";

import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";

interface SidebarNavItemProps {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: number;
}

export const SidebarNavItem = ({
  title,
  url,
  icon: Icon,
  badge,
}: SidebarNavItemProps) => {
  const pathname = usePathname();
  const isActive = pathname === url || pathname.startsWith(url + "/");

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={url} className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span>{title}</span>
          {badge && badge > 0 && (
            <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-medium text-sidebar-primary-foreground">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};
