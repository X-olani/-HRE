import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import type { Role } from "./types";

const COOKIE = "hre_session";
const MAX_AGE = 60 * 60 * 12; // 12 hours

export interface Session {
  userId: string;
  role: Role;
  name: string;
  email: string;
}

function secretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short. Set it in .env (openssl rand -base64 48).");
  }
  return new TextEncoder().encode(s);
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 11);
}
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ role: s.role, name: s.name, email: s.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
}

export async function readSessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      userId: String(payload.sub),
      role: payload.role as Role,
      name: String(payload.name),
      email: String(payload.email)
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE);
}

// API tokens for the capture extension: store a sha256 hash, show the raw token
// once to the user. Fast to look up (no per-row bcrypt needed).
export function generateApiToken(): { raw: string; hash: string } {
  const raw = "hre_" + crypto.randomBytes(24).toString("hex");
  return { raw, hash: hashApiToken(raw) };
}
export function hashApiToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

