# External Integrations

**Analysis Date:** 2026-04-04

## APIs & External Services

None. This is a fully client-side application with no backend API calls, no authentication service, and no third-party SaaS integrations.

## Data Storage

**Databases:**
- None (no remote database)

**Browser Storage — IndexedDB:**
- Client: `idb-keyval` ^6.2.2 (thin wrapper over native IndexedDB)
- Used in two places:
  - `src/App.tsx`: product library persisted under key `"room-cad-products"` (key constant: `PRODUCTS_KEY`)
  - `src/lib/serialization.ts`: project saves/loads under key prefix `"room-cad-project-{id}"`
- All read/write is async via `get()`, `set()`, `del()`, `keys()` from `idb-keyval`
- Data survives page reloads; clearing browser storage wipes all projects

**localStorage:**
- Not used

**File Storage:**
- Local filesystem only — export functions in `src/lib/export.ts` generate PNG downloads via `canvas.toDataURL()` and a temporary `<a>` element
- No upload or cloud storage

**Caching:**
- None beyond IndexedDB persistence

## Authentication & Identity

**Auth Provider:** None — no login, no user accounts, no sessions

## Monitoring & Observability

**Error Tracking:** None

**Logs:** `console.*` only — no structured logging, no remote log shipping

## CI/CD & Deployment

**Hosting:**
- GitHub repository: `https://github.com/micahbank2/room-cad-renderer`
- Deployment target not specified in config; `dist/` is committed, suggesting manual or simple static hosting

**CI Pipeline:** None detected (no `.github/workflows/`, no CI config files)

## Font & Asset CDN Dependencies

**Google Fonts (loaded in `index.html` and `src/index.css`):**
- Material Symbols Outlined — loaded via `<link>` in `index.html`:
  `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0`
- IBM Plex Mono (weights 400, 500, 600, 700) — loaded via `@import` in `src/index.css`
- Inter (weights 400, 500, 600, 700, 800) — loaded via `@import` in `src/index.css`
- Space Grotesk (weights 500, 700) — loaded via `@import` in `src/index.css`

All four font families require network access to Google Fonts CDN on first load. No font self-hosting is in place. Offline use will fall back to system fonts (`system-ui`, `monospace`).

## Webhooks & Callbacks

**Incoming:** None

**Outgoing:** None

## Environment Configuration

**Required env vars:** None — no `.env` files, no `import.meta.env` usage detected

**Secrets:** None — no API keys, tokens, or credentials in use

---

*Integration audit: 2026-04-04*
