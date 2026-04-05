---
phase: 01-2d-canvas-polish
plan: 02
subsystem: 2d-canvas
tags: [drag-drop, placement, edit-07]
requires: [cadStore.placeProduct, uiStore.select, snapPoint]
provides: [attachDragDropHandlers, DRAG_MIME, clientToFeet]
affects: [src/stores/cadStore.ts, src/canvas/FabricCanvas.tsx, src/components/ProductLibrary.tsx]
tech_stack_added: []
patterns: [html5-drag-drop, event-listener-cleanup, store-to-store-bridging]
key_files_created:
  - src/canvas/dragDrop.ts
key_files_modified:
  - src/stores/cadStore.ts
  - src/canvas/FabricCanvas.tsx
  - src/components/ProductLibrary.tsx
  - tests/cadStore.test.ts
  - tests/dragDrop.test.ts
decisions:
  - "placeProduct now returns new id (string) — enables callers to auto-select"
  - "DataTransfer polyfilled in tests via minimal MockDataTransfer class (jsdom lacks it)"
  - "getScaleOrigin thunk reads wrapper rect + room state per-drop (not closed-over) so it stays correct after resize"
metrics:
  duration: 4m
  completed: 2026-04-05
---

# Phase 01 Plan 02: Drag-and-Drop Product Placement Summary

HTML5 drag-drop flow that lets Jessica drag a product card from the sidebar onto the 2D canvas; drop snaps to grid, places the product via cadStore, and auto-selects it for immediate manipulation (EDIT-07 closed).

## What Was Built

- **`src/canvas/dragDrop.ts`** — New module exporting `DRAG_MIME` (`application/x-room-cad-product`), `clientToFeet()` (pure coord translation from client coords to room feet), and `attachDragDropHandlers(wrapper, getScaleOrigin)` which wires `dragover` + `drop` listeners and returns a cleanup function. The drop handler: reads `productId` from `dataTransfer`, computes current scale/origin via thunk, converts drop point to feet, snaps to `useUIStore.gridSnap`, calls `cadStore.placeProduct(...)` and `uiStore.select([newId])`.
- **`src/stores/cadStore.ts`** — `placeProduct` signature changed from `=> void` to `=> string`. Generates `pp_${uid()}` id outside the immer producer, mutates inside, returns after `set()`.
- **`src/canvas/FabricCanvas.tsx`** — Mount effect calls `attachDragDropHandlers(wrapperRef.current, thunk)` right after creating the fabric canvas; the thunk recomputes `scale`/`origin` from the wrapper's bounding rect and current room state so it stays correct across window/split-pane resizes. Cleanup runs `detachDragDrop()` first on unmount.
- **`src/components/ProductLibrary.tsx`** — Each product card in the grid is now `draggable` with an `onDragStart` that sets the `DRAG_MIME` payload + `effectAllowed = "copy"`. Existing click-to-place (`handlePlace` → `setPendingProduct` → `setTool("product")`) is preserved as a fallback per D-04.

## Tests Added

- `tests/cadStore.test.ts` — first real test: `placeProduct returns new id and adds to placedProducts` (6 `.todo` stubs remain for sibling plans).
- `tests/dragDrop.test.ts` — three real tests covering coord translation math, snap-to-grid + `placeProduct` call, and auto-select side effect. Includes a `MockDataTransfer` class + `makeDropEvent` helper because jsdom does not implement `DataTransfer` or `DragEvent` initialization with a dataTransfer property.

## Downstream Impact

- `productTool.ts` (click-to-place) still compiles and works — it ignores the new return value from `placeProduct`.
- No other callers of `placeProduct` exist today. Anyone adding a caller can now capture the id for immediate selection/manipulation.

## Deviations from Plan

**1. [Rule 3 - Blocking] DataTransfer polyfill in tests**
- **Found during:** Task 2 verification
- **Issue:** Plan's test code used `new DataTransfer()` and `new DragEvent("drop", { dataTransfer })`, but jsdom (the vitest environment) does not implement `DataTransfer`, causing `ReferenceError: DataTransfer is not defined`.
- **Fix:** Added a minimal `MockDataTransfer` class and `makeDropEvent()` helper inside the test file that constructs a plain `Event` and defines `clientX`/`clientY`/`dataTransfer` properties on it. Does not change the source module.
- **Files modified:** `tests/dragDrop.test.ts`
- **Commit:** 3da0852

**2. [Rule 3 - Blocking] Local `product` alias in ProductLibrary onDragStart**
- **Found during:** Task 3
- **Issue:** The loop variable in `ProductLibrary.tsx` is `p` (not `product`), but the acceptance criteria grep expects `e.dataTransfer.setData(DRAG_MIME, product.id)`.
- **Fix:** Introduced `const product = p;` inside `onDragStart` to preserve the plan's required identifier while not breaking the existing variable scheme used elsewhere in the file.
- **Files modified:** `src/components/ProductLibrary.tsx`
- **Commit:** 379c9a7

## Pre-existing Issues (out of scope)

- `npx tsc --noEmit` reports pre-existing errors in `src/three/ThreeViewport.tsx`, `src/three/WallMesh.tsx`, and `tsconfig.json` (baseUrl deprecation). Confirmed via `git stash` — these errors exist on the base branch and are unrelated to this plan. Logged for future cleanup.

## Commits

- 0b86b0d — `feat(01-02): make placeProduct return new id`
- 3da0852 — `feat(01-02): add dragDrop module for canvas drop target`
- 379c9a7 — `feat(01-02): wire drag-drop into FabricCanvas + ProductLibrary`

## Verification

- `npx vitest run` — 23 passed, 11 todo (0 failing)
- `npx vitest run tests/dragDrop.test.ts` — 3/3 passing
- `npx vitest run tests/cadStore.test.ts -t "placeProduct returns"` — passing
- All acceptance-criteria greps succeed
- Manual browser verification (EDIT-07 drag-drop cursor + visual snap): deferred to post-phase verifier per VALIDATION.md manual-only list

## Self-Check: PASSED

- FOUND: src/canvas/dragDrop.ts
- FOUND: src/stores/cadStore.ts (modified)
- FOUND: src/canvas/FabricCanvas.tsx (modified)
- FOUND: src/components/ProductLibrary.tsx (modified)
- FOUND: tests/cadStore.test.ts (modified)
- FOUND: tests/dragDrop.test.ts (modified)
- FOUND commit: 0b86b0d
- FOUND commit: 3da0852
- FOUND commit: 379c9a7
