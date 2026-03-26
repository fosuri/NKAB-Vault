"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/db";
import { getSession } from "@/lib/auth/auth-server";
import { comments } from "@/lib/db/auth-schema";

const bodySchema = z
  .string()
  .trim()
  .min(1, "Comment cannot be empty")
  .max(1000, "Comment is too long");

type ActionResult = { error?: string; success?: boolean };

export async function createComment(
  postId: string,
  body: string
): Promise<ActionResult> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in to comment" };
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid comment" };
  }

  await db.insert(comments).values({
    id: randomUUID(),
    postId,
    userId: session.user.id,
    body: parsed.data,
  });

  revalidatePath(`/post/${postId}`);

  return { success: true };
}

export async function deleteComment(
  commentId: string,
  postId: string
): Promise<ActionResult> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const comment = await db.query.comments.findFirst({
    where: eq(comments.id, commentId),
  });

  if (!comment) {
    return { error: "Comment not found" };
  }

  if (comment.userId !== session.user.id) {
    return { error: "Not authorised" };
  }

  await db.delete(comments).where(eq(comments.id, commentId));

  revalidatePath(`/post/${postId}`);

  return { success: true };
}
