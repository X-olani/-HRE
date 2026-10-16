"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  changeStatusAction,
  reviewMetaAction,
  trackingAction,
  uploadScreenshotAction,
  type FormState
} from "@/app/(app)/entries/actions";
import { TRANSITIONS, type Role, type Status, type Entry, type CategoryDef } from "@/lib/types";

function Pending({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <>{pending ? "Working…" : label}</>;
}

export function StatusActions({
  entry,
  role
}: {
  entry: Pick<Entry, "id" | "status">;
  role: Role;
}) {
  const [state, action] = useFormState<FormState, FormData>(changeStatusAction, {});
  const options = (TRANSITIONS[entry.status] || []).filter((t) => t.roles.includes(role));
  if (options.length === 0)
    return <p className="text-sm text-body/60">No actions available to you at this stage.</p>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={entry.id} />
      <textarea name="note" rows={2} className="textarea" placeholder="Optional note (recorded in the audit trail)" />
      <div className="flex flex-wrap gap-2">
        {options.map((t) => (
          <button
            key={t.to}
            type="submit"
            name="to"
            value={t.to}
            className={t.to === "ESCALATED" || t.to === "DISMISSED" ? "btn-danger" : "btn-primary"}
          >
            {t.label}
          </button>
        ))}
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}

export function ReviewForm({
  entry,
  cats
}: {
  entry: Entry;
  cats: CategoryDef[];
}) {
  const [state, action] = useFormState<FormState, FormData>(reviewMetaAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={entry.id} />
      <div>
        <label className="label">Does it qualify?</label>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5"><input type="radio" name="qualifies" value="yes" defaultChecked={entry.qualifies === true} /> Qualifies</label>
          <label className="flex items-center gap-1.5"><input type="radio" name="qualifies" value="no" defaultChecked={entry.qualifies === false} /> Research only</label>
          <label className="flex items-center gap-1.5"><input type="radio" name="qualifies" value="" defaultChecked={entry.qualifies === null} /> Unset</label>
        </div>
      </div>
      <div>
        <label className="label">Confirm categories</label>
        <div className="flex flex-wrap gap-3 text-sm">
          {cats.map((c) => (
            <label key={c.key} className="flex items-center gap-1.5">
              <input type="checkbox" name="categories" value={c.key} defaultChecked={entry.categories.includes(c.key)} />
              {c.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Confirm tier</label>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5"><input type="radio" name="tier" value="1" defaultChecked={entry.tier === 1} /> Tier 1</label>
          <label className="flex items-center gap-1.5"><input type="radio" name="tier" value="2" defaultChecked={entry.tier === 2} /> Tier 2</label>
        </div>
      </div>
      <div>
        <label className="label">Review notes</label>
        <textarea name="reviewNotes" rows={2} className="textarea" defaultValue={entry.reviewNotes || ""} />
      </div>
      <button className="btn-ghost" type="submit"><Pending label="Save review" /></button>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}

export function TrackingForm({ entry }: { entry: Entry }) {
  const [state, action] = useFormState<FormState, FormData>(trackingAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={entry.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="reportedInPlatform" defaultChecked={entry.reportedInPlatform} /> Reported in-platform</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="escalatedTier2" defaultChecked={entry.escalatedTier2} /> Tier 2 WhatsApp alert sent</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="sapsConsidered" defaultChecked={entry.sapsConsidered} /> SAPS escalation considered</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="real411Submitted" defaultChecked={entry.real411Submitted} /> Submitted to Real411</label>
      </div>
      <div>
        <label className="label">SAPS notes</label>
        <input name="sapsNotes" className="input" defaultValue={entry.sapsNotes || ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Real411 reference</label><input name="real411Reference" className="input" defaultValue={entry.real411Reference || ""} /></div>
        <div><label className="label">Real411 link</label><input name="real411Link" className="input" defaultValue={entry.real411Link || ""} /></div>
        <div><label className="label">Real411 ruling</label><input name="real411Ruling" className="input" defaultValue={entry.real411Ruling || ""} /></div>
        <div><label className="label">Real411 outcome</label><input name="real411Outcome" className="input" defaultValue={entry.real411Outcome || ""} /></div>
      </div>
      <div>
        <label className="label">Report feedback</label>
        <input name="reportFeedback" className="input" defaultValue={entry.reportFeedback || ""} />
      </div>
      {/* keep existing channels */}
      {entry.reportChannels.map((c) => (
        <input key={c} type="hidden" name="reportChannels" value={c} />
      ))}
      <button className="btn-ghost" type="submit"><Pending label="Save tracking" /></button>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}

export function ScreenshotUpload({ entryId }: { entryId: string }) {
  const [state, action] = useFormState<FormState, FormData>(uploadScreenshotAction, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={entryId} />
      <input type="file" name="screenshots" accept="image/*" multiple className="text-sm" />
      <button className="btn-ghost" type="submit"><Pending label="Upload" /></button>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
