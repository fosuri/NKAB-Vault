"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { ROLES, type RoleId } from "@/lib/db/auth-schema";

import { authClient, signOut } from "@/lib/auth/auth-client";
import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";
import { HeaderDesktop } from "./header/HeaderDesktop";
import { HeaderMobile } from "./header/HeaderMobile";
import { HeaderSearch } from "./header/HeaderSearch";
import { NotificationsMenu } from "./NotificationsMenu";
import { MessagesIcon } from "./MessagesIcon";

import type { SearchSuggestion } from "./header/types";

type HeaderProps = {
  userRoleId?: RoleId | null;
  isPro?: boolean;
};

export default function Header({ userRoleId, isPro }: HeaderProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const user = session?.user ? { ...session.user, isPro } : null;

  const searchQuery = search.trim();
  const showAdminDashboardLink = userRoleId === ROLES.ADMIN;
  const showModeratorDashboardLink = userRoleId === ROLES.MODERATOR;

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    if (!searchQuery) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setIsSearching(true);
        const params = new URLSearchParams({
          q: searchQuery,
          limit: "6",
        });

        const response = await fetch(`/api/posts/search?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setSuggestions([]);
          return;
        }

        const data = (await response.json()) as { suggestions?: SearchSuggestion[] };
        setSuggestions(data.suggestions ?? []);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 220);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [isSearchOpen, searchQuery]);

  const submitSearch = () => {
    if (!searchQuery) {
      return;
    }

    setIsSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const openPostFromSuggestion = (postId: string) => {
    setIsSearchOpen(false);
    router.push(`/post/${postId}`);
  };

  const handleSignOut = () => {
    void signOut(router);
  };


  return (
    <>
      <header className="flex items-center justify-between bg-background text-foreground px-4 h-16 border-b border-border">
        <div className="flex items-center gap-2">
          <Link href="/" className=" h-10 flex items-center gap-2">
            <div className="bg-transparent min-w-8 min-h-8 " >
              <Image src="/Logo.png" alt="Logo" width={32} height={32} />
            </div>
            <div className="hidden lg:block text-foreground text-2xl font-bold px-3">
              <h2>NKAB Vault</h2>
            </div>
          </Link>
          <Link
            href="/new-post"
            className="flex items-center justify-center h-8 px-2  gap-2 rounded-md outline-none hover:bg-accent hover:text-accent-foreground ring-ring/50 focus-visible:ring-3 border border-border text-foreground transition-colors"
            aria-label="Upload Post"
          >
            <div className="flex items-center justify-center">
              <Plus className="size-4" />
            </div>
            <span className="hidden lg:block text-foreground text-sm">New Post</span>
          </Link>
        </div>


        <div className="flex items-center gap-2 sm:gap-3">
          <HeaderSearch
            isSearchOpen={isSearchOpen}
            setIsSearchOpen={setIsSearchOpen}
            isSearching={isSearching}
            search={search}
            setSearch={setSearch}
            searchQuery={searchQuery}
            suggestions={suggestions}
            submitSearch={submitSearch}
            openPostFromSuggestion={openPostFromSuggestion}
          />
          {session?.user && (
            <>
              <MessagesIcon />
              <NotificationsMenu />
            </>
          )}
          <ThemeToggle />
          <HeaderDesktop
            isPending={isPending}
            user={user}
            showAdminDashboardLink={showAdminDashboardLink}
            showModeratorDashboardLink={showModeratorDashboardLink}
            onSignOut={handleSignOut}
          />
          <HeaderMobile
            isPending={isPending}
            user={user}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            showAdminDashboardLink={showAdminDashboardLink}
            showModeratorDashboardLink={showModeratorDashboardLink}
            onSignOut={handleSignOut}
          />
        </div>
      </header>
    </>
  );
}
