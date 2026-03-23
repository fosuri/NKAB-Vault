"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, Search } from "lucide-react";

import { ThemeToggle } from "./theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient, signOut } from "@/lib/auth/auth-client";
import { Field } from "./ui/field";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";



export default function Header() {
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const user = session?.user;

  return (
    <>
      <header className="flex items-center justify-between bg-background text-foreground px-4 h-16 border-b border-border">
      <Link href="/" className=" h-10 flex items-center gap-2">
        <div className="bg-amber-300 min-w-8 min-h-8 " >

        </div>
        <div className="hidden lg:block text-foreground text-2xl font-bold px-3">
          <h2>NKAB Vault</h2>
        </div>
      </Link>

      <Field
        orientation="horizontal"
          className="relative group flex h-8 w-full max-w-lg items-center rounded-lg border border-input bg-input/10 dark:bg-input/30 px-3 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 mx-2 md:mx-4 lg:mx-8"
      >
        <Search className="size-4 text-muted-foreground transition-colors group-focus-within:text-foreground shrink-0" />
        <Input
          type="search"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 h-full border-none bg-transparent dark:bg-transparent px-2 focus-visible:ring-0 md:text-sm shadow-none"
        />
      </Field>

      <div className="flex items-center gap-4">
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
            <div className="hidden lg:block">
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
                      href="/add-post"
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

    {/* sidebar */}
    <div className="lg:hidden">
      {/* sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* sidebar panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 h-full w-64 bg-background p-4 shadow-lg transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            {user && (
              <Avatar className="size-8">
                <AvatarFallback>{user?.name?.charAt(0) || user?.email?.charAt(0)}</AvatarFallback>
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
                href="/add-post"
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
