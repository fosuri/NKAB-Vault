"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/db";
import { postReactions } from "@/lib/db/auth-schema";
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

  if (existing) {
    if (existing.type === type) {
      await db.delete(postReactions).where(eq(postReactions.id, existing.id));
    } else {
      await db.update(postReactions).set({ type }).where(eq(postReactions.id, existing.id));
    }
  } else {
    await db.insert(postReactions).values({
      id: randomUUID(),
      postId,
      userId,
      type,
    });
  }

  revalidatePath(`/post/${postId}`);
  return { success: true };
}
