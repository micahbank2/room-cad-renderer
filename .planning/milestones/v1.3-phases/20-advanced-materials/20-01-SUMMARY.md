---
phase: 20-advanced-materials
plan: "01"
subsystem: materials
tags: [materials, ceiling, floor, three-js, catalog, backward-compat]
dependency_graph:
  requires: []
  provides: [unified-surface-catalog, floor-backward-compat, ceiling-surface-material-field, setCeilingSurfaceMaterial-action, floor-texture-clone-fix]
  affects: [CeilingMesh, FloorMesh, cadStore, floorMaterials consumers]
tech_stack:
  added: [src/data/surfaceMaterials.ts]
  patterns: [unified-catalog-pattern, backward-compat-re-export, 3-tier-material-resolution, clone-based-texture]
key_files:
  created:
    - src/data/surfaceMaterials.ts
    - tests/surfaceMaterials.test.ts
    - tests/ceilingMaterial.test.ts
  modified:
    - src/data/floorMaterials.ts
    - src/types/cad.ts
    - src/stores/cadStore.ts
    - src/three/CeilingMesh.tsx
    - src/three/floorTexture.ts
    - tests/floorTexture.test.ts
decisions:
  - "CONCRETE has surface:'both' — appears in both floor (8 entries) and ceiling (4 entries) results from materialsForSurface()"
  - "FloorPreset aliased to SurfaceMaterial for backward compat — no code changes needed in consumers"
  - "setCeilingSurfaceMaterial clears paintId and limeWash on set (mutual exclusion)"
  - "getFloorTexture clones cached texture and shares source — independent repeat per consumer"
metrics:
  duration: "4 minutes"
  completed: "2026-04-06"
  tasks_completed: 2
  files_changed: 9
  tests_added: 26
---

# Phase 20 Plan 01: Unified Surface Material Catalog + Floor Texture Clone Fix Summary

**One-liner:** Unified 11-entry surface material catalog (8 floor + 3 ceiling + CONCRETE shared), backward-compatible floor re-export, floor texture clone fix for split-view safety, Ceiling type extended with surfaceMaterialId, setCeilingSurfaceMaterial action, and 3-tier CeilingMesh resolution.

## What Was Built

### Task 1: Unified surface material catalog + floor re-export

Created `src/data/surfaceMaterials.ts` with 11 entries:
- 7 floor-only: WOOD_OAK, WOOD_WALNUT, TILE_WHITE, TILE_BLACK, CARPET, MARBLE, STONE
- 1 shared: CONCRETE (`surface: "both"`)
- 3 ceiling-only: PLASTER, WOOD_PLANK, PAINTED_DRYWALL

Rewrote `src/data/floorMaterials.ts` to re-export from the unified catalog. All 8 original IDs (including CONCRETE) preserved. `FloorPreset` aliased to `SurfaceMaterial` — all existing consumers compile without changes.

### Task 2: Floor texture clone fix + type/store/mesh updates

- Fixed `getFloorTexture` to clone the cached texture (`cached.clone()`) and share its source — each consumer gets independent `repeat` values (split-view safe)
- Added `surfaceMaterialId?: string` to `Ceiling` interface in `cad.ts`
- Added `setCeilingSurfaceMaterial(ceilingId, materialId)` action to cadStore — sets surfaceMaterialId and clears paintId/limeWash (mutual exclusion)
- Updated `CeilingMesh` with 3-tier `useMemo` resolution: surfaceMaterialId > paintId > legacy material

## Tests

| File | Tests | Status |
|------|-------|--------|
| tests/surfaceMaterials.test.ts | 14 | Passed |
| tests/ceilingMaterial.test.ts | 7 | Passed |
| tests/floorTexture.test.ts | 5 | Passed |
| Full suite | 163 passed, 1 pre-existing failure (SidebarProductPicker) | Unchanged |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Spec counting discrepancy in materialsForSurface floor count**
- **Found during:** Task 1 test run
- **Issue:** Plan must_have said `materialsForSurface("floor")` returns 9 (8 floor + CONCRETE), but the action spec lists CONCRETE as one of the 8 floor materials — giving only 8 results (7 floor-only + CONCRETE "both")
- **Fix:** Updated test to assert 8 entries (the correct count given the catalog design) and added explicit assertions that CONCRETE is included. The catalog design is consistent: 8 original floor IDs all present in FLOOR_PRESETS backward compat.
- **Files modified:** tests/surfaceMaterials.test.ts

## Self-Check: PASSED

Files exist:
- src/data/surfaceMaterials.ts: FOUND
- src/data/floorMaterials.ts: FOUND (updated)
- src/types/cad.ts: FOUND (updated)
- src/stores/cadStore.ts: FOUND (updated)
- src/three/CeilingMesh.tsx: FOUND (updated)
- src/three/floorTexture.ts: FOUND (updated)
- tests/surfaceMaterials.test.ts: FOUND
- tests/ceilingMaterial.test.ts: FOUND
- tests/floorTexture.test.ts: FOUND (updated)

Commits exist:
- 10e3633: feat(20-01): create unified surface material catalog with backward-compatible floor re-export
- 8c47278: feat(20-01): fix floor texture clone bug, add Ceiling.surfaceMaterialId, setCeilingSurfaceMaterial, 3-tier CeilingMesh
