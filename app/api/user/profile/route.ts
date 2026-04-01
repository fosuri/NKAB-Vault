import { db } from "@/lib/db/db";
import { user } from "@/lib/db/auth-schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/auth-server";

const updateProfileSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z]+$/, "Username must contain only English letters and be a single word"),
  description: z.string().max(500, "Description is too long").optional(),
  avatar: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

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

    const existingUser = await db.query.user.findFirst({
      where: eq(user.name, username),
    });

    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json({ success: false, error: "Username is already taken" }, { status: 400 });
    }

    const updateData: Partial<typeof user.$inferInsert> = {
      name: username,
      profileDescription: description || "",
    };
    
    if (avatar) {
      updateData.image = avatar;
    }

    await db.update(user)
      .set(updateData)
      .where(eq(user.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
