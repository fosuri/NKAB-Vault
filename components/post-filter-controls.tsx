import Link from "next/link";
import type { PostContentFilter, PostTimeFilter } from "@/lib/posts";

type PostFilterControlsProps = {
  actionPath: string;
  time: PostTimeFilter;
  contentType: PostContentFilter;
  query?: string;
};

export function PostFilterControls({ actionPath, time, contentType, query }: PostFilterControlsProps) {
  return (
    <form action={actionPath} className="rounded-2xl border border-border/60 bg-background/70 p-3 backdrop-blur">
      {query ? <input type="hidden" name="q" value={query} /> : null}
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
        <select
          name="time"
          defaultValue={time}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <option value="all">Any time</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="365d">Last year</option>
        </select>

        <select
          name="contentType"
          defaultValue={contentType}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <option value="all">Any content</option>
          <option value="image">Image</option>
          <option value="gif">GIF</option>
          <option value="video">Video</option>
        </select>

        <button
          type="submit"
          className="h-10 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Apply
        </button>

        <Link
          href={query ? `${actionPath}?q=${encodeURIComponent(query)}` : actionPath}
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
