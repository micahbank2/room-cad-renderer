---
phase: 19-v1-2-polish-pass
plan: "01"
subsystem: canvas/selectTool
tags: [custom-elements, interaction, edit-handles, POLISH-01]
dependency_graph:
  requires: []
  provides: [custom-element-drag, custom-element-rotate, custom-element-resize]
  affects: [selectTool, fabricSync, cadStore]
tech_stack:
  added: []
  patterns: [history-boundary-drag, cast-to-product-shape, AABB-hit-test]
key_files:
  created: []
  modified:
    - src/stores/cadStore.ts
    - src/canvas/tools/selectTool.ts
    - src/canvas/fabricSync.ts
decisions:
  - Cast PlacedCustomElement as PlacedProduct for hitTestHandle/hitTestResizeHandle/getHandleWorldPos — both types share position/rotation/sizeScale shape so no runtime issue
  - hitTestStore returns type="product" for custom elements so existing drag/rotate/resize code paths apply with minimal branching
  - removeSelected now deletes from placedCustomElements and ceilings to prevent orphan references
metrics:
  duration_seconds: 127
  tasks_completed: 3
  tasks_total: 3
  files_modified: 3
  completed_date: "2026-04-06"
---

# Phase 19 Plan 01: Custom Element Edit Handles Summary

Custom elements placed on the 2D canvas now have full drag/rotate/resize interaction with purple accent handles, identical to placed products.

## What Was Built

Three coordinated changes add full edit handles to placed custom elements (POLISH-01):

**cadStore.ts** — 4 new actions:
- `rotateCustomElement` / `rotateCustomElementNoHistory` — push history or no-history rotate on `placedCustomElements[id].rotation`
- `resizeCustomElement` / `resizeCustomElementNoHistory` — push history or no-history resize with 0.1–10 clamp on `placedCustomElements[id].sizeScale`
- `removeSelected` now also deletes from `placedCustomElements` and `ceilings`

**selectTool.ts** — extended hit-test and interaction:
- `hitTestStore` gets a new AABB branch that checks `placedCustomElements` before ceilings; returns `type: "product"` so existing drag infrastructure applies
- `onMouseDown` now checks custom element rotation and resize handles when a custom element is selected (POLISH-01 block mirrors the product block)
- `onMouseMove` rotate branch checks `placedProducts` first, falls back to `placedCustomElements`, calls `rotateCustomElementNoHistory` accordingly
- `onMouseMove` resize branch does the same, calls `resizeCustomElementNoHistory` and shows live size tag
- Drag branch checks `placedProducts` first, calls `moveCustomElement` if no product found
- Drag offset computed from either `pp.position` or `pce.position`

**fabricSync.ts** — handle rendering:
- `renderCustomElements` now draws rotation handle (line + circle) and 4 corner resize handles when a custom element is selected (`selectedIds.length === 1`)
- Uses `getHandleWorldPos` and `getResizeHandles` via cast to `PlacedProduct` — shape is identical
- All handles use `#7c5bf0` accent, `#12121d` fill, matching product handle style

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | ffda6ce | Add rotateCustomElement, resizeCustomElement actions + fix removeSelected |
| 2 | 4ceb91d | Extend selectTool with custom element hit-test, drag, rotate, resize |
| 3 | 0fe4ffa | Render rotation and resize handles for selected custom elements in fabricSync |

## Deviations from Plan

None — plan executed exactly as written.

The cast pattern (`pce as unknown as PlacedProduct`) was used in both selectTool and fabricSync rather than creating a shared pick type — this is simpler and safe since both interfaces have identical `position`, `rotation`, and `sizeScale` fields.

## Known Stubs

None — all interactions are fully wired. Custom elements respond to click, drag, rotation handle, resize handles, and Delete key.

## Self-Check: PASSED

- `src/stores/cadStore.ts` — modified (grep: 8 matches for rotateCustomElement/resizeCustomElement)
- `src/canvas/tools/selectTool.ts` — modified (grep: 6 matches for placedCustomElements)
- `src/canvas/fabricSync.ts` — modified (grep: 2 matches for POLISH-01)
- `npm run build` — passes with no type errors
- Commits ffda6ce, 4ceb91d, 0fe4ffa all present in git log
