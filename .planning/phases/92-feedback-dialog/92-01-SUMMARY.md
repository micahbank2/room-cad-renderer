---
phase: 92-feedback-dialog
plan: 01
subsystem: ui-chrome
tags: [feedback, github-integration, help-menu, dialog]
one_liner: "In-app FeedbackDialog that POSTs to the GitHub Issues REST API with auto-collected triage context (closes #73)."
dependency_graph:
  requires:
    - "@radix-ui/react-dialog (existing Dialog primitive at src/components/ui/Dialog.tsx)"
    - "src/components/ui/SegmentedControl.tsx (Type selector)"
    - "src/hooks/useTheme.ts (theme auto-context)"
    - "src/hooks/useReducedMotion.ts (D-39 spinner guard)"
  provides:
    - "src/lib/githubFeedback.ts — createGitHubIssue() + isFeedbackConfigured()"
    - "src/components/FeedbackDialog.tsx — Radix Dialog with 3-field form"
    - "Help menu → SEND FEEDBACK entry"
  affects:
    - "src/components/HelpModal.tsx — adds footer button + sibling FeedbackDialog mount; gains viewMode prop"
    - "src/App.tsx — threads viewMode prop into HelpModal"
tech-stack:
  added:
    - ".env.test (Vite mode=test stub for VITE_FEEDBACK_GITHUB_TOKEN)"
  patterns:
    - "Sibling-mount pattern for cross-modal handoff (HelpModal closes via uiStore while FeedbackDialog mounts as React sibling — closing one does not unmount the other)"
    - "Env-gated fallback (FB-08): isFeedbackConfigured() drives a render-time branch that swaps the form for a 'not configured' message"
key-files:
  created:
    - "src/lib/githubFeedback.ts"
    - "src/components/FeedbackDialog.tsx"
    - "src/components/__tests__/FeedbackDialog.test.tsx"
    - "tests/e2e/specs/feedback-dialog.spec.ts"
    - ".env.test"
  modified:
    - "src/components/HelpModal.tsx"
    - "src/App.tsx"
decisions:
  - "Toast vs alert: shipped window.alert() with a TODO Phase 93 marker — no toast primitive ships in the codebase yet (D-06 escape clause)."
  - "viewMode threading: added an optional viewMode prop on HelpModal (default '2d') and threaded it from App.tsx where viewMode already lives as local state. Avoids a uiStore migration."
  - "Sibling-mount: FeedbackDialog renders as a sibling to the Help <Dialog> inside a fragment so closeHelp() unmounting Help does not unmount the feedback form mid-submit."
  - "Test stub for window.alert: happy-dom does not implement window.alert; swapped vi.spyOn (which errors on undefined) for a direct vi.fn() assignment with save/restore."
metrics:
  duration: "~45 min"
  completed_date: "2026-05-15"
  task_count: 3
  files_changed: 7
  commits: 3
---

# Phase 92 Plan 01: In-App Feedback Dialog → GitHub Issues Summary

## What shipped

Jessica (and Micah) can now file a bug, suggestion, or question without leaving the app or knowing where the repo lives. Clicking the Help button in the TopBar opens HelpModal; the footer now exposes a **SEND FEEDBACK** entry that closes Help and opens a small dialog with Title / Description / Type fields. Submit POSTs to the GitHub Issues REST API in `micahbank2/room-cad-renderer` (or whatever `VITE_FEEDBACK_GITHUB_REPO` overrides to) and creates a public issue prefixed with `[Feedback]`. Auto-collected triage context — app version, viewport size, view mode, theme, and user agent — is appended to the issue body so Micah has signal without asking.

When `VITE_FEEDBACK_GITHUB_TOKEN` is missing at build time, the dialog still mounts but renders a "Feedback isn't configured yet — contact the developer" fallback message instead of the form (FB-08). This gives Jessica a clear "this isn't broken — there's just nowhere to send to right now" signal rather than a confused disabled-submit state.

Closes GH #73.

## Traceability: FB-01..FB-08 → tests → commits

| Req | Behavior | Unit test(s) | E2E test | Commit |
| --- | --- | --- | --- | --- |
| FB-01 | Help → "Send feedback" closes Help + opens FeedbackDialog | (covered by e2e) | `feedback-dialog.spec.ts` FB-01+04+06 | `25e80bd` (HelpModal edit) |
| FB-02 | Renders Title, Description, Type, footnote, Submit + Cancel | `FB-02: renders Title, Description, Type, footnote, Submit + Cancel` | — | `c697c59`, `25e80bd` |
| FB-03 | Submit disabled until both Title + Description filled (trimmed) | `FB-03: Submit disabled until both Title and Description filled (trimmed)` | — | `c697c59`, `25e80bd` |
| FB-04 | Submit calls `createGitHubIssue` with prefixed title + mapped label | `FB-04 + FB-05: Submit posts prefixed title + auto-context body + 'bug' label` | `feedback-dialog.spec.ts` (page.route intercept) | `c697c59`, `25e80bd` |
| FB-05 | Auto-context appended to body (app version, viewport, view mode, theme, UA) | `FB-04 + FB-05: ...` (asserts body contains "App version" + "View mode: 3d" + "Viewport" + "User agent") | — | `c697c59`, `25e80bd` |
| FB-06 | Success closes dialog + surfaces issue URL | `FB-06: Success closes the dialog and surfaces the issue URL` | `feedback-dialog.spec.ts` FB-01+04+06 (alert message contains `/issues/999`) | `c697c59`, `25e80bd` |
| FB-07 | Failure keeps dialog open, preserves form, inline error, console.error | `FB-07: Failure keeps the dialog open with form values + inline error` | — | `c697c59`, `25e80bd` |
| FB-08 | Missing token → "not configured" fallback; no Submit button | `FB-08: Missing token → 'not configured' fallback; no Submit button` | — | `c697c59`, `25e80bd` |

## Files changed (7 files: 5 created, 2 modified)

**Created**
- `src/lib/githubFeedback.ts` (101 lines) — REST API helper + env config check
- `src/components/FeedbackDialog.tsx` (231 lines) — Radix Dialog form + lifecycle
- `src/components/__tests__/FeedbackDialog.test.tsx` (227 lines) — 6 unit tests
- `tests/e2e/specs/feedback-dialog.spec.ts` (66 lines) — happy-path e2e
- `.env.test` (8 lines) — stub Vite mode=test credentials for Playwright

**Modified**
- `src/components/HelpModal.tsx` — adds `viewMode` prop, MessageSquare import, `showFeedback` state, "SEND FEEDBACK" footer button, and sibling FeedbackDialog mount inside a fragment.
- `src/App.tsx` — passes `viewMode={viewMode}` to HelpModal.

## Decisions made during execute

### Toast vs alert — alert with explicit TODO

The codebase currently has no Toast primitive (no `src/components/ui/Toast.tsx`, no `src/lib/toast*`). D-06 anticipated this and authorized a `window.alert()` fallback. Shipped `window.alert(\`Feedback sent. View it on GitHub: \${result.issueUrl}\`)` with an inline `// TODO Phase 93: replace alert() with proper Toast primitive (D-06)` marker in FeedbackDialog. A proper toast surface is tracked for a follow-up polish phase.

### viewMode threading — HelpModal prop, not store

The plan offered two options: thread `viewMode` as a prop on HelpModal, or read it from `useUIStore`. The store currently does not own `viewMode` — it lives as local state in `App.tsx`. Threading as a prop (with a default of `"2d"` for legacy call sites) avoids a store migration and keeps the change scoped to two files (App.tsx + HelpModal.tsx).

### Sibling mount — fragment, not portal

To prevent `closeHelp()` from unmounting FeedbackDialog mid-submit, FeedbackDialog renders as a sibling to the Help Dialog inside a fragment at HelpModal's top level. Radix Dialog primitives already portal themselves, so there's no DOM-tree issue with stacking two dialogs.

### Test stub for happy-dom's missing `window.alert`

Initial test run failed because happy-dom does not implement `window.alert`, so `vi.spyOn(window, "alert")` threw "can only spy on a function. Received undefined." Fixed by assigning a fresh `vi.fn()` directly to `window.alert` in `beforeEach` and restoring the original (which may itself be undefined) in `afterEach`. Documented this Rule-1 deviation in the Task 2 commit message.

## Env var setup

Required for Submit to actually create an issue:

| Env var | Required? | Default | Notes |
|---------|-----------|---------|-------|
| `VITE_FEEDBACK_GITHUB_TOKEN` | Yes | none | GitHub PAT with `public_repo` scope. Missing → FB-08 fallback engages. |
| `VITE_FEEDBACK_GITHUB_REPO` | No | `micahbank2/room-cad-renderer` | `owner/name` form. |

Add these to `.env.local` (gitignored) for production builds, or to `.env` for dev. The `.env.test` file checked in only contains a stub token used by Playwright's `vite --mode test` webServer so the e2e flow can exercise the configured path; the e2e spec intercepts `api.github.com` via `page.route()` and never makes a real network call.

**Token leak mitigation:** if the PAT is exposed in DevTools, the worst case is third parties spamming the public repo with issues. Revoke at GitHub Settings → Developer Settings → Personal Access Tokens.

## Verification gates

| Gate | Result |
| --- | --- |
| `npm run test -- --run src/components/__tests__/FeedbackDialog.test.tsx` | 6/6 GREEN |
| `npm run test:quick` (full suite) | 171 files / 1159 tests GREEN (1153 baseline + 6 new = 1159 — exact match, 0 regressions) |
| `npx playwright test --project=chromium-dev tests/e2e/specs/feedback-dialog.spec.ts` | 1/1 GREEN (1.6s) |
| `npx tsc --noEmit --ignoreDeprecations 6.0` | Clean for new files (only pre-existing `import.meta.env` errors elsewhere in the codebase, also present on `main` baseline). |

## Visual UAT findings

No new visual bugs filed. Existing console warnings about HelpModal's DialogContent missing a DialogTitle/Description are pre-existing — HelpModal renders an `<h2>` for its header rather than `<DialogTitle>` and predates Phase 92. Out of scope per the deviation scope-boundary rule (only auto-fix issues directly caused by this task's changes).

## Commit shas

- `c697c59` — `test(92-01): add RED unit + e2e tests for feedback dialog (FB-01..FB-08)`
- `25e80bd` — `feat(92-01): add FeedbackDialog + GitHub Issues integration + Help menu entry (FB-01..FB-08)`
- `(pending)` — `docs(92-01): SUMMARY + traceability for feedback dialog phase`

## Next steps

1. `/gsd:verify-work` to confirm FB-01..FB-08 all satisfied end-to-end.
2. `/gsd:complete-phase 92` to flip status to `completed` and update ROADMAP.
3. PR with body `Closes #73` + `Spec: .planning/phases/92-feedback-dialog/92-01-PLAN.md`.

## Self-Check: PASSED

- `src/lib/githubFeedback.ts` FOUND
- `src/components/FeedbackDialog.tsx` FOUND
- `src/components/__tests__/FeedbackDialog.test.tsx` FOUND
- `tests/e2e/specs/feedback-dialog.spec.ts` FOUND
- `.env.test` FOUND
- `src/components/HelpModal.tsx` modified (FOUND in commit `25e80bd`)
- `src/App.tsx` modified (FOUND in commit `25e80bd`)
- Commit `c697c59` FOUND
- Commit `25e80bd` FOUND
