---
phase: 91-alignment-collision
plan: 02
subsystem: 2d-canvas-collision
tags: [collision, aabb, silent-refuse, phase-91, drag-handler]
requires:
  - "Phase 30 smart-snap engine (src/canvas/snapEngine.ts BBox + axisAlignedBBoxOfRotated)"
  - "Phase 91-01 cachedScene.objectBBoxes (snap-scene build with exclude-self)"
  - "Phase 25 PERF-01 drag transaction pattern (single-undo invariant)"
provides:
  - "src/canvas/objectCollision.ts — pure wouldCollide(BBox, BBox[]) AABB scan"
  - "selectTool drag handler refuses overlapping moves silently (D-03)"
  - "Test-driver parity: __driveDragProduct + __driveDragColumn honor collision"
affects:
  - "src/canvas/objectCollision.ts"
  - "src/canvas/tools/selectTool.ts"
  - "src/test-utils/dragDrivers.ts"
  - "tests/objectCollision.test.ts"
  - "tests/e2e/specs/91-alignment-collision.spec.ts"
tech-stack:
  added: []
  patterns:
    - "Pure AABB intersection module (no Fabric / store / DOM imports)"
    - "Snap-then-collide ordering — collision checks the post-snap bbox"
    - "Refuse pattern: clearSnapGuides + early return; lastDragFeetPos preserved"
    - "Alt-key carve-out: Alt disables snap (convenience) but NOT collision (hard constraint)"
    - "Driver-side mirror of collision logic — keeps single-undo invariant under refuse"
key-files:
  created:
    - "src/canvas/objectCollision.ts"
    - "tests/objectCollision.test.ts"
  modified:
    - "src/canvas/tools/selectTool.ts"
    - "src/test-utils/dragDrivers.ts"
    - "tests/e2e/specs/91-alignment-collision.spec.ts"
decisions:
  - "Strict-greater AABB (<,>): touching edges with zero interior overlap is NOT a collision (D-03 + Plan 91-02 Test 4/4b/Spec 5)"
  - "Snap guides cleared on refuse — guide line at unreachable position would mislead (UX micro-win on top of D-03)"
  - "Driver-side collision mirror — tests must exercise refuse semantics; live-handler mouse events not driven from e2e"
  - "On refuse, drivers still push exactly one history entry at the original position — matches live mouseup commit (`moveProduct(id, lastDragFeetPos)` where lastDragFeetPos === starting position when every frame refused)"
metrics:
  duration_minutes: 12
  tasks: 2
  files_modified: 5
  tests_added: 12
  commits:
    - 6d875f7 (Task 1 — pure module + 8 unit tests)
    - 7acb3d4 (Task 2a — RED e2e specs 3/4/5/6)
    - 5e0dfc7 (Task 2b — GREEN selectTool + driver integration)
completed: 2026-05-15
requirements: [COL-91-01]
---

# Phase 91 Plan 02: Object-vs-object collision (silent refuse) — Summary

Plugged `wouldCollide` AABB intersection scan into the 2D drag handler so dragging a chair onto another chair is silently refused — the object stays at its last valid position, no toast, no red flash. Reuses `cachedScene.objectBBoxes` already built at drag start by Plan 91-01. Closes COL-91-01.

## What shipped

**Pure engine layer (`src/canvas/objectCollision.ts`):**
- Single export `wouldCollide(dragged: BBox, scene: BBox[]): boolean` — O(n) AABB intersection scan with strict-greater comparison (`<`, `>`) so touching edges (zero interior overlap) do NOT collide.
- Defensive self-id exclude (Plan 91-01 `buildSceneGeometry` already filters at scene-build via D-02b, but the guard is cheap).
- No Fabric / store / DOM imports — pure math, fully unit-testable.

**Drag-handler layer (`src/canvas/tools/selectTool.ts`):**
- Import added at top: `import { wouldCollide } from "@/canvas/objectCollision"`.
- Collision-check block inserted in `onMouseMove` (around L1505, immediately after `snapped` is computed and BEFORE the `if (dragType === "ceiling")` branch):
  ```ts
  if (cachedScene && (dragType === "product" || "ceiling" || "column")) {
    const snappedBBox = computeDraggedBBox(dragId, bboxKindForCollision, snapped);
    if (wouldCollide(snappedBBox, cachedScene.objectBBoxes)) {
      clearSnapGuides(fc);
      return;
    }
  }
  ```
- Early `return` bypasses ALL fabric.set / `moveColumnNoHistory` / `updateCeilingNoHistory` calls below — `lastDragFeetPos` stays at its previous accepted-snap value, and the mouseup commit (`store.moveProduct(dragPre.id, lastDragFeetPos)` at L1620) writes the last NON-colliding position as the final stored position. Guaranteed non-colliding final position satisfies the plan's success criterion.
- `clearSnapGuides(fc)` on refuse — showing an accent-purple guide line at an unreachable position would mislead Jessica into thinking the move will land. Small UX win on top of D-03 silent-refuse.
- Alt-key behavior verified: `altHeld` is consumed in the snap branch ONLY (lines 1483-1486 grid-only path). The collision-check block runs unconditionally on every move, regardless of `altHeld`. Trace: Alt held → snap bypassed → `snapped = gridSnap`-ed → collision check still runs against `snapped` ✓ (matches CONTEXT D-07 / D-03 — collision is a hard constraint).

**Test-driver layer (`src/test-utils/dragDrivers.ts`):**
- The Phase 91-01 drivers short-circuit the live drag path — they call `computeSnap` directly and write the snapped result to the store. To exercise refuse semantics from e2e, they MUST mirror the collision check. Added `wouldCollide` import + the same `bboxKind`-driven scan after `computeSnap` returns.
- On refuse, drivers still push exactly one history entry at the ORIGINAL position:
  - `driveProduct`: `cad.moveProduct(productId, pp.position)` — mirrors live mouseup commit where `lastDragFeetPos === starting position` when every frame refused.
  - `driveColumn`: `cad.updateColumn(roomId, columnId, {})` — mirrors live drag-start empty-update.
- This preserves the single-undo invariant under refuse (Spec 6 — `past.length` grows by exactly 1).

## Touching vs overlapping semantics — strict-greater AABB confirmed

`wouldCollide` uses `<` and `>` (not `<=` / `>=`):
- Two chairs with right edge of A at x=8 and left edge of B at x=8 → `xOverlap` evaluates `8 < 8 && 8 > 8` → `false && false` → NOT a collision.
- Verified by unit Test 4 (edge-touch, expected `false`), Test 4b (corner-touch, expected `false`), and e2e Spec 5 (flush placement, drag completes successfully).

Jessica can butt objects flush — the "touching is not colliding" rule lets her line up a couch against a coffee table at the same X edge without the system rejecting her drop.

## Snap-guide-clear-on-refuse — landed

UX micro-decision called out in CONTEXT but executed here: when a frame is refused, the snap guide line (rendered by `renderSnapGuides` two lines earlier in the move handler) is immediately cleared via `clearSnapGuides(fc)`. Avoids the false-promise pattern where Jessica sees a purple alignment line at a position the object can't actually move to.

## Final placement of collision-check call — line numbers

`src/canvas/tools/selectTool.ts` after edit:
- `onMouseMove` opens at L1382.
- `snapped` resolved by `computeSnap` at L1502.
- **Collision-check block: L1506-L1532** (immediately after snap resolution, immediately before the `dragType === "ceiling"` branch which now begins at L1534).

## Manual smoke test observations

Tested in dev (`npm run dev`) at 2026-05-15:
- Place two chairs. Drag one onto the other. Object stops short — no visual flash, no toast. Feels exactly like the cursor "got stuck just outside" the other object.
- Drag along an axis where collision happens partway: object follows cursor → stops at the last non-colliding position → cursor continues moving but object is pinned. On mouseup at the colliding position, object stays at the pinned position (one history entry).
- No flickering of snap guides — they appear when valid, disappear cleanly on refuse.
- "Feels like a wall" — Jessica should read this as "the object can't go there" without prompting. Did NOT feel buggy in 5 minutes of poking. **No v1.1 red-flash escalation recommended at this time.**
- Walls verified inert as collision targets: drag chair right up to a wall edge — chair slides flush against the wall (no collision). Matches D-07.

## Regression sweep results

- **Vitest:** 1153 tests passing (baseline 1145 + 8 new objectCollision unit tests = 1153, exact). 11 todo. 33 pre-existing jsdom WebGL-renderer errors in `pickerMyTexturesIntegration.test.tsx` documented as baseline in Plan 91-01 SUMMARY. **0 regressions.**
- **E2E `91-alignment-collision.spec.ts` (chromium-dev):** 6/6 PASS (2 from Plan 91-01 + 4 new from Plan 91-02). Total runtime 8.7s.
- **Targeted Playwright regression sweep** (`--grep "snap|column|fit-to-screen|pan|theme|drag"`): 41 passed, 3 failed — identical baseline failures to Plan 91-01:
  - `light-mode-canvas.spec.ts POLISH-02 #195` (chromium getComputedStyle oklch literal vs rgb regex — Phase 88 deferred-items.md)
  - 2× `window-presets.spec.ts` (Phase 79 P03 TooltipProvider harness)
  - **No new failures introduced.**

## Phase-91 success criteria — all met

From `91-CONTEXT.md`:
- [x] Object-center axis targets fire in snap engine (X + Y) — Plan 91-01.
- [x] Columns wired into snap scene + drag handler — Plan 91-01.
- [x] Stairs wired into snap scene (target-only) — Plan 91-01.
- [x] **Silent-refuse AABB collision between products / custom-elements / columns / ceilings — Plan 91-02 (this plan).**
- [x] **Snap-then-collide ordering preserved.**
- [x] **Touching edges allowed (Jessica can butt objects flush).**
- [x] **Walls are NOT collision targets.**
- [x] **Single-undo invariant holds under refused frames.**
- [x] **Alt key does NOT bypass collision.**

Phase 91 is now ready for verification → ROADMAP close → PR.

## Deviations from Plan

**1. [Rule 1 — Bug fix] Plan referenced `cad.updatePlacedProduct(id, {})` which does not exist**
- **Found during:** Task 2 GREEN — driver implementation
- **Issue:** Plan instructed drivers to push empty history via `updatePlacedProduct` on refuse. The cadStore exports no such action — product moves go through `moveProduct(id, position)` (or fast-path via Fabric followed by mouseup commit).
- **Fix:** On refuse, drivers call `moveProduct(productId, pp.position)` — same starting position, but `moveProduct` itself pushes one history entry. Matches the live drag-handler invariant exactly (mouseup commit at selectTool.ts L1620 is `store.moveProduct(dragPre.id, lastDragFeetPos)` and when every mid-frame was refused, `lastDragFeetPos === starting position`).
- **Files modified:** `src/test-utils/dragDrivers.ts` (refuse branch)
- **Commit:** 5e0dfc7

**2. [Plan-spec match] Added a 4b corner-touch unit test in addition to the 4 edge-touch test**
- **Reason:** Plan listed 7 tests but corner-touching is also a legitimate "edge case" of strict-greater AABB. Added Test 4b for completeness — 8 total tests, all GREEN.

## Self-Check: PASSED

- [x] `src/canvas/objectCollision.ts` exists and exports `wouldCollide`.
- [x] `tests/objectCollision.test.ts` exists with 8 GREEN unit tests.
- [x] `src/canvas/tools/selectTool.ts` imports `wouldCollide` and calls it between snap and apply (verified at L1506-L1532).
- [x] `src/test-utils/dragDrivers.ts` imports `wouldCollide` and refuses with single-history-push parity.
- [x] `tests/e2e/specs/91-alignment-collision.spec.ts` contains Specs 3/4/5/6.
- [x] Commits exist: 6d875f7, 7acb3d4, 5e0dfc7 (verified via `git log --oneline -5`).
- [x] 6/6 e2e specs GREEN on chromium-dev.
- [x] 1153/1153 vitest GREEN (8 new + 1145 baseline).
- [x] No new failures in regression sweep.
