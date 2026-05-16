# Phase 92: In-App Feedback Dialog → GitHub Issues — Context

**Captured:** 2026-05-15
**Branch:** `gsd/phase-92-feedback-dialog`
**Status:** Locked — ready for plan
**Closes:** GH #73 (in-app feedback channel)

## Vision

Jessica (and Micah) can file a bug, suggestion, or question without leaving the app. The Help menu grows a "Send feedback" entry. Clicking it opens a small dialog with title + description + type. Submitting POSTs to the GitHub Issues REST API and creates a new issue in `micahbank2/room-cad-renderer`. Triage context (app version, viewport size, view mode, theme) is auto-appended to the issue body. On success, a toast links straight to the new issue. On failure, an inline error invites a retry — no data is lost.

Closes the long-standing GH #73 thread asking for a feedback channel that doesn't require knowing where the repo lives.

## Milestone Placement

Standalone polish phase. Same shape as Phases 87–91 — no v1.xx milestone, no `milestones/v1.xx-REQUIREMENTS.md` file. ROADMAP.md's `## Polish Phases` section gets a new bullet for Phase 92 referencing this CONTEXT.md and closing GH #73.

## Decisions (Locked)

### D-01 — Standalone polish phase

Phase 92 is a one-off polish phase. No v1.22 milestone is opened. ROADMAP.md `## Polish Phases` section appends an entry for Phase 92 with branch + objective + GH #73 link. No new milestone REQUIREMENTS file.

### D-02 — Feedback destination: GitHub Issues API

Submitting feedback creates a new issue in `micahbank2/room-cad-renderer` via `POST https://api.github.com/repos/{owner}/{repo}/issues`. Auth via personal access token in the `Authorization: token {PAT}` header. Response payload contains `html_url` for the success-toast link.

Rejected alternatives:
- Email (SMTP from browser is infeasible without a relay server)
- Linear / Notion / Discord webhooks (Jessica doesn't use those tools; GH is where Micah triages already)
- Custom backend (Phase scope explicitly excludes new server-side surface — local-first stack constraint per CLAUDE.md)

### D-03 — Required env vars (build-time Vite injection)

Two `import.meta.env.VITE_*` variables, read by `src/lib/githubFeedback.ts`:

| Env var | Required? | Default | Notes |
|---------|-----------|---------|-------|
| `VITE_FEEDBACK_GITHUB_TOKEN` | Yes (for submit) | none | GitHub PAT with `public_repo` scope minimum. If unset, dialog still renders but submit is disabled. |
| `VITE_FEEDBACK_GITHUB_REPO` | No | `micahbank2/room-cad-renderer` | `owner/name` form. Reads from env to allow staging/forked repos to redirect. |

If `VITE_FEEDBACK_GITHUB_TOKEN` is missing at runtime, the dialog renders a "Feedback isn't configured yet — contact the developer" fallback message instead of the form. The dialog still mounts so Jessica gets a clear "this isn't broken — there's nothing to send to right now" signal. Submit button is removed in this state (no disabled submit invitation).

The token is exposed to client-side JS by Vite. Acceptable tradeoff for this phase: PAT scope is `public_repo` only (issue creation on a public repo), not `repo` (full repo access). If the token leaks via DevTools, the worst-case is third parties spamming issues — recoverable via rotating the token. Documented as known risk; future hardening could route through a Cloudflare Worker proxy.

### D-04 — Trigger entry: Help menu → "Send feedback"

The Help button in TopBar (`<HelpCircle>` at `TopBar.tsx:204`) already opens `HelpModal`. Add a new "Send feedback" button inside the HelpModal footer row, sitting next to the existing "OPEN HELP CENTER" link. Clicking it closes HelpModal (so dialogs don't stack) and opens FeedbackDialog.

Reasons for routing through Help (not adding a new TopBar button):
- TopBar real estate is full after Phase 87 added Settings
- Feedback is a "I'm stuck and need help" affordance; Help menu is the natural home
- Discoverability is fine — Help is always one click away

Out of scope: keyboard shortcut, command-palette entry, "Was this helpful?" inline prompts.

### D-05 — Dialog content (minimal v1)

`FeedbackDialog` renders a Radix Dialog (reuse `src/components/ui/Dialog.tsx`) with:

| Element | Type | Required | Notes |
|---------|------|----------|-------|
| Title | text input | Yes | Single line, max 200 chars. Sent to GH as issue `title`, prefixed `[Feedback] `. |
| Description | textarea | Yes | Multi-line, 5 rows visible, no max length enforced client-side. Sent to GH as issue `body` (with auto-context appended). |
| Type | segmented control or select | No | Three options: `Bug` → `bug` label; `Suggestion` → `enhancement` label; `Question` → `question` label. Default: `Bug`. |
| Footnote | static text | — | "This will create a public issue at [github.com/micahbank2/room-cad-renderer/issues](link)." Link opens in new tab. |
| Submit button | primary button | — | Disabled until both Title and Description non-empty (after trim). Label: "Send feedback". |
| Cancel button | secondary/ghost button | — | Closes dialog without submitting. |

**Auto-appended body context** (added programmatically before POST, not visible in the form):

```markdown
---
**Context (auto-collected):**
- App version: 1.0.0
- Viewport: 1440×900
- View mode: 3d
- Theme: dark
- User agent: Mozilla/5.0 ...
```

App version reads from `package.json` via Vite's `import.meta.env.npm_package_version` or a build-time import. Viewport reads `window.innerWidth/innerHeight`. View mode reads from a passed prop (App owns `viewMode` state). Theme reads from `useTheme().resolved`. User agent reads `navigator.userAgent`.

Typography follows Phase 88 token system: section labels at `text-[12px]`, body inputs at `text-[13px]`, footnote at `text-[11px]`. Uses `font-sans` (Barlow) for chrome — D-09. Light + dark mode both supported.

### D-06 — Loading + error states

Submit lifecycle:

| State | Visual |
|-------|--------|
| Idle | Submit button enabled (if form valid), label "Send feedback" |
| Submitting | Submit button disabled, label "Sending…", lucide `Loader2` spinner left of label, spinner suppressed when `useReducedMotion()` is true |
| Success | Dialog closes; toast appears: "Feedback sent. View it on GitHub →" with link to `response.html_url`. Toast auto-dismisses after 6s. |
| Failure | Dialog stays open, form values preserved, inline error below submit button: "Couldn't send — try again or contact the developer." Error logged to `console.error` with full response details. Submit button returns to Idle state. |

No retry button in v1 — user can click Submit again. No queue / offline / retry-on-reconnect logic.

For toast surface: reuse whatever exists in `src/components/ui/Toast.tsx` or `src/lib/toast*` if present; if no toast primitive ships in the codebase, fall back to a transient `alert()` for v1 with a `// TODO Phase 93: replace with proper toast` comment. The plan should detect this during Task 2 and surface in SUMMARY.

## Out of Scope (Deferred)

Explicitly deferred to future phases or backlog:

- Anonymous submission flow (no GH issue created — sent to a custom backend instead)
- Email reply-to / "I'd like a response" affordance
- Screenshot attachment (canvas → PNG → upload to GH)
- Pre-fill description from console errors / last route / breadcrumb trail
- Sentiment slider / NPS / star rating
- Per-page contextual feedback (e.g., "Was the Help section useful?")
- Offline queue with retry on reconnect
- Proxy through Cloudflare Worker to hide PAT (D-03 hardening)
- Toast primitive build-out if missing (v1 falls back to alert)
- Rate limiting (GH API enforces its own)

## Linked Issues / Spec

- GH #73 — "Add in-app feedback channel" (closes on PR merge)
- No design mockups; D-05 table IS the spec
- Phase 87 SettingsPopover for popover/dialog precedent
- Phase 88 typography tokens for label/input/footnote sizing
- HelpModal (`src/components/HelpModal.tsx`) as the entry point per D-04

## Requirements Summary (for traceability)

| ID | Behavior | Surfaces |
|----|----------|----------|
| FB-01 | "Send feedback" button in HelpModal footer opens FeedbackDialog and closes HelpModal | `src/components/HelpModal.tsx`, `src/components/FeedbackDialog.tsx` |
| FB-02 | FeedbackDialog renders Title input, Description textarea, Type segmented control, footnote with repo link, Submit + Cancel buttons | `src/components/FeedbackDialog.tsx` |
| FB-03 | Submit disabled until both Title and Description non-empty (trimmed) | `src/components/FeedbackDialog.tsx` |
| FB-04 | Submit calls `createGitHubIssue({ title, body, labels })` from `src/lib/githubFeedback.ts`, which POSTs to GitHub Issues REST API and returns `{ issueUrl }` | `src/lib/githubFeedback.ts`, `src/components/FeedbackDialog.tsx` |
| FB-05 | Submit appends auto-collected context (app version, viewport, view mode, theme, UA) to issue body | `src/components/FeedbackDialog.tsx`, `src/lib/githubFeedback.ts` |
| FB-06 | Success path: dialog closes + toast (or alert fallback) with link to `issueUrl` | `src/components/FeedbackDialog.tsx` |
| FB-07 | Failure path: dialog stays open, inline error renders, form values preserved, error logged to console | `src/components/FeedbackDialog.tsx` |
| FB-08 | `VITE_FEEDBACK_GITHUB_TOKEN` unset → dialog renders fallback "not configured" message instead of form | `src/components/FeedbackDialog.tsx`, `src/lib/githubFeedback.ts` |
