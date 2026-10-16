import { loadEnv } from "./_env";
loadEnv();
import { getDb } from "../src/lib/db";

getDb(); // opens the DB and runs CREATE TABLE IF NOT EXISTS ...
console.log(`✓ Database ready at ${process.env.DATABASE_PATH || "./data/hre.db"}`);
