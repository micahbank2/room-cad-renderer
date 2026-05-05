---
phase: 58-gltf-integration-verification-gltf-integration-01
type: context
created: 2026-05-05
status: ready-for-research
requirements: [GLTF-INTEGRATION-01]
depends_on: [Phase 55 GLTF-UPLOAD-01 (gltfStore + Product.gltfId), Phase 56 GLTF-RENDER-3D-01 (GltfProduct, useGltfBlobUrl, wrapping group), Phase 57 GLTF-RENDER-2D-01 (gltfSilhouette, fabric.Polygon path), Phase 45 THUMB-01 (swatchThumbnailGenerator pattern), Phase 48 saved-camera (camera tree node + double-click focus), Phase 33 (LibraryCard primitive)]
---

# Phase 58: GLTF Integration Verification (GLTF-INTEGRATION-01) — Context

## Goal

Tie the GLTF pipeline into the rest of the platform. Three workstreams:

1. **Library Box icon** — small lucide `Box` badge on cards for products with `gltfId`, so Jessica can see at a glance which products have a real 3D model.
2. **Auto-thumbnail** — when a Product has `gltfId` but no `imageUrl`, render a 256×256 thumbnail offscreen from the GLTF (mirrors Phase 45 swatch pattern). Replaces the blank library card seen during Phase 55 UAT.
3. **Integration verification** — confirm Phase 31 size-override, Phase 48 saved-camera, Phase 53 right-click, Phase 54 click-to-select all compose correctly with GLTF products. Most are already verified by Phase 56/57 e2e; Phase 48 × GLTF is the only untested combo.

Source: REQUIREMENTS.md `GLTF-INTEGRATION-01`. Closes v1.14 milestone.

## Pre-existing infrastructure

- **Phase 45** `src/three/swatchThumbnailGenerator.ts`: shared `THREE.WebGLRenderer` + studio-lit scene + in-memory cache. Pattern to mirror for GLTF thumbnails.
- **Phase 55** `src/lib/gltfStore.ts`: `getGltf(id)` returns `{ blob }` from IDB.
- **Phase 56** `src/three/GltfProduct.tsx`: drei `useGLTF(blobUrl)` + auto-scale + Y-offset patterns. The standalone `loadGltfScene` from Phase 57 (`src/lib/gltfSilhouette.ts`) loads via `THREE.GLTFLoader.parseAsync` outside React — we'll reuse that pattern.
- **Phase 33** `src/components/library/LibraryCard.tsx`: shared card primitive with `thumbnail` prop. Currently no badge slot — will add.
- **Phase 48** `src/test-utils/savedCameraDrivers.ts`: existing drivers + `e2e/saved-camera-cycle.spec.ts` exist but don't exercise GLTF products.
- **Phase 56 e2e** `e2e/gltf-render-3d.spec.ts`: E3 covers Phase 31 resize × GLTF; E4 covers Phase 53/54 click × GLTF.
- **Phase 57 e2e** `e2e/gltf-render-2d.spec.ts`: E3 covers Phase 31 resize × GLTF (2D); E4 covers Phase 53/54 click × GLTF (2D).

## Decisions

### D-01 — Box icon position: top-LEFT corner of LibraryCard

User-facing choice (revised after research surfaced collision). A 12px lucide `Box` icon at the top-LEFT corner of each card when `product.gltfId` is set. The existing `onRemove` X button lives in the top-right corner (`LibraryCard.tsx:84-92`); placing the badge in the opposite corner avoids collision. Always-visible (the X button is hover-revealed, so no overlap).

Implementation: extend `LibraryCardProps` with an optional `badge?: ReactNode` slot at the top-left corner. `ProductLibrary.tsx` passes `<Box size={12} className="text-text-dim" />` as the badge when `p.gltfId` is truthy.

**Why a badge slot vs. a `gltfBadge` boolean prop:** keeps `LibraryCard` agnostic of the GLTF concept. Other call sites can use the slot too without growing the API.

### D-02 — Box icon visibility rule: any GLTF-backed product

Show the badge whenever `product.gltfId` is truthy, regardless of whether `imageUrl` is also set. Identifies "this card has a real 3D model" universally.

### D-03 — Auto-thumbnail trigger: lazy on first library render

Mirror Phase 45 swatch pattern. `ProductLibrary.tsx` calls `getCachedGltfThumbnail(gltfId, onReady)` per card. Sync return: cached dataURL OR undefined. Async: kicks off load+render, calls `onReady` when done → triggers re-render via state tick (same FIX-01 / Phase 57 onAssetReady pattern).

**Why lazy:** matches existing patterns; eager generation on upload would slow the AddProductModal flow.

### D-04 — Auto-thumbnail rendered camera: 3/4 perspective view

User-facing choice. Standard product-catalog look — camera positioned ~30° elevation, ~30° azimuth from the model's front. Auto-fit framing: compute model bbox via `THREE.Box3().setFromObject(scene)`, position camera at `bbox.center + bbox.diagonal × {0.7, 0.5, 0.7}`, lookAt center. Use orthographic OR perspective — recommend perspective with FOV=35° for a slight depth cue (Phase 45 used FOV=45°).

**Why 3/4 perspective:** matches user expectation of a furniture catalog (Wayfair, IKEA). Top-down would be flat and ambiguous; front-only loses depth.

### D-05 — Auto-thumbnail size + format: 256×256 PNG dataURL

Locked by REQUIREMENTS.md acceptance. Returned as `data:image/png;base64,...` string suitable for `<img src>`. Phase 45 used 128×128 for swatches; library cards are larger (~96–128px rendered) — 256×256 with object-cover gives crisp display at @2× retina.

### D-06 — Auto-thumbnail lighting: studio (not scene-matching)

Mirror Phase 45 D-05 exactly:
- DirectionalLight (intensity 1.5) at ~45° elevation, ~30° azimuth
- AmbientLight (intensity 0.4)
- Rim DirectionalLight (intensity 0.3) from behind-left

**Why studio lighting:** consistent identification across all products. Scene-matching would couple thumbnail to room state, which is wrong — thumbnails are for the global library, not the current room.

### D-07 — Auto-thumbnail background: transparent

Phase 45 D-05 (transparent via `setClearColor(0x000000, 0)`). Falls onto the LibraryCard's existing `bg-obsidian-high` thumbnail container. Avoids hardcoded background that would clash if the card color changes.

### D-08 — Auto-thumbnail cache: in-memory Map keyed by gltfId

User-facing choice. `Map<string, string | "fallback">` at module scope in new `src/three/gltfThumbnailGenerator.ts`. Sentinel `"fallback"` (Phase 45 pattern) marks compute failure → don't retry; LibraryCard renders placeholder background.

**Do NOT persist to IDB or write back to `Product.imageUrl`:**
- Recompute on every page load is acceptable (~50ms per GLTF on first library render)
- Keeps the saved snapshot lean — no base64 PNG bloat per product
- Avoids "is this a user-uploaded image or auto-generated?" ambiguity in the data model

### D-09 — Auto-thumbnail render usage rule

`ProductLibrary.tsx` decides which image to pass to `LibraryCard.thumbnail`:
1. If `product.imageUrl` is set → use that (user-provided takes priority)
2. Else if `product.gltfId` is set → call `getCachedGltfThumbnail(gltfId, onReady)`; pass returned dataURL
3. Else → no thumbnail (existing placeholder)

**Why imageUrl first:** Phase 55's hypothesis was "user uploads image AND glb". For Jessica's flow, the image she chose to associate with the product is intentional. Auto-thumbnail is a fallback for the GLTF-only case.

### D-10 — Renderer ownership: shared dedicated WebGLRenderer

Mirror Phase 45 D-01 exactly. `gltfThumbnailGenerator.ts` lazy-inits ONE `THREE.WebGLRenderer` (256×256 canvas, antialias, alpha). Lazy-init scene + camera + lighting on first call. Reuse across all thumbnails. No `OffscreenCanvas` (browser support uneven; Phase 45 explicitly avoided it).

**Do NOT call `registerRenderer()`** (which sets global anisotropy on the main viewport's renderer). Phase 45 D-08.

### D-11 — Thumbnail compute: load → bbox → frame → render → toDataURL

```ts
async function computeGltfThumbnail(gltfId: string): Promise<string | "fallback"> {
  try {
    const blob = await getGltf(gltfId);
    if (!blob) return "fallback";
    const buf = await blob.arrayBuffer();
    const gltf = await new GLTFLoader().parseAsync(buf, "");
    const scene = gltf.scene;
    scene.updateMatrixWorld(true, true);

    const bbox = new THREE.Box3().setFromObject(scene);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());
    const diagonal = size.length();

    const r = ensureRenderer();
    threeScene.add(scene); // add to shared scene; remove after render
    camera.position.copy(center).add(new THREE.Vector3(diagonal * 0.7, diagonal * 0.5, diagonal * 0.7));
    camera.lookAt(center);

    r.render(threeScene, camera);
    const dataUrl = r.domElement.toDataURL("image/png");

    threeScene.remove(scene);
    // optional: dispose scene's geometries/materials/textures
    return dataUrl;
  } catch {
    return "fallback";
  }
}
```

Cache miss returns `undefined` synchronously, kicks off async compute, calls `onReady` on resolve.

### D-12 — Phase 48 saved-camera × GLTF e2e test

User-facing choice. Add ONE focused e2e scenario in new `e2e/gltf-integration.spec.ts`:
1. Seed scene with a GLTF product via `__driveAddGltfProduct`
2. Switch to 3D
3. Adjust camera (orbit/zoom)
4. Save camera on the product via the existing saved-camera UI / driver
5. Move camera elsewhere
6. Double-click the product's camera tree row
7. Assert camera position/target match the saved values within tolerance

Closes the only Phase 48 × GLTF gap. Phase 31 / 53 / 54 × GLTF are already covered by Phase 56 e2e (`gltf-render-3d.spec.ts` E3, E4) and Phase 57 e2e (`gltf-render-2d.spec.ts` E3, E4).

### D-13 — Test coverage

**Unit (vitest):**
1. `gltfThumbnailGenerator.computeGltfThumbnail` resolves to `data:image/png;base64,...` for a synthetic Box scene
2. `getCachedGltfThumbnail` synchronous hit returns cached dataURL
3. `getCachedGltfThumbnail` cache miss returns undefined + invokes onReady when async resolves
4. `getCachedGltfThumbnail` returns `"fallback"` sentinel for invalid gltfId / failed parse
5. `LibraryCard` renders the `badge` slot when provided; no badge when omitted

**Component (vitest + RTL):**
6. `ProductLibrary` renders Box badge for products with `gltfId`; no badge for image-only products
7. `ProductLibrary` passes `imageUrl` to LibraryCard when set; passes thumbnail dataURL when only `gltfId` set; passes undefined when neither

**E2E (Playwright):**
8. Phase 48 saved-camera × GLTF (D-12 scenario above)
9. Library list shows Box badge for GLTF products (DOM assertion via test driver)
10. Library card thumbnail populated for GLTF-only products after compute resolves

### D-14 — Test fixture reuse

Reuse `tests/e2e/fixtures/box.glb` (Phase 56). For unit tests, build synthetic `THREE.Group` with a `BoxGeometry` mesh — no GLTF parse needed for thumbnail render assertions.

### D-15 — Atomic commits per task

Mirror Phase 49–57 pattern.

### D-16 — Zero regressions

- Image-only products: badge slot empty, imageUrl path unchanged
- Phase 31 / 53 / 54 × GLTF: already covered, no new tests needed (would be redundant)
- Phase 56 3D rendering: untouched (this phase only adds new files + extends LibraryCard + ProductLibrary)
- Phase 57 2D silhouette: untouched
- LibraryCard's existing `thumbnail`, `selected`, `onRemove`, `variant` behavior: unchanged
- AddProductModal: untouched (auto-thumbnail is read-only display logic, not write logic)
- 4 pre-existing vitest failures: unchanged

## Out of scope (this phase — already deferred)

- OBJ format support (v1.15+)
- GLTF animations
- Custom material overrides on GLTF
- IDB-persisted thumbnail cache (in-memory only — D-08)
- Thumbnail regeneration UI (e.g. "refresh thumbnail" button) — recompute is automatic on cache eviction (full reload)
- Eager thumbnail generation on GLTF upload — lazy compute is sufficient (D-03)
- Top-down or front-view thumbnails — 3/4 perspective only (D-04)
- Phase 31/53/54 × GLTF additional e2e — already covered by Phases 56/57

## Files we expect to touch

- `src/three/gltfThumbnailGenerator.ts` — NEW (~120 lines): renderer + scene lazy init, computeGltfThumbnail, getCachedGltfThumbnail, fallback sentinel
- `src/components/library/LibraryCard.tsx` — extend props with `badge?: ReactNode`; render top-right slot
- `src/components/ProductLibrary.tsx` — branch thumbnail source on imageUrl/gltfId; pass Box icon as badge for GLTF products
- `src/components/library/index.ts` — re-export updated LibraryCardProps if needed
- `tests/three/gltfThumbnailGenerator.test.ts` — NEW (4 unit tests, U1–U4)
- `tests/components/LibraryCard.badge.test.tsx` — NEW (U5 badge slot)
- `tests/components/ProductLibrary.gltf.test.tsx` — NEW (C1, C2 component tests)
- `e2e/gltf-integration.spec.ts` — NEW (3 scenarios E1–E3: Phase 48 × GLTF, library badge, library thumbnail)

Estimated 1 plan, 4 tasks, ~8 files. Mid-size phase — closes v1.14.

## Open questions for research phase

1. **GLTFLoader scene reuse safety:** Phase 57 calls `loadGltfScene` per cache miss; can we add the same scene to the thumbnail generator's scene tree without disturbing Phase 57's silhouette compute? (Likely yes — both run sequentially and traverse separate `THREE.Group`s, but confirm the parsed scene isn't shared by reference. If shared, clone via `scene.clone()`.)

2. **Camera framing math:** the formula `center + diagonal × (0.7, 0.5, 0.7)` is a starting point. Research should confirm whether this consistently frames a furniture-shaped bbox (tall/wide/deep) without clipping. May need to compute distance from FOV instead: `distance = (size.length() / 2) / Math.tan(camera.fov × 0.5 × π/180)`.

3. **WebGL context ceiling:** browsers limit total WebGL contexts (Chrome ~16). Main viewport + Phase 45 swatch generator + Phase 58 thumbnail generator = 3. Safe but worth confirming Phase 45's renderer is the only existing offscreen context.

4. **Cleanup ordering:** when removing the GLTF scene from the thumbnail generator's scene tree, do we need to dispose geometries/materials/textures explicitly to avoid GPU memory growth across many distinct gltfIds in one session? (Probably yes for Jessica's actual workflow with 20+ products.)

5. **`LibraryCard` badge styling:** what's the right visual? A 12px icon in a 16×16 rounded background? Floating without a background? Match the X-button style (`opacity-0 group-hover:opacity-100`) or always-visible? The user picked "top-right corner" placement; visual treatment is open. Recommend always-visible, 12px Box icon, `text-text-dim` color, no background — subtle but persistent identifier.
