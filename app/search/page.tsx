import { FeedPostCard } from "@/components/feed-post-card";
import { PostFilterControls } from "@/components/post-filter-controls";
import { getSession } from "@/lib/auth/auth-server";
import { getUserModerationState } from "@/lib/auth/moderation";
import { parsePostContentFilter, parsePostTimeFilter } from "@/lib/post-filters";
import { searchPosts } from "@/lib/posts";
import { redirect } from "next/navigation";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; time?: string; contentType?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const time = parsePostTimeFilter(params.time);
  const contentType = parsePostContentFilter(params.contentType);

  const session = await getSession();
  const viewerUserId = session?.user?.id;

  if (viewerUserId) {
    const moderationState = await getUserModerationState(viewerUserId);
    if (moderationState?.activeBan) {
      redirect("/banned");
    }
  }

  const posts = query
    ? await searchPosts({
      viewerUserId,
      query,
      time,
      contentType,
      limit: 60,
    })
    : [];

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(243,244,246,0.95),transparent_40%),linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,1)_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(55,65,81,0.35),transparent_35%),linear-gradient(180deg,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Search results</h1>
          <p className="text-sm text-muted-foreground">
            {query ? `Showing posts for "${query}"` : "Enter a query in the header search"}
          </p>
        </div>

        <PostFilterControls actionPath="/search" time={time} contentType={contentType} query={query} />

        {query ? (
          posts.length ? (
            <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
              {posts.map((post) => (
                <FeedPostCard key={post.id} post={post} currentUserId={viewerUserId} showDeleteButton={false} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/75 px-8 py-14 text-center text-muted-foreground backdrop-blur">
              No posts match this query with the selected filters.
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-border/60 bg-background/75 px-8 py-14 text-center text-muted-foreground backdrop-blur">
            Type a query and press Enter in the header search.
          </div>
        )}
      </div>
    </div>
  );
}
