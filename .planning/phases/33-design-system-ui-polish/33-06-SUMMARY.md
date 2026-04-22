---
phase: 33-design-system-ui-polish
plan: 06
subsystem: ui/floating-toolbar
tags: [ui, toolbar, selection, 2d-canvas, glass-panel]
dependency_graph:
  requires: [uiStore, selectTool, cadStore.placeProduct, cadStore.removeProduct, cadStore.removeWall, cadStore.removePlacedCustomElement, useReducedMotion]
  provides: [FloatingSelectionToolbar, uiStore.isDragging, uiStore.setDragging]
  affects: [FabricCanvas mount, selectTool drag bridge]
tech_stack:
  added: []
  patterns: [D-07 bridge pattern (try/catch wrapped store calls), Phase 25 PERF-01 preservation, glass-panel overlay]
key_files:
  created:
    - src/components/ui/FloatingSelectionToolbar.tsx
  modified:
    - src/stores/uiStore.ts
    - src/canvas/tools/selectTool.ts
    - src/canvas/FabricCanvas.tsx
decisions:
  - D-10 scope preserved: 2D only; 3D deferred to backlog
  - D-11 lucide Copy + Trash2 (per Phase 33 icon policy D-33)
  - D-13 drag-hide via uiStore.isDragging bridge — mirrors D-07 setPendingProduct pattern
  - D-40 candidate noted: duplicate resets rotation to 0 (MVP) — placeProduct has no rotation arg
  - Wall + custom-element duplicate deferred; Phase 33 ships only placed-product duplicate
metrics:
  duration_min: 12
  completed_date: 2026-04-22
---

# Phase 33 Plan 06: Floating Selection Toolbar Summary

Added a glass-panel mini-toolbar that floats above selected objects in the 2D Fabric canvas with Duplicate and Delete buttons, wired to existing cadStore actions for single-undo semantics. Hides during drag via a new `uiStore.isDragging` bridge set from `selectTool`.

## What Shipped

- **`src/stores/uiStore.ts`** — added `isDragging: boolean` + `setDragging(v)` action next to the existing interaction-state flags. Default `false`.
- **`src/canvas/tools/selectTool.ts`** — added `setDragging(true/false)` bridge calls at all 6 `_dragActive = …` toggle sites (drag-start at 803, onMouseDown tail sync at 887, edge-resize at 932, onMouseUp clear at 1234, onMouseUp final at 1294, cleanup at 1613). Each call is wrapped in `try/catch` matching the D-07 bridge style. Module-local `_dragActive` is preserved (still powers Phase 25 PERF-01 fast path).
- **`src/components/ui/FloatingSelectionToolbar.tsx`** — new component:
  - Subscribes to `uiStore.selectedIds` + `uiStore.isDragging`; visibility = `selectedIds.length >= 1 && !isDragging && pos !== null`.
  - Positions itself above `fc.getActiveObject().getBoundingRect()` with an 8px gap (`--spacing-sm`), flips below if `top < 0`, clamps `left` to wrapper bounds.
  - Recompute is bound to `selection:created`, `selection:updated`, `selection:cleared`, `object:modified`, `after:render` (the last covers pan/zoom since redraws fire it).
  - Duplicate handler uses `placeProduct(original.productId, {x+0.5, y+0.5})` for placed products; walls and custom elements silently no-op in Phase 33 MVP.
  - Delete handler branches on id prefix: `pp_` → `removeProduct`, `wall_` → `removeWall`, else → `removePlacedCustomElement`. Each cadStore action pushes one history entry → single-undo preserved.
  - Uses `glass-panel rounded-lg px-2 py-1 flex items-center gap-2 z-20` styling per UI-SPEC.
  - Lucide `Copy` and `Trash2` at 14px per D-11; hover: `bg-accent/20 text-accent-light` for Duplicate, `bg-error/20 text-error` for Delete.
  - Transition guarded by `useReducedMotion()` (Plan 03).
  - Test driver `__driveFloatingToolbar` installed only when `import.meta.env.MODE === "test"`.
- **`src/canvas/FabricCanvas.tsx`** — imported and mounted `<FloatingSelectionToolbar fc={fcRef.current} wrapperRef={wrapperRef} />` inside the existing `relative` wrapper (no new wrapper needed — the existing div already has `relative` + `overflow-hidden`).

## Deviations from Plan

**None substantive.** Plan combined Task 2 (stubbed handlers) and Task 3 (wire handlers) into a single commit since the handlers are short and verbatim from the plan's pre-researched action block. Tests and build pass unchanged.

## Known Stubs / Scope Limitations

- **Rotation resets on Duplicate (D-40 candidate):** `placeProduct` creates a new placement with `rotation: 0`. Duplicating a rotated product produces an unrotated copy. Documented as a Phase 34+ escalation candidate — Phase 33 ships MVP semantics per plan scope discipline.
- **Duplicate for walls:** no-op. Users can re-draw a wall. No scope budget in Phase 33.
- **Duplicate for custom elements:** no-op. There is no `placeProduct` analog for custom-element placements verified within Plan 06's research budget. Follow-up candidate.
- **3D floating toolbar:** out of scope per D-10. Should be tracked as a separate GH issue if pursued.

## Verification

- `npx vitest run tests/phase33/floatingToolbar.test.ts` → 4/4 tests GREEN (component file exists, Copy + Trash2 referenced, uiStore exports isDragging + setDragging, selectTool calls setDragging).
- `npm run build` → succeeds, no new warnings.
- Other Phase 33 tests unchanged: gestureChip failures are Plan 07's territory (expected per parallel plan boundaries documented in the prompt).

## Commits

- `1a35442` feat(33-06): add uiStore isDragging bridge for selectTool
- `9b00f56` feat(33-06): add FloatingSelectionToolbar (GH #85)

Closes #85.

## Self-Check: PASSED

- [x] `src/components/ui/FloatingSelectionToolbar.tsx` exists
- [x] `src/stores/uiStore.ts` contains `isDragging` + `setDragging`
- [x] `src/canvas/tools/selectTool.ts` contains `setDragging` (6 call sites) + preserves `_dragActive`
- [x] `src/canvas/FabricCanvas.tsx` imports + mounts `FloatingSelectionToolbar`
- [x] Commits `1a35442` and `9b00f56` present in `git log`
- [x] `tests/phase33/floatingToolbar.test.ts` → 4/4 GREEN
- [x] `npm run build` → succeeds
