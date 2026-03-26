import { redirect } from "next/navigation";
import { FeedPostCard } from "@/components/feed-post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSession } from "@/lib/auth/auth-server";
import { getPostsByUserId } from "@/lib/posts";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const userPosts = await getPostsByUserId(session.user.id);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,rgba(226,232,240,0.8),transparent_35%),linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,1)_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,rgba(71,85,105,0.35),transparent_30%),linear-gradient(180deg,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-[32px] border border-border/50 bg-background/80 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar size="lg" className="size-16">
                {session.user.image ? <AvatarImage src={session.user.image} alt={session.user.name} /> : null}
                <AvatarFallback>{session.user.name?.charAt(0) ?? session.user.email?.charAt(0) ?? "U"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Profile
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  {session.user.name || "User profile"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{session.user.email}</p>
              </div>
            </div>

            <div className="grid gap-1 rounded-2xl border border-border/50 bg-muted/40 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Posts published</span>
              <span className="text-2xl font-semibold text-foreground">{userPosts.length}</span>
            </div>
          </div>
        </section>

        <section className="grid gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Your uploads</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              All images, GIFs and videos you posted to the main feed appear here.
            </p>
          </div>

          {userPosts.length ? (
            userPosts.map((post) => (
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
              />
            ))
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