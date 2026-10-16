import { loadEnv } from "./_env";
loadEnv();

import bcrypt from "bcryptjs";
import { migrate } from "../src/lib/db";
import { createUser, getUserByEmail } from "../src/lib/repo";
import { seedEvents } from "./seed-events";

async function main() {
  await migrate();
  // --- admin user ---
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const pw = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim();
  if (!email || !pw || !name) {
    throw new Error("Set SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, and SEED_ADMIN_NAME before running the seed script.");
  }
  if (!(await getUserByEmail(email))) {
    await createUser({ email, name, role: "ADMIN", passwordHash: await bcrypt.hash(pw, 11) });
    console.log(`✓ Admin created: ${email}  (password from SEED_ADMIN_PASSWORD — change it after first login)`);
  } else {
    console.log(`• Admin ${email} already exists — skipped`);
  }

  await seedEvents();
  console.log("\nSeed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
