import { newId, nowIso, query } from "./db";
import type {
  AuditEntry,
  Attachment,
  EventConfig,
  Entry,
  EntryView,
  Role,
  Status,
  User
} from "./types";

const b = (v: any) => !!v;
const toBool = (v: any) => !!v;
const J = (v: any) => JSON.stringify(v ?? []);
const numberOrNull = (v: any): number | null => (v === null || v === undefined ? null : Number(v));
const parse = <T>(v: any, fb: T): T => {
  try {
    return v ? (JSON.parse(v) as T) : fb;
  } catch {
    return fb;
  }
};

// ---- mappers ----------------------------------------------------------------

function toUser(r: any): User {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    passwordHash: r.password_hash,
    role: r.role as Role,
    active: toBool(r.active),
    apiTokenHash: r.api_token_hash ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

function toEvent(r: any): EventConfig {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description ?? null,
    active: toBool(r.active),
    startDate: r.start_date ?? null,
    endDate: r.end_date ?? null,
    categories: parse(r.categories, []),
    platforms: parse(r.platforms, []),
    contentTypes: parse(r.content_types, []),
    codedLanguage: parse(r.coded_language, []),
    reportingRoutes: parse(r.reporting_routes, []),
    tsetCategoryMap: parse(r.tset_category_map, {}),
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

function toEntry(r: any): Entry {
  return {
    id: r.id,
    eventId: r.event_id,
    createdById: r.created_by_id,
    platform: r.platform,
    contentUrl: r.content_url,
    contentType: r.content_type,
    categories: parse(r.categories, []),
    tier: r.tier,
    reason: r.reason ?? "",
    narrative: r.narrative ?? null,
    language: r.language ?? null,
    machineTranslation: toBool(r.machine_translation),
    liveStream: toBool(r.live_stream),
    originalPostDate: r.original_post_date ?? null,
    metricsViews: numberOrNull(r.metrics_views),
    metricsLikes: numberOrNull(r.metrics_likes),
    metricsShares: numberOrNull(r.metrics_shares),
    metricsComments: numberOrNull(r.metrics_comments),
    metricsRaw: r.metrics_raw ?? null,
    status: r.status as Status,
    qualifies: r.qualifies === null || r.qualifies === undefined ? null : toBool(r.qualifies),
    reportedInPlatform: toBool(r.reported_in_platform),
    reportChannels: parse(r.report_channels, []),
    reportFeedback: r.report_feedback ?? null,
    escalatedTier2: toBool(r.escalated_tier2),
    sapsConsidered: toBool(r.saps_considered),
    sapsNotes: r.saps_notes ?? null,
    real411Submitted: toBool(r.real411_submitted),
    real411Reference: r.real411_reference ?? null,
    real411Ruling: r.real411_ruling ?? null,
    real411Outcome: r.real411_outcome ?? null,
    real411Link: r.real411_link ?? null,
    liveStart: r.live_start ?? null,
    liveEnd: r.live_end ?? null,
    reviewedById: r.reviewed_by_id ?? null,
    reviewDecision: r.review_decision ?? null,
    reviewNotes: r.review_notes ?? null,
    reviewedAt: r.reviewed_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

function toEntryView(r: any): EntryView {
  return {
    ...toEntry(r),
    createdByName: r.created_by_name ?? "",
    reviewedByName: r.reviewed_by_name ?? null,
    eventName: r.event_name ?? "",
    attachmentCount: Number(r.attachment_count ?? 0)
  };
}

// ---- users ------------------------------------------------------------------

export async function getUserByEmail(email: string): Promise<User | null> {
  const [r] = await query("SELECT * FROM users WHERE email = ?", email.toLowerCase());
  return r ? toUser(r) : null;
}
export async function getUserById(id: string): Promise<User | null> {
  const [r] = await query("SELECT * FROM users WHERE id = ?", id);
  return r ? toUser(r) : null;
}
export async function getUserByApiTokenHash(hash: string): Promise<User | null> {
  const [r] = await query("SELECT * FROM users WHERE api_token_hash = ? AND active = TRUE", hash);
  return r ? toUser(r) : null;
}
export async function listUsers(): Promise<User[]> {
  return (await query("SELECT * FROM users ORDER BY name")).map(toUser);
}
export async function createUser(input: {
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
}): Promise<User> {
  const id = newId();
  const ts = nowIso();
  await query(
    `INSERT INTO users (id,email,name,password_hash,role,active,created_at,updated_at)
     VALUES (?,?,?,?,?,TRUE,?,?)`,
    id, input.email.toLowerCase(), input.name, input.passwordHash, input.role, ts, ts
  );
  return (await getUserById(id))!;
}
export async function updateUser(
  id: string,
  patch: Partial<{ name: string; role: Role; active: boolean; passwordHash: string }>
) : Promise<void> {
  const cur = await getUserById(id);
  if (!cur) return;
  await query(
      `UPDATE users SET name=?, role=?, active=?, password_hash=?, updated_at=? WHERE id=?`,
      patch.name ?? cur.name,
      patch.role ?? cur.role,
      patch.active === undefined ? cur.active : patch.active,
      patch.passwordHash ?? cur.passwordHash,
      nowIso(),
      id
    );
}
export async function setApiTokenHash(id: string, hash: string | null): Promise<void> {
  await query("UPDATE users SET api_token_hash=?, updated_at=? WHERE id=?", hash, nowIso(), id);
}

// ---- events -----------------------------------------------------------------

export async function listEvents(): Promise<EventConfig[]> {
  return (await query("SELECT * FROM events ORDER BY active DESC, created_at DESC")).map(toEvent);
}
export async function getEvent(id: string): Promise<EventConfig | null> {
  const [r] = await query("SELECT * FROM events WHERE id = ?", id);
  return r ? toEvent(r) : null;
}
export async function getActiveEvent(): Promise<EventConfig | null> {
  const [r] = await query("SELECT * FROM events WHERE active = TRUE ORDER BY created_at DESC LIMIT 1");
  return r ? toEvent(r) : null;
}
export async function createEvent(
  e: Omit<EventConfig, "id" | "createdAt" | "updatedAt">
): Promise<EventConfig> {
  const id = newId();
  const ts = nowIso();
  await query(
      `INSERT INTO events
       (id,name,slug,description,active,start_date,end_date,categories,platforms,content_types,coded_language,reporting_routes,tset_category_map,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id,
      e.name,
      e.slug,
      e.description ?? null,
      e.active,
      e.startDate ?? null,
      e.endDate ?? null,
      J(e.categories),
      J(e.platforms),
      J(e.contentTypes),
      J(e.codedLanguage),
      J(e.reportingRoutes),
      JSON.stringify(e.tsetCategoryMap ?? {}),
      ts,
      ts
    );
  return (await getEvent(id))!;
}
export async function updateEvent(id: string, e: Partial<EventConfig>): Promise<void> {
  const cur = await getEvent(id);
  if (!cur) return;
  const m = { ...cur, ...e };
  await query(
      `UPDATE events SET name=?,slug=?,description=?,active=?,start_date=?,end_date=?,
        categories=?,platforms=?,content_types=?,coded_language=?,reporting_routes=?,tset_category_map=?,updated_at=?
       WHERE id=?`,
      m.name,
      m.slug,
      m.description ?? null,
      m.active,
      m.startDate ?? null,
      m.endDate ?? null,
      J(m.categories),
      J(m.platforms),
      J(m.contentTypes),
      J(m.codedLanguage),
      J(m.reportingRoutes),
      JSON.stringify(m.tsetCategoryMap ?? {}),
      nowIso(),
      id
    );
}

// ---- entries ----------------------------------------------------------------

const ENTRY_VIEW_SELECT = `
  SELECT e.*, u.name AS created_by_name, r.name AS reviewed_by_name, ev.name AS event_name,
    (SELECT COUNT(*) FROM attachments a WHERE a.entry_id = e.id) AS attachment_count
  FROM entries e
  JOIN users u ON u.id = e.created_by_id
  LEFT JOIN users r ON r.id = e.reviewed_by_id
  JOIN events ev ON ev.id = e.event_id
`;

export async function getEntry(id: string): Promise<EntryView | null> {
  const [r] = await query(`${ENTRY_VIEW_SELECT} WHERE e.id = ?`, id);
  return r ? toEntryView(r) : null;
}

export interface EntryFilter {
  eventId?: string;
  status?: Status[];
  platform?: string;
  category?: string;
  createdById?: string;
  qualifies?: boolean;
  tier?: number;
  search?: string;
  sort?: "recent" | "reach";
  limit?: number;
}

export async function listEntries(f: EntryFilter = {}): Promise<EntryView[]> {
  const where: string[] = [];
  const args: any[] = [];
  if (f.eventId) {
    where.push("e.event_id = ?");
    args.push(f.eventId);
  }
  if (f.status && f.status.length) {
    where.push(`e.status IN (${f.status.map(() => "?").join(",")})`);
    args.push(...f.status);
  }
  if (f.platform) {
    where.push("e.platform = ?");
    args.push(f.platform);
  }
  if (f.createdById) {
    where.push("e.created_by_id = ?");
    args.push(f.createdById);
  }
  if (f.tier) {
    where.push("e.tier = ?");
    args.push(f.tier);
  }
  if (f.qualifies !== undefined) {
    where.push("e.qualifies = ?");
    args.push(f.qualifies);
  }
  if (f.category) {
    where.push("e.categories LIKE ?");
    args.push(`%"${f.category}"%`);
  }
  if (f.search) {
    where.push("(e.content_url LIKE ? OR e.reason LIKE ? OR e.narrative LIKE ?)");
    const s = `%${f.search}%`;
    args.push(s, s, s);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const order =
    f.sort === "reach"
      ? "ORDER BY (COALESCE(e.metrics_views,0)+COALESCE(e.metrics_likes,0)+COALESCE(e.metrics_shares,0)) DESC"
      : "ORDER BY e.created_at DESC";
  const limit = f.limit ? `LIMIT ${Math.max(1, Math.min(2000, f.limit))}` : "";
  return (await query(`${ENTRY_VIEW_SELECT} ${whereSql} ${order} ${limit}`, ...args)).map(toEntryView);
}

export async function createEntry(input: Partial<Entry> & { eventId: string; createdById: string }): Promise<Entry> {
  const id = newId();
  const ts = nowIso();
  await query(
      `INSERT INTO entries
      (id,event_id,created_by_id,platform,content_url,content_type,categories,tier,reason,narrative,
       language,machine_translation,live_stream,original_post_date,metrics_views,metrics_likes,metrics_shares,
       metrics_comments,metrics_raw,status,qualifies,reported_in_platform,report_channels,report_feedback,
       escalated_tier2,saps_considered,saps_notes,real411_submitted,real411_reference,real411_ruling,
       real411_outcome,real411_link,live_start,live_end,reviewed_by_id,review_decision,review_notes,reviewed_at,
       created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id,
      input.eventId,
      input.createdById,
      input.platform ?? "",
      input.contentUrl ?? "",
      input.contentType ?? "",
      J(input.categories ?? []),
      input.tier ?? 1,
      input.reason ?? "",
      input.narrative ?? null,
      input.language ?? null,
      b(input.machineTranslation),
      b(input.liveStream),
      input.originalPostDate ?? null,
      input.metricsViews ?? null,
      input.metricsLikes ?? null,
      input.metricsShares ?? null,
      input.metricsComments ?? null,
      input.metricsRaw ?? null,
      input.status ?? "DRAFT",
      input.qualifies === null || input.qualifies === undefined ? null :       input.qualifies,
      b(input.reportedInPlatform),
      J(input.reportChannels ?? []),
      input.reportFeedback ?? null,
      b(input.escalatedTier2),
      b(input.sapsConsidered),
      input.sapsNotes ?? null,
      b(input.real411Submitted),
      input.real411Reference ?? null,
      input.real411Ruling ?? null,
      input.real411Outcome ?? null,
      input.real411Link ?? null,
      input.liveStart ?? null,
      input.liveEnd ?? null,
      input.reviewedById ?? null,
      input.reviewDecision ?? null,
      input.reviewNotes ?? null,
      input.reviewedAt ?? null,
      ts,
      ts
    );
  const [entry] = await query("SELECT * FROM entries WHERE id=?", id);
  return toEntry(entry);
}

// Whitelisted dynamic update: camelCase field -> [column, serializer]
const ENTRY_FIELDS: Record<string, [string, (v: any) => any]> = {
  platform: ["platform", (v) => v],
  contentUrl: ["content_url", (v) => v],
  contentType: ["content_type", (v) => v],
  categories: ["categories", J],
  tier: ["tier", (v) => v],
  reason: ["reason", (v) => v ?? ""],
  narrative: ["narrative", (v) => v ?? null],
  language: ["language", (v) => v ?? null],
  machineTranslation: ["machine_translation", b],
  liveStream: ["live_stream", b],
  originalPostDate: ["original_post_date", (v) => v ?? null],
  metricsViews: ["metrics_views", (v) => (v ?? null)],
  metricsLikes: ["metrics_likes", (v) => (v ?? null)],
  metricsShares: ["metrics_shares", (v) => (v ?? null)],
  metricsComments: ["metrics_comments", (v) => (v ?? null)],
  metricsRaw: ["metrics_raw", (v) => v ?? null],
  status: ["status", (v) => v],
  qualifies: ["qualifies", (v) => (v === null || v === undefined ? null : b(v))],
  reportedInPlatform: ["reported_in_platform", b],
  reportChannels: ["report_channels", J],
  reportFeedback: ["report_feedback", (v) => v ?? null],
  escalatedTier2: ["escalated_tier2", b],
  sapsConsidered: ["saps_considered", b],
  sapsNotes: ["saps_notes", (v) => v ?? null],
  real411Submitted: ["real411_submitted", b],
  real411Reference: ["real411_reference", (v) => v ?? null],
  real411Ruling: ["real411_ruling", (v) => v ?? null],
  real411Outcome: ["real411_outcome", (v) => v ?? null],
  real411Link: ["real411_link", (v) => v ?? null],
  liveStart: ["live_start", (v) => v ?? null],
  liveEnd: ["live_end", (v) => v ?? null],
  reviewedById: ["reviewed_by_id", (v) => v ?? null],
  reviewDecision: ["review_decision", (v) => v ?? null],
  reviewNotes: ["review_notes", (v) => v ?? null],
  reviewedAt: ["reviewed_at", (v) => v ?? null]
};

export async function updateEntry(id: string, patch: Record<string, any>): Promise<void> {
  const sets: string[] = [];
  const args: any[] = [];
  for (const [k, v] of Object.entries(patch)) {
    const f = ENTRY_FIELDS[k];
    if (!f) continue;
    sets.push(`${f[0]} = ?`);
    args.push(f[1](v));
  }
  if (!sets.length) return;
  sets.push("updated_at = ?");
  args.push(nowIso());
  args.push(id);
  await query(`UPDATE entries SET ${sets.join(", ")} WHERE id = ?`, ...args);
}

// ---- attachments ------------------------------------------------------------

export async function addAttachment(input: {
  entryId: string;
  filename: string;
  mimeType: string;
  kind?: string;
  data: Buffer;
}): Promise<string> {
  const id = newId();
  await query(
      `INSERT INTO attachments (id,entry_id,filename,mime_type,size,kind,data,created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      id,
      input.entryId,
      input.filename,
      input.mimeType,
      input.data.length,
      input.kind ?? "SCREENSHOT",
      input.data,
      nowIso()
    );
  return id;
}
export async function listAttachments(entryId: string): Promise<Attachment[]> {
  return (await query(
      "SELECT id,entry_id,filename,mime_type,size,kind,created_at FROM attachments WHERE entry_id=? ORDER BY created_at"
    , entryId)).map((r: any) => ({
      id: r.id,
      entryId: r.entry_id,
      filename: r.filename,
      mimeType: r.mime_type,
      size: r.size,
      kind: r.kind,
      createdAt: r.created_at
    }));
}
export async function getAttachmentData(id: string): Promise<{ mimeType: string; data: Buffer } | null> {
  const [r] = await query<{ mime_type: string; data: Buffer | Uint8Array | string }>("SELECT mime_type, data FROM attachments WHERE id=?", id);
  if (!r) return null;
  const data = typeof r.data === "string" && r.data.startsWith("\\x")
    ? Buffer.from(r.data.slice(2), "hex")
    : Buffer.from(r.data);
  return { mimeType: r.mime_type, data };
}

// ---- audit ------------------------------------------------------------------

export async function addAudit(input: {
  entryId?: string | null;
  userId?: string | null;
  action: string;
  detail?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
}): Promise<void> {
  await query(
      `INSERT INTO audit_logs (id,entry_id,user_id,action,detail,from_status,to_status,created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      newId(),
      input.entryId ?? null,
      input.userId ?? null,
      input.action,
      input.detail ?? null,
      input.fromStatus ?? null,
      input.toStatus ?? null,
      nowIso()
    );
}
export async function listAudit(entryId: string): Promise<AuditEntry[]> {
  return (await query(
      `SELECT al.*, u.name AS user_name FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.entry_id = ? ORDER BY al.created_at`,
      entryId
    )).map((r: any) => ({
      id: r.id,
      entryId: r.entry_id,
      userId: r.user_id,
      userName: r.user_name ?? null,
      action: r.action,
      detail: r.detail,
      fromStatus: r.from_status,
      toStatus: r.to_status,
      createdAt: r.created_at
    }));
}

// ---- dashboard aggregates ---------------------------------------------------

export async function dashboardStats(eventId: string) {
  const [totalRow] = await query<{ c: string | number }>("SELECT COUNT(*) c FROM entries WHERE event_id=?", eventId);
  const byStatus = await query<{ status: string; c: string | number }>("SELECT status, COUNT(*) c FROM entries WHERE event_id=? GROUP BY status", eventId);
  const byPlatform = await query<{ platform: string; c: string | number }>("SELECT platform, COUNT(*) c FROM entries WHERE event_id=? GROUP BY platform ORDER BY c DESC", eventId);
  const byTier = await query<{ tier: number; c: string | number }>("SELECT tier, COUNT(*) c FROM entries WHERE event_id=? GROUP BY tier", eventId);
  const byReviewer = await query<{ name: string; c: string | number }>(
    `SELECT u.name AS name, COUNT(*) c FROM entries e JOIN users u ON u.id=e.created_by_id
     WHERE e.event_id=? GROUP BY e.created_by_id ORDER BY c DESC LIMIT 12`,
    eventId
  );
  return {
    total: Number(totalRow.c),
    byStatus: byStatus.map((row) => ({ ...row, c: Number(row.c) })),
    byPlatform: byPlatform.map((row) => ({ ...row, c: Number(row.c) })),
    byTier: byTier.map((row) => ({ ...row, c: Number(row.c) })),
    byReviewer: byReviewer.map((row) => ({ ...row, c: Number(row.c) }))
  };
}

export async function categoryCounts(eventId: string, keys: string[]) {
  const out: Record<string, number> = {};
  for (const k of keys) {
    const [row] = await query<{ c: string | number }>("SELECT COUNT(*) c FROM entries WHERE event_id=? AND categories LIKE ?", eventId, `%"${k}"%`);
    out[k] = Number(row.c);
  }
  return out;
}
