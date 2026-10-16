import Nav from "@/components/Nav";
import { requireSession } from "@/lib/guard";
import { getActiveEvent } from "@/lib/repo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const ev = getActiveEvent();
  return (
    <div className="min-h-screen">
      <Nav name={session.name} role={session.role} eventName={ev?.name || "No active event"} />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
