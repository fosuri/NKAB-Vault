"use server";

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { posts, postViews } from "@/lib/db/auth-schema";
import { getSession } from "@/lib/auth/auth-server";

export async function incrementPostViewsAction(postId: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return;
  }

  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(postViews)
      .values({
        id: randomUUID(),
        postId,
        userId: session.user.id,
      })
      .onConflictDoNothing({ target: [postViews.userId, postViews.postId] })
      .returning({ id: postViews.id });

    if (!inserted.length) {
      return;
    }

    await tx
      .update(posts)
      .set({ viewCount: sql`${posts.viewCount} + 1` })
      .where(eq(posts.id, postId));
  });
}
