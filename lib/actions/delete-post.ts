"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/db";
import { getSession } from "@/lib/auth/auth-server";
import { cloudinary } from "@/lib/cloudinary";
import { posts, user, ROLES, adminActionLog, notifications, ADMIN_ACTION_TYPES, NOTIFICATION_TYPES, RESOURCE_TYPES } from "@/lib/db/auth-schema";
import { getUserModerationState } from "@/lib/auth/moderation";
import { chatEventEmitter } from "@/lib/events";

/**
 * Personal and Administrative Post Deletion Actions.
 */

type DeletePostResult = { error?: string; success?: boolean };

/**
 * Removes a post while enforcing authorship or hierarchical staff authority.
 */
export async function deletePost(postId: string): Promise<DeletePostResult> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  // 1. Identity Check
  const moderationState = await getUserModerationState(session.user.id);
  if (moderationState?.activeBan) {
    return { error: "Your account is banned" };
  }

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: { media: true },
  });

  if (!post) {
    return { error: "Post not found" };
  }

  // 2. Authority Check: Owner vs Staff
  const isAdmin = moderationState?.roleId === ROLES.ADMIN;
  const isModerator = moderationState?.roleId === ROLES.MODERATOR;

  if (post.userId !== session.user.id && !isAdmin && !isModerator) {
    return { error: "Not authorised" };
  }

  // 3. Hierarchy Protection: Moderators cannot remove Staff/Admin content
  if (isModerator && post.userId !== session.user.id) {
    const targetUser = await db.query.user.findFirst({
      where: eq(user.id, post.userId),
      columns: { roleId: true },
    });

    if (targetUser && (targetUser.roleId === ROLES.ADMIN || targetUser.roleId === ROLES.MODERATOR)) {
      return { error: "Moderators cannot delete posts of admins or moderators" };
    }
  }

  // 4. Staff Cleanup: Logging, notification, and soft delete for administrative removals
  if (post.userId !== session.user.id && (isAdmin || isModerator)) {
    await db.insert(adminActionLog).values({
      actorUserId: session.user.id,
      actionTypeId: ADMIN_ACTION_TYPES.DELETE_POST,
      targetUserId: post.userId,
      targetPostId: post.id,
      details: `Deleted by (${isAdmin ? "admin" : "moderator"})`,
    });

    await db.insert(notifications).values({
      userId: post.userId,
      actorId: session.user.id,
      typeId: NOTIFICATION_TYPES.DELETE_POST,
      message: "Deleted for community guidelines violation",
    });
    // Trigger real-time alert refresh
    chatEventEmitter.emit(`notifications:${post.userId}`, { type: "update" });

    // Soft delete
    await db.update(posts).set({ deletedByStaffAt: new Date() }).where(eq(posts.id, postId));
  } else {
    // 5. Media Cleanup & Database Wipe for user self-deletion
    await Promise.allSettled(
      post.media.map((m) =>
        cloudinary.uploader.destroy(m.publicId, {
          resource_type: m.resourceTypeId === RESOURCE_TYPES.VIDEO ? "video" : "image",
        })
      )
    );

    await db.delete(posts).where(eq(posts.id, postId));
  }

  revalidatePath("/");
  revalidatePath("/profile");

  return { success: true };
}
