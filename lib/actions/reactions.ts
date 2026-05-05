"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/db";
import { postReactions, notifications, posts } from "@/lib/db/auth-schema";
import { getSession } from "@/lib/auth/auth-server";

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
    if (existing.type === type) {
      await db.delete(postReactions).where(eq(postReactions.id, existing.id));
    } else {
      await db.update(postReactions).set({ type }).where(eq(postReactions.id, existing.id));
    }
  } else {
    await db.insert(postReactions).values({
      postId,
      userId,
      type,
    });

    if (type === "like" && post && post.userId !== userId) {
      await db.insert(notifications).values({
        userId: post.userId,
        actorId: userId,
        type: "LIKE",
        postId,
      });
    }
  }

  revalidatePath(`/post/${postId}`);
  return { success: true };
}
