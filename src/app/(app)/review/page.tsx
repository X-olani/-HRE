import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { getActiveEvent, listEntries } from "@/lib/repo";
import { StatusBadge, TierBadge, CategoryChips, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ReviewQueue() {
  await requireRole("SENIOR");
  const ev = getActiveEvent();
  if (!ev) return <p className="text-sm text-body/70">No active event.</p>;

  const queue = listEntries({ eventId: ev.id, status: ["SUBMITTED", "UNDER_REVIEW"], sort: "reach" });
  const escalated = listEntries({ eventId: ev.id, status: ["ESCALATED"], sort: "reach" });

  const Section = ({ title, rows, hint }: { title: string; rows: typeof queue; hint: string }) => (
    <div className="card overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{title} <span className="text-body/50">({rows.length})</span></h2>
        <p className="text-xs text-body/60">{hint}</p>
      </div>
      <table className="w-full">
        <thead className="border-b border-line bg-surface">
          <tr>
            <th className="th">Platform</th><th className="th">Category</th><th className="th">Tier</th>
            <th className="th">Reach</th><th className="th">Status</th><th className="th">By</th><th className="th">Logged</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td className="td text-body/50" colSpan={7}>Nothing here.</td></tr>}
          {rows.map((e) => (
            <tr key={e.id} className="border-b border-line/60 hover:bg-surface">
              <td className="td"><Link href={`/entries/${e.id}`} className="font-medium text-brand-blue hover:underline">{e.platform}</Link></td>
              <td className="td"><CategoryChips keys={e.categories} defs={ev.categories} /></td>
              <td className="td"><TierBadge tier={e.tier} /></td>
              <td className="td whitespace-nowrap text-body/70">{((e.metricsViews ?? 0)+(e.metricsLikes ?? 0)+(e.metricsShares ?? 0)).toLocaleString()}</td>
              <td className="td"><StatusBadge status={e.status} /></td>
              <td className="td whitespace-nowrap text-body/70">{e.createdByName}</td>
              <td className="td whitespace-nowrap text-body/60">{fmtDate(e.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink">Review queue</h1>
      <Section title="Awaiting review" rows={queue} hint="Submitted and in-review items — highest reach first. Open each to confirm category/tier and approve, dismiss, or escalate." />
      <Section title="Escalated (Tier 2)" rows={escalated} hint="Escalated to the HRE WhatsApp group. Kyle / Aviwe / Kirsten decide on SAPS. Mark actioned once handled." />
    </div>
  );
}
