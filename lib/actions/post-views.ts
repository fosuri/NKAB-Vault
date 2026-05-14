"use server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { posts, postViews } from "@/lib/db/auth-schema";
import { getSession } from "@/lib/auth/auth-server";

/**
 * Analytical Post View Tracking Actions.
 */

/**
 * Enforces unique view metrics and prevents double-counting for a post.
 */
export async function incrementPostViewsAction(postId: string) {
  const session = await getSession();

  if (!session?.user?.id) return;

  // Transaction ensures atomic check-and-insert
  await db.transaction(async (tx) => {
    // 1. Atomic insertion with conflict resolution
    const inserted = await tx
      .insert(postViews)
      .values({
        postId,
        userId: session.user.id,
      })
      // Unique constraint on [userId, postId] prevents double counting viewers
      .onConflictDoNothing({ target: [postViews.userId, postViews.postId] })
      .returning({ id: postViews.id });

    // 2. Exit if already viewed
    if (!inserted.length) return;
  });
}
