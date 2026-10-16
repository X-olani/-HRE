import type { CategoryDef, Status } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

const STATUS_CLASS: Record<Status, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-brand-blue/15 text-brand-bluedeep",
  UNDER_REVIEW: "bg-brand-yellow/25 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  ESCALATED: "bg-danger/15 text-danger",
  ACTIONED: "bg-teal-100 text-teal-800",
  CLOSED: "bg-gray-200 text-gray-600",
  DISMISSED: "bg-gray-100 text-gray-500 line-through"
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge ${STATUS_CLASS[status] || "bg-gray-100 text-gray-700"}`}>{STATUS_LABELS[status] || status}</span>;
}

export function TierBadge({ tier }: { tier: number }) {
  return tier >= 2 ? (
    <span className="badge bg-danger/15 text-danger">Tier 2</span>
  ) : (
    <span className="badge bg-brand-blue/15 text-brand-bluedeep">Tier 1</span>
  );
}

export function CategoryChips({
  keys,
  defs
}: {
  keys: string[];
  defs: CategoryDef[];
}) {
  if (!keys?.length) return <span className="text-body/40 text-xs">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {keys.map((k) => {
        const d = defs.find((c) => c.key === k);
        const color = d?.color || "#888";
        return (
          <span
            key={k}
            className="badge"
            style={{ backgroundColor: `${color}22`, color }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {d?.label || k}
          </span>
        );
      })}
    </span>
  );
}

export function QualifyBadge({ qualifies }: { qualifies: boolean | null }) {
  if (qualifies === null || qualifies === undefined)
    return <span className="badge bg-gray-100 text-gray-500">Unreviewed</span>;
  return qualifies ? (
    <span className="badge bg-green-100 text-green-800">Qualifies</span>
  ) : (
    <span className="badge bg-gray-100 text-gray-600">Research only</span>
  );
}

export function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-bold text-ink" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-body/60">{label}</div>
    </div>
  );
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
