"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/db";
import { getSession } from "@/lib/auth/auth-server";
import { postMedia, posts, subscriptions, SUBSCRIPTION_STATUSES, ACCESS_TYPES, RESOURCE_TYPES, MEDIA_FORMATS } from "@/lib/db/auth-schema";
import { eq, and, inArray } from "drizzle-orm";
import { ensureCanCreatePost } from "@/lib/auth/moderation";
import { protectPassword } from "@/lib/post-password";

/**
 * Post Submission and Content Lifecycle Actions.
 */

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
  access: z.coerce.number().refine(val => [ACCESS_TYPES.PUBLIC, ACCESS_TYPES.PRIVATE, ACCESS_TYPES.PAID].includes(val as any), "Invalid access type").default(ACCESS_TYPES.PUBLIC),
  password: z.string().max(255, "Password is too long").optional().nullable(),
  media: z.array(uploadedMediaSchema).min(1, "Add at least one file").max(3, "Too many files selected"),
});

export type CreatePostPayload = z.infer<typeof createPostSchema>;

type CreatePostResult = { error?: string; success?: boolean; postId?: string };

/**
 * Orchestrates the submission of new content and tiered storage enforcement.
 */
export async function createPost(payload: CreatePostPayload): Promise<CreatePostResult> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in to create a post" };
  }

  // 1. Moderation: Ensure the user is not currently banned or muted
  const permissions = await ensureCanCreatePost(session.user.id);
  if (!permissions.allowed) {
    return { error: permissions.error };
  }

  // 2. Schema Validation
  const parsed = createPostSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data" };
  }

  // 3. Security: Securely hash passwords for private content
  const effectivePassword =
    parsed.data.access === ACCESS_TYPES.PRIVATE && parsed.data.password?.trim()
      ? await protectPassword(parsed.data.password.trim())
      : null;

  // 4. Tiered Enforcement: Apply storage limits based on subscription status (Free vs PRO)
  const hasPro = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, session.user.id),
      inArray(subscriptions.statusId, [SUBSCRIPTION_STATUSES.ACTIVE, SUBSCRIPTION_STATUSES.TRIALING])
    ),
  });

  const maxBytes = hasPro ? 20 * 1024 * 1024 : 10 * 1024 * 1024; // 20MB for Pro, 10MB for Free

  for (const item of parsed.data.media) {
    if (item.bytes && item.bytes > maxBytes) {
      return { error: `File size exceeds the limit of ${hasPro ? 20 : 10}MB` };
    }
  }

  // 5. Atomic Persistence: Ensure Post and Media are created together or not at all
  const newPost = await db.transaction(async (tx) => {
    const [insertedPost] = await tx.insert(posts).values({
      userId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      accessTypeId: parsed.data.access,
      password: effectivePassword,
    }).returning({ id: posts.id });

    const postId = insertedPost.id;

    // Relate media records to the newly created post ID
    await tx.insert(postMedia).values(
      parsed.data.media.map((item, index) => ({
        postId,
        publicId: item.publicId,
        resourceTypeId: item.resourceType === "video" ? RESOURCE_TYPES.VIDEO : item.resourceType === "audio" ? RESOURCE_TYPES.AUDIO : RESOURCE_TYPES.IMAGE,
        formatId: item.format === "gif" ? MEDIA_FORMATS.GIF : item.format === "mp4" ? MEDIA_FORMATS.MP4 : item.format === "webm" ? MEDIA_FORMATS.WEBM : item.format === "png" ? MEDIA_FORMATS.PNG : MEDIA_FORMATS.JPEG,
        secureUrl: item.secureUrl,
        width: item.width ?? null,
        height: item.height ?? null,
        bytes: item.bytes ?? null,
        originalFilename: item.originalFilename ?? null,
        sortOrder: index,
      }))
    );

    return insertedPost;
  });

  revalidatePath("/");
  return { success: true, postId: newPost.id };
}