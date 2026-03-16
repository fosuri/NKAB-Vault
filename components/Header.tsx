"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "./theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient, signOut } from "@/lib/auth/auth-client";



export default function Header() {
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  return (
    <header className="flex items-center justify-between bg-background text-foreground px-4 py-0 h-16 border-b border-border">
      <Link href="/" className=" px-3 h-10 flex items-center gap-2">
        <div className="bg-amber-300 w-8 h-8 " >
          
        </div>
        <div className="bg-accent text-accent-foreground text-2xl font-bold px-3">
          NKAB Vault
        </div>
      </Link>

      <form
        className="
        relative flex items-center px-2 h-10 border-b border-border

        before:absolute before:left-0 before:bottom-0
        before:h-1/2 before:w-px before:bg-border

        after:absolute after:right-0 after:bottom-0
        after:h-1/2 after:w-px after:bg-border
      "
      >
        <div>
          <Link href="/" className="text-foreground text-base px-4 py-2 block font-semibold fon">
            FEED
          </Link>
        </div>
        <span className="h-5 w-0.5 bg-accent"></span>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-muted-foreground placeholder:text-muted-foreground text-base font-semibold bg-transparent outline-none inline-block px-4 py-2"
        />
      </form>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        {isPending ? (
          <div className="size-8 animate-pulse rounded-full bg-muted" />
        ) : !user ? (
          <>
            <Link href="/sign-in" className="text-foreground text-base">
              Sign In
            </Link>
            <Link href="/sign-up" className="text-foreground text-base">
              Sign Up
            </Link>
          </>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-full outline-none ring-ring/50 focus-visible:ring-3"
                aria-label="Open profile menu"
              >
                <Avatar>
                  <AvatarFallback>{user?.name?.charAt(0) || user?.email?.charAt(0)}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  void signOut(router);
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
