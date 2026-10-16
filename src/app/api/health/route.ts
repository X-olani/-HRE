import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await query("SELECT 1");
    return Response.json({ ok: true });
  } catch (error) {
    console.error(
      "Database health check failed:",
      error instanceof Error ? { name: error.name, message: error.message } : "Unknown error"
    );
    return Response.json({ ok: false }, { status: 500 });
  }
}
