import { ensureDefaults } from "./ensure-defaults";

/**
 * Entry point for initializing lookup tables and core constants.
 */

async function seed() {
  console.log("Seeding default lookup values...");

  // Synchronize database with the internal constant registry
  await ensureDefaults();

  console.log("Defaults seeded successfully!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
