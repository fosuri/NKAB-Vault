import { FeedPostCard } from "@/components/feed-post-card";
import { PostFilterControls } from "@/components/post-filter-controls";
import { getSession } from "@/lib/auth/auth-server";
import { getUserModerationState } from "@/lib/auth/moderation";
import { getFeedPosts } from "@/lib/posts";
import { parsePostContentFilter, parsePostTimeFilter } from "@/lib/post-filters";
import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ time?: string; contentType?: string }>;
}) {
  const params = await searchParams;
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

  const feedPosts = await getFeedPosts(viewerUserId, { time, contentType });

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(243,244,246,0.95),transparent_40%),linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,1)_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(55,65,81,0.35),transparent_35%),linear-gradient(180deg,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)]">
      <div className="mx-auto w-full max-w-[1600px]">
        <section className="min-h-[60vh]">
          <div className="mb-4">
            <PostFilterControls actionPath="/" time={time} contentType={contentType} />
          </div>
          {feedPosts.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {feedPosts.map((post) => (
                <div key={post.id}>
                  <FeedPostCard post={post} currentUserId={viewerUserId} showDeleteButton={false} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full min-h-[60vh] items-center justify-center">
              <div className="max-w-2xl rounded-[28px] border border-dashed border-border/60 bg-background/75 px-8 py-14 text-center text-lg font-medium leading-relaxed text-muted-foreground backdrop-blur">
                No posts yet. The first uploaded image, GIF, or video will appear here.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
