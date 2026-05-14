import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/auth-server";
import { getUserModerationState } from "@/lib/auth/moderation";
import { getSearchSuggestions } from "@/lib/posts";
import { parsePostContentFilter, parsePostTimeFilter } from "@/lib/post-filters";

/**
 * Post Search Suggestions API.
 * Provides real-time search results based on a query string and optional filters.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();

    // Security check: Block banned users from using the search API
    if (session?.user?.id) {
      const moderationState = await getUserModerationState(session.user.id);
      if (moderationState?.activeBan) {
        return NextResponse.json({ error: "Your account is banned" }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);

    // Parse search parameters and filters
    const q = (searchParams.get("q") ?? "").trim();
    const time = parsePostTimeFilter(searchParams.get("time"));
    const contentType = parsePostContentFilter(searchParams.get("contentType"));
    const rawLimit = Number(searchParams.get("limit") ?? "6");
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 10) : 6;

    if (!q) {
      return NextResponse.json({ suggestions: [] });
    }

    // Fetch matching post suggestions from the database
    const suggestions = await getSearchSuggestions({
      viewerUserId: session?.user?.id,
      query: q,
      time,
      contentType,
      limit,
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Post search API error", error);
    return NextResponse.json({ error: "Failed to search posts" }, { status: 500 });
  }
}
