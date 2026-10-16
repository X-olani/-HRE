"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  createUserAction,
  updateUserAction,
  createEventAction,
  setActiveEventAction,
  updateEventAction,
  type AdminState
} from "@/app/(app)/admin/actions";
import { ROLES, ROLE_LABELS, type EventConfig, type User } from "@/lib/types";

function Msg({ s }: { s: AdminState }) {
  if (s.error) return <p className="text-sm text-danger">{s.error}</p>;
  if (s.ok) return <p className="text-sm text-green-700">{s.ok}</p>;
  return null;
}
function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn-ghost" type="submit">{pending ? "…" : label}</button>;
}

export function CreateUserForm() {
  const [s, a] = useFormState<AdminState, FormData>(createUserAction, {});
  return (
    <form action={a} className="flex flex-wrap items-end gap-3">
      <div><label className="label">Name</label><input name="name" className="input w-40" required /></div>
      <div><label className="label">Email</label><input name="email" type="email" className="input w-52" required /></div>
      <div>
        <label className="label">Role</label>
        <select name="role" className="select w-40" defaultValue="REVIEWER">
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>
      <div><label className="label">Temp password</label><input name="password" className="input w-40" required /></div>
      <button className="btn-primary" type="submit">Add user</button>
      <div className="w-full"><Msg s={s} /></div>
    </form>
  );
}

export function UserRow({ u }: { u: User }) {
  const [s, a] = useFormState<AdminState, FormData>(updateUserAction, {});
  return (
    <form action={a} className="flex flex-wrap items-center gap-2 border-b border-line/60 py-2 text-sm">
      <input type="hidden" name="id" value={u.id} />
      <div className="min-w-[180px]">
        <div className="font-medium text-ink">{u.name}</div>
        <div className="text-xs text-body/60">{u.email}</div>
      </div>
      <select name="role" defaultValue={u.role} className="select w-36">
        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
      </select>
      <select name="active" defaultValue={u.active ? "1" : "0"} className="select w-28">
        <option value="1">Active</option>
        <option value="0">Disabled</option>
      </select>
      <input name="password" className="input w-40" placeholder="Reset password…" />
      <Submit label="Save" />
      <Msg s={s} />
    </form>
  );
}

export function CreateEventForm({ events }: { events: EventConfig[] }) {
  const [s, a] = useFormState<AdminState, FormData>(createEventAction, {});
  return (
    <form action={a} className="flex flex-wrap items-end gap-3">
      <div><label className="label">Name</label><input name="name" className="input w-60" required /></div>
      <div><label className="label">Slug</label><input name="slug" className="input w-48" placeholder="elections-2026-11-04" required /></div>
      <div><label className="label">Start</label><input name="startDate" type="date" className="input" /></div>
      <div><label className="label">End</label><input name="endDate" type="date" className="input" /></div>
      <div>
        <label className="label">Clone config from</label>
        <select name="cloneFrom" className="select w-52" defaultValue="">
          <option value="">Election defaults</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>
      <div className="w-full"><label className="label">Description</label><input name="description" className="input" /></div>
      <button className="btn-primary" type="submit">Create event</button>
      <div className="w-full"><Msg s={s} /></div>
    </form>
  );
}

export function SetActiveForm({ id, active }: { id: string; active: boolean }) {
  const [s, a] = useFormState<AdminState, FormData>(setActiveEventAction, {});
  return (
    <form action={a} className="inline">
      <input type="hidden" name="id" value={id} />
      <button className={active ? "badge bg-green-100 text-green-800" : "btn-ghost"} type="submit" disabled={active}>
        {active ? "Active" : "Set active"}
      </button>
      <Msg s={s} />
    </form>
  );
}

export function EventEditor({ ev }: { ev: EventConfig }) {
  const [s, a] = useFormState<AdminState, FormData>(updateEventAction, {});
  const j = (v: any) => JSON.stringify(v, null, 2);
  return (
    <form action={a} className="space-y-4">
      <input type="hidden" name="id" value={ev.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Name</label><input name="name" defaultValue={ev.name} className="input" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label">Start</label><input name="startDate" type="date" defaultValue={ev.startDate || ""} className="input" /></div>
          <div><label className="label">End</label><input name="endDate" type="date" defaultValue={ev.endDate || ""} className="input" /></div>
        </div>
      </div>
      <div><label className="label">Description</label><input name="description" defaultValue={ev.description || ""} className="input" /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Platforms (comma-separated)</label><input name="platforms" defaultValue={ev.platforms.join(", ")} className="input" /></div>
        <div><label className="label">Content types (comma-separated)</label><input name="contentTypes" defaultValue={ev.contentTypes.join(", ")} className="input" /></div>
      </div>
      <div>
        <label className="label">Categories (JSON: key, label, color, definition)</label>
        <textarea name="categories" rows={10} className="textarea font-mono text-xs" defaultValue={j(ev.categories)} />
      </div>
      <div>
        <label className="label">Coded language (JSON: group, terms[])</label>
        <textarea name="codedLanguage" rows={10} className="textarea font-mono text-xs" defaultValue={j(ev.codedLanguage)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Reporting routes (JSON)</label>
          <textarea name="reportingRoutes" rows={6} className="textarea font-mono text-xs" defaultValue={j(ev.reportingRoutes)} />
        </div>
        <div>
          <label className="label">TSET category map (JSON: category key → TSET violation)</label>
          <textarea name="tsetCategoryMap" rows={6} className="textarea font-mono text-xs" defaultValue={j(ev.tsetCategoryMap)} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" type="submit">Save event</button>
        <Msg s={s} />
      </div>
    </form>
  );
}
