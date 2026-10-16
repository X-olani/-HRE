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

## Deploy to Vercel with Neon

1. Create a Neon Postgres project and copy its **pooled** connection string from
   **Connect**.
2. In Neon, use a fresh database. Locally, copy `.env.example` to `.env`, set
   `DATABASE_URL`, and replace `AUTH_SECRET` with a newly generated random secret.
   Keep both values private.
3. Run `npm run setup` once from this project folder. It creates the Postgres schema,
   copies the existing local login account (including its password hash, never the
   plaintext password), and seeds the two default event templates. It refuses to
   overwrite a different Neon user. No local events, entries, audit logs, or
   attachments or capture-extension token are copied; generate a new extension token
   in Settings after deployment if you use the extension.
4. Import this GitHub repository into Vercel. Set `DATABASE_URL`, `AUTH_SECRET`, and
   `APP_URL` in the Vercel project's environment variables. `APP_URL` should be the
   deployed HTTPS origin, for example `https://your-app.vercel.app`.
5. Deploy. Sign in using your existing email and password.

The Vercel build command is `npm run build`; the start command is managed by Vercel.
Use the same Neon database and `AUTH_SECRET` for each Vercel environment that should
share accounts and sessions. Rotate any secret that has been exposed before deploying.

### Local development

Local development uses the same Neon `DATABASE_URL` configured in `.env`.
`npm run dev` starts the app after the one-time setup above. The previous SQLite file
is only read by `npm run setup` to copy your login; it is not used by the running app.
For a production build outside Vercel, run `npm run build && npm run start`.

### Docker

The Docker image can run against Neon by setting the same environment variables.
Prepare the Neon schema and seed data with `npm run setup` before starting the image;
the container does not run migrations or overwrite database records on startup.

### Server-side link capture on Vercel

The app's server-side link capture uses Playwright and a local Chromium browser, which
is installed by the Docker image but not provisioned automatically in Vercel functions.
On Vercel, use manual screenshots or the browser extension capture flow; server-side
link screenshots/metrics require a separately hosted browser service.

---

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

Users, events, entries, screenshots, and audit logs are stored in Neon Postgres.
Back up the Neon database using its provider tools.

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

Next.js (App Router, TypeScript) · Neon Postgres · Tailwind · Roboto · ExcelJS.
