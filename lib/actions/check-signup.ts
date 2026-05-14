"use server";

import { db } from "@/lib/db/db";
import { user, account } from "@/lib/db/auth-schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * User Identity and Auth Validation Actions.
 */

/**
 * Ensures a username is not already registered in the system.
 */
export async function checkUsernameAvailable(
  username: string,
): Promise<boolean> {
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.name, username))
    .limit(1); // Exists check optimization
  return existing.length === 0;
}

/**
 * Ensures an email address is not already associated with an account.
 */
export async function checkEmailAvailable(email: string): Promise<boolean> {
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1); // Exists check optimization
  return existing.length === 0;
}

/**
 * Identifies accounts created via Google that lack a local password.
 */
export async function checkIsGoogleOnlyAccount(email: string): Promise<boolean> {
  const existing = await db
    .select({ id: account.id })
    .from(account)
    // Relate account to user via internal ID
    .innerJoin(user, eq(user.id, account.userId))
    .where(
      and(
        eq(user.email, email),
        eq(account.providerId, "google"),
        isNull(account.password), // Null password indicates pure OAuth flow
      ),
    )
    .limit(1);
  return existing.length > 0;
}
