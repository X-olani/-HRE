import Link from "next/link";
import { requireSession } from "@/lib/guard";
import { getActiveEvent, dashboardStats, categoryCounts, listEntries } from "@/lib/repo";
import { Stat, StatusBadge, TierBadge, CategoryChips, fmtDate } from "@/components/ui";
import { STATUS_LABELS } from "@/lib/types";
import type { Status } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: { forbidden?: string } }) {
  await requireSession();
  const ev = getActiveEvent();

  if (!ev) {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-lg font-bold text-ink">No active monitoring event</h1>
        <p className="mt-2 text-sm text-body/70">
          An administrator needs to create or activate an event before logging can begin.
        </p>
        <Link href="/admin" className="btn-primary mt-4">Go to Admin</Link>
      </div>
    );
  }

  const stats = dashboardStats(ev.id);
  const catKeys = ev.categories.map((c) => c.key);
  const cats = categoryCounts(ev.id, catKeys);
  const statusMap = Object.fromEntries(stats.byStatus.map((s) => [s.status, s.c]));
  const topReach = listEntries({ eventId: ev.id, sort: "reach", limit: 6 });

  const pending = (statusMap["SUBMITTED"] || 0) + (statusMap["UNDER_REVIEW"] || 0);
  const escalated = statusMap["ESCALATED"] || 0;

  return (
    <div className="space-y-6">
      {searchParams?.forbidden && (
        <div className="card border-danger/40 bg-danger/5 p-3 text-sm text-danger">
          You don’t have permission to view that page.
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">{ev.name}</h1>
          <p className="text-sm text-body/70">
            {ev.startDate} → {ev.endDate} · monitoring dashboard
          </p>
        </div>
        <Link href="/entries/new" className="btn-primary">+ Log content</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total logged" value={stats.total} />
        <Stat label="Awaiting review" value={pending} accent="#B7B716" />
        <Stat label="Escalated (Tier 2)" value={escalated} accent="#A32D2D" />
        <Stat label="Approved" value={statusMap["APPROVED"] || 0} accent="#3299CC" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* categories */}
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink">By category</h2>
          <div className="space-y-2">
            {ev.categories.map((c) => {
              const n = cats[c.key] || 0;
              const pct = stats.total ? Math.round((n / stats.total) * 100) : 0;
              return (
                <div key={c.key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.label}
                    </span>
                    <span className="font-medium text-ink">{n}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded bg-surface">
                    <div className="h-1.5 rounded" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* platforms */}
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink">By platform</h2>
          <div className="space-y-2">
            {stats.byPlatform.length === 0 && <p className="text-sm text-body/50">No entries yet.</p>}
            {stats.byPlatform.map((p) => (
              <div key={p.platform} className="flex items-center justify-between text-sm">
                <span>{p.platform || "—"}</span>
                <span className="font-medium text-ink">{p.c}</span>
              </div>
            ))}
          </div>
        </div>

        {/* status breakdown */}
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink">By status</h2>
          <div className="space-y-2">
            {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
              <div key={s} className="flex items-center justify-between text-sm">
                <StatusBadge status={s} />
                <span className="font-medium text-ink">{statusMap[s] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* highest reach */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Highest-reach logged content</h2>
          <Link href="/entries?sort=reach" className="text-sm text-brand-blue hover:underline">View all →</Link>
        </div>
        <table className="w-full">
          <thead className="border-b border-line bg-surface">
            <tr>
              <th className="th">Platform</th>
              <th className="th">Category</th>
              <th className="th">Reach (v/l/s)</th>
              <th className="th">Tier</th>
              <th className="th">Status</th>
              <th className="th">Logged</th>
            </tr>
          </thead>
          <tbody>
            {topReach.length === 0 && (
              <tr><td className="td text-body/50" colSpan={6}>No entries yet.</td></tr>
            )}
            {topReach.map((e) => (
              <tr key={e.id} className="border-b border-line/60 hover:bg-surface">
                <td className="td">
                  <Link href={`/entries/${e.id}`} className="font-medium text-brand-blue hover:underline">
                    {e.platform}
                  </Link>
                </td>
                <td className="td"><CategoryChips keys={e.categories} defs={ev.categories} /></td>
                <td className="td whitespace-nowrap">
                  {(e.metricsViews ?? 0).toLocaleString()} / {(e.metricsLikes ?? 0).toLocaleString()} / {(e.metricsShares ?? 0).toLocaleString()}
                </td>
                <td className="td"><TierBadge tier={e.tier} /></td>
                <td className="td"><StatusBadge status={e.status} /></td>
                <td className="td whitespace-nowrap text-body/70">{fmtDate(e.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
