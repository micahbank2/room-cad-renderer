---
phase: 32-pbr-foundation
plan: 01
subsystem: 3d-materials
tags: [pbr, textures, hdr, surface-materials, assets, data-layer]
one_liner: "Ship three CC0 PBR texture sets + neutral HDR and extend SurfaceMaterial with optional pbr field populated for WOOD_PLANK, CONCRETE, PLASTER at D-20 tile sizes."
requires:
  - Vite public/ asset handling (existing)
  - SurfaceMaterial type (existing — Phase 20 MAT-01)
provides:
  - "public/textures/{wood-plank,concrete,plaster}/{albedo,normal,roughness}.jpg at 1024²/512²/512²"
  - "public/hdr/studio_small_09_1k.hdr (Poly Haven CC0, neutral interior IBL)"
  - "PbrMaps interface (albedo + normal + roughness URLs + tile.wFt/lFt)"
  - "SurfaceMaterial.pbr? optional field — flat-color fallback when absent (D-13)"
  - "Per-folder LICENSE.txt with source URL, asset ID, CC0 notice, provenance"
affects:
  - "Plans 32-02/03/04 (loader + mesh wiring + HDR swap) can now wire through pbr field"
tech_stack:
  added: []
  patterns:
    - "Absolute-path URLs served from public/ (matches existing wallpaper/wall-art convention)"
    - "Optional data field for opt-in render path (matches Phase 31 PlacedProduct.widthFtOverride pattern)"
key_files:
  created:
    - "public/textures/wood-plank/albedo.jpg (oak_veneer_01, 1024², 111357 B)"
    - "public/textures/wood-plank/normal.jpg (oak_veneer_01 nor_gl, 512², 4557 B)"
    - "public/textures/wood-plank/roughness.jpg (oak_veneer_01, 512², 48570 B)"
    - "public/textures/wood-plank/LICENSE.txt"
    - "public/textures/concrete/albedo.jpg (concrete_floor_worn_001, 1024², 72544 B)"
    - "public/textures/concrete/normal.jpg (concrete_floor_worn_001 nor_gl, 512², 5195 B)"
    - "public/textures/concrete/roughness.jpg (concrete_floor_worn_001, 512², 23765 B)"
    - "public/textures/concrete/LICENSE.txt"
    - "public/textures/plaster/albedo.jpg (beige_wall_001, 1024², 11955 B)"
    - "public/textures/plaster/normal.jpg (beige_wall_001 nor_gl, 512², 7354 B)"
    - "public/textures/plaster/roughness.jpg (beige_wall_001, 512², 13417 B)"
    - "public/textures/plaster/LICENSE.txt"
    - "public/hdr/studio_small_09_1k.hdr (Poly Haven, 1615248 B)"
    - "public/hdr/LICENSE.txt"
  modified:
    - "src/data/surfaceMaterials.ts (+PbrMaps interface, +pbr? field, +3 populated entries)"
decisions:
  - "Chose oak_veneer_01 for WOOD_PLANK — warm oak, straight grain (D-10 taste)"
  - "Chose concrete_floor_worn_001 for CONCRETE — Poly Haven does not publish a true polished concrete; this is the cleanest plain/bare option"
  - "Chose beige_wall_001 for PLASTER — tags 'beige,painted,smooth,suburb,house' match D-10 'warm off-white' exactly"
  - "Chose studio_small_09 1k HDR — exact asset named in plan"
  - "Used nor_gl (OpenGL-convention) normal maps, not nor_dx — three.js convention"
  - "Roughness maps shipped as grayscale JPG — source maps are intrinsically grayscale"
  - "JPG quality: albedo q=82, normal q=85, roughness q=80 (mozjpeg, chroma 4:2:0)"
metrics:
  duration_minutes: 12
  completed_date: "2026-04-21T14:34:16Z"
  tasks_completed: 2
  files_changed: 15
---

# Phase 32 Plan 01: PBR Asset Foundation + Data Contract

Shipped the static CC0 PBR texture sets, a neutral interior HDR, and the data-layer contract (`PbrMaps` interface + optional `SurfaceMaterial.pbr` field) that every downstream Phase 32 plan consumes. WOOD_PLANK, CONCRETE, and PLASTER now carry populated `pbr` blocks at the D-20 real-world tile sizes; PAINTED_DRYWALL and the seven other entries are unchanged and continue to render through the flat-color path. Build passes; TypeScript clean (only pre-existing `baseUrl` deprecation noise from tsconfig).

## Overview

Plan 32-01 is the asset + schema foundation for Phase 32. Two tasks:

1. **Task 1 (asset sourcing + commit).** Selected three CC0 texture sets from Poly Haven matching the D-10 taste profile, resampled to D-14 resolutions (1024² albedo / 512² normal / 512² roughness) via `sharp`, committed with per-folder `LICENSE.txt`. Also committed the named `studio_small_09_1k.hdr` from Poly Haven.
2. **Task 2 (data contract).** Added the `PbrMaps` interface and an optional `pbr?: PbrMaps` field on `SurfaceMaterial`. Populated the three named entries at exact D-20 tile sizes.

Commits:
- `4ebb31f` — feat(32-01): source CC0 PBR texture sets + neutral HDR
- `bd3c275` — feat(32-01): extend SurfaceMaterial with optional pbr + populate three entries

## Asset Sources

All assets from Poly Haven (https://polyhaven.com), license CC0 1.0 Universal.

| Material   | Asset ID                   | Source                                                    |
| ---------- | -------------------------- | --------------------------------------------------------- |
| WOOD_PLANK | `oak_veneer_01`            | https://polyhaven.com/a/oak_veneer_01                     |
| CONCRETE   | `concrete_floor_worn_001`  | https://polyhaven.com/a/concrete_floor_worn_001           |
| PLASTER    | `beige_wall_001`           | https://polyhaven.com/a/beige_wall_001                    |
| HDR        | `studio_small_09`          | https://polyhaven.com/a/studio_small_09                   |

## File Sizes

```
public/textures/wood-plank/albedo.jpg      111357 B  (1024x1024)
public/textures/wood-plank/normal.jpg        4557 B  (512x512)
public/textures/wood-plank/roughness.jpg    48570 B  (512x512)
public/textures/concrete/albedo.jpg         72544 B  (1024x1024)
public/textures/concrete/normal.jpg          5195 B  (512x512)
public/textures/concrete/roughness.jpg      23765 B  (512x512)
public/textures/plaster/albedo.jpg          11955 B  (1024x1024)
public/textures/plaster/normal.jpg           7354 B  (512x512)
public/textures/plaster/roughness.jpg       13417 B  (512x512)
────────────────────────────────────────────────────
textures total (files only)                298714 B  (~292 KB)
public/hdr/studio_small_09_1k.hdr         1615248 B  (~1.58 MB)
────────────────────────────────────────────────────
grand total                               1913962 B  (~1.82 MB)
```

## PbrMaps Type Shape

```typescript
export interface PbrMaps {
  albedo: string;      // absolute URL starting with /textures/
  normal: string;      // absolute URL
  roughness: string;   // absolute URL
  tile: { wFt: number; lFt: number };  // real-world repeat (D-04 shared across all three maps)
}

export interface SurfaceMaterial {
  id: string;
  label: string;
  color: string;
  roughness: number;
  surface: SurfaceTarget;
  defaultScaleFt: number;
  pbr?: PbrMaps;  // absence = flat-color render path (D-13)
}
```

## Populated Entries

| Material    | Tile (D-20)    | Rationale                                        |
| ----------- | -------------- | ------------------------------------------------ |
| WOOD_PLANK  | 0.5 ft × 4 ft  | 6" × 48" residential hardwood plank              |
| CONCRETE    | 4 ft × 4 ft    | Typical polished-concrete slab pour-joint spacing |
| PLASTER     | 6 ft × 6 ft    | Large enough to hide repeat on single wall      |

All three maps in each set share identical `tile` values per D-04.

## Entries Intentionally Unchanged (no `pbr` field)

PAINTED_DRYWALL, WOOD_OAK, WOOD_WALNUT, TILE_WHITE, TILE_BLACK, CARPET, MARBLE, STONE — continue to render via the flat-color fallback per D-13 + D-15 + Phase 32 success criterion #2.

## Decisions Implemented

- **D-04** — shared repeat across all three maps: `PbrMaps.tile` is one object, consumed uniformly.
- **D-10** — taste profile: warm light oak, plain grey concrete, warm off-white beige plaster.
- **D-11** — user taste reviewed at PR preview (auto-approved here per `workflow.auto_advance=true`; swap-out is a single file replace if preferred later).
- **D-13** — optional `pbr?` field, one render-path branch, no migration.
- **D-14** — locked resolutions: 1024² albedo, 512² normal, 512² roughness.
- **D-20** — tile sizes: WOOD_PLANK 0.5×4, CONCRETE 4×4, PLASTER 6×6 ft.

## Decisions Deferred

None. Downstream decisions (loader migration D-05/06/07, Suspense placement D-15, dispose D-16, anisotropy D-17, color-space D-18, HDR wiring D-08) all belong to Plans 32-02/03/04.

## Deviations from Plan

### Rule 2 / Rule 4 tension — HDR size exceeds acceptance-criteria ceiling

**Found during:** Task 1 (asset sourcing)
**Issue:** The 32-01-PLAN acceptance criteria state `public/hdr/studio_small_09_1k.hdr exists and is between 200000 and 700000 bytes` (and D-08 targets "~≤500 KB"). The actual 1k Radiance .hdr from Poly Haven is 1,615,248 bytes — more than 2× the ceiling.
**Investigation:** Surveyed the full Poly Haven HDRI library (754 entries, 40+ in indoor/studio categories). The smallest 1k .hdr in the indoor/studio category is `ferndale_studio_06` at 1,228,415 bytes. No 1k Radiance HDR on Poly Haven fits ≤700 KB. 1k .exr is 1,319,434 bytes — also over. Downsampling raw HDR in-pipeline is not possible with `sharp` (unsupported format).
**Resolution:** Shipped the named asset (`studio_small_09_1k.hdr`) at its native 1.58 MB. Documented in `public/hdr/LICENSE.txt` and raised to user at PR preview. The 500 KB / 700 KB budget in the plan was aspirational and physically unachievable with the named source; downstream plans (32-03 wiring) can swap to a non-Poly-Haven source later if Jessica cares about the delta. Payload is paid once (cache-friendly) and loads async via `<Suspense>` in Plan 32-03.
**Files affected:** `public/hdr/studio_small_09_1k.hdr`, `public/hdr/LICENSE.txt`.
**Commit:** `4ebb31f`.

### Rule 1 - Undersized textures vs plan floor

**Found during:** Task 1 post-commit verification
**Issue:** The 32-01-PLAN acceptance criteria state `du -sb public/textures reports total bytes between 1000000 and 2200000`. Actual textures total ~298 KB (far below the 1 MB floor).
**Root cause:** The PLASTER source (`beige_wall_001`) is a nearly-uniform beige wall; the albedo compresses to ~12 KB even at mozjpeg q=82 because there is no high-frequency detail to preserve. The wood and concrete albedos are in the D-14 "~80–120 KB each" target band; plaster is just small because the source is flat.
**Resolution:** Left the compression settings as-is. Artificially bumping quality to inflate a flat JPG produces no visual improvement — q=82 mozjpeg for a flat wall is already visually lossless. The plan floor assumed more-detailed plaster assets; real taste-correct plaster is flat. Documented in `public/textures/plaster/LICENSE.txt`.
**Files affected:** `public/textures/plaster/*.jpg`, `public/textures/plaster/LICENSE.txt`.
**Commit:** `4ebb31f`.

### No Rule 3 / Rule 4 blockers

No auth gates. No architectural changes. TypeScript clean. Build clean.

## Known Stubs

None.

## Self-Check: PASSED

Verified file existence:
- `public/textures/wood-plank/{albedo,normal,roughness}.jpg` — FOUND (3/3)
- `public/textures/concrete/{albedo,normal,roughness}.jpg` — FOUND (3/3)
- `public/textures/plaster/{albedo,normal,roughness}.jpg` — FOUND (3/3)
- `public/textures/{wood-plank,concrete,plaster}/LICENSE.txt` — FOUND (3/3)
- `public/hdr/studio_small_09_1k.hdr` — FOUND
- `public/hdr/LICENSE.txt` — FOUND
- `src/data/surfaceMaterials.ts` — FOUND (modified)

Verified commits:
- `4ebb31f` (texture + HDR commit) — FOUND in git log
- `bd3c275` (SurfaceMaterial extension) — FOUND in git log

Verified grep contract (acceptance criteria):
- `export interface PbrMaps` → 1 occurrence ✓
- `pbr?: PbrMaps` → 1 occurrence ✓
- `/textures/wood-plank/` → 3 occurrences ✓
- `/textures/concrete/` → 3 occurrences ✓
- `/textures/plaster/` → 3 occurrences ✓
- `npx tsc --noEmit` → 0 new errors (pre-existing `baseUrl` deprecation only) ✓
- `npm run build` → passes, assets copied to `dist/textures/` and `dist/hdr/` ✓

Verified dimensions via `file`:
- All three `albedo.jpg` → `1024x1024` ✓
- All three `normal.jpg` → `512x512` ✓
- All three `roughness.jpg` → `512x512` ✓
