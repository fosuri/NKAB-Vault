import { db } from "@/lib/db/db";
import { user } from "@/lib/db/auth-schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/auth-server";
import { cloudinary } from "@/lib/cloudinary";

const DATA_IMAGE_REGEX = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;

// Schema for profile updates (username, description, and avatar URL/Base64)
const updateProfileSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z]+$/, "Username must contain only English letters and be a single word"),
  description: z.string().max(500, "Description is too long").optional(),
  avatar: z.union([
    z.string().url("Must be a valid URL"),
    z.string().regex(DATA_IMAGE_REGEX, "Must be a valid image"),
    z.literal(""),
  ]).optional(),
});

/**
 * Handles avatar URL resolution. 
 * Uploads Base64 images to Cloudinary or removes the avatar if an empty string is provided.
 */
async function resolveAvatarUrl(avatar: string | undefined, userId: string): Promise<string | null | undefined> {
  if (avatar === undefined) return undefined;
  if (avatar === "") {
    // Delete existing avatar from Cloudinary
    try {
      await cloudinary.uploader.destroy(`nkab-vault/avatars/${userId}/avatar`, {
        resource_type: "image",
      });
    } catch (error) {
      console.error("Avatar removal from Cloudinary failed:", error);
    }
    return null;
  }

  // Upload new Base64 avatar to Cloudinary
  if (avatar.startsWith("data:image/")) {
    const uploadResult = await cloudinary.uploader.upload(avatar, {
      folder: `nkab-vault/avatars/${userId}`,
      public_id: "avatar",
      overwrite: true,
      resource_type: "image",
    });
    return uploadResult.secure_url;
  }

  return avatar;
}

/**
 * User Profile Update API.
 * Updates the authenticated user's name, description, and avatar.
 */
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error.issues[0].message 
      }, { status: 400 });
    }

    const { username, description, avatar } = result.data;

    // Ensure the new username is not taken by another user
    const existingUser = await db.query.user.findFirst({
      where: eq(user.name, username),
    });

    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json({ success: false, error: "Username is already taken" }, { status: 400 });
    }

    // Prepare update data and resolve avatar logic
    const updateData: Partial<typeof user.$inferInsert> = {
      name: username,
      profileDescription: description || "",
    };
    const resolvedAvatar = await resolveAvatarUrl(avatar, session.user.id);
    if (resolvedAvatar !== undefined) {
      updateData.image = resolvedAvatar;
    }

    // Update user record in the database
    await db.update(user)
      .set(updateData)
      .where(eq(user.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
