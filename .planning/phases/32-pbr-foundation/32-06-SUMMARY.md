---
phase: 32-pbr-foundation
plan: 06
status: partial-superseded
superseded_by: 32-07
updated: 2026-04-21
---

# Plan 32-06 — Partial, superseded by 32-07

## Outcome

Tasks 1 and 2 landed and are correct. Task 3 (human verification) FAILED: uploaded wallpaper and wallArt still disappeared after 2D → 3D toggle cycles. Jessica's per-step report:

| Step | Result |
|------|--------|
| 3  Wallpaper survives first 2D→3D toggle   | **FAILED** |
| 4  Wallpaper survives second/third toggle   | **FAILED** |
| 6  WallArt survives three toggles           | **FAILED** |
| 9  WOOD_PLANK ceiling PBR                   | passed |
| 10 PLASTER ceiling PBR                      | passed |
| 12 PAINTED_DRYWALL unchanged                | passed |
| 11 CONCRETE floor PBR                       | passed |
| 13 Color swatch wallpaper                   | passed |
| 14 Paint swatch wallpaper                   | passed |

## Root cause (third diagnosis — actually correct this time)

Plan 32-06's non-disposing module caches ARE correctly holding the `THREE.Texture` instances across unmount. But **React Three Fiber auto-disposes GPU resources attached to unmounting primitives by default**. When `WallMesh` unmounts on a 2D toggle, R3F traverses its children and calls `.dispose()` on the `meshStandardMaterial`'s textures — including the `map={tex}` reference to our cached wallpaper/wallArt texture.

The cache still holds the same Texture *instance*, but R3F has already called `.dispose()` on it. On remount the fresh renderer tries to re-upload a disposed texture, which fails silently → blank wallpaper/wallArt.

Evidence the diagnosis is correct:
- Color/paint paths work (no texture, just color/map-free material) ✓
- PBR paths work (fresh `loadPbrSet` call → fresh Texture instance on each remount, so dispose-on-unmount is fine) ✓
- Only the *cached-reuse* texture paths fail (wallpaper, wallArt, custom-upload floor) ✓

## Tasks landed (retain)

- `b7d3b4c` — `src/three/wallpaperTextureCache.ts`, `wallArtTextureCache.ts`, non-disposing caches + tests. Keep.
- `8047856` — `src/three/WallMesh.tsx` routes to the new hooks. Keep.

## Successor: Plan 32-07

`32-07-PLAN.md` adds the R3F escape hatch: `<primitive attach="map" object={tex} dispose={null} />` at every wallpaper/wallArt render site in `WallMesh`, plus the equivalent for the custom-upload floor path in `FloorMesh`. PBR paths unchanged. Includes a regression test that locks the `dispose={null}` contract (grep-verifiable) and a unit test that simulates unmount and asserts the cached Texture instance's `.dispose` is never called by the module cache (already true from 32-06, but explicit now).

## Commits

- `b7d3b4c` feat(32-06): restore non-disposing wallpaper/wallArt caches + tests
- `8047856` feat(32-06): switch WallMesh to restored caches
- (this file) docs(32-06): mark partial + superseded
