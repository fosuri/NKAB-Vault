"use server";

import { db } from "@/lib/db/db";
import { user, account } from "@/lib/db/auth-schema";
import { eq, and, isNull } from "drizzle-orm";

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

/** Returns true when the email belongs to a Google-only account (no password set). */
export async function checkIsGoogleOnlyAccount(email: string): Promise<boolean> {
  const existing = await db
    .select({ id: account.id })
    .from(account)
    .innerJoin(user, eq(user.id, account.userId))
    .where(
      and(
        eq(user.email, email),
        eq(account.providerId, "google"),
        isNull(account.password),
      ),
    )
    .limit(1);
  return existing.length > 0;
}
