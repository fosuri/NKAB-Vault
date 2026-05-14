import { ensureDefaults } from "./ensure-defaults";

async function seed() {
  console.log("Seeding default lookup values...");

  await ensureDefaults();

  console.log("Defaults seeded successfully!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
