"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/db";
import { getSession } from "@/lib/auth/auth-server";
import { comments, user, ROLES, adminActionLog, posts, notifications, NOTIFICATION_TYPES, ADMIN_ACTION_TYPES } from "@/lib/db/auth-schema";
import { ensureCanCreateComment, getUserModerationState } from "@/lib/auth/moderation";
import { chatEventEmitter } from "@/lib/events";

const bodySchema = z
  .string()
  .trim()
  .min(1, "Comment cannot be empty")
  .max(1000, "Comment is too long");

type ActionResult = { error?: string; success?: boolean; commentId?: string };

export async function createComment(
  postId: string,
  body: string
): Promise<ActionResult> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in to comment" };
  }

  const permissions = await ensureCanCreateComment(session.user.id);
  if (!permissions.allowed) {
    return { error: permissions.error };
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid comment" };
  }

  const [newComment] = await db.insert(comments).values({
    postId,
    userId: session.user.id,
    body: parsed.data,
  }).returning({ id: comments.id });
  const newCommentId = newComment.id;

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    columns: { userId: true },
  });

  if (post && post.userId !== session.user.id) {
    await db.insert(notifications).values({
      userId: post.userId,
      actorId: session.user.id,
      typeId: NOTIFICATION_TYPES.COMMENT,
      postId,
      commentId: newCommentId,
    });
    chatEventEmitter.emit(`notifications:${post.userId}`, { type: "update" });
  }

  revalidatePath(`/post/${postId}`);

  return { success: true, commentId: newCommentId };
}

export async function deleteComment(
  commentId: string,
  postId: string
): Promise<ActionResult> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const moderationState = await getUserModerationState(session.user.id);
  if (moderationState?.activeBan) {
    return { error: "Your account is banned" };
  }

  const comment = await db.query.comments.findFirst({
    where: eq(comments.id, commentId),
  });

  if (!comment) {
    return { error: "Comment not found" };
  }

  const actorRoleId = moderationState?.roleId;
  const isAdmin = actorRoleId === ROLES.ADMIN;
  const isModerator = actorRoleId === ROLES.MODERATOR;

  if (comment.userId !== session.user.id && !isAdmin && !isModerator) {
    return { error: "Not authorised" };
  }

  if (isModerator && comment.userId !== session.user.id) {
    const targetUser = await db.query.user.findFirst({
      where: eq(user.id, comment.userId),
      columns: { roleId: true },
    });

    if (!targetUser) {
      return { error: "Comment author not found" };
    }

    if (targetUser.roleId === ROLES.ADMIN || targetUser.roleId === ROLES.MODERATOR) {
      return { error: "Moderators cannot delete comments of admins or moderators" };
    }
  }

  await db.delete(comments).where(eq(comments.id, commentId));

  if (comment.userId !== session.user.id && (isAdmin || isModerator)) {
    await db.insert(adminActionLog).values({
      actorUserId: session.user.id,
      actionTypeId: ADMIN_ACTION_TYPES.DELETE_COMMENT,
      targetUserId: comment.userId,
      targetPostId: postId,
      targetCommentId: comment.id,
      details: `Deleted by staff (${isAdmin ? "admin" : "moderator"})`,
    });

    await db.insert(notifications).values({
      userId: comment.userId,
      actorId: session.user.id,
      typeId: NOTIFICATION_TYPES.DELETE_COMMENT,
      postId,
      message: "Deleted for community guidelines violation",
    });
    chatEventEmitter.emit(`notifications:${comment.userId}`, { type: "update" });
  }

  revalidatePath(`/post/${postId}`);

  return { success: true };
}
