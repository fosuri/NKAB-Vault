"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/db";
import { getSession } from "@/lib/auth/auth-server";
import { cloudinary } from "@/lib/cloudinary";
import { postMedia, posts, user, ROLES, adminActionLog, notifications } from "@/lib/db/auth-schema";
import { getUserModerationState } from "@/lib/auth/moderation";
import { randomUUID } from "node:crypto";

type DeletePostResult = { error?: string; success?: boolean };

export async function deletePost(postId: string): Promise<DeletePostResult> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

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

  const actorRoleId = moderationState?.roleId;
  const isAdmin = actorRoleId === ROLES.ADMIN;
  const isModerator = actorRoleId === ROLES.MODERATOR;

  if (post.userId !== session.user.id && !isAdmin && !isModerator) {
    return { error: "Not authorised" };
  }

  if (isModerator && post.userId !== session.user.id) {
    const targetUser = await db.query.user.findFirst({
      where: eq(user.id, post.userId),
      columns: { roleId: true },
    });

    if (!targetUser) {
      return { error: "Post author not found" };
    }

    if (targetUser.roleId === ROLES.ADMIN || targetUser.roleId === ROLES.MODERATOR) {
      return { error: "Moderators cannot delete posts of admins or moderators" };
    }
  }

  await Promise.allSettled(
    post.media.map((m) =>
      cloudinary.uploader.destroy(m.publicId, {
        resource_type: m.resourceType as "image" | "video" | "raw",
      })
    )
  );

  await db.delete(posts).where(eq(posts.id, postId));

  if (post.userId !== session.user.id && (isAdmin || isModerator)) {
    await db.insert(adminActionLog).values({
      id: randomUUID(),
      actorUserId: session.user.id,
      actionType: "delete_post",
      targetUserId: post.userId,
      targetPostId: post.id,
      details: `Deleted by (${isAdmin ? "admin" : "moderator"})`,
    });

    await db.insert(notifications).values({
      id: randomUUID(),
      userId: post.userId,
      actorId: session.user.id,
      type: "DELETE_POST",
      message: "Deleted for community guidelines violation",
    });
  }

  revalidatePath("/");
  revalidatePath("/profile");

  return { success: true };
}
