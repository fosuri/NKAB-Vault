"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/db";
import { getSession } from "@/lib/auth/auth-server";
import { cloudinary } from "@/lib/cloudinary";
import { postMedia, posts } from "@/lib/db/auth-schema";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const ACCESS_VALUES = ["public", "private", "paid"] as const;

const fileSchema = z
  .instanceof(File, { message: "Invalid file payload" })
  .refine((file) => file.size > 0, "Empty file is not allowed");

const createPostSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Title is too long"),
  description: z.string().trim().min(1, "Description is required").max(500, "Description is too long"),
  access: z.enum(ACCESS_VALUES).default("public"),
  files: z.array(fileSchema).min(1, "Add at least one file").max(12, "Too many files selected"),
}).superRefine((data, ctx) => {
  for (const file of data.files) {
    if (!allowedMimeTypes.includes(file.type)) {
      ctx.addIssue({
        code: "custom",
        message: `Unsupported file type: ${file.name}`,
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      ctx.addIssue({
        code: "custom",
        message: `File is too large: ${file.name}`,
      });
    }
  }
});

type CreatePostResult = {
  error?: string;
  success?: boolean;
};

function detectResourceType(file: File) {
  if (file.type === "image/gif") {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  return "image";
}

async function uploadFileToCloudinary(file: File, userId: string) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const resourceType = detectResourceType(file);

  return new Promise<{
    public_id: string;
    secure_url: string;
    resource_type: string;
    format?: string;
    width?: number;
    height?: number;
    bytes?: number;
    original_filename?: string;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `nkab-vault/${userId}`,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Upload failed"));
          return;
        }

        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

export async function createPost(formData: FormData): Promise<CreatePostResult> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "You must be signed in to create a post" };
  }

  const parsed = createPostSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    access: formData.get("access") ?? "public",
    files: formData
      .getAll("files")
      .filter((value): value is File => value instanceof File),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data" };
  }

  const files = parsed.data.files;

  const uploaded = await Promise.all(
    files.map((file) => uploadFileToCloudinary(file, session.user.id))
  );

  const postId = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(posts).values({
      id: postId,
      userId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      access: parsed.data.access,
    });

    await tx.insert(postMedia).values(
      uploaded.map((item, index) => ({
        id: randomUUID(),
        postId,
        publicId: item.public_id,
        resourceType: item.resource_type,
        format: item.format ?? null,
        secureUrl: item.secure_url,
        width: item.width ?? null,
        height: item.height ?? null,
        bytes: item.bytes ?? null,
        originalFilename: item.original_filename ?? files[index]?.name ?? null,
        sortOrder: index,
      }))
    );
  });

  revalidatePath("/");

  return { success: true };
}