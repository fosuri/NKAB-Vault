"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/db";
import { getSession } from "@/lib/auth/auth-server";
import { posts, ACCESS_TYPES } from "@/lib/db/auth-schema";
import { getUserModerationState } from "@/lib/auth/moderation";
import { protectPassword } from "@/lib/post-password";

export async function updatePostAccess(
  postId: string,
  newAccess: number,
  newPassword?: string | null,
) {
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

  if (![ACCESS_TYPES.PUBLIC, ACCESS_TYPES.PRIVATE, ACCESS_TYPES.PAID].includes(newAccess as any)) {
    return { error: "Invalid access type" };
  }

  const effectivePassword =
    newAccess === ACCESS_TYPES.PRIVATE && newPassword?.trim() ? await protectPassword(newPassword.trim()) : null;

  await db.update(posts)
    .set({ accessTypeId: newAccess, password: effectivePassword })
    .where(eq(posts.id, postId));

  revalidatePath(`/post/${postId}`);
  revalidatePath("/");
  revalidatePath("/profile");

  return { success: true };
}
