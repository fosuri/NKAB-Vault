import { db } from "@/lib/db/db";
import { roles } from "@/lib/db/auth-schema";

const defaultRoles = [
  { name: "user" },
  { name: "moderator" },
  { name: "admin" },
];

let rolesEnsuredPromise: Promise<void> | null = null;

async function seedDefaultRoles() {
  for (const role of defaultRoles) {
    await db.insert(roles).values(role).onConflictDoNothing();
  }
}

export async function ensureDefaultRoles() {
  if (!rolesEnsuredPromise) {
    rolesEnsuredPromise = seedDefaultRoles().catch((error) => {
      rolesEnsuredPromise = null;
      throw error;
    });
  }

  await rolesEnsuredPromise;
}