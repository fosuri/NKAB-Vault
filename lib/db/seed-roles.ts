import { db } from "./db";
import { roles } from "./auth-schema";

async function seed() {
  console.log("Seeding roles...");
  
  const rolesToSeed = [
    { name: "user" },
    { name: "moderator" },
    { name: "admin" },
  ];

  for (const r of rolesToSeed) {
    await db.insert(roles).values(r).onConflictDoNothing();
  }

  console.log("Roles seeded successfully!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
