---
phase: 68-material-application-system-mat-apply-01
plan: 02
subsystem: material-application
tags: [types, resolver, foundation, wave-1]
requires:
  - 68-01 (Wave 0 — RED contract tests)
provides:
  - "Material.colorHex (D-02) + FaceDirection union (D-07) exported from src/types/material.ts"
  - "WallSegment.materialIdA/B, RoomDoc.floorMaterialId, Ceiling.materialId, PlacedCustomElement.faceMaterials (D-03, D-07)"
  - "CADSnapshot.version literal bumped 5 → 6"
  - "src/lib/surfaceMaterial.ts: resolveSurfaceMaterial + resolveSurfaceTileSize pure functions"
  - "src/data/surfaceMaterials.ts: materialsForSurface(materials, SurfaceKind) overload"
affects:
  - "Plans 03–07 build on these locked contracts (parallel start unblocked)"
  - "snapshotMigration.ts now has TS errors on `version === 5` literals (intentional — Plan 03 fixes)"
tech-stack:
  added: []
  patterns:
    - "Pure-function resolver layer (no React, no THREE, no IDB) for shared 2D/3D consumption"
    - "Discriminated SurfaceTarget union for type-safe surface dispatch"
    - "Function overload to keep legacy single-arg signature compiling alongside new (Material[], SurfaceKind) signature"
key-files:
  created:
    - src/lib/surfaceMaterial.ts
    - .planning/phases/68-material-application-system-mat-apply-01/68-02-SUMMARY.md
  modified:
    - src/types/material.ts
    - src/types/cad.ts
    - src/data/surfaceMaterials.ts
decisions:
  - "Used function overload (not rename) on materialsForSurface to keep SurfaceMaterialPicker compiling without touching that file. Legacy delegates to legacyMaterialsForSurface internally."
  - "ResolvedSurfaceMaterial includes the original Material (not just IDs) so consumers can access brand/sku without a second lookup."
  - "Paint-Material short-circuit: when colorHex is set, roughness/metalness are forced to 0.8/0 regardless of *MapId fields (matches D-02 mutual-exclusion intent)."
metrics:
  duration: ~12 min (resume from partial Task 1)
  completed: 2026-05-06
---

# Phase 68 Plan 02: Foundation — Material types + pure resolver

Wave 1 ships the type contracts (Material.colorHex, four new materialId reference fields on Wall/Room/Ceiling/CustomElement) and the pure resolver module that 2D, 3D, and the snapshot migration will all consume. No store actions, no rendering — just stable signatures so Plans 03–07 can start in parallel.

## What Changed

### Task 1 — Type extensions (commit 9bfa811)

- **src/types/material.ts**
  - Added `colorHex?: string` to `Material` (D-02 paint Material support).
  - Exported `FaceDirection = "top" | "bottom" | "north" | "south" | "east" | "west"` (D-07 per-face material override on PlacedCustomElement).
- **src/types/cad.ts**
  - `WallSegment.materialIdA?: string` + `materialIdB?: string` (D-03 per-side material reference).
  - `RoomDoc.floorMaterialId?: string` (D-03).
  - `Ceiling.materialId?: string` (D-03).
  - `PlacedCustomElement.faceMaterials?: Partial<Record<FaceDirection, string>>` (D-07).
  - `CADSnapshot.version` literal bumped `5 → 6`.
  - All legacy fields (`wallpaper`, `floorMaterial`, `paintId`, `surfaceMaterialId`, `userTextureId`, `material`) preserved per D-01 safety net.

### Task 2 — Resolver module (commit a320fd2)

- **src/lib/surfaceMaterial.ts** (NEW)
  - `resolveSurfaceTileSize(surfaceScaleFt, material) → number` — D-04 precedence (`surface ?? material ?? 1`).
  - `resolveSurfaceMaterial(materialId, surfaceScaleFt, materials) → ResolvedSurfaceMaterial | null`
    - Returns null when `materialId` is undefined OR no Material with that id exists.
    - Paint Material (`colorHex` set) → returns `{colorHex, tileSizeFt, roughness: 0.8, metalness: 0, material}`.
    - Textured Material → returns `{colorMapId, roughnessMapId, reflectionMapId, tileSizeFt, roughness, metalness, material}` with D-08 PBR fallbacks (`roughness = roughnessMapId ? 1.0 : 0.8`, `metalness = reflectionMapId ? 1.0 : 0`).
    - D-02 mutual-exclusion guard: if both `colorHex` and `colorMapId` set, `console.warn` + prefer `colorHex`.
  - Exports: `resolveSurfaceMaterial`, `resolveSurfaceTileSize`, `ResolvedSurfaceMaterial`, `SurfaceTarget`.
- **src/data/surfaceMaterials.ts**
  - Added `SurfaceKind = "wallSide" | "floor" | "ceiling" | "customElementFace"` union.
  - Overloaded `materialsForSurface`: legacy `(target: "floor"|"ceiling") → SurfaceMaterial[]` PLUS new `(materials: Material[], surface: SurfaceKind) → Material[]`. Legacy path delegates to new `legacyMaterialsForSurface`. SurfaceMaterialPicker compiles unchanged.

## Verification

- `npx vitest run src/lib/__tests__/materialResolver.test.ts` → **6/6 pass** (Wave 0 RED test now GREEN).
- `npx tsc --noEmit` → no errors in `src/lib/surfaceMaterial.ts`, `src/data/surfaceMaterials.ts`, `src/types/material.ts`, or `src/types/cad.ts`. Downstream errors in `snapshotMigration.ts` (asserts `version === 5`) are expected and will be fixed by Plan 03.

## Deviations from Plan

**1. [Rule 3 — Blocking issue] Used function overload instead of rename for `materialsForSurface`**
- **Found during:** Task 2 — plan said "rename legacy one to `legacyMaterialsForSurface` and add a TODO". Renaming alone would break SurfaceMaterialPicker.tsx at compile time.
- **Fix:** Kept the canonical name `materialsForSurface` as a TypeScript overload that dispatches by argument shape: legacy `(target)` delegates to a new `legacyMaterialsForSurface`, while new `(materials, surface)` returns the user-Material list. SurfaceMaterialPicker compiles without changes; the new Phase 68 callers (Plans 04–06) get the new signature for free. Acceptance criterion satisfied: `materialsForSurface` accepts the four-surface union via overload.
- **Files modified:** `src/data/surfaceMaterials.ts`
- **Commit:** a320fd2

## Known Stubs

- `materialsForSurface(materials, surface)` ignores its `surface` argument in v1.17 — all surfaces accept all Materials. This is intentional per the plan (Material has no category metadata yet); Phase 70+ will add category filtering. Documented inline.

## Self-Check: PASSED

- src/lib/surfaceMaterial.ts: FOUND
- 9bfa811 (Task 1 commit): FOUND
- a320fd2 (Task 2 commit): FOUND
- materialResolver.test.ts: 6/6 pass
- src/types/material.ts contains `colorHex?:`, `FaceDirection`: FOUND
- src/types/cad.ts contains `materialIdA?:`, `materialIdB?:`, `floorMaterialId?:`, `materialId?:` (Ceiling), `faceMaterials?:`, `version: 6`: FOUND
