import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not set for this Vercel environment." },
      { status: 500 }
    );
  }

  try {
    const url = new URL(databaseUrl);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.username ||
      !url.password ||
      !url.hostname ||
      url.pathname.length < 2
    ) {
      return Response.json(
        { ok: false, error: "DATABASE_URL is not a complete Postgres connection string." },
        { status: 500 }
      );
    }
  } catch {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not a valid Postgres connection string." },
      { status: 500 }
    );
  }

  try {
    const tables = await query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    const found = new Set(tables.map((table) => table.table_name));
    const required = ["users", "events", "entries", "attachments", "audit_logs"];
    const missing = required.filter((table) => !found.has(table));

    if (missing.length) {
      return Response.json(
        {
          ok: false,
          error: "Connected to Postgres, but the app schema is incomplete.",
          missingTables: missing
        },
        { status: 500 }
      );
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Could not query Neon. Check that DATABASE_URL points to the correct, available Neon database."
      },
      { status: 500 }
    );
  }
}
