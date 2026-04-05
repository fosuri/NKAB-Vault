import type { PostContentFilter, PostTimeFilter } from "@/lib/posts";

export const TIME_FILTER_VALUES: PostTimeFilter[] = ["all", "24h", "7d", "30d", "365d"];
export const CONTENT_FILTER_VALUES: PostContentFilter[] = ["all", "image", "gif", "video"];

export function parsePostTimeFilter(raw: string | null | undefined): PostTimeFilter {
  if (raw && TIME_FILTER_VALUES.includes(raw as PostTimeFilter)) {
    return raw as PostTimeFilter;
  }

  return "all";
}

export function parsePostContentFilter(raw: string | null | undefined): PostContentFilter {
  if (raw && CONTENT_FILTER_VALUES.includes(raw as PostContentFilter)) {
    return raw as PostContentFilter;
  }

  return "all";
}
