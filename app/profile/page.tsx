import { redirect } from "next/navigation";
import { FeedPostCard } from "@/components/feed-post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSession } from "@/lib/auth/auth-server";
import { getUserModerationState } from "@/lib/auth/moderation";
import { getPostsByUserId } from "@/lib/posts";
import { ProfileContent } from "@/components/profile-content";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const moderationState = await getUserModerationState(session.user.id);
  if (moderationState?.activeBan) {
    redirect("/banned");
  }

  const userPosts = await getPostsByUserId(session.user.id);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,rgba(226,232,240,0.8),transparent_35%),linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,1)_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,rgba(71,85,105,0.35),transparent_30%),linear-gradient(180deg,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <ProfileContent user={session.user} userPosts={userPosts} />

        <section className="grid gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Your uploads</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              All images, GIFs and videos you posted to the main feed appear here.
            </p>
          </div>

          {userPosts.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPosts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={{
                    ...post,
                    author: {
                      name: session.user.name,
                      email: session.user.email,
                      image: session.user.image ?? null,
                    },
                  }}
                  currentUserId={session.user.id}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-border/60 bg-background/75 p-10 text-center text-sm text-muted-foreground backdrop-blur">
              You have not uploaded anything yet. Create your first post from the main page.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}