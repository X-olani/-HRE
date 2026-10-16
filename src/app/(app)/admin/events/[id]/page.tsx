import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/guard";
import { getEvent } from "@/lib/repo";
import { EventEditor } from "@/components/AdminForms";

export const dynamic = "force-dynamic";

export default async function EventConfigPage({ params }: { params: { id: string } }) {
  await requireRole("ADMIN");
  const ev = await getEvent(params.id);
  if (!ev) notFound();
  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-brand-blue hover:underline">← Admin</Link>
      <div>
        <h1 className="text-xl font-bold text-ink">Configure: {ev.name}</h1>
        <p className="text-sm text-body/70">
          Edit categories, coded-language lists, platforms and the TSET mapping. This is how the same tool is
          reconfigured for a new event — no rebuild needed.
        </p>
      </div>
      <div className="card p-5">
        <EventEditor ev={ev} />
      </div>
    </div>
  );
}
