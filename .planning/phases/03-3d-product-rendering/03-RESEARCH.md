# Phase 3: 3D Product Rendering — Research

**Researched:** 2026-04-04
**Domain:** React Three Fiber 8 / Three.js r183 / drei v9 — PBR scene upgrade + canvas PNG export
**Confidence:** HIGH

## Summary

Phase 3 is an enhancement phase, not new architecture. All three requirements (VIZ-04 textured products, VIZ-06 visual richness, SAVE-03 PNG export) extend existing, working Three.js scene code. The store-driven R3F pattern is already established. Most work is narrow, local edits: swap synchronous `TextureLoader.load` for cached async loading in `ProductMesh`, add a procedurally generated Canvas2D wood-plank texture to the floor plane, bump shadow map resolution + enable soft shadows, mount drei `<Environment preset="apartment" />`, tune material PBR values on walls and products, and fix a broken CSS selector plus add `preserveDrawingBuffer` for the export path.

The installed stack (R3F 8.17, drei 9.122, three 0.183) already supports every decision in CONTEXT.md natively — no new dependencies needed. Notably, R3F v8 **already defaults to `ACESFilmicToneMapping` and `SRGBColorSpace`** on its internal WebGLRenderer (verified in `node_modules/@react-three/fiber/dist/events-*.js` line 1986/2013), so D-07 is explicit reaffirmation + exposure control rather than a behavioral change. The one caveat that requires attention is drei's `<Environment preset>` loads HDRIs from a **CDN** and the drei docs explicitly warn it "may fail... in production environments" — for Jessica's personal tool this is acceptable, but it's the single network dependency introduced by this phase.

**Primary recommendation:** Execute CONTEXT.md decisions verbatim. Keep edits local (touch only the 5 files listed + 1 new `src/three/floorTexture.ts`). No over-engineering: module-level texture cache, procedural Canvas2D floor, and a module-level drei preset. Most pitfalls in this domain (texture sRGB double-gamma, shadow acne, blank PNG exports) are well-understood and handled by the exact decisions already locked in CONTEXT.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Product Textures in 3D (VIZ-04)**
- **D-01:** Continue mapping the single `product.imageUrl` across all 6 faces of the product box (current behavior). No per-face mapping, no 3D model loading. Textures wrap via THREE.TextureLoader with `tex.colorSpace = THREE.SRGBColorSpace` (already in place).
- **D-02:** Migrate synchronous `loader.load()` to `loader.loadAsync()` wrapped in `useMemo` + React error boundary so failed image loads fall back to the solid-color material without crashing the scene. Cache textures by `imageUrl` via a module-level `Map<string, THREE.Texture>` keyed on URL.
- **D-03:** Preserve existing transparent-placeholder branch (null dims or orphan → 0.8 opacity, accent purple color) from Phase 2. Null-dim products do NOT receive textures even if imageUrl exists — they render as the semi-transparent accent-color box so Jessica knows dims are unset.
- **D-04:** Texture aspect ratio: no squash/stretch correction in v1. Box is sized by real product dimensions; texture is repeated 1:1 across each face.

**Smooth 3D Experience (VIZ-06)**
- **D-05:** Add a procedural **wood-plank floor texture** replacing the flat `#f5f0e8` material. Generate via Canvas2D drawn at scene init (no external asset file) — 512×512 px with warm oak plank pattern, tiled to room dimensions via `texture.repeat.set(room.width / 4, room.length / 4)` (4 ft tile scale). Also add a subtle normal map derived from the plank seams for surface depth.
- **D-06:** Enable **PCF soft shadows** by setting `shadows="soft"` on the R3F Canvas (maps to `THREE.PCFSoftShadowMap`). Bump the directional-light `shadow-mapSize` from 2048 to 4096 for the main sun light.
- **D-07:** Add **ACES Filmic tone mapping** to the renderer (`gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0, outputColorSpace: THREE.SRGBColorSpace }}`).
- **D-08:** Add a subtle **environment light** via `<Environment preset="apartment" />` from `@react-three/drei` for ambient PBR reflection.
- **D-09:** Bump wall material from flat color to a light **PBR material** with `roughness={0.85} metalness={0.0}` and a very subtle off-white color (`#f8f5ef`) for warmth. No wall textures in v1.
- **D-10:** Products (real, non-placeholder) get slightly adjusted material: `roughness={0.55} metalness={0.05}`.

**PNG Export (SAVE-03)**
- **D-11:** Fix the selector bug in `src/lib/export.ts`: change `.bg-gray-900 canvas` to `.bg-obsidian-deepest canvas`.
- **D-12:** Export filename format: `room-${YYYYMMDD}-${HHmm}.png`.
- **D-13:** Enable `preserveDrawingBuffer: true` on the Canvas `gl` prop.
- **D-14:** Export only captures the CURRENT 3D view (not 2D). If the user is in 2D view, show a toast "Switch to 3D view to export render" instead.
- **D-15:** Resolution: export at the canvas's current on-screen resolution. No 2x upscaling in v1.

### Claude's Discretion

- Wood-plank procedural texture exact colors/seam style — use warm oak tones consistent with `#f5f0e8` current floor.
- Whether to add a skybox/gradient background behind the scene. Default: keep `bg-obsidian-deepest` div, no skybox.
- Toast styling for "switch to 3D" message — reuse save indicator pattern or inline status bar update.
- Whether to memoize the floor texture at module level (generate once) or per-mount.
- Whether existing `exportRenderedImage` fallback-to-2D-canvas branch stays or gets removed (likely remove since D-14).

### Deferred Ideas (OUT OF SCOPE)

- Per-face product texture mapping (front/back/sides with different images)
- GLTF/OBJ 3D model upload (explicitly v2)
- User-uploaded PBR texture packs (normal/roughness/AO)
- HDR environment maps (EXR files) — drei preset covers v1
- 2D floor-plan PNG export
- 2x / 4x export upscaling
- Multiple floor material options (tile, carpet, concrete)
- Skybox / gradient scene background
- Camera preset buttons (top-down, isometric, eye-level — eye-level = Phase 4)
- Wall textures / wallpaper
- Ceiling geometry
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIZ-04 | Products render in 3D with their uploaded image as texture (not blank boxes) | Async TextureLoader.loadAsync + module-level cache pattern (confirmed in three r183 API); existing `effectiveDimensions()` gates texture load for placeholders; `tex.colorSpace = SRGBColorSpace` already present and correct |
| VIZ-06 | Smooth 3D experience (PBR materials, soft shadows, floor texture) | drei v9.122 Environment apartment preset installed; R3F 8 `shadows="soft"` → PCFSoftShadowMap; Canvas2D → THREE.CanvasTexture is standard procedural pattern; material PBR tuning (roughness/metalness) is stock meshStandardMaterial |
| SAVE-03 | User can export 3D view as PNG image file | `canvas.toDataURL("image/png")` requires `preserveDrawingBuffer: true` OR synchronous render before read; R3F defaults to `false`, hence D-13; existing selector bug confirmed in source |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Must honor these invariants throughout:

- **Three.js world units = feet.** All new geometry must use real-world feet (floor tiling `room.width / 4`, shadow camera extents, etc.).
- **Store-driven rendering.** Both 2D and 3D views read from Zustand stores. Do not introduce any 3D-only state that mutates `cadStore` or creates a parallel source of truth.
- **Obsidian CAD tokens only** for any new UI chrome (toast, status updates). Use `font-mono`, `obsidian-*`, `accent`, `text-text-*`. Label text UPPER_SNAKE_CASE.
- **Local-first, no external assets.** Procedural textures only (Canvas2D → CanvasTexture). The one concession is `drei <Environment preset>` which loads from a CDN — acceptable for this personal tool but must be documented as a network dependency.
- **React 18 locked.** Do not upgrade. R3F 8 + drei 9 are pinned to this React version.
- **GSD workflow enforcement.** All edits must go through `/gsd:execute-phase` (this is already the active workflow).
- **Naming conventions.** New file `floorTexture.ts` (camelCase), exported function verb+noun (`createFloorTexture`, `getFloorTexture`).

## Standard Stack

### Core
| Library | Version (installed) | Purpose | Why Standard |
|---------|-------|---------|--------------|
| three | ^0.183.2 | 3D math, WebGLRenderer, materials, geometry, TextureLoader, CanvasTexture | Already installed; all Phase 3 work uses stock APIs |
| @react-three/fiber | ^8.17.14 | R3F `<Canvas>`, reconciler, `useThree`, `useLoader` | Already wraps existing scene; Phase 3 adds props only |
| @react-three/drei | ^9.122.0 | `<Environment preset="apartment">`, `<OrbitControls>` | Already installed; apartment preset ships as named export |
| react | ^18.3.1 | Suspense boundary for async texture loads | Locked by R3F 8 compat |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/three | ^0.183.1 | TypeScript types for THREE.CanvasTexture, SRGBColorSpace, ACESFilmicToneMapping | Installed; use for type-safe material/texture props |

### Alternatives Considered
| Instead of | Could Use | Tradeoff / Why Rejected |
|------------|-----------|-------------------------|
| drei `<Environment preset="apartment">` | Ship an HDR file + `<Environment files="/env.hdr">` | Adds ~1-4 MB asset; violates local-first spirit; CDN is fine for single-user tool |
| drei Environment entirely | Just boost `ambientLight` + `hemisphereLight` | Cheaper, no CDN dep, but visibly flatter PBR reflections — Jessica's core value ("feel the space") benefits from real IBL |
| Procedural Canvas2D floor texture | Ship `oak.jpg` asset | Would require adding /public/ assets; procedural is zero-dependency and keeps bundle thin |
| `useLoader(TextureLoader, url)` (drei/R3F idiomatic) | Manual `TextureLoader.loadAsync` + cache | `useLoader` auto-suspends and caches by URL internally — simpler code, but less control over error fallback and ties to Suspense boundary. D-02 specifies the manual cache path; both are viable. Recommend evaluating `useLoader` during planning. |

**Installation:** No installs required — all deps already present.

**Version verification:** Not performed against npm registry (offline step not required for existing pinned deps). If the planner wants upgrades, `npm view three version` etc. can be run; however CONTEXT locks React 18 + R3F 8 + drei 9, so no upgrades in scope.

## Architecture Patterns

### Recommended Project Structure (unchanged + 1 new file)
```
src/three/
├── ThreeViewport.tsx       # ← EDIT: add gl prop, shadows="soft", Environment, swap floor material
├── ProductMesh.tsx         # ← EDIT: async texture loading + module cache + sheen material
├── WallMesh.tsx            # ← EDIT: roughness 0.85, #f8f5ef color
├── Lighting.tsx            # ← EDIT: shadow-mapSize 4096
└── floorTexture.ts         # ← NEW: Canvas2D wood-plank generator, returns {map, normalMap}

src/lib/
└── export.ts               # ← EDIT: fix selector, timestamped filename, remove 2D fallback

src/components/
└── Toolbar.tsx             # ← EDIT: gate EXPORT click on viewMode === "3d"; toast otherwise
```

### Pattern 1: Module-level Texture Cache (D-02)
**What:** Prevent reloading the same image URL twice by keying on URL in a module-level Map.
**When to use:** Multiple placed products sharing the same library product (very common — Jessica places the same couch twice).
**Example:**
```typescript
// src/three/ProductMesh.tsx
import * as THREE from "three";

const textureCache = new Map<string, THREE.Texture>();

async function loadProductTexture(url: string): Promise<THREE.Texture> {
  const cached = textureCache.get(url);
  if (cached) return cached;
  const loader = new THREE.TextureLoader();
  const tex = await loader.loadAsync(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(url, tex);
  return tex;
}
```
**Source:** Three.js r183 TextureLoader API (https://threejs.org/docs/#api/en/loaders/TextureLoader.loadAsync)

### Pattern 2: Procedural Canvas2D → THREE.CanvasTexture (D-05)
**What:** Generate a texture at runtime by drawing to an off-screen `<canvas>`, wrap with `THREE.CanvasTexture`, tile via `texture.repeat`.
**When to use:** Simple repeating patterns (planks, tiles, stripes) where shipping an image asset is overkill.
**Example:**
```typescript
// src/three/floorTexture.ts
import * as THREE from "three";

let cached: { map: THREE.Texture; normalMap: THREE.Texture } | null = null;

export function getFloorTexture(): { map: THREE.Texture; normalMap: THREE.Texture } {
  if (cached) return cached;

  // Albedo (color) canvas — 512×512 warm oak planks
  const albedo = document.createElement("canvas");
  albedo.width = 512;
  albedo.height = 512;
  const ctx = albedo.getContext("2d")!;
  // paint base warm tone
  ctx.fillStyle = "#d4b896";
  ctx.fillRect(0, 0, 512, 512);
  // 4 planks vertical, each 128px wide
  for (let i = 0; i < 4; i++) {
    // subtle per-plank tonal variation
    const tone = 180 + Math.random() * 30;
    ctx.fillStyle = `rgb(${tone + 30}, ${tone}, ${tone - 40})`;
    ctx.fillRect(i * 128, 0, 128, 512);
    // plank seam
    ctx.fillStyle = "rgba(80, 50, 30, 0.5)";
    ctx.fillRect(i * 128, 0, 2, 512);
  }
  // subtle grain streaks
  // ... (detail up to Claude's discretion)

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;

  // Normal map — derive from seam positions, render dark→light bump on canvas
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = 512;
  normalCanvas.height = 512;
  const nctx = normalCanvas.getContext("2d")!;
  nctx.fillStyle = "rgb(128, 128, 255)"; // neutral normal
  nctx.fillRect(0, 0, 512, 512);
  // darken seam columns to signal depression
  for (let i = 0; i < 4; i++) {
    nctx.fillStyle = "rgb(100, 100, 220)";
    nctx.fillRect(i * 128, 0, 2, 512);
  }
  const normalMap = new THREE.CanvasTexture(normalCanvas);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  // normal maps stay in Linear color space (default)

  cached = { map, normalMap };
  return cached;
}
```

Usage in ThreeViewport:
```typescript
const { map, normalMap } = getFloorTexture();
map.repeat.set(room.width / 4, room.length / 4);
normalMap.repeat.set(room.width / 4, room.length / 4);
// ...
<meshStandardMaterial map={map} normalMap={normalMap} roughness={0.8} metalness={0} />
```
**Source:** https://threejs.org/docs/#api/en/textures/CanvasTexture

### Pattern 3: R3F Canvas `gl` prop (D-07, D-13)
**What:** Pass renderer constructor params.
**Example:**
```typescript
<Canvas
  shadows="soft"  // → THREE.PCFSoftShadowMap
  gl={{
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.0,
    outputColorSpace: THREE.SRGBColorSpace,
    preserveDrawingBuffer: true,  // required for canvas.toDataURL PNG export
    antialias: true,
  }}
  camera={{ position: [halfW + 15, 12, halfL + 15], fov: 50, near: 0.1, far: 200 }}
>
```
**Source:** R3F v8 Canvas API docs; verified in installed dist files.

### Pattern 4: drei Environment (D-08)
```typescript
import { Environment } from "@react-three/drei";
// inside <Scene>
<Environment preset="apartment" />
```
**Network dependency:** Loads HDRI from drei's CDN on first render. Acceptable for personal tool; document in a code comment.

### Anti-Patterns to Avoid
- **Calling `new THREE.TextureLoader()` inside `useMemo` per product instance without a cache** — same image URL re-decoded per placement; GPU memory bloats with duplicates.
- **Setting `colorSpace` on normal maps / roughness maps** — those are data textures that must stay in Linear color space. Only the albedo (`map`) gets `SRGBColorSpace`.
- **Calling `canvas.toDataURL()` without `preserveDrawingBuffer: true`** — returns a blank/transparent PNG because WebGL swaps out the framebuffer after render.
- **Using `alert()` for "switch to 3D" toast (D-14)** — breaks flow. Reuse Phase 1 SaveIndicator pattern or a small inline toast.
- **Swapping floor `<planeGeometry>` for a new shape** — out of scope. Just replace the material.
- **Importing `bg-gray-900` somewhere else** — not needed; it doesn't exist in the current codebase. The selector was stale from a prior theme.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async image → Texture | Custom `new Image()` + onload + manual WebGL upload | `THREE.TextureLoader.loadAsync(url)` | three handles format detection, mipmaps, GPU upload, disposal semantics |
| PBR material | Custom ShaderMaterial | `meshStandardMaterial` (already in use) | Built-in PBR with tone mapping, shadow receiving, environment lighting |
| IBL / environment reflections | Sampling HDR manually in a shader | drei `<Environment preset="apartment" />` | Handles CubeCamera / PMREMGenerator internally |
| Soft shadows | Custom shadow shader / VSM | `shadows="soft"` on R3F Canvas | One prop → PCFSoftShadowMap |
| Canvas → PNG download | Blob API + FileReader dance | `canvas.toDataURL("image/png")` + `<a download>` (existing pattern in `export.ts`) | Existing code already does this correctly |
| Date formatting for filename | Moment.js / date-fns | Inline `new Date().toISOString()` + string slicing | `YYYYMMDD-HHmm` is 5 lines; no dep needed |

**Key insight:** Three.js r183 + drei v9 ship everything needed. The phase is material tuning and wiring, not new 3D primitives.

## Runtime State Inventory

This phase has no rename/refactor/migration. However, three runtime-state items are worth flagging:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — IndexedDB schema unchanged. `Product.imageUrl` already carries the texture source. | None |
| Live service config | drei `<Environment preset>` fetches HDRIs from drei-hosted CDN at runtime — this is a new **outbound network dependency** introduced by this phase. | Document in code comment; fail-soft if CDN unreachable (drei does not crash the scene) |
| OS-registered state | None — verified by reviewing src/three/ (no OS-level registrations) | None |
| Secrets/env vars | None — no API keys, no env vars | None |
| Build artifacts | None — no compiled packages. Vite bundles on next build. | None |

**GPU texture memory (runtime state inside browser):** The module-level `textureCache` Map grows unbounded as Jessica adds products to her library. This is acceptable for v1 (library is ~tens of products, each < 2 MB), but a future cleanup hook (`THREE.Texture.dispose()` when a product is removed from library) would be worth adding later. Not in scope for Phase 3.

## Common Pitfalls

### Pitfall 1: Blank PNG export (SAVE-03)
**What goes wrong:** `canvas.toDataURL()` returns a 1×1 blank or transparent image.
**Why it happens:** WebGL clears the drawing buffer after every render by default (`preserveDrawingBuffer: false`). By the time the export button handler runs, the buffer is already gone.
**How to avoid:** Set `gl={{ preserveDrawingBuffer: true }}` on R3F `<Canvas>` (D-13). Alternative is to force a synchronous render via `useThree().gl.render(scene, camera)` immediately before `toDataURL()` but `preserveDrawingBuffer` is simpler.
**Warning signs:** Exported PNG opens as blank/transparent; browser console shows no errors.
**Performance note:** `preserveDrawingBuffer: true` has a small continuous performance cost (can't skip buffer copies). For a personal CAD tool with a static scene, this is negligible.

### Pitfall 2: sRGB double-gamma correction on textures
**What goes wrong:** Product images look washed out or overly dark.
**Why it happens:** Image files are stored in sRGB (gamma-encoded), but three.js treats them as linear RGB by default. When the renderer applies its own sRGB→linear→sRGB pipeline for tone mapping, you get double-correction.
**How to avoid:** Set `tex.colorSpace = THREE.SRGBColorSpace` on every **color/albedo** texture (already done in current code and D-02 preserves it). **Do NOT** set it on normal maps, roughness maps, or AO maps — those are data textures and stay in LinearSRGBColorSpace (the default).
**Warning signs:** Textures look flat/muddy even under good lighting, or too bright/saturated.

### Pitfall 3: Shadow acne / peter-panning
**What goes wrong:** Black stripes appear on floor/walls, or objects look like they're floating.
**Why it happens:** Shadow map precision is insufficient or shadow bias is wrong.
**How to avoid:** `shadow-bias={-0.001}` is already set on the directional light in `Lighting.tsx`. With mapSize going 2048→4096, the current bias should be fine. If acne appears, tune bias in the −0.0001 to −0.005 range.
**Warning signs:** Striped moiré on floor, dark bands on walls under sun angle.

### Pitfall 4: drei Environment preset CDN failure
**What goes wrong:** In production/offline, the HDRI fails to load and the scene renders without IBL.
**Why it happens:** drei's `preset` prop points to an external CDN (per drei docs: "may fail as it relies on CDNs").
**How to avoid:** Wrap `<Environment>` in a `<Suspense fallback={null}>` so the scene renders without it if loading fails. For Jessica's use case (home network, personal tool) this is acceptable.
**Warning signs:** Scene looks flat/unlit at first load; console shows fetch error for a `.hdr` URL.

### Pitfall 5: Texture aspect stretching (D-04 deliberate tradeoff)
**What goes wrong:** A 1920×1080 couch photo stretched across a 3ft-tall box face looks squashed.
**Why it happens:** `boxGeometry` UVs map each face to a unit 0-1 square regardless of face aspect ratio.
**How to avoid:** D-04 explicitly accepts this tradeoff. If it becomes visually jarring, post-v1 work can compute per-face UV scaling from `width/depth/height`.
**Warning signs:** Products look "melted" or squashed from certain angles.

### Pitfall 6: Huge GPU memory from uncached textures
**What goes wrong:** Placing the same couch 10 times loads the image 10 times into GPU memory.
**Why it happens:** Without a cache, each `<ProductMesh>` calls `loader.load()` independently.
**How to avoid:** Module-level `Map<string, THREE.Texture>` keyed on `imageUrl` (D-02).
**Warning signs:** GPU memory grows by N × imageSize per instance; large libraries cause stutter.

### Pitfall 7: Floor texture tiling math depends on room dimensions
**What goes wrong:** Swapping room dimensions causes planks to look stretched/tiny.
**Why it happens:** `texture.repeat` must be recomputed when `room.width` / `room.length` change.
**How to avoid:** Compute `texture.repeat.set(room.width / 4, room.length / 4)` inside `<Scene>` where `room` is subscribed (so it updates), NOT at module level. Memoize the texture itself at module level, but call `.repeat.set()` on every room change.
**Warning signs:** Opening a project with a large room shows tiny planks; small room shows 2-foot-wide slabs.

## Code Examples

### Full updated ThreeViewport (illustrative)
```typescript
// src/three/ThreeViewport.tsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import type { Product } from "@/types/product";
import WallMesh from "./WallMesh";
import ProductMesh from "./ProductMesh";
import Lighting from "./Lighting";
import { getFloorTexture } from "./floorTexture";

interface Props { productLibrary: Product[]; }

function Scene({ productLibrary }: Props) {
  const room = useCADStore((s) => s.room);
  const walls = useCADStore((s) => s.walls);
  const placedProducts = useCADStore((s) => s.placedProducts);
  const selectedIds = useUIStore((s) => s.selectedIds);

  const halfW = room.width / 2;
  const halfL = room.length / 2;

  const { floorMap, floorNormal } = useMemo(() => {
    const t = getFloorTexture();
    t.map.repeat.set(room.width / 4, room.length / 4);
    t.normalMap.repeat.set(room.width / 4, room.length / 4);
    t.map.needsUpdate = true;
    t.normalMap.needsUpdate = true;
    return { floorMap: t.map, floorNormal: t.normalMap };
  }, [room.width, room.length]);

  return (
    <>
      <Lighting />
      <Suspense fallback={null}>
        <Environment preset="apartment" />
      </Suspense>

      <mesh position={[halfW, 0, halfL]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[room.width, room.length]} />
        <meshStandardMaterial map={floorMap} normalMap={floorNormal} roughness={0.8} metalness={0} />
      </mesh>

      {/* ...walls, products, controls unchanged... */}
    </>
  );
}

export default function ThreeViewport({ productLibrary }: Props) {
  const room = useCADStore((s) => s.room);
  const halfW = room.width / 2;
  const halfL = room.length / 2;

  return (
    <div className="w-full h-full bg-obsidian-deepest">
      <Canvas
        shadows="soft"
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: THREE.SRGBColorSpace,
          preserveDrawingBuffer: true,
          antialias: true,
        }}
        camera={{ position: [halfW + 15, 12, halfL + 15], fov: 50, near: 0.1, far: 200 }}
      >
        <Scene productLibrary={productLibrary} />
      </Canvas>
    </div>
  );
}
```

### ProductMesh with cached async texture (VIZ-04)
```typescript
// src/three/ProductMesh.tsx
import { useEffect, useState } from "react";
import * as THREE from "three";
import type { PlacedProduct } from "@/types/cad";
import type { Product } from "@/types/product";
import { effectiveDimensions } from "@/types/product";

const textureCache = new Map<string, THREE.Texture>();
const failed = new Set<string>();

function useProductTexture(url: string | undefined, enabled: boolean): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(() =>
    url && enabled ? textureCache.get(url) ?? null : null
  );

  useEffect(() => {
    if (!url || !enabled) { setTex(null); return; }
    if (textureCache.has(url)) { setTex(textureCache.get(url)!); return; }
    if (failed.has(url)) { setTex(null); return; }

    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.loadAsync(url).then((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      textureCache.set(url, t);
      if (!cancelled) setTex(t);
    }).catch(() => {
      failed.add(url);
      if (!cancelled) setTex(null);
    });
    return () => { cancelled = true; };
  }, [url, enabled]);

  return tex;
}

export default function ProductMesh({ placed, product, isSelected }: {
  placed: PlacedProduct; product: Product | undefined; isSelected: boolean;
}) {
  const { width, depth, height, isPlaceholder } = effectiveDimensions(product);
  const texture = useProductTexture(product?.imageUrl, !isPlaceholder);
  const rotY = -(placed.rotation * Math.PI) / 180;

  return (
    <mesh
      position={[placed.position.x, height / 2, placed.position.y]}
      rotation={[0, rotY, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial
        color={isSelected ? "#93c5fd" : isPlaceholder ? "#7c5bf0" : "#ffffff"}
        map={texture ?? undefined}
        transparent={isPlaceholder}
        opacity={isPlaceholder ? 0.8 : 1}
        roughness={isPlaceholder ? 0.6 : 0.55}
        metalness={isPlaceholder ? 0.1 : 0.05}
      />
    </mesh>
  );
}
```
Note: when a `map` is set, the `color` acts as a multiplier — set to white (`#ffffff`) for real products so the image shows unmodified. Keep accent purple for placeholders (no map).

### Export with timestamp + 3D-view gate
```typescript
// src/lib/export.ts
export function exportRenderedImage(): { ok: boolean; reason?: string } {
  const threeCanvas = document.querySelector(
    ".bg-obsidian-deepest canvas"
  ) as HTMLCanvasElement | null;

  if (!threeCanvas) {
    return { ok: false, reason: "Switch to 3D view to export render" };
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const filename = `room-${stamp}.png`;

  const link = document.createElement("a");
  link.download = filename;
  link.href = threeCanvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return { ok: true };
}
```

### Toolbar gate for 2D view (D-14)
```typescript
// src/components/Toolbar.tsx (snippet)
<button
  onClick={() => {
    const result = exportRenderedImage();
    if (!result.ok) {
      // show inline toast — reuse SaveIndicator pattern or console.warn in v1
      alert(result.reason ?? "Export failed");
    }
  }}
  disabled={viewMode !== "3d" && viewMode !== "split"}
  // ...
>
  EXPORT
</button>
```
(Whether `split` counts as 3D for export is a small open question — see Open Questions.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `outputEncoding = sRGBEncoding` | `outputColorSpace = SRGBColorSpace` | three r152 (May 2023) | D-07 uses the current API ✓ |
| `texture.encoding = sRGBEncoding` | `texture.colorSpace = SRGBColorSpace` | three r152 | Existing code already uses the new API ✓ |
| Manual PMREMGenerator for env maps | drei `<Environment>` component | drei 9.x | D-08 uses the modern component ✓ |
| Synchronous `loader.load(url, onLoad)` | `loader.loadAsync(url): Promise<Texture>` | three r128 | D-02 migrates to the modern async API ✓ |

**Deprecated / outdated:** Nothing in Phase 3 plan uses deprecated APIs. Installed versions (three 0.183, R3F 8.17, drei 9.122) are all current as of late-2024 / early-2025 and support every locked decision.

## Open Questions

1. **Does split-view count as 3D for export?**
   - What we know: D-14 says "Switch to 3D view" (singular). Split view contains the 3D canvas too.
   - What's unclear: Should EXPORT work in split view, or only in pure 3D?
   - Recommendation: Allow export in both `3d` and `split`. The selector `.bg-obsidian-deepest canvas` will find the R3F canvas in both modes (assuming the 3D panel retains that class). Planner should verify and either document the choice or ask the user.

2. **`needsUpdate` when room dimensions change.**
   - What we know: Setting `.repeat.set()` on an existing texture requires `.needsUpdate = true` OR replacing the texture.
   - What's unclear: Whether R3F's `<meshStandardMaterial>` automatically marks the material dirty when the `map` reference stays the same but its internal offset/repeat change.
   - Recommendation: Set `texture.needsUpdate = true` defensively inside the `useMemo` when room size changes; verify in testing.

3. **Suspense boundary placement for `<Environment>`.**
   - What we know: drei Environment with `preset` is async (loads HDRI from CDN).
   - What's unclear: Whether it auto-suspends or needs an explicit `<Suspense>` parent.
   - Recommendation: Wrap in explicit `<Suspense fallback={null}>` (shown in example above). Harmless if unnecessary.

4. **Does `castShadow` belong on ProductMesh?**
   - What we know: Products currently do NOT cast or receive shadows.
   - What's unclear: Whether adding `castShadow receiveShadow` is part of VIZ-06's "smooth experience" expectation.
   - Recommendation: YES — add both. Realistic shadows on products are a large part of "feels like a render" and the decision is consistent with D-06's intent. Planner should ratify.

5. **Where does the "Switch to 3D view" toast render?**
   - CONTEXT leaves styling to Claude's discretion. Options: (a) reuse `SaveIndicator` component from Phase 1, (b) add a new `Toast.tsx` component, (c) temporary inline `alert()`.
   - Recommendation: Start with (c) `alert()` for simplicity; upgrade to (a) if Jessica finds it jarring. Toast components are out-of-scope infrastructure for one message.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| three | All 3D work | ✓ | 0.183.2 (installed) | — |
| @react-three/fiber | R3F Canvas | ✓ | 8.17.14 (installed) | — |
| @react-three/drei | Environment preset | ✓ | 9.122.0 (installed) | — |
| drei HDRI CDN | `<Environment preset="apartment">` runtime fetch | Network-dependent | — | Suspense fallback={null} — scene renders without IBL if CDN unreachable |
| Canvas2D API | Floor texture generation | ✓ | Browser standard | — |
| HTMLCanvasElement.toDataURL("image/png") | PNG export | ✓ | Browser standard | — |
| Node.js | Build (Vite) | Not checked | — | (out of scope — build env already working per STATE.md) |
| Vitest | Tests | ✓ | 4.1.2 (installed) | — |
| jsdom | Test environment | ✓ | 29.0.1 (installed) | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** drei HDRI CDN — fallback is `<Suspense fallback={null}>` so scene renders without environment lighting if network fails.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 + jsdom 29.0.1 + @testing-library/react 16 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test:quick` |
| Full suite command | `npm test` (→ `vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIZ-04 | `effectiveDimensions` gates texture load — placeholder products do NOT request texture | unit | `npx vitest run tests/productHelpers.test.ts` | ✅ (extend existing) |
| VIZ-04 | Module-level texture cache returns same Texture instance for repeat URLs | unit | `npx vitest run tests/productTextureCache.test.ts` | ❌ NEW (Wave 0) |
| VIZ-04 | Failed image URL is remembered in `failed` set, second call returns null without re-fetching | unit | `npx vitest run tests/productTextureCache.test.ts` | ❌ NEW (Wave 0) |
| VIZ-04 | ProductMesh renders without crashing when `product.imageUrl` is undefined | unit (RTL) | `npx vitest run tests/ProductMesh.test.tsx` | ❌ NEW (Wave 0) — note: R3F in jsdom requires mocks |
| VIZ-06 | `getFloorTexture()` is idempotent — returns same cached {map, normalMap} | unit | `npx vitest run tests/floorTexture.test.ts` | ❌ NEW (Wave 0) |
| VIZ-06 | Floor texture `repeat` computed as `room.width / 4, room.length / 4` | unit | `npx vitest run tests/floorTexture.test.ts` | ❌ NEW (Wave 0) |
| VIZ-06 | Visual richness (soft shadows, Environment preset visible, tone mapping) | **manual-only** | Human UAT via `npm run dev` | — (Manual gate: use screenshot/eyes) |
| SAVE-03 | `exportRenderedImage()` returns `{ok: false, reason}` when no `.bg-obsidian-deepest canvas` in DOM | unit | `npx vitest run tests/export.test.ts` | ❌ NEW (Wave 0) |
| SAVE-03 | Filename format matches `/^room-\d{8}-\d{4}\.png$/` | unit | `npx vitest run tests/export.test.ts` | ❌ NEW (Wave 0) |
| SAVE-03 | Selector string is `.bg-obsidian-deepest canvas` (not `.bg-gray-900`) | unit | `npx vitest run tests/export.test.ts` | ❌ NEW (Wave 0) |
| SAVE-03 | Full 3D canvas→PNG download end-to-end | **manual-only** | Human UAT — actually download file | — (GL context unreliable in jsdom) |

**Manual-only justifications:**
- WebGL rendering quality (VIZ-06) cannot be meaningfully asserted in jsdom; no GPU context.
- `canvas.toDataURL()` with `preserveDrawingBuffer` requires a real WebGL context; jsdom returns blank.
- Visual PBR / Environment / tone-mapping correctness is inherently subjective — human verification.

### Sampling Rate
- **Per task commit:** `npm run test:quick` (< 5s for unit-only changes)
- **Per wave merge:** `npm test` (full suite ~5-15s)
- **Phase gate:** Full suite green + manual UAT screenshots confirming (a) couch image visible in 3D, (b) wood floor + soft shadows visible, (c) PNG download works before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/productTextureCache.test.ts` — covers VIZ-04 caching & failure-memo
- [ ] `tests/ProductMesh.test.tsx` — covers VIZ-04 render safety (requires R3F test mocks — see drei/fiber test utilities or @react-three/test-renderer; may be simpler to extract pure cache logic to separate module and test that instead)
- [ ] `tests/floorTexture.test.ts` — covers VIZ-06 texture generation + caching + repeat math
- [ ] `tests/export.test.ts` — covers SAVE-03 selector, filename format, empty-DOM branch
- [ ] (No new shared fixtures needed — existing `tests/setup.ts` is sufficient)
- [ ] Framework install: NONE — Vitest already configured

**Recommendation:** Extract the texture cache logic into `src/three/productTextureCache.ts` (pure TS module with `loadProductTexture(url)`, `hasCached(url)`, etc.) so it can be unit-tested without mounting R3F. Keep the React hook (`useProductTexture`) thin and test it only at the integration level or via manual UAT.

## Sources

### Primary (HIGH confidence)
- Installed `@react-three/fiber` v8.17.14 source (`node_modules/@react-three/fiber/dist/events-*.js` L1986/2013) — verified R3F default `toneMapping = ACESFilmicToneMapping`
- Installed `@react-three/drei` v9.122.0 — Environment component shipped
- Installed `three` v0.183.2 — TextureLoader.loadAsync, CanvasTexture, SRGBColorSpace, PCFSoftShadowMap, ACESFilmicToneMapping all stock APIs
- `.planning/phases/03-3d-product-rendering/03-CONTEXT.md` — locked decisions
- `.planning/phases/02-product-library/02-CONTEXT.md` — placeholder contract, `effectiveDimensions()`, `hasDimensions()` contracts
- `src/three/*.tsx`, `src/lib/export.ts`, `src/components/Toolbar.tsx`, `src/types/product.ts` — current code verified

### Secondary (MEDIUM confidence)
- https://drei.docs.pmnd.rs/staging/environment — Environment preset list + CDN warning (fetched 2026-04-04)
- https://r3f.docs.pmnd.rs/api/canvas — Canvas gl prop + shadows prop (fetched 2026-04-04)
- https://threejs.org/docs/#api/en/loaders/TextureLoader — loadAsync API
- https://threejs.org/docs/#api/en/textures/CanvasTexture — CanvasTexture from HTMLCanvasElement

### Tertiary (LOW confidence)
- None — all critical claims verified in installed packages or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all deps installed and version-verified locally
- Architecture: HIGH — phase extends existing R3F scene pattern already in production
- Pitfalls: HIGH — WebGL / sRGB / shadow / preserveDrawingBuffer are well-documented ecosystem gotchas
- Test map: MEDIUM — R3F testing in jsdom is non-trivial; recommendation is to extract testable logic from React components rather than mock the R3F runtime

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days — stable deps, well-documented APIs)

---

*Phase 03-3d-product-rendering — research complete, planning can proceed.*
