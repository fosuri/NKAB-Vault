"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/db";
import { getSession } from "@/lib/auth/auth-server";
import { posts, ACCESS_TYPES } from "@/lib/db/auth-schema";
import { getUserModerationState } from "@/lib/auth/moderation";
import { protectPassword } from "@/lib/post-password";

/**
 * Orchestrates updates to post visibility and security settings.
 */

/**
 * Modifies access levels (Public, Private, Paid) and manages post passwords.
 */
export async function updatePostAccess(
  postId: string,
  newAccess: number,
  newPassword?: string | null,
) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  // 1. Sanity check: prevent banned users from modifying content
  const moderationState = await getUserModerationState(session.user.id);
  if (moderationState?.activeBan) {
    return { error: "Your account is banned" };
  }

  // 2. Ownership Verification: Only the author can adjust visibility
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

  // 3. Validation: ensures the new access type matches predefined constants
  if (![ACCESS_TYPES.PUBLIC, ACCESS_TYPES.PRIVATE, ACCESS_TYPES.PAID].includes(newAccess as any)) {
    return { error: "Invalid access type" };
  }

  // 4. Security: Securely hash the password if transitioning to a protected state
  const effectivePassword =
    newAccess === ACCESS_TYPES.PRIVATE && newPassword?.trim() ? await protectPassword(newPassword.trim()) : null;

  // 5. Persistence: Atomic update of visibility and credentials
  await db.update(posts)
    .set({ accessTypeId: newAccess, password: effectivePassword })
    .where(eq(posts.id, postId));

  // 6. UI Synchronization: Refresh all paths where visibility changes impact the layout
  revalidatePath(`/post/${postId}`);
  revalidatePath("/");
  revalidatePath("/profile");

  return { success: true };
}
