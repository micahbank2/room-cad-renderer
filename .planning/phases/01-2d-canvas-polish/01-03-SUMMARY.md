---
phase: 01-2d-canvas-polish
plan: 03
subsystem: 2d-canvas
tags: [edit-08, rotation, select-tool, canvas, history]
requirements: [EDIT-08]
dependency-graph:
  requires: [cadStore.placeProduct, useUIStore.selectedIds, fabric.js]
  provides: [rotationHandle module, rotateProductNoHistory action, rotation drag on selectTool]
  affects: [src/canvas/fabricSync.ts, src/canvas/tools/selectTool.ts, src/stores/cadStore.ts]
tech-stack:
  added: []
  patterns: [hand-rolled fabric hit-testing, single-source-of-truth geometry module, history-elided drag with boundary snapshot]
key-files:
  created:
    - src/canvas/rotationHandle.ts
  modified:
    - src/canvas/fabricSync.ts
    - src/canvas/tools/selectTool.ts
    - src/stores/cadStore.ts
    - tests/cadStore.test.ts
    - tests/rotationHandle.test.ts
decisions:
  - rotation-handle-module: single source of truth for handle world position shared by renderer and hit-tester
  - history-boundary-snapshot: call rotateProduct once on mousedown; then rotateProductNoHistory on every mousemove
  - handle-as-top-level-objects: draw line + circle outside product Group to avoid double-rotation with group.angle
metrics:
  duration: 3min
  tasks: 4
  files-modified: 5
  completed: 2026-04-05
---

# Phase 01 Plan 03: Product Rotation Handle Summary

Implemented EDIT-08: draggable rotation handle on single-selected products with 15-degree angle snap (Shift disables) and a single undo entry per drag gesture.

## What Shipped

- **`src/canvas/rotationHandle.ts`** — new module exporting `getHandleWorldPos`, `hitTestHandle`, `snapAngle`, `angleFromCenterToPointer`, plus `HANDLE_OFFSET_FT` (0.8) and `HANDLE_HIT_RADIUS_FT` (0.5) constants. This is the single source of truth for handle position — both the fabricSync renderer and the selectTool hit-test read from the same functions.
- **`src/stores/cadStore.ts`** — added `rotateProductNoHistory(id, angle)` action that updates rotation without calling `pushHistory`. Used by the mousemove branch of the rotate drag so we do not flood the 50-entry history stack during a continuous drag.
- **`src/canvas/fabricSync.ts`** — after rendering each product group, draws a 1px accent-purple line from product center to the handle position plus a 5px circle at the handle, but only when `isSelected && selectedIds.length === 1`. The line and circle are top-level Fabric objects (not group children) so they are not affected by the product's `angle` rotation.
- **`src/canvas/tools/selectTool.ts`** — extended `SelectState` with `"rotate"` drag type and `rotateInitialAngle`. On mousedown, the tool now hit-tests the handle BEFORE falling through to body drag. At rotation drag start it calls `rotateProduct` once with the current angle (the undo boundary). On mousemove it computes `angleFromCenterToPointer(pp.position, feet)`, snaps via `snapAngle(raw, shiftKey)`, and writes via `rotateProductNoHistory`.

## Key Patterns

**Single-source-of-truth geometry.** Both the renderer (fabricSync) and the hit-tester (selectTool) import `getHandleWorldPos` from `rotationHandle.ts`. If the handle visual is ever moved (different offset, different local axis) only one function changes and the hit-test follows automatically.

**History boundary via one-snapshot rotateProduct.** Classic continuous-drag history problem: if every mousemove called `rotateProduct`, a single gesture would push dozens of snapshots and blow out the 50-entry `MAX_HISTORY`. Solution: push ONE snapshot at mousedown by calling `rotateProduct(id, pp.rotation)` (angle unchanged, so snapshot captures pre-drag state), then switch to `rotateProductNoHistory` for every frame after. One Cmd+Z reverts the entire gesture.

**Handle-first hit-test.** The rotation handle sits 0.8ft above the product, OUTSIDE the product AABB. Hit-test order in `onMouseDown`: (1) if exactly one product is selected, test handle circle; if hit → start rotate drag and return. (2) Fall through to existing body/wall hit-test. This means the handle never competes with body selection because it is geometrically separate.

## Deviations from Plan

None — plan executed exactly as written. Note: `rotateProductNoHistory` was already present in HEAD at execution time because plan 04 (wall resize, running in parallel) also needed the action signature; my edits to `src/stores/cadStore.ts` and `tests/cadStore.test.ts` were redundant with their commit, so Task 1's deliverables were captured in commit `2bb5df0` rather than a dedicated 01-03 commit.

## Test Coverage

- `tests/rotationHandle.test.ts` — 4 unit tests: snap at 15deg thresholds, shift passthrough, handle world position at rotation=0 and rotation=90, hit-test inside/outside 0.5ft radius.
- `tests/cadStore.test.ts` — 2 unit tests: rotateProduct increments past length; rotateProductNoHistory does not.

All 26 tests across 6 files pass, 9 todos remain.

## Commits

- `b99e505` feat(01-03): add rotationHandle geometry and snap helpers (EDIT-08)
- `d5f2172` feat(01-03): render rotation handle for single-selected product (EDIT-08)
- `5122bc9` feat(01-03): add rotation drag to selectTool (EDIT-08)

Task 1 deliverables (rotateProductNoHistory + test) landed in `2bb5df0` via parallel plan 04 agent.

## Manual Verification Required

- Browser: place product → click to select → handle circle + line appear above product
- Drag handle in an arc → product rotates in 15deg steps
- Hold Shift while dragging → smooth free rotation
- Cmd+Z after drag → reverts entire gesture to pre-drag angle in ONE undo

## Self-Check

Files:
- FOUND: src/canvas/rotationHandle.ts
- FOUND: tests/rotationHandle.test.ts
- FOUND: src/canvas/fabricSync.ts (with rotation-handle block)
- FOUND: src/canvas/tools/selectTool.ts (with rotate drag)
- FOUND: src/stores/cadStore.ts (with rotateProductNoHistory)

Commits:
- FOUND: b99e505
- FOUND: d5f2172
- FOUND: 5122bc9

## Self-Check: PASSED
