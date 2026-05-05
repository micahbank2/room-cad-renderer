# Requirements — v1.14 Real 3D Models

The biggest single user-visible win the platform has ever shipped. Continues phase numbering from 54 → starts at 55.

## Active Requirements

### GLTF / 3D Model Pipeline

- [x] **GLTF-UPLOAD-01** — User can upload a `.gltf` or `.glb` file via the existing product upload flow. The file is validated (size cap, format), stored in IndexedDB with SHA-256 dedup (mirrors Phase 32 LIB-08 user-texture pattern), and the resulting `gltfId` is attached to the product. Source: [#29](https://github.com/micahbank2/room-cad-renderer/issues/29).
  - **Verifiable:** Open AddProductModal. File picker accepts `.gltf` and `.glb` extensions. Drop a 5MB GLTF → product is created with `gltfId` set. Drop a 30MB GLTF → upload rejected with size-cap error message. Drop two identical GLTFs (same SHA-256) → second one references the first's IDB entry (single storage). Existing image-only products continue to work unchanged.
  - **Acceptance:** New `src/lib/gltfStore.ts` IDB layer mirroring `userTextureStore.ts` (`saveGltf`, `getGltf`, `saveGltfWithDedup`, `findGltfBySha256`, `userTextureIdbStore` analog). New optional `gltfId?: string` field on `Product` type. AddProductModal extended to accept `.gltf` / `.glb` MIME types + 25MB cap. No regression on image-only products. Snapshot serialization preserves `gltfId`; loadSnapshot async path (Phase 51) untouched.
  - **Hypothesis to test:** SHA-256 dedup pattern from Phase 32 should port directly. drei `useGLTF` accepts blob URLs. Validate during research.

- [x] **GLTF-RENDER-3D-01** — Products with `gltfId` render as the actual GLTF model in 3D, not a textured box. Loading state shows a spinner; load failure falls back to bbox box.
  - **Verifiable:** Place a product with a GLTF model. Switch to 3D. The model renders with its embedded PBR materials. Position, rotation, sizeScale all apply correctly. Mid-load spinner appears for ~100ms. Force-fail the load (corrupt file) → product renders as bbox fallback with no console errors that block render.
  - **Acceptance:** `ProductMesh.tsx` branches on `product.gltfId`: GLTF → use drei `useGLTF(blobUrl)` → render `<primitive object={scene}>`; image → existing textured box. Position / rotation / Phase 31 sizeScale applied to the GLTF root group via standard transform props. Suspense boundary for the async load. ErrorBoundary fallback to bbox box on failure. Phase 53 right-click + Phase 54 left-click handlers attach to a wrapping `<group>` so they work on the GLTF model.
  - **Hypothesis to test:** drei `useGLTF` is Suspense-friendly and works with ObjectURL paths. Confirm during research.

- [x] **GLTF-RENDER-2D-01** — Products with GLTF models render a top-down silhouette in 2D, not a textured rectangle.
  - **Verifiable:** A GLTF chair placed in 2D shows a chair-shaped outline (not a rectangle). Image-only products continue to show the textured rectangle. Switching between products with and without GLTF works without visual glitches.
  - **Acceptance:** New `src/lib/gltfSilhouette.ts` computes a 2D top-down silhouette by projecting GLTF geometry onto the XY plane and computing the convex hull (or alpha shape). Cached per `gltfId` in memory. Fabric renders the silhouette as a `fabric.Polygon` path instead of `fabric.Rect`. Fall back to bbox rectangle if silhouette compute fails. No regression on image-only products.
  - **Hypothesis to test:** Three.js can compute geometry projections via `BufferGeometry`. Need to confirm the convex-hull library available (or compute inline).

### Integration

- [x] **GLTF-INTEGRATION-01** — Existing systems work correctly with GLTF products: Phase 31 size-override scales the model; Phase 48 saved-camera works; Phase 53 right-click menus open; Phase 54 click-to-select works. Library UI shows a small indicator that a product is GLTF-backed AND auto-renders a thumbnail when no image was uploaded.
  - **Verifiable:** Place a GLTF product. Drag the size-override edge handle → 3D model scales (group transform); 2D silhouette also scales. Save a camera angle on the GLTF product → tree gets Camera icon. Double-click the tree row → camera focuses. Right-click the GLTF mesh in 3D → context menu opens with all 6 product actions. Library list shows a small lucide `Box` icon next to GLTF-backed products. Library card for a GLTF-only product (no image uploaded) shows a rendered thumbnail of the model instead of a blank card.
  - **Acceptance:** No new code needed for size-override / saved-camera / context menus / click-to-select if they already wire on the wrapping `<group>` (verify during research). Library indicator is a 12px lucide icon next to the product name. **Auto-thumbnail (added 2026-04-29 from Phase 55 UAT feedback):** when a Product has `gltfId` but `imageUrl` is empty/placeholder, render a 256×256 thumbnail offscreen from the GLTF (mirror Phase 45 swatch-thumbnail-generator pattern) and use that as the library card image. Cache by gltfId. No regressions on image-only products.

## Out of Scope (this milestone)

| Item | Reason |
|------|--------|
| OBJ format support | Older format, separate codepath; defer to v1.15+ if demand |
| GLTF animations | Furniture rarely animated; static rendering sufficient |
| Custom material overrides on GLTF | Use embedded PBR; override is speculative |
| Walls/ceilings/custom-elements as GLTF | Parametric primitives; GLTF unnecessary |
| LOD / progressive loading | Premature optimization; 25MB cap keeps load times reasonable |
| Cloud-hosted GLTF library | Storage scope expansion; v2.0+ territory |
| Animation editing UI | Not applicable (no animations) |
| GLTF generation / 3D modeling tools | Out of scope (we're a viewer/placer, not a modeler) |
| Phase 999.4 EXPLODE+saved-camera offset | Carry-over from v1.11; narrow trigger; revisit later |
| Phase 999.1 ceiling resize handles | Re-deferred from v1.9 |
| Phase 999.3 per-surface tile-size override | Re-deferred from v1.9 |
| R3F v9 / React 19 upgrade ([#56](https://github.com/micahbank2/room-cad-renderer/issues/56)) | Gated on R3F v9 stability |

## Validated Requirements (Earlier Milestones)

See `.planning/milestones/v1.0-REQUIREMENTS.md` through `.planning/milestones/v1.13-REQUIREMENTS.md`. All v1.0–v1.13 requirements shipped or formally deferred to backlog.

## Traceability

| Requirement | Phase | Plans |
|-------------|-------|-------|
| GLTF-UPLOAD-01 | Phase 55 | TBD |
| GLTF-RENDER-3D-01 | Phase 56 | TBD |
| GLTF-RENDER-2D-01 | Phase 57 | 57-01-SUMMARY.md |
| GLTF-INTEGRATION-01 | Phase 58 | TBD |

---

*Last updated: 2026-04-29*
