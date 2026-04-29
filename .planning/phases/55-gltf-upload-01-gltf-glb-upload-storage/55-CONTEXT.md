---
phase: 55-gltf-upload-01-gltf-glb-upload-storage
type: context
created: 2026-04-29
status: ready-for-research
requirements: [GLTF-UPLOAD-01]
depends_on: [Phase 32 LIB-08 user-texture IDB pipeline (saveUserTextureWithDedup, computeSHA256), Phase 51 async loadSnapshot (gltfId is part of the snapshot)]
---

# Phase 55: GLTF/GLB Upload + IDB Storage (GLTF-UPLOAD-01) — Context

## Goal

User uploads a `.gltf` or `.glb` file via the existing AddProductModal. File is validated (extension + 25MB cap), stored in IndexedDB with SHA-256 dedup, and the resulting `gltfId` attaches to the new Product. Phase 56 wires rendering against this id. Source: [GH #29](https://github.com/micahbank2/room-cad-renderer/issues/29).

## Pre-existing infrastructure

- `src/lib/userTextureStore.ts` (Phase 32 LIB-08): full pattern reference. Exports `userTextureIdbStore` keystore, `computeSHA256`, `saveUserTexture`, `getUserTexture`, `deleteUserTexture`, `listUserTextures`, `findTextureBySha256`, `saveUserTextureWithDedup`. Phase 55 mirrors this exactly.
- `src/types/product.ts`: `Product.modelUrl?: string` exists from v1.0 with comment `.glb/.obj blob URL` — never wired. Repurpose: keep field as legacy/deprecated, add new `gltfId?: string` for IDB-backed reference.
- `src/components/AddProductModal.tsx`: existing image upload via FileReader + drag-drop. Phase 55 extends it with a second file input for GLTF.
- Snapshot format already at v3 (Phase 51 DEBT-05 migration). New optional fields are forward-compatible — no version bump.

## Decisions

### D-01 — Add new `gltfId` field; deprecate `modelUrl`

`Product.gltfId?: string` references an IDB entry in a new `room-cad-gltf-models` keystore. Mirror Phase 32 LIB-08 `userTextureId` pattern.

`Product.modelUrl?: string` (existing, unwired since v1.0) gets a JSDoc `@deprecated` annotation noting "use gltfId instead." Field stays in the type for snapshot backwards-compatibility (any old snapshots that happened to set it still load).

**Why new field:** `modelUrl` semantically meant "blob URL" which doesn't survive snapshot reload. `gltfId` references a stable IDB entry. Adding a new field is cleaner than overloading the existing one with new semantics.

### D-02 — AddProductModal: image AND optional GLTF (both fields)

The product upload form has TWO file inputs:
1. **Image** (existing, required) — used for library thumbnail
2. **3D model** (NEW, optional) — accepts `.gltf` / `.glb`; if provided, the product renders as the GLTF model in 3D (Phase 56)

Image-only products continue to work unchanged. Future enhancement (separate phase) could auto-render thumbnails from GLTF.

**Why both:** Library list view still needs a 2D thumbnail (drei `useGLTF` is async; an instant thumbnail is faster than a render). GLTF is opt-in for users who have a real 3D model.

### D-03 — Upload validation: extension + size cap only

Validate:
- Extension is `.gltf` OR `.glb` (case-insensitive)
- File size ≤ 25 MB (matches CONTEXT scope lock)

DO NOT parse the file at upload time. drei `useGLTF` in Phase 56 will throw on invalid files; Phase 56's ErrorBoundary catches and falls back to bbox box.

**Why minimal upload validation:** Parse-validation requires loading three.js GLTFLoader at upload time. That's heavy code on the upload path that runs once per upload. Defer to render path where it runs once per session per model and the cache amortizes the cost.

### D-04 — IDB schema (locked)

New file `src/lib/gltfStore.ts` exporting (mirroring `userTextureStore.ts`):

```typescript
import { createStore, set, get, del, values } from "idb-keyval";

export const gltfIdbStore = createStore("room-cad-gltf-models", "models");

export interface GltfModel {
  id: string;          // gltf_<8 chars random>
  blob: Blob;          // raw file content
  sha256: string;      // hex string
  name: string;        // original filename
  sizeBytes: number;   // file size at upload time
  uploadedAt: string;  // ISO timestamp
}

export async function saveGltf(model: GltfModel): Promise<void>;
export async function getGltf(id: string): Promise<GltfModel | undefined>;
export async function deleteGltf(id: string): Promise<void>;
export async function listGltfs(): Promise<GltfModel[]>;
export async function findGltfBySha256(sha256: string): Promise<GltfModel | undefined>;
export async function saveGltfWithDedup(input: { blob: Blob; name: string }): Promise<{ id: string; deduped: boolean }>;
```

`computeSHA256` is reused from `src/lib/userTextureStore.ts` (no duplication).

### D-05 — Snapshot serialization

`gltfId` is JSON-friendly (string). Snapshots already at v3. Adding optional fields is forward-compatible. Phase 51 async `loadSnapshot` flow handles undefined fields gracefully via shape contracts.

**No migration needed.** Phase 51's migration system can still handle a future `v3 → v4` if `gltfId` ever needs schema change, but for now: just add the field.

### D-06 — Test coverage

**Unit (vitest):**
1. `gltfStore.saveGltf` round-trip (write + read returns same blob bytes)
2. `gltfStore.findGltfBySha256` returns existing entry
3. `gltfStore.saveGltfWithDedup` returns existing id when SHA-256 matches (deduped: true)
4. `gltfStore.saveGltfWithDedup` creates new id when SHA-256 differs (deduped: false)
5. `gltfStore.listGltfs` returns all entries

**Component (vitest + RTL):**
6. AddProductModal accepts `.gltf` and `.glb` files via the new model input
7. AddProductModal rejects 30MB file with size-cap error
8. AddProductModal submission with model file → product has `gltfId` set in store

**E2E (Playwright):**
9. Upload a small GLTF via the modal → product appears in library → assertion that `productStore` has the new product with `gltfId` set + IDB has the blob

### D-07 — Test driver

Add `__driveUploadGltf(blob, name)` to `src/test-utils/userTextureDrivers.ts` (or new `gltfDrivers.ts`). Gated by `import.meta.env.MODE === "test"`. Returns the new product id with attached gltfId.

Mirrors Phase 49 driver pattern — bypasses the modal UI for e2e by directly calling `saveGltfWithDedup` + `productStore.add`.

### D-08 — Atomic commits per task

One commit per logical change. Mirror Phase 49–54 pattern.

### D-09 — Zero regressions

- Image-only products continue to work unchanged
- Phase 32 LIB-08 user-texture pipeline untouched
- Phase 51 async loadSnapshot still works
- Phase 53 right-click + Phase 54 click-to-select unaffected
- 6 pre-existing vitest failures unchanged

## Out of scope (this phase — covered in later v1.14 phases)

- 3D rendering of GLTF models (Phase 56)
- 2D top-down silhouette (Phase 57)
- Library UI indicator that a product is GLTF-backed (Phase 58)
- Drei `useGLTF` integration (Phase 56)
- ErrorBoundary fallback for failed GLTF loads (Phase 56)

## Out of scope (this milestone — confirmed v1.14 locks)

- OBJ format
- GLTF animations
- Custom material overrides on GLTF
- Walls/ceilings/custom-elements as GLTF
- LOD / progressive loading
- Cloud-hosted GLTF library

## Files we expect to touch

- `src/lib/gltfStore.ts` — NEW IDB layer (~120 lines, mirrors userTextureStore.ts)
- `src/types/product.ts` — add `gltfId?: string`; mark `modelUrl` `@deprecated`
- `src/components/AddProductModal.tsx` — add second file input + size-cap validation + on-submit dedup save
- `src/test-utils/gltfDrivers.ts` — NEW test driver (or extend `userTextureDrivers.ts`)
- `src/main.tsx` — install gltf drivers (if separate file)
- New: `tests/lib/gltfStore.test.ts` — 5 unit tests
- New: `tests/components/AddProductModal.gltf.test.tsx` — 3 component tests
- New: `e2e/gltf-upload.spec.ts` — 1 e2e scenario

Estimated 1 plan, 4 tasks, ~8 files touched. Mid-size phase.

## Open questions for research phase

1. **Drei `useGLTF` blob-URL acceptance:** Confirm `useGLTF(URL.createObjectURL(blob))` works correctly. If not, Phase 56's design needs to change.
2. **`computeSHA256` reuse:** confirm it accepts ArrayBuffer/Blob (not just typed arrays); if not, propose a small wrapper.
3. **AddProductModal layout:** does adding a second file input fit in the existing modal width? (Cosmetic — research recommends, planner sizes.)
4. **GLTF MIME type detection:** browsers may report `.gltf` as `text/plain` and `.glb` as `application/octet-stream`. Recommend whether to check MIME or just extension.
5. **Cross-product GLTF dedup behavior:** if 3 products upload the same model file, all 3 should reference the same IDB entry via SHA-256. Confirm `saveGltfWithDedup` handles this correctly per Phase 32 LIB-08 precedent.
