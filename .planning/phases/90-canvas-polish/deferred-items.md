# Phase 90 Deferred Items

## Pre-existing E2E failures (NOT caused by Phase 90 fixes)

Verified by running each spec on `git stash` (Phase 90 changes reverted) — all
3 failures reproduce on `main` immediately before Plan 90-01 work. Out of
scope for Plan 90-01 per CLAUDE.md SCOPE BOUNDARY rule.

### `tests/e2e/specs/toolbar-redesign.spec.ts` — 3 failures on chromium-dev

- L10 — "renders 5 banded group labels" — `seedRoom(page)` called without
  preceding `setupPage(page)` → page never navigates → `waitForFunction`
  times out at 60s.
- L17 — "hover on tool button shows name tooltip" — same root cause.
- L24 — "at 1024x768 every tool stays visible and no horizontal scroll" — same.

**Fix path (future phase):** add `await setupPage(page)` before `await
seedRoom(page)` in each test. Mirrors the pattern already used in `theme-toggle.spec.ts`
and `light-mode-canvas.spec.ts`.

### `tests/e2e/specs/light-mode-canvas.spec.ts` — 2 failures on chromium-dev

Same chromium-dev oklch-vs-rgb issue already documented in Phase 88
deferred-items.md (POLISH-02 + POLISH-03). Phase 90 spec (`90-canvas-polish.spec.ts`)
uses a helper `parseLightness()` that handles both formats — adopt that
approach when these are fixed.
