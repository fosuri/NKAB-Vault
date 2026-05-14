"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { posts, ACCESS_TYPES } from "@/lib/db/auth-schema";
import { verifyPostPassword as utilVerify } from "@/lib/post-password";

/**
 * Validates access credentials for protected content.
 */

/**
 * Compares user-entered passwords against hashed post credentials.
 */
export async function verifyPostPassword(
  postId: string,
  enteredPassword: string,
): Promise<{ valid: boolean; error?: string }> {
  // 1. Identify the post and its security state
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    columns: { password: true, accessTypeId: true },
  });

  if (!post) {
    return { valid: false, error: "Post not found" };
  }

  // 2. State Check: If the post is no longer private, grant access immediately
  if (post.accessTypeId !== ACCESS_TYPES.PRIVATE || !post.password) {
    return { valid: true };
  }

  // 3. Cryptographic comparison using secure utility
  const isValid = await utilVerify(enteredPassword.trim(), post.password);
  
  if (isValid) {
    return { valid: true };
  }

  return { valid: false, error: "Incorrect password" };
}
