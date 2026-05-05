---
phase: 57-gltf-render-2d-01-top-down-silhouette
type: context
created: 2026-04-29
status: ready-for-research
requirements: [GLTF-RENDER-2D-01]
depends_on: [Phase 55 GLTF-UPLOAD-01 (gltfStore), Phase 56 GLTF-RENDER-3D-01 (useGltfBlobUrl, GltfProduct), existing fabricSync.ts product-rendering pattern + FIX-01 async image-cache callback]
---

# Phase 57: Top-Down Silhouette in 2D (GLTF-RENDER-2D-01) — Context

## Goal

Products with `gltfId` render as a top-down silhouette polygon in the 2D Fabric canvas, not a textured rectangle. A duck shows a duck-outline; a chair shows a chair-outline. Image-only products continue to show the existing rectangle. Source: REQUIREMENTS.md `GLTF-RENDER-2D-01`.

## Pre-existing infrastructure

- **Phase 55** `src/lib/gltfStore.ts`: `getGltf(id)` returns `{ blob, ... }` from IDB
- **Phase 56** `src/three/GltfProduct.tsx`: drei `useGLTF(blobUrl)` returns the parsed `scene` (`THREE.Group`) — same loader path
- **`src/canvas/fabricSync.ts:895-918`**: existing 2D product render path. `fabric.Rect` (border) + optional `fabric.FabricImage` (when image present) + labels, wrapped in a `fabric.Group` with `data.placedProductId`.
- **FIX-01 async pattern** (image cache): `getCachedImage(id, url, onReady)` returns existing or undefined; calls `onReady` callback when async load resolves; `onReady` triggers `fc.renderAll()` + `onImageReady?.()` to re-invoke `renderProducts` so the Group rebuilds with the FabricImage child. Phase 57 mirrors this for the silhouette compute.

## Decisions

### D-01 — Convex hull algorithm: Andrew's monotone chain

`src/lib/gltfSilhouette.ts` exports `computeTopDownSilhouette(scene: THREE.Group): Array<[number, number]>` returning convex-hull polygon vertices.

Algorithm: Andrew's monotone chain (~30 lines). Take all `BufferGeometry.position` attribute values across all meshes in the scene tree, project (x, z) tuples (top-down — drop Y), sort lexicographically, build lower + upper hulls.

**Why convex hull:** Most furniture is roughly convex from above (chairs, tables, sofas, lamps). L-shaped sofas get a wider outline than visually accurate, but the silhouette is still readable as "L-shaped-ish thing." Alpha shape would handle concave but adds complexity (alpha parameter tuning, more code) for marginal benefit on common cases.

**Why monotone chain:** Simple, no dependencies, well-known algorithm. Three.js doesn't ship one.

### D-02 — Walk all geometry vertices (no decimation)

Iterate `scene.traverse(node => { if (node.isMesh) ... })`. For each mesh, read `mesh.geometry.attributes.position.array` and project to (x, z) tuples after applying the mesh's world transform.

**Why no decimation:** Convex hull only retains boundary points. Interior points are discarded by the algorithm itself. Decimation upfront adds complexity and could miss boundary points. Compute is fast enough (~10-50ms for typical furniture GLTFs).

### D-03 — In-memory cache only (no IDB persistence)

Module-level `Map<string, Array<[number, number]>>` keyed by `gltfId`. Recompute on app reload is acceptable (<100ms hit on first 2D render of each unique gltfId).

**Why no IDB:** Persistence adds migration concerns + storage scope. Compute is cheap. The data is derivable.

### D-04 — Lazy compute (triggered on first 2D render)

`fabricSync.ts` calls `getCachedSilhouette(gltfId, onSilhouetteReady)` when a product has `gltfId`. If cache hit → return polygon synchronously. If miss → kick off async load+compute → return undefined; render bbox `fabric.Rect` fallback; call `onSilhouetteReady` when done.

**Why lazy:** 2D and 3D may be on different parts of user attention. A user might never enter 3D for a given session; computing silhouette eagerly when drei loads the GLTF wastes work. Lazy compute is also the pattern Phase 32 image cache uses.

### D-05 — Async with re-render callback (FIX-01 pattern)

`getCachedSilhouette(gltfId, onReady)` mirrors `getCachedImage(id, url, onReady)` exactly:
- Synchronous return: cached polygon OR undefined (still loading)
- When undefined: kick off async fetch via `getGltf(gltfId)` → load with `THREE.GLTFLoader().parseAsync` → `computeTopDownSilhouette(scene)` → cache result → call `onReady`
- `onReady` triggers `fc.renderAll() + onImageReady?.()` (rename to `onAssetReady` since both image and silhouette use it)

Fallback while computing: existing `fabric.Rect` border (matches placeholder/loading style).

### D-06 — Visual style: filled polygon + accent stroke

Replace `fabric.Rect` with `fabric.Polygon` for GLTF products:
- `fill`: `rgba(202, 195, 215, 0.15)` (text-text-dim @ 15% opacity — soft body fill)
- `stroke`: `#7c5bf0` (accent purple)
- `strokeWidth`: 1
- Same selection/hover behavior as the existing rect

The polygon vertices come from the cached silhouette, scaled to product `width × depth` (the user-specified dims, not the GLTF's intrinsic bbox).

**Why filled + outlined:** Matches existing 2D language (rectangles have border + image fill). Outline alone could be lost on busy backgrounds; fill alone reads as a flat shape. Both = readable.

### D-07 — Auto-scale silhouette to product bbox

Just like Phase 56's 3D auto-scale, the 2D silhouette is scaled to fit the user-specified `width × depth` bbox.

Algorithm: compute silhouette bbox (`minX, minZ, maxX, maxZ`). Compute scale factors `width / (maxX - minX)` and `depth / (maxZ - minZ)`. Use **the smaller** to maintain aspect ratio (no distortion). Translate so silhouette center matches placement center.

**Why uniform scale:** Same reason as Phase 56 D-02 — preserves aspect ratio. Whitespace on the smaller axis is acceptable.

### D-08 — Fallback paths

| Condition | Behavior |
|-----------|----------|
| GLTF compute fails (corrupt file, empty geometry, degenerate hull) | Cache a sentinel (e.g. `null`); fall back to `fabric.Rect` (existing image-product style) |
| Hull has < 3 vertices | Treat as failure → fallback rect |
| Compute in progress | `fabric.Rect` (placeholder, identical to image-loading state) |
| `gltfId` missing or `undefined` | Skip GLTF path entirely; render existing `fabric.Rect` + image |

### D-09 — Test coverage

**Unit (vitest):**
1. `computeTopDownSilhouette` returns N≥3 vertices for a simple cube scene
2. `computeTopDownSilhouette` projects Y-axis correctly (vertices are (x, z) tuples)
3. `computeTopDownSilhouette` returns convex hull (interior points discarded)
4. `computeTopDownSilhouette` returns `null` for empty scene (no meshes)
5. `getCachedSilhouette` synchronous hit returns cached polygon
6. `getCachedSilhouette` cache miss returns undefined + invokes onReady when done

**Component / integration (vitest):**
- Skip — silhouette rendering is in fabricSync.ts which is tested via e2e

**E2E (Playwright):**
7. Place a GLTF product in 2D → assert `fabric.Polygon` is in the rendering tree (via test driver)
8. Place an image-only product → assert `fabric.Rect` is in the rendering tree (regression check)
9. Resize a GLTF product via Phase 31 edge handle → silhouette scales correctly
10. Phase 53 right-click + Phase 54 click-to-select still work on silhouette

### D-10 — Test fixture reuse

Reuse `tests/e2e/fixtures/box.glb` from Phase 56 (Khronos Box.glb, 1664 bytes). For unit tests of `computeTopDownSilhouette`, build a synthetic `THREE.Group` with a single `BoxGeometry` mesh — no GLTF parse needed.

### D-11 — Atomic commits per task

Mirror Phase 49–56 pattern.

### D-12 — Zero regressions

- Image-only products continue to render as `fabric.Rect` + FabricImage exactly as before
- Phase 31 size-override still works on GLTF silhouette products
- Phase 47 displayMode (NORMAL/SOLO/EXPLODE) — irrelevant to 2D
- Phase 48 saved-camera works on GLTF products in 2D
- Phase 53 right-click + Phase 54 click-to-select work on silhouette polygons (Fabric click-target works for polygons)
- Phase 56 3D rendering untouched (this phase only touches 2D)
- 6 pre-existing vitest failures unchanged

## Out of scope (this phase — covered in later v1.14 phases)

- Library UI Box-icon indicator (Phase 58)
- Auto-thumbnail (Phase 58)
- Cross-viewport integration verification (Phase 58)

## Out of scope (this milestone — confirmed v1.14 locks)

- OBJ format
- GLTF animations
- Alpha shapes / concave silhouettes (convex hull suffices)
- IDB-persisted silhouette cache (in-memory only)
- Top-down silhouette rendering with shadow/AO (just polygon)
- Decimation of vertex sets (full geometry walk)

## Files we expect to touch

- `src/lib/gltfSilhouette.ts` — NEW (~80 lines): `computeTopDownSilhouette` + `getCachedSilhouette`
- `src/canvas/fabricSync.ts` — branch in product-rendering path: gltfId → polygon, else → existing rect+image
- `tests/lib/gltfSilhouette.test.ts` — NEW (6 unit tests)
- `e2e/gltf-render-2d.spec.ts` — NEW (4 e2e scenarios)
- `src/test-utils/gltfDrivers.ts` — possibly extend with `__getProductRenderShape(productId)` driver to assert polygon vs rect

Estimated 1 plan, 3-4 tasks, ~5 files. Smaller than Phase 56.

## Open questions for research phase

1. **GLTFLoader without React/drei:** the silhouette compute happens outside the React tree (in fabricSync, plain Fabric code). Need to load GLTF directly via `THREE.GLTFLoader.parseAsync(arrayBuffer)`. Confirm the API + error paths.
2. **World-transform application:** when traversing scene meshes, do we need `mesh.matrixWorld` applied to vertex positions? (Yes — GLTF authors can set node transforms.) Confirm three.js API.
3. **Convex hull library availability:** is there an existing dep we can use (three's `examples/jsm/math/ConvexHull.js`?) vs writing our own monotone chain?
4. **Fabric polygon click-target:** does `fabric.Polygon` work as a click target for Phase 53/54 wiring (the existing `data.placedProductId`-based dispatch in FabricCanvas)?
5. **Render-shape test driver:** how does the e2e assert "is it a polygon vs a rect"? Recommend: extend `__getProductRenderShape(productId)` driver returning `"polygon" | "rect"`.
