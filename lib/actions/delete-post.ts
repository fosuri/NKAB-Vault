"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/db";
import { getSession } from "@/lib/auth/auth-server";
import { cloudinary } from "@/lib/cloudinary";
import { postMedia, posts } from "@/lib/db/auth-schema";

type DeletePostResult = { error?: string; success?: boolean };

export async function deletePost(postId: string): Promise<DeletePostResult> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: { media: true },
  });

  if (!post) {
    return { error: "Post not found" };
  }

  if (post.userId !== session.user.id) {
    return { error: "Not authorised" };
  }

  await Promise.allSettled(
    post.media.map((m) =>
      cloudinary.uploader.destroy(m.publicId, {
        resource_type: m.resourceType as "image" | "video" | "raw",
      })
    )
  );

  await db.delete(posts).where(eq(posts.id, postId));

  revalidatePath("/");
  revalidatePath("/profile");

  return { success: true };
}
