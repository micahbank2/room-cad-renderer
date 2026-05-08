---
phase: 69-product-material-linking-mat-link-01-v1-19-active
plan: "01"
subsystem: material-linking
tags: [material, product, finish, snapshot, store, 3d, properties-panel]
dependency_graph:
  requires: [phase-68-mat-apply-01, phase-67-mat-engine-01]
  provides: [PlacedProduct.finishMaterialId, applyProductFinish, CADSnapshot-v7]
  affects: [PropertiesPanel, ProductBox, ProductMesh, cadStore, snapshotMigration]
tech_stack:
  added: []
  patterns: [applySurfaceMaterial-mirror, StrictMode-safe-cleanup, snapshot-passthrough-migration]
key_files:
  created:
    - src/lib/__tests__/snapshotMigration.v6tov7.test.ts
    - src/stores/__tests__/applyProductFinish.test.ts
    - src/test-utils/productFinishDrivers.ts
  modified:
    - src/types/cad.ts
    - src/lib/snapshotMigration.ts
    - src/stores/cadStore.ts
    - src/three/ProductBox.tsx
    - src/three/ProductMesh.tsx
    - src/components/PropertiesPanel.tsx
    - src/main.tsx
    - tests/snapshotMigration.test.ts
decisions:
  - "Snapshot v6→v7 is trivial passthrough — finishMaterialId is optional so no per-room seeding required"
  - "GLTF products: finishMaterialId intentionally NOT forwarded (deferred to v1.20 — embedded PBR materials own surfaces)"
  - "MaterialPicker uses customElementFace surface type for product finish (same valid-material set)"
  - "Single-click commits applyProductFinish (history variant) — no mid-pick preview per D-06"
metrics:
  duration_minutes: 25
  completed: "2026-05-08T18:39:24Z"
  tasks_completed: 6
  files_modified: 9
---

# Phase 69 Plan 01: Product–Material Linking Summary

**One-liner:** Finish slot on placed box products — `PlacedProduct.finishMaterialId` field wired through snapshot v7, store actions, 3D ProductBox rendering, and PropertiesPanel picker; single Ctrl+Z reverts.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add finishMaterialId, bump snapshot v6→v7, migrateV6ToV7 | 9433a67 | cad.ts, snapshotMigration.ts, cadStore.ts, v6tov7.test.ts |
| 2 | applyProductFinish + applyProductFinishNoHistory store actions | a42dfd5 | cadStore.ts, applyProductFinish.test.ts |
| 3 | ProductBox renders finish Material when finishMaterialId set | 96ad4dc | ProductBox.tsx, ProductMesh.tsx |
| 4 | Finish PanelSection in PropertiesPanel product branch | 4c2eb8c | PropertiesPanel.tsx |
| 5 | Test driver + persistence test | 26aee30 | productFinishDrivers.ts, main.tsx |
| 6 | Full verification + build | — | — |

## Implementation Details

### Snapshot Version Bump (6 → 7)

`PlacedProduct.finishMaterialId?: string` is optional, so old snapshots are valid as-is (no field = catalog default rendering). `migrateV6ToV7()` is a pure version bump — 3 lines, no per-room seeding. Wired into `cadStore.loadSnapshot` after `migrateV5ToV6`. `defaultSnapshot()` and `snapshot()` in cadStore both produce version 7.

Also added v6 and v7 passthrough conditions to `migrateSnapshot()` — previously those versions would fall through to the "unknown / empty" fallback and return a fresh default snapshot, losing all room data.

### Store Actions

`applyProductFinish` / `applyProductFinishNoHistory` mirror the `applySurfaceMaterial` pair exactly:
- History variant: `pushHistory(s)` then mutate `placed.finishMaterialId`
- NoHistory variant: mutate only (no history push)
- Silent no-op on unknown `placedId` (no throw, no history push)
- `undefined` materialId deletes the field (restores catalog default)

### ProductBox Finish Resolution Precedence

```
isPlaceholder → placeholder color (#7c5bf0), no map, opacity 0.8
isSelected    → highlight color (#93c5fd), existing map
finishMat?.colorHex → flat color, no map (paint Material)
finishMat?.colorMapId → white color, useUserTexture(colorMapId) as map (textured Material)
(none)        → #ffffff, product.imageUrl texture (catalog default)
```

Hooks (`useMaterials`, `useUserTexture`) called unconditionally per rules of hooks.

### PropertiesPanel Finish Section

Inserted after the catalog "Material" PanelSection. For GLTF products: shows an italic deferred-feature note above the picker (picker is still rendered and writes to snapshot, but ProductMesh ignores the field for GLTF).

### GLTF Deferral Rationale

GLTF products embed PBR materials in the model file. Overriding them requires glTF material substitution (a non-trivial Three.js operation), which is out of scope for v1.19. The `finishMaterialId` field is written to the snapshot but `ProductMesh.tsx` intentionally does not forward it to the GLTF branch's ProductBox fallback. Deferred to v1.20.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed migrateSnapshot missing v6/v7 passthroughs**
- **Found during:** Task 2 (persistence test failure)
- **Issue:** `migrateSnapshot()` had passthroughs for versions 2–5 only. v6 and v7 inputs fell through to the "unknown/empty" branch returning `defaultSnapshot()`, losing all room data.
- **Fix:** Added v6 and v7 passthrough conditions before v5 in `migrateSnapshot`.
- **Files modified:** `src/lib/snapshotMigration.ts`
- **Commit:** a42dfd5

**2. [Rule 1 - Bug] Updated snapshotMigration test expectation for version 7**
- **Found during:** Task 3 (full vitest run)
- **Issue:** `tests/snapshotMigration.test.ts` asserted `defaultSnapshot().version === 6`; bumped to 7 per plan.
- **Fix:** Updated the comment and assertion to `toBe(7)`.
- **Files modified:** `tests/snapshotMigration.test.ts`
- **Commit:** 96ad4dc

## Known Stubs

None — all features functional end-to-end for box-mode products.

## Verification Results

- `npx tsc --noEmit` — clean (pre-existing TS5101 deprecation only, not an error)
- `npx vitest run` — 2 failed (pre-existing: SaveIndicator, SidebarProductPicker) | 144 passed
- `npm run build` — success in 1.54s

## Self-Check: PASSED
