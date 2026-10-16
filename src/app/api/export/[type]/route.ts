import { getActiveEvent, getEvent, listEntries } from "@/lib/repo";
import {
  TSET_HEADERS,
  FULL_HEADERS,
  REAL411_HEADERS,
  tsetRows,
  fullRows,
  real411Rows,
  isTsetEligible,
  toCsv,
  toXlsx
} from "@/lib/exporters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { type: string } }) {
  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const includeAll = url.searchParams.get("all") === "1";

  const ev = eventId ? await getEvent(eventId) : await getActiveEvent();
  if (!ev) return new Response("No event", { status: 400 });

  const all = await listEntries({ eventId: ev.id, limit: 2000 });
  const stamp = new Date().toISOString().slice(0, 10);

  let headers: string[];
  let rows: (string | number)[][];
  let base: string;
  let sheet: string;

  if (params.type === "tset") {
    const eligible = all.filter((e) => isTsetEligible(e, includeAll));
    headers = TSET_HEADERS;
    rows = tsetRows(eligible, ev.tsetCategoryMap);
    base = `TSET_takedown_${ev.slug}_${stamp}`;
    sheet = "Sheet1";
  } else if (params.type === "real411") {
    const candidates = all.filter((e) => e.real411Submitted || e.qualifies === true);
    headers = REAL411_HEADERS;
    rows = real411Rows(candidates);
    base = `Real411_${ev.slug}_${stamp}`;
    sheet = "Real411";
  } else if (params.type === "full") {
    headers = FULL_HEADERS;
    rows = fullRows(all, ev.categories);
    base = `HRE_log_${ev.slug}_${stamp}`;
    sheet = "Monitoring log";
  } else {
    return new Response("Unknown export type", { status: 404 });
  }

  if (format === "csv") {
    const csv = toCsv(headers, rows);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.csv"`
      }
    });
  }

  const buf = await toXlsx(sheet, headers, rows);
  return new Response(buf as any, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${base}.xlsx"`
    }
  });
}
