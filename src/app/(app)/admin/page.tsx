import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { listUsers, listEvents } from "@/lib/repo";
import { ROLE_LABELS } from "@/lib/types";
import { CreateUserForm, UserRow, CreateEventForm, SetActiveForm } from "@/components/AdminForms";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireRole("ADMIN");
  const users = listUsers();
  const events = listEvents();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-ink">Admin</h1>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Events</h2>
        <div className="mb-4 overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-line bg-surface">
              <tr><th className="th">Name</th><th className="th">Slug</th><th className="th">Window</th><th className="th">State</th><th className="th"></th></tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-line/60">
                  <td className="td font-medium text-ink">{e.name}</td>
                  <td className="td text-body/70">{e.slug}</td>
                  <td className="td whitespace-nowrap text-body/70">{e.startDate || "—"} → {e.endDate || "—"}</td>
                  <td className="td"><SetActiveForm id={e.id} active={e.active} /></td>
                  <td className="td"><Link href={`/admin/events/${e.id}`} className="text-brand-blue hover:underline">Configure →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line pt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-body/60">New event</h3>
          <CreateEventForm events={events} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Users</h2>
        <div className="mb-4 border-b border-line pb-4">
          <CreateUserForm />
        </div>
        <div>
          {users.map((u) => <UserRow key={u.id} u={u} />)}
        </div>
        <p className="mt-3 text-xs text-body/50">
          Roles: Reviewers log & report; Senior reviewers review, approve and escalate; Administrators manage events and users. ({users.length} users)
        </p>
      </section>
    </div>
  );
}
