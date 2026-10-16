import { loadEnv } from "./_env";
loadEnv();
import { migrate } from "../src/lib/db";

migrate()
  .then(() => console.log("✓ Neon database schema is ready."))
  .catch((error) => {
    console.error("Database migration failed:", error);
    process.exitCode = 1;
  });
