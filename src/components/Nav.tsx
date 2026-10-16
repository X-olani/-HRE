"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions";
import type { Role } from "@/lib/types";
import { ROLE_LABELS, roleAtLeast } from "@/lib/types";

export default function Nav({
  name,
  role,
  eventName
}: {
  name: string;
  role: Role;
  eventName: string;
}) {
  const path = usePathname();
  const is = (p: string) => path === p || path.startsWith(p + "/");

  const links: { href: string; label: string; show: boolean }[] = [
    { href: "/dashboard", label: "Dashboard", show: true },
    { href: "/entries", label: "Entries", show: true },
    { href: "/review", label: "Review", show: roleAtLeast(role, "SENIOR") },
    { href: "/exports", label: "Exports", show: true },
    { href: "/admin", label: "Admin", show: roleAtLeast(role, "ADMIN") }
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex items-center gap-0.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-blue" />
            <span className="h-2.5 w-2.5 rounded-full bg-brand-yellow" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink" />
          </span>
          <span className="font-bold text-ink">HRE Monitor</span>
        </Link>

        <span className="hidden sm:inline rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-xs font-medium text-brand-bluedeep">
          {eventName}
        </span>

        <nav className="flex items-center gap-1">
          {links
            .filter((l) => l.show)
            .map((l) => (
              <Link key={l.href} href={l.href} className={`navlink ${is(l.href) ? "navlink-active" : ""}`}>
                {l.label}
              </Link>
            ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link href="/entries/new" className="btn-primary">
            + New entry
          </Link>
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium text-ink leading-tight">{name}</div>
            <div className="text-xs text-body/60 leading-tight">{ROLE_LABELS[role]}</div>
          </div>
          <Link href="/settings" className="navlink" title="Settings">⚙</Link>
          <form action={logoutAction}>
            <button className="btn-ghost" type="submit">Sign out</button>
          </form>
        </div>
      </div>
    </header>
  );
}
