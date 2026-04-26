---
phase: 48-per-node-saved-camera-focus-action-cam-04
plan: 01
subsystem: test-scaffold
tags: [tdd, red-phase, saved-camera, cam-04]
dependency_graph:
  requires: []
  provides: [savedCameraDrivers, savedCameraSet, cadStore.savedCamera.test, PropertiesPanel.savedCamera.test, RoomsTreePanel.savedCamera.test, saved-camera-cycle.spec]
  affects: [cadStore, uiStore, PropertiesPanel, RoomsTreePanel, ThreeViewport]
tech_stack:
  added: []
  patterns: [tdd-red-scaffold, self-contained-test-seed, window-driver-pattern]
key_files:
  created:
    - src/test-utils/savedCameraDrivers.ts
    - src/components/RoomsTreePanel/savedCameraSet.ts
    - src/stores/__tests__/cadStore.savedCamera.test.ts
    - src/components/__tests__/PropertiesPanel.savedCamera.test.tsx
    - src/components/__tests__/RoomsTreePanel.savedCamera.test.tsx
    - e2e/saved-camera-cycle.spec.ts
  modified: []
decisions:
  - "Tests are self-contained: each inlines its own seed via useCADStore.setState() — no cross-plan helpers (WARNING-3)"
  - "RoomsTreePanel test uses canonical IDs wall_with_cam/wall_no_cam/pp_with_cam/pp_no_cam materialized inline (WARNING-4)"
  - "__getCameraPose declared in savedCameraDrivers.ts for compile-time correctness but NOT installed there — ThreeViewport installs it in Plan 02 Task 3 (orbitControlsRef locality)"
  - "__getActiveProductIds stub declared + installed (BLOCKER-2): e2e can find a valid product id without hardcoding seed shape"
metrics:
  duration_minutes: 6
  completed_date: "2026-04-26"
  tasks_completed: 3
  files_created: 6
  files_modified: 0
---

# Phase 48 Plan 01: TDD Red Scaffold — Saved Camera Drivers + Test Suite Summary

Wave 0 RED scaffold for CAM-04. Created 6 files: 2 source stubs + 3 Vitest test files + 1 Playwright e2e spec. All tests fail as expected (RED baseline). Plans 02 + 03 turn them GREEN without editing these files.

## Files Created

| File | Purpose |
|------|---------|
| `src/test-utils/savedCameraDrivers.ts` | Window driver declarations + stub impls (throw "unimplemented") |
| `src/components/RoomsTreePanel/savedCameraSet.ts` | buildSavedCameraSet stub returning empty Set<string>() |
| `src/stores/__tests__/cadStore.savedCamera.test.ts` | 9 tests: D-04 no-history, D-03 type fields, WARNING-6 round-trip |
| `src/components/__tests__/PropertiesPanel.savedCamera.test.tsx` | 8 tests: D-09/D-11 save/clear buttons, verbatim tooltips |
| `src/components/__tests__/RoomsTreePanel.savedCamera.test.tsx` | 7 tests: D-07 leaf-only icon, D-02 double-click, WARNING-4 IDs |
| `e2e/saved-camera-cycle.spec.ts` | 2 Playwright tests: save+focus round-trip, reload persistence |

## RED Baseline

- `cadStore.savedCamera.test.ts`: 9 failed — `setSavedCameraOnWallNoHistory is not a function` (store actions not yet added; Plan 02 adds them)
- `PropertiesPanel.savedCamera.test.tsx`: 6 failed, 2 passed — assertion failures (no save-camera-btn in DOM; Plan 03 adds it)
- `RoomsTreePanel.savedCamera.test.tsx`: 3 failed, 4 passed — assertion failures (icon/double-click not wired; Plan 03 wires them)
- `e2e/saved-camera-cycle.spec.ts`: discoverable (`npx playwright test --list` exits 0), RED at runtime until Plans 02+03

## Contract Compliance

- **WARNING-3 (self-contained tests):** Confirmed — `grep -c "seedTestRoom\|import.*seed.*from" src/stores/__tests__/cadStore.savedCamera.test.ts` returns 0
- **WARNING-4 (canonical IDs):** `wall_with_cam`, `wall_no_cam`, `pp_with_cam`, `pp_no_cam` seeded inline in RoomsTreePanel test
- **WARNING-6 (round-trip):** `JSON.parse(JSON.stringify(rooms))` assertion in cadStore test verifies savedCameraPos/Target survive serialization
- **BLOCKER-2 (__getActiveProductIds):** Declared in Window interface + stub installed by `installSavedCameraDrivers()`
- **BLOCKER-2 (__getCameraPose):** Declared in Window interface (declaration-only); ThreeViewport installs the body in Plan 02 Task 3

## Confirmation: Source Files Untouched

- `main.tsx` — UNTOUCHED (Plan 03 wires `installSavedCameraDrivers()` call)
- `cadStore.ts` — UNTOUCHED (Plan 02 adds NoHistory actions)
- `uiStore.ts` — UNTOUCHED (Plan 02 adds getCameraCapture bridge)
- `types/cad.ts` — UNTOUCHED (Plan 02 adds savedCameraPos/savedCameraTarget to type interfaces)
- `PropertiesPanel.tsx` — UNTOUCHED (Plan 03 adds save/clear buttons)
- `TreeRow.tsx` — UNTOUCHED (Plan 03 adds hasSavedCamera prop + Camera icon)
- `RoomsTreePanel.tsx` — UNTOUCHED (Plan 03 wires buildSavedCameraSet + onDoubleClickRow)
- `focusDispatch.ts` — UNTOUCHED

## Commits

| Hash | Message |
|------|---------|
| 830c80f | chore(48-01): source-file stubs at canonical paths (savedCameraDrivers + savedCameraSet) |
| bb88435 | test(48-01): RED vitest scaffolds for Phase 48 savedCamera (3 self-contained test files) |
| 86a1135 | test(48-01): Playwright e2e spec stub for saved-camera save+focus+reload cycle (CAM-04) |

## Deviations from Plan

None — plan executed exactly as written. The `__getCameraPose` grep count of 2 (vs plan's expected 1) is a non-issue: both occurrences are in the `declare global` block and a JSDoc comment — neither is an install body, which is the actual constraint.

## Known Stubs

| Stub | File | Behavior |
|------|------|---------|
| `installSavedCameraDrivers` stub bodies | `savedCameraDrivers.ts` | Throw "unimplemented — Plan 48-03 wires this" |
| `buildSavedCameraSet` | `savedCameraSet.ts` | Returns `new Set<string>()` — Plan 03 fills body |

Both stubs are intentional RED scaffold — not bugs. Plan 03 fills all bodies.

## Self-Check: PASSED
