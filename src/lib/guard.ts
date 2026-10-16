import { redirect } from "next/navigation";
import { getSession, type Session } from "./auth";
import { getUserById } from "./repo";
import { roleAtLeast, type Role } from "./types";

// Use in server components / actions. Redirects to /login if no valid session,
// and re-checks the user still exists and is active.
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  const u = getUserById(s.userId);
  if (!u || !u.active) redirect("/login");
  // keep role fresh from DB
  return { ...s, role: u.role, name: u.name, email: u.email };
}

export async function requireRole(min: Role): Promise<Session> {
  const s = await requireSession();
  if (!roleAtLeast(s.role, min)) redirect("/dashboard?forbidden=1");
  return s;
}
