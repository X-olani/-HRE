import { hashApiToken } from "@/lib/auth";
import {
  getUserByApiTokenHash,
  getActiveEvent,
  createEntry,
  addAttachment,
  addAudit
} from "@/lib/repo";
import { platformFromUrl, contentTypeFromUrl } from "@/lib/linkCapture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-HRE-Token"
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400, headers: CORS });
  }

  const token = (req.headers.get("x-hre-token") || String(form.get("token") || "")).trim();
  if (!token) return Response.json({ error: "Missing token" }, { status: 401, headers: CORS });

  const user = await getUserByApiTokenHash(hashApiToken(token));
  if (!user) return Response.json({ error: "Invalid token" }, { status: 401, headers: CORS });

  const ev = await getActiveEvent();
  if (!ev) return Response.json({ error: "No active event" }, { status: 409, headers: CORS });

  const url = String(form.get("url") || "").trim();
  if (!url) return Response.json({ error: "Missing url" }, { status: 400, headers: CORS });

  const platform = String(form.get("platform") || "").trim() || platformFromUrl(url);
  const contentType = String(form.get("contentType") || "").trim() || contentTypeFromUrl(url);
  const metricsRaw = String(form.get("metrics") || "").trim() || null;
  const pageText = String(form.get("text") || "").trim();
  const narrative = pageText ? `Captured context: ${pageText.slice(0, 1000)}` : null;

  const entry = await createEntry({
    eventId: ev.id,
    createdById: user.id,
    platform,
    contentUrl: url,
    contentType,
    liveStream: contentType === "Live stream",
    metricsRaw,
    narrative,
    status: "DRAFT"
  });

  const shot = form.get("screenshot");
  if (shot instanceof File && shot.size > 0 && shot.size < 10 * 1024 * 1024) {
    const buf = Buffer.from(await shot.arrayBuffer());
    await addAttachment({
      entryId: entry.id,
      filename: shot.name || "capture.png",
      mimeType: shot.type || "image/png",
      kind: "SCREENSHOT",
      data: buf
    });
  }

  await addAudit({
    entryId: entry.id,
    userId: user.id,
    action: "CAPTURE",
    detail: "Captured via one-click extension",
    toStatus: "DRAFT"
  });

  const appUrl = process.env.APP_URL || new URL(req.url).origin;
  return Response.json(
    { id: entry.id, editUrl: `${appUrl}/entries/${entry.id}/edit` },
    { headers: CORS }
  );
}
