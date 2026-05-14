"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/db";
import { getSession } from "@/lib/auth/auth-server";
import { comments, user, ROLES, adminActionLog, posts, notifications, NOTIFICATION_TYPES, ADMIN_ACTION_TYPES } from "@/lib/db/auth-schema";
import { ensureCanCreateComment, getUserModerationState } from "@/lib/auth/moderation";
import { chatEventEmitter } from "@/lib/events";

/**
 * Post Commenting and Moderation Actions.
 */

const bodySchema = z
  .string()
  .trim()
  .min(1, "Comment cannot be empty")
  .max(1000, "Comment is too long");

type ActionResult = { error?: string; success?: boolean; commentId?: string };

/**
 * Persists a new comment while enforcing active mutes or bans.
 */
export async function createComment(
  postId: string,
  body: string
): Promise<ActionResult> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in to comment" };
  }

  // 1. Moderation Check: Verify if user is currently banned or muted
  const permissions = await ensureCanCreateComment(session.user.id);
  if (!permissions.allowed) {
    return { error: permissions.error };
  }

  // 2. Input validation
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid comment" };
  }

  // 3. Database Persistence
  const [newComment] = await db.insert(comments).values({
    postId,
    userId: session.user.id,
    body: parsed.data,
  }).returning({ id: comments.id });

  // 4. Notification Logic: Notify the author of the original post
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
      commentId: newComment.id,
    });
    // Trigger real-time alert refresh
    chatEventEmitter.emit(`notifications:${post.userId}`, { type: "update" });
  }

  revalidatePath(`/post/${postId}`);
  return { success: true, commentId: newComment.id };
}

/**
 * Removes a comment while enforcing authorship or staff authority.
 */
export async function deleteComment(
  commentId: string,
  postId: string
): Promise<ActionResult> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  // 1. Identity Check
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

  // 2. Authority Check: Author vs Staff
  const isAdmin = moderationState?.roleId === ROLES.ADMIN;
  const isModerator = moderationState?.roleId === ROLES.MODERATOR;

  if (comment.userId !== session.user.id && !isAdmin && !isModerator) {
    return { error: "Not authorised" };
  }

  // 3. Hierarchy Protection: Moderators cannot remove Staff/Admin content
  if (isModerator && comment.userId !== session.user.id) {
    const targetUser = await db.query.user.findFirst({
      where: eq(user.id, comment.userId),
      columns: { roleId: true },
    });

    if (targetUser && (targetUser.roleId === ROLES.ADMIN || targetUser.roleId === ROLES.MODERATOR)) {
      return { error: "Moderators cannot delete comments of admins or moderators" };
    }
  }

  // 4. Staff Cleanup: Logging and user notification for administrative deletions
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

    // 5. Persistence: Soft delete for staff
    await db.update(comments).set({ deletedByStaffAt: new Date() }).where(eq(comments.id, commentId));
  } else {
    // 5. Persistence: Wipe from DB for user deletion
    await db.delete(comments).where(eq(comments.id, commentId));
  }

  revalidatePath(`/post/${postId}`);
  return { success: true };
}
