import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { getEntry, getEvent, listAttachments, listAudit } from "@/lib/repo";
import { roleAtLeast } from "@/lib/types";
import { StatusBadge, TierBadge, CategoryChips, QualifyBadge, fmtDate } from "@/components/ui";
import { StatusActions, ReviewForm, TrackingForm, ScreenshotUpload } from "@/components/WorkflowPanels";

export const dynamic = "force-dynamic";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-body/50">{label}</div>
      <div className="mt-0.5 text-sm text-ink">{children}</div>
    </div>
  );
}

export default async function EntryDetail({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const entry = await getEntry(params.id);
  if (!entry) notFound();
  const ev = (await getEvent(entry.eventId))!;
  const atts = await listAttachments(entry.id);
  const audit = await listAudit(entry.id);
  const canEdit = entry.createdById === session.userId || roleAtLeast(session.role, "SENIOR");
  const isSenior = roleAtLeast(session.role, "SENIOR");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/entries" className="text-sm text-brand-blue hover:underline">← All entries</Link>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-bold text-ink">
            {entry.platform} · {entry.contentType}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={entry.status} />
            <TierBadge tier={entry.tier} />
            <QualifyBadge qualifies={entry.qualifies} />
          </div>
        </div>
        {canEdit && (
          <Link href={`/entries/${entry.id}/edit`} className="btn-ghost">Edit</Link>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* main */}
        <div className="space-y-5">
          <div className="card p-5 space-y-4">
            <Field label="Content URL">
              <a href={entry.contentUrl} target="_blank" rel="noopener noreferrer" className="break-all text-brand-blue hover:underline">
                {entry.contentUrl}
              </a>
            </Field>
            <Field label="Category"><CategoryChips keys={entry.categories} defs={ev.categories} /></Field>
            <Field label="Reason">{entry.reason || <span className="text-body/40">—</span>}</Field>
            {entry.narrative && <Field label="Narrative / context">{entry.narrative}</Field>}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Views">{(entry.metricsViews ?? 0).toLocaleString()}</Field>
              <Field label="Likes">{(entry.metricsLikes ?? 0).toLocaleString()}</Field>
              <Field label="Shares">{(entry.metricsShares ?? 0).toLocaleString()}</Field>
              <Field label="Comments">{(entry.metricsComments ?? 0).toLocaleString()}</Field>
            </div>
            {entry.metricsRaw && <Field label="Metrics note">{entry.metricsRaw}</Field>}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Language">{entry.language || "—"}{entry.machineTranslation ? " (MT)" : ""}</Field>
              <Field label="Live stream">{entry.liveStream ? "Yes" : "No"}</Field>
              <Field label="Original post date">{entry.originalPostDate || "—"}</Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Logged by">{entry.createdByName} · {fmtDate(entry.createdAt)}</Field>
              <Field label="Reviewed by">{entry.reviewedByName ? `${entry.reviewedByName} · ${fmtDate(entry.reviewedAt)}` : "—"}</Field>
            </div>
          </div>

          {/* screenshots */}
          <div className="card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink">Screenshots ({atts.length})</h2>
            {atts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {atts.map((a) => (
                  <a key={a.id} href={`/api/attachments/${a.id}`} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/attachments/${a.id}`} alt={a.filename} className="h-32 w-full rounded-lg border border-line object-cover" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-body/50">No screenshots yet.</p>
            )}
            <ScreenshotUpload entryId={entry.id} />
          </div>

          {/* reporting / real411 */}
          <div className="card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink">Reporting &amp; Real411</h2>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Field label="In-platform">{entry.reportedInPlatform ? "Yes" : "No"}</Field>
              <Field label="Tier 2 alert">{entry.escalatedTier2 ? "Sent" : "—"}</Field>
              <Field label="SAPS">{entry.sapsConsidered ? "Considered" : "—"}</Field>
              <Field label="Real411">{entry.real411Submitted ? (entry.real411Reference || "Submitted") : "—"}</Field>
            </div>
            {entry.reportChannels.length > 0 && (
              <Field label="Channels">{entry.reportChannels.join(", ")}</Field>
            )}
            {entry.reportFeedback && <Field label="Feedback">{entry.reportFeedback}</Field>}
            <details>
              <summary className="cursor-pointer text-sm font-medium text-brand-blue">Update reporting / Real411</summary>
              <div className="mt-3"><TrackingForm entry={entry} /></div>
            </details>
          </div>
        </div>

        {/* side */}
        <div className="space-y-5">
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Workflow</h2>
            <StatusActions entry={entry} role={session.role} />
          </div>

          {isSenior && (
            <div className="card p-4">
              <h2 className="mb-3 text-sm font-semibold text-ink">Review sign-off</h2>
              <ReviewForm entry={entry} cats={ev.categories} />
            </div>
          )}

          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Audit trail</h2>
            <ol className="space-y-2.5">
              {audit.map((a) => (
                <li key={a.id} className="border-l-2 border-line pl-3 text-xs">
                  <div className="font-medium text-ink">{a.action}{a.toStatus ? ` → ${a.toStatus}` : ""}</div>
                  {a.detail && <div className="text-body/70 break-words">{a.detail}</div>}
                  <div className="text-body/40">{a.userName || "system"} · {fmtDate(a.createdAt)}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
