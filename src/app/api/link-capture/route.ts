import { getSession } from "@/lib/auth";
import { getUserById } from "@/lib/repo";
import { captureLink } from "@/lib/linkCapture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Called by the entry form when a link is added: screenshots the post and returns
// whatever engagement metrics could be read. Nothing is stored here — the form
// submits the screenshot along with the entry.
export async function POST(req: Request) {
  const s = await getSession();
  const u = s ? getUserById(s.userId) : null;
  if (!u || !u.active) return Response.json({ error: "unauthenticated" }, { status: 401 });

  let url = "";
  try {
    url = String((await req.json())?.url || "").trim();
  } catch {}
  if (!url) return Response.json({ error: "Missing url" }, { status: 400 });

  try {
    const c = await captureLink(url);
    return Response.json({
      platform: c.platform,
      contentType: c.contentType,
      views: c.views,
      likes: c.likes,
      shares: c.shares,
      comments: c.comments,
      postDate: c.postDate,
      text: c.text?.slice(0, 1000) ?? null,
      screenshot: c.screenshot ? `data:image/png;base64,${c.screenshot.toString("base64")}` : null,
      screenshotSource: c.screenshotSource,
      capturedAt: new Date().toISOString(),
      notes: c.notes
    });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Capture failed" }, { status: 422 });
  }
}
