import { ensureDefaultRoles } from "./ensure-roles";

async function seed() {
  console.log("Seeding roles...");

  await ensureDefaultRoles();

  console.log("Roles seeded successfully!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
