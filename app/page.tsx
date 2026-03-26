import { CreatePostForm } from "@/components/create-post-form";
import { FeedPostCard } from "@/components/feed-post-card";
import { getSession } from "@/lib/auth/auth-server";
import { getFeedPosts } from "@/lib/posts";

export default async function Home() {
  const [session, feedPosts] = await Promise.all([getSession(), getFeedPosts()]);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(243,244,246,0.95),_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,1)_0%,_rgba(248,250,252,1)_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(55,65,81,0.35),_transparent_35%),linear-gradient(180deg,_rgba(15,23,42,1)_0%,_rgba(2,6,23,1)_100%)]">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <section className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[28px] border border-border/50 bg-background/70 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              NKAB Vault feed
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Share images, GIFs and video in one stream.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Logged-in users can publish media posts to the main page. Every post keeps one description and one or more uploaded files.
            </p>
          </div>

          <div className="mt-6">
            {session?.user ? (
              <CreatePostForm />
            ) : (
              <div className="rounded-[28px] border border-dashed border-border/60 bg-background/70 p-6 text-sm text-muted-foreground backdrop-blur">
                Sign in to unlock the Create post form and upload media to the feed.
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6">
          {feedPosts.length ? (
            feedPosts.map((post) => <FeedPostCard key={post.id} post={post} />)
          ) : (
            <div className="rounded-[28px] border border-dashed border-border/60 bg-background/75 p-10 text-center text-sm text-muted-foreground backdrop-blur">
              No posts yet. The first uploaded image, GIF, or video will appear here.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
