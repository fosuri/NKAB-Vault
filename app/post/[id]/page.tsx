import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSession } from "@/lib/auth/auth-server";
import { getUserModerationState } from "@/lib/auth/moderation";
import { getPostById } from "@/lib/posts";
import { CommentSection } from "@/components/comment-section";
import { DeletePostButton } from "@/components/delete-post-button";
import { redirect } from "next/navigation";
import { PostMediaCarousel } from "@/components/post-media-carousel";
import { PostViewTracker } from "@/components/post-view-tracker";
import { PostReactions } from "@/components/post-reactions";
import { ROLES, type RoleId } from "@/lib/db/auth-schema";
import { PostSideMenu } from "@/components/post-side-menu";
import { PostContentWrapper } from "@/components/post-content-wrapper";
import { ACCESS_META } from "@/lib/config/post-access";
import { getActualPassword } from "@/lib/post-password";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  if (session?.user?.id) {
    const moderationState = await getUserModerationState(session.user.id);
    if (moderationState?.activeBan) {
      redirect("/banned");
    }
  }

  const post = await getPostById(id, session?.user?.id);

  if (!post) {
    notFound();
  }

  const currentUserId = session?.user?.id;
  const moderationState = currentUserId ? await getUserModerationState(currentUserId) : null;
  const isOwner = currentUserId === post.userId;
  const canModerateContent = moderationState?.roleId === ROLES.ADMIN || moderationState?.roleId === ROLES.MODERATOR;

  if (post.access === "paid" && !isOwner) {
    notFound();
  }

  const hasPassword = post.access === "private" && Boolean(post.password);

  const accessMeta = ACCESS_META[post.access] ?? ACCESS_META.public;
  const { Icon, label, className } = accessMeta;

  return (
    <div className="min-h-full flex-1 bg-[radial-gradient(circle_at_top,rgba(226,232,240,0.8),transparent_35%),linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,1)_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,rgba(71,85,105,0.35),transparent_30%),linear-gradient(180deg,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)]">
      <PostViewTracker postId={post.id} currentUserId={currentUserId} />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to feed
          </Link>
          {(!isOwner && canModerateContent) && <DeletePostButton postId={post.id} redirectTo="/" authorRoleId={post.author?.roleId as RoleId | undefined} actorRoleId={moderationState?.roleId as RoleId | undefined} />}
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <PostContentWrapper postId={post.id} hasPassword={hasPassword} isOwner={isOwner}>
            <div className="flex-1 flex w-full flex-col gap-8 min-w-0">
              <Card className="overflow-hidden border-border/60 bg-card/85 shadow-[0_24px_90px_rgba(12,18,28,0.08)] backdrop-blur">
                <CardHeader className="gap-2 border-b border-border/50 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="shrink-0">
                        {post.author?.image ? (
                          <AvatarImage
                            src={post.author.image}
                            alt={post.author?.name ?? post.author?.email ?? "User avatar"}
                          />
                        ) : null}
                        <AvatarFallback>
                          {post.author?.name?.charAt(0) ?? post.author?.email?.charAt(0) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <CardTitle>
                        <div className="truncate">
                          {post.author?.name ?? post.author?.email ?? "Unknown user"}
                        </div>
                        <p className="text-sm font-normal text-muted-foreground">
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </p>
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="size-3.5" />
                        {post.viewCount.toLocaleString()}
                      </span>
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${className}`}>
                        <Icon className="size-3.5" />
                        {label}
                      </span>
                    </div>
                  </div>
                  <h2 className="font-semibold text-lg">{post.title}</h2>
                  <p className="text-sm leading-6 text-foreground/90">{post.description}</p>
                </CardHeader>

                <CardContent className="pt-4">
                  <PostMediaCarousel media={post.media} />
                  <div className="mt-4 flex items-center">
                    <PostReactions
                      postId={post.id}
                      initialLikeCount={post.likeCount}
                      initialDislikeCount={post.dislikeCount}
                      initialUserReaction={post.userReaction}
                      currentUserId={currentUserId}
                    />
                  </div>
                </CardContent>
              </Card>

              <section className="rounded-xl border border-border/50 bg-background/80 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur">
                <CommentSection
                  postId={post.id}
                  initialComments={post.comments}
                  currentUserId={currentUserId}
                  currentUserImage={session?.user?.image ?? null}
                  canModerateComments={Boolean(canModerateContent)}
                  actorRoleId={moderationState?.roleId as RoleId | undefined}
                />
              </section>
            </div>
          </PostContentWrapper>

          {isOwner && (
            <PostSideMenu postId={post.id} initialAccess={post.access} initialPassword={getActualPassword(post.password) ?? null} />
          )}
        </div>
      </div>
    </div>
  );
}
