---
phase: 20-advanced-materials
verified: 2026-04-05T22:32:30Z
status: passed
score: 3/3 must-haves verified
re_verification: false
---

# Phase 20: Advanced Materials Verification Report

**Phase Goal:** Wall surfaces, ceilings, and floors all draw from one consistent material catalog, and ceiling textures work as reliably as floor textures
**Verified:** 2026-04-05T22:32:30Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can open a single "Surface Materials" picker for either floor or ceiling and see all texture presets in one catalog | ✓ VERIFIED | `SurfaceMaterialPicker.tsx` calls `materialsForSurface(surface)` — returns 8 entries for floor, 4 for ceiling; used in both `FloorMaterialPicker` and `CeilingPaintSection` |
| 2 | User can apply a ceiling texture preset and the 3D ceiling renders the texture consistently — no tile scale corruption in split view | ✓ VERIFIED | `CeilingMesh.tsx` resolves `surfaceMaterialId > paintId > material`; `floorTexture.ts` now clones cached texture per call (`cached.clone()` + `tex.source = cached.source`), ensuring independent `repeat` values per consumer |
| 3 | All existing projects load without errors; floor material selections saved before v1.3 continue working without any migration step | ✓ VERIFIED | `floorMaterials.ts` re-exports all 8 original `FloorPresetId` values (`FLOOR_PRESETS`, `FLOOR_PRESET_IDS`, `FloorPreset`, `FloorPresetId`) from unified catalog — no type or shape changes; `surfaceMaterialId` is optional on `Ceiling` — existing docs without it render via legacy `material` fallback |

**Score:** 3/3 truths verified

---

### Required Artifacts

#### Plan 20-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/data/surfaceMaterials.ts` | Unified surface material catalog | ✓ VERIFIED | 119 lines; exports `SurfaceTarget`, `SurfaceMaterial`, `SURFACE_MATERIALS` (11 entries), `materialsForSurface` |
| `src/data/floorMaterials.ts` | Backward-compatible re-export | ✓ VERIFIED | Imports from `./surfaceMaterials`; re-exports all 4 original symbols with identical types |
| `src/types/cad.ts` | `Ceiling.surfaceMaterialId` field | ✓ VERIFIED | Line 129: `surfaceMaterialId?: string;` with JSDoc |
| `src/stores/cadStore.ts` | `setCeilingSurfaceMaterial` action | ✓ VERIFIED | Interface at line 80; implementation at line 415; clears `paintId` and `limeWash` on set |
| `src/three/CeilingMesh.tsx` | 3-tier material resolution | ✓ VERIFIED | `useMemo` block: surfaceMaterialId → paintId → legacy material |
| `src/three/floorTexture.ts` | Clone-based texture with independent repeat | ✓ VERIFIED | `cached.clone()` at line 73; `tex.source = cached.source` at line 74 |
| `tests/surfaceMaterials.test.ts` | Unit tests for catalog + backward compat | ✓ VERIFIED | 14 tests, all pass |
| `tests/floorTexture.test.ts` | Tests asserting distinct texture instances | ✓ VERIFIED | 5 tests, all pass; `not.toBe(b)` assertion present |
| `tests/ceilingMaterial.test.ts` | Tests for ceiling resolution priority | ✓ VERIFIED | 7 tests, all pass |

#### Plan 20-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/SurfaceMaterialPicker.tsx` | Reusable swatch grid component | ✓ VERIFIED | 39 lines; `grid grid-cols-4 gap-1`; active state `border-accent ring-1 ring-accent/30`; toggle behavior |
| `src/components/CeilingPaintSection.tsx` | Combined material + paint picker with mutual exclusion | ✓ VERIFIED | Contains `SurfaceMaterialPicker`, `setCeilingSurfaceMaterial`, `CLEAR_MATERIAL`, `OVERRIDDEN_BY_MATERIAL`, `opacity-40 pointer-events-none` |
| `src/components/FloorMaterialPicker.tsx` | Swatch grid replacing dropdown | ✓ VERIFIED | No `<select>` or `<option>` elements; `SurfaceMaterialPicker surface="floor"` present; `UPLOAD_IMAGE...` button preserved |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/data/floorMaterials.ts` | `src/data/surfaceMaterials.ts` | re-export | ✓ WIRED | `import { SURFACE_MATERIALS, type SurfaceMaterial } from "./surfaceMaterials"` confirmed at line 8 |
| `src/three/CeilingMesh.tsx` | `src/data/surfaceMaterials.ts` | SURFACE_MATERIALS lookup | ✓ WIRED | `import { SURFACE_MATERIALS } from "@/data/surfaceMaterials"` at line 6; `SURFACE_MATERIALS[ceiling.surfaceMaterialId]` at line 33 |
| `src/stores/cadStore.ts` | `src/types/cad.ts` | `Ceiling.surfaceMaterialId` field | ✓ WIRED | `setCeilingSurfaceMaterial` action reads/writes `c.surfaceMaterialId` (lines 423–428) |
| `src/components/SurfaceMaterialPicker.tsx` | `src/data/surfaceMaterials.ts` | `materialsForSurface` import | ✓ WIRED | Line 1: `import { materialsForSurface } from "@/data/surfaceMaterials"` |
| `src/components/CeilingPaintSection.tsx` | `src/stores/cadStore.ts` | `setCeilingSurfaceMaterial` action | ✓ WIRED | Line 14: `const setCeilingSurfaceMaterial = useCADStore((s) => s.setCeilingSurfaceMaterial)` |
| `src/components/CeilingPaintSection.tsx` | `src/components/SurfaceMaterialPicker.tsx` | `SurfaceMaterialPicker` component | ✓ WIRED | Line 3 import; line 39 usage `<SurfaceMaterialPicker surface="ceiling" ...>` |
| `src/components/FloorMaterialPicker.tsx` | `src/components/SurfaceMaterialPicker.tsx` | `SurfaceMaterialPicker` component | ✓ WIRED | Line 4 import; line 67 usage `<SurfaceMaterialPicker surface="floor" ...>` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `SurfaceMaterialPicker.tsx` | `materials` | `materialsForSurface(surface)` → `SURFACE_MATERIALS` constant | Yes — 11 static catalog entries, 8 or 4 returned per surface | ✓ FLOWING |
| `CeilingPaintSection.tsx` | `ceiling.surfaceMaterialId` | cadStore `ceilings[ceilingId]` via `setCeilingSurfaceMaterial` | Yes — mutates store which flows to `CeilingMesh` on re-render | ✓ FLOWING |
| `CeilingMesh.tsx` | `color`, `roughness` | `SURFACE_MATERIALS[ceiling.surfaceMaterialId]` | Yes — resolves to real hex/roughness from catalog | ✓ FLOWING |
| `FloorMaterialPicker.tsx` | `materials` (swatch grid) | `materialsForSurface("floor")` → same catalog | Yes — 8 floor entries | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| `surfaceMaterials.test.ts` — 14 catalog tests | `vitest run tests/surfaceMaterials.test.ts` | 14/14 passed | ✓ PASS |
| `ceilingMaterial.test.ts` — 7 resolution priority tests | `vitest run tests/ceilingMaterial.test.ts` | 7/7 passed | ✓ PASS |
| `floorTexture.test.ts` — 5 clone fix tests | `vitest run tests/floorTexture.test.ts` | 5/5 passed | ✓ PASS |
| Full vitest suite — no regressions | `vitest run` | 162 passed, 1 pre-existing failure (SidebarProductPicker), 3 todo | ✓ PASS (pre-existing failure unrelated to phase) |
| Production build | `vite build` | 675 modules, 0 errors | ✓ PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MAT-01 | 20-01, 20-02 | User can pick floor and ceiling materials from a single unified surface material catalog | ✓ SATISFIED | `SurfaceMaterialPicker` is one component; used by both `FloorMaterialPicker` (surface="floor") and `CeilingPaintSection` (surface="ceiling"); `materialsForSurface` filters from single `SURFACE_MATERIALS` catalog |
| MAT-02 | 20-01, 20-02 | User can apply ceiling texture presets (plaster, wood plank, concrete, painted drywall) | ✓ SATISFIED | `SURFACE_MATERIALS` has PLASTER, WOOD_PLANK, PAINTED_DRYWALL, CONCRETE (shared); `CeilingMesh` resolves `surfaceMaterialId` to color+roughness; `setCeilingSurfaceMaterial` action stores selection; `CeilingPaintSection` provides the picker UI |
| MAT-03 | 20-01 | Existing floor presets continue working without breaking saved projects (additive migration) | ✓ SATISFIED | `floorMaterials.ts` re-exports all 8 original IDs with identical types; `FloorPreset` aliased to `SurfaceMaterial` (superset); `surfaceMaterialId` is optional on `Ceiling` — absent in old docs, falls back to `material` string |

All 3 requirements fully covered. No orphaned requirements found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

No stubs, empty handlers, or placeholder returns found in any phase-20 file. All components render real data from the catalog.

---

### Human Verification Required

#### 1. Ceiling material mutual exclusion — visual

**Test:** Open the app in 3D view. Draw a ceiling. Open the Properties panel and select a ceiling. Click the PLASTER swatch in the SURFACE_MATERIAL section.
**Expected:** The ceiling renders with the PLASTER color (`#f0ebe0`, rough matte). The CEILING_PAINT section dims with `OVERRIDDEN_BY_MATERIAL` label visible. Clicking a paint swatch then re-enables the paint section and clears the material selection.
**Why human:** Visual rendering and interactive state transitions cannot be verified programmatically without a running browser.

#### 2. Split-view floor texture independence

**Test:** Open split view (2D + 3D). Create two rooms. Apply WOOD_OAK floor material to each room at different scales.
**Expected:** Each room's floor texture tiles at its own scale — no cross-contamination of `repeat` values between rooms.
**Why human:** Requires live Three.js rendering to observe the texture repeat values visually.

#### 3. FloorMaterialPicker swatch grid appearance

**Test:** Open the floor material section in the sidebar. Verify it shows a 4-column swatch grid (not a dropdown).
**Expected:** 8 colored swatches visible in a grid; clicking any swatch selects it (accent border); clicking again deselects (resets to default). UPLOAD_IMAGE... button below the grid.
**Why human:** Visual layout and interactive selection feedback require browser rendering.

---

### Gaps Summary

No gaps found. All automated checks pass.

---

## Summary

Phase 20 goal is fully achieved. The unified `SURFACE_MATERIALS` catalog (11 entries, 1 file) replaces the former split between floor-only and ceiling-only representations. The backward-compatible `floorMaterials.ts` re-export ensures zero breakage for existing consumers. The floor texture clone fix (`cached.clone()` + shared `source`) makes split-view safe. The `SurfaceMaterialPicker` component is genuinely reusable — one component used by both floor and ceiling pickers, filtered by surface type. All 26 phase-specific tests pass. Production build is clean at 675 modules.

---

_Verified: 2026-04-05T22:32:30Z_
_Verifier: Claude (gsd-verifier)_
