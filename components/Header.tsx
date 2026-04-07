"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Menu, Plus, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

import { ThemeToggle } from "./theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient, signOut } from "@/lib/auth/auth-client";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import Image from "next/image";

type SearchSuggestion = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  authorName: string;
  previewUrl: string | null;
};


export default function Header() {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const user = session?.user;
  const searchQuery = search.trim();

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
          <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <DialogTrigger asChild>
              <button
                className="group flex h-8 w-44 items-center gap-2 rounded-md border border-input bg-transparent px-2 text-sm text-muted-foreground transition-colors hover:bg-muted md:w-64 lg:w-80"
              >
                <Search className="mx-1 size-4 shrink-0" />
                <span className="flex-1 text-left">Search...</span>
              </button>
            </DialogTrigger>
            <DialogContent className="top-4 w-full max-w-2xl translate-y-0 border-none bg-transparent p-0 px-4 ring-0 shadow-none sm:max-w-2xl lg:max-w-3xl md:px-0 [&>button]:hidden">
              <div className="rounded-xl border border-input bg-card shadow-lg">
                <div className="flex h-10 w-full items-center gap-2 border-b border-border/60 px-2">
                  <Search className="size-4 shrink-0 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Search posts..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        submitSearch();
                      }
                    }}
                    className="h-full flex-1 rounded-none border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
                  />
                  {isSearching ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
                </div>

                <div className="max-h-80 overflow-y-auto p-2">
                  {!searchQuery ? (
                    <p className="px-2 py-4 text-sm text-muted-foreground">Start typing to see matching posts.</p>
                  ) : suggestions.length ? (
                    <div className="space-y-1.5">
                      {suggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openPostFromSuggestion(item.id)}
                          className="grid min-h-16 w-full grid-cols-[3rem,minmax(0,1fr)] items-start gap-3 overflow-hidden rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/60"
                        >
                          <div className="relative mt-0.5 size-12 overflow-hidden rounded-md border border-border/70 bg-muted">
                            {item.previewUrl ? (
                              <Image
                                src={item.previewUrl}
                                alt={item.title || "Post preview"}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <Search className="size-3.5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 space-y-0.5 pt-0.5">
                            <p className="truncate text-sm leading-tight font-semibold text-foreground">{item.title}</p>
                            <p className="truncate text-xs leading-tight text-muted-foreground">{item.description}</p>
                            <p className="truncate text-[11px] leading-tight text-muted-foreground/80">by {item.authorName}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="px-2 py-4 text-sm text-muted-foreground">No matching posts found.</p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border/60 p-2">
                  <p className="text-xs text-muted-foreground">Press Enter to open all results.</p>
                  <button
                    type="button"
                    onClick={submitSearch}
                    disabled={!searchQuery}
                    className="h-8 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Show all results
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>


          <ThemeToggle />
          {isPending ? (
            <div className="size-8 animate-pulse rounded-full bg-muted" />
          ) : !user ? (
            <>
              <div className="hidden lg:flex items-center gap-4">
                <Link href="/sign-in" className="text-foreground text-base">
                  Sign In
                </Link>
                <Link href="/sign-up" className="text-foreground text-base">
                  Sign Up
                </Link>
              </div>
              <div className="lg:hidden">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="flex items-center justify-center h-8 w-8 rounded-md outline-none ring-ring/50 focus-visible:ring-3 hover:bg-accent hover:text-accent-foreground"
                  aria-label="Open sidebar"
                >
                  <Menu className="size-5" />
                </button>
              </div>
            </>
          ) : (
            <>
                  <div className="hidden lg:block w-8 h-8">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="rounded-full outline-none ring-ring/50 focus-visible:ring-3 "
                      aria-label="Open profile menu"
                    >
                      <Avatar>
                        {user?.image ? <AvatarImage src={user.image} alt={user.name || ""} /> : null}
                        <AvatarFallback>{user?.name?.charAt(0) || user?.email?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 p-1.5 flex flex-col gap-0.5">
                    <DropdownMenuItem asChild>
                      <Link
                        href="/profile"
                        className="w-full text-base font-medium px-2 py-1.5 rounded-sm hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                      >
                        Profile
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link
                        href="/new-post"
                        className="w-full text-base font-medium px-2 py-1.5 rounded-sm hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                      >
                        Add Post
                      </Link>
                    </DropdownMenuItem>

                    <Separator className="my-1" />

                    <DropdownMenuItem
                      className="cursor-pointer text-base font-medium px-2 py-1.5 rounded-sm hover:bg-muted hover:text-destructive focus:bg-muted focus:text-destructive transition-colors"
                      onSelect={(event) => {
                        event.preventDefault();
                        void signOut(router);
                      }}
                    >
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="lg:hidden">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="flex items-center justify-center h-8 w-8 rounded-md outline-none ring-ring/50 focus-visible:ring-3 hover:bg-accent hover:text-accent-foreground"
                  aria-label="Open sidebar"
                >
                  <Menu className="size-5" />
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="lg:hidden">
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div
          className={`fixed inset-y-0 right-0 z-50 h-full w-64 bg-background p-4 shadow-lg transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "translate-x-full"
            }`}
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              {user && (
                <Avatar size="lg" className="size-16">
                  {session.user.image ? <AvatarImage src={session.user.image} alt={session.user.name} /> : null}
                  <AvatarFallback>{session.user.name?.charAt(0) ?? session.user.email?.charAt(0) ?? "U"}</AvatarFallback>
                </Avatar>
              )}
              <span className="font-bold text-lg">Menu</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-md p-2 hover:bg-accent hover:text-accent-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
          <nav className="flex flex-col ">
            {!user ? (
              <>
                <Link
                  href="/sign-in"
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-lg font-medium hover:text-primary transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-lg font-medium hover:text-primary transition-colors"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/profile"
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-base hover:bg-muted rounded-sm px-2 py-1 font-medium hover:text-primary transition-colors"
                >
                  Profile
                </Link>
                <Link
                  href="/new-post"
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-base hover:bg-muted rounded-sm px-2 py-1 font-medium hover:text-primary transition-colors"
                >
                  Add Post
                </Link>
                <Separator className="my-1" />
                <button
                  onClick={() => {
                    setIsSidebarOpen(false);
                    void signOut(router);
                  }}
                  className="text-left text-base hover:bg-muted rounded-sm px-2 py-1 font-medium hover:text-destructive transition-colors"
                >
                  Sign out
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
