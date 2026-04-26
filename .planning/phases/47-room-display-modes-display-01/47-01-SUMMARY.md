---
phase: 47-room-display-modes-display-01
plan: "01"
subsystem: display-modes
tags: [tdd, red-scaffolding, wave-0, display-modes]
dependency_graph:
  requires: []
  provides: [display-mode-test-contract, RoomGroup-stub, displayModeDrivers-stub]
  affects: [47-02, 47-03]
tech_stack:
  added: []
  patterns: [TDD-RED-stub, window-driver-gated-test, playwright-spec-stub]
key_files:
  created:
    - src/test-utils/displayModeDrivers.ts
    - src/three/RoomGroup.tsx
    - src/__tests__/uiStore.displayMode.test.ts
    - src/three/__tests__/ThreeViewport.displayMode.test.tsx
    - src/components/__tests__/Toolbar.displayMode.test.tsx
    - e2e/display-mode-cycle.spec.ts
  modified: []
decisions:
  - "Pre-existing tsc --noEmit exit code 2 (TypeScript 6 baseUrl deprecation) is out-of-scope — existed before this plan"
  - "Toolbar test uses correct Props interface (viewMode + onViewChange + onHome + onFloorPlanClick)"
metrics:
  duration: "~3 minutes"
  completed: "2026-04-26"
  tasks_completed: 3
  tasks_total: 3
  files_created: 6
  files_modified: 0
---

# Phase 47 Plan 01: Wave 0 RED Scaffolding Summary

Wave 0 RED stubs for Phase 47 DISPLAY-01. All 6 files created at canonical paths from 47-VALIDATION.md. TDD RED baseline established for Plans 02 + 03.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Source-file stubs | bb38fe7 | src/test-utils/displayModeDrivers.ts, src/three/RoomGroup.tsx |
| 2 | Vitest RED test files | 09d78f2 | src/__tests__/uiStore.displayMode.test.ts, src/three/__tests__/ThreeViewport.displayMode.test.tsx, src/components/__tests__/Toolbar.displayMode.test.tsx |
| 3 | Playwright E2E spec | b9c3ef2 | e2e/display-mode-cycle.spec.ts |

## Files Created

### Source Stubs (Plans 02 + 03 fill)

- **src/test-utils/displayModeDrivers.ts** — `installDisplayModeDrivers()` with `window.__driveDisplayMode` / `window.__getDisplayMode` declared on Window; bodies throw "Plan 47-02 wires this". Mirrors `treeDrivers.ts` pattern exactly.
- **src/three/RoomGroup.tsx** — `RoomGroup` returns null; `computeRoomOffsets()` returns `{}`. Exports the contract Plans 02 + 03 implement against.

### Vitest Test Files (RED baseline)

- **src/__tests__/uiStore.displayMode.test.ts** — 8 tests: displayMode default, setDisplayMode setter, localStorage write (gsd:displayMode), hydration from localStorage, garbage-value fallback, missing-key default, cadStore isolation guarantee. All RED (setDisplayMode not in uiStore yet).
- **src/three/__tests__/ThreeViewport.displayMode.test.tsx** — 5 active tests + 4 todos: D-03 NORMAL (all zeros), EXPLODE cumulative-sum with concrete assertions (0, 25.0, 40.0, 37.5, 12.5), SOLO (all zeros), empty-rooms, insertion-order. All RED (computeRoomOffsets returns `{}`).
- **src/components/__tests__/Toolbar.displayMode.test.tsx** — 9 tests: 3-button render for 3d/split, zero buttons for 2d, click-to-setDisplayMode, aria-pressed active/inactive, D-09 class tokens verbatim (bg-accent/10, text-accent, border-accent/30), D-09 tooltip strings verbatim, lucide svg presence, aria-label matching. All RED (buttons not in Toolbar yet).

### Playwright Spec

- **e2e/display-mode-cycle.spec.ts** — 3 tests: NORMAL→EXPLODE→SOLO→NORMAL cycle (aria-pressed + __getDisplayMode driver), D-05 persistence (reload restores SOLO), D-05 garbage-value (BLAHBLAH → NORMAL). `npx playwright test --list` exits 0 (6 variants discovered across 2 projects).

## RED Baseline

| File | Tests | Status | Failure type |
|------|-------|--------|--------------|
| uiStore.displayMode.test.ts | 8 | RED | setDisplayMode missing from uiStore |
| ThreeViewport.displayMode.test.tsx | 5 active | RED | computeRoomOffsets returns {} not expected values |
| Toolbar.displayMode.test.tsx | 9 | RED | buttons missing from Toolbar |
| display-mode-cycle.spec.ts | 3 (6 variants) | RED (runtime) | buttons + driver not wired |

## Deviations from Plan

### Pre-existing issue (out-of-scope)
**tsc --noEmit exits 2** — TypeScript 6 deprecation of `baseUrl` option causes `error TS5101` exit code 2. This was present before Plan 01 (confirmed via git stash). No new type errors introduced. Out of scope per deviation boundary rule.

## Known Stubs

None that block this plan's goal. All stubs are intentional Wave 0 RED scaffolding — Plans 02 + 03 fill them.

## Self-Check: PASSED

- [x] src/test-utils/displayModeDrivers.ts exists
- [x] src/three/RoomGroup.tsx exists
- [x] src/__tests__/uiStore.displayMode.test.ts exists
- [x] src/three/__tests__/ThreeViewport.displayMode.test.tsx exists
- [x] src/components/__tests__/Toolbar.displayMode.test.tsx exists
- [x] e2e/display-mode-cycle.spec.ts exists
- [x] Commits bb38fe7, 09d78f2, b9c3ef2 verified in git log
- [x] Playwright --list exits 0 (3 tests / 6 variants)
- [x] All vitest files RED with assertion failures (not import errors)
