"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, Search, Plus } from "lucide-react";
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




export default function Header() {
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const user = session?.user;


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
          {/* GitHub-like Search */}
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="group flex h-8 w-[180px] md:w-[260px] items-center gap-2 rounded-md border border-input bg-transparent  px-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                <Search className="size-4 shrink-0 mx-1" />
                <span className="flex-1 text-left">Search...</span>
              </button>
            </DialogTrigger>
            <DialogContent className="p-0 border-none ring-0 bg-transparent shadow-none w-full max-w-2xl top-4 translate-y-0 px-4 md:px-0 [&>button]:hidden">
              <div className="flex h-8 w-full items-center gap-2 rounded-md border border-input bg-card shadow-lg px-2">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 border-0 bg-transparent dark:bg-transparent text-sm focus-visible:ring-0 px-0 h-full shadow-none rounded-none"
                />
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
