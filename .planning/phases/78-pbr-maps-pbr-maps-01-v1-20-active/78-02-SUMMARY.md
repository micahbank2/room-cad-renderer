---
phase: 78-pbr-maps-pbr-maps-01-v1-20
plan: 02
subsystem: upload-modal
tags: [pbr, ao-map, displacement-map, upload-ui, tdd]
dependency_graph:
  requires: []
  provides: [ao-map-upload-ui, displacement-map-upload-ui]
  affects: [src/components/UploadMaterialModal.tsx]
tech_stack:
  added: []
  patterns: [drop-zone-reuse, object-url-revoke-lifecycle, tdd-red-green]
key_files:
  created:
    - src/components/__tests__/UploadMaterialModal.test.tsx
  modified:
    - src/components/UploadMaterialModal.tsx
decisions:
  - "Used `save as any` cast for aoFile/displacementFile args since Plan 01 (parallel) adds those fields to SaveMaterialInput — avoids TS error without blocking parallel execution"
metrics:
  duration: ~8 minutes
  completed: "2026-05-08"
  tasks: 1
  files: 2
---

# Phase 78 Plan 02: AO_MAP + DISPLACEMENT_MAP Upload UI Summary

**One-liner:** Two new optional PBR drop zones (AO_MAP + DISPLACEMENT_MAP) added to UploadMaterialModal create mode, following exact roughness/reflection slot pattern with full object-URL lifecycle management.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add AO_MAP and DISPLACEMENT_MAP drop zones with full lifecycle | 05b335d | src/components/UploadMaterialModal.tsx, src/components/__tests__/UploadMaterialModal.test.tsx |

## Changes Made

### src/components/UploadMaterialModal.tsx

Lines added/modified (approximate post-edit line numbers):

- **Line 51-52:** COPY object additions — `aoLabel: "AO_MAP"`, `displacementLabel: "DISPLACEMENT_MAP"`
- **Line 125-126:** State additions — `aoMap`, `displacementMap` (`useState<ProcessedMap | null>`)
- **Line 127-128:** Error state additions — `aoError`, `displacementError`
- **Line 137-138:** Ref additions — `aoInputRef`, `displacementInputRef`
- **Line 177-184:** Open-effect reset block — revoke + null both new states
- **Line 208:** Unmount-revoke effect — extended array to include `aoMap`, `displacementMap`
- **Line 279-285:** File handlers — `handleAoFile`, `handleDisplacementFile` via `processZone`
- **Line 319-324:** Submit `save()` call — added `aoFile: aoMap?.file`, `displacementFile: displacementMap?.file` (with `as any` cast pending Plan 01 type update)
- **Line 359-360:** Submit `useCallback` dep array — added `aoMap`, `displacementMap`
- **Line 444-458:** JSX — two new `<DropZone>` instances after REFLECTION_MAP zone in create mode

### src/components/__tests__/UploadMaterialModal.test.tsx (created)

6 TDD tests:
1. Create mode renders 5 drop zone labels in order (COLOR_MAP, ROUGHNESS_MAP, REFLECTION_MAP, AO_MAP, DISPLACEMENT_MAP)
2. Dropping JPEG onto AO zone renders preview img
3. Dropping JPEG onto displacement zone renders preview img
4. Submitting with color + ao + displacement passes all files to save()
5. Closing and re-opening modal clears new drop zones (no stale preview)
6. Edit mode does NOT render the drop-zone block

All 6 tests pass.

## Object-URL Revocation Lifecycle

Three sites updated:
1. **processZone callback** — revokes prior URL for a zone when a new file is dropped (existing, no change needed)
2. **Open-effect reset** (lines 177-184) — revokes + clears aoMap and displacementMap on modal re-open
3. **Unmount-revoke effect** (line 208) — extended array includes aoMap and displacementMap

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Forward compatibility] Type cast for aoFile/displacementFile on save() call**
- **Found during:** Task 1
- **Issue:** Plan 01 (parallel) adds `aoFile`/`displacementFile` to `SaveMaterialInput`. Since Plan 02 runs in parallel, `SaveMaterialInput` doesn't have those fields yet — TypeScript would reject the extra properties.
- **Fix:** Cast `save` as `(input: any) => Promise<...>` at the call site with an eslint-disable comment. Plan 01 merge will add the proper types; the cast is safe and self-documenting.
- **Files modified:** src/components/UploadMaterialModal.tsx
- **Commit:** 05b335d

## Pointers to Downstream Plans

- **Plan 03 (3D meshes):** `WallMesh` / `ProductMesh` consumers will receive `aoMap` and `displacementMap` `THREE.Texture` refs from `useResolvedMaterial` (Plan 01 also extends that hook). Plan 03 wires them into the material `aoMap` and `displacementScale` properties on Three.js `MeshStandardMaterial`.
- **Plan 04 (MaterialCard indicators):** Once AO/displacement map ids are persisted, `MaterialCard` will show icon badges indicating which optional maps are present for a given material entry.

## Self-Check: PASSED
