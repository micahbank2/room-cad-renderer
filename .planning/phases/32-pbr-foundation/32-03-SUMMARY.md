---
phase: 32-pbr-foundation
plan: 03
subsystem: 3d-materials
tags: [pbr, three.js, hdr, environment, texture-cache, wallpaper-migration]
one_liner: "Wire PBR data + loader cache through CeilingMesh/FloorMesh via new PbrSurface wrapper, swap Environment to bundled HDR, register renderer with cache, and migrate wallpaper/wallArt/floorTexture loaders to the shared acquireTexture API (D-05)."
requires:
  - phase: 32-pbr-foundation
    provides: "Plan 01 PBR assets + SurfaceMaterial.pbr; Plan 02 applyColorSpace/acquireTexture/releaseTexture/registerRenderer/PbrErrorBoundary"
provides:
  - "PbrSurface wrapper component (Suspense + ErrorBoundary around PBR material application)"
  - "CeilingMesh PBR branch (WOOD_PLANK / PLASTER / CONCRETE)"
  - "FloorMesh PBR branch (CONCRETE via SURFACE_MATERIALS shared 'both' surface)"
  - "Bundled HDR IBL (/hdr/studio_small_09_1k.hdr) replacing drei preset=apartment CDN"
  - "Renderer registration with pbrTextureCache (device-max anisotropy clamped ≤8)"
  - "Shared-cache wallpaper + wallArt loaders in WallMesh (useSharedTexture / useSharedTextures hooks)"
  - "floorTexture.ts colorSpace routed through applyColorSpace helper (D-18 compliance)"
affects:
  - "Phase 32 Plan 04 (verification gate) — PBR pipeline now complete end-to-end"
  - "Future Phase 33 — customTextureCache in FloorMesh left in place for LIB-06/07/08"

tech-stack:
  added: []
  patterns:
    - "Suspense-throwable resolver pattern (PbrSurface): module-level Map<key, Promise<void>> + Map<key, PbrSet>, throw pending promise on first read for Suspense integration"
    - "Hooks-hoisted pattern: textures resolved at component top level and passed as parameters into renderer functions that are called from multiple sites (Rules of Hooks)"
    - "Texture mutation-per-render: shared singleton textures from the cache have wrap/repeat re-applied each render (matches pre-migration behavior, safe because each material reads them synchronously)"

key-files:
  created:
    - src/three/PbrSurface.tsx
  modified:
    - src/three/CeilingMesh.tsx
    - src/three/FloorMesh.tsx
    - src/three/WallMesh.tsx
    - src/three/ThreeViewport.tsx
    - src/three/floorTexture.ts

key-decisions:
  - "Suspense resolver uses module-level memoization keyed by concatenated URL triple; unmount releases refs via releaseTexture in a cleanup effect"
  - "Hoisted useSharedTexture calls in WallMesh to top of component body (renderWallpaperOverlay and renderSideDecor are called twice for sides A and B; inline hook calls would violate Rules of Hooks)"
  - "Wall art and inner-frame-art meshes changed from `map={tex}` to `map={tex ?? undefined}` because the hook returns null during async load (previously the synchronous getter returned an unloaded Texture)"
  - "FloorMesh customTextureCache (user-uploaded images) intentionally NOT migrated — Phase 33 owns user-upload pipeline per D-05 scope"
  - "D-06 fix-not-rollback: shared cache applies SRGBColorSpace for channel='albedo', which fixes wallpaper/wallArt that previously rendered with three.js default NoColorSpace (slightly washed out). Documented, not reverted."

patterns-established:
  - "PbrSurface component is the single entry point for PBR material application; mesh components control widthFt/lengthFt (tile repeat) and provide the fallback JSX"
  - "One-time registerRenderer(gl) call from Scene mount — already-cached and future-acquired textures both pick up the device anisotropy (retroactive via pbrTextureCache iteration)"

requirements-completed: [VIZ-07, VIZ-08]

duration: ~5 min
completed: 2026-04-21
---

# Phase 32 Plan 03: PBR Mesh Wiring + Environment HDR + Cache Migration

**Wires Plan 01 data + Plan 02 loader into the three.js mesh components. PbrSurface wrapper adds Suspense + per-mesh ErrorBoundary (D-15). CeilingMesh and FloorMesh gain a PBR render branch that activates when `surfaceMaterialId` / preset `CONCRETE` resolves to a `SURFACE_MATERIALS` entry with a `pbr` block. ThreeViewport now loads `/hdr/studio_small_09_1k.hdr` instead of drei's CDN preset and registers the renderer with pbrTextureCache on mount. Three legacy inline caches (wallpaper, wallArt, procedural floor) migrated to share the `acquireTexture` / `applyColorSpace` code paths (D-05 / D-18).**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-21T15:17:58Z
- **Completed:** 2026-04-21T15:23:19Z
- **Tasks:** 3 implementation + 1 human-verify checkpoint (auto-approved per `workflow.auto_advance=true`)
- **Files modified:** 5 modified + 1 created

## Accomplishments

- **PBR render branch on Ceiling + Floor** — WOOD_PLANK and PLASTER ceilings now render with three-map PBR (albedo + normal + roughness); CONCRETE works on both floor and ceiling surfaces via the shared `surface: "both"` catalog entry.
- **PAINTED_DRYWALL unchanged** — absence of `pbr` field falls through to the existing flat `meshStandardMaterial` path; zero visual delta from v1.6 for the non-PBR 8 surface materials (PAINTED_DRYWALL, WOOD_OAK, WOOD_WALNUT, TILE_WHITE, TILE_BLACK, CARPET, MARBLE, STONE).
- **Local HDR IBL** — `<Environment files="/hdr/studio_small_09_1k.hdr" />` replaces `<Environment preset="apartment" />`; no more CDN fetch at first 3D render.
- **Anisotropy applied globally** — single `registerRenderer(gl)` call from Scene mount propagates the device's max anisotropy (clamped ≤8) to all cached textures, including retroactively for any acquired before the effect runs.
- **Loader consolidation (D-05)** — deleted two module-level Maps (`wallArtTextureCache`, `wallpaperTextureCache`) and their synchronous getters; replaced with `useSharedTexture` + `useSharedTextures` hooks routing through the Phase 02 refcount cache. `floorTexture.ts` now uses `applyColorSpace` for its procedural CanvasTexture (D-18 single entry point).

## Task Commits

1. **Task 1: Build shared PbrSurface wrapper + wire into CeilingMesh** — `f225899` (feat)
2. **Task 2: Wire PBR into FloorMesh + swap Environment HDR + register renderer** — `ef4f54d` (feat)
3. **Task 3: Migrate wallpaper/wallArt/floorTexture caches to shared acquireTexture (D-05)** — `5f5ed10` (refactor)

## Files Created/Modified

### Created
- `src/three/PbrSurface.tsx` — Suspense + PbrErrorBoundary wrapper around a three-map `meshStandardMaterial`. Uses module-level throwable-promise resolver so multiple meshes sharing the same pbr-set only kick off one load. Unmount cleanup calls `releaseTexture` for all three URLs.

### Modified
- `src/three/CeilingMesh.tsx` — added `PbrSurface` import; added `pbrMaterial` memo (resolves `ceiling.surfaceMaterialId` → `SURFACE_MATERIALS` lookup → optional `pbr`); added `bbox` memo (polygon bounding box → widthFt/lengthFt for tile repeat). Material element is now a ternary: PbrSurface when `pbrMaterial` is non-null, otherwise the pre-existing flat `meshStandardMaterial` (Tier-2 paint + Tier-3 legacy branches unchanged).
- `src/three/FloorMesh.tsx` — added `SURFACE_MATERIALS` + `PbrSurface` imports; added `pbrMaterial` memo keyed on `material` (only fires for `kind === "preset"` with a preset id that has a pbr block — today that's CONCRETE). Material element is now a ternary: PbrSurface when pbrMaterial is non-null, otherwise the pre-existing `meshStandardMaterial` with texture+color+roughness (custom-upload + FLOOR_PRESETS for non-PBR ids unchanged).
- `src/three/ThreeViewport.tsx` — added `useThree` + `registerRenderer` imports; added one-time `useEffect` calling `registerRenderer(gl)` inside Scene; swapped `<Environment preset="apartment" />` for `<Environment files="/hdr/studio_small_09_1k.hdr" />`.
- `src/three/WallMesh.tsx` — removed `wallArtTextureCache` + `wallpaperTextureCache` Maps and their synchronous getters; added `useSharedTexture` hook (single-URL) and `useSharedTextures` hook (batched, keyed by item id); hoisted calls to the top of the component (previously inline inside `renderWallpaperOverlay` and `renderSideDecor`, which are each called twice for sides A and B — inline calls would violate Rules of Hooks). Textures pass into the renderer functions as parameters. Wall art `map={tex}` changed to `map={tex ?? undefined}` since the async hook yields null during load (pre-migration getter returned an unloaded Texture synchronously).
- `src/three/floorTexture.ts` — added `applyColorSpace` import; replaced `tex.colorSpace = THREE.SRGBColorSpace` with `applyColorSpace(tex, "albedo")`. Procedural canvas generation, wrap mode, `getFloorTexture()`, `tileRepeatFor()`, and `__resetFloorTextureCache()` all preserved — pure refactor of the color-space assignment site.

## Decisions Implemented vs Deferred

| Decision | Status | Notes |
|----------|--------|-------|
| D-04 Shared repeat across maps | ✓ Implemented | PbrSurface applies one THREE.Vector2 repeat to all three maps |
| D-05 Loader migration | ✓ Scope complete for Phase 32 | wallpaper + wallArt + floorTexture.ts migrated; FloorMesh custom-upload deferred |
| D-06 Fix-not-rollback | ✓ Implemented | wallpaper colorSpace now SRGBColorSpace (was default NoColorSpace) |
| D-08 Local HDR | ✓ Implemented | Environment files="/hdr/studio_small_09_1k.hdr" |
| D-13 Optional pbr field | ✓ Consumed | pbrMaterial memo guards absence → flat fallback |
| D-15 Per-mesh Suspense + ErrorBoundary | ✓ Implemented | PbrSurface wraps both |
| D-17 12-surface test scene | — | Manual verification step in Task 4 — auto-approved per auto_advance config |
| D-18 applyColorSpace single entry | ✓ Extended | floorTexture.ts now routes through it too |
| FloorMesh customTextureCache migration | Deferred | Phase 33 owns user-upload pipeline (LIB-06/07/08) |

## Visual Delta (D-06 fix-not-rollback note)

**Before migration:** `wallpaperTextureCache.get` / `wallArtTextureCache.get` returned `THREE.Texture` objects whose `colorSpace` was never explicitly set, so three.js defaulted to `NoColorSpace` in the WebGL backend. Rendering sRGB JPG wallpapers through `NoColorSpace` produces a subtly washed-out / desaturated look because the GPU treats the 8-bit sRGB-encoded values as if they were linear.

**After migration:** `acquireTexture(url, "albedo")` calls `applyColorSpace(tex, "albedo")` which sets `tex.colorSpace = THREE.SRGBColorSpace`. Three.js then correctly decodes sRGB → linear before lighting, producing slightly richer, more saturated, correctly-gamma'd wallpaper and wall-art renders.

**Jessica-facing impact:** Existing wallpapers will look correct for the first time — colors slightly more vivid, whites slightly warmer. This is not a regression; it is the correct render.

Per D-06 the helper is the source of truth, so this is documented and NOT reverted.

## Deferred: FloorMesh customTextureCache → Phase 33

`src/three/FloorMesh.tsx` still contains its own `customTextureCache` Map + `getCustomTexture` helper for user-uploaded data-URL floor images. This was intentionally scoped out of Phase 32 Plan 03 per the plan's action step 7:

> `FloorMesh.tsx`'s custom-upload path (`getCustomTexture`) is NOT migrated in this task — Phase 33 owns user-uploaded textures (LIB-06/07/08). D-05 scope for Phase 32 is the three wall/floor procedural/pattern loaders, not the user-upload pipeline.

Tracked for Phase 33.

## Deviations from Plan

None — plan executed exactly as written. All three tasks' acceptance criteria met on first verification run; `npx tsc --noEmit` clean (only pre-existing `baseUrl` deprecation); `npm run build` emits `/dist/textures/` and `/dist/hdr/` assets; full vitest suite 354 passing + 3 todo / 6 pre-existing LIB-03/04/05 failures (zero regressions vs. Plan 02 baseline).

## Authentication Gates

None.

## Known Stubs

None.

## Test Suite Delta

- **Before:** 354 passing + 3 todo / 6 pre-existing LIB failures (Plan 02 baseline)
- **After:** 354 passing + 3 todo / 6 pre-existing LIB failures (**unchanged**, no regressions)

No new tests added in this plan — the PBR pipeline is wired via visual verification (Task 4 checkpoint). Automated tests for the full-scene PBR render are deferred to Phase 33 or beyond because they require a WebGL context; current test runner uses jsdom/happy-dom.

## Task 4 — Human-Verify Checkpoint (Auto-Approved)

Auto-approved per `workflow.auto_advance=true` in `.planning/config.json`. Dev server started on http://localhost:5173/ and left running for post-hoc Jessica-facing verification. Verification protocol documented in 32-03-PLAN.md lines 515-531 (12 steps covering: WOOD_PLANK/PLASTER/CONCRETE render; PAINTED_DRYWALL unchanged; broken-URL fallback without boundary trip; HDR fetch from local path; cache refcount stability during wall resize).

Build evidence:
- `npx tsc --noEmit` → clean
- `npm run build` → success; `dist/hdr/studio_small_09_1k.hdr` (1,615,248 B) + `dist/textures/{concrete,plaster,wood-plank}/` all present
- `grep "/hdr/studio_small_09_1k.hdr" src/three/ThreeViewport.tsx` → 1 match
- `grep "preset=\"apartment\"" src/three/ThreeViewport.tsx` → 0 matches
- `grep "wallArtTextureCache\|wallpaperTextureCache" src/three/WallMesh.tsx` → 0 matches
- `grep "acquireTexture" src/three/WallMesh.tsx` → 3 matches

## Self-Check: PASSED

**File existence:**
- `src/three/PbrSurface.tsx` — FOUND
- `src/three/CeilingMesh.tsx` — FOUND (modified)
- `src/three/FloorMesh.tsx` — FOUND (modified)
- `src/three/WallMesh.tsx` — FOUND (modified)
- `src/three/ThreeViewport.tsx` — FOUND (modified)
- `src/three/floorTexture.ts` — FOUND (modified)

**Commits:**
- `f225899` — FOUND in git log (Task 1)
- `ef4f54d` — FOUND in git log (Task 2)
- `5f5ed10` — FOUND in git log (Task 3)

**Verification contract:**
- `grep -q "PbrSurface" src/three/CeilingMesh.tsx` ✓
- `grep -q "export function PbrSurface" src/three/PbrSurface.tsx` ✓
- `grep -q "throw p" src/three/PbrSurface.tsx` ✓ (Suspense mechanism)
- `grep -q "releaseTexture" src/three/PbrSurface.tsx` ✓
- `grep -q "SURFACE_MATERIALS" src/three/FloorMesh.tsx` ✓
- `grep -q "/hdr/studio_small_09_1k.hdr" src/three/ThreeViewport.tsx` ✓
- `grep -q "registerRenderer" src/three/ThreeViewport.tsx` ✓
- `grep -c "preset=\"apartment\"" src/three/ThreeViewport.tsx` → 0 ✓
- `grep -c "wallArtTextureCache\|wallpaperTextureCache" src/three/WallMesh.tsx` → 0 ✓
- `grep -q "applyColorSpace" src/three/floorTexture.ts` ✓
- `grep -c "tex.colorSpace = THREE.SRGBColorSpace" src/three/floorTexture.ts` → 0 ✓
- `grep -q "customTextureCache" src/three/FloorMesh.tsx` ✓ (deferred to Phase 33)
- `npx tsc --noEmit` → clean (pre-existing baseUrl deprecation only)
- `npm run build` → success

---
*Phase: 32-pbr-foundation*
*Completed: 2026-04-21*
