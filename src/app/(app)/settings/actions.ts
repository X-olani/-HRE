"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/guard";
import { generateApiToken, hashPassword, verifyPassword } from "@/lib/auth";
import { getUserById, setApiTokenHash, updateUser } from "@/lib/repo";

export interface SettingsState {
  error?: string;
  ok?: string;
  token?: string;
}

const str = (v: FormDataEntryValue | null) => (v === null ? "" : String(v).trim());

export async function generateTokenAction(): Promise<SettingsState> {
  const s = await requireSession();
  const { raw, hash } = generateApiToken();
  setApiTokenHash(s.userId, hash);
  revalidatePath("/settings");
  return { ok: "New capture token generated. Copy it now — it won’t be shown again.", token: raw };
}

export async function revokeTokenAction(): Promise<SettingsState> {
  const s = await requireSession();
  setApiTokenHash(s.userId, null);
  revalidatePath("/settings");
  return { ok: "Capture token revoked." };
}

export async function changePasswordAction(_prev: SettingsState, fd: FormData): Promise<SettingsState> {
  const s = await requireSession();
  const u = getUserById(s.userId);
  if (!u) return { error: "User not found." };
  const current = str(fd.get("current"));
  const next = str(fd.get("next"));
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (!(await verifyPassword(current, u.passwordHash))) return { error: "Current password is incorrect." };
  updateUser(s.userId, { passwordHash: await hashPassword(next) });
  return { ok: "Password updated." };
}
