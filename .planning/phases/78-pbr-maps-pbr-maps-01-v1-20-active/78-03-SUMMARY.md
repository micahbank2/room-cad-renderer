---
phase: 78-pbr-maps-pbr-maps-01-v1-20
plan: "03"
subsystem: three
tags: [pbr, ao-map, displacement-map, materials, 3d-rendering]
dependency_graph:
  requires: [78-01]
  provides: [PBR-03-surface-binding]
  affects: [WallMesh, FloorMesh, CeilingMesh, CustomElementMesh]
tech_stack:
  added: []
  patterns: [uv2-ref-callback, aoMap-binding, displacementScale-0.05]
key_files:
  created: []
  modified:
    - src/three/WallMesh.tsx
    - src/three/FloorMesh.tsx
    - src/three/CeilingMesh.tsx
    - src/three/CustomElementMesh.tsx
    - src/three/ProductMesh.tsx
    - src/three/ProductBox.tsx
    - src/three/__tests__/pbr03.aoMap.test.ts
decisions:
  - "PBR-03 effective scope: wall/floor/ceiling/custom-element surfaces only; ProductMesh+ProductBox out of scope (legacy useProductTexture path)"
  - "displacementScale=0.05 chosen to prevent geometry explosion in foot-coordinate world (RESEARCH Pitfall 2)"
  - "uv2 setAttribute via ref callback pattern for JSX geometries; useMemo-based for CeilingMesh ShapeGeometry"
metrics:
  duration_minutes: 35
  tasks_completed: 2
  files_changed: 7
  completed_date: "2026-05-08"
---

# Phase 78 Plan 03: PBR-03 Surface Binding Summary

Bound `aoMap`, `displacementMap`, and `uv2` setup to all four Material-catalog surface meshes (WallMesh, FloorMesh, CeilingMesh, CustomElementMesh), completing the visible PBR payoff for Phase 78.

## What Was Built

### Task 1: Wire aoMap + displacementMap + uv2 on surface meshes

Four files modified. In each, the priority-1 `colorMap` branch of the Material catalog render path received:

**(A) meshStandardMaterial props added:**
```tsx
aoMap={resolved.aoMap ?? undefined}
aoMapIntensity={1}
displacementMap={resolved.displacementMap ?? undefined}
displacementScale={0.05}
```

`?? undefined` matches the existing `roughnessMap` pattern — when the field is null (still loading or orphan), the prop is absent.

**(B) uv2 setAttribute via geometry ref callback (example from WallMesh):**
```tsx
<planeGeometry
  ref={(geo) => {
    if (geo && !geo.attributes.uv2) {
      const uv = geo.attributes.uv as THREE.BufferAttribute | undefined;
      if (uv) geo.setAttribute('uv2', new THREE.BufferAttribute(uv.array.slice(), 2));
    }
  }}
  args={[length, height]}
/>
```
The `.slice()` copy avoids sharing the underlying ArrayBuffer between `uv` and `uv2`. The `if (!geo.attributes.uv2)` guard is idempotent (safe on re-mount).

**Per-file specifics:**

| File | Geometry type | uv2 setup approach |
|------|---------------|-------------------|
| `WallMesh.tsx` | `planeGeometry` overlay (priority-1 colorMap branch, ~line 282) | ref callback on JSX `<planeGeometry>` |
| `FloorMesh.tsx` | `planeGeometry` (shared mesh-level, ~line 127) | ref callback on JSX `<planeGeometry>` |
| `CeilingMesh.tsx` | `ShapeGeometry` (created via `useMemo`) | `useMemo`-based attribute write on geometry instance |
| `CustomElementMesh.tsx` | `boxGeometry` (mesh-level, ~line 160) | ref callback on JSX `<boxGeometry>` |

**displacementScale=0.05 rationale:** Three.js default `displacementScale` is `1.0`. In this app's foot-coordinate world, 1.0 means 1 ft of vertex displacement — visible geometry explosion. 0.05 = ~0.6 inches, the correct subtle depth (RESEARCH §Pitfall 2).

**uv2 rationale:** Three.js `aoMap` sampler reads from `uv2`, not `uv`. Without the `setAttribute('uv2', ...)` call, the AO map is silently ignored (RESEARCH §Pitfall 1). Every geometry that binds `aoMap` needs `uv2`.

**Legacy branches unchanged:** paint, wallpaper pattern/color, userTexture, art — none were modified. The base ExtrudeGeometry wall body was not touched (it has no Material binding).

### Task 2: PBR-03 Scope Clarification on ProductMesh + ProductBox

`PBR-03` in v1.20-REQUIREMENTS.md formally lists ProductMesh as in-scope. Audit confirmed it does NOT consume the Material catalog — it uses `useProductTexture(textureUrl)` (legacy single-texture path tied to `product.imageUrl`). There is no `finishMaterialId` wired to the render path (only ProductBox's box-mode path has `finishMaterialId` forwarded, and even that bypasses `useResolvedMaterial`).

Both files received top-of-file audit comment blocks explaining the scope decision and the future-phase migration recipe: "mirror the WallMesh priority-1 pattern (uv2 + aoMap + displacementMap with displacementScale=0.05)."

## PBR-03 Formal Scope

| Surface | In scope | Reason |
|---------|----------|--------|
| WallMesh | YES | Wired into Material catalog (Phase 67-69); `useResolvedMaterial` available |
| FloorMesh | YES | Same |
| CeilingMesh | YES | Same |
| CustomElementMesh | YES | Same (per-face via FaceMaterial) |
| ProductMesh | NO | Legacy `useProductTexture` path; no `useResolvedMaterial` call |
| ProductBox | NO | Same — `useProductTexture` only; `finishMaterialId` bypasses resolver |

## Deviations from Plan

None - plan executed exactly as written. One pre-condition was satisfied first: the Plan 01 data pipeline (`aoMapId`/`displacementMapId` in `useResolvedMaterial`) was not yet applied to this worktree. Cherry-picked commits `db0d570` + `84e962e` from the Plan 01 parallel worktree (agent-a7fb79ea19abb5442) to satisfy the `depends_on: [78-01]` constraint.

## Manual UAT Step

To see the visual payoff:
1. Open UploadMaterialModal (or the Material edit flow)
2. Upload a high-contrast AO map (e.g. a tile-grout ambient occlusion image — dark in crevices, bright on faces)
3. Upload a displacement map (e.g. a fabric weave heightmap)
4. Apply the Material to a wall surface
5. Switch to 3D view
6. Expected: wall shows pronounced grout/recess shadow (from AO) + subtle vertex displacement (~0.6 inches) that was absent before Phase 78

## Known Stubs

None — this plan wires real texture data to real Three.js props. No placeholders or hardcoded empty values in the render path.

## Self-Check: PASSED

- FOUND: src/three/WallMesh.tsx
- FOUND: src/three/FloorMesh.tsx
- FOUND: src/three/CeilingMesh.tsx
- FOUND: src/three/CustomElementMesh.tsx
- FOUND: .planning/phases/78-pbr-maps-pbr-maps-01-v1-20-active/78-03-SUMMARY.md
- COMMIT aff741d: feat(78-03): bind aoMap + displacementMap + uv2 on surface meshes
- COMMIT 5a88ec1: docs(78-03): scope-clarification on ProductMesh + ProductBox
- COMMIT 3d99978: test(78-03): TDD RED tests
- COMMIT c160af2: feat(78-01): Plan 01 data pipeline dependency
