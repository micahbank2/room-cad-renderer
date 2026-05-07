---
phase: 68-material-application-system-mat-apply-01
plan: 05
subsystem: material-application
tags: [renderer, 2d, fabric, material, wave-3]
requires:
  - 68-02 (Wave 1 — types + pure resolver)
  - 68-03 (Wave 2 — migration + store actions, scaleFtA/scaleFtB/floorScaleFt fields)
provides:
  - "src/canvas/materialPatternCache.ts: async fabric.Pattern cache (getMaterialPattern + clearMaterialPatternCache) keyed by (materialId, tileSizeFt, pixelsPerFoot)"
  - "src/canvas/fabricSync.ts: D-03 priority-1 materialIdA/B branch on wall fill (paint colorHex sync; textured colorMapId async with fc.requestRenderAll redraw)"
  - "src/canvas/fabricSync.ts: NEW exported renderFloor(fc, room, scale, origin, materials) — first 2D render path for the floor surface"
  - "src/canvas/FabricCanvas.tsx: useMaterials() hook call + renderFloor wired before renderWalls + materials/activeDoc in redraw deps"
affects:
  - "Plan 06 (MaterialPicker UI) can drive both 2D and 3D from a single applySurfaceMaterial call (3D path = Plan 04, 2D path = this plan)"
  - "Phase 68 success criterion #2 (paint Material renders flat color in 2D; textured Material renders pattern after async load) is GREEN for the 2D side"
  - "fabricSync.materialFill Wave 0 RED test → GREEN"
tech-stack:
  added: []
  patterns:
    - "Async fabric.Pattern cache mirrors src/three/wallpaperTextureCache.ts non-disposing pattern (textures survive Fabric.Canvas teardown within the same JS realm)"
    - "Inflight-load deduplication via parallel Map<string, Promise> avoids redundant blob fetches when two walls share a Material"
    - "Synchronous colorHex placeholder (#888) on first cache miss prevents 'flash of empty wall' while async load resolves"
    - "URL.createObjectURL + URL.revokeObjectURL paired in try/catch (no blob-URL leak on success or failure)"
key-files:
  created:
    - src/canvas/materialPatternCache.ts
    - .planning/phases/68-material-application-system-mat-apply-01/68-05-SUMMARY.md
  modified:
    - src/canvas/fabricSync.ts
    - src/canvas/FabricCanvas.tsx
    - src/canvas/__tests__/fabricSync.materialFill.test.ts
decisions:
  - "Default-arg signature on renderWalls (materials = [], pixelsPerFoot = scale) keeps legacy callers (test fixtures, future tooling) compiling without forcing a Material catalog. Production caller (FabricCanvas) always passes both."
  - "Pattern cache keyed on (materialId, tileSizeFt, pixelsPerFoot) — the tile pixel size depends on both fields, so a zoom change OR a tile-size override invalidates the cache key (correctness over reuse). Acceptable cost: catalog is O(10s) of Materials per project."
  - "renderFloor uses convex-room footprint (walk wall.start points) for v1.17. Non-convex rooms get a degraded but visually-acceptable polygon. Phase 70 'Assemblies' or a follow-up cleanup phase can swap in a wall-graph traversal."
  - "Ceiling 2D fill is intentionally NOT added (RESEARCH Open Question 5). Ceilings stay as outlines in top-down view — adding a fill would clutter the 2D plan. 3D viewport (Plan 04) handles ceiling Materials."
metrics:
  duration: ~12 min
  completed: 2026-05-07
  tasks: 2
  files_modified: 4
---

# Phase 68 Plan 05: 2D Fabric.js Renderer Rewire

Wave 3b ships the 2D side of the Material application engine. The new `materialPatternCache` handles async texture loads with inflight dedup; `fabricSync` gains the priority-1 materialId branch on per-side wall fill; and a new `renderFloor` function adds the first ever 2D render path for the floor surface (pre-Phase-68, the floor was 3D-only).

## What Changed

### Task 1 — `materialPatternCache` async fabric.Pattern loader (commit 6f2524e)

- **src/canvas/materialPatternCache.ts** (NEW)
  - `patternCache: Map<string, fabric.Pattern>` keyed by `${materialId}|${tileSizeFt}|${pixelsPerFoot}`.
  - `inflightLoads: Map<string, Promise<fabric.Pattern | null>>` for dedup.
  - `getMaterialPattern(material, tileSizeFt, pixelsPerFoot, onReady?)`:
    - Returns null synchronously when `material.colorMapId` unset.
    - Returns cached Pattern synchronously on hit.
    - Returns null on cache miss; queues async load that fetches `getUserTexture(colorMapId)` → blob URL → `HTMLImageElement` → offscreen canvas (sized to `Math.max(8, round(tileSizeFt * pixelsPerFoot))`) → `new fabric.Pattern({ source: canvas, repeat: "repeat" })`. `onReady(pattern)` fires once the Pattern resolves so callers (renderWalls, renderFloor) can `fc.requestRenderAll()`.
    - URL.createObjectURL paired with URL.revokeObjectURL in both success and catch paths (no blob-URL leak).
  - `clearMaterialPatternCache()` for tests.

### Task 2 — `fabricSync` materialId branch + `renderFloor` (commit 6cb2298)

- **src/canvas/fabricSync.ts**
  - Imports `Material`, `resolveSurfaceTileSize`, `getMaterialPattern`.
  - `renderWalls` signature extended: `materials: ReadonlyArray<Material> = []`, `pixelsPerFoot: number = scale`. Legacy callers (test fixtures) compile unchanged via defaults.
  - Per-side priority-1 branch above the existing `wall.wallpaper.A/B` paint chain:
    - `wall.materialIdA` / `wall.materialIdB` looked up in `materials`.
    - Paint Material (`m.colorHex` set) → returns hex string for the polygon fill.
    - Textured Material (`m.colorMapId` set) → returns the cached Pattern OR a `#888` placeholder + queues async load via `getMaterialPattern(m, resolveSurfaceTileSize(wall.scaleFtA|B, m), pixelsPerFoot, () => fc.requestRenderAll())`.
    - When materialId unset OR Material missing OR neither colorHex nor colorMapId, falls through to legacy paint chain (D-01 read-compatibility).
  - NEW `renderFloor(fc, room, scale, origin, materials)`:
    - No-op when `room.floorMaterialId` unset OR not in catalog OR fewer than 3 wall start-points.
    - Computes the room footprint as `room.walls`'s `start.x / start.y` walked in insertion order, transformed to canvas pixels.
    - Renders a `fabric.Polygon` with the resolved fill (colorHex or Pattern), `selectable: false`, `evented: false`, `objectCaching: false`, `data: { type: "floor", floorMaterialId }`.
    - `fc.sendObjectToBack(poly)` pushes the floor beneath grid/walls/products on the next render commit (Phase 25 D-02 `renderOnAddRemove: false` preserved).
- **src/canvas/FabricCanvas.tsx**
  - `useMaterials()` hook call near other hooks.
  - `renderFloor(fc, activeDoc, scale, origin, materials)` called BEFORE `renderWalls` so the floor sits beneath.
  - `renderWalls(fc, walls, scale, origin, selectedIds, materials, scale)` — pixelsPerFoot is the same as `scale` here (canvas units = feet × scale).
  - `materials` and `activeDoc` added to redraw `useCallback` deps so material catalog mutations trigger a redraw.
- **src/canvas/\_\_tests\_\_/fabricSync.materialFill.test.ts**
  - Wave 0 RED test now uses canonical `WallSegment` shape (`id`, `start`, `end`, `thickness`, `openings: []`) instead of the placeholder `a`/`b` shape (which was never the real schema). Test contract preserved: paint Material → polygon fill is the literal `colorHex`; renderFloor adds at least one fabric object when `floorMaterialId` resolves.

## Verification

- `npx vitest run src/canvas/__tests__/fabricSync.materialFill.test.ts` → **2/2 GREEN** (Wave 0 RED test).
- `npx vitest run src/canvas/__tests__ src/lib/__tests__/materialResolver.test.ts src/lib/__tests__/snapshotMigration.v6.test.ts src/stores/__tests__/cadStore.material.test.ts` → **21/21 passed (4 todo)** — no regression in Wave 1/2 tests.
- `npx tsc --noEmit --skipLibCheck` → no errors in the four touched files.
- `npm run build` → exits 0 (1.56 MB main chunk, INEFFECTIVE_DYNAMIC_IMPORT and chunk-size warnings are pre-existing).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] Wave 0 test wall shape used `a`/`b` instead of canonical `start`/`end`**

- **Found during:** Task 2 — first vitest run threw at `wallCorners(wall)` because `wall.start` was undefined (test wall objects only had `a`/`b`).
- **Issue:** The Plan 01 RED test fixture mirrored an older brainstorm shape, but the actual `WallSegment` type uses `start`/`end`. Plan 05's mandate is to satisfy the contract ("polygon fill becomes the colorHex"), and the plan explicitly authorizes adjusting the test if it asserts something hard to reproduce in jsdom.
- **Fix:** Updated `fabricSync.materialFill.test.ts` to use canonical `WallSegment` shape: `walls = { w1: { id, start, end, thickness, openings: [], materialIdA } }`. Renamed the floor test's wall shape to match. Removed the `@ts-expect-error` directives now that `renderFloor` exists and `renderWalls` accepts the materials param.
- **Files modified:** `src/canvas/__tests__/fabricSync.materialFill.test.ts`
- **Commit:** 6cb2298

**2. [Rule 3 — Blocking issue] `renderFloor` would no-op for the floor test if the test only had 2 walls**

- **Found during:** Task 2 — initial test fixture had 2 walls (open shape); my renderFloor returned early on `< 3` start-points, producing 0 fabric objects.
- **Issue:** The plan says "Compute room footprint polygon from `room.walls`. For convex rooms: collect all wall.a points in order." A 2-wall fixture produces only 2 points → degenerate polygon. Real room shapes always have ≥ 3 walls; the test was under-specified.
- **Fix:** Added a third wall to the floor test fixture so the footprint resolves to a valid 3-point polygon. Test contract ("renderFloor adds a fabric.Polygon when floorMaterialId set") preserved.
- **Files modified:** `src/canvas/__tests__/fabricSync.materialFill.test.ts`
- **Commit:** 6cb2298

## Known Stubs

**Convex-room footprint only.** `renderFloor` walks `wall.start` points in insertion order — for non-convex rooms (L-shaped, U-shaped, courtyard) the resulting polygon is a degraded approximation rather than the true wall-graph traversal. Acceptable for v1.17 since most rooms are convex; non-convex rooms get a visually-imperfect floor but no crash. A wall-graph traversal pass is a candidate for a Phase 70+ cleanup.

## Deferred

**Ceiling 2D fabric fill.** Per RESEARCH Open Question 5 recommendation, ceilings stay as outlines in 2D (top-down view). Plan 05 does NOT add a ceiling fabric fill. 3D viewport (Plan 04) handles ceiling Materials.

## Self-Check: PASSED

- src/canvas/materialPatternCache.ts: FOUND (`getMaterialPattern`, `clearMaterialPatternCache`, `inflightLoads`, `URL.createObjectURL`, `URL.revokeObjectURL`, `new fabric.Pattern`)
- src/canvas/fabricSync.ts contains `materialIdA` AND `materialIdB`: FOUND
- src/canvas/fabricSync.ts contains `floorMaterialId`: FOUND
- src/canvas/fabricSync.ts contains `getMaterialPattern` AND `resolveSurfaceTileSize` import: FOUND
- src/canvas/fabricSync.ts contains `export function renderFloor`: FOUND
- src/canvas/fabricSync.ts contains `fc.requestRenderAll` in materialPatternCache callback: FOUND (×2 — wall + floor)
- src/canvas/FabricCanvas.tsx contains `renderFloor` call AND `useMaterials`: FOUND
- 6f2524e (Task 1 commit): FOUND
- 6cb2298 (Task 2 commit): FOUND
- fabricSync.materialFill.test.ts: 2/2 GREEN
