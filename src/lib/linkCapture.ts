// Server-side link capture: open a post URL in headless Chromium, screenshot it,
// and pull whatever public engagement metrics the platform exposes to a
// logged-out visitor. Everything is best-effort — a field we can't read is left
// null and the reviewer fills it in by hand.
//
// What works logged-out (checked Oct 2026):
//   TikTok   views, likes, shares, comments, post date   (embedded page JSON)
//   YouTube  views, likes, post date                      (embedded page JSON / labels)
//   X        likes, replies, post date                    (public syndication API;
//            x.com itself 403s headless browsers, so the screenshot is of the
//            official embed rendering of the post)
//   Facebook mostly a login wall — screenshot of whatever loads, metrics rarely

import dns from "node:dns/promises";
import net from "node:net";
import type { Browser } from "playwright";

export interface LinkCapture {
  url: string;
  platform: string;
  contentType: string;
  views: number | null;
  likes: number | null;
  shares: number | null;
  comments: number | null;
  postDate: string | null; // YYYY-MM-DD
  text: string | null;
  screenshot: Buffer | null;
  screenshotSource: string | null; // what was actually rendered, for the audit trail
  notes: string[];
}

export function platformFromUrl(u: string): string {
  const s = u.toLowerCase();
  if (s.includes("tiktok.")) return "TikTok";
  if (s.includes("x.com") || s.includes("twitter.com")) return "X";
  if (s.includes("facebook.") || s.includes("fb.watch")) return "Facebook";
  if (s.includes("youtube.") || s.includes("youtu.be")) return "YouTube";
  if (s.includes("whatsapp.")) return "WhatsApp";
  return "Other";
}

export function contentTypeFromUrl(u: string): string {
  const s = u.toLowerCase();
  if (s.includes("/live")) return "Live stream";
  if (s.includes("/video/") || s.includes("fb.watch") || s.includes("youtu")) return "Video";
  if (s.includes("/photo/")) return "Photo / image";
  return "Post";
}

// "35.2K" -> 35200, "19,488,517" -> 19488517, "1.2M" -> 1200000
export function parseCount(v: unknown): number | null {
  if (typeof v === "number") return isFinite(v) ? Math.round(v) : null;
  if (typeof v !== "string") return null;
  const m = v.replace(/[,\s]/g, "").match(/^(\d+(?:\.\d+)?)([KMB])?$/i);
  if (!m) return null;
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || "").toUpperCase() as "K" | "M" | "B"] || 1;
  return Math.round(parseFloat(m[1]) * mult);
}

// Calendar day in South African time, which is what the monitoring team sees.
const isoDay = (d: Date) =>
  isNaN(d.getTime()) ? null : d.toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });

// ---------------------------------------------------------------------------
// SSRF guard: only public http(s) hosts. Applied to the submitted URL and to
// every request the headless page makes.

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const s = ip.toLowerCase();
  if (s.startsWith("::ffff:")) return isPrivateIp(s.slice(7));
  return s === "::1" || s === "::" || s.startsWith("fc") || s.startsWith("fd") || s.startsWith("fe80");
}

const hostCache = new Map<string, boolean>();
async function isPublicHost(host: string): Promise<boolean> {
  host = host.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (net.isIP(host)) return !isPrivateIp(host);
  const cached = hostCache.get(host);
  if (cached !== undefined) return cached;
  let ok = false;
  try {
    const addrs = await dns.lookup(host, { all: true });
    ok = addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address));
  } catch {
    ok = false;
  }
  if (hostCache.size > 2000) hostCache.clear();
  hostCache.set(host, ok);
  return ok;
}

export async function assertCapturableUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("Only http(s) links can be captured.");
  if (!(await isPublicHost(u.hostname))) throw new Error("That host can't be captured.");
  return u;
}

// ---------------------------------------------------------------------------
// One shared browser per server process (kept on globalThis so dev reloads reuse it).

const g = globalThis as unknown as { __hreBrowser?: Promise<Browser> };

async function getBrowser(): Promise<Browser> {
  if (g.__hreBrowser) {
    const b = await g.__hreBrowser.catch(() => null);
    if (b && b.isConnected()) return b;
  }
  const { chromium } = await import("playwright");
  g.__hreBrowser = chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
  return g.__hreBrowser;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

async function shoot(
  url: string,
  opts: { selector?: string } = {}
): Promise<{ png: Buffer | null; html: string; finalUrl: string; status: number | null }> {
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    locale: "en-US",
    userAgent: UA
  });
  try {
    await ctx.route("**/*", async (route) => {
      try {
        const host = new URL(route.request().url()).hostname;
        if (route.request().url().startsWith("data:") || (await isPublicHost(host))) return route.continue();
      } catch {}
      return route.abort();
    });
    const page = await ctx.newPage();
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25_000 });
    await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {});
    // Dismiss the common cookie/consent banners so they don't cover the post.
    for (const label of ["Accept all", "Allow all cookies", "Decline optional cookies", "Reject all"]) {
      const btn = page.getByRole("button", { name: label }).first();
      if (await btn.isVisible({ timeout: 300 }).catch(() => false)) {
        await btn.click({ timeout: 1_000 }).catch(() => {});
        await page.waitForTimeout(500);
        break;
      }
    }
    let png: Buffer | null = null;
    if (opts.selector) {
      const el = page.locator(opts.selector).first();
      if (await el.isVisible({ timeout: 3_000 }).catch(() => false)) png = await el.screenshot({ type: "png" });
    }
    if (!png) png = await page.screenshot({ type: "png" });
    return { png, html: await page.content(), finalUrl: page.url(), status: resp?.status() ?? null };
  } finally {
    await ctx.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Per-platform metric extraction

function extractTikTok(html: string, c: LinkCapture) {
  const m = html.match(/<script[^>]+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
  if (m) {
    try {
      const data = JSON.parse(m[1]);
      const item = data?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct;
      if (item) {
        const s = { ...(item.stats || {}), ...(item.statsV2 || {}) };
        c.views = parseCount(s.playCount);
        c.likes = parseCount(s.diggCount);
        c.shares = parseCount(s.shareCount);
        c.comments = parseCount(s.commentCount);
        if (item.createTime) c.postDate = isoDay(new Date(Number(item.createTime) * 1000));
        if (item.desc) c.text = String(item.desc);
        if (item.liveRoomInfo || item.isLive) c.contentType = "Live stream";
        else if (item.video?.duration) c.contentType = "Video";
        return;
      }
    } catch {}
  }
  // Fallback: raw JSON fragments anywhere in the page.
  const num = (k: string) => parseCount(html.match(new RegExp(`"${k}":"?(\\d+)`))?.[1] ?? null);
  c.views = num("playCount");
  c.likes = num("diggCount");
  c.shares = num("shareCount");
  c.comments = num("commentCount");
}

function extractYouTube(html: string, c: LinkCapture) {
  c.views = parseCount(html.match(/"viewCount":"(\d+)"/)?.[1] ?? null);
  c.likes = parseCount(
    html.match(/like this video along with ([\d,]+) other/i)?.[1] ??
      html.match(/"likeCount":"?(\d+)/)?.[1] ??
      null
  );
  c.comments = parseCount(html.match(/"commentCount":\{"simpleText":"([\d,.KMB]+)"/)?.[1] ?? null);
  const date = html.match(/"(?:publishDate|uploadDate)":"([^"]+)"/)?.[1];
  if (date) c.postDate = isoDay(new Date(date));
  if (/"isLiveContent":true/.test(html) || /"isLive":true/.test(html)) c.contentType = "Live stream";
  else c.contentType = "Video";
  const title = html.match(/<meta name="title" content="([^"]*)"/)?.[1];
  if (title) c.text = decodeEntities(title);
}

function tweetId(u: URL): string | null {
  return u.pathname.match(/\/status(?:es)?\/(\d+)/)?.[1] ?? null;
}

async function extractXSyndication(id: string, c: LinkCapture) {
  // Same token scheme react-tweet / the official embed uses.
  const token = ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
  const r = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${token}&lang=en`, {
    signal: AbortSignal.timeout(10_000)
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j: any = await r.json();
  if (!j || j.__typename === "TweetTombstone") throw new Error("post unavailable");
  c.likes = parseCount(j.favorite_count);
  c.comments = parseCount(j.conversation_count);
  c.shares = parseCount(j.retweet_count);
  if (j.created_at) c.postDate = isoDay(new Date(j.created_at));
  if (j.text) c.text = String(j.text);
  if (j.video || j.mediaDetails?.some((m: any) => m.type === "video")) c.contentType = "Video";
  else if (j.photos?.length) c.contentType = "Photo / image";
}

// Generic: "1.2K likes", "803 comments", "45 shares", "12K views" in visible text / meta.
function extractGeneric(text: string, c: LinkCapture) {
  const grab = (words: string) =>
    parseCount(text.match(new RegExp(`(\\d[\\d,.]*\\s?[KMB]?)\\s+(?:${words})\\b`, "i"))?.[1] ?? null);
  c.views ??= grab("views|plays");
  c.likes ??= grab("likes|reactions");
  c.shares ??= grab("shares|reposts|retweets");
  c.comments ??= grab("comments|replies");
}

function decodeEntities(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function stripHtml(html: string) {
  return decodeEntities(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

// ---------------------------------------------------------------------------

export async function captureLink(rawUrl: string): Promise<LinkCapture> {
  const u = await assertCapturableUrl(rawUrl.trim());
  const url = u.toString();
  const c: LinkCapture = {
    url,
    platform: platformFromUrl(url),
    contentType: contentTypeFromUrl(url),
    views: null,
    likes: null,
    shares: null,
    comments: null,
    postDate: null,
    text: null,
    screenshot: null,
    screenshotSource: null,
    notes: []
  };

  if (c.platform === "X") {
    const id = tweetId(u);
    if (!id) {
      c.notes.push("Couldn't find a post ID in this X link.");
      return c;
    }
    const [meta, shot] = await Promise.allSettled([
      extractXSyndication(id, c),
      shoot(`https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=light&dnt=true`, { selector: "article" })
    ]);
    if (meta.status === "rejected") c.notes.push(`X metrics unavailable (${meta.reason?.message || "error"}).`);
    if (shot.status === "fulfilled") {
      c.screenshot = shot.value.png;
      c.screenshotSource = "X official embed rendering";
    } else {
      c.notes.push("Screenshot failed for this X post.");
    }
    c.notes.push("X doesn't expose view counts publicly — add views by hand.");
    return c;
  }

  if (c.platform === "WhatsApp") {
    c.notes.push("WhatsApp content can't be fetched — attach a screenshot manually.");
    return c;
  }

  let page;
  try {
    page = await shoot(url);
  } catch (e: any) {
    c.notes.push(`Couldn't load the page (${(e?.message || "error").split("\n")[0]}).`);
    return c;
  }
  c.screenshot = page.png;
  c.screenshotSource = page.finalUrl;
  if (page.status && page.status >= 400) c.notes.push(`The page returned HTTP ${page.status} — check the screenshot.`);

  if (c.platform === "TikTok") extractTikTok(page.html, c);
  else if (c.platform === "YouTube") extractYouTube(page.html, c);

  const metaDesc = [...page.html.matchAll(/<meta[^>]+(?:property|name)="(?:og:description|og:title|description)"[^>]+content="([^"]*)"/g)]
    .map((m) => decodeEntities(m[1]))
    .join(" ");
  // Text scraping is a last resort — on TikTok/YouTube it would pick up numbers
  // from recommended videos, so only use it where there's no structured data.
  if (c.platform !== "TikTok" && c.platform !== "YouTube") {
    extractGeneric(metaDesc + " " + stripHtml(page.html).slice(0, 200_000), c);
  }
  if (!c.text) c.text = metaDesc.trim() || null;

  if (c.platform === "Facebook" && /log in|log into facebook/i.test(stripHtml(page.html).slice(0, 50_000))) {
    c.notes.push("Facebook showed a login prompt — the screenshot may not show the post. Use the capture extension instead.");
  }
  return c;
}
