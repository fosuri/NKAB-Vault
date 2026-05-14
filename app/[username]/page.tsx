import { notFound, redirect } from "next/navigation";
import { FeedPostCard } from "@/components/feed-post-card";
import { getSession } from "@/lib/auth/auth-server";
import { getPostsByUserId, getLikedPostsByUserId } from "@/lib/posts";
import { ProfileContent } from "@/components/profile-content";
import { UserStatistics } from "@/components/user-statistics";
import { db } from "@/lib/db/db";
import { eq } from "drizzle-orm";
import { user as userSchema, SUBSCRIPTION_STATUSES } from "@/lib/db/auth-schema";

interface PageProps {
  params: Promise<{
    username: string;
  }>;
}

/**
 * Public User Profile Page.
 * Fetches and displays a user's profile, stats, and their uploaded/liked posts.
 */
export default async function UserProfilePage({ params }: PageProps) {
  const resolvedParams = await params;
  const session = await getSession();

  // Decode username and handle optional '@' prefix
  let decodedUsername = decodeURIComponent(resolvedParams.username);
  if (decodedUsername.startsWith('@')) {
    decodedUsername = decodedUsername.slice(1);
  }

  // Prevent users from viewing their own public profile route (redirect to private dashboard)
  if (session?.user?.name === decodedUsername) {
    redirect("/profile");
  }

  // Fetch target user data
  const targetUser = await db.query.user.findFirst({
    where: eq(userSchema.name, decodedUsername),
  });

  if (!targetUser) {
    notFound();
  }

  // Parallel data fetching for posts and likes
  const userPosts = await getPostsByUserId(targetUser.id, session?.user?.id);
  const likedPosts = await getLikedPostsByUserId(targetUser.id, session?.user?.id);

  // Check for active PRO subscription status
  const activeSub = await db.query.subscriptions.findFirst({
    where: (subs, { eq, and, gt }) => and(
      eq(subs.userId, targetUser.id),
      eq(subs.statusId, SUBSCRIPTION_STATUSES.ACTIVE),
      gt(subs.currentPeriodEnd, new Date())
    )
  });

  const userWithPro = { ...targetUser, isPro: !!activeSub };

  return (
    <div className="min-h-full flex-1 bg-[radial-gradient(circle_at_top,rgba(226,232,240,0.8),transparent_35%),linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,1)_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,rgba(71,85,105,0.35),transparent_30%),linear-gradient(180deg,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-6">
          <ProfileContent user={userWithPro} isOwner={false} currentUserId={session?.user?.id} />
          <UserStatistics userId={targetUser.id} />
        </div>

        <section className="grid gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{targetUser.name}&apos;s uploads</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              All images, GIFs and videos {targetUser.name} posted to the main feed appear here.
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
                      name: targetUser.name,
                      email: targetUser.email,
                      image: targetUser.image ?? null,
                    },
                  }}
                  currentUserId={session?.user?.id}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-background/75 p-10 text-center text-sm text-muted-foreground backdrop-blur">
              {targetUser.name} has not uploaded anything yet.
            </div>
          )}
        </section>

        <section className="grid gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Liked posts</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Posts {targetUser.name} has liked appear here.
            </p>
          </div>

          {likedPosts.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {likedPosts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  currentUserId={session?.user?.id}
                  showDeleteButton={false}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-background/75 p-10 text-center text-sm text-muted-foreground backdrop-blur">
              {targetUser.name} has not liked any posts yet.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


