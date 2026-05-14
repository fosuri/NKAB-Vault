"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { PostContentFilter, PostTimeFilter } from "@/lib/posts";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

type PostFilterControlsProps = {
  actionPath: string;
  time: PostTimeFilter;
  contentType: PostContentFilter;
  query?: string;
};

// Map internal filter values to user-friendly labels
const TIME_LABELS: Record<string, string> = {
  "all": "Any time",
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "365d": "Last year",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  "all": "Any content",
  "image": "Image",
  "gif": "GIF",
  "video": "Video",
};

/**
 * Post Filter Controls.
 * Provides a UI for narrowing down post results based on time and media type.
 * Uses a form-based approach to trigger server-side filtering via URL query parameters.
 */
export function PostFilterControls({ actionPath, time, contentType, query }: PostFilterControlsProps) {
  const [selectedTime, setSelectedTime] = useState<PostTimeFilter>(time);
  const [selectedContentType, setSelectedContentType] = useState<PostContentFilter>(contentType);

  return (
    <form action={actionPath} className="rounded-2xl border border-border/60 bg-background/70 p-3 backdrop-blur">
      {/* Hidden inputs ensure filter state is submitted with the form */}
      {query ? <input type="hidden" name="q" value={query} /> : null}
      <input type="hidden" name="time" value={selectedTime} />
      <input type="hidden" name="contentType" value={selectedContentType} />
      
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
        {/* Time Filter Selection */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between font-normal text-foreground">
              {TIME_LABELS[selectedTime as string] ?? "Any time"}
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
            {Object.entries(TIME_LABELS).map(([value, label]) => (
              <DropdownMenuItem key={value} onClick={() => setSelectedTime(value as PostTimeFilter)}>
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Content Type Filter Selection */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between font-normal text-foreground">
              {CONTENT_TYPE_LABELS[selectedContentType as string] ?? "Any content"}
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
            {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
              <DropdownMenuItem key={value} onClick={() => setSelectedContentType(value as PostContentFilter)}>
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" type="submit" className="font-medium text-foreground">
          Apply
        </Button>

        {/* Clear all active filters */}
        <Button variant="outline" asChild className="font-medium text-foreground">
          <Link href={query ? `${actionPath}?q=${encodeURIComponent(query)}` : actionPath}>
            Reset
          </Link>
        </Button>
      </div>
    </form>
  );
}

