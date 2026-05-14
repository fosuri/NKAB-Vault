import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { ensureDefaults } from "./ensure-defaults";
import { user, ROLES } from "./auth-schema";

/**
 * Administrative bootstrapping script for granting elevated privileges.
 */

type Input = {
  email?: string;
  username?: string;
};

/**
 * Parses CLI arguments or Environment variables to identify the target user.
 */
function parseInput(): Input {
  const emailArg = process.argv.find((arg) => arg.startsWith("--email="));
  const usernameArg = process.argv.find((arg) => arg.startsWith("--username="));

  const email = process.env.ADMIN_EMAIL ?? emailArg?.slice("--email=".length);
  const username = process.env.ADMIN_USERNAME ?? usernameArg?.slice("--username=".length);

  return {
    email: email?.trim() || undefined,
    username: username?.trim() || undefined,
  };
}

/**
 * Outputs a diagnostic list of recent users to aid in target selection.
 */
async function printUsers() {
  const users = await db.query.user.findMany({
    columns: {
      id: true,
      name: true,
      email: true,
      roleId: true,
      createdAt: true,
    },
    orderBy: [desc(user.createdAt)],
    limit: 30,
  });

  if (!users.length) {
    console.log("No users found in database.");
    return;
  }

  console.log("Available users (latest 30):");
  for (const item of users) {
    console.log(`- ${item.email} | ${item.name} | roleId=${item.roleId}`);
  }
}

/**
 * Orchestrates the promotion of a user account to Admin status.
 */
async function main() {
  // 1. Ensure core schema constants are populated
  await ensureDefaults();

  const { email, username } = parseInput();

  if (!email && !username) {
    console.log("Provide target via --email=... or --username=... (or ADMIN_EMAIL / ADMIN_USERNAME).");
    await printUsers();
    process.exit(1);
  }

  // 2. Identify the target account
  const target = email
    ? await db.query.user.findFirst({ where: eq(user.email, email) })
    : await db.query.user.findFirst({ where: eq(user.name, username!) });

  if (!target) {
    console.log("Target user not found.");
    await printUsers();
    process.exit(1);
  }

  // 3. Elevate permissions in the database
  await db.update(user).set({ roleId: ROLES.ADMIN }).where(eq(user.id, target.id));

  const updated = await db.query.user.findFirst({
    where: eq(user.id, target.id),
    columns: {
      id: true,
      name: true,
      email: true,
      roleId: true,
    },
  });

  console.log("Admin role granted:");
  console.log(updated);
}

main().catch((err) => {
  console.error("Seed admin failed:", err);
  process.exit(1);
});
