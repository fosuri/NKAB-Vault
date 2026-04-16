"use client";

import Image from "next/image";
import { Loader2, Search } from "lucide-react";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { SearchSuggestion } from "./types";

type HeaderSearchProps = {
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isSearching: boolean;
  search: string;
  setSearch: (value: string) => void;
  searchQuery: string;
  suggestions: SearchSuggestion[];
  submitSearch: () => void;
  openPostFromSuggestion: (postId: string) => void;
};

export function HeaderSearch({
  isSearchOpen,
  setIsSearchOpen,
  isSearching,
  search,
  setSearch,
  searchQuery,
  suggestions,
  submitSearch,
  openPostFromSuggestion,
}: HeaderSearchProps) {
  return (
    <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="group flex h-8 w-44 items-center justify-start gap-2 rounded-md border-input bg-transparent px-2 text-sm text-muted-foreground transition-colors hover:bg-muted md:w-64 lg:w-80"
        >
          <Search className="mx-1 size-4 shrink-0" />
          <span className="flex-1 text-left">Search...</span>
        </Button>
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
                  <Button
                    key={item.id}
                    variant="ghost"
                    onClick={() => openPostFromSuggestion(item.id)}
                    className="grid min-h-16 h-auto w-full grid-cols-[3rem,minmax(0,1fr)] items-start gap-3 overflow-hidden rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/60 font-normal whitespace-normal"
                  >
                    <div className="relative mt-0.5 size-12 overflow-hidden rounded-md border border-border/70 bg-muted shrink-0">
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
                    <div className="min-w-0 space-y-0.5 pt-0.5 flex flex-col justify-start">
                      <p className="truncate text-sm font-semibold leading-tight text-foreground">{item.title}</p>
                      <p className="truncate text-xs leading-tight text-muted-foreground">{item.description}</p>
                      <p className="truncate text-[11px] leading-tight text-muted-foreground/80">by {item.authorName}</p>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="px-2 py-4 text-sm text-muted-foreground">No matching posts found.</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border/60 p-2">
            <p className="text-xs text-muted-foreground">Press Enter to open all results.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={submitSearch}
              disabled={!searchQuery}
            >
              Show all results
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}