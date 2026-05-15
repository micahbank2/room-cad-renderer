# Phase 88 Deferred Items

## From 88-02 execution (typography sweep)

### Pre-existing E2E spec failures in light-mode-canvas.spec.ts (Wave 1)

Two specs from Plan 88-01 (`tests/e2e/specs/light-mode-canvas.spec.ts`) now fail under chromium-dev because the browser returns `oklch(...)` directly via `getComputedStyle().backgroundColor` instead of the auto-converted `rgb(...)` the assertion regex expects:

- POLISH-02 line 50 — `expect(darkBg).toMatch(/^rgb\(...\)/)` — actual: `oklch(0.998 0 0)`
- POLISH-03 line 101 — `expect(borderRgb.match(/^rgb\(...\)/)).not.toBeNull()` — match returns null on oklch string

**Diagnosis:** Chromium-dev (current version) preserves oklch in getComputedStyle output rather than converting to rgb. The Wave 1 spec was written assuming the rgb conversion at the JS boundary.

**Fix (Phase 89 or hotfix):** Update the two assertions to either (a) parse oklch and convert manually, or (b) use a hidden rgb-probe div (same trick `getCanvasTheme()` uses internally — see `src/canvas/canvasTheme.ts`).

**Out of scope for 88-02** — typography sweep does not touch theme/border tokens. Failures pre-exist the sweep (verified: spec committed in 61ed9dd, untouched by 88-02 commit c83d36c).
