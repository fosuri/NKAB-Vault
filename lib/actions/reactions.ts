"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/db";
import { postReactions, notifications, posts, REACTION_TYPES, NOTIFICATION_TYPES } from "@/lib/db/auth-schema";
import { getSession } from "@/lib/auth/auth-server";
import { chatEventEmitter } from "@/lib/events";

/**
 * Social Interaction (Reactions) Actions.
 */

/**
 * Orchestrates social engagement metrics through Like/Dislike toggling.
 */
export async function toggleReactionAction(postId: string, type: "like" | "dislike") {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in to react" };
  }

  const userId = session.user.id;

  // 1. Identify existing reaction state for this user/post pair
  const existing = await db.query.postReactions.findFirst({
    where: and(eq(postReactions.postId, postId), eq(postReactions.userId, userId)),
  });

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    columns: { userId: true },
  });

  if (existing) {
    // Branch A: Reaction exists
    if (existing.typeId === (type === "like" ? REACTION_TYPES.LIKE : REACTION_TYPES.DISLIKE)) {
      // Toggle OFF: same type clicked twice
      await db.delete(postReactions).where(eq(postReactions.id, existing.id));
    } else {
      // Toggle SWITCH: user changed from Like to Dislike (or vice versa)
      await db.update(postReactions).set({ typeId: type === "like" ? REACTION_TYPES.LIKE : REACTION_TYPES.DISLIKE }).where(eq(postReactions.id, existing.id));
      
      // Notify post owner of the state change
      if (post && post.userId !== userId) {
        await db.insert(notifications).values({
          userId: post.userId,
          actorId: userId,
          typeId: type === "like" ? NOTIFICATION_TYPES.LIKE : NOTIFICATION_TYPES.DISLIKE,
          postId,
        });
        chatEventEmitter.emit(`notifications:${post.userId}`, { type: "update" });
      }
    }
  } else {
    // Branch B: No existing reaction -> Create new one
    await db.insert(postReactions).values({
      postId,
      userId,
      typeId: type === "like" ? REACTION_TYPES.LIKE : REACTION_TYPES.DISLIKE,
    });

    // Notify post owner of the interaction
    if (post && post.userId !== userId) {
      await db.insert(notifications).values({
        userId: post.userId,
        actorId: userId,
        typeId: type === "like" ? NOTIFICATION_TYPES.LIKE : NOTIFICATION_TYPES.DISLIKE,
        postId,
      });
      chatEventEmitter.emit(`notifications:${post.userId}`, { type: "update" });
    }
  }

  revalidatePath(`/post/${postId}`);
  return { success: true };
}
