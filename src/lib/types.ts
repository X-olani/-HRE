// Shared domain types and constants.

export type Role = "REVIEWER" | "SENIOR" | "ADMIN";
export const ROLES: Role[] = ["REVIEWER", "SENIOR", "ADMIN"];

// Pure, client-safe role comparison (no server deps).
export function roleAtLeast(role: Role, min: Role): boolean {
  return ROLES.indexOf(role) >= ROLES.indexOf(min);
}

export const ROLE_LABELS: Record<Role, string> = {
  REVIEWER: "Reviewer",
  SENIOR: "Senior reviewer",
  ADMIN: "Administrator"
};

// Entry lifecycle
export type Status =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "ESCALATED"
  | "ACTIONED"
  | "CLOSED"
  | "DISMISSED";

export const STATUSES: Status[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "ESCALATED",
  "ACTIONED",
  "CLOSED",
  "DISMISSED"
];

export const STATUS_LABELS: Record<Status, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  ESCALATED: "Escalated (Tier 2)",
  ACTIONED: "Actioned",
  CLOSED: "Closed",
  DISMISSED: "Dismissed"
};

// Allowed forward transitions and which roles may perform them.
export const TRANSITIONS: Record<Status, { to: Status; roles: Role[]; label: string }[]> = {
  DRAFT: [{ to: "SUBMITTED", roles: ["REVIEWER", "SENIOR", "ADMIN"], label: "Submit for review" }],
  SUBMITTED: [
    { to: "UNDER_REVIEW", roles: ["SENIOR", "ADMIN"], label: "Take for review" },
    { to: "DRAFT", roles: ["REVIEWER", "SENIOR", "ADMIN"], label: "Return to draft" }
  ],
  UNDER_REVIEW: [
    { to: "APPROVED", roles: ["SENIOR", "ADMIN"], label: "Approve" },
    { to: "DISMISSED", roles: ["SENIOR", "ADMIN"], label: "Dismiss" }
  ],
  APPROVED: [
    { to: "ESCALATED", roles: ["SENIOR", "ADMIN"], label: "Escalate (Tier 2)" },
    { to: "ACTIONED", roles: ["SENIOR", "ADMIN", "REVIEWER"], label: "Mark actioned" }
  ],
  ESCALATED: [{ to: "ACTIONED", roles: ["SENIOR", "ADMIN"], label: "Mark actioned" }],
  ACTIONED: [{ to: "CLOSED", roles: ["SENIOR", "ADMIN"], label: "Close" }],
  CLOSED: [],
  DISMISSED: [{ to: "UNDER_REVIEW", roles: ["SENIOR", "ADMIN"], label: "Reopen" }]
};

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  active: boolean;
  apiTokenHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDef {
  key: string;
  label: string;
  color: string;
  definition: string;
}

export interface CodedGroup {
  group: string;
  terms: string[];
}

export interface ReportingRoute {
  platform: string;
  route: string;
}

export interface EventConfig {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  startDate: string | null;
  endDate: string | null;
  categories: CategoryDef[];
  platforms: string[];
  contentTypes: string[];
  codedLanguage: CodedGroup[];
  reportingRoutes: ReportingRoute[];
  tsetCategoryMap: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Entry {
  id: string;
  eventId: string;
  createdById: string;
  platform: string;
  contentUrl: string;
  contentType: string;
  categories: string[];
  tier: number;
  reason: string;
  narrative: string | null;
  language: string | null;
  machineTranslation: boolean;
  liveStream: boolean;
  originalPostDate: string | null;
  metricsViews: number | null;
  metricsLikes: number | null;
  metricsShares: number | null;
  metricsComments: number | null;
  metricsRaw: string | null;
  status: Status;
  qualifies: boolean | null;
  reportedInPlatform: boolean;
  reportChannels: string[];
  reportFeedback: string | null;
  escalatedTier2: boolean;
  sapsConsidered: boolean;
  sapsNotes: string | null;
  real411Submitted: boolean;
  real411Reference: string | null;
  real411Ruling: string | null;
  real411Outcome: string | null;
  real411Link: string | null;
  liveStart: string | null;
  liveEnd: string | null;
  reviewedById: string | null;
  reviewDecision: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Entry joined with display helpers
export interface EntryView extends Entry {
  createdByName: string;
  reviewedByName: string | null;
  eventName: string;
  attachmentCount: number;
}

export interface Attachment {
  id: string;
  entryId: string;
  filename: string;
  mimeType: string;
  size: number;
  kind: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  entryId: string | null;
  userId: string | null;
  userName: string | null;
  action: string;
  detail: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: string;
}

// TikTok TSET bulk-upload "Category of URL" values (from the template dropdown)
export const TSET_URL_CATEGORIES = [
  "Video",
  "LIVE",
  "Photo",
  "User",
  "Comment",
  "Audio",
  "Hashtag",
  "E-Commerce Product",
  "E-Commerce Shop"
] as const;
