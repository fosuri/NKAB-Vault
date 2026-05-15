import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Eye, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSession } from "@/lib/auth/auth-server";
import { getUserModerationState } from "@/lib/auth/moderation";
import { redirect } from "next/navigation";
import { PostMediaCarousel } from "@/components/post-media-carousel";
import { PostReactions } from "@/components/post-reactions";
import { ROLES, RESOURCE_TYPES, ACCESS_TYPES, postReactions, comments, postMedia, posts } from "@/lib/db/auth-schema";
import { ACCESS_META } from "@/lib/config/post-access";
import { db } from "@/lib/db/db";
import { sql } from "drizzle-orm";
import { StaffRecoverPostButton } from "@/components/staff/staff-recover-post-button";
import { StaffRecoverCommentButton } from "@/components/staff/staff-recover-comment-button";
import { ScrollToComment } from "@/components/staff/scroll-to-comment";

/**
 * Staff Review Page.
 * Restricted to admins and moderators. Shows a soft-deleted post (or a post
 * containing a specific soft-deleted comment) with Recover controls.
 * Route: /staff/review/[id]?comment=[commentId]
 */
export default async function StaffReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ comment?: string }>;
}) {
  const { id } = await params;
  const { comment: highlightCommentId } = await searchParams;
  const session = await getSession();

  // Auth: must be logged in
  if (!session) {
    redirect("/");
  }

  // Auth: must be staff
  const moderationState = await getUserModerationState(session.user.id);
  if (moderationState?.activeBan) {
    redirect("/banned");
  }

  const isStaff =
    moderationState?.roleId === ROLES.ADMIN ||
    moderationState?.roleId === ROLES.MODERATOR;

  if (!isStaff) {
    redirect("/");
  }

  const currentUserId = session.user.id;

  // Fetch the post — bypassing the normal soft-delete filter so we can see it even if deleted
  const [post, reactions] = await Promise.all([
    db.query.posts.findFirst({
      where: eq(posts.id, id),
      with: {
        author: {
          columns: { id: true, name: true, image: true, email: true, roleId: true },
        },
        media: { orderBy: [postMedia.sortOrder] },
        comments: {
          // Include ALL comments (including deleted ones) so we can show the highlighted comment
          orderBy: [desc(comments.createdAt)],
          with: {
            author: { columns: { id: true, name: true, image: true, email: true, roleId: true } },
          },
        },
      },
      extras: {
        viewCount: sql<number>`CAST((SELECT COUNT(*) FROM post_views WHERE post_views.post_id = posts.id) AS integer)`.as("viewCount"),
      },
    }),
    db
      .select({ typeId: postReactions.typeId, userId: postReactions.userId })
      .from(postReactions)
      .where(eq(postReactions.postId, id)),
  ]);

  if (!post) {
    notFound();
  }

  const likeCount = reactions.filter((r) => r.typeId === 1).length;
  const dislikeCount = reactions.filter((r) => r.typeId === 2).length;
  const userReactionId = reactions.find((r) => r.userId === currentUserId)?.typeId ?? null;
  const userReaction = userReactionId === 1 ? "like" : userReactionId === 2 ? "dislike" : null;

  const isPostDeleted = Boolean(post.deletedByStaffAt);
  const accessMeta = ACCESS_META[post.accessTypeId] ?? ACCESS_META[ACCESS_TYPES.PUBLIC];
  const { Icon, label, className: accessClassName } = accessMeta;

  return (
    <div className="min-h-full flex-1 bg-[radial-gradient(circle_at_top,rgba(226,232,240,0.8),transparent_35%),linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,1)_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,rgba(71,85,105,0.35),transparent_30%),linear-gradient(180deg,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">

        {/* Staff Banner */}
        <div className="flex items-center gap-3 rounded-xl border border-amber-400/50 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-800 shadow-sm backdrop-blur dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            Staff Review Mode — This content may be soft-deleted. Use the recover buttons to restore it.
          </span>
        </div>

        {/* Navigation Header */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href={moderationState?.roleId === ROLES.ADMIN ? "/admin" : "/moderator"}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>

          {/* Recover post button — shown if post is soft-deleted */}
          {isPostDeleted && (
            <StaffRecoverPostButton postId={post.id} />
          )}
        </div>

        {/* Post Card */}
        <Card className={`min-w-0 w-full overflow-hidden border-border/60 bg-card/85 shadow-[0_24px_90px_rgba(12,18,28,0.08)] backdrop-blur ${isPostDeleted ? "ring-2 ring-red-400/60 dark:ring-red-500/40" : ""}`}>
          {isPostDeleted && (
            <div className="flex items-center gap-2 border-b border-red-200 bg-red-50/80 px-5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
              <AlertTriangle className="size-3.5" />
              Post is soft-deleted — hidden from public but recoverable
            </div>
          )}

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
                  <Link
                    href={`/@${post.author?.name}`}
                    className="truncate hover:underline"
                  >
                    {post.author?.name ?? post.author?.email ?? "Unknown user"}
                  </Link>
                  <p className="text-sm font-normal text-muted-foreground">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </p>
                </CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <span className={`flex items-center gap-1.5 text-xs font-medium ${accessClassName}`}>
                  <Icon className="size-3.5" />
                  {label}
                </span>
              </div>
            </div>
            <h2 className="font-semibold text-lg">{post.title}</h2>
            <p className="text-sm leading-6 text-foreground/90">{post.description}</p>
          </CardHeader>

          <CardContent className="pt-4">
            <PostMediaCarousel media={post.media.map(m => ({ ...m, resourceType: m.resourceTypeId === RESOURCE_TYPES.VIDEO ? "video" : ("image" as const) }))} />

            <div className="mt-4 flex items-center justify-between">
              <PostReactions
                postId={post.id}
                initialLikeCount={likeCount}
                initialDislikeCount={dislikeCount}
                initialUserReaction={userReaction}
                currentUserId={currentUserId}
              />
              <span className="flex items-center gap-1 text-sm text-muted-foreground pr-2">
                <Eye className="size-4" />
                {post.viewCount.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <section className="min-w-0 w-full rounded-xl border border-border/50 bg-background/80 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Comments{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({post.comments.length})
            </span>
          </h2>

          {post.comments.length ? (
            <ul className="mt-4 flex flex-col gap-4">
              {post.comments.map((comment) => {
                const isHighlighted = comment.id === highlightCommentId;
                const isCommentDeleted = Boolean(comment.deletedByStaffAt);

                return (
                  <li
                    key={comment.id}
                    id={`comment-${comment.id}`}
                    className={`flex gap-3 rounded-2xl border p-4 transition-all ${
                      isHighlighted
                        ? "border-amber-400 bg-amber-50/70 ring-2 ring-amber-300/50 dark:border-amber-500/60 dark:bg-amber-950/30 dark:ring-amber-500/30"
                        : isCommentDeleted
                        ? "border-red-300/60 bg-red-50/40 dark:border-red-800/40 dark:bg-red-950/20"
                        : "border-border/50 bg-muted/30"
                    }`}
                  >
                    <Avatar className="mt-0.5 shrink-0">
                      {comment.author?.image ? (
                        <AvatarImage
                          src={comment.author.image}
                          alt={comment.author?.name ?? comment.author?.email ?? "User avatar"}
                        />
                      ) : null}
                      <AvatarFallback>
                        {comment.author?.name?.charAt(0) ??
                          comment.author?.email?.charAt(0) ??
                          "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/@${comment.author?.name}`}
                            className="text-sm font-medium text-foreground hover:underline"
                          >
                            {comment.author?.name ?? comment.author?.email ?? "Unknown"}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                          {isHighlighted && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                              Targeted comment
                            </span>
                          )}
                          {isCommentDeleted && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/50 dark:text-red-400">
                              Deleted
                            </span>
                          )}
                        </div>

                        {/* Recover comment button — only for deleted comments */}
                        {isCommentDeleted && (
                          <StaffRecoverCommentButton commentId={comment.id} />
                        )}
                      </div>

                      <p className="whitespace-pre-wrap wrap-break-word break-all text-sm leading-6 text-foreground/90">
                        {comment.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No comments on this post.</p>
          )}
        </section>

        {/* Auto-scroll to the highlighted comment after hydration */}
        {highlightCommentId && <ScrollToComment commentId={highlightCommentId} />}
      </div>
    </div>
  );
}
