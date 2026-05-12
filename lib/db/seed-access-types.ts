import { db } from "./db";
import { accessTypes } from "./auth-schema";

async function main() {
  console.log("Seeding access types...");

  const typesToSeed = ["public", "private", "paid"];

  for (const type of typesToSeed) {
    try {
      await db.insert(accessTypes).values({
        name: type,
      }).onConflictDoNothing();
      console.log(`Access type "${type}" seeded or already exists.`);
    } catch (e) {
      console.error(`Error seeding access type "${type}":`, e);
    }
  }

  console.log("Seeding completed.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
