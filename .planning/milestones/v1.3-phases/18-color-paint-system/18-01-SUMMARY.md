---
phase: 18-color-paint-system
plan: "01"
subsystem: paint-data-foundation
tags: [paint, types, farrow-and-ball, cadStore, colorUtils, tdd]
dependency_graph:
  requires: []
  provides:
    - PaintColor type (src/types/paint.ts)
    - F&B 132-color catalog (src/data/farrowAndBall.ts)
    - paintStore derived view (src/stores/paintStore.ts)
    - resolvePaintHex utility (src/lib/colorUtils.ts)
    - cadStore paint actions + snapshot safety (src/stores/cadStore.ts)
  affects:
    - src/stores/cadStore.ts (snapshot, undo, redo, loadSnapshot extended)
    - src/types/cad.ts (Wallpaper, Ceiling, CADSnapshot extended)
tech_stack:
  added:
    - react-colorful (^2.7.3) — color picker component for Phase 03 UI
    - happy-dom (test environment replacement for jsdom — Node 24 compatibility)
  patterns:
    - TDD red-green across all 4 test files
    - paintStore as pure derived view of cadStore (no idb-keyval)
    - cadStore paint fields via `(s as any)` pattern (consistent with customElements)
    - snapshot extension via spread pattern (customPaints, recentPaints)
key_files:
  created:
    - src/types/paint.ts
    - src/data/farrowAndBall.ts
    - src/stores/paintStore.ts
    - src/lib/colorUtils.ts
    - src/__tests__/farrowAndBall.test.ts
    - src/__tests__/paintStore.test.ts
    - src/__tests__/colorUtils.test.ts
    - src/__tests__/cadStore.paint.test.ts
  modified:
    - src/types/cad.ts (Wallpaper + Ceiling + CADSnapshot extensions)
    - src/stores/cadStore.ts (paint actions + snapshot safety)
    - vitest.config.ts (happy-dom, src/__tests__ include)
    - package.json + package-lock.json (react-colorful + happy-dom)
decisions:
  - paintStore has no idb-keyval — custom paints flow through cadStore snapshot for undo safety
  - vitest switched to happy-dom environment to fix Node 24 + jsdom 29 incompatibility
  - F&B catalog as static TypeScript data file (not in Zustand state)
  - customPaints and recentPaints accessed via (s as any) consistent with customElements pattern
metrics:
  duration: ~25 minutes
  completed: 2026-04-05
  tasks: 2 of 2
  files_created: 8
  files_modified: 4
  tests_added: 26
  tests_passing: 26
---

# Phase 18 Plan 01: Paint Data Foundation Summary

**One-liner:** TDD-complete paint data layer — PaintColor type, 132-entry Farrow & Ball catalog, cadStore-backed paintStore derived view, and resolvePaintHex utility with full snapshot/undo/redo safety.

## What Was Built

### Task 1: Types, Catalog, Store, Utility

- `src/types/paint.ts` — `PaintColor` interface (id, name, hex, source, hueFamily)
- `src/types/cad.ts` — Extended `Wallpaper` with `kind="paint"`, `paintId`, `limeWash`; extended `Ceiling` with `paintId`, `limeWash`; extended `CADSnapshot` with `customPaints` and `recentPaints`
- `src/data/farrowAndBall.ts` — 132 canonical F&B colors grouped into 7 hue families (WHITES, NEUTRALS, BLUES, GREENS, PINKS, YELLOWS, BLACKS)
- `src/stores/paintStore.ts` — Pure in-memory derived view that subscribes to `cadStore.customPaints`. No idb-keyval. Single source of truth is cadStore.
- `src/lib/colorUtils.ts` — `resolvePaintHex(paintId, customColors, fallback)` — resolves F&B ids first, then custom, then fallback `#f8f5ef`

### Task 2: cadStore Paint Extensions

- `snapshot()` — now includes `customPaints` and `recentPaints` in CADSnapshot
- `undo()` / `redo()` — restores `customPaints` and `recentPaints` from history
- `loadSnapshot()` — restores `customPaints` and `recentPaints` from saved project
- `addCustomPaint(item)` — pushes history, returns `custom_xxx` id
- `removeCustomPaint(id)` — pushes history, filters out by id
- `applyPaintToAllWalls(paintId, side)` — sets `kind="paint"` + `paintId` on all walls for given side, pushes 1 history entry, updates `recentPaints`
- `setWallpaper()` — now updates `recentPaints` when `kind === "paint"`
- `updateCeiling()` — now updates `recentPaints` when `changes.paintId` is provided

## Tests

| File | Tests | Status |
|------|-------|--------|
| src/__tests__/farrowAndBall.test.ts | 5 | All pass |
| src/__tests__/colorUtils.test.ts | 4 | All pass |
| src/__tests__/paintStore.test.ts | 3 | All pass |
| src/__tests__/cadStore.paint.test.ts | 14 | All pass |
| **Total** | **26** | **All pass** |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Node 24 + jsdom 29 incompatibility**

- **Found during:** Task 1 verification (RED phase)
- **Issue:** All tests failed with `ERR_REQUIRE_ASYNC_MODULE`. Node 24 changed how ESM modules with top-level await are handled, and jsdom 29 pulls in `@asamuzakjp/css-color` which is ESM-only. The vitest worker processes could not load jsdom.
- **Fix:** Installed `happy-dom` as replacement test environment. Updated `vitest.config.ts` to use `environment: "happy-dom"` and added `src/__tests__/**` to the include pattern.
- **Files modified:** `vitest.config.ts`, `package.json`
- **Impact:** All existing 114 tests pass. One pre-existing drag test (`SidebarProductPicker`) now fails due to happy-dom vs jsdom behavioral difference with `dataTransfer.effectAllowed` — logged to `deferred-items.md`. This test was untestable before (entire suite was broken).

## Known Stubs

None. All data flows are wired and functional. F&B catalog contains real hex values, paintStore subscribes to real cadStore state, resolvePaintHex resolves real colors.

## Self-Check: PASSED

Files exist:
- src/types/paint.ts: FOUND
- src/data/farrowAndBall.ts: FOUND
- src/stores/paintStore.ts: FOUND
- src/lib/colorUtils.ts: FOUND
- src/__tests__/farrowAndBall.test.ts: FOUND
- src/__tests__/paintStore.test.ts: FOUND
- src/__tests__/colorUtils.test.ts: FOUND
- src/__tests__/cadStore.paint.test.ts: FOUND

Commits:
- 65eeabd: Task 1 (types, catalog, paintStore, colorUtils)
- c7d1121: Task 2 (cadStore extensions)
