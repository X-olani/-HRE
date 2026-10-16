"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/guard";
import { roleAtLeast } from "@/lib/types";
import {
  getActiveEvent,
  getEntry,
  createEntry,
  updateEntry,
  addAttachment,
  addAudit
} from "@/lib/repo";
import { TRANSITIONS, type Status } from "@/lib/types";

export interface FormState {
  error?: string;
}

function intOrNull(v: FormDataEntryValue | null): number | null {
  if (v === null) return null;
  const s = String(v).replace(/[, ]/g, "").trim();
  if (s === "") return null;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}
const on = (v: FormDataEntryValue | null) => v === "on" || v === "true" || v === "1";
const str = (v: FormDataEntryValue | null) => (v === null ? "" : String(v).trim());
const strOrNull = (v: FormDataEntryValue | null) => {
  const s = str(v);
  return s === "" ? null : s;
};

function parseEntry(fd: FormData) {
  return {
    platform: str(fd.get("platform")),
    contentUrl: str(fd.get("contentUrl")),
    contentType: str(fd.get("contentType")),
    categories: fd.getAll("categories").map(String),
    tier: intOrNull(fd.get("tier")) ?? 1,
    reason: str(fd.get("reason")),
    narrative: strOrNull(fd.get("narrative")),
    language: strOrNull(fd.get("language")),
    machineTranslation: on(fd.get("machineTranslation")),
    liveStream: on(fd.get("liveStream")),
    originalPostDate: strOrNull(fd.get("originalPostDate")),
    metricsViews: intOrNull(fd.get("metricsViews")),
    metricsLikes: intOrNull(fd.get("metricsLikes")),
    metricsShares: intOrNull(fd.get("metricsShares")),
    metricsComments: intOrNull(fd.get("metricsComments")),
    metricsRaw: strOrNull(fd.get("metricsRaw")),
    reportedInPlatform: on(fd.get("reportedInPlatform")),
    reportChannels: fd.getAll("reportChannels").map(String),
    reportFeedback: strOrNull(fd.get("reportFeedback")),
    liveStart: strOrNull(fd.get("liveStart")),
    liveEnd: strOrNull(fd.get("liveEnd"))
  };
}

async function saveAttachments(entryId: string, fd: FormData) {
  const files = fd.getAll("screenshots").filter((f): f is File => f instanceof File && f.size > 0);
  for (const f of files) {
    if (f.size > 8 * 1024 * 1024) continue; // 8MB cap per file
    const buf = Buffer.from(await f.arrayBuffer());
    addAttachment({
      entryId,
      filename: f.name || "screenshot.png",
      mimeType: f.type || "image/png",
      kind: "UPLOAD",
      data: buf
    });
  }
}

// Screenshot taken server-side when the link was added in the form (see /api/link-capture).
async function saveAutoCapture(entryId: string, userId: string, fd: FormData) {
  const f = fd.get("autoCapture");
  if (!(f instanceof File) || f.size === 0 || f.size > 8 * 1024 * 1024) return;
  let meta: { source?: string; capturedAt?: string; filled?: string[] } = {};
  try {
    meta = JSON.parse(str(fd.get("autoCaptureMeta")) || "{}");
  } catch {}
  addAttachment({
    entryId,
    filename: f.name || "auto-capture.png",
    mimeType: "image/png",
    kind: "SCREENSHOT",
    data: Buffer.from(await f.arrayBuffer())
  });
  const parts = [`Screenshot auto-captured from link${meta.capturedAt ? ` at ${meta.capturedAt}` : ""}`];
  if (meta.source) parts.push(`source: ${meta.source}`);
  if (meta.filled?.length) parts.push(`auto-filled: ${meta.filled.join(", ")}`);
  addAudit({ entryId, userId, action: "CAPTURE", detail: parts.join("; ").slice(0, 500) });
}

export async function saveEntryAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await requireSession();
  const id = str(fd.get("id"));
  const intent = str(fd.get("intent")); // "draft" | "submit"
  const data = parseEntry(fd);

  if (!data.contentUrl) return { error: "A content URL is required." };
  if (intent === "submit") {
    if (!data.platform) return { error: "Select a platform before submitting." };
    if (!data.contentType) return { error: "Select a content type before submitting." };
    if (data.categories.length === 0) return { error: "Select at least one category before submitting." };
    if (!data.reason) return { error: "A short reason is required before submitting." };
  }

  let entryId = id;

  if (id) {
    const existing = getEntry(id);
    if (!existing) return { error: "Entry not found." };
    const canEdit =
      existing.createdById === session.userId || roleAtLeast(session.role, "SENIOR");
    if (!canEdit) return { error: "You can’t edit this entry." };
    updateEntry(id, {
      ...data,
      status: intent === "submit" ? "SUBMITTED" : existing.status
    });
    addAudit({
      entryId: id,
      userId: session.userId,
      action: intent === "submit" ? "SUBMIT" : "EDIT",
      detail: intent === "submit" ? "Edited and submitted for review" : "Edited",
      fromStatus: existing.status,
      toStatus: intent === "submit" ? "SUBMITTED" : existing.status
    });
  } else {
    const ev = getActiveEvent();
    if (!ev) return { error: "No active event to log against." };
    const created = createEntry({
      eventId: ev.id,
      createdById: session.userId,
      ...data,
      status: intent === "submit" ? "SUBMITTED" : "DRAFT"
    });
    entryId = created.id;
    addAudit({
      entryId,
      userId: session.userId,
      action: "CREATE",
      detail: intent === "submit" ? "Created and submitted for review" : "Created as draft",
      toStatus: created.status
    });
  }

  await saveAttachments(entryId, fd);
  await saveAutoCapture(entryId, session.userId, fd);
  revalidatePath("/entries");
  redirect(`/entries/${entryId}`);
}

// Status transition (uses the allowed-transition table + role gate).
export async function changeStatusAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await requireSession();
  const id = str(fd.get("id"));
  const to = str(fd.get("to")) as Status;
  const note = strOrNull(fd.get("note"));
  const entry = getEntry(id);
  if (!entry) return { error: "Entry not found." };

  const allowed = (TRANSITIONS[entry.status] || []).find((t) => t.to === to);
  if (!allowed) return { error: `Can’t move from ${entry.status} to ${to}.` };
  if (!allowed.roles.includes(session.role)) {
    return { error: "You don’t have permission for that action." };
  }

  const patch: Record<string, any> = { status: to };

  // Review sign-off captured on the approve/dismiss step.
  if (to === "APPROVED" || to === "DISMISSED") {
    patch.reviewedById = session.userId;
    patch.reviewedAt = new Date().toISOString();
    patch.reviewDecision = to === "APPROVED" ? "Approved" : "Dismissed";
    if (note) patch.reviewNotes = note;
    patch.qualifies = to === "APPROVED";
  }
  if (to === "ESCALATED") patch.escalatedTier2 = true;

  updateEntry(id, patch);
  addAudit({
    entryId: id,
    userId: session.userId,
    action: "STATUS",
    detail: note || allowed.label,
    fromStatus: entry.status,
    toStatus: to
  });
  revalidatePath(`/entries/${id}`);
  revalidatePath("/review");
  return {};
}

// Reviewer/senior sets qualifies + review notes without a status change.
export async function reviewMetaAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!roleAtLeast(session.role, "SENIOR")) return { error: "Senior reviewers only." };
  const id = str(fd.get("id"));
  const entry = getEntry(id);
  if (!entry) return { error: "Entry not found." };
  const qualifiesRaw = str(fd.get("qualifies"));
  const patch: Record<string, any> = {
    reviewNotes: strOrNull(fd.get("reviewNotes")),
    tier: intOrNull(fd.get("tier")) ?? entry.tier,
    categories: fd.getAll("categories").map(String)
  };
  if (qualifiesRaw === "yes") patch.qualifies = true;
  else if (qualifiesRaw === "no") patch.qualifies = false;
  updateEntry(id, patch);
  addAudit({
    entryId: id,
    userId: session.userId,
    action: "REVIEW",
    detail: `Review updated (qualifies=${qualifiesRaw || "unchanged"})`
  });
  revalidatePath(`/entries/${id}`);
  return {};
}

// Reporting / Real411 tracking update.
export async function trackingAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await requireSession();
  const id = str(fd.get("id"));
  const entry = getEntry(id);
  if (!entry) return { error: "Entry not found." };
  updateEntry(id, {
    reportedInPlatform: on(fd.get("reportedInPlatform")),
    reportChannels: fd.getAll("reportChannels").map(String),
    reportFeedback: strOrNull(fd.get("reportFeedback")),
    escalatedTier2: on(fd.get("escalatedTier2")),
    sapsConsidered: on(fd.get("sapsConsidered")),
    sapsNotes: strOrNull(fd.get("sapsNotes")),
    real411Submitted: on(fd.get("real411Submitted")),
    real411Reference: strOrNull(fd.get("real411Reference")),
    real411Ruling: strOrNull(fd.get("real411Ruling")),
    real411Outcome: strOrNull(fd.get("real411Outcome")),
    real411Link: strOrNull(fd.get("real411Link"))
  });
  addAudit({ entryId: id, userId: session.userId, action: "TRACKING", detail: "Reporting/Real411 updated" });
  revalidatePath(`/entries/${id}`);
  return {};
}

export async function uploadScreenshotAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await requireSession();
  const id = str(fd.get("id"));
  const entry = getEntry(id);
  if (!entry) return { error: "Entry not found." };
  await saveAttachments(id, fd);
  addAudit({ entryId: id, userId: session.userId, action: "ATTACH", detail: "Screenshot added" });
  revalidatePath(`/entries/${id}`);
  return {};
}
