import { requireSession } from "@/lib/guard";
import { getActiveEvent, listEntries } from "@/lib/repo";
import { isTsetEligible } from "@/lib/exporters";

export const dynamic = "force-dynamic";

function Card({
  title,
  desc,
  count,
  countLabel,
  links
}: {
  title: string;
  desc: string;
  count: number;
  countLabel: string;
  links: { href: string; label: string; primary?: boolean }[];
}) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-body/70">{desc}</p>
      <div className="mt-3 text-2xl font-bold text-ink">
        {count.toLocaleString()} <span className="text-sm font-normal text-body/60">{countLabel}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {links.map((l) => (
          <a key={l.href} href={l.href} className={l.primary ? "btn-primary" : "btn-ghost"}>
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export default async function ExportsPage() {
  await requireSession();
  const ev = getActiveEvent();
  if (!ev) return <p className="text-sm text-body/70">No active event.</p>;

  const all = listEntries({ eventId: ev.id, limit: 2000 });
  const tsetCount = all.filter((e) => isTsetEligible(e, false)).length;
  const qualifying = all.filter((e) => e.qualifies === true).length;
  const real411 = all.filter((e) => e.real411Submitted || e.qualifies === true).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">Exports</h1>
        <p className="text-sm text-body/70">{ev.name}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card
          title="TSET takedown (TikTok)"
          desc="Approved, qualifying TikTok entries, formatted to the TSET bulk-upload template (9 columns, category mapped)."
          count={tsetCount}
          countLabel="eligible TikTok posts"
          links={[
            { href: "/api/export/tset?format=xlsx", label: "Download .xlsx", primary: true },
            { href: "/api/export/tset?format=csv", label: ".csv" },
            { href: "/api/export/tset?format=xlsx&all=1", label: "All TikTok (.xlsx)" }
          ]}
        />
        <Card
          title="Real411 submissions"
          desc="Qualifying and already-submitted items, in the Real411 tracking layout (ruling, outcome, reference, link)."
          count={real411}
          countLabel="candidate items"
          links={[
            { href: "/api/export/real411?format=xlsx", label: "Download .xlsx", primary: true },
            { href: "/api/export/real411?format=csv", label: ".csv" }
          ]}
        />
        <Card
          title="Full monitoring log"
          desc="Every entry for this event with all fields — the complete record for reporting and archiving."
          count={all.length}
          countLabel="total entries"
          links={[
            { href: "/api/export/full?format=xlsx", label: "Download .xlsx", primary: true },
            { href: "/api/export/full?format=csv", label: ".csv" }
          ]}
        />
      </div>

      <div className="card p-4 text-sm text-body/70">
        <p>
          <strong className="text-ink">{qualifying}</strong> entries are marked as qualifying across all platforms.
          TSET exports include only TikTok content that has been approved in review — use “All TikTok” to pull everything regardless of review status.
        </p>
      </div>
    </div>
  );
}
