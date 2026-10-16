import { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;
type Row = Record<string, unknown>;

let _sql: Sql | null = null;

function getSql(): Sql {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required to connect to Neon Postgres.");
  _sql = neon(url);
  return _sql;
}

function postgresPlaceholders(statement: string): string {
  let index = 0;
  return statement.replace(/\?/g, () => `$${++index}`);
}

export async function query<T extends Row = Row>(
  statement: string,
  ...params: unknown[]
): Promise<T[]> {
  return (await getSql().query(postgresPlaceholders(statement), params)) as T[];
}

const schema = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'REVIEWER',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    api_token_hash TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
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
  )`,
  `CREATE TABLE IF NOT EXISTS entries (
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
    machine_translation BOOLEAN NOT NULL DEFAULT FALSE,
    live_stream BOOLEAN NOT NULL DEFAULT FALSE,
    original_post_date TEXT,
    metrics_views BIGINT,
    metrics_likes BIGINT,
    metrics_shares BIGINT,
    metrics_comments BIGINT,
    metrics_raw TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    qualifies BOOLEAN,
    reported_in_platform BOOLEAN NOT NULL DEFAULT FALSE,
    report_channels TEXT NOT NULL DEFAULT '[]',
    report_feedback TEXT,
    escalated_tier2 BOOLEAN NOT NULL DEFAULT FALSE,
    saps_considered BOOLEAN NOT NULL DEFAULT FALSE,
    saps_notes TEXT,
    real411_submitted BOOLEAN NOT NULL DEFAULT FALSE,
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
  )`,
  "CREATE INDEX IF NOT EXISTS idx_entries_event_status ON entries(event_id, status)",
  "CREATE INDEX IF NOT EXISTS idx_entries_created_by ON entries(created_by_id)",
  `CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    kind TEXT NOT NULL DEFAULT 'SCREENSHOT',
    data BYTEA NOT NULL,
    created_at TEXT NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_attachments_entry ON attachments(entry_id)",
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    detail TEXT,
    from_status TEXT,
    to_status TEXT,
    created_at TEXT NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_audit_entry ON audit_logs(entry_id)"
];

export async function migrate(): Promise<void> {
  for (const statement of schema) await query(statement);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}
