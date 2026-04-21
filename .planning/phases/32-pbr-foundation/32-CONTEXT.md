# Phase 32: PBR Foundation - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship PBR (albedo + normal + roughness) for `WOOD_PLANK`, `CONCRETE`, and `PLASTER` surfaces in the 3D viewport. Loading is non-blocking (per-mesh Suspense + ErrorBoundary), color-space correct (albedo→sRGB, normal/roughness→NoColorSpace), and refcount-disposed. `PAINTED_DRYWALL` and other flat-color surfaces render unchanged from v1.6.

Scope anchor: VIZ-07, VIZ-08, VIZ-09. Success criteria #1–#6 in ROADMAP.md §Phase 32.

</domain>

<decisions>
## Implementation Decisions

### Tile Sizes (real-world repeat per material)
- **D-01:** `WOOD_PLANK` repeats as **6″ × 48″ planks** — standard residential hardwood, reads believable at default 3/4 camera.
- **D-02:** `CONCRETE` repeats as **4′ × 4′ tiles** — matches typical polished-concrete slab pour-joint spacing; seams hide well at this scale.
- **D-03:** `PLASTER` repeats as **6′ × 6′ tiles** — large enough to hide repeat on single walls; subtle variation reads as real plaster.
- **D-04:** Repeat values live on each `SurfaceMaterial.pbr` entry and feed `wrapS/T + repeat + offset` via the single color-space helper (MUST-WRAP). All three maps in a PBR set share identical repeat values.

### Loader Migration Scope
- **D-05:** Migrate the existing `wallpaperTextureCache`, `wallArtTextureCache`, and `floorTexture.ts` loaders to the new shared PBR helper in Phase 32. Single loader path, single color-space enforcement, single refcount-dispose API.
- **D-06:** Migration preserves visual output — if the shared helper reveals a color-space or wrap bug in existing code, that's a bug-fix, not a rollback. Verify perceptually equivalent (or better) render of every v1.6 wallpaper/wall-art/floor surface before shipping.
- **D-07:** New path name: `src/three/pbrTextureCache.ts` (or equivalent) — researcher/planner finalizes file placement. Old cache files removed once consumers migrate.

### Environment / IBL Source
- **D-08:** Bundle one local HDR (~≤500 KB) in `public/hdr/` and load via `<Environment files="…" />`. Replaces drei-CDN-sourced preset. Works offline, consistent lighting every load, PBR reflections read correctly.
- **D-09:** Researcher picks a single interior-neutral HDR (e.g., Poly Haven "studio_small_09" class — soft, neutral, low-contrast). Not a choice for bright/dramatic environments; PBR color must read true.

### Bundled Texture Sets (aesthetic)
- **D-10:** Claude (researcher/planner) selects three CC0 PBR sets from Poly Haven or ambientCG and ships them in `public/textures/wood-plank/`, `public/textures/concrete/`, `public/textures/plaster/`. Default taste profile:
  - Wood: warm light oak (not walnut, not pine) — neutral enough for any room
  - Concrete: smooth polished (not rough/aggregate-heavy) — modern, not industrial
  - Plaster: warm off-white (not bright white, not gray) — residential, not commercial
- **D-11:** User reviews picks in PR preview before merge. Swap-out is a single file replace in `public/textures/{material}/` — low-risk to iterate in Phase 33+ or v1.8 if Jessica wants different choices later.

### Locked from Research (reference only — no re-decision)
- **D-12:** Imperative `THREE.TextureLoader` (D-1 in research), NOT drei `useTexture`. Avoids Suspense lockup + drei v9→v10 migration risk.
- **D-13:** Optional `pbr?: PbrMaps` on `SurfaceMaterial` (D-2 in research), not a new catalog. One render-path branch, no migration.
- **D-14:** 1024² albedo + 512² normal + 512² roughness, ≤~1.5 MB total (LOCK-RES).
- **D-15:** Per-mesh `<Suspense fallback={null}>` + `<ErrorBoundary>` wrapping each PBR-capable mesh (MUST-SUSP). Broken URL = surface renders base hex; scene keeps rendering.
- **D-16:** Refcount-based `disposeTexture(url)` API released from module cache when last material reference drops (MUST-DISP).
- **D-17:** Anisotropy set from `renderer.capabilities.getMaxAnisotropy()`, clamped to 8 (MUST-ANISO).
- **D-18:** Color-space helper: albedo→`SRGBColorSpace`, normal/roughness→`NoColorSpace` (MUST-CS). Single function — all loaders route through it.
- **D-19:** No R3F v9 / React 19 / drei v10 APIs (D-6 in research, GH #56 lock holds).
- **D-20:** Do NOT swap `OrbitControls` for drei `<CameraControls>` (MUST-NOT-CAMCTRL).

### Claude's Discretion
- Exact file placement of shared PBR helper (`src/three/pbrTextureCache.ts` vs co-located)
- Whether to expose a single `loadPbrSet(urls)` or three separate `loadAlbedo/loadNormal/loadRoughness` calls
- Whether roughness is a grayscale single-channel map or full RGB (planner picks based on the specific CC0 asset)
- Whether `PAINTED_DRYWALL` gains any subtle roughness (planner judgment — success criterion #2 says "render unchanged from v1.6 baseline"; interpret conservatively unless perceptual test says otherwise)
- Per-mesh Suspense wrapper placement — directly in `WallMesh` / `FloorMesh` / `CeilingMesh` vs a small shared `<PbrSurface>` wrapper
- WebGL test strategy (Playwright visual smoke vs `it.skip` markers) — planner decides what's practical within existing 340-test vitest baseline

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Research (v1.7)
- `.planning/research/SUMMARY.md` — cross-cutting decisions ledger (D-1..D-6, LOCK-*, MUST-*)
- `.planning/research/STACK.md` — R3F v8 / drei v9 / three.js constraints
- `.planning/research/ARCHITECTURE.md` §D-1, §D-2, §D-5, §D-6 — integration decisions
- `.planning/research/FEATURES.md` §1 — PBR feature spec
- `.planning/research/PITFALLS.md` #1 (color space), #3 (wrap mismatch), #4 (anisotropy), #5 (dispose), #6 (loader API), #7 (per-mesh Suspense), #16 (HDR fallback), #17 (R3F v9)

### Requirements & Roadmap
- `.planning/ROADMAP.md` §Phase 32 — success criteria 1–6
- `.planning/REQUIREMENTS.md` — VIZ-07, VIZ-08, VIZ-09
- `.planning/PROJECT.md` — Core Value + current milestone + Out-of-scope decisions (R3F v9 deferred)

### Source Files (must read before planning)
- `src/data/surfaceMaterials.ts` — current `SurfaceMaterial` type; where `pbr?: PbrMaps` optional field lands
- `src/three/ThreeViewport.tsx:120` — existing `<Suspense fallback={null}>` (scopes only Environment today; pattern to extend per-mesh)
- `src/three/ThreeViewport.tsx:84–103` — existing `useFrame` lerp (MIC-35 camera animation; unrelated to Phase 32 but adjacent)
- `src/three/WallMesh.tsx` — primary consumer of surface materials
- `src/three/FloorMesh.tsx` — floor PBR consumer + existing `floorTexture.ts` loader (to be migrated per D-05)
- `src/three/CeilingMesh.tsx` — ceiling PBR consumer
- `src/three/floorTexture.ts` — existing texture cache pattern (reference for shared helper design)
- `src/three/productTextureCache.ts` — product (non-surface) texture cache; reference only, not migrated in Phase 32
- GitHub Issue [#61](https://github.com/micahbank2/room-cad-renderer/issues/61) — VIZ-07/08 source

### Codebase Maps (existing)
- `.planning/codebase/ARCHITECTURE.md` — store-driven rendering, data flow
- `.planning/codebase/STACK.md` — R3F / three.js / drei version lock
- `.planning/codebase/CONVENTIONS.md` — naming, color tokens, file layout
- `.planning/codebase/CONCERNS.md` — R3F v9 / React 19 migration parked (#56)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/three/floorTexture.ts`** — closest existing analog to the new PBR loader; module-level cache + explicit color-space setup. Shared helper should generalize this pattern, then migrate `floorTexture.ts` to consume it (D-05).
- **`wallpaperTextureCache`, `wallArtTextureCache`** — two more ad-hoc caches with their own color-space handling; migrate to shared helper (D-05).
- **`ThreeViewport.tsx:120` existing `<Suspense>`** — pattern exists; needs to expand from scene-root to per-mesh.
- **`Card` / `Suspense` / `ErrorBoundary` libraries** — `react-error-boundary` may already be a dep; planner confirms or adds.

### Established Patterns
- **Store-driven rendering:** neither 2D nor 3D owns state. PBR maps attach to `SurfaceMaterial.pbr` (data), consumed by `WallMesh`/`FloorMesh`/`CeilingMesh` (render).
- **Module-level texture caches** with refcount-safe dispose — `floorTexture.ts` is the template.
- **Single Source Of Truth helpers** (Phase 25 `structuredClone(toPlain(…))`, Phase 31 `resolveEffectiveDims`) — PBR color-space + wrap helper follows the same "one function every consumer routes through" pattern.

### Integration Points
- `src/data/surfaceMaterials.ts` — add `pbr?: PbrMaps` optional field to `SurfaceMaterial`, attach to `WOOD_PLANK` / `CONCRETE` / `PLASTER` entries with paths + repeat sizes.
- `src/three/{Wall,Floor,Ceiling}Mesh.tsx` — switch from `meshStandardMaterial` color-only to PBR-when-available branch. Wrap PBR path in per-mesh `<Suspense>` + `<ErrorBoundary>`.
- `src/three/ThreeViewport.tsx` — swap `<Environment preset="apartment">` for `<Environment files="/hdr/{chosen}.hdr">`.
- `public/textures/` — new directory, three subdirs (`wood-plank/`, `concrete/`, `plaster/`).
- `public/hdr/` — new directory, one HDR file.

</code_context>

<specifics>
## Specific Ideas

- Wood taste: **warm light oak** (no walnut, no pine) — neutral across room types.
- Concrete taste: **smooth polished**, not rough/industrial aggregate.
- Plaster taste: **warm off-white**, not bright white, not gray — residential feel.
- HDR taste: **neutral interior studio class** — soft, low-contrast; PBR color must read true under it.
- User reviews picks in PR preview before merge; swap-out is a single file replace, so iterate freely post-ship if Jessica wants different choices later.

</specifics>

<deferred>
## Deferred Ideas

- **PAINTED_DRYWALL subtle roughness lift** — Success criterion #2 says "render unchanged from v1.6 baseline." Don't touch in Phase 32. If Jessica asks for wall realism lift post-v1.7, queue as a v1.8 polish item.
- **Per-mesh Suspense granularity fine-tuning** (grouping by room vs strict per-mesh) — handled as planner's discretion; surface as a follow-up if Phase 32 demo reveals visible staggered-load flicker.
- **WebGL test strategy (Playwright visual smoke)** — research flagged this but it spans Phases 32–34. Defer decision to Phase 35 tech-debt sweep or v1.8 testing milestone.
- **Multiple PBR variants per category** (LOCK-VAR: 1 variant each in v1.7) — expand to e.g., light-oak + walnut + reclaimed-barn when user library grows.
- **Existing wallpaper/wall-art perceptual delta audit** — if migrating their loaders in Phase 32 reveals a visible change, document in HUMAN-UAT.md; don't roll back unless the change is objectively worse.

</deferred>

---

*Phase: 32-pbr-foundation*
*Context gathered: 2026-04-20*
