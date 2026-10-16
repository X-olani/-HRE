import Link from "next/link";
import { requireSession } from "@/lib/guard";
import { getActiveEvent } from "@/lib/repo";
import EntryForm from "@/components/EntryForm";

export const dynamic = "force-dynamic";

export default async function NewEntry() {
  await requireSession();
  const ev = getActiveEvent();
  if (!ev) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-body/70">No active event. Ask an administrator to activate one.</p>
        <Link href="/admin" className="btn-primary mt-4">Admin</Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink">Log content</h1>
        <p className="text-sm text-body/70">{ev.name}</p>
      </div>
      <EntryForm event={ev} />
    </div>
  );
}
