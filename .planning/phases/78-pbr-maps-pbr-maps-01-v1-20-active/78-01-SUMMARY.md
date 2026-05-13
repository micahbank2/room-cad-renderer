---
phase: 78-pbr-maps-pbr-maps-01-v1-20
plan: "01"
subsystem: materials
tags: [pbr, ao-map, displacement-map, material-pipeline, data-foundation]
dependency_graph:
  requires: [Phase 67 materialStore, Phase 68 surfaceMaterial + useResolvedMaterial]
  provides: [aoMapId/displacementMapId on Material type, aoFile/displacementFile in SaveMaterialInput, aoMap/displacementMap THREE.Texture refs in useResolvedMaterial]
  affects: [src/types/material.ts, src/lib/materialStore.ts, src/lib/surfaceMaterial.ts, src/three/useResolvedMaterial.ts]
tech_stack:
  added: []
  patterns: [persistOptionalMap reuse, unconditional useUserTexture hooks, texture repeat/wrap in useEffect]
key_files:
  created:
    - tests/materialStore.pbr78.test.ts
    - src/three/__tests__/useResolvedMaterial.pbr78.test.tsx
  modified:
    - src/types/material.ts (lines 80-83: aoMapId? + displacementMapId?)
    - src/lib/materialStore.ts (lines 51-53: SaveMaterialInput fields; lines 106-120: persistOptionalMap calls + Material record fields)
    - src/lib/surfaceMaterial.ts (lines 35-37: ResolvedSurfaceMaterial fields; lines 99-100: texture branch return)
    - src/three/useResolvedMaterial.ts (lines 27,36-38: interface; lines 71-72: hook calls; lines 102-121: useEffect; lines 139-140: return)
decisions:
  - aoMapId and displacementMapId are write-once — NOT added to updateMaterialMetadata Partial<Pick<...>> per RESEARCH.md Pitfall 4
  - Paint Material branch in resolveSurfaceMaterial intentionally excludes both new ids (texture maps don't apply to paint)
  - useUserTexture called unconditionally for both new ids to preserve Rules of Hooks invariant
metrics:
  duration: ~4 minutes
  completed: "2026-05-08T22:44:00Z"
  tasks_completed: 2
  files_modified: 4
  files_created: 2
---

# Phase 78 Plan 01: AO + Displacement Map Data Pipeline — Summary

**One-liner:** AO and displacement map ids wired end-to-end from Material type through storage, resolver, and useResolvedMaterial hook — same pattern as roughness/reflection (Phase 67/68).

## What Was Built

The Phase 67/68 material pipeline already carried roughness and reflection maps. This plan extends the exact same plumbing to two new PBR map slots:

1. **`src/types/material.ts`** — `Material` interface gains `aoMapId?: string` and `displacementMapId?: string` after `reflectionMapId`. No migration needed (IDB is schemaless; existing Materials have these fields undefined).

2. **`src/lib/materialStore.ts`** — `SaveMaterialInput` gains `aoFile?: File` and `displacementFile?: File`. `saveMaterialWithDedup` calls `persistOptionalMap` for each (same pattern as roughness/reflection) and writes resulting ids onto the Material record. `updateMaterialMetadata` was NOT modified (write-once semantics preserved).

3. **`src/lib/surfaceMaterial.ts`** — `ResolvedSurfaceMaterial` gains `aoMapId?` and `displacementMapId?`. `resolveSurfaceMaterial` threads both ids through the texture-material branch return value. Paint branch (`colorHex` path) intentionally excludes them.

4. **`src/three/useResolvedMaterial.ts`** — `ResolvedSurfaceMaterialWithTextures` Omit clause extended to exclude both new id fields; `aoMap?` and `displacementMap?` (`THREE.Texture | null`) added. Hook calls `useUserTexture` unconditionally for both ids. `useEffect` repeat/wrap block handles both new textures. Both returned in final object.

## Tests Added

| File | Tests | Result |
|------|-------|--------|
| `tests/materialStore.pbr78.test.ts` | 4 (ao/disp save + no-op + both) | GREEN |
| `src/three/__tests__/useResolvedMaterial.pbr78.test.tsx` | 4 (resolver paint exclusion, resolver threading, hook Texture return, repeat/wrap) | GREEN |

All 18 tests (existing + new) pass.

## Verification Results

```
grep aoMapId src/types/material.ts       → line 81: aoMapId?: string;
grep displacementMapId src/types/material.ts → line 83: displacementMapId?: string;
grep aoFile materialStore.ts             → line 51: aoFile?: File;
tsc --noEmit                             → exit 0 (baseUrl deprecation warning only, pre-existing)
vitest run (4 test files)                → 18/18 passed
```

## Commits

- `db0d570` — feat(78-01): extend Material type + SaveMaterialInput for AO/displacement maps
- `84e962e` — feat(78-01): thread aoMapId/displacementMapId through surfaceMaterial + useResolvedMaterial

## Next Step

Plan 03 (78-03) will bind `aoMap` and `displacementMap` from `useResolvedMaterial` to `meshStandardMaterial` props (`aoMap=`, `displacementMap=`, `displacementScale=`) in the wall and floor mesh consumers.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

Files created/modified:
- [x] `src/types/material.ts` — FOUND: aoMapId line 81
- [x] `src/lib/materialStore.ts` — FOUND: aoFile line 51
- [x] `src/lib/surfaceMaterial.ts` — FOUND: aoMapId line 35
- [x] `src/three/useResolvedMaterial.ts` — FOUND: aoMap line 36
- [x] `tests/materialStore.pbr78.test.ts` — created
- [x] `src/three/__tests__/useResolvedMaterial.pbr78.test.tsx` — created

Commits:
- [x] db0d570 — confirmed via git log
- [x] 84e962e — confirmed via git log

## Self-Check: PASSED
