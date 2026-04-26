# Phase 45: Auto-Generated Material Swatch Thumbnails (THUMB-01) - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace flat-hex `<div>` swatch tiles in `SurfaceMaterialPicker` with auto-rendered thumbnails of the actual material that will apply (full PBR pipeline for materials with maps, consistent flat-color fallback for those without). Thumbnails generate on first picker mount, cache in-memory for the session, and gracefully degrade if a PBR map fails to load.

**Source requirement:** `THUMB-01` ([#77](https://github.com/micahbank2/room-cad-renderer/issues/77)).

**Surface area (locked, see D-04):** Only `SurfaceMaterialPicker` grid (consumed by `FloorMaterialPicker` + ceiling material picker via `SurfaceMaterialPicker`). Out of scope: `MyTexturesList`, `WallSurfacePanel` wallpaper, `SwatchPicker`.

</domain>

<decisions>
## Implementation Decisions

### Generation Pipeline
- **D-01:** Use a **shared module-level `THREE.WebGLRenderer` + Scene + Camera** (no R3F overhead) for thumbnail generation. One renderer instance owned by a new `swatchThumbnailGenerator.ts` module under `src/three/`.
  - Per-material flow: load PBR maps via existing `pbrTextureCache.acquireTexture`, build a `meshStandardMaterial`, render onto a small plane geometry, `renderer.domElement.toDataURL("image/png")`, store in cache.
  - Flat-color materials (no `pbr` field) render through the same path with a `meshStandardMaterial` that has `color: m.color` + `roughness: m.roughness`. Visual consistency across the grid is the point — no hybrid CSS path.
  - Rationale over offscreen R3F `<Canvas>`: ~150 LOC vs ~300, no mount/unmount choreography, no need for a hidden DOM node, full PBR fidelity preserved.

### Cache + Trigger
- **D-02:** **In-memory `Map<materialId, dataURL>` only.** No IndexedDB persistence. With 11 total materials, regen-on-page-load is cheap (target <200ms total cold).
- **D-03:** **Lazy on first picker mount.** First mount of `SurfaceMaterialPicker` triggers generation for all materials applicable to that surface (`materialsForSurface(target)`). Hex `material.color` placeholder shows during async render. Subsequent mounts read from cache.
  - Cache lifetime: session (cleared on hard reload).
  - Cache key: `material.id` (versioning unnecessary — preset catalog is code, not user-editable; on catalog edit a code reload invalidates anyway).

### Surface Area (Scope Lock)
- **D-04:** **`SurfaceMaterialPicker` grid only.** Touched files (anticipated):
  - `src/components/SurfaceMaterialPicker.tsx` — replace `<div style={{backgroundColor: m.color}}>` swatch with a new `<MaterialThumbnail materialId={m.id} fallbackColor={m.color} />` component.
  - `src/three/swatchThumbnailGenerator.ts` (new) — shared renderer + cache + generate API.
  - `src/components/MaterialThumbnail.tsx` (new) — host component: reads cache, shows hex placeholder during render, crossfades to thumbnail.
  - Optional: small unit test file under `tests/`.
  - **NOT touched:** `MyTexturesList.tsx` (Phase 34 already handles user-texture image cards), `WallSurfacePanel.tsx` (no preset wallpapers — color input only), `SwatchPicker.tsx` (paint hex colors — flat is correct).

### Lighting + Camera
- **D-05:** **Studio lighting setup (fixed, swatch-optimized) — NOT scene-matching.**
  - Single directional light at 45° elevation / 30° azimuth, intensity ~1.5.
  - Soft ambient (intensity ~0.4).
  - Optional slight rim light for normal-map readability.
  - Camera angle ~30° off-axis (perspective camera or slight rotation of the plane) so normal-map depth reads visibly.
  - Background: transparent (`renderer.setClearColor(0x000000, 0)`).
  - Rationale: Jessica's swatches need to be predictable. Mirroring `Lighting.tsx` would mean swatch appearance drifts whenever room state changes (ceiling height, etc.), which defeats the picker.

### Loading + Animation (D-39 carry-forward from Phase 33)
- **D-06:** **Crossfade 150ms** when swapping hex placeholder → rendered thumbnail. **Snap (no transition) when `useReducedMotion()` is true.**
  - Same pattern as Phase 44 `Toolbar.tsx` SAVING spinner conditional `animate-spin`.
  - Implement via Tailwind `transition-opacity duration-150` + reduced-motion guard.

### Failure Mode (Phase 32 PbrErrorBoundary carry-forward)
- **D-07:** **Flat hex color tile** if PBR map load fails (any of albedo/normal/roughness 404 or texture-decode error). Reuse Phase 32 `PbrErrorBoundary` semantics — never expose the error to Jessica. The hex placeholder simply remains visible.

### Design System Inheritance (Phase 33 carry-forward)
- **D-08:** **D-33 Icon policy:** Any new icon (e.g., loading spinner if used) uses `lucide-react`. No new `material-symbols-outlined` imports.
- **D-09:** **D-34 Spacing tokens:** Any padding/margin/gap on new components in `SurfaceMaterialPicker.tsx` / `MaterialThumbnail.tsx` uses the canonical scale (4/8/16/24/32px). No arbitrary `p-[Npx]`, no 12px (`p-3`).
- **D-10:** **D-39 Reduced motion:** D-06 crossfade is the only animation introduced. Already guarded.

### Test Strategy
- **D-11:** Add at least one vitest covering: (a) generator returns dataURL for a material; (b) cache hit returns same dataURL on second call; (c) PBR-load failure resolves to fallback (no exception).
- **D-12:** No Playwright spec for visual diff — thumbnails are platform-coupled and we burned on that in Phase 36 (memory: `feedback_playwright_goldens_ci.md`). Visual correctness verified via dev-server browser check during execution.

### Claude's Discretion
- Exact thumbnail render dimensions — recommend 128×128 px (DPR-aware up to 2×) producing crisp display at the ~60px CSS tile size.
- Plane geometry size + UV repeat count for PBR thumbnails — pick something that lets one or two tile-repeats show, so users see the pattern (not a single zoomed-in pixel of texture).
- Whether to expose a `__resetSwatchThumbnailCache()` test helper alongside D-11.
- Component-internal naming for the generator module's public API.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing infrastructure to reuse
- `src/three/pbrTextureCache.ts` — `acquireTexture(url, channel)` / `releaseTexture(url)` API. Returns `Promise<THREE.Texture>`. Use this directly for albedo/normal/roughness loads in the thumbnail generator. Anisotropy is registered globally via `registerRenderer()` — the thumbnail generator should NOT call `registerRenderer` (it has its own renderer).
- `src/three/PbrSurface.tsx` — Suspense + ErrorBoundary pattern (D-15 from Phase 32). The thumbnail generator does NOT use this directly (it's a non-React render path), but the spirit (graceful PBR-failure fallback) carries forward via D-07.
- `src/three/textureColorSpace.ts` — `applyColorSpace(tex, channel)` for correct sRGB/linear handling. Already wrapped by `pbrTextureCache`, no need to call directly.
- `src/data/surfaceMaterials.ts` — `SURFACE_MATERIALS` catalog (11 entries), `materialsForSurface(target)` helper, `PbrMaps` interface. Source of truth for what gets thumbnailed.
- `src/hooks/useReducedMotion.ts` — D-39 reduced-motion gate. Required for D-06.

### Components to modify
- `src/components/SurfaceMaterialPicker.tsx` — current swatch tile is `<div className="w-full aspect-square rounded-sm" style={{backgroundColor: m.color}} />` (line ~48). Replace with new `<MaterialThumbnail>` host.

### Project policies
- `CLAUDE.md` — Design System (Phase 33) section: D-33 / D-34 / D-39 carry-forward (see D-08, D-09, D-10).
- `.planning/REQUIREMENTS.md` — THUMB-01 acceptance criteria.

### Memory / past learnings
- `feedback_playwright_goldens_ci.md` (auto-memory) — Avoid platform-coupled `toHaveScreenshot` goldens. D-12 honors this.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`pbrTextureCache.acquireTexture`**: Returns a configured `THREE.Texture` with correct color space + anisotropy + RepeatWrapping. Already shared with the live 3D viewport — using it for thumbnails means we never duplicate texture downloads.
- **`PbrErrorBoundary`** (Phase 32): Pattern to copy, not reuse directly (thumbnail generator runs outside React lifecycle).
- **`MaterialThumbnail`-style host component**: New, but follows the same shape as Phase 34 `MyTexturesList` cards (image + skeleton + reduced-motion guard).

### Established Patterns
- **In-memory module-level caches** (`pbrTextureCache`, `userTextureCache`, `wallpaperTextureCache`, `wallArtTextureCache`, `productTextureCache`): consistent pattern of `Map` + `acquire`/`release` ref-counting. The thumbnail cache is simpler (no ref counting needed — dataURLs are tiny strings, never disposed).
- **Suspense + ErrorBoundary for PBR** (D-15 Phase 32): non-applicable directly here, but the failure-mode philosophy (silent fallback to flat color) is preserved via D-07.
- **D-39 reduced-motion gating** (Phase 33 → 44): conditional className based on `useReducedMotion()` matches.

### Integration Points
- **`SurfaceMaterialPicker.tsx` swatch render (line ~48)** — single-point integration. Inserting `<MaterialThumbnail>` keeps the parent unchanged structurally.
- **No store changes.** `cadStore` and `uiStore` are not touched. The thumbnail cache lives in module scope inside `swatchThumbnailGenerator.ts`.
- **No new dependencies.** `three` is already in package.json (^0.183.2).

</code_context>

<specifics>
## Specific Ideas

- The **8 flat-color materials** (WOOD_OAK, WOOD_WALNUT, TILE_WHITE, TILE_BLACK, CARPET, MARBLE, STONE, PAINTED_DRYWALL) deliberately render through the SAME WebGL pipeline as the 3 PBR materials (CONCRETE, PLASTER, WOOD_PLANK). This creates visual consistency — all 11 swatches look like they came from the same world, even if 8 of them are just lit flat-color planes. Without this, swatches would feel mismatched (e.g., "CONCRETE has visible texture detail; CARPET looks like a paint chip").
- **Rendering happens off the main render thread but on the main GPU.** A second `THREE.WebGLRenderer` shares the same WebGL context family — we explicitly do NOT use `OffscreenCanvas` (browser-support variability isn't worth it for 11 thumbnails).
- **Crossfade is subtle.** 150ms opacity transition; the placeholder is the same hex color the swatch already shows today, so even without the crossfade it doesn't look broken — the transition just adds polish.

</specifics>

<deferred>
## Deferred Ideas

- **Generic "thumbnail provider" architecture for all pickers** — speculative; no consumer needs it. Re-visit if Phase 46+ ends up needing thumbnails for other entity types.
- **IndexedDB persistence of generated thumbnails** — speculative; in-memory regen is fast enough at 11 materials. Re-visit only if catalog grows to 50+ materials.
- **Hover preview showing a larger thumbnail** — UX nicety, no demand signal.
- **Studio lighting customization (user picks "warm" vs "cool" preview light)** — speculative.
- **Wallpaper preset library with thumbnails** — would warrant a separate phase if/when wallpaper presets are introduced. Currently wallpaper is just user-uploaded textures or solid color.

</deferred>

---

*Phase: 45-auto-generated-material-swatch-thumbnails-thumb-01*
*Context gathered: 2026-04-25*
