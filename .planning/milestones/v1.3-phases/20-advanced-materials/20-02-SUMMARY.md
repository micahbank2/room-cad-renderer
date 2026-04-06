---
phase: 20-advanced-materials
plan: "02"
subsystem: materials-ui
tags: [materials, ui, swatch-picker, ceiling, floor, mutual-exclusion]
dependency_graph:
  requires: [20-01]
  provides: [SurfaceMaterialPicker-component, ceiling-material-ui, floor-swatch-grid]
  affects: [CeilingPaintSection, FloorMaterialPicker, PropertiesPanel]
tech_stack:
  added: [src/components/SurfaceMaterialPicker.tsx]
  patterns: [swatch-grid-picker, mutual-exclusion-ui, toggle-deselect]
key_files:
  created:
    - src/components/SurfaceMaterialPicker.tsx
  modified:
    - src/components/CeilingPaintSection.tsx
    - src/components/FloorMaterialPicker.tsx
decisions:
  - "SurfaceMaterialPicker uses className join array pattern for conditional active border — avoids template literal complexity"
  - "CeilingPaintSection uses hasMaterial boolean derived from ceiling.surfaceMaterialId — single source of conditional truth"
  - "handleApplyPaint sets surfaceMaterialId: undefined inline (not via setCeilingSurfaceMaterial) — updateCeiling handles both atomically"
  - "FloorMaterialPicker activeId maps isCustom to undefined so no swatch highlights when custom image is active"
metrics:
  duration: "4 minutes"
  completed: "2026-04-06"
  tasks_completed: 2
  files_changed: 3
  tests_added: 0
---

# Phase 20 Plan 02: Surface Material Picker UI Summary

**One-liner:** Reusable SurfaceMaterialPicker swatch grid (4-col, toggle-select, surface-filtered), integrated into CeilingPaintSection with material-above-paint mutual exclusion, and FloorMaterialPicker dropdown replaced with the same component.

## What Was Built

### Task 1: Create SurfaceMaterialPicker + integrate into CeilingPaintSection

Created `src/components/SurfaceMaterialPicker.tsx`:
- Props: `{ surface: "floor" | "ceiling"; activeId: string | undefined; onSelect: (id: string | undefined) => void }`
- Calls `materialsForSurface(surface)` to filter catalog to correct surface
- Renders `grid grid-cols-4 gap-1` of swatch buttons
- Active state: `border-accent ring-1 ring-accent/30`
- Default state: `border-outline-variant/20 hover:border-outline-variant/40`
- Toggle behavior: clicking active swatch passes `undefined` to `onSelect`
- Labels: `font-mono text-[8px] text-text-dim block mt-1 truncate`

Updated `src/components/CeilingPaintSection.tsx`:
- Added `setCeilingSurfaceMaterial` selector from cadStore
- Added `SURFACE_MATERIALS` import for active label display
- Layout: SURFACE_MATERIAL header → SurfaceMaterialPicker → active indicator + CLEAR_MATERIAL → divider → CEILING_PAINT header → dimmed paint section
- When `surfaceMaterialId` set: paint section gets `opacity-40 pointer-events-none` + `OVERRIDDEN_BY_MATERIAL` note
- `handleApplyPaint` now sets `surfaceMaterialId: undefined` for mutual exclusion
- SURFACE_MATERIAL header uses `text-accent-light` when active, `text-text-ghost` otherwise
- CEILING_PAINT header uses `text-accent-light` when paint active (and no material), `text-text-ghost` otherwise

### Task 2: Replace FloorMaterialPicker dropdown with swatch grid

Replaced `<select>` dropdown in `src/components/FloorMaterialPicker.tsx`:
- `SurfaceMaterialPicker surface="floor"` with `activeId` derived from `currentPresetId` (undefined when DEFAULT or custom)
- `onSelect` maps `undefined` → `"DEFAULT"` → `setFloorMaterial(undefined)` for deselect/reset
- Added standalone `UPLOAD_IMAGE...` button (shows `CUSTOM_IMAGE` when custom is active) below swatch grid
- Preserved: color swatch preview row, hidden file input, scale/rotation inputs, `RESET_TO_DEFAULT` button
- Removed: `<select>` element, all `<option>` elements

## Tests

| File | Tests | Status |
|------|-------|--------|
| Full suite | 162 passed, 3 todo, 1 pre-existing failure (SidebarProductPicker) | Unchanged |
| New tests | 0 — UI components not unit-tested (visual/interactive behavior) | — |

Pre-existing failure unchanged from Plan 01 baseline.

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria verified via grep and build.

## Self-Check: PASSED

Files exist:
- src/components/SurfaceMaterialPicker.tsx: FOUND
- src/components/CeilingPaintSection.tsx: FOUND (updated)
- src/components/FloorMaterialPicker.tsx: FOUND (updated)

Commits exist:
- f80a617: feat(20-02): create SurfaceMaterialPicker and integrate into CeilingPaintSection
- e1238a3: feat(20-02): replace FloorMaterialPicker dropdown with SurfaceMaterialPicker swatch grid
