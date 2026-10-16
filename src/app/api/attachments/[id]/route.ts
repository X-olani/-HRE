import { getAttachmentData } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const a = getAttachmentData(params.id);
  if (!a) return new Response("Not found", { status: 404 });
  return new Response(a.data as any, {
    headers: {
      "Content-Type": a.mimeType || "application/octet-stream",
      "Cache-Control": "private, max-age=3600"
    }
  });
}
