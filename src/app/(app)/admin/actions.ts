"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guard";
import { hashPassword } from "@/lib/auth";
import {
  createUser,
  getUserByEmail,
  updateUser,
  getUserById,
  createEvent,
  updateEvent,
  getEvent,
  listEvents
} from "@/lib/repo";
import {
  ELECTION_CATEGORIES,
  ELECTION_CODED_LANGUAGE,
  ELECTION_REPORTING_ROUTES,
  ELECTION_TSET_MAP,
  DEFAULT_PLATFORMS,
  DEFAULT_CONTENT_TYPES
} from "@/lib/framework";
import type { Role } from "@/lib/types";
import { ROLES } from "@/lib/types";

export interface AdminState {
  error?: string;
  ok?: string;
}

const str = (v: FormDataEntryValue | null) => (v === null ? "" : String(v).trim());

// ---- users ----
export async function createUserAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  await requireRole("ADMIN");
  const email = str(fd.get("email")).toLowerCase();
  const name = str(fd.get("name"));
  const role = str(fd.get("role")) as Role;
  const password = str(fd.get("password"));
  if (!email || !name || !password) return { error: "Name, email and password are required." };
  if (!ROLES.includes(role)) return { error: "Invalid role." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (await getUserByEmail(email)) return { error: "A user with that email already exists." };
  await createUser({ email, name, role, passwordHash: await hashPassword(password) });
  revalidatePath("/admin");
  return { ok: `User ${email} created.` };
}

export async function updateUserAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  await requireRole("ADMIN");
  const id = str(fd.get("id"));
  const u = await getUserById(id);
  if (!u) return { error: "User not found." };
  const role = str(fd.get("role")) as Role;
  const active = str(fd.get("active")) === "1";
  const newPw = str(fd.get("password"));
  const patch: any = { role: ROLES.includes(role) ? role : u.role, active };
  if (newPw) {
    if (newPw.length < 8) return { error: "Password must be at least 8 characters." };
    patch.passwordHash = await hashPassword(newPw);
  }
  await updateUser(id, patch);
  revalidatePath("/admin");
  return { ok: "User updated." };
}

// ---- events ----
export async function createEventAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  await requireRole("ADMIN");
  const name = str(fd.get("name"));
  const slug = str(fd.get("slug")).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const cloneFrom = str(fd.get("cloneFrom"));
  if (!name || !slug) return { error: "Name and slug are required." };
  if ((await listEvents()).some((e) => e.slug === slug)) return { error: "That slug is already in use." };

  let cfg = {
    categories: ELECTION_CATEGORIES,
    platforms: DEFAULT_PLATFORMS,
    contentTypes: DEFAULT_CONTENT_TYPES,
    codedLanguage: ELECTION_CODED_LANGUAGE,
    reportingRoutes: ELECTION_REPORTING_ROUTES,
    tsetCategoryMap: ELECTION_TSET_MAP
  };
  if (cloneFrom) {
    const src = await getEvent(cloneFrom);
    if (src)
      cfg = {
        categories: src.categories,
        platforms: src.platforms,
        contentTypes: src.contentTypes,
        codedLanguage: src.codedLanguage,
        reportingRoutes: src.reportingRoutes,
        tsetCategoryMap: src.tsetCategoryMap
      };
  }

  const ev = await createEvent({
    name,
    slug,
    description: str(fd.get("description")) || null,
    active: false,
    startDate: str(fd.get("startDate")) || null,
    endDate: str(fd.get("endDate")) || null,
    ...cfg
  });
  revalidatePath("/admin");
  redirect(`/admin/events/${ev.id}`);
}

export async function setActiveEventAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  await requireRole("ADMIN");
  const id = str(fd.get("id"));
  const target = await getEvent(id);
  if (!target) return { error: "Event not found." };
  for (const e of await listEvents()) {
    if (e.active && e.id !== id) await updateEvent(e.id, { active: false });
  }
  await updateEvent(id, { active: true });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: `${target.name} is now the active event.` };
}

function parseJson<T>(raw: string, label: string): { value?: T; error?: string } {
  try {
    return { value: JSON.parse(raw) as T };
  } catch {
    return { error: `${label} is not valid JSON.` };
  }
}

export async function updateEventAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  await requireRole("ADMIN");
  const id = str(fd.get("id"));
  const ev = await getEvent(id);
  if (!ev) return { error: "Event not found." };

  const cats = parseJson(str(fd.get("categories")), "Categories");
  if (cats.error) return { error: cats.error };
  const coded = parseJson(str(fd.get("codedLanguage")), "Coded language");
  if (coded.error) return { error: coded.error };
  const routes = parseJson(str(fd.get("reportingRoutes")), "Reporting routes");
  if (routes.error) return { error: routes.error };
  const tset = parseJson(str(fd.get("tsetCategoryMap")), "TSET map");
  if (tset.error) return { error: tset.error };

  await updateEvent(id, {
    name: str(fd.get("name")) || ev.name,
    description: str(fd.get("description")) || null,
    startDate: str(fd.get("startDate")) || null,
    endDate: str(fd.get("endDate")) || null,
    platforms: str(fd.get("platforms")).split(",").map((s) => s.trim()).filter(Boolean),
    contentTypes: str(fd.get("contentTypes")).split(",").map((s) => s.trim()).filter(Boolean),
    categories: cats.value as any,
    codedLanguage: coded.value as any,
    reportingRoutes: routes.value as any,
    tsetCategoryMap: tset.value as any
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/events/${id}`);
  return { ok: "Event saved." };
}
