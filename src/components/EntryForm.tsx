"use client";

import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveEntryAction, type FormState } from "@/app/(app)/entries/actions";
import type { EventConfig, Entry } from "@/lib/types";

interface LinkCaptureResult {
  platform: string;
  contentType: string;
  views: number | null;
  likes: number | null;
  shares: number | null;
  comments: number | null;
  postDate: string | null;
  text: string | null;
  screenshot: string | null;
  screenshotSource: string | null;
  capturedAt: string;
  notes: string[];
}

const looksLikeUrl = (u: string) => /^https?:\/\/\S+\.\S+/i.test(u.trim());

const REPORT_CHANNELS = ["In-platform report", "TSET (TikTok)", "Real411", "WhatsApp HRE group", "Law enforcement"];

function Buttons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-2">
      <button type="submit" name="intent" value="submit" className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Submit for review"}
      </button>
      <button type="submit" name="intent" value="draft" className="btn-ghost" disabled={pending}>
        Save as draft
      </button>
    </div>
  );
}

export default function EntryForm({
  event,
  entry
}: {
  event: EventConfig;
  entry?: Entry;
}) {
  const [state, action] = useFormState<FormState, FormData>(saveEntryAction, {});
  const [cats, setCats] = useState<string[]>(entry?.categories || []);
  const [live, setLive] = useState<boolean>(entry?.liveStream || false);
  const [reported, setReported] = useState<boolean>(entry?.reportedInPlatform || false);

  // Fields the link capture can fill in.
  const [url, setUrl] = useState(entry?.contentUrl || "");
  const [platform, setPlatform] = useState(entry?.platform || "");
  const [contentType, setContentType] = useState(entry?.contentType || "");
  const [views, setViews] = useState(entry?.metricsViews?.toString() ?? "");
  const [likes, setLikes] = useState(entry?.metricsLikes?.toString() ?? "");
  const [shares, setShares] = useState(entry?.metricsShares?.toString() ?? "");
  const [comments, setComments] = useState(entry?.metricsComments?.toString() ?? "");
  const [postDate, setPostDate] = useState(entry?.originalPostDate?.slice(0, 10) ?? "");
  const [metricsRaw, setMetricsRaw] = useState(entry?.metricsRaw || "");
  const [narrative, setNarrative] = useState(entry?.narrative || "");

  const [capture, setCapture] = useState<
    { state: "idle" } | { state: "loading"; url: string } | { state: "error"; error: string } | { state: "done"; data: LinkCaptureResult; filled: string[] }
  >({ state: "idle" });
  const lastCaptured = useRef<string>(entry?.contentUrl || "");
  const autoFileRef = useRef<HTMLInputElement>(null);

  const clearAutoShot = () => {
    if (autoFileRef.current) autoFileRef.current.value = "";
  };

  async function runCapture(target: string) {
    target = target.trim();
    if (!looksLikeUrl(target)) return;
    lastCaptured.current = target;
    setCapture({ state: "loading", url: target });
    try {
      const r = await fetch("/api/link-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      const d = data as LinkCaptureResult;
      const filled: string[] = [];

      if (!platform && event.platforms.includes(d.platform)) { setPlatform(d.platform); filled.push("platform"); }
      if (!contentType && event.contentTypes.includes(d.contentType)) { setContentType(d.contentType); filled.push("content type"); }
      if (d.contentType === "Live stream" && !live) setLive(true);
      const num = (v: number | null, set: (s: string) => void, label: string) => {
        if (v !== null) { set(String(v)); filled.push(label); }
      };
      num(d.views, setViews, "views");
      num(d.likes, setLikes, "likes");
      num(d.shares, setShares, "shares");
      num(d.comments, setComments, "comments");
      if (d.postDate) { setPostDate(d.postDate); filled.push("post date"); }
      if (filled.some((f) => ["views", "likes", "shares", "comments"].includes(f))) {
        const stamp = new Date(d.capturedAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
        setMetricsRaw((m) => (!m || m.startsWith("Auto-fetched") ? `Auto-fetched ${stamp}` : m));
      }
      if (d.text && !narrative) { setNarrative(`Post text: ${d.text}`); filled.push("post text"); }

      // Hand the screenshot to the form as a real file so it's saved with the entry.
      clearAutoShot();
      if (d.screenshot && autoFileRef.current) {
        const blob = await (await fetch(d.screenshot)).blob();
        const dt = new DataTransfer();
        dt.items.add(new File([blob], `auto-capture-${d.platform.toLowerCase()}-${Date.now()}.png`, { type: "image/png" }));
        autoFileRef.current.files = dt.files;
      }
      setCapture({ state: "done", data: d, filled });
    } catch (e: any) {
      clearAutoShot();
      setCapture({ state: "error", error: e?.message || "Capture failed" });
    }
  }

  const maybeAutoCapture = (v: string) => {
    if (looksLikeUrl(v) && v.trim() !== lastCaptured.current && capture.state !== "loading") runCapture(v);
  };

  const suggestTier2 = cats.includes("incitement");
  const dt = (iso: string | null | undefined, len = 16) => (iso ? iso.slice(0, len) : "");

  const toggleCat = (k: string) =>
    setCats((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {entry && <input type="hidden" name="id" value={entry.id} />}

      {/* MAIN COLUMN */}
      <div className="space-y-5">
        <section className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink">Content</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Platform *</label>
              <select name="platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className="select">
                <option value="">Select…</option>
                {event.platforms.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Content type *</label>
              <select name="contentType" value={contentType} onChange={(e) => setContentType(e.target.value)} className="select">
                <option value="">Select…</option>
                {event.contentTypes.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Content URL *</label>
            <div className="flex gap-2">
              <input
                name="contentUrl"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onPaste={(e) => {
                  const v = e.clipboardData.getData("text");
                  // Let the paste land, then capture.
                  setTimeout(() => maybeAutoCapture(v), 0);
                }}
                onBlur={(e) => maybeAutoCapture(e.target.value)}
                className="input"
                placeholder="https://… — paste a link to auto-capture a screenshot and metrics"
              />
              <button
                type="button"
                className="btn-ghost whitespace-nowrap"
                disabled={!looksLikeUrl(url) || capture.state === "loading"}
                onClick={() => runCapture(url)}
              >
                {capture.state === "loading" ? "Capturing…" : capture.state === "done" ? "Re-fetch" : "Fetch"}
              </button>
            </div>
            <input ref={autoFileRef} type="file" name="autoCapture" accept="image/png" className="hidden" tabIndex={-1} aria-hidden />
            {capture.state === "done" && (
              <input
                type="hidden"
                name="autoCaptureMeta"
                value={JSON.stringify({
                  source: capture.data.screenshotSource,
                  capturedAt: capture.data.capturedAt,
                  filled: capture.filled
                })}
              />
            )}
            <CapturePanel capture={capture} onRemoveShot={() => { clearAutoShot(); setCapture((c) => c.state === "done" ? { ...c, data: { ...c.data, screenshot: null } } : c); }} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="liveStream" checked={live} onChange={(e) => setLive(e.target.checked)} />
            Live stream (time-sensitive — may be deleted)
          </label>
          {live && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Live start</label>
                <input name="liveStart" type="datetime-local" defaultValue={dt(entry?.liveStart)} className="input" />
              </div>
              <div>
                <label className="label">Live end</label>
                <input name="liveEnd" type="datetime-local" defaultValue={dt(entry?.liveEnd)} className="input" />
              </div>
            </div>
          )}
        </section>

        <section className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink">Assessment</h2>
          <div>
            <label className="label">Category — select all that apply *</label>
            <div className="space-y-2">
              {event.categories.map((c) => (
                <label key={c.key} className="flex items-start gap-2 rounded-lg border border-line p-2.5 cursor-pointer hover:bg-surface">
                  <input
                    type="checkbox"
                    name="categories"
                    value={c.key}
                    checked={cats.includes(c.key)}
                    onChange={() => toggleCat(c.key)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.label}
                    </span>
                    <span className="text-xs text-body/70">{c.definition}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Escalation tier *</label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="tier" value="1" defaultChecked={!entry || entry.tier === 1} />
                Tier 1 — log &amp; report in-platform
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="tier" value="2" defaultChecked={entry?.tier === 2} />
                Tier 2 — severe incitement / specific targets / high virality
              </label>
            </div>
            {suggestTier2 && (
              <p className="mt-1.5 text-xs text-danger">
                Incitement selected — consider Tier 2 and alert the HRE WhatsApp group if it is severe.
              </p>
            )}
          </div>

          <div>
            <label className="label">Reason — why it qualifies (1–2 sentences) *</label>
            <textarea name="reason" rows={3} defaultValue={entry?.reason || ""} className="textarea" />
          </div>
          <div>
            <label className="label">Narrative / context (optional — for research &amp; non-qualifying content)</label>
            <textarea name="narrative" rows={2} value={narrative} onChange={(e) => setNarrative(e.target.value)} className="textarea" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Language</label>
              <input name="language" defaultValue={entry?.language || ""} className="input" placeholder="e.g. isiZulu, English" />
            </div>
            <label className="flex items-end gap-2 text-sm pb-2">
              <input type="checkbox" name="machineTranslation" defaultChecked={entry?.machineTranslation} />
              Machine translation used (MT)
            </label>
          </div>
        </section>

        <section className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink">Engagement &amp; reporting</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div><label className="label">Views</label><input name="metricsViews" inputMode="numeric" value={views} onChange={(e) => setViews(e.target.value)} className="input" /></div>
            <div><label className="label">Likes</label><input name="metricsLikes" inputMode="numeric" value={likes} onChange={(e) => setLikes(e.target.value)} className="input" /></div>
            <div><label className="label">Shares</label><input name="metricsShares" inputMode="numeric" value={shares} onChange={(e) => setShares(e.target.value)} className="input" /></div>
            <div><label className="label">Comments</label><input name="metricsComments" inputMode="numeric" value={comments} onChange={(e) => setComments(e.target.value)} className="input" /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Original post date</label>
              <input name="originalPostDate" type="date" value={postDate} onChange={(e) => setPostDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Metrics note (raw)</label>
              <input name="metricsRaw" value={metricsRaw} onChange={(e) => setMetricsRaw(e.target.value)} className="input" placeholder="e.g. 1.9k likes, 803 comments" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="reportedInPlatform" checked={reported} onChange={(e) => setReported(e.target.checked)} />
            Reported in-platform
          </label>
          <div>
            <label className="label">Escalation channels used</label>
            <div className="flex flex-wrap gap-3 text-sm">
              {REPORT_CHANNELS.map((c) => (
                <label key={c} className="flex items-center gap-1.5">
                  <input type="checkbox" name="reportChannels" value={c} defaultChecked={entry?.reportChannels?.includes(c)} />
                  {c}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Report feedback (optional)</label>
            <input name="reportFeedback" defaultValue={entry?.reportFeedback || ""} className="input" placeholder="e.g. No feedback (post still up)" />
          </div>
        </section>

        <section className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-ink">Screenshots</h2>
          <p className="text-xs text-body/60">
            Attach screenshots as evidence (pasting a link above captures one automatically, as does the browser extension).
            Max 8 MB each.
          </p>
          <input type="file" name="screenshots" accept="image/*" multiple className="text-sm" />
        </section>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <Buttons />
      </div>

      {/* REFERENCE PANEL */}
      <aside className="space-y-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-ink">Decision guide</h3>
          <ol className="mt-2 space-y-2 text-xs text-body/80">
            <li><strong className="text-ink">1.</strong> Could this meet any category? No → move on. Yes/unsure → continue.</li>
            <li><strong className="text-ink">2. Tier 1:</strong> log here + report in-platform.</li>
            <li><strong className="text-ink">3. Tier 2:</strong> severe incitement, specific targets, or high-virality coordination → message the HRE WhatsApp group immediately, then finish logging.</li>
          </ol>
          <p className="mt-2 rounded bg-brand-yellow/20 p-2 text-xs text-yellow-900">
            When in doubt, log and escalate. Better to over-report than miss something.
          </p>
        </div>

        <details className="card p-4" open>
          <summary className="cursor-pointer text-sm font-semibold text-ink">Coded language &amp; evasion</summary>
          <div className="mt-2 space-y-2">
            {event.codedLanguage.map((g) => (
              <div key={g.group}>
                <div className="text-xs font-medium text-ink">{g.group}</div>
                <ul className="list-disc pl-4 text-xs text-body/70">
                  {g.terms.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </details>

        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">In-platform reporting routes</summary>
          <div className="mt-2 space-y-1.5">
            {event.reportingRoutes.map((r) => (
              <div key={r.platform} className="text-xs">
                <span className="font-medium text-ink">{r.platform}:</span> <span className="text-body/70">{r.route}</span>
              </div>
            ))}
          </div>
        </details>
      </aside>
    </form>
  );
}

function CapturePanel({
  capture,
  onRemoveShot
}: {
  capture:
    | { state: "idle" }
    | { state: "loading"; url: string }
    | { state: "error"; error: string }
    | { state: "done"; data: LinkCaptureResult; filled: string[] };
  onRemoveShot: () => void;
}) {
  if (capture.state === "idle") return null;
  if (capture.state === "loading") {
    return (
      <p className="mt-2 text-xs text-body/70">
        Opening the link, taking a screenshot and reading engagement metrics… this can take up to 30 seconds.
      </p>
    );
  }
  if (capture.state === "error") {
    return <p className="mt-2 text-xs text-danger">Couldn’t capture this link: {capture.error}. Fill the fields in by hand.</p>;
  }
  const { data, filled } = capture;
  return (
    <div className="mt-3 flex gap-3 rounded-lg border border-line bg-surface p-3">
      {data.screenshot ? (
        <a href={data.screenshot} target="_blank" rel="noopener noreferrer" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.screenshot} alt="Captured screenshot" className="h-24 w-36 rounded border border-line object-cover object-top" />
        </a>
      ) : null}
      <div className="min-w-0 space-y-1 text-xs">
        <p className="text-ink">
          {filled.length ? <>Filled in: <strong>{filled.join(", ")}</strong>. Check them before submitting.</> : "No metrics could be read from this link."}
        </p>
        {data.screenshot ? (
          <p className="text-body/70">
            Screenshot will be attached when you save.{" "}
            <button type="button" className="underline" onClick={onRemoveShot}>Don’t attach</button>
          </p>
        ) : (
          <p className="text-body/70">No screenshot attached.</p>
        )}
        {data.notes.map((n, i) => (
          <p key={i} className="text-yellow-800">{n}</p>
        ))}
      </div>
    </div>
  );
}
