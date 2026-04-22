---
phase: 33-design-system-ui-polish
plan: 07
subsystem: ui/gesture-chip
tags: [ui, affordance, onboarding, glass-panel, 2d-canvas, 3d-viewport, localStorage]
dependency_graph:
  requires: [uiStore.isDragging, uiPersistence.readUIBool, uiPersistence.writeUIBool, lucide-react.X]
  provides: [GestureChip]
  affects: [FabricCanvas mount, ThreeViewport mount]
tech_stack:
  added: []
  patterns: [Plan 04 ui:* localStorage namespace, Plan 06 uiStore.isDragging bridge, DOM overlay sibling of R3F Canvas, test driver gating via import.meta.env.MODE]
key_files:
  created:
    - src/components/ui/GestureChip.tsx
  modified:
    - src/canvas/FabricCanvas.tsx
    - src/three/ThreeViewport.tsx
decisions:
  - D-15 dismiss persists via localStorage "ui:gestureChip:dismissed" (boolean)
  - D-16 copy variants — 2D "Drag to pan • Wheel to zoom" / 3D "L-drag rotate • R-drag pan • Wheel zoom"
  - D-17 → UI-SPEC Conflict Note — inset 8px (bottom-2 left-2, --spacing-sm) supersedes earlier 12px
  - D-18 hide during uiStore.isDragging — consumes Plan 06 bridge, no new wiring
  - 3D mount is a DOM overlay sibling of the R3F Canvas (not inside the 3D scene) per plan <interfaces> note
  - Bullet character encoded as \u2022 in source so test regex can match literal "Drag to pan" / "L-drag rotate" fragments
metrics:
  duration_min: 4
  completed_date: 2026-04-22
---

# Phase 33 Plan 07: Gesture Chip Summary

Persistent, dismissible glass-panel chip in the bottom-left of both 2D and 3D viewports that teaches Jessica the pan/zoom/rotate gestures. Dismiss persists across reloads; chip hides during 2D drags by reusing the Plan 06 `uiStore.isDragging` bridge.

## What Shipped

- **`src/components/ui/GestureChip.tsx`** — new component with a `mode: "2d" | "3d"` prop:
  - 2D copy: `Drag to pan  •  Wheel to zoom`
  - 3D copy: `L-drag rotate  •  R-drag pan  •  Wheel zoom`
  - Subscribes to `useUIStore(s => s.isDragging)` and local `dismissed` state hydrated once from `readUIBool("ui:gestureChip:dismissed")`.
  - Visibility: `!dismissed && !isDragging` (returns `null` otherwise — no wasted DOM).
  - Dismiss button uses lucide `X` at 10px with `aria-label="Dismiss gesture hint"` for a11y.
  - Styling per UI-SPEC: `glass-panel rounded-lg px-2 py-1 flex items-center gap-2 text-text-dim font-mono text-sm absolute bottom-2 left-2 z-10 pointer-events-auto`. `z-10` deliberately below the Plan 06 floating toolbar (`z-20`).
  - `data-gesture-chip-mode` attribute on the container enables the `__driveGestureChip` test driver without breaking semantics.
  - Test driver (`isVisible`, `getMode`, `dismiss`, `getPersistedDismissed`) is gated behind `import.meta.env.MODE === "test"` so it never ships to production.
- **`src/canvas/FabricCanvas.tsx`** — imported `GestureChip` and mounted `<GestureChip mode="2d" />` inside the existing `relative` wrapper, right after the Plan 06 `<FloatingSelectionToolbar>`. Plan 06 mount preserved verbatim.
- **`src/three/ThreeViewport.tsx`** — imported `GestureChip` and mounted `<GestureChip mode="3d" />` as a DOM sibling of the R3F `<Canvas>` inside the existing `bg-obsidian-deepest relative` parent div. Not inside the R3F tree — stays pure DOM.

## Deviations from Plan

**None.** Both tasks executed verbatim from the plan's action blocks. Tests GREEN on first run, production build succeeds without warnings beyond the pre-existing chunk-size advisory.

## Known Stubs / Scope Limitations

- **3D orbit drag doesn't hide the chip.** `uiStore.isDragging` is set only by the 2D `selectTool` (Plan 06 bridge). While the user rotates in the 3D viewport with OrbitControls, the chip remains visible. This is acceptable per D-18 scope — 3D orbit is a distinct interaction and the chip is small/dismissible. File a follow-up if user feedback calls it noisy; wiring `dragging-changed` from `OrbitControls` through `useUIStore.getState().setDragging(...)` would be the fix.
- **No animation on dismiss.** The chip simply returns `null` when dismissed. No fade-out. Dismiss is a one-time terminal action, so polish here is low-value.

## Verification

- `npm test -- --run tests/phase33/gestureChip.test.ts` → 4/4 passed
- `npm test -- --run tests/phase33/` → 45/45 passed (all phase 33 tests)
- `npm run build` → `✓ built in 512ms` (clean)
- `grep "GestureChip" src/canvas/FabricCanvas.tsx` → 2 matches (import + mount)
- `grep "GestureChip" src/three/ThreeViewport.tsx` → 2 matches (import + mount)

## Commits

- `f27685d` — feat(33-07): add GestureChip component with 2D/3D variants
- `e5a4df3` — feat(33-07): mount GestureChip in 2D and 3D viewports

## Closes

- GH #86 — Persistent gesture affordance chip (2D + 3D viewports)

## Self-Check: PASSED

- [x] `src/components/ui/GestureChip.tsx` exists
- [x] Contains literal "Drag to pan" and "L-drag rotate" strings
- [x] Uses localStorage key `ui:gestureChip:dismissed`
- [x] Imports `X` from `lucide-react`
- [x] Imports `readUIBool` / `writeUIBool` from `@/lib/uiPersistence`
- [x] Subscribes to `useUIStore(s => s.isDragging)`
- [x] Test driver `__driveGestureChip` gated on `import.meta.env.MODE === "test"`
- [x] Mounted in `FabricCanvas.tsx` with `mode="2d"` (Plan 06 toolbar mount preserved)
- [x] Mounted in `ThreeViewport.tsx` with `mode="3d"` as DOM sibling of R3F Canvas
- [x] `tests/phase33/gestureChip.test.ts` GREEN
- [x] All 45 tests in `tests/phase33/` GREEN
- [x] `npm run build` succeeds
- [x] Two commits created (`f27685d`, `e5a4df3`)
