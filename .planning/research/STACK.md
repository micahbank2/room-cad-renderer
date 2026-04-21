# Stack Research — v1.7 3D Realism

**Domain:** Browser-only PBR materials, user-uploaded textures, animated camera presets in R3F v8 + drei v9
**Researched:** 2026-04-20
**Confidence:** HIGH (Three.js + drei + camera-controls APIs verified against official docs / source / npm)

> **Scope reminder:** Existing stack (React 18, Vite 8, Three 0.183, R3F v8.17.14, drei 9.122.0, Zustand 5, Immer 11, idb-keyval 6.2.2, Tailwind v4) is **locked**. Only NEW additions/usage patterns are catalogued below. R3F v9 / React 19 explicitly deferred per D-02 / GH #56.

---

## Core Conclusion

**No new runtime dependencies are required for any of the three target features.** Everything ships in the locked versions of `three@^0.183`, `@react-three/drei@^9.122`, `@react-three/fiber@^8.17`, and `idb-keyval@^6.2`.

| Feature | Verdict | Why |
|---------|---------|-----|
| PBR maps on existing materials | Use what's installed | `useTexture` from drei v9 + `meshStandardMaterial` slots (already used). |
| User-uploaded image → texture → IndexedDB | Use what's installed | `idb-keyval` already stores `Blob`; `URL.createObjectURL(blob)` → `THREE.TextureLoader().load(url)`. |
| Camera preset tween (no R3F v9 upgrade) | Use what's installed | Continue Phase 30/31's `useFrame` + `lerp`/`Quaternion.slerp` pattern (matches `ThreeViewport.tsx:84–103`). Drei `<CameraControls>` is **available** as opt-in but not required. |

The optional `camera-controls` upgrade is documented for evaluation only; current `useFrame` lerp pattern is sufficient and already proven in this codebase.

---

## Recommended Stack — New APIs Only

### Texture loading — PBR (Feature 1)

| API | Module | Purpose | Why |
|-----|--------|---------|-----|
| `useTexture({ map, normalMap, roughnessMap })` | `@react-three/drei` (already installed) | Load multiple PBR maps in parallel, suspend until ready, auto-spread to material via `<meshStandardMaterial {...textures} />` | Object-form is the documented PBR pattern (drei docs `loaders/texture-use-texture`). Already inside Three.js Suspense boundary in `ThreeViewport.tsx`. |
| `useTexture(url, (tex) => { tex.colorSpace = THREE.SRGBColorSpace })` | `@react-three/drei` | Set per-map color space + wrap/repeat in onLoad | `map`/albedo MUST be `SRGBColorSpace`; `normalMap` + `roughnessMap` MUST be `NoColorSpace` (Three.js docs: "Color textures (.map, .emissiveMap) use sRGB; non-color data (normal, roughness, metalness, AO) must be NoColorSpace"). |
| `THREE.RepeatWrapping` + `texture.repeat.set(W/scaleFt, H/scaleFt)` | `three` | Tile textures across walls/floors | Pattern already used in `WallMesh.tsx:120–122` and `floorTexture.ts`. Reuse for new PBR maps; **all maps in a set must share the same repeat/offset** or normals/roughness will desync from albedo. |

**Existing material catalog impact:** `src/data/surfaceMaterials.ts` needs new optional fields per material:

```ts
interface SurfaceMaterial {
  // existing fields...
  maps?: {
    albedo: string;       // /textures/wood_plank/albedo.jpg
    normal?: string;      // /textures/wood_plank/normal.jpg
    roughness?: string;   // /textures/wood_plank/roughness.jpg
  };
  normalScale?: number;   // default 1.0; tune per material (concrete higher, plaster lower)
}
```

Apply at render time:

```tsx
const maps = useTexture({
  map: m.maps.albedo,
  ...(m.maps.normal && { normalMap: m.maps.normal }),
  ...(m.maps.roughness && { roughnessMap: m.maps.roughness }),
}, (loaded) => {
  // loaded may be array OR record; drei docs note this
  const arr = Array.isArray(loaded) ? loaded : Object.values(loaded);
  arr.forEach((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
  // colorSpace per-map handled by separate post-load step
});
```

### Texture loading — User uploads (Feature 2)

| API | Module | Purpose | Why |
|-----|--------|---------|-----|
| `<input type="file" accept="image/*">` + native `dragover`/`drop` events | DOM | File picker + drag-drop ingestion | Zero-dep; existing `ProductForm.tsx` already handles uploads via FileReader → dataURL pattern. |
| `URL.createObjectURL(blob)` | DOM | Convert `Blob` → loadable URL for Three.js | Three.js forum confirmed (donmccurdy thread): "use createObjectURL on the Blob, then `new THREE.TextureLoader().load(url)`". Faster than dataURL for large images and avoids 33% base64 storage bloat. **Must `URL.revokeObjectURL()` when texture disposed** to avoid memory leak. |
| `new THREE.TextureLoader().load(objectUrl, onLoad, onProgress, onError)` | `three` | Build `THREE.Texture` | Already used in `WallMesh.tsx:36`, `floorTexture.ts`. Same pattern; just point at object URL. |
| `idbKeyval.set(key, blob)` / `idbKeyval.get(key) → Blob` | `idb-keyval` (already installed) | Persist user textures | `idb-keyval` accepts any structured-cloneable value including `Blob`. **Store Blob, not dataURL or ArrayBuffer** — Blobs are first-class in IndexedDB, persist binary efficiently, and survive across reloads. |
| `HTMLCanvasElement` + `ctx.drawImage(img, 0, 0, w, h)` + `canvas.toBlob()` | DOM | Resize uploads before storage | WebGL `MAX_TEXTURE_SIZE` is commonly 4096 on consumer GPUs (~40% of devices); Three.js silently downsamples larger textures. Pre-resize to ≤2048 px on the longest edge before storing to (a) keep IndexedDB small, (b) avoid GPU-side resize cost, (c) skip non-PoT scaling artifacts. **Power-of-two not required in WebGL2** (R3F default) but still recommended for `RepeatWrapping` correctness. |

**Storage shape recommendation:**

```ts
interface UserTexture {
  id: string;          // uid()
  name: string;
  blob: Blob;          // primary — written to idb-keyval as-is
  width: number;       // post-resize
  height: number;
  createdAt: number;
}
// In-memory: cache `URL.createObjectURL(blob)` per session, revoke on app unload.
```

### Camera presets — Animated tween (Feature 3)

| API | Module | Purpose | Why |
|-----|--------|---------|-----|
| `useFrame((_, dt) => cam.position.lerp(target, speed))` + `controls.target.lerp(...)` | `@react-three/fiber` v8 (installed) | Per-frame interpolation toward target pos + look-at | **Already implemented and working in `ThreeViewport.tsx:84–103` (MIC-35 wall-side animation).** Extend the same `cameraAnimTarget = useRef<{pos, look} | null>(null)` pattern with a preset enum. No new deps. |
| `THREE.Quaternion.slerp(qa, qb, t)` | `three` | Smooth orientation tween (alternative for top-down → 3/4 transitions) | Lerping look-at can yield gimbal-flip near zenith; computing source/target quaternions and slerping the camera quaternion is the textbook fix. Drop in only if specific presets reveal flip artifacts. |
| Preset table (no API, just data) | `src/three/cameraPresets.ts` (new file) | Compute `(pos, look)` per preset from active room dims | Eye-level: `(roomCenter, eyeHeight=5.5ft, roomCenter)` looking +Z; Top-down: `(centerX, ceilingHeight×2.5, centerY)` looking -Y; Corner: `(roomMaxX+8, roomHeight×0.8, roomMaxY+8)` looking center; 3/4: existing default. Stored as constants, not in store. |

**Drei `<CameraControls>` (optional, NOT required):**

| Aspect | Detail |
|--------|--------|
| Status | Available in drei v9 (drei docs `controls/camera-controls`). Wraps yomotsu's `camera-controls` library. |
| Compatibility | Works in R3F v8 — drei v9.x is the v8-compatible major (drei v10 is the v9 major). No version conflict. |
| Method to use | `controlsRef.current.setLookAt(px, py, pz, tx, ty, tz, true)` — last `true` enables built-in SmoothDamp transition (controlled by `smoothTime`, default 0.25s). |
| Tradeoff vs status quo | Replaces `OrbitControls`; SmoothDamp is smoother than manual lerp but **forces a controls swap**, breaking existing `orbitControlsRef` wiring (used by `wallSideCameraTarget` effect, `onChange` save-state, walk-mode toggle). Cost > benefit for v1.7 unless we're already touching that code. |
| Recommendation | **Defer.** Stay on existing `OrbitControls` + `useFrame` lerp. Document `<CameraControls>` as v1.8+ option if SmoothDamp quality becomes a felt issue. |

---

## Supporting Libraries — None Required

No new packages need to be added to `dependencies` or `devDependencies` for v1.7.

| Considered | Recommendation | Reason |
|------------|----------------|--------|
| `camera-controls` (yomotsu) | Skip | Already available via drei v9 if needed; current lerp pattern works. |
| `react-spring` / `@react-spring/three` | Skip | Adds 60+ KB; `useFrame.lerp` covers our 2 transition types (eye-level, top-down) trivially. |
| `r3f-perf` | Skip (dev-only candidate for later) | Useful for v1.8+ perf debugging once PBR + uploads land; not needed to ship v1.7. |
| `pica` (image resize) | Skip | Native `canvas.drawImage` is sufficient for a single-user tool; pica's Lanczos quality is not user-visible at the source-photo → 2048px resize step. |
| `meshoptimizer` / `three-mesh-bvh` | Skip | No geometry growth in v1.7. |
| Texture atlas tooling | Skip | We have ≤3 PBR materials in scope (WOOD_PLANK, CONCRETE, PLASTER). Atlas overhead pays off at ~20+. |

---

## Bundled PBR Texture Sources (Asset Pipeline, not deps)

For the 3 in-scope materials, the project needs actual texture files committed to the repo. **Not a code dep**, but a stack decision:

| Source | License | Why |
|--------|---------|-----|
| ambientCG (cc0textures.com) | CC0 — no attribution required | Industry-standard free PBR set; offers WOOD/CONCRETE/PLASTER in 1K/2K/4K with albedo+normal+roughness+AO+displacement maps as separate JPGs. |
| polyhaven.com | CC0 | Equivalent quality, also CC0; secondary source. |

**Recommended commit shape:**

```
public/textures/
  wood_plank/
    albedo.jpg     (~200 KB at 1024×1024 JPG q85)
    normal.jpg     (~150 KB)
    roughness.jpg  (~100 KB)
  concrete/
    ...
  plaster/
    ...
```

Total bundled asset cost: ~1.5 MB across 3 materials at 1K. Acceptable for a desktop-only tool with no perf budget concerns documented. Vite serves `public/` as static; no build config change needed.

---

## Installation

**Nothing to install.** Verify lockfile pins remain at:

```bash
# Sanity-check existing versions (no install action)
npm ls three @react-three/fiber @react-three/drei idb-keyval
# Expected: three@0.183.x, @react-three/fiber@8.17.x, @react-three/drei@9.122.x, idb-keyval@6.2.x
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `useTexture({ map, normalMap, roughnessMap })` from drei | Raw `new THREE.TextureLoader().load()` per map | When we need non-Suspense lazy loading or want to share a single texture instance across many meshes manually (we already do this in `floorTexture.ts` for the procedural floor — keep that pattern there for consistency). For new PBR materials, `useTexture` is cleaner. |
| `URL.createObjectURL(blob)` for user uploads | dataURL via `FileReader.readAsDataURL` | When the texture must survive `URL.revokeObjectURL` cycles or be inlined into exported HTML. Not our case. dataURL is what `ProductForm.tsx` uses today; the **pattern shift** is intentional for Feature 2 to keep IndexedDB lean. |
| `useFrame` + `lerp` for camera | drei `<CameraControls>` SmoothDamp | When we want time-based easing (not framerate-coupled) or interactive zoom-to-fit. Defer to v1.8+. |
| `useFrame` + `lerp` for camera | `react-spring` `useSpring` for camera | When animating multiple coupled values (FOV + position + target) with shared physics. Overkill for 4 presets. |
| Bundled CC0 PBR textures in `public/` | Procedural generation (noise + bump) | When download size matters more than realism. We're desktop-local; ship the JPGs. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `RGBELoader` for material maps | RGBELoader is for HDR environment lighting (`Environment` in drei already wraps this — see `ThreeViewport.tsx:121`). PBR albedo/normal/roughness are LDR JPG/PNG, loaded by `TextureLoader`/`useTexture`. | `THREE.TextureLoader` / `useTexture` |
| Storing textures as base64 dataURLs in IndexedDB | 33% storage overhead vs Blob; slower JSON parse on hydrate; harder to revoke from memory. | `Blob` directly via `idb-keyval.set(key, blob)` |
| `texture.colorSpace = THREE.SRGBColorSpace` on **all** maps | Setting sRGB on a normal/roughness map gamma-corrects them, producing visibly wrong lighting (over-bright normals, wrong roughness response). Three.js docs are explicit. | `SRGBColorSpace` for albedo/`map` only; `NoColorSpace` for `normalMap`, `roughnessMap`, `metalnessMap`, `aoMap` |
| Mismatched `repeat`/`offset` between maps in one material | Albedo and normal must align pixel-for-pixel; independent repeat values cause shading misalignment. | Compute one `repeat` from `roomDim/scaleFt`, apply to **all** maps in the set after load. |
| Unbounded user uploads (no resize) | A 4032×3024 iPhone photo = ~12 MB Blob, 50 MB GPU memory, may exceed `MAX_TEXTURE_SIZE` on older GPUs (silent downsample by Three.js). | Pre-resize via `<canvas>` + `drawImage` to longest-edge ≤2048 px, re-encode JPEG q85 via `canvas.toBlob('image/jpeg', 0.85)`. |
| Forgetting `URL.revokeObjectURL()` on texture disposal | Each `createObjectURL` holds the Blob in memory until revoked or page unload — leaks across multi-room sessions. | Track object URLs in a module-level `Map<textureId, objectUrl>`; revoke when texture is removed from cache. |
| `<CameraControls>` swap mid-milestone | Replaces `OrbitControls`, breaks `orbitControlsRef` consumers in `ThreeViewport.tsx` (wall-side animation effect, walk-mode toggle, position persistence). | Stay on `OrbitControls` + `useFrame.lerp` pattern that already works (lines 84–103). |
| Upgrading R3F to v9 to get newer camera helpers | Locked per D-02 / GH #56 — R3F v9 + React 19 deferred until R3F v9 stabilizes. | All v1.7 features are achievable on v8; no v9 API is required. |

---

## Stack Patterns by Variant

**If a material has only an albedo (e.g. user upload at v1):**
- Use `useTexture(url)` single-form
- Set `colorSpace = SRGBColorSpace`, `wrapS = wrapT = RepeatWrapping`
- `<meshStandardMaterial map={tex} roughness={preset.roughness} />` — the existing flat-color path with the texture slotted in

**If a material has full PBR set (bundled WOOD_PLANK / CONCRETE / PLASTER):**
- Use `useTexture({ map, normalMap, roughnessMap })` object-form
- Apply per-map colorSpace in `onLoad`
- `<meshStandardMaterial {...maps} normalScale={[s, s]} />`

**If user wants to upload normal + roughness (advanced path per #47):**
- Same upload pipeline (Blob + IndexedDB), three slots in the form
- Same `useTexture` object-form at render time
- UI gates this behind "Advanced" disclosure to avoid overwhelming Jessica

**If a camera preset depends on room dimensions:**
- Compute `(pos, look)` lazily inside the preset-trigger handler from `useActiveRoom()`
- Set `cameraAnimTarget.current = { pos, look }`; existing `useFrame` lerp picks it up
- No store mutation needed (camera state is view-layer only)

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@react-three/drei@9.122.0` | `@react-three/fiber@8.17.x` | drei 9.x major is the R3F v8 compatible track. drei 10.x is for R3F v9 (NOT installed). |
| `three@0.183.x` | `@react-three/fiber@8.17.x` | R3F v8.17 supports Three 0.150–0.183; we're at the top of the range. PBR APIs (TextureLoader, MeshStandardMaterial, Quaternion.slerp) are stable since Three r130. |
| `idb-keyval@6.2.2` | All modern browsers | Stores Blobs natively via structured clone. No version concern. |
| `useTexture` PBR object-form | drei ≥ 9.50 | Confirmed available in 9.122. |
| `<CameraControls>` (if adopted later) | drei ≥ 9.x | Available; based on `camera-controls` v3+. |

---

## Sources

- [Drei — Texture / useTexture (loaders/texture-use-texture)](https://drei.docs.pmnd.rs/loaders/texture-use-texture) — single, array, and object-form patterns; onLoad callback shape — HIGH
- [React Three Fiber — Loading Textures tutorial](https://r3f.docs.pmnd.rs/tutorials/loading-textures) — useTexture PBR pattern with `meshStandardMaterial {...textures}` — HIGH
- [Drei GitHub README — controls list](https://github.com/pmndrs/drei) — `<CameraControls>` is exported in drei v9 — HIGH
- [pmndrs/drei issue #176 — Loading multiple textures](https://github.com/pmndrs/drei/issues/176) — confirms object-form auto-spreads to material — HIGH
- [pmndrs/drei issue #1969 — useTexture onLoad callback shape caveat](https://github.com/pmndrs/drei/issues/1969) — known type quirk; treat callback arg defensively — MEDIUM
- [Three.js issue #27760 — texture color space requirements](https://github.com/mrdoob/three.js/issues/27760) — `SRGBColorSpace` for color maps, `NoColorSpace` for non-color data — HIGH
- [Three.js forum — colorspace for normal/roughness/metalness](https://discourse.threejs.org/t/docs-which-material-textures-must-be-srgbcolorspace/81423) — confirms NoColorSpace for normal/roughness — HIGH
- [Three.js TextureLoader docs](https://threejs.org/docs/pages/TextureLoader.html) — load(url, onLoad, onProgress, onError) signature — HIGH
- [Three.js forum — How to use Blob images as texture (donmccurdy)](https://discourse.threejs.org/t/how-to-use-blob-images-as-texture/49846) — `URL.createObjectURL(blob)` → TextureLoader.load pattern — HIGH
- [Three.js forum — How to load Blob objects](https://discourse.threejs.org/t/how-to-load-blob-objects/37970) — confirms ArrayBuffer alternative via `Blob.arrayBuffer()` — HIGH
- [yomotsu/camera-controls README](https://github.com/yomotsu/camera-controls) — `setLookAt(..., enableTransition=true)`, `lerpLookAt`, `smoothTime`, `maxSpeed` API — HIGH
- [Drei controls docs (CameraControls)](https://drei.docs.pmnd.rs/controls/camera-controls) — drei wrapper exposes camera-controls methods via ref — HIGH
- [WebGL fundamentals — texture max sizes](https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html) — 4096 px common ceiling on consumer GPUs — HIGH
- [MDN — WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) — pre-resize uploads to avoid driver-side downsampling — HIGH
- [ambientCG license (CC0)](https://ambientcg.com/) — bundled-texture source, CC0 — HIGH
- [idb-keyval README](https://github.com/jakearchibald/idb-keyval) — Blob is a valid value type via structured clone — HIGH

---

*Stack research for: v1.7 3D Realism — additions to existing locked stack only*
*Researched: 2026-04-20*
