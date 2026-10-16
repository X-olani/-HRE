import Link from "next/link";
import { requireSession } from "@/lib/guard";
import { getActiveEvent, listEntries, type EntryFilter } from "@/lib/repo";
import { StatusBadge, TierBadge, CategoryChips, QualifyBadge, fmtDate } from "@/components/ui";
import { STATUSES, STATUS_LABELS, type Status } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EntriesPage({
  searchParams
}: {
  searchParams: Record<string, string>;
}) {
  const session = await requireSession();
  const ev = await getActiveEvent();
  if (!ev) return <p className="text-sm text-body/70">No active event.</p>;

  const f: EntryFilter = { eventId: ev.id };
  if (searchParams.status) f.status = [searchParams.status as Status];
  if (searchParams.platform) f.platform = searchParams.platform;
  if (searchParams.category) f.category = searchParams.category;
  if (searchParams.q) f.search = searchParams.q;
  if (searchParams.mine) f.createdById = session.userId;
  if (searchParams.qualifies === "yes") f.qualifies = true;
  if (searchParams.qualifies === "no") f.qualifies = false;
  f.sort = searchParams.sort === "reach" ? "reach" : "recent";
  f.limit = 500;

  const rows = await listEntries(f);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">Entries <span className="text-body/50 text-base font-normal">({rows.length})</span></h1>
        <Link href="/entries/new" className="btn-primary">+ New entry</Link>
      </div>

      <form className="card flex flex-wrap items-end gap-3 p-3" method="get">
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={searchParams.status || ""} className="select w-40">
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Platform</label>
          <select name="platform" defaultValue={searchParams.platform || ""} className="select w-36">
            <option value="">All</option>
            {ev.platforms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Category</label>
          <select name="category" defaultValue={searchParams.category || ""} className="select w-44">
            <option value="">All</option>
            {ev.categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Qualifies</label>
          <select name="qualifies" defaultValue={searchParams.qualifies || ""} className="select w-36">
            <option value="">All</option>
            <option value="yes">Qualifies</option>
            <option value="no">Research only</option>
          </select>
        </div>
        <div>
          <label className="label">Sort</label>
          <select name="sort" defaultValue={searchParams.sort || "recent"} className="select w-36">
            <option value="recent">Most recent</option>
            <option value="reach">Highest reach</option>
          </select>
        </div>
        <div className="grow">
          <label className="label">Search</label>
          <input name="q" defaultValue={searchParams.q || ""} className="input" placeholder="URL, reason, narrative…" />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="mine" value="1" defaultChecked={!!searchParams.mine} /> Mine
        </label>
        <button className="btn-ghost" type="submit">Filter</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="border-b border-line bg-surface">
            <tr>
              <th className="th">Platform</th>
              <th className="th">Category</th>
              <th className="th">Reason</th>
              <th className="th">Reach</th>
              <th className="th">Tier</th>
              <th className="th">Status</th>
              <th className="th">Qualifies</th>
              <th className="th">By</th>
              <th className="th">Logged</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className="td text-body/50" colSpan={9}>No entries match these filters.</td></tr>
            )}
            {rows.map((e) => (
              <tr key={e.id} className="border-b border-line/60 hover:bg-surface">
                <td className="td">
                  <Link href={`/entries/${e.id}`} className="font-medium text-brand-blue hover:underline">{e.platform}</Link>
                  <div className="text-xs text-body/50">{e.contentType}</div>
                </td>
                <td className="td"><CategoryChips keys={e.categories} defs={ev.categories} /></td>
                <td className="td max-w-[260px]"><span className="line-clamp-2 text-body/80">{e.reason}</span></td>
                <td className="td whitespace-nowrap text-body/70">{((e.metricsViews ?? 0) + (e.metricsLikes ?? 0) + (e.metricsShares ?? 0)).toLocaleString()}</td>
                <td className="td"><TierBadge tier={e.tier} /></td>
                <td className="td"><StatusBadge status={e.status} /></td>
                <td className="td"><QualifyBadge qualifies={e.qualifies} /></td>
                <td className="td whitespace-nowrap text-body/70">{e.createdByName}</td>
                <td className="td whitespace-nowrap text-body/60">{fmtDate(e.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
