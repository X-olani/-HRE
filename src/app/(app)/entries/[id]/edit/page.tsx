import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { getEntry, getEvent } from "@/lib/repo";
import { roleAtLeast } from "@/lib/types";
import EntryForm from "@/components/EntryForm";

export const dynamic = "force-dynamic";

export default async function EditEntry({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const entry = getEntry(params.id);
  if (!entry) notFound();
  const canEdit = entry.createdById === session.userId || roleAtLeast(session.role, "SENIOR");
  if (!canEdit) redirect(`/entries/${entry.id}`);
  const ev = getEvent(entry.eventId);
  if (!ev) notFound();
  return (
    <div className="space-y-4">
      <Link href={`/entries/${entry.id}`} className="text-sm text-brand-blue hover:underline">← Back to entry</Link>
      <h1 className="text-xl font-bold text-ink">Edit entry</h1>
      <EntryForm event={ev} entry={entry} />
    </div>
  );
}
