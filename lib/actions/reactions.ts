"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/db";
import { postReactions, notifications, posts, REACTION_TYPES, NOTIFICATION_TYPES } from "@/lib/db/auth-schema";
import { getSession } from "@/lib/auth/auth-server";
import { chatEventEmitter } from "@/lib/events";

export async function toggleReactionAction(postId: string, type: "like" | "dislike") {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in to react" };
  }

  const userId = session.user.id;

  const existing = await db.query.postReactions.findFirst({
    where: and(eq(postReactions.postId, postId), eq(postReactions.userId, userId)),
  });

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    columns: { userId: true },
  });

  if (existing) {
    if (existing.typeId === (type === "like" ? REACTION_TYPES.LIKE : REACTION_TYPES.DISLIKE)) {
      await db.delete(postReactions).where(eq(postReactions.id, existing.id));
    } else {
      await db.update(postReactions).set({ typeId: type === "like" ? REACTION_TYPES.LIKE : REACTION_TYPES.DISLIKE }).where(eq(postReactions.id, existing.id));
      
      // Switched reaction
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
    await db.insert(postReactions).values({
      postId,
      userId,
      typeId: type === "like" ? REACTION_TYPES.LIKE : REACTION_TYPES.DISLIKE,
    });

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
