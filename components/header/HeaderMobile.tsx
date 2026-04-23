"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HeaderUser } from "./types";

type HeaderMobileProps = {
  isPending: boolean;
  user?: HeaderUser | null;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  showAdminDashboardLink: boolean;
  showModeratorDashboardLink: boolean;
  onSignOut: () => void;
};

export function HeaderMobile({
  isPending,
  user,
  isSidebarOpen,
  setIsSidebarOpen,
  showAdminDashboardLink,
  showModeratorDashboardLink,
  onSignOut,
}: HeaderMobileProps) {
  return (
    <div className="lg:hidden">
      {!isPending ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md outline-none ring-ring/50 focus-visible:ring-3"
          aria-label="Open sidebar"
        >
          <Menu className="size-5" />
        </Button>
      ) : null}

      {isSidebarOpen ? (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}

      <div
        className={`fixed inset-y-0 right-0 z-50 h-full w-64 bg-background p-4 shadow-lg transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {user ? (
              <Avatar size="lg" className={cn("size-16", user.isPro && "outline-1 outline-pro-bg outline-offset-2 border-none")}>
                {user.image ? <AvatarImage src={user.image} alt={user.name || ""} /> : null}
                <AvatarFallback>{user.name?.charAt(0) ?? user.email?.charAt(0) ?? "U"}</AvatarFallback>
              </Avatar>
            ) : null}
            <span className="text-lg font-bold">Menu</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-md"
          >
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex flex-col">
          {!user ? (
            <>
              <Link
                href="/sign-in"
                onClick={() => setIsSidebarOpen(false)}
                className="text-lg font-medium transition-colors hover:text-primary"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                onClick={() => setIsSidebarOpen(false)}
                className="text-lg font-medium transition-colors hover:text-primary"
              >
                Sign Up
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/profile"
                onClick={() => setIsSidebarOpen(false)}
                className="rounded-sm px-2 py-1 text-base font-medium transition-colors hover:bg-muted hover:text-primary"
              >
                Profile
              </Link>
              <Link
                href="/new-post"
                onClick={() => setIsSidebarOpen(false)}
                className="rounded-sm px-2 py-1 text-base font-medium transition-colors hover:bg-muted hover:text-primary"
              >
                Add Post
              </Link>
              {showAdminDashboardLink ? (
                <Link
                  href="/admin"
                  onClick={() => setIsSidebarOpen(false)}
                  className="rounded-sm px-2 py-1 text-base font-medium transition-colors hover:bg-muted hover:text-primary"
                >
                  Admin Dashboard
                </Link>
              ) : null}
              {showModeratorDashboardLink ? (
                <Link
                  href="/moderator"
                  onClick={() => setIsSidebarOpen(false)}
                  className="rounded-sm px-2 py-1 text-base font-medium transition-colors hover:bg-muted hover:text-primary"
                >
                  Moderator Dashboard
                </Link>
              ) : null}
              <Separator className="my-1" />
              <Button
                variant="ghost"
                onClick={() => {
                  setIsSidebarOpen(false);
                  onSignOut();
                }}
                className="w-full justify-start rounded-sm px-2 py-1 text-base font-medium transition-colors hover:bg-muted hover:text-destructive"
              >
                Sign out
              </Button>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}