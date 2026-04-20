---
phase: 25-canvas-store-performance
plan: 02
subsystem: canvas-interaction
tags: [perf, fabric, drag, fast-path, undo-redo, cleanup-revert]

# Dependency graph
requires:
  - phase: 25-canvas-store-performance
    provides: Wave 0 migration-gate tests (renderOnAddRemove, fast-path, drag-interrupt) RED to flip GREEN; structuredClone snapshot from Wave 1
  - phase: 24-tool-architecture-refactor
    provides: Cleanup-fn return contract — Wave 2 D-06 revert lands inside it
provides:
  - renderOnAddRemove disabled at FabricCanvas init; explicit renderAll/requestRenderAll only
  - selectTool fast path covering 4 D-03 drag operations
  - Closure-scoped dragPre cache (discriminated union: product / product-rotate / wall-move / wall-endpoint)
  - Drag-interrupt revert in cleanup fn (no store write on aborted drag)
affects: [25-03-wave3-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Drag fast path: cache pre-drag fabric transform on mouse:down, mutate fabric obj on mouse:move + requestRenderAll, commit single store action on mouse:up"
    - "Multi-polygon wall mutation via findWallFabricObjs() + applyWallShapeToFabric() — preserves live preview during wall-endpoint drag without touching the store"
    - "Cleanup-fn revert: dragging-flag guard + restore fabric transform from cached origLeft/origTop/origAngle (or origWall shape for walls)"

key-files:
  created: []
  modified:
    - src/canvas/FabricCanvas.tsx
    - src/canvas/tools/selectTool.ts

key-decisions:
  - "D-02 honored: renderOnAddRemove: false set at fabric.Canvas constructor; redraw() still ends in fc.renderAll() (unchanged); async image cache callbacks still call fc.renderAll() (unchanged)"
  - "D-03 honored: fast path scoped to exactly 4 operations — product move (incl. custom element move via same dragType), wall move, wall endpoint, product rotation. Custom element rotation, ceiling, opening, product-resize, wall-rotate, wall-thickness intentionally retain the existing NoHistory per-move path"
  - "D-04 honored: each fast-path drag commits exactly ONE history entry via the committing store action on mouse:up (moveProduct / moveCustomElement / updateWall / rotateProduct)"
  - "D-05 honored: mouse:move branches for the 4 fast-path drag types make ZERO calls to moveProduct, moveCustomElement, updateWall, updateWallNoHistory, rotateProduct, or rotateProductNoHistory"
  - "D-06 honored: cleanup fn checks 'dragging && dragPre' and reverts the fabric obj(s) to their pre-drag transform — product: left/top/angle reset; wall-move: per-obj left/top reset; wall-endpoint: polygon points rebuilt from origWall via applyWallShapeToFabric; product-rotate: angle reset"
  - "Closure convention preserved: zero new module-level state — all fast-path locals (dragPre + 4 lastDrag* caches + 5 helpers) live inside activateSelectTool's closure per Phase 24 D-07. The pre-existing _productLibrary module-level remains as the documented public-API exception."
  - "Wall fast-path scope tradeoff: live preview covers the 4 main wall polygon types (wall outline, wall-side A/B halves, wall-limewash A/B). Corner caps and opening polygons are not mutated during drag — they re-render normally on mouse:up commit. Acceptable per must_haves ('only the single Fabric object being dragged is mutated' interpreted at the wall-shape granularity, not multi-render-pipeline reproduction)."

requirements-completed: []  # PERF-01 flips complete in Wave 3 after Chrome DevTools evidence capture; Wave 2 just lands the code

# Metrics
duration: 6min
completed: 2026-04-20
---

# Phase 25 Plan 02: Wave 2 Drag Fast Path Summary

**Land the drag-only fast path per PERF-01 + D-01..D-06: renderOnAddRemove off, 4 drag types (product move incl. custom, wall move, wall endpoint, product rotation) bypass the store mid-drag and commit exactly once on mouseup, in-flight drags revert cleanly on tool switch — all 3 Wave 0 RED gate tests flip GREEN.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-20T03:09:31Z
- **Completed:** 2026-04-20T03:16Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- **Task 1:** `src/canvas/FabricCanvas.tsx` — added `renderOnAddRemove: false` to the fabric.Canvas constructor (D-02). Audit confirmed redraw() still ends with `fc.renderAll()`, the floor-plan bg `el.onload` still calls `fc.renderAll()`, and the product image cache callback in `fabricSync.ts` (line 870) still passes `() => fc.renderAll()` for async paint.
- **Task 2:** `src/canvas/tools/selectTool.ts` — implemented closure-scoped drag fast path for the 4 D-03 operations:
  - **Product move (incl. custom element)**: mouse:down caches the fabric group's `origLeft`/`origTop`/`origAngle` via `findProductFabricObj()`; mouse:move mutates `left`/`top` directly + `fc.requestRenderAll()`; mouse:up commits one `moveProduct` or `moveCustomElement`.
  - **Wall move**: mouse:down caches all wall fabric polygons (wall outline + wall-side A/B + wall-limewash A/B) via `findWallFabricObjs()` along with their `origLeft`/`origTop`; mouse:move translates all of them by `(dxPx, dyPx)` via `translateWallFabric()`; mouse:up commits one `updateWall({ start, end })`.
  - **Wall endpoint drag**: mouse:down caches the wall fabric polygons + `origWall { start, end, thickness }`; mouse:move recomputes pixel corners via `wallCorners()` + `wallPxCorners()` and rewrites each polygon's `points` array via `applyWallShapeToFabric()`; mouse:up commits one `updateWall({ start })` or `updateWall({ end })`.
  - **Product rotation**: mouse:down caches the fabric group's `origAngle`; mouse:move sets `angle: next` via the existing `snapAngle()` pipeline + `fc.requestRenderAll()`; mouse:up commits one `rotateProduct(id, finalRotation)`.
- **Cleanup-fn revert (D-06):** if `dragging && dragPre` at cleanup-time, the fabric object(s) are restored to their pre-drag transform and the store is NOT touched. Product: `set({ left, top, angle })`. Wall-move: per-obj `set({ left, top })`. Wall-endpoint: `applyWallShapeToFabric()` with `origWall`. Product-rotate: `set({ angle })`.
- **Out-of-scope drag types preserved:** custom element rotation, ceiling, opening (slide/resize), product-resize, wall-rotate, wall-thickness all continue to use their existing NoHistory per-move path with seed-history on mouse:down — exactly as before. Zero behavior change for any drag operation outside D-03.

## Closure-State Shape Added (DragPre union)

```typescript
type WallFabricCache = {
  fabricObj: fabric.Object;
  origLeft: number;
  origTop: number;
  type: string; // "wall" | "wall-side" | "wall-limewash" | "wall-limewash-b"
  side?: "A" | "B";
};

type DragPre =
  | { kind: "product"; id: string; fabricObj: fabric.Object | null;
      origLeft: number; origTop: number; origAngle: number }
  | { kind: "product-rotate"; id: string; isCustom: boolean;
      fabricObj: fabric.Object | null; origAngle: number }
  | { kind: "wall-move"; id: string; fabricObjs: WallFabricCache[];
      origWall: { start: Point; end: Point; thickness: number } }
  | { kind: "wall-endpoint"; id: string; endpoint: "start" | "end";
      fabricObjs: WallFabricCache[];
      origWall: { start: Point; end: Point; thickness: number } };

let dragPre: DragPre | null = null;
let lastDragFeetPos: Point | null = null;
let lastDragRotation: number | null = null;
let lastDragWallStart: Point | null = null;
let lastDragWallEnd: Point | null = null;
```

## Mouse:Up Commit Map

| dragPre.kind     | mouse:up call (final values from lastDrag* caches)                          | Result    |
|------------------|------------------------------------------------------------------------------|-----------|
| `product` (real) | `useCADStore.getState().moveProduct(id, lastDragFeetPos)`                    | 1 history |
| `product` (cust) | `useCADStore.getState().moveCustomElement(id, lastDragFeetPos)`              | 1 history |
| `wall-move`      | `useCADStore.getState().updateWall(id, { start, end })`                      | 1 history |
| `wall-endpoint`  | `useCADStore.getState().updateWall(id, { start })` or `{ end }`              | 1 history |
| `product-rotate` | `useCADStore.getState().rotateProduct(id, lastDragRotation)`                 | 1 history |

## Mouse:Move — Zero Store Writes for the 4 Fast-Path Drag Types

```bash
# Searched the mouse:move body (between `const onMouseMove` and `const onMouseUp`):
# - 0 calls to moveProduct
# - 0 calls to moveCustomElement
# - 0 calls to updateWall (all routed through dragPre + applyWallShapeToFabric)
# - 0 calls to updateWallNoHistory in product/wall/wall-endpoint/rotate branches
# - 0 calls to rotateProduct
# - 0 calls to rotateProductNoHistory in the rotate branch (only rotateCustomElementNoHistory remains for the custom-element rotate fallback path)
# - 0 calls to fc.clear()
# - 1+ call to fc.requestRenderAll() inside each of the 4 fast-path branches
```

The `*NoHistory` calls that remain in mouse:move (product-resize / wall-thickness / opening-slide / opening-resize / wall-rotate / custom element rotate) are out of D-03 scope and intentionally preserved.

## Red→Green Transitions

| Test                                                                          | Before Wave 2 | After Wave 2 |
|-------------------------------------------------------------------------------|---------------|--------------|
| `tests/fabricSync.test.ts` — "renderOnAddRemove disabled"                     | RED           | GREEN        |
| `tests/fabricSync.test.ts` — "fast path does not clear canvas during drag"    | RED           | GREEN        |
| `tests/toolCleanup.test.ts` — "drag interrupted by tool switch"               | RED           | GREEN        |
| `tests/cadStore.test.ts` — "drag produces single history entry"               | GREEN         | GREEN        |
| `tests/cadStore.test.ts` — "wall drag produces single history entry"          | GREEN         | GREEN        |

## Task Commits

1. **Task 1: renderOnAddRemove: false at FabricCanvas init** — `10622c9` (perf)
2. **Task 2: Drag fast path for 4 D-03 operations in selectTool.ts** — `fa6233f` (perf)

## Files Created/Modified

- `src/canvas/FabricCanvas.tsx` — +1 line: `renderOnAddRemove: false` constructor option (D-02)
- `src/canvas/tools/selectTool.ts` — +342 / -37 net:
  - DragPre union + 4 lastDrag* caches + 5 helpers (`findProductFabricObj`, `findWallFabricObjs`, `wallPxCorners`, `applyWallShapeToFabric`, `translateWallFabric`)
  - Mouse:down rewrites for product / wall / wall-endpoint / product-rotate (cache pre-drag state, removed seed-history calls)
  - Mouse:move rewrites for the 4 fast-path branches (mutate fabric obj + requestRenderAll, no store writes)
  - Mouse:up extension (single committing store action via lastDrag* caches)
  - Cleanup-fn extension (D-06 revert before listener-detach)
- Added import: `wallCorners` from `@/lib/geometry` (alongside existing `wallLength`)

## Baseline + Delta

| Metric           | Baseline (Wave 1) | After Wave 2 | Delta |
|------------------|-------------------|--------------|-------|
| Total tests      | 185               | 185          | 0     |
| Passing          | 173               | 176          | +3    |
| Failing          | 9                 | 6            | -3    |
| Todo             | 3                 | 3            | 0     |

Delta breakdown:
- +3 GREEN: renderOnAddRemove disabled, fast-path no-clear, drag-interrupt revert
- -3 RED: same 3 tests removed from failing column
- 6 remaining failures are all pre-existing and outside Phase 25 footprint (3× AddProductModal, 2× SidebarProductPicker, 1× productStore — all confirmed unchanged from Wave 0/1 baseline)

Bundle verification:
- `npm run build` succeeds in 247ms
- `npx tsc --noEmit` clean (only pre-existing tsconfig baseUrl deprecation warning)

## Manual Smoke (D-12 style — operator-confirmable)

The runtime test suite passes. The plan's manual smoke checklist (`window.__cadSeed(50, 30)` → drag product/wall/endpoint/rotation → confirm smooth + single Ctrl+Z + clean revert on tool switch) is the next gate; Wave 3 captures the Chrome DevTools Performance trace as the authoritative evidence per D-10. Wave 2 ships the code only.

Predicted manual smoke behavior based on the implementation:
1. Drag product → fabric group's left/top updates per frame, store stays quiet, smooth at 60fps; release → one `moveProduct` commit; Ctrl+Z → product returns to pre-drag position in one undo step.
2. Press W mid-drag → cleanup() fires → product fabric group's left/top reset to dragPre.origLeft/origTop; no commit reaches the store; Ctrl+Z has nothing to undo.
3. Drag wall endpoint → polygon points reshape per frame; release → one `updateWall({ start })` or `{ end }` commit; Ctrl+Z returns endpoint.
4. Use product rotation handle → fabric group's angle updates per frame; release → one `rotateProduct` commit; Ctrl+Z returns angle.

## Decisions Made

- **D-02 (renderOnAddRemove off):** confirmed via Wave 0 source-level test going GREEN. No layer-invisibility regression — every existing async paint callback still explicitly calls `fc.renderAll()`.
- **D-03 (4-operation scope):** preserved exactly. Custom element rotation kept on the old NoHistory path; ceiling drag kept on `updateCeilingNoHistory`; opening drags kept on `updateOpeningNoHistory`; product-resize kept on `resizeProductNoHistory`; wall-rotate kept on `rotateWallNoHistory`; wall-thickness kept on `updateWallNoHistory`. Each was verified via grep against the mouse:move body.
- **D-04 (single commit per drag):** mouse:up commit branch matches dragPre.kind exactly once. The previous "seed-history on mouse:down" pattern (which paired with `*NoHistory` per-move calls to produce one undo step) is replaced for the 4 fast-path types by a "no-write on mouse:down + commit on mouse:up" pattern. Net history shape is identical: one entry per completed drag.
- **D-05 (zero store writes mid-drag):** verified by grep. All `*NoHistory` calls inside the 4 fast-path branches were deleted; the only store reads inside those branches are `useUIStore.getState()` for grid snap, which is not a store write.
- **D-06 (cleanup revert):** in addition to the listener-detach code from Phase 24, the cleanup fn now reverts fabric transforms before nulling state. The revert distinguishes the 4 dragPre kinds and applies the correct undo: product → set left/top/angle; product-rotate → set angle; wall-move → per-obj set left/top; wall-endpoint → applyWallShapeToFabric with origWall.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Wall fast-path covers all visible polygon types, not just one**

- **Found during:** Task 2 design.
- **Issue:** The plan's example showed `dragPre.fabricObj.set({...})` as if each drag had a single fabric object. But walls render as 2-5 separate Fabric polygons (outline, side A half, side B half, optional limewash A/B, plus corner caps that are not keyed to wallId). Mutating only one of them would leave the others stale during the drag — visible flicker / split-shape rendering.
- **Fix:** Introduced `findWallFabricObjs()` to return ALL polygons matching `data.wallId === id` for the 4 main types (`"wall"`, `"wall-side"`, `"wall-limewash"`, `"wall-limewash-b"`). The `wall-move` fast-path translates all of them; `wall-endpoint` rebuilds polygon points on each via `applyWallShapeToFabric()` which replicates the half-polygon midStart/midEnd math from `fabricSync.ts:275-297`. Corner caps (no wallId) and opening polygons (different wallId-bearing data) are not mutated mid-drag — they re-render correctly on mouse:up's normal redraw path. This is consistent with the must_haves clause "only the single Fabric object being dragged is mutated" interpreted at the wall-shape level (the wall is a single logical object made of multiple fabric polygons).
- **Files modified:** `src/canvas/tools/selectTool.ts` — `findWallFabricObjs`, `wallPxCorners`, `applyWallShapeToFabric`, `translateWallFabric` helpers added.
- **Verification:** Wave 0 source tests do not check this directly; runtime correctness will be verified by Wave 3 manual smoke. Tradeoff documented in key-decisions above.
- **Committed in:** `fa6233f`
- **Impact on plan:** Zero scope creep; necessary to make wall fast-path produce correct visual output. Without this, a wall drag would look broken even though the source-level tests pass.

**2. [Rule 1 - Bug] Product rotation handle scope: real products only**

- **Found during:** Task 2 implementation of mouse:down.
- **Issue:** The existing `dragType === "rotate"` branch handles both real placed products AND custom elements. Plan's D-03 scope is "product rotation" (singular) and the guardrail explicitly excludes "custom element rotation". If I caught both with the fast path, custom element rotation would commit via `rotateProduct(id, ...)` which would fail because the id isn't in `placedProducts`.
- **Fix:** Cache `dragPre = { kind: "product-rotate", ... }` ONLY when the rotation is on a real placed product (`if (pp && ...)` branch). For custom element rotation, skip the dragPre cache and let the existing seed-history + NoHistory per-move path handle it (unchanged). Mouse:move and mouse:up branches both check `dragPre?.kind === "product-rotate"` AND `pp` to apply the fast path; otherwise they fall through to the legacy `rotateCustomElementNoHistory` path.
- **Files modified:** `src/canvas/tools/selectTool.ts` — mouse:down rotate branch + mouse:move rotate branch.
- **Verification:** Manual smoke would confirm; runtime tests do not exercise this distinction directly. Consistent with D-03 scope guardrail.
- **Committed in:** `fa6233f`
- **Impact on plan:** Zero — strict adherence to D-03's explicit "do not extend to custom element rotation" guardrail.

### Auth Gates

None.

## Acceptance Criteria — Final Check

- [x] `src/canvas/FabricCanvas.tsx` contains `"renderOnAddRemove: false"` (Task 1)
- [x] `src/canvas/FabricCanvas.tsx` still contains `fc.renderAll()` (line 158, unchanged)
- [x] `src/canvas/tools/selectTool.ts` contains literal `fc.requestRenderAll()` (multiple, in mouse:move + cleanup branches)
- [x] `src/canvas/tools/selectTool.ts` contains literal `dragPre`
- [x] `src/canvas/tools/selectTool.ts` mouse:move block does NOT call `moveProduct` or `moveCustomElement` (only mouse:up commit branch references them)
- [x] `src/canvas/tools/selectTool.ts` does NOT declare any new `const state = {...}` at module scope (preserved Phase 24 closure convention; only pre-existing `_productLibrary` module-level remains, documented as the public-API exception)
- [x] `npm test -- tests/fabricSync.test.ts -t "renderOnAddRemove disabled"` exits 0 (was RED)
- [x] `npm test -- tests/fabricSync.test.ts -t "fast path does not clear"` exits 0 (was RED)
- [x] `npm test -- tests/toolCleanup.test.ts -t "drag interrupted by tool switch"` exits 0 (was RED)
- [x] `npm test -- tests/cadStore.test.ts -t "drag produces single history entry"` exits 0
- [x] `npm test -- tests/cadStore.test.ts -t "wall drag produces single history entry"` exits 0
- [x] `npm test -- tests/toolCleanup.test.ts` — all existing Phase 24 listener-leak tests STILL pass (no regression to cleanup contract)
- [x] Full `npm test`: 168 pre-existing passing preserved; 176 passing total = 168 + 4 Wave 0 greens + 1 Wave 1 green + 3 Wave 2 greens. Pre-existing 6 failures unchanged. 3 todo unchanged.
- [x] `npm run build` succeeds; tsc clean (modulo pre-existing baseUrl deprecation warning)

## Issues Encountered

- None beyond the two auto-fixed deviations documented above.

## Known Stubs

- None. The implementation is complete. All 4 fast-path drag types fully wire mouse:down cache → mouse:move fabric mutation → mouse:up commit → cleanup revert. Out-of-scope drag types (custom rotate, ceiling, opening, resize, wall-rotate, wall-thickness) intentionally retain their pre-existing NoHistory paths per D-03.

## Next Phase Readiness

- **Wave 3 (verification):** All PERF-01 code is now landed. Wave 3 captures the manual evidence bundle per D-10:
  - Chrome DevTools Performance trace at 50W/30P showing zero >16.7ms frames during a 5-second drag.
  - `window.__cadBench(100)` before/after ratio for snapshot timing (PERF-02 from Wave 1).
  - Once both pieces of evidence are captured, REQUIREMENTS.md PERF-01 and PERF-02 flip from `[ ]` to `[x]` and the phase is closed.

---

## Self-Check: PASSED

File existence:
- `src/canvas/FabricCanvas.tsx` — FOUND (contains `renderOnAddRemove: false`)
- `src/canvas/tools/selectTool.ts` — FOUND (contains `dragPre`, `fc.requestRenderAll()`, `findProductFabricObj`, `findWallFabricObjs`, `applyWallShapeToFabric`, `translateWallFabric`)

Commits:
- `10622c9` — Task 1 perf commit — VERIFIED in `git log --oneline -5`
- `fa6233f` — Task 2 perf commit — VERIFIED in `git log --oneline -5`

Test contract:
- 3 Wave 0 RED tests now GREEN — VERIFIED via individual `npm test -t` runs above
- 173 → 176 passing (+3) — VERIFIED via full `npm test` run
- 6 pre-existing failures unchanged — VERIFIED (3 AddProductModal, 2 SidebarProductPicker, 1 productStore)

Build hygiene:
- `npm run build` succeeds — VERIFIED
- `npx tsc --noEmit` clean — VERIFIED (only pre-existing baseUrl warning)

---
*Phase: 25-canvas-store-performance*
*Completed: 2026-04-20*
