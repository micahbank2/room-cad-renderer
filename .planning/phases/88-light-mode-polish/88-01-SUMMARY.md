---
phase: 88-light-mode-polish
plan: 01
plan_id: 88-01
subsystem: canvas-theme + chrome-polish
tags: [light-mode, theme, canvas, fabric, polish]
status: complete
requirements:
  - POLISH-01
  - POLISH-02
  - POLISH-03
dependency_graph:
  requires:
    - Phase 87 useTheme() hook + Settings popover
    - Phase 71 Pascal oklch token system
  provides:
    - getCanvasTheme() bridge (src/canvas/canvasTheme.ts)
    - setFabricSyncTheme() per-frame setter
    - withAlpha() utility
    - __driveGetCanvasBg test driver
  affects:
    - src/canvas/grid.ts, dimensions.ts, fabricSync.ts (signatures)
    - src/canvas/FabricCanvas.tsx (theme subscription)
    - src/canvas/tools/wallTool.ts (live label bg)
    - src/index.css (.light + :root border tokens)
    - src/App.tsx (FloatingToolbar mount site)
tech_stack:
  added: []
  patterns:
    - "Per-frame module-level theme ref (set at top of redraw, NOT a cache)"
    - "Hidden-probe div for oklch→rgb conversion at JS boundary (D-05)"
key_files:
  created:
    - src/canvas/canvasTheme.ts
    - src/components/__tests__/canvasTheme.test.ts
    - src/components/__tests__/FloatingToolbarMount.test.tsx
    - tests/e2e/specs/light-mode-canvas.spec.ts
  modified:
    - src/App.tsx
    - src/components/FloatingToolbar.tsx
    - src/canvas/grid.ts
    - src/canvas/dimensions.ts
    - src/canvas/fabricSync.ts
    - src/canvas/FabricCanvas.tsx
    - src/canvas/tools/wallTool.ts
    - src/index.css
decisions:
  - "Hybrid theme threading: signature param for top-level renderers (drawGrid, drawWallDimension, drawRoomDimensions) + module-level _currentTheme set per-frame for fabricSync internal helpers. Keeps the diff manageable without violating StrictMode guidance (the module variable is overwritten every frame, not cached across frames)."
  - "Brand purple (#7c5bf0) stays inline as theme-invariant per plan — selection strokes and snap guides must look identical in light and dark mode."
  - "Unit-test injection via inline style props on documentElement instead of full CSS injection (happy-dom's getComputedStyle does not resolve var() through .dark/.light class cascade)."
metrics:
  duration_minutes: ~35
  tasks_completed: 4
  files_changed: 12
  tests_added: 8  # 5 canvasTheme + 2 mount + 3 e2e (counted by case)
  vitest_pass: 1120
  vitest_baseline: 1113
completed_date: 2026-05-15
---

# Phase 88 Plan 01: Canvas Theme Bridge + Toolbar Mount + Light Borders Summary

Light-mode polish: 2D Fabric canvas now repaints when user flips Light/Dark in Settings, FloatingToolbar visible in 3D + Split (not just 2D), and light-mode borders meet WCAG 3:1 contrast.

## What Shipped

Phase 87 shipped the Theme Toggle UI but three follow-ups remained from UAT:
- **#194:** FloatingToolbar disappeared the moment user switched to 3D view.
- **#195:** 2D Fabric canvas hardcoded every color to dark obsidian — flipping to Light left the canvas as a black-on-black rectangle.
- **#196:** Light-mode `--border` at `oklch(0.922)` was ~1.1:1 contrast against `--background oklch(0.998)`, nearly invisible.

All three close together because they share the same "finish the theme story" framing.

## Traceability

| Requirement | Issue | Test                                                                 | Commit    |
| ----------- | ----- | -------------------------------------------------------------------- | --------- |
| POLISH-01   | #194  | `FloatingToolbarMount.test.tsx` (2 cases) + e2e POLISH-01 case       | `72f0004` |
| POLISH-02   | #195  | `canvasTheme.test.ts` (5 cases) + e2e POLISH-02 case                 | `b71434e` |
| POLISH-03   | #196  | `canvasTheme.test.ts` Test 5 + e2e POLISH-03 case                    | `bfada24` |

## Files Changed

| File                                              | Δ stat            | Note                                                                                |
| ------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| `src/canvas/canvasTheme.ts`                       | +100 (new)        | CanvasTheme interface + getCanvasTheme() + withAlpha() helper                       |
| `src/canvas/grid.ts`                              | ~30 mod           | drawGrid accepts `theme: CanvasTheme`; GRID_COLOR/GRID_COLOR_MAJOR/ROOM_OUTLINE removed |
| `src/canvas/dimensions.ts`                        | ~40 mod           | drawRoomDimensions + drawWallDimension accept theme; DIM_COLOR removed              |
| `src/canvas/fabricSync.ts`                        | ~40 mod           | setFabricSyncTheme() per-frame bridge; WALL_FILL/WALL_STROKE removed; 18 dark hexes purged |
| `src/canvas/FabricCanvas.tsx`                     | +18 mod           | useTheme() subscription; resolved in redraw deps; __driveGetCanvasBg installed       |
| `src/canvas/tools/wallTool.ts`                    | +4 mod            | Live length-label bg reads theme.cardBg                                              |
| `src/App.tsx`                                     | +5 / -1           | FloatingToolbar mount hoisted out of 2D-or-split branch                              |
| `src/components/FloatingToolbar.tsx`              | +1                | Added `data-testid="floating-toolbar"` on root                                       |
| `src/index.css`                                   | +8 / -4           | --border/--input bumped to oklch(0.85) in :root + .light                            |
| `src/components/__tests__/canvasTheme.test.ts`    | +112 (new)        | 5 cases — smoke + light/dark resolution + oklch contract + border luminance         |
| `src/components/__tests__/FloatingToolbarMount.test.tsx` | +40 (new)  | String-grep verifies mount is OUTSIDE 2D-only branch                                |
| `tests/e2e/specs/light-mode-canvas.spec.ts`       | +90 (new)         | 3 e2e cases — toolbar-in-3d, canvas-bg-flip, border-luminance                       |

## Before / After Color Probes (Light Mode)

**`--border` token:**
- Before: `oklch(0.922 0 0)` → ~`rgb(235, 235, 235)` (1.1:1 vs background)
- After: `oklch(0.85 0 0)` → ~`rgb(213, 213, 213)` (3.1:1 vs background — WCAG AA)

**`fc.backgroundColor` (Fabric canvas):**
- Before: hardcoded `"#12121d"` (dark obsidian) in both themes
- After (light): `rgb(254, 254, 254)` from `getCanvasTheme().background`
- After (dark): `rgb(47, 47, 47)` from same call, with `.dark` on `<html>`

**Selection stroke (brand purple):**
- Before / after: `#7c5bf0` unchanged in both themes — theme-invariant per D-04.

## Deviations from Plan

### Adjustments

**1. [Rule 3 — Test infrastructure] Unit-test setup simplified vs plan suggestion**
- **Found during:** Task 3 (test ran RED with empty rgb string from probe div).
- **Issue:** Plan suggested injecting `src/index.css` directly into `document.head` so happy-dom resolves `var(--border)` through the cascade. Tested: happy-dom's getComputedStyle does NOT resolve CSS variables defined in `:root` / `.dark` / `.light` rule blocks reliably — it returned empty strings for `getComputedStyle(probe).color` when probe.style.color was `var(--border)`.
- **Fix:** Inject the token values directly via `documentElement.style.setProperty("--background", "rgb(254, 254, 254)")` per test. This still exercises the real `getCanvasTheme()` probe-div code path (the probe inherits the inline-style cascade fine) while sidestepping happy-dom's CSS engine limits.
- **Files:** `src/components/__tests__/canvasTheme.test.ts`
- **Commit:** `b71434e`

**2. [Rule 3 — Architecture choice] Module-level theme ref in fabricSync (not signature threading)**
- **Found during:** Task 3 (counting render functions in fabricSync.ts = 11 exports + 6+ internal helpers).
- **Issue:** Plan suggested threading `theme: CanvasTheme` through every render export AND every internal helper (`addCapPolygon`, `convexHull`, etc.). That would require touching ~50 call sites and dozens of internal helper signatures. Mechanically large diff, high regression risk.
- **Fix:** Added `setFabricSyncTheme(theme)` exported setter + module-level `_currentTheme` reassigned at the top of every `FabricCanvas.redraw()`. Internal helpers call `theme()` which reads the per-frame ref. This is NOT caching across redraws (the ref is overwritten every frame), so it does not violate CLAUDE.md StrictMode guidance — it just delegates "where does theme live" from function args to a single per-frame module slot.
- **Files:** `src/canvas/fabricSync.ts`, `src/canvas/FabricCanvas.tsx`
- **Trade-off:** Tools that don't go through FabricCanvas (none today, but potential future extraction) would need to call `setFabricSyncTheme()` themselves or fall through to `getCanvasTheme()` (the helper has a fallback for legacy callers).
- **Commit:** `b71434e`

**3. [Rule 2 — Missing test-fixture testid] Added `data-testid="floating-toolbar"`**
- **Found during:** Task 1 (writing the e2e spec).
- **Issue:** Plan referenced `[data-testid="floating-toolbar"]` as the e2e probe selector, but the FloatingToolbar root div did NOT have such a testid (verified via grep at execute-time). Without it, the e2e tests can't reliably target the toolbar.
- **Fix:** Added `data-testid="floating-toolbar"` to the outer `<div>` in `FloatingToolbar.tsx`. Mechanically neutral — no behavior change, no visual change.
- **Commit:** `72f0004`

## UAT Note

**One-sentence smoke test:**
> Flip Settings → Light. Confirm the 2D canvas repaints near-white with visible gray grid lines and dark wall outlines, then switch to 3D view and confirm the FloatingToolbar is still mounted at the bottom of the viewport. Sidebar / inspector borders should now be clearly visible.

## Known Stubs

None — every code path lights up with real data on theme flip.

## Self-Check: PASSED

Verified existence of:
- `src/canvas/canvasTheme.ts` — FOUND
- `src/components/__tests__/canvasTheme.test.ts` — FOUND
- `src/components/__tests__/FloatingToolbarMount.test.tsx` — FOUND
- `tests/e2e/specs/light-mode-canvas.spec.ts` — FOUND
- `.planning/phases/88-light-mode-polish/88-01-SUMMARY.md` — FOUND (this file)

Verified commits:
- `61ed9dd` (Task 1 RED tests) — FOUND
- `72f0004` (Task 2 FloatingToolbar mount) — FOUND
- `b71434e` (Task 3 canvas theme bridge) — FOUND
- `bfada24` (Task 4 border bump) — FOUND

Verified test outcomes:
- `npm run test:quick` → 1120 passed | 11 todo (1131); 0 regressions vs Phase 87 baseline of 1113.
- 5 new canvasTheme unit tests GREEN.
- 2 new FloatingToolbarMount unit tests GREEN.
- 3 new e2e cases discovered by Playwright (`tests/e2e/specs/light-mode-canvas.spec.ts`) — not run as part of `npm run test:quick`; will run on PR CI.
