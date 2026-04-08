"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { posts } from "@/lib/db/auth-schema";

export async function incrementPostViewsAction(postId: string) {
  await db
    .update(posts)
    .set({ viewCount: sql`${posts.viewCount} + 1` })
    .where(eq(posts.id, postId));
}
