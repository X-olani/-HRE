# HRE Monitor: developer guide

This guide is for a developer picking up the codebase. For what the tool does and how
to deploy it, see `README.md`. For the browser extension, see `extension/README.md`.

## Stack

- **Next.js 14 (App Router)** with React 18 and TypeScript. Pages are server components,
  and mutations are server actions. There is no separate API layer except for the few
  routes under `src/app/api/`.
- **SQLite via better-sqlite3**. The driver is synchronous, and there is one database
  file (`./data/hre.db`). Screenshots are stored in the database as BLOBs.
- **Auth:** email and password (bcrypt). The session is a JWT signed with `AUTH_SECRET`
  (using `jose`) and stored in an httpOnly cookie called `hre_session`.
- **Tailwind CSS** for styling and `exceljs` for XLSX exports. `zod` is listed as a
  dependency but nothing uses it yet; form parsing is hand-written in `entries/actions.ts`.
- **Playwright with headless Chromium** for server-side link capture (see below).

## Getting started

Requires Node 20+ (developed on Node 22).

```bash
cp .env.example .env            # set AUTH_SECRET: openssl rand -base64 48
npm install
npx playwright install chromium # browser used for link capture
npm run setup                   # create schema, seed admin + events
npm run dev                     # http://localhost:3000
```

Log in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`. Seeding is
idempotent, so it is safe to re-run.

The zip does **not** include `.env`, `node_modules/`, `.next/` or `data/`. You start
with an empty database.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` / `npm start` | Production build and serve |
| `npm run migrate` | Create any missing tables (`scripts/migrate.ts`) |
| `npm run seed` | Create the admin user and the default events if absent (`scripts/seed.ts`) |
| `npm run setup` | Runs `migrate`, then `seed` |

The repo has no test suite and no linter configuration. To type-check, run
`npx tsc --noEmit`.

## Project layout

```
src/
  middleware.ts            Session gate. Everything except /login, /api/capture
                           and /api/health requires a valid JWT cookie.
  app/
    login/                 Login page + action
    (app)/                 Authenticated area (shared layout + nav)
      dashboard/           Counts by category/platform/tier/status
      entries/             List, new, [id] detail, [id]/edit, and actions.ts
                           (save, status changes, review, tracking, uploads)
      review/              Senior review queue
      exports/             Export downloads page
      admin/               Events + users (ADMIN only); events/[id] = config editor
      settings/            Password change, capture-extension token
    api/
      capture/             POST from the browser extension (token auth, CORS)
      link-capture/        POST from the entry form: screenshot + metrics for a URL
      attachments/[id]/    Serves stored screenshots
      export/[type]/       TSET / Real411 / full-log exports (CSV or XLSX)
      health/              Liveness check for Docker
  components/              EntryForm, WorkflowPanels, AdminForms, SettingsForms, Nav, ui
  lib/
    db.ts                  Connection singleton + schema (CREATE TABLE IF NOT EXISTS)
    repo.ts                All SQL lives here: users, events, entries, attachments, audit
    types.ts               Domain types, roles, status workflow (TRANSITIONS)
    auth.ts                Password hashing, JWT sign/verify, cookies, API tokens
    guard.ts               requireSession() / requireRole() for pages and actions
    framework.ts           Default event config (categories, coded language, platforms…)
    exporters.ts           TSET / Real411 / full-log column mapping
    linkCapture.ts         Headless-browser capture + per-platform metric extraction
scripts/                   migrate / seed (run with tsx; _env.ts is a tiny .env loader)
extension/                 Chrome/Edge MV3 capture extension (plain JS, no build step)
```

## Core concepts

**Events.** Each monitoring window is an event, such as the 4 November 2026 local
government elections. An event's configuration (categories, platforms, content types,
coded-language lists, reporting routes, TSET category map) is stored as JSON columns on
the `events` row and edited in Admin. Exactly one event is active, and new entries attach
to it. To reconfigure the tool for a new window, edit the data. No code changes are
needed.

**Entries and workflow.** An entry is one logged post. Its status moves through
`TRANSITIONS` in `src/lib/types.ts`, which also defines which roles may make each move:

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → ESCALATED → ACTIONED → CLOSED
                                 ↘ DISMISSED (can be reopened)
```

`changeStatusAction` in `entries/actions.ts` is the only place a status changes. It
enforces the transition table and writes to the audit log.

**Roles.** `REVIEWER < SENIOR < ADMIN`; use `roleAtLeast()` to compare. Pages call
`requireSession()` or `requireRole()`, and server actions re-check permissions
themselves. Don't rely on the middleware alone, because it only checks that the session
is valid, not the role.

**Audit trail.** Every create, edit, status change, review, tracking update, attachment
and capture writes a row to `audit_logs`. Keep this up when you add new mutations,
because the team relies on it for due diligence.

## Data layer

- The schema lives in `migrate()` in `src/lib/db.ts` and uses only
  `CREATE TABLE IF NOT EXISTS`. **There is no versioned migration system.** To add a
  column, add an idempotent `ALTER TABLE` guarded by a `PRAGMA table_info` check, or
  introduce `PRAGMA user_version`. Changing the `CREATE` statement has no effect on
  existing databases.
- Array and object fields (categories, report channels, event configuration) are stored
  as JSON text and parsed in `repo.ts`. Booleans are stored as `0`/`1`.
- All SQL is in `repo.ts`. If you move to Postgres, `db.ts` and `repo.ts` are the only
  files to rewrite.
- Backups: copy `data/hre.db`. WAL mode is on, so copy it while the app is stopped, or
  use `sqlite3 data/hre.db ".backup out.db"`.

## Link capture (paste a URL to get a screenshot and metrics)

When a URL is pasted (or **Fetch** is clicked), `EntryForm` POSTs it to
`/api/link-capture`. That route calls `captureLink()` in `src/lib/linkCapture.ts`, which:

1. Validates the URL (http(s) only, public hosts only; see SSRF below).
2. Opens it in a shared headless Chromium instance (one browser per process, kept on
   `globalThis` and given a fresh context per request) and takes a 1280×900 screenshot.
3. Extracts metrics for the platform:
   - **TikTok:** the `__UNIVERSAL_DATA_FOR_REHYDRATION__` JSON in the page gives views,
     likes, shares, comments, created time and description.
   - **YouTube:** `viewCount`, the "like this video along with N other people" label,
     and `publishDate`.
   - **X:** x.com returns 403 to headless browsers, so metrics come from the public
     syndication API (`cdn.syndication.twimg.com/tweet-result`), which gives likes,
     replies and date but **no view count**. The screenshot is taken of the official
     embed (`platform.twitter.com/embed/Tweet.html`).
   - **Facebook and others:** text-pattern matching on meta tags and page text. Facebook
     usually shows a login wall to logged-out visitors, so expect little.
4. Returns the values and a base64 PNG. **Nothing is stored at this point.** The form
   puts the PNG into a hidden `autoCapture` file input, and `saveEntryAction` saves it as
   an attachment and writes a `CAPTURE` audit row (capture time, source page, which
   fields were auto-filled).

Fill rules in the form: metrics and post date are overwritten on every fetch.
Platform, content type and narrative are filled only when they are empty. The metrics
note is stamped `Auto-fetched <time>`.

**This is the most fragile part of the app.** Platforms change their page structure
without notice. If a field stops filling, check its extractor in `linkCapture.ts`. Each
extractor is a few lines of regex or JSON lookups. Failures are designed to degrade
quietly: fields stay blank, and a note appears in the form.

**SSRF.** Users choose which URL the server opens. `assertCapturableUrl()` rejects
private, loopback and link-local addresses after a DNS lookup, and a Playwright route
handler applies the same check to every request the page makes. Keep both checks if you
touch this code.

**Environment variable.** Set `CHROMIUM_PATH` to use a system Chromium instead of
Playwright's bundled build.

**Known limitation.** Headless Chromium can't play TikTok's videos, so TikTok screenshots
show the blurred poster frame with a "trouble playing" message. The counts and page
layout are still visible.

## Browser extension (`extension/`)

This is plain MV3 JavaScript with no build step. When clicked, it screenshots the visible
tab using the reviewer's own logged-in session and POSTs it to `/api/capture` with a
per-user token. Users generate the token in Settings, and the server stores only its
SHA-256 hash. Facebook content still needs this route, because the server can't see
behind Facebook's login wall.

## Deployment notes

- `Dockerfile`: a two-stage build on `node:22-bookworm-slim`. The run stage installs
  Chromium and its system libraries via `npx playwright install --with-deps chromium`,
  which adds roughly 300–400 MB to the image. **This step has not been verified by a
  real Docker build yet.** Build it once before you rely on it.
- The container runs `npm run setup && npm run start` on boot, so the schema and seed
  data are applied automatically. `./data` is mounted as a volume.
- Run it behind a TLS-terminating reverse proxy and set `APP_URL`. Session cookies are
  `secure` in production.
- `next.config.mjs` keeps `better-sqlite3`, `exceljs`, `bcryptjs` and `playwright` out
  of the bundle, and raises the server-action body limit to 12 MB for screenshot
  uploads.

## Gotchas

- `better-sqlite3` is a native module. After changing your Node version, run
  `npm rebuild better-sqlite3`.
- Running `next build` while `next dev` is running corrupts `.next/`. Stop one before
  starting the other.
- The repo is not under git yet. Run `git init` before you start making changes.
- `npm install` reports `npm audit` warnings that nobody has reviewed yet.
