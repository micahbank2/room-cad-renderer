---
phase: 03-3d-product-rendering
plan: 02
subsystem: three/scene
tags: [viz-06, r3f, pbr, shadows, tone-mapping, floor-texture]
requires: [03-01]
provides:
  - "procedural wood-plank floor texture (Canvas2D → THREE.CanvasTexture)"
  - "ACES Filmic tone mapping on R3F Canvas"
  - "PCF soft shadows"
  - "preserveDrawingBuffer:true (prereq for plan 03 PNG export)"
  - "warm off-white PBR wall material"
  - "drei Environment preset=apartment ambient PBR bounce"
affects:
  - "visual coherence of 3D viewport (VIZ-06)"
tech-stack:
  added: []
  patterns:
    - "module-memoized procedural CanvasTexture with per-call repeat update"
    - "jsdom canvas 2D context stub for test parity"
key-files:
  created:
    - src/three/floorTexture.ts
  modified:
    - src/three/ThreeViewport.tsx
    - src/three/Lighting.tsx
    - src/three/WallMesh.tsx
    - tests/floorTexture.test.ts
    - tests/setup.ts
decisions:
  - "Memoize floor texture at module level; cheap repeat.set() per call keeps tile scale in sync with room dims"
  - "Stubbed HTMLCanvasElement.getContext('2d') in tests/setup.ts so procedural-texture modules can run under jsdom"
metrics:
  duration: 2m
  completed: 2026-04-05
---

# Phase 03 Plan 02: 3D Scene Coherence (VIZ-06) Summary

Replaced the flat diagnostic 3D preview with a coherent warm scene: wood-plank floor, PBR walls, soft shadows, ACES tone mapping, and drei Environment indirect bounce. Also set `preserveDrawingBuffer:true` so plan 03 can capture PNG exports.

## What Was Built

### `src/three/floorTexture.ts` (new)
- `createFloorTexture()` — paints a 512×512 warm-oak Canvas2D plank pattern (4 horizontal planks per tile with grain streaks + staggered end-seams) and wraps it in `THREE.CanvasTexture` with `RepeatWrapping` + `SRGBColorSpace`.
- `getFloorTexture(roomW, roomL)` — module-memoized accessor; lazily creates the texture once, then calls `repeat.set(x, y)` per call so the tile scale tracks room dimensions live.
- `tileRepeatFor(roomW, roomL, tileFt=4)` — pure helper returning `{x, y}` repeat for a 4 ft plank tile.
- `__resetFloorTextureCache()` — test-only cache reset.

### `src/three/ThreeViewport.tsx` (edit)
- Canvas gl prop: `{ preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }`
- `shadows="soft"` (PCF soft shadow map)
- Floor mesh swapped from flat `#f5f0e8` to `map={floorTexture}` with `roughness={0.75}`
- `<Suspense><Environment preset="apartment" /></Suspense>` mounted in Scene for ambient PBR bounce

### `src/three/Lighting.tsx` (edit)
- Directional light `shadow-mapSize` bumped from 2048 to 4096 for sharper soft shadows.

### `src/three/WallMesh.tsx` (edit)
- Wall material updated: `#f8f5ef` warm off-white, `roughness=0.85`, `metalness=0.0`.
- Wall mesh now has `castShadow` + `receiveShadow` so the sun light creates geometry-consistent shadows.

### `tests/floorTexture.test.ts` (edit)
Four passing tests replacing Wave 0 `it.todo` stubs:
- CanvasTexture 512×512 with SRGB + RepeatWrapping
- `getFloorTexture` memoization (same instance across calls)
- `tileRepeatFor(16, 12)` → `{x:4, y:3}`
- `tileRepeatFor(8, 8)` → `{x:2, y:2}`

## Verification

- `bun x vitest run tests/floorTexture.test.ts`: 4 passed
- `bun x vitest run` (full suite): 80 passed / 3 todo
- `bun run build`: exits 0, no type errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jsdom lacks HTMLCanvasElement 2D context**
- **Found during:** Task 1 test run
- **Issue:** `canvas.getContext("2d")` returns `null` under jsdom, which blocks any test that imports `createFloorTexture` because the module touches ctx on import-free call paths at test time.
- **Fix:** Added a minimal `CanvasRenderingContext2D` stub (all drawing methods as no-ops) at the top of `tests/setup.ts`. This leaves production code untouched and unblocks floorTexture tests without needing to pull in a `canvas` native dep.
- **Files modified:** `tests/setup.ts`
- **Commit:** 0f1195a

## Known Stubs

None. All D-05/D-06/D-07/D-08/D-09 must-haves are wired to real data (room dims) or real materials.

## Self-Check: PASSED

- `src/three/floorTexture.ts` — FOUND
- `src/three/ThreeViewport.tsx` — FOUND with ACES + preserveDrawingBuffer + Environment + floorTexture wiring
- `src/three/Lighting.tsx` — FOUND with 4096 shadow map
- `src/three/WallMesh.tsx` — FOUND with #f8f5ef PBR material + castShadow
- `tests/floorTexture.test.ts` — FOUND with 4 tests
- Commit 0f1195a — FOUND
- Commit ac4b644 — FOUND
