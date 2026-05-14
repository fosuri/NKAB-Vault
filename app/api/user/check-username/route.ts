import { db } from "@/lib/db/db";
import { user } from "@/lib/db/auth-schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/auth-server";

// Validation schema for usernames (English letters only, 3-20 chars)
const usernameSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z]+$/, "Username must contain only English letters and be a single word"),
});

/**
 * Username Availability API.
 * Checks if a username meets constraints and is not already taken by another user.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ available: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    // Validate username format
    const result = usernameSchema.safeParse({ username });
    if (!result.success) {
        return NextResponse.json({ 
            available: false, 
            error: result.error.issues[0].message 
        });
    }

    // Check if username exists in the database
    const existingUser = await db.query.user.findFirst({
      where: eq(user.name, result.data.username),
    });

    // If username exists and belongs to another user, it's unavailable
    if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json({ available: false, error: "Username is already taken" });
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    console.error("Check Username Error: ", error);
    return NextResponse.json({ available: false, error: "Server error" }, { status: 500 });
  }
}
