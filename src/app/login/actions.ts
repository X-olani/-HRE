"use server";

import { redirect } from "next/navigation";
import { getUserByEmail } from "@/lib/repo";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");

  if (!email || !password) return { error: "Enter your email and password." };

  const user = getUserByEmail(email);
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  const token = await signSession({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email
  });
  setSessionCookie(token);
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}
