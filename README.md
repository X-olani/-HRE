# CABC High-Risk Event Monitoring Tool

A role-based web app that replaces the shared HRE escalation spreadsheet. It handles
intake, triage, stakeholder review/sign-off, and export-ready takedown files for
monitoring high-risk events on X, TikTok, Facebook, YouTube and WhatsApp.

Built for the **Centre for Analytics and Behavioural Change**. The live configuration
is the **4 November 2026 local-government elections**; the 30 June 2026 xenophobia
window ships as an archived template. The same tool is reconfigured for a new event by
editing its config in Admin — no rebuild.

---

## What it does

- **Guided logging** — one form with the three-category framework, decision guide and
  coded-language reference built in, and structured fields (platform, URL, content type,
  categories, tier, engagement metrics, language/MT, live flag).
- **Due-diligence workflow** — every entry runs
  `Draft → Submitted → Under review → Approved → Escalated → Actioned → Closed/Dismissed`,
  with senior sign-off and a full audit trail of who did what, when.
- **Link capture** — paste a post URL into the form and the server opens it in headless
  Chromium, attaches a screenshot, and prefills views/likes/shares/comments, post date and
  post text where the platform exposes them to a logged-out visitor (TikTok: all four;
  YouTube: views + likes; X: likes + replies via the official embed; Facebook: usually a
  login wall). Every auto-capture is recorded in the audit trail.
- **One-click capture** — a browser extension screenshots the post you're viewing (using
  your own logged-in session) and opens a prefilled draft. Manual screenshot upload too.
- **Exports** — TSET takedown file matching TikTok's bulk-upload template, Real411
  submission export, and the full monitoring log. CSV or XLSX.
- **Dashboard** — live counts by category, platform, tier, status and reviewer, highest
  reach first.
- **Roles** — Reviewer (log & report), Senior (review, approve, escalate), Admin
  (events & users).

---

## Quick start (Docker — recommended)

Requires Docker with Compose.

```bash
cp .env.example .env
#   edit .env:  set AUTH_SECRET (openssl rand -base64 48), APP_URL,
#   and the SEED_ADMIN_* values for the first admin login.

docker compose up -d --build
```

Open `http://localhost:3000` and sign in with the `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` from `.env`. **Change that password immediately** under Settings.

The database is a single SQLite file in `./data/hre.db` (mounted as a volume). The
schema is created and the events + admin are seeded automatically on first start.

### Running behind a domain / HTTPS

Put it behind a reverse proxy (Caddy, Nginx, Traefik) terminating TLS and set
`APP_URL=https://your-domain`. Sessions use secure cookies in production.

---

## Local development

```bash
cp .env.example .env            # set AUTH_SECRET at minimum
npm install
npx playwright install chromium   # browser used for link capture
npm run setup                   # create schema + seed admin and events
npm run dev                     # http://localhost:3000
```

Production build without Docker: `npm run build && npm run start`.

---

## The capture extension

In `extension/` (Chrome / Edge, Manifest V3):

1. Go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and
   select the `extension/` folder.
2. In the HRE Monitor, open **Settings → Capture extension token**, generate a token.
3. Click the extension's **Details → Extension options**, paste the **App URL** and
   **token**, Save.
4. On any post (X, TikTok, Facebook, YouTube), click the extension's toolbar button. It
   screenshots the page, creates a draft entry, and opens it prefilled for you to finish.

See `extension/README.md` for packaging/distribution notes.

---

## Reconfiguring for a new event

Admin → Events → **New event** (optionally clone an existing event's config), then
**Configure** to edit categories, coded-language lists, platforms, reporting routes and
the TSET category mapping. **Set active** makes it the event all new logging attaches to.
Only one event is active at a time; past events stay available and keep their entries.

---

## Exports

Exports → download for the active event:

- **TSET takedown (TikTok)** — approved + qualifying TikTok entries in the exact 9-column
  TSET bulk-upload layout (URL prefixed with `#`, URL category, report reason, mapped CG
  violation category, details, and live start/end). "All TikTok" ignores review status.
- **Real411** — qualifying / submitted items in the Real411 tracking layout.
- **Full monitoring log** — every field, for reporting and archiving.

---

## Backup & data

Everything lives in `./data/hre.db` (SQLite, including screenshots). Back it up by
copying that file (or the whole `data/` folder). To move to Postgres later, the data
layer is isolated in `src/lib/repo.ts` and `src/lib/db.ts`.

---

## Security notes

- Passwords are bcrypt-hashed; sessions are signed JWTs in httpOnly cookies. Set a strong
  `AUTH_SECRET` and keep `.env` private.
- Capture tokens are stored only as SHA-256 hashes; a token is shown once at generation.
- All app routes require a session (enforced in middleware); role checks are server-side.
- The app does not scrape or auto-post anything on its own — capture uses the reviewer's
  own browser session, and all platform reporting / Real411 / SAPS steps remain manual
  human decisions, tracked in the record.

---

## Stack

Next.js (App Router, TypeScript) · better-sqlite3 (zero-engine SQLite) · Tailwind ·
Roboto · ExcelJS. No external database server and no native-engine downloads required.
