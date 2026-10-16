import { loadEnv } from "./_env";
loadEnv();

import Database from "better-sqlite3";
import path from "node:path";
import { migrate, query } from "../src/lib/db";
import { seedEvents } from "./seed-events";

async function main(): Promise<void> {
  await migrate();

  const localPath = path.resolve(process.cwd(), process.env.DATABASE_PATH || "./data/hre.db");
  const localDb = new Database(localPath, { readonly: true, fileMustExist: true });
  let users: Array<{
    id: string;
    email: string;
    name: string;
    password_hash: string;
    role: string;
    active: number;
    created_at: string;
    updated_at: string;
  }>;

  try {
    users = localDb
      .prepare(
        `SELECT id,email,name,password_hash,role,active,created_at,updated_at
         FROM users ORDER BY created_at`
      )
      .all() as typeof users;
  } finally {
    localDb.close();
  }

  if (users.length !== 1) {
    throw new Error(`Expected exactly one local user account to copy, found ${users.length}.`);
  }

  const [localUser] = users;
  const neonUsers = await query<{ id: string; email: string }>("SELECT id,email FROM users");
  if (neonUsers.length === 0) {
    await query(
      `INSERT INTO users (id,email,name,password_hash,role,active,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      localUser.id,
      localUser.email,
      localUser.name,
      localUser.password_hash,
      localUser.role,
      localUser.active === 1,
      localUser.created_at,
      localUser.updated_at
    );
    console.log("✓ Existing login account copied to Neon (password hash only).");
  } else if (neonUsers.length === 1 && neonUsers[0].id === localUser.id && neonUsers[0].email === localUser.email) {
    console.log("• Existing login account is already in Neon — skipped.");
  } else {
    throw new Error("Neon already contains a different user account; refusing to overwrite it.");
  }

  await seedEvents();
  console.log("✓ Neon setup complete. Events were freshly seeded; no entries or attachments were copied.");
}

main().catch((error) => {
  console.error("Neon setup failed:", error);
  process.exitCode = 1;
});
