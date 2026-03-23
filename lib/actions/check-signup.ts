"use server";

import { db } from "@/lib/db/db";
import { user } from "@/lib/db/auth-schema";
import { eq } from "drizzle-orm";

export async function checkUsernameAvailable(
  username: string,
): Promise<boolean> {
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.name, username))
    .limit(1);
  return existing.length === 0;
}

export async function checkEmailAvailable(email: string): Promise<boolean> {
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  return existing.length === 0;
}
