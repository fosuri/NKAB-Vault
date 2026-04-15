"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/db";
import { getSession } from "@/lib/auth/auth-server";
import { posts } from "@/lib/db/auth-schema";
import { getUserModerationState } from "@/lib/auth/moderation";

export async function updatePostAccess(postId: string, newAccess: string) {
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
    columns: { userId: true },
  });

  if (!post) {
    return { error: "Post not found" };
  }

  if (post.userId !== session.user.id) {
    return { error: "Not authorised. Only the post author can change the access." };
  }

  if (!["public", "private", "paid"].includes(newAccess)) {
    return { error: "Invalid access type" };
  }

  await db.update(posts)
    .set({ access: newAccess })
    .where(eq(posts.id, postId));

  revalidatePath(`/post/${postId}`);
  revalidatePath("/");
  revalidatePath("/profile");

  return { success: true };
}
