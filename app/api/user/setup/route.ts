import { db } from "@/lib/db/db";
import { user } from "@/lib/db/auth-schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/auth-server";
import { cloudinary } from "@/lib/cloudinary";

const DATA_IMAGE_REGEX = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;

// Schema for initial account setup
const setupSchema = z.object({
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
 * Handles avatar URL resolution for new users.
 * Uploads chosen Base64 avatar to Cloudinary.
 */
async function resolveAvatarUrl(avatar: string | undefined, userId: string): Promise<string | null | undefined> {
  if (avatar === undefined) return undefined;
  if (avatar === "") {
    try {
      await cloudinary.uploader.destroy(`nkab-vault/avatars/${userId}/avatar`, {
        resource_type: "image",
      });
    } catch (error) {
      console.error("Avatar removal from Cloudinary failed:", error);
    }
    return null;
  }

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
 * Initial User Setup API.
 * Finalizes account creation by setting username, bio, and avatar.
 * Marks 'setupCompleted' as true to allow full access to the application.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = setupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error.issues[0].message 
      }, { status: 400 });
    }

    const { username, description, avatar } = result.data;

    // Check if the chosen username is already in use
    const existingUser = await db.query.user.findFirst({
      where: eq(user.name, username),
    });

    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json({ success: false, error: "Username is already taken" }, { status: 400 });
    }

    // Set user data and mark setup as finished
    const updateData: Partial<typeof user.$inferInsert> = {
      name: username,
      profileDescription: description || "",
      setupCompleted: true,
    };
    
    const resolvedAvatar = await resolveAvatarUrl(avatar, session.user.id);
    if (resolvedAvatar !== undefined) {
      updateData.image = resolvedAvatar;
    }

    await db.update(user)
      .set(updateData)
      .where(eq(user.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Setup Profile Error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
