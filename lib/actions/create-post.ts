"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/db";
import { getSession } from "@/lib/auth/auth-server";
import { postMedia, posts } from "@/lib/db/auth-schema";
import { ensureCanCreatePost } from "@/lib/auth/moderation";
import { protectPassword } from "@/lib/post-password";
const ACCESS_VALUES = ["public", "private", "paid"] as const;

const uploadedMediaSchema = z.object({
  publicId: z.string(),
  secureUrl: z.string(),
  resourceType: z.string(),
  format: z.string().optional().nullable(),
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
  bytes: z.number().optional().nullable(),
  originalFilename: z.string().optional().nullable(),
});

const createPostSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Title is too long"),
  description: z.string().trim().min(1, "Description is required").max(500, "Description is too long"),
  access: z.enum(ACCESS_VALUES).default("public"),
  password: z.string().max(255, "Password is too long").optional().nullable(),
  media: z.array(uploadedMediaSchema).min(1, "Add at least one file").max(3, "Too many files selected"),
});

export type CreatePostPayload = z.infer<typeof createPostSchema>;

type CreatePostResult = {
  error?: string;
  success?: boolean;
  postId?: string;
};

export async function createPost(payload: CreatePostPayload): Promise<CreatePostResult> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in to create a post" };
  }

  const permissions = await ensureCanCreatePost(session.user.id);
  if (!permissions.allowed) {
    return { error: permissions.error };
  }

  const parsed = createPostSchema.safeParse(payload);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data" };
  }

  const postId = randomUUID();

  const effectivePassword =
    parsed.data.access === "private" && parsed.data.password?.trim()
      ? await protectPassword(parsed.data.password.trim())
      : null;

  await db.transaction(async (tx) => {

    await tx.insert(posts).values({
      id: postId,
      userId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      access: parsed.data.access,
      password: effectivePassword,
    });

    await tx.insert(postMedia).values(
      parsed.data.media.map((item, index) => ({
        id: randomUUID(),
        postId,
        publicId: item.publicId,
        resourceType: item.resourceType,
        format: item.format ?? null,
        secureUrl: item.secureUrl,
        width: item.width ?? null,
        height: item.height ?? null,
        bytes: item.bytes ?? null,
        originalFilename: item.originalFilename ?? null,
        sortOrder: index,
      }))
    );
  });

  revalidatePath("/");

  return { success: true, postId };
}