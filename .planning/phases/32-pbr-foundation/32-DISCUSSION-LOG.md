# Phase 32: PBR Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 32-pbr-foundation
**Areas discussed:** Tile-size defaults, Loader migration scope, HDR environment handling, Texture source + aesthetic

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Tile-size defaults | Real-world repeat size per material | ✓ |
| Loader migration scope | Migrate existing wallpaper/wall-art/floor caches to shared helper | ✓ |
| HDR environment handling | Bundle local HDR vs CDN vs drop | ✓ |
| Texture source + aesthetic | Claude picks vs user picks vs iterate later | ✓ |

**User's choice:** All four selected.

---

## Tile-size defaults

### Wood plank repeat size

| Option | Description | Selected |
|--------|-------------|----------|
| 6″ × 48″ plank (Recommended) | Standard residential hardwood; believable at default 3/4 camera | ✓ |
| 8″ × 72″ wide-plank | Modern/luxury wide-plank, fewer seams | |
| 4″ × 36″ narrow strip | Traditional/older hardwood, denser seams | |

**User's choice:** 6″ × 48″ plank

### Concrete repeat tile

| Option | Description | Selected |
|--------|-------------|----------|
| 4′ × 4′ tile (Recommended) | Matches typical polished-concrete slab pour-joint spacing | ✓ |
| 8′ × 8′ tile | Seamless large-area, smaller per-pixel detail | |
| 2′ × 2′ tile | Tighter aggregate — looks like cast tile, not slab | |

**User's choice:** 4′ × 4′ tile

### Plaster repeat tile

| Option | Description | Selected |
|--------|-------------|----------|
| 6′ × 6′ tile (Recommended) | Large enough to hide repeat on single walls; subtle variation | ✓ |
| 3′ × 3′ tile | More visible texture variation but repeat shows on long walls | |
| 10′ × 10′ tile | Seamless on whole walls; variation very subtle | |

**User's choice:** 6′ × 6′ tile

---

## Loader migration scope

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate in Phase 32 (Recommended) | Single loader + color-space helper + dispose API; wallpaper/wall-art/floor caches consumed by new helper | ✓ |
| Leave alone, just add new path | Three caches + one new cache coexist; migration deferred to Phase 35 | |
| Migrate only floorTexture.ts | Floor is closest analog; wallpaper/wall-art stay separate | |

**User's choice:** Migrate in Phase 32

---

## HDR environment handling

| Option | Description | Selected |
|--------|-------------|----------|
| Bundle a local HDR (Recommended) | Ship ~500 KB HDR in public/; works offline; consistent lighting | ✓ |
| Keep CDN Environment | Zero bundle cost; fails offline; depends on drei CDN | |
| Drop Environment, boost ambient/hemi lights | No HDR; PBR flatter — loses subtle reflections | |

**User's choice:** Bundle a local HDR

---

## Texture source + aesthetic

| Option | Description | Selected |
|--------|-------------|----------|
| Claude picks, show me before merge | Researcher/planner picks CC0 from Poly Haven / ambientCG with tasteful default; user reviews in PR preview | ✓ |
| I want to pick each one | Phase pauses for user to name specific assets before ship | |
| Claude picks, iterate in Phase 33+ | Ship first-pass; swap later if needed | |

**User's choice:** Claude picks, show me before merge

**Taste profile locked:** warm light oak (wood), smooth polished (concrete), warm off-white (plaster).

---

## Claude's Discretion

- Shared PBR helper file placement (`src/three/pbrTextureCache.ts` vs co-located)
- Single `loadPbrSet(urls)` vs three separate loaders
- Roughness map channel layout (grayscale vs full RGB) — depends on chosen CC0 asset
- PAINTED_DRYWALL roughness treatment — interpret success criterion #2 conservatively; leave unchanged unless perceptual delta forces otherwise
- Per-mesh Suspense wrapper placement (inline vs shared `<PbrSurface>` wrapper)
- WebGL test strategy — up to planner given 340-test vitest baseline

## Deferred Ideas

- PAINTED_DRYWALL subtle roughness lift — v1.8 polish
- Per-mesh Suspense grouping fine-tuning — planner judgment; flag post-demo
- Playwright visual-smoke test strategy — Phase 35 or v1.8
- Multiple PBR variants per category (LOCK-VAR gives 1 in v1.7) — v1.8+
- Wallpaper/wall-art perceptual delta from migration — document in HUMAN-UAT if visible
