import ExcelJS from "exceljs";
import type { CategoryDef, EntryView } from "./types";
import { STATUS_LABELS, type Status } from "./types";
import {
  tsetUrlCategory,
  tsetViolationCategory,
  tsetDate,
  tsetTime
} from "./framework";

const TSET_REPORT_REASON = "Community Guidelines violation (includes Impersonation)";

export const TSET_HEADERS = [
  "URL to be reported",
  "Category of URL",
  "Report reason",
  "Category of Community Guidelines violation",
  "Additional details",
  "Start date",
  "Start time",
  "End date",
  "End time"
];

export function tsetRows(entries: EntryView[], map: Record<string, string>): string[][] {
  return entries.map((e) => [
    "#" + e.contentUrl,
    tsetUrlCategory(e),
    TSET_REPORT_REASON,
    tsetViolationCategory(e.categories, map),
    e.reason || "",
    e.liveStream ? tsetDate(e.liveStart) : "",
    e.liveStream ? tsetTime(e.liveStart) : "",
    e.liveStream ? tsetDate(e.liveEnd) : "",
    e.liveStream ? tsetTime(e.liveEnd) : ""
  ]);
}

// Is this entry eligible for a TSET takedown export?
export function isTsetEligible(e: EntryView, includeAll: boolean): boolean {
  const isTikTok = (e.platform || "").toLowerCase().includes("tiktok");
  if (!isTikTok) return false;
  if (includeAll) return true;
  const approved: Status[] = ["APPROVED", "ESCALATED", "ACTIONED", "CLOSED"];
  return approved.includes(e.status) && e.qualifies === true;
}

const catLabels = (keys: string[], defs: CategoryDef[]) =>
  keys.map((k) => defs.find((c) => c.key === k)?.label || k).join("; ");

export const FULL_HEADERS = [
  "Reviewer",
  "Platform",
  "Content URL",
  "Content type",
  "Category",
  "Tier",
  "Reason",
  "Narrative",
  "Status",
  "Qualifies",
  "Reported in-platform",
  "Escalation channels",
  "Report feedback",
  "Tier2 alert sent",
  "SAPS considered",
  "Real411 submitted",
  "Real411 reference",
  "Real411 ruling",
  "Real411 outcome",
  "Real411 link",
  "Views",
  "Likes",
  "Shares",
  "Comments",
  "Metrics note",
  "Language",
  "MT",
  "Live stream",
  "Original post date",
  "Logged at",
  "Reviewed by",
  "Reviewed at",
  "Review notes"
];

export function fullRows(entries: EntryView[], defs: CategoryDef[]): (string | number)[][] {
  return entries.map((e) => [
    e.createdByName,
    e.platform,
    e.contentUrl,
    e.contentType,
    catLabels(e.categories, defs),
    e.tier,
    e.reason,
    e.narrative || "",
    STATUS_LABELS[e.status] || e.status,
    e.qualifies === null ? "Unreviewed" : e.qualifies ? "Qualifies" : "Research only",
    e.reportedInPlatform ? "Yes" : "No",
    e.reportChannels.join("; "),
    e.reportFeedback || "",
    e.escalatedTier2 ? "Yes" : "No",
    e.sapsConsidered ? "Yes" : "No",
    e.real411Submitted ? "Yes" : "No",
    e.real411Reference || "",
    e.real411Ruling || "",
    e.real411Outcome || "",
    e.real411Link || "",
    e.metricsViews ?? "",
    e.metricsLikes ?? "",
    e.metricsShares ?? "",
    e.metricsComments ?? "",
    e.metricsRaw || "",
    e.language || "",
    e.machineTranslation ? "MT" : "",
    e.liveStream ? "Yes" : "No",
    e.originalPostDate || "",
    e.createdAt,
    e.reviewedByName || "",
    e.reviewedAt || "",
    e.reviewNotes || ""
  ]);
}

export const REAL411_HEADERS = [
  "Source",
  "Submitted",
  "Ruling",
  "Outcome",
  "Reference",
  "URL",
  "Finder",
  "Additional notes",
  "Real411 link"
];

export function real411Rows(entries: EntryView[]): string[][] {
  return entries.map((e) => [
    e.platform,
    e.reviewedAt || e.createdAt,
    e.real411Ruling || "",
    e.real411Outcome || catLabels(e.categories, []) || "",
    e.real411Reference || "",
    e.contentUrl,
    e.createdByName,
    e.reason || "",
    e.real411Link || ""
  ]);
}

// ---- writers ----------------------------------------------------------------

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(",")];
  for (const r of rows) lines.push(r.map(esc).join(","));
  return "﻿" + lines.join("\r\n"); // BOM for Excel
}

export async function toXlsx(
  sheetName: string,
  headers: string[],
  rows: (string | number)[][]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "CABC HRE Monitor";
  const ws = wb.addWorksheet(sheetName);
  ws.addRow(headers);
  ws.getRow(1).font = { bold: true };
  for (const r of rows) ws.addRow(r);
  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    col.width = Math.min(60, max + 2);
  });
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
