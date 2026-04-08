"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cloudinary } from "@/lib/cloudinary";
import { getSession } from "@/lib/auth/auth-server";
import { getUserModerationState, requireAdmin, type SanctionType } from "@/lib/auth/moderation";
import { adminActionLog, comments, posts, user, userSanctions } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/db";

type AdminActionResult = { success?: boolean; error?: string };

type Role = "user" | "moderator";

async function createAdminLog(params: {
  actorUserId: string;
  actionType: string;
  targetUserId?: string;
  targetPostId?: string;
  targetCommentId?: string;
  details?: string;
}) {
  await db.insert(adminActionLog).values({
    id: randomUUID(),
    actorUserId: params.actorUserId,
    actionType: params.actionType,
    targetUserId: params.targetUserId ?? null,
    targetPostId: params.targetPostId ?? null,
    targetCommentId: params.targetCommentId ?? null,
    details: params.details ?? null,
  });
}

async function getAdminUserId() {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  await requireAdmin(session.user.id);

  return session.user.id;
}

async function purgeUserContentOnBan(targetUserId: string) {
  const userPosts = await db.query.posts.findMany({
    where: eq(posts.userId, targetUserId),
    with: { media: true },
    columns: { id: true },
  });

  const mediaItems = userPosts.flatMap((post) => post.media);

  if (mediaItems.length > 0) {
    await Promise.allSettled(
      mediaItems.map((mediaItem) =>
        cloudinary.uploader.destroy(mediaItem.publicId, {
          resource_type: mediaItem.resourceType as "image" | "video" | "raw",
        })
      )
    );
  }

  const deletedComments = await db
    .delete(comments)
    .where(eq(comments.userId, targetUserId))
    .returning({ id: comments.id });

  const deletedPosts = await db
    .delete(posts)
    .where(eq(posts.userId, targetUserId))
    .returning({ id: posts.id });

  return {
    deletedCommentsCount: deletedComments.length,
    deletedPostsCount: deletedPosts.length,
    deletedMediaCount: mediaItems.length,
  };
}

export async function setUserRoleAction(targetUserId: string, role: Role): Promise<AdminActionResult> {
  try {
    const adminUserId = await getAdminUserId();

    if (targetUserId === adminUserId) {
      return { error: "You cannot change your own role" };
    }

    const targetUser = await db.query.user.findFirst({
      where: eq(user.id, targetUserId),
      columns: { id: true, role: true },
    });

    if (!targetUser) {
      return { error: "Target user not found" };
    }

    if (targetUser.role === "admin") {
      return { error: "Admin role cannot be changed here" };
    }

    if (role === "moderator") {
      const moderationState = await getUserModerationState(targetUserId);
      if (moderationState?.activeBan) {
        return { error: "Banned users cannot be assigned as moderators" };
      }
    }

    await db.update(user).set({ role }).where(eq(user.id, targetUserId));

    await createAdminLog({
      actorUserId: adminUserId,
      actionType: role === "moderator" ? "assign_moderator" : "remove_moderator",
      targetUserId,
      details: `Set role to ${role}`,
    });

    revalidatePath("/admin");

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update role" };
  }
}

export async function issueSanctionAction(params: {
  targetUserId: string;
  type: SanctionType;
  reason: string;
  expiresAt?: string;
}): Promise<AdminActionResult> {
  try {
    const adminUserId = await getAdminUserId();

    if (params.targetUserId === adminUserId) {
      return { error: "You cannot sanction yourself" };
    }

    const targetUser = await db.query.user.findFirst({
      where: eq(user.id, params.targetUserId),
      columns: { id: true, role: true },
    });

    if (!targetUser) {
      return { error: "Target user not found" };
    }

    if (targetUser.role === "admin") {
      return { error: "Cannot sanction another admin" };
    }

    const trimmedReason = params.reason.trim();

    if (!trimmedReason) {
      return { error: "Reason is required" };
    }

    const parsedExpiresAt = params.expiresAt ? new Date(params.expiresAt) : null;
    if (parsedExpiresAt && Number.isNaN(parsedExpiresAt.getTime())) {
      return { error: "Invalid expiration date" };
    }

    const existingSanction = await db.query.userSanctions.findFirst({
      where: and(
        eq(userSanctions.userId, params.targetUserId),
        eq(userSanctions.type, params.type),
        isNull(userSanctions.revokedAt),
      ),
      columns: { id: true },
    });

    if (existingSanction) {
      await db
        .update(userSanctions)
        .set({ revokedAt: new Date(), revokedByUserId: adminUserId })
        .where(eq(userSanctions.id, existingSanction.id));
    }

    await db.insert(userSanctions).values({
      id: randomUUID(),
      userId: params.targetUserId,
      type: params.type,
      reason: trimmedReason,
      createdByUserId: adminUserId,
      expiresAt: parsedExpiresAt,
    });

    if (params.type === "ban" && targetUser.role === "moderator") {
      await db.update(user).set({ role: "user" }).where(eq(user.id, params.targetUserId));

      await createAdminLog({
        actorUserId: adminUserId,
        actionType: "remove_moderator",
        targetUserId: params.targetUserId,
        details: "Removed moderator role due to ban",
      });
    }

    const purgeResult =
      params.type === "ban" ? await purgeUserContentOnBan(params.targetUserId) : null;

    const details = `Reason: ${trimmedReason}${parsedExpiresAt ? ` | Expires: ${parsedExpiresAt.toISOString()}` : " | Expires: never"}${
      purgeResult
        ? ` | Deleted posts: ${purgeResult.deletedPostsCount} | Deleted comments: ${purgeResult.deletedCommentsCount} | Deleted media: ${purgeResult.deletedMediaCount}`
        : ""
    }`;

    await createAdminLog({
      actorUserId: adminUserId,
      actionType: params.type === "ban" ? "ban_user" : "mute_user",
      targetUserId: params.targetUserId,
      details,
    });

    if (params.type === "ban") {
      revalidatePath("/");
      revalidatePath("/search");
      revalidatePath("/profile");
    }

    revalidatePath("/admin");

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to issue sanction" };
  }
}

export async function revokeSanctionAction(sanctionId: string): Promise<AdminActionResult> {
  try {
    const adminUserId = await getAdminUserId();

    const sanction = await db.query.userSanctions.findFirst({
      where: and(eq(userSanctions.id, sanctionId), isNull(userSanctions.revokedAt)),
      columns: { id: true, userId: true, type: true },
    });

    if (!sanction) {
      return { error: "Sanction not found or already revoked" };
    }

    await db
      .update(userSanctions)
      .set({ revokedAt: new Date(), revokedByUserId: adminUserId })
      .where(eq(userSanctions.id, sanctionId));

    await createAdminLog({
      actorUserId: adminUserId,
      actionType: "revoke_sanction",
      targetUserId: sanction.userId,
      details: `Revoked ${sanction.type}`,
    });

    revalidatePath("/admin");

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to revoke sanction" };
  }
}

export async function clearMyAdminHistoryAction(): Promise<AdminActionResult> {
  try {
    const adminUserId = await getAdminUserId();

    await db.delete(adminActionLog).where(eq(adminActionLog.actorUserId, adminUserId));

    revalidatePath("/admin");

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to clear admin history" };
  }
}

export async function adminDeletePostAction(postId: string): Promise<AdminActionResult> {
  try {
    const adminUserId = await getAdminUserId();

    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: { media: true },
      columns: { id: true, userId: true },
    });

    if (!post) {
      return { error: "Post not found" };
    }

    await Promise.allSettled(
      post.media.map((mediaItem) =>
        cloudinary.uploader.destroy(mediaItem.publicId, {
          resource_type: mediaItem.resourceType as "image" | "video" | "raw",
        })
      )
    );

    await db.delete(posts).where(eq(posts.id, postId));

    await createAdminLog({
      actorUserId: adminUserId,
      actionType: "delete_post",
      targetUserId: post.userId,
      targetPostId: post.id,
      details: "Deleted by admin",
    });

    revalidatePath("/");
    revalidatePath("/search");
    revalidatePath("/profile");
    revalidatePath("/admin");

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to delete post" };
  }
}

export async function adminDeleteCommentAction(commentId: string): Promise<AdminActionResult> {
  try {
    const adminUserId = await getAdminUserId();

    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
      columns: { id: true, userId: true, postId: true },
    });

    if (!comment) {
      return { error: "Comment not found" };
    }

    await db.delete(comments).where(eq(comments.id, commentId));

    await createAdminLog({
      actorUserId: adminUserId,
      actionType: "delete_comment",
      targetUserId: comment.userId,
      targetCommentId: comment.id,
      targetPostId: comment.postId,
      details: "Deleted by admin",
    });

    revalidatePath(`/post/${comment.postId}`);
    revalidatePath("/admin");

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to delete comment" };
  }
}
