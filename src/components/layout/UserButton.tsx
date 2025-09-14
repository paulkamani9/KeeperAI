"use client";

import React from "react";
import { Settings, LogOut, UserPlus } from "lucide-react";
import { useAuth, useUser, SignInButton } from "@clerk/nextjs";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserButtonProps {
  className?: string;
  variant?: "sidebar" | "navbar" | "mobile";
  onAction?: () => void; // For closing mobile sheets
}

export function UserButton({
  className,
  variant = "sidebar",
  onAction,
}: UserButtonProps) {
  const { signOut, isSignedIn } = useAuth();
  const { user } = useUser();

  const handleSignOut = () => {
    signOut();
    onAction?.();
  };

  const handleAction = () => {
    onAction?.();
  };

  // If user is not signed in, show join button
  if (!isSignedIn) {
    return (
      <div className={cn("animate-slide-up", className)}>
        <SignInButton mode="modal">
          <Button
            className={cn(
              "w-full gap-3 font-medium transition-all duration-200",
              variant === "sidebar" &&
                "h-12 justify-start px-3 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              variant === "navbar" && "h-9 px-4",
              variant === "mobile" && "h-11 justify-start"
            )}
            
          >
            <UserPlus className="h-5 w-5" />
            {variant === "navbar" ?<></> : <span>Join Keeper</span>}
          </Button>
        </SignInButton>
      </div>
    );
  }

  // Authenticated user dropdown
  if (variant === "mobile") {
    // Mobile version with expanded user info
    return (
      <div className={cn("border-t pt-6 animate-slide-up", className)}>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt="Profile"
              className="h-10 w-10 rounded-full ring-2 ring-border"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-sm font-medium text-primary-foreground">
                {user?.firstName?.[0] ||
                  user?.emailAddresses[0]?.emailAddress[0]}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {user?.emailAddresses[0]?.emailAddress}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-11"
            onClick={handleAction}
          >
            <Settings className="h-5 w-5" />
            <span>Profile Settings</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    );
  }

  // Dropdown version for sidebar and navbar
  return (
    <div className={cn("animate-slide-up", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "transition-all duration-200",
              variant === "sidebar" &&
                "w-full justify-start gap-3 h-12 px-3 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm",
              variant === "navbar" && "h-9 w-9 rounded-full p-0"
            )}
          >
            {variant === "sidebar" ? (
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt="Profile"
                    className="h-8 w-8 rounded-full ring-2 ring-sidebar-border"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center">
                    <span className="text-sm font-medium text-sidebar-primary-foreground">
                      {user?.firstName?.[0] ||
                        user?.emailAddresses[0]?.emailAddress[0]}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium text-sm truncate">
                    {user?.firstName || "User"}
                  </div>
                  <div className="text-xs text-sidebar-foreground/70 truncate">
                    {user?.emailAddresses[0]?.emailAddress}
                  </div>
                </div>
              </div>
            ) : // Navbar version - just avatar
            user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt="Profile"
                className="h-8 w-8 rounded-full ring-2 ring-border"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {user?.firstName?.[0] ||
                    user?.emailAddresses[0]?.emailAddress[0]}
                </span>
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 dark:border animate-slide-up"
          side={variant === "sidebar" ? "right" : "bottom"}
          sideOffset={8}
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.emailAddresses[0]?.emailAddress}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer hover:bg-accent"
            onClick={handleAction}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Profile Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
