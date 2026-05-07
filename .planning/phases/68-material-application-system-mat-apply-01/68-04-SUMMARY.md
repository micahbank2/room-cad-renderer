---
phase: 68-material-application-system-mat-apply-01
plan: 04
subsystem: material-application
tags: [renderer, three, r3f, materialId, wave-3a]
requires:
  - 68-02 (Wave 1 — types + pure resolver)
  - 68-03 (Wave 2 — store actions + scaleFt fields)
provides:
  - "src/three/useResolvedMaterial.ts: R3F hook wrapping resolveSurfaceMaterial + useUserTexture; applies RepeatWrapping + repeat.set on every PBR map"
  - "src/three/WallMesh.tsx: priority-1 materialIdA/B branch in renderWallpaperOverlay (wins over wallpaper/userTexture/paint legacy chain)"
  - "src/three/FloorMesh.tsx: priority-1 floorMaterialId branch (wins over user-texture/PBR/preset/custom legacy chain). New floorMaterialId + floorScaleFt props plumbed from RoomGroup."
  - "src/three/CeilingMesh.tsx: priority-1 ceiling.materialId branch above existing 4-tier legacy chain"
  - "src/three/CustomElementMesh.tsx: 6-material array per box face (D-07) with FACE_ORDER export keyed to BoxGeometry slot order"
affects:
  - "Plan 06 (MaterialPicker UI) wiring onto applySurfaceMaterial now has 3D rendering ready — picker selection updates 3D immediately"
  - "Plan 05 (2D Fabric) ran in parallel and is already merged; both renderers now read from the same Plan 02 resolver"
tech-stack:
  added: []
  patterns:
    - "Direct map={resolved.colorMap} prop pattern (Phase 49 BUG-02 contract) for every new branch — userTextureCache retains ownership, R3F never auto-disposes externally-passed textures"
    - "Hooks hoisted to component body for both wall sides + ceiling + floor + each box face (Rules of Hooks); per-face <FaceMaterial> sub-component encapsulates one useResolvedMaterial call per face"
    - "Orphan-tolerant priority chain: when resolved is non-null but has neither colorHex nor colorMap (e.g. orphan colorMapId), fall through to legacy branch instead of rendering a blank surface"
    - "Pattern #7 StrictMode-safety: useResolvedMaterial does no module-level registry writes; texture mutation lives inside useEffect with proper deps"
key-files:
  created:
    - src/three/useResolvedMaterial.ts
    - src/three/__tests__/useResolvedMaterial.test.tsx
    - src/three/__tests__/CustomElementMesh.faceMaterials.test.tsx
    - .planning/phases/68-material-application-system-mat-apply-01/68-04-SUMMARY.md
  modified:
    - src/three/WallMesh.tsx
    - src/three/FloorMesh.tsx
    - src/three/CeilingMesh.tsx
    - src/three/CustomElementMesh.tsx
    - src/three/RoomGroup.tsx
decisions:
  - "FACE_ORDER mapping resolved against material.ts comment ambiguity. material.ts §FaceDirection notes claimed +Z=top, +Y=north, but THREE BoxGeometry's args=[w, h, d] places h on +Y (world up = top) and d on +Z. Used the physically-correct mapping (matches plan task 3 hint): [+X=east, -X=west, +Y=top, -Y=bottom, +Z=north, -Z=south]. The material.ts comment is now technically inaccurate; left untouched in this plan to avoid touching shared types — flag for future cleanup."
  - "Orphan handling in priority-1 branch — when useResolvedMaterial returns a resolved descriptor but neither colorHex nor colorMap is present (texture deleted from IDB), each mesh's branch falls through to the legacy chain instead of rendering blank. Mirrors the Phase 34 D-08/D-09 orphan-fallback contract."
  - "FloorMesh receives floorMaterialId/floorScaleFt as new props rather than reading from cadStore directly. Keeps FloorMesh deterministic (props-driven, easy to test) and reuses RoomGroup's existing roomDoc destructuring."
metrics:
  duration: ~25 min
  completed: 2026-05-06
  tasks: 3
  files_created: 4
  files_modified: 5
---

# Phase 68 Plan 04: Wave 3a — 3D Renderer Rewire

Wave 3a wires the four 3D mesh components to the Plan 02 resolver via a small R3F wrapper hook. Every legacy priority chain stays bit-exact below the new priority-1 branch, so Phase 49/50/64 fixes are preserved (D-01 safety net).

## What Changed

### Task 1 — `useResolvedMaterial` R3F hook (commits e47a027 + d81d153)

- **src/three/useResolvedMaterial.ts** (NEW) — R3F wrapper around `resolveSurfaceMaterial` (Plan 02) + `useUserTexture` (Phase 34). Returns `ResolvedSurfaceMaterialWithTextures` with THREE.Texture refs in place of the resolver's `*Id` fields. Returns null when `materialId` is undefined OR Material missing — caller falls back to legacy chain.
- Applies `RepeatWrapping` + `repeat.set(width / tileSize, height / tileSize)` on each PBR map (color/roughness/reflection) inside a `useEffect` with proper deps.
- Hooks called unconditionally (Rules of Hooks); `useUserTexture` accepts undefined and returns null to keep hook order stable.
- **src/three/__tests__/useResolvedMaterial.test.tsx** — 6 cases GREEN: null guards (×2), paint colorHex, textured colorMap, repeat math, scaleFt override (D-04).

### Task 2 — Priority-1 materialId branches (commit 17bb7a0)

- **src/three/WallMesh.tsx**
  - Added `useResolvedMaterial` hook calls at component top for both sides (`wall.materialIdA` + `wall.scaleFtA` for side A; `wall.materialIdB` + `wall.scaleFtB` for side B). Length × height passed as surface dims.
  - `renderWallpaperOverlay` signature gained `resolved: ResolvedSurfaceMaterialWithTextures | null` parameter. New priority-1 branch at the top of the function: when `resolved` is non-null AND has either `colorHex` (paint) or `colorMap` (texture), renders an overlay plane with the resolved material and returns. Otherwise falls through to the existing wallpaper / user-texture / paint chain.
  - Direct `map={resolved.colorMap}` prop pattern (Phase 49 BUG-02 contract). `roughnessMap` + `metalnessMap` (mapped from `reflectionMap`) attached when present.

- **src/three/FloorMesh.tsx**
  - New `floorMaterialId?: string` and `floorScaleFt?: number` props. `useResolvedMaterial(floorMaterialId, floorScaleFt, width, length)` at top.
  - JSX gains a `useResolvedBranch` ternary: when `resolved` has `colorHex` → flat-color material; when `resolved` has `colorMap` → textured material with direct map prop; otherwise falls through to existing user-texture / PBR / preset / custom chain.

- **src/three/RoomGroup.tsx**
  - Plumbs `roomDoc.floorMaterialId` and `roomDoc.floorScaleFt` to `<FloorMesh>`.

- **src/three/CeilingMesh.tsx**
  - `useResolvedMaterial(ceiling.materialId, ceiling.scaleFt, bbox.w, bbox.l)` after bbox computation.
  - JSX gains a priority-1 branch above the existing 4-tier `useUserTextureBranch` / `pbrMaterial` / flat fallback chain. Preserves selected emissive highlight on both new and legacy paths.

- Verified: `tests/ceilingMaterial.test.ts` (10/10) + `tests/floorTexture.test.ts` (2/2) still GREEN — Phase 49/50/64 fixes preserved.

### Task 3 — Per-face material array on CustomElementMesh (commits 048dd70 + 91f537a)

- **src/three/CustomElementMesh.tsx**
  - Replaced single `<meshStandardMaterial>` on the box with 6-element `<FaceMaterial>` children using `attach="material-${idx}"`.
  - `FACE_ORDER` exported as `["east", "west", "top", "bottom", "north", "south"]` matching THREE BoxGeometry slot order `[+X, -X, +Y, -Y, +Z, -Z]`.
  - `<FaceMaterial>` sub-component calls `useResolvedMaterial(placedMaterialId, undefined, width, height)` — one hook call per face at a real React component boundary.
  - Per-face surface dims for tile-repeat math: top/bottom = `w × d`, east/west = `d × h`, north/south = `w × h`.
  - Each face independently chooses: `resolved.colorHex` → flat-color; `resolved.colorMap` → textured map; otherwise → `element.color` fallback (D-01 safety net).
  - Selected-state highlight (`#93c5fd`) applies on every branch, replacing both the resolved hex and the white texture-tint when selected.

- **src/three/__tests__/CustomElementMesh.faceMaterials.test.tsx** — verifies `FACE_ORDER` is the 6-element BoxGeometry-index sequence.

## Verification

- `npx vitest run src/three/__tests__/ src/lib/__tests__/materialResolver.test.ts src/lib/__tests__/snapshotMigration.v6.test.ts tests/ceilingMaterial.test.ts tests/floorTexture.test.ts` → **51 passed | 4 todo (9 files)**.
- `npx tsc --noEmit` → no errors in any of the touched files.
- `npm run build` → exits 0 (Vite + TS build clean).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] FloorMesh prop plumbing**
- **Found during:** Task 2 — plan said "uses `room.floorMaterialId` / `room.floorScaleFt`" inline, but FloorMesh's existing prop signature carries `material: FloorMaterial | undefined` (legacy `FloorMaterial` shape) and the new fields live on `RoomDoc`, not `RoomDoc.room`.
- **Fix:** Added `floorMaterialId?: string` + `floorScaleFt?: number` as new optional props on FloorMesh; RoomGroup passes them from `roomDoc.floorMaterialId` / `roomDoc.floorScaleFt`. Keeps FloorMesh deterministic (props-driven, easy to test) instead of reading from cadStore.
- **Files modified:** `src/three/FloorMesh.tsx`, `src/three/RoomGroup.tsx`
- **Commit:** 17bb7a0

**2. [Rule 3 — Blocking issue] FaceDirection mapping conflict between material.ts and BoxGeometry**
- **Found during:** Task 3 — `material.ts` §FaceDirection comment claims `top → +Z`, `north → +Y`, but THREE BoxGeometry constructed with `args=[w, h, d]` puts `h` on the Y axis (world up) and `d` on Z. The plan's hint mapping (and physical-up convention) require `top → +Y`, `north → +Z`.
- **Fix:** Used the physically-correct mapping: `[+X=east, -X=west, +Y=top, -Y=bottom, +Z=north, -Z=south]` (matches the plan task-3 hint and CustomElementMesh's actual coordinate system). Did NOT modify `material.ts` JSDoc comment — flagging for a future cleanup phase to avoid touching shared types in a renderer-rewire plan.
- **Files modified:** `src/three/CustomElementMesh.tsx` (FACE_ORDER constant)
- **Commit:** 91f537a
- **Follow-up:** v1.18 cleanup phase candidate — update `src/types/material.ts` JSDoc on `FaceDirection` to match.

## Known Stubs

None. Per-face tile-size is intentionally inherited from `Material.tileSizeFt` (v1.17 scope per Plan 03 SUMMARY known-stubs note); no per-face `scaleFt` field exists yet.

## Self-Check: PASSED

- `src/three/useResolvedMaterial.ts` exists: FOUND
- `src/three/useResolvedMaterial.ts` contains literal `useResolvedMaterial`, `RepeatWrapping`, `repeat.set`: FOUND
- `src/three/WallMesh.tsx` contains literal `useResolvedMaterial`, `wall.materialIdA`, `wall.materialIdB`: FOUND
- `src/three/FloorMesh.tsx` contains literal `useResolvedMaterial`, `floorMaterialId`: FOUND
- `src/three/CeilingMesh.tsx` contains literal `useResolvedMaterial`, `ceiling.materialId`: FOUND
- `src/three/CustomElementMesh.tsx` contains literal `faceMaterials`, `FaceDirection`, `FACE_ORDER`, `element.color`: FOUND
- e47a027 (Task 1 RED test): FOUND
- d81d153 (Task 1 GREEN hook): FOUND
- 17bb7a0 (Task 2 priority-1 branches): FOUND
- 048dd70 (Task 3 RED test): FOUND
- 91f537a (Task 3 GREEN refactor): FOUND
- useResolvedMaterial.test.tsx: 6/6 GREEN
- CustomElementMesh.faceMaterials.test.tsx: 1/1 GREEN
- ceilingMaterial.test.ts: 10/10 GREEN (no regression)
- floorTexture.test.ts: 2/2 GREEN (no regression)
- npm run build: exits 0
- npx tsc --noEmit on touched files: no errors
