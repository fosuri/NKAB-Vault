"use client";

import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

import type { HeaderUser } from "./types";

type HeaderDesktopProps = {
  isPending: boolean;
  user?: HeaderUser | null;
  showAdminDashboardLink: boolean;
  showModeratorDashboardLink: boolean;
  onSignOut: () => void;
};

export function HeaderDesktop({
  isPending,
  user,
  showAdminDashboardLink,
  showModeratorDashboardLink,
  onSignOut,
}: HeaderDesktopProps) {
  if (isPending) {
    return <div className="hidden size-8 animate-pulse rounded-full bg-muted lg:block" />;
  }

  if (!user) {
    return (
      <div className="hidden items-center gap-4 lg:flex">
        <Link href="/sign-in" className="text-base text-foreground">
          Sign In
        </Link>
        <Link href="/sign-up" className="text-base text-foreground">
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="hidden h-8 w-8 lg:block">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded-full outline-none ring-ring/50 focus-visible:ring-3"
            aria-label="Open profile menu"
          >
            <Avatar>
              {user.image ? <AvatarImage src={user.image} alt={user.name || ""} /> : null}
              <AvatarFallback>{user.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="flex w-48 flex-col gap-0.5 p-1.5">
          <DropdownMenuItem asChild>
            <Link
              href="/profile"
              className="w-full cursor-pointer rounded-sm px-2 py-1.5 text-base font-medium transition-colors hover:bg-muted hover:text-primary"
            >
              Profile
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href="/new-post"
              className="w-full cursor-pointer rounded-sm px-2 py-1.5 text-base font-medium transition-colors hover:bg-muted hover:text-primary"
            >
              Add Post
            </Link>
          </DropdownMenuItem>

          {showAdminDashboardLink ? (
            <DropdownMenuItem asChild>
              <Link
                href="/admin"
                className="w-full cursor-pointer rounded-sm px-2 py-1.5 text-base font-medium transition-colors hover:bg-muted hover:text-primary"
              >
                Admin Dashboard
              </Link>
            </DropdownMenuItem>
          ) : null}

          {showModeratorDashboardLink ? (
            <DropdownMenuItem asChild>
              <Link
                href="/moderator"
                className="w-full cursor-pointer rounded-sm px-2 py-1.5 text-base font-medium transition-colors hover:bg-muted hover:text-primary"
              >
                Moderator Dashboard
              </Link>
            </DropdownMenuItem>
          ) : null}

          <Separator className="my-1" />

          <DropdownMenuItem
            className="cursor-pointer rounded-sm px-2 py-1.5 text-base font-medium transition-colors hover:bg-muted hover:text-destructive focus:bg-muted focus:text-destructive"
            onSelect={(event) => {
              event.preventDefault();
              onSignOut();
            }}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}