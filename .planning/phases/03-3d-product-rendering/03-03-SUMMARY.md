---
phase: 03-3d-product-rendering
plan: 03
subsystem: export
tags: [export, png, toolbar, save-03]
requires:
  - src/three/ThreeViewport.tsx (root div .bg-obsidian-deepest wraps R3F canvas)
  - ThreeViewport gl={{ preserveDrawingBuffer: true }} from plan 03-02 (parallel)
provides:
  - formatExportFilename(date?) -> "room-YYYYMMDD-HHmm.png" (local time)
  - exportRenderedImage(filename?) targeting 3D viewport canvas, 3D-only
  - Toolbar EXPORT button gated on viewMode !== "2d"
affects:
  - src/lib/export.ts (rewritten: selector fix, datestamp default, 2D fallback removed)
  - src/components/Toolbar.tsx (EXPORT onClick view-gated with alert)
tech-stack:
  added: []
  patterns:
    - TDD RED → GREEN for pure helper
    - view-gated action (viewMode prop check before side effect)
key-files:
  created:
    - src/lib/exportFilename.ts
    - tests/exportFilename.test.ts (promoted from Wave 0 stub)
  modified:
    - src/lib/export.ts
    - src/components/Toolbar.tsx
decisions:
  - D-11 applied: selector .bg-gray-900 → .bg-obsidian-deepest canvas
  - D-12 applied: datestamp filename room-YYYYMMDD-HHmm.png (local time)
  - D-14 applied: 2D fallback branch removed, 3D-only scope; alert when no 3D canvas
metrics:
  duration: 1m
  completed: 2026-04-05
  tasks: 2
  files: 4
---

# Phase 03 Plan 03: Export PNG Fix Summary

**One-liner:** SAVE-03 EXPORT button now downloads timestamp-named PNG of 3D view via corrected `.bg-obsidian-deepest canvas` selector, 3D-only scope, and 2D-view alert gate.

## What Was Built

### Task 1: `formatExportFilename` helper (TDD)

Created `src/lib/exportFilename.ts` — pure function returning `room-YYYYMMDD-HHmm.png` from a `Date` (defaults to `new Date()`). Uses local-time component getters (`getFullYear`, `getMonth()+1`, `getDate`, `getHours`, `getMinutes`) with leading-zero padding via `padStart(2, "0")`. Never touches `toISOString`/UTC variants.

Promoted Wave 0 `it.todo` stubs in `tests/exportFilename.test.ts` to 3 real assertions:
- Specific date (Apr 4 2026, 23:15) → `room-20260404-2315.png`
- Single-digit zero-padding (Jan 5, 03:07) → `room-20260105-0307.png`
- Matches local-time getters, not UTC

TDD sequence: test file committed with import of nonexistent module (RED), then helper created (GREEN). 3 tests pass.

### Task 2: Fix `export.ts` + view-gate Toolbar

**`src/lib/export.ts`** rewritten:
- **D-11:** selector `.bg-gray-900 canvas` → `.bg-obsidian-deepest canvas` (matches ThreeViewport root div class)
- **D-12:** default filename now `formatExportFilename()` (evaluated at call time, not module load)
- **D-14:** removed Fabric-canvas 2D fallback branch inside `exportRenderedImage`. When no 3D canvas found, `alert("Switch to 3D view to export render.")` and bail. `export2DImage` retained intact (used by internal code, not EXPORT button).

**`src/components/Toolbar.tsx`** EXPORT button `onClick`:
- If `viewMode === "2d"` → `alert("Switch to 3D view to export render.")`, return.
- Else → call `exportRenderedImage()`. Covers 3d/split/library. In library view (no R3F canvas mounted), the alert path inside `exportRenderedImage` fires — correct UX.

## Verification

- `npx vitest run tests/exportFilename.test.ts` → 3/3 pass
- `npx vitest run` (full suite) → 80 passed, 3 todo, 0 failed across 17 files
- `vite build` → exits 0, no type errors
- Acceptance criteria grep assertions: 10/10 pass

Manual browser check requires plan 03-02's `preserveDrawingBuffer: true` on Canvas (parallel in Wave 2) to produce non-blank PNGs.

## Deviations from Plan

None — plan executed exactly as written.

## Commits

- `1032a58` test(03-03): add failing tests for formatExportFilename helper
- `84c9b5f` feat(03-03): implement formatExportFilename helper (SAVE-03)
- `51c8bc6` fix(03-03): repair export pipeline (D-11/D-12/D-14) for SAVE-03

## Self-Check: PASSED

- src/lib/exportFilename.ts: FOUND
- src/lib/export.ts: FOUND (modified)
- src/components/Toolbar.tsx: FOUND (modified)
- tests/exportFilename.test.ts: FOUND (promoted from stub)
- Commit 1032a58: FOUND
- Commit 84c9b5f: FOUND
- Commit 51c8bc6: FOUND
