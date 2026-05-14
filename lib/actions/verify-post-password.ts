"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { posts, ACCESS_TYPES } from "@/lib/db/auth-schema";
import { verifyPostPassword as utilVerify } from "@/lib/post-password";

export async function verifyPostPassword(
  postId: string,
  enteredPassword: string,
): Promise<{ valid: boolean; error?: string }> {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    columns: { password: true, accessTypeId: true },
  });

  if (!post) {
    return { valid: false, error: "Post not found" };
  }

  if (post.accessTypeId !== ACCESS_TYPES.PRIVATE || !post.password) {
    return { valid: true };
  }

  const isValid = await utilVerify(enteredPassword.trim(), post.password);
  
  if (isValid) {
    return { valid: true };
  }

  return { valid: false, error: "Incorrect password" };
}
