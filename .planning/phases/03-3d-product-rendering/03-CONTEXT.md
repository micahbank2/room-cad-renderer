# Phase 3: 3D Product Rendering - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

The 3D viewport delivers a visually credible preview of Jessica's room: placed products show their uploaded product images as textures mapped onto their 3D boxes (VIZ-04), the scene reads as a coherent render with proper materials, soft shadows, and a textured floor surface (VIZ-06), and the current 3D view can be exported as a PNG from the existing EXPORT button (SAVE-03). Scope is strictly VIZ-04, VIZ-06, and SAVE-03 — no eye-level walkthrough (Phase 4), no multiple rooms (Phase 5), no GLTF/OBJ model uploads (v2).

</domain>

<decisions>
## Implementation Decisions

*User ran --auto — Claude captured recommended defaults. Planner ratifies.*

### Product Textures in 3D (VIZ-04)
- **D-01:** Continue mapping the single `product.imageUrl` across all 6 faces of the product box (current behavior). No per-face mapping, no 3D model loading. Textures wrap via THREE.TextureLoader with `tex.colorSpace = THREE.SRGBColorSpace` (already in place).
- **D-02:** Migrate synchronous `loader.load()` to `loader.loadAsync()` wrapped in `useMemo` + React error boundary so failed image loads fall back to the solid-color material without crashing the scene. Cache textures by `imageUrl` via a module-level `Map<string, THREE.Texture>` keyed on URL.
- **D-03:** Preserve existing transparent-placeholder branch (null dims or orphan → 0.8 opacity, accent purple color) from Phase 2. Null-dim products do NOT receive textures even if imageUrl exists — they render as the semi-transparent accent-color box so Jessica knows dims are unset.
- **D-04:** Texture aspect ratio: no squash/stretch correction in v1. Box is sized by real product dimensions; texture is repeated 1:1 across each face. If product image is wider than tall, it will appear stretched on front/back. This is acceptable — Jessica can upload a different photo if it matters.

### Smooth 3D Experience (VIZ-06)
- **D-05:** Add a procedural **wood-plank floor texture** replacing the flat `#f5f0e8` material. Generate via Canvas2D drawn at scene init (no external asset file) — 512×512 px with warm oak plank pattern, tiled to room dimensions via `texture.repeat.set(room.width / 4, room.length / 4)` (4 ft tile scale). Also add a subtle normal map derived from the plank seams for surface depth.
- **D-06:** Enable **PCF soft shadows** by setting `shadows="soft"` on the R3F Canvas (maps to `THREE.PCFSoftShadowMap`). Bump the directional-light `shadow-mapSize` from 2048 to 4096 for the main sun light.
- **D-07:** Add **ACES Filmic tone mapping** to the renderer (`gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0, outputColorSpace: THREE.SRGBColorSpace }}`). Gives the scene a warmer, more cinematic look than default linear.
- **D-08:** Add a subtle **environment light** via `<Environment preset="apartment" />` from `@react-three/drei` (already installed) for ambient PBR reflection — gives products and walls soft indirect bounce without needing an HDR file.
- **D-09:** Bump wall material from flat color to a light **PBR material** with `roughness={0.85} metalness={0.0}` and a very subtle off-white color (`#f8f5ef`) for warmth. No wall textures in v1.
- **D-10:** Products (real, non-placeholder) get slightly adjusted material: `roughness={0.55} metalness={0.05}` to give textured surfaces a gentle sheen consistent with photo-sourced furniture images.

### PNG Export (SAVE-03)
- **D-11:** Fix the selector bug in `src/lib/export.ts`: change `.bg-gray-900 canvas` to `.bg-obsidian-deepest canvas`. The EXPORT button in Toolbar is already wired to `exportRenderedImage()` — just the DOM query is broken.
- **D-12:** Export filename format: `room-${YYYYMMDD}-${HHmm}.png` (e.g., `room-20260404-2315.png`). No project name dependency — keeps export flow simple and works before any project is saved.
- **D-13:** Before calling `canvas.toDataURL()`, request one `gl.render(scene, camera)` via R3F's `useThree()` API to ensure the canvas framebuffer is current (R3F uses `preserveDrawingBuffer: false` by default, which can produce blank PNGs otherwise). Use `gl={{ preserveDrawingBuffer: true }}` on the Canvas as the simplest fix.
- **D-14:** Export only captures the CURRENT 3D view (not 2D). If the user is in 2D view and clicks EXPORT, show a toast "Switch to 3D view to export render" instead of exporting the 2D canvas. 2D floor-plan export is deferred.
- **D-15:** Resolution: export at the canvas's current on-screen resolution. No 2x upscaling in v1. If the viewport is 1200×800, the PNG is 1200×800.

### Claude's Discretion
- Wood-plank procedural texture exact colors/seam style — use warm oak tones consistent with `#f5f0e8` current floor.
- Whether to add a skybox/gradient background behind the scene — Claude picks. Default: keep `bg-obsidian-deepest` div background, no skybox, so the dark CAD chrome frames the scene naturally.
- Toast styling for "switch to 3D" message — reuse the save indicator pattern or inline status bar update.
- Whether to memoize the floor texture at module level (generate once) or per-mount — Claude picks.
- Whether existing `exportRenderedImage` fallback-to-2D-canvas branch stays or gets removed (likely remove since D-14 says no 2D export).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` §Phase 3 — Phase 3 goal, VIZ-04/VIZ-06/SAVE-03 requirements, 3 success criteria
- `.planning/REQUIREMENTS.md` §3D Visualization + Persistence — VIZ-04, VIZ-06, SAVE-03 text

### Project Context
- `.planning/PROJECT.md` — Core value ("feel the space"), locked tech decisions (R3F 8, drei 9, React 18), image-only products (no GLTF)

### Prior Phase Context
- `.planning/phases/02-product-library/02-CONTEXT.md` — Null-dim placeholder behavior, effectiveDimensions() contract, 0.8 opacity for placeholders
- `.planning/phases/01-2d-canvas-polish/01-CONTEXT.md` — Obsidian CAD token conventions, store-driven rendering

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — Store-driven R3F scene pattern, declarative mesh components
- `.planning/codebase/CONVENTIONS.md` — Obsidian CAD tokens, font-mono UI chrome
- `.planning/codebase/STRUCTURE.md` — src/three/ layout

### Key Source Files
- `src/three/ThreeViewport.tsx` — R3F Canvas setup (camera, shadows, Scene component); gl prop to add tone mapping + preserveDrawingBuffer; floor plane material swap
- `src/three/ProductMesh.tsx` — Existing texture loading + placeholder branch from Phase 2; async loader migration target
- `src/three/Lighting.tsx` — Current 4-light rig; shadow mapSize bump target; drei `<Environment>` addition point
- `src/three/WallMesh.tsx` — Wall material upgrade target (PBR roughness/metalness)
- `src/lib/export.ts` — Broken selector fix + filename format + 2D-fallback removal
- `src/components/Toolbar.tsx` line 85 — EXPORT button already calls exportRenderedImage (no change needed)
- `src/types/product.ts` — effectiveDimensions() + hasDimensions() from Phase 2; texture branch gates on hasDimensions

### External Reference
- R3F `<Canvas>` gl prop docs: https://r3f.docs.pmnd.rs/api/canvas
- drei `<Environment>` presets: https://drei.docs.pmnd.rs/staging/environment

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **ProductMesh.tsx texture branch** — Already loads `product.imageUrl` via TextureLoader with sRGB colorSpace; just needs async + caching.
- **Lighting.tsx 4-light rig** — Decent starting point; sun + fill + ambient + hemisphere. Just needs bigger shadow map and soft PCF.
- **effectiveDimensions() + hasDimensions() helpers** — Phase 2 utilities gate texture loading (no textures on placeholders).
- **drei `<Environment>`** — Already installed via @react-three/drei v9.
- **Toolbar EXPORT button** — Wired. Only the function's selector is broken.
- **Obsidian CAD tokens** — Use `accent`, `obsidian-deepest` for toast/status if needed.

### Established Patterns
- **R3F declarative subscriptions:** Scene components subscribe to cadStore via useCADStore, so new meshes/materials just read from store — no imperative updates.
- **Three.js world units = feet** (CLAUDE.md) — All geometry keeps this invariant. Shadow camera extents scale to room dimensions.
- **Module-level caches:** Phase 1/2 precedent (productStore's texture loading, selectTool's productLibrary ref) — procedural floor texture and R3F texture cache follow the same pattern.
- **No external assets:** Project is local-first; textures generated procedurally via Canvas2D, not imported PNGs.

### Integration Points
- **ThreeViewport.tsx** — Add `gl` prop (tone mapping, preserveDrawingBuffer, color space), add `shadows="soft"`, swap floor `meshStandardMaterial` with textured version, mount `<Environment preset="apartment" />` inside Scene.
- **Lighting.tsx** — Bump `shadow-mapSize-*` from 2048 to 4096 on directional light.
- **ProductMesh.tsx** — Swap `loader.load` → `loader.loadAsync` inside useMemo returning a Promise; wrap mesh in `<Suspense fallback={null}>` or handle null texture gracefully. Introduce module-level `textureCache: Map<string, THREE.Texture>`.
- **WallMesh.tsx** — Update material props to `roughness={0.85}` and warm off-white color.
- **src/lib/export.ts** — Replace `.bg-gray-900 canvas` → `.bg-obsidian-deepest canvas`; add datestamp filename; remove 2D fallback branch (or convert to user-visible toast).
- **NEW: src/three/floorTexture.ts** — Canvas2D wood-plank generator, returns THREE.Texture via CanvasTexture. Lazy-instantiated, cached.

</code_context>

<specifics>
## Specific Ideas

- **Floor:** procedural wood-plank texture (Canvas2D), warm oak tone, 4 ft tile scale, with subtle normal map.
- **Shadows:** PCF soft, 4096 mapSize on sun light.
- **Tone mapping:** ACES Filmic, exposure 1.0.
- **Environment:** drei `<Environment preset="apartment" />` for indirect PBR bounce.
- **Product materials:** roughness 0.55 / metalness 0.05 for real products.
- **Wall color:** `#f8f5ef` warm off-white, roughness 0.85, flat PBR (no wall textures).
- **Export filename:** `room-YYYYMMDD-HHmm.png`.
- **Export gate:** Only works in 3D view; toast message in 2D view.
- **PNG quality:** current on-screen resolution, no upscaling.

</specifics>

<deferred>
## Deferred Ideas

- **Per-face product texture mapping** (front/back/sides with different images) — deferred.
- **GLTF/OBJ 3D model upload** — explicitly v2 per PROJECT.md.
- **User-uploaded PBR texture packs** (normal/roughness/AO) — deferred, too technical for Jessica.
- **HDR environment maps (EXR files)** — deferred, drei preset covers v1.
- **2D floor-plan PNG export** — deferred, separate feature.
- **2x / 4x export upscaling** — deferred.
- **Multiple floor material options** (tile, carpet, concrete) — deferred, one default wood floor in v1.
- **Skybox / gradient scene background** — deferred.
- **Camera preset buttons** (top-down, isometric, eye-level) — eye-level belongs to Phase 4; others deferred.
- **Wall textures / wallpaper** — deferred.
- **Ceiling geometry** — currently no ceiling, not in scope.

</deferred>

---

*Phase: 03-3d-product-rendering*
*Context gathered: 2026-04-04 (via --auto)*
