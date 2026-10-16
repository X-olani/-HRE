import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Singleton connection. better-sqlite3 is synchronous, which is fine for
// Next.js server components / server actions and keeps the data layer simple.

const DB_PATH = process.env.DATABASE_PATH || "./data/hre.db";

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const abs = path.resolve(process.cwd(), DB_PATH);
  fs.mkdirSync(path.dirname(abs), { recursive: true });

  const db = new Database(abs);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  _db = db;
  return db;
}

export function migrate(db: Database.Database) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'REVIEWER',
    active INTEGER NOT NULL DEFAULT 1,
    api_token_hash TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    start_date TEXT,
    end_date TEXT,
    categories TEXT NOT NULL DEFAULT '[]',
    platforms TEXT NOT NULL DEFAULT '[]',
    content_types TEXT NOT NULL DEFAULT '[]',
    coded_language TEXT NOT NULL DEFAULT '[]',
    reporting_routes TEXT NOT NULL DEFAULT '[]',
    tset_category_map TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id),
    created_by_id TEXT NOT NULL REFERENCES users(id),
    platform TEXT NOT NULL,
    content_url TEXT NOT NULL,
    content_type TEXT NOT NULL,
    categories TEXT NOT NULL DEFAULT '[]',
    tier INTEGER NOT NULL DEFAULT 1,
    reason TEXT NOT NULL DEFAULT '',
    narrative TEXT,
    language TEXT,
    machine_translation INTEGER NOT NULL DEFAULT 0,
    live_stream INTEGER NOT NULL DEFAULT 0,
    original_post_date TEXT,
    metrics_views INTEGER,
    metrics_likes INTEGER,
    metrics_shares INTEGER,
    metrics_comments INTEGER,
    metrics_raw TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    qualifies INTEGER,
    reported_in_platform INTEGER NOT NULL DEFAULT 0,
    report_channels TEXT NOT NULL DEFAULT '[]',
    report_feedback TEXT,
    escalated_tier2 INTEGER NOT NULL DEFAULT 0,
    saps_considered INTEGER NOT NULL DEFAULT 0,
    saps_notes TEXT,
    real411_submitted INTEGER NOT NULL DEFAULT 0,
    real411_reference TEXT,
    real411_ruling TEXT,
    real411_outcome TEXT,
    real411_link TEXT,
    live_start TEXT,
    live_end TEXT,
    reviewed_by_id TEXT REFERENCES users(id),
    review_decision TEXT,
    review_notes TEXT,
    reviewed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_entries_event_status ON entries(event_id, status);
  CREATE INDEX IF NOT EXISTS idx_entries_created_by ON entries(created_by_id);

  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    kind TEXT NOT NULL DEFAULT 'SCREENSHOT',
    data BLOB NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_attachments_entry ON attachments(entry_id);

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    detail TEXT,
    from_status TEXT,
    to_status TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_audit_entry ON audit_logs(entry_id);
  `);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}
