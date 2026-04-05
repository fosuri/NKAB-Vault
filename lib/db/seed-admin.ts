import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { ensureDefaultRoles } from "./ensure-roles";
import { user } from "./auth-schema";

type Input = {
  email?: string;
  username?: string;
};

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

async function printUsers() {
  const users = await db.query.user.findMany({
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
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
    console.log(`- ${item.email} | ${item.name} | role=${item.role}`);
  }
}

async function main() {
  await ensureDefaultRoles();

  const { email, username } = parseInput();

  if (!email && !username) {
    console.log("Provide target via --email=... or --username=... (or ADMIN_EMAIL / ADMIN_USERNAME).");
    await printUsers();
    process.exit(1);
  }

  const target = email
    ? await db.query.user.findFirst({ where: eq(user.email, email) })
    : await db.query.user.findFirst({ where: eq(user.name, username!) });

  if (!target) {
    console.log("Target user not found.");
    await printUsers();
    process.exit(1);
  }

  await db.update(user).set({ role: "admin" }).where(eq(user.id, target.id));

  const updated = await db.query.user.findFirst({
    where: eq(user.id, target.id),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  console.log("Admin role granted:");
  console.log(updated);
}

main().catch((err) => {
  console.error("Seed admin failed:", err);
  process.exit(1);
});
