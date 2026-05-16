---
phase: 91-alignment-collision
plan: 01
subsystem: 2d-canvas-snap
tags: [snap, alignment, columns, stairs, smart-snap, phase-30-extension]
requires:
  - "Phase 30 smart-snap engine (src/canvas/snapEngine.ts)"
  - "Phase 86 columns (RoomDoc.columns; Column type with rotated AABB)"
  - "Phase 60 stairs (RoomDoc.stairs; Stair bottom-step-center semantics)"
provides:
  - "SceneGeometry.objectCenters: Point[] field"
  - "computeSnap emits object-center axis targets (priority 3)"
  - "buildSceneGeometry collects columns + stairs into scene"
  - "selectTool drag handler wires columns into smart-snap path"
  - "__driveDragProduct + __driveDragColumn test-mode drivers"
affects:
  - "src/canvas/snapEngine.ts"
  - "src/canvas/tools/selectTool.ts"
  - "src/main.tsx"
  - "src/test-utils/dragDrivers.ts"
tech-stack:
  added: []
  patterns:
    - "4-tier priority ladder for snap-target tiebreak"
    - "TARGET-only entity scene contribution (stairs)"
    - "Identity-check StrictMode cleanup for test-mode globals (CLAUDE.md §7)"
key-files:
  created:
    - "tests/snapEngine.objectCenters.test.ts"
    - "tests/e2e/specs/91-alignment-collision.spec.ts"
    - "src/test-utils/dragDrivers.ts"
  modified:
    - "src/canvas/snapEngine.ts"
    - "src/canvas/tools/selectTool.ts"
    - "src/main.tsx"
decisions:
  - "Stair UP convention for rotation=0 is +Y; rotated UP = (-sin θ, cos θ) — verified by Test 5 fixture"
  - "object-center targets fire on CENTER sources only (symmetric to midpoint guard) — center-to-center is the intent"
  - "Column.position IS bbox center (Phase 86 D-02) so no offset math is needed for columns, unlike stairs"
metrics:
  duration_minutes: 18
  tasks: 3
  files_modified: 6
  tests_added: 10
  commits:
    - e4c1368 (RED tests)
    - e00876c (snapEngine GREEN)
    - 99939bf (selectTool wiring + drag drivers)
completed: 2026-05-15
requirements: [ALIGN-91-01, ALIGN-91-02, ALIGN-91-03]
---

# Phase 91 Plan 01: Object-center alignment + columns/stairs in snap scene — Summary

Phase 30's smart-snap engine extended with object-center axis targets, columns wired in as snap source AND target, stairs wired in as snap target only. Closes the Phase 85 D-02 center-snap deferral and reverses the Phase 86 D-08a column-skip stair-precedent. Pure-engine extension + drag-handler wiring + unit + e2e coverage. 3 atomic commits, 10 new tests GREEN, 0 vitest regressions.

## What shipped

**Engine layer (`src/canvas/snapEngine.ts`):**
- `SceneGeometry.objectCenters: Point[]` field added.
- `buildSceneGeometry` accepts new `RoomDoc.columns` + `RoomDoc.stairs` slots and pushes each entity's bbox AND bbox center into the scene. Helper `pushBBoxAndCenter` keeps the two arrays in lockstep.
- Stair bbox-center math: `Stair.position` is bottom-step center per `cad.ts:160`. The bbox center is offset along the rotation-implied UP direction by `depth/2`. UP convention for rotation=0 is **+Y** (verified by RED Test 5 fixture: stair at (5,5) with 12 steps × 11" runIn produces bbox-center (5, 10.5)). Rotated UP = `(-sin θ, cos θ)`.
- `computeSnap` emits `object-center` axis targets on BOTH X and Y for each scene object.
- Priority ladder renumbered to 4 tiers per D-05: `midpoint(4) > object-center(3) > object-edge(2) > wall-face(1)`. `object-center` targets only fire on CENTER sources (symmetric to the existing midpoint guard) — center-to-center alignment is the semantic intent.

**Drag-handler layer (`src/canvas/tools/selectTool.ts`):**
- Cached-scene gating at `:976` extended from `product|ceiling` to `product|ceiling|column`.
- `isSmartSnapTarget` at `:1454` extended to include `"column"`.
- `bboxKind` union widened to `"product" | "ceiling" | "custom-element" | "column"`; column branch added to `computeDraggedBBox` using `axisAlignedBBoxOfRotated(pos, col.widthFt, col.depthFt, col.rotation, id)`.
- Column drag branch at `:1497-1510` rewritten: D-08a stair-precedent skip comment **removed** (verified: `git grep "D-08a stair-precedent" src/canvas/tools/selectTool.ts` returns nothing). `snapped` now reflects the smart-snap result before being passed to `moveColumnNoHistory`. Phase 25/86 single-undo invariant preserved (one history entry per drag).

**Test surface:**
- `tests/snapEngine.objectCenters.test.ts` — 8 unit tests covering ALIGN-91-01 X+Y, D-05 priority (center beats edge at equal distance), ALIGN-91-03 column scene contribution + center-snap, D-04 stair bbox-center offset + center-X/Y snap. All GREEN after Task 2.
- `tests/e2e/specs/91-alignment-collision.spec.ts` — 2 Playwright specs covering ALIGN-91-01 e2e (product B → A center-X) and ALIGN-91-03 e2e (column → product center-X). Both GREEN.
- `src/test-utils/dragDrivers.ts` — installs `__driveDragProduct` + `__driveDragColumn` via the standard StrictMode-safe install/identity-check-cleanup pattern (CLAUDE.md §7); registered in `src/main.tsx` alongside the existing test drivers. Production tree-shakes via `import.meta.env.MODE === "test"`.

## Final priority ladder ordering

D-05 confirmed without surprises:
```
priority 4 = midpoint        (only on CENTER sources; both axes coupled)
priority 3 = object-center   (NEW Phase 91; only on CENTER sources)
priority 2 = object-edge     (Phase 30)
priority 1 = wall-face       (Phase 30)
```

Test 3 (`tests/snapEngine.objectCenters.test.ts`) deliberately constructs an equal-distance race (dragged center-X 10.02 → target center 10 is 0.02 away; dragged left-edge 9.52 → target right-edge 9.5 is also 0.02 away). The `priority > best.priority` comparison wins for `object-center` (3) over `object-edge` (2), producing `snapped.x === 10` (center alignment) rather than 9.98 (edge alignment). No tiebreak surprises.

## Stair bbox-center math — UP direction

For rotation=0, stair extends from bottom-step center into +Y in 2D feet (matches Phase 60 render convention — stair symbol grows "upward" on the 2D plan). Rotated UP vector: `(-sin θ, cos θ)`. Test 5 fixture (rotation=0, position (5,5), 12 steps × 11" runIn) produces bbox `{minX: 3.5, maxX: 6.5, minY: 5, maxY: 16}` and center `(5, 10.5)` — verified by RED→GREEN cycle.

## Test drivers installed

`src/test-utils/dragDrivers.ts` exports `installDragDrivers(): () => void` following the established Phase 86 columnDrivers / Phase 85 numericInputDrivers pattern:
1. Gated on `import.meta.env.MODE === "test"`.
2. Registers `window.__driveDragProduct` + `window.__driveDragColumn` (typed via `declare global`).
3. Returns a cleanup function with identity check (`if (window.__driveDragProduct === driveProduct) window.__driveDragProduct = undefined`) — StrictMode double-mount safe per CLAUDE.md §7.

Registered in `src/main.tsx:52-53` alongside `installColumnDrivers`, `installStairDrivers`, etc. Production tree-shakes via the dead-code-elimination on the `MODE !== "test"` early-return.

## Regression sweep results

- **Vitest:** 1145 tests passing, 0 regressions (baseline 1145 → 1145). 11 `todo`. 33 environment errors in `pickerMyTexturesIntegration.test.tsx` and other WebGL-touching tests are pre-existing jsdom WebGL-renderer baseline failures, unrelated to Phase 91.
- **E2E `--grep "snap|column|fit-to-screen|pan|theme"`:** Baseline = 6 failures (37 + 6 = 43 specs). With Phase 91 = 3 failures (39 + 3 = 42 specs). Net: **3 specs that were previously failing now PASS** (incidental Phase 79 window-presets improvement from the snap engine — `picking 'Wide' chip then clicking wall places a 4ft window`, `clicking 'Custom' chip reveals W/H/Sill numeric inputs`, `POLISH-03 (#196) — light-mode borders meet WCAG 3:1`). 3 remaining failures are pre-existing baseline issues already documented (`Phase 79 P03 SUMMARY.md` TooltipProvider harness, `Phase 88 deferred-items.md` chromium getComputedStyle oklch literal). **No new failures introduced.**

## Hand-off note for Plan 91-02

Plan 91-02 (object-vs-object collision detection, refuse-mode) plugs into the same drag handler this plan just touched. Exact integration points:

- **`src/canvas/tools/selectTool.ts:1450-1475`** — after the `snapped` value is computed by `computeSnap`. Plan 91-02 should:
  1. Build `draggedBBoxAtSnapped = computeDraggedBBox(dragId, bboxKind, snapped)` — note: NOT at `targetPos`. Collision must check the post-snap position to avoid snap-into-collision.
  2. Call `wouldCollide(draggedBBoxAtSnapped, cachedScene.objectBBoxes)` (the new `src/canvas/objectCollision.ts` module). Note: `cachedScene.objectBBoxes` already excludes the dragged id (D-02b), so no exclude-self filter needed.
  3. If `hits.length > 0`: refuse this frame. Set `snapped = lastDragFeetPos ?? targetPos` (roll back to last valid position). Skip the `dragPre.fabricObj.set({...})` call OR pass the rolled-back coords. Phase 30 PERF-01 fast-path is preserved either way — Fabric stays at its previous frame position.
  4. Critical ordering: snap fires first, THEN collision (lines 1450-1473 are snap; collision check belongs at line 1474 BEFORE the `if (dragType === ...) { dragPre.fabricObj.set(...) }` branch at line 1485+).

- **`isSmartSnapTarget` at `:1454-1457`** is the right gate for collision too — products, ceilings, columns all participate. Same condition.

- **Alt-key behavior (D-07 / Phase 30):** Alt disables smart-snap (grid-only). **Collision MUST NOT respect Alt** — collision is a hard constraint, Alt is a snap convenience. Plan 91-02 should run collision regardless of `altHeld`.

- **History invariant:** No new history entries from collision. Refuse = no store write this frame. The existing drag-start `update*(id, {})` empty history push is the only history entry per drag (unchanged).

- **`__driveDragProduct` / `__driveDragColumn` drivers** (this plan) can be extended in Plan 91-02 with a `__getCollisionRefused()` getter or similar if Plan 91-02 wants e2e visibility into the refuse decision. Otherwise the existing positional assertion (`pB.position` doesn't move when overlap would occur) is enough.

## Deviations from Plan

**1. [Plan-spec match] Added `installDragDrivers` registration in `src/main.tsx`**
- **Reason:** Plan Task 3 action (f) said "install in test-mode-only code via the existing `import.meta.env.MODE === "test"` gate pattern". The repo's actual convention (Phase 60+) is to register install functions in `src/main.tsx` alongside other `install*Drivers()` calls. Followed established convention.

**2. [Plan-spec match] Used `useProductStore.getState().products` for the product library lookup in dragDrivers**
- **Reason:** Plan implementation hints suggested test driver may need closure-captured productLibrary. The repo has a dedicated `useProductStore` (`src/stores/productStore.ts`) which is the canonical source. Cleaner than reaching into selectTool internals.

## Self-Check: PASSED

- [x] `src/canvas/snapEngine.ts` — exists, modified, `objectCenters` field present.
- [x] `src/canvas/tools/selectTool.ts` — exists, modified, no `D-08a stair-precedent` comment (`git grep "D-08a stair-precedent" src/canvas/tools/selectTool.ts` returns empty).
- [x] `tests/snapEngine.objectCenters.test.ts` — exists, 8 tests, all GREEN.
- [x] `tests/e2e/specs/91-alignment-collision.spec.ts` — exists, 2 specs, both GREEN.
- [x] `src/test-utils/dragDrivers.ts` — exists, exports `installDragDrivers`.
- [x] `src/main.tsx` — modified, registers `installDragDrivers()`.
- [x] Commits exist: `e4c1368`, `e00876c`, `99939bf` (verified via `git log --oneline -5`).
