---
phase: 56-gltf-render-3d-01-render-gltf-in-3d
type: context
created: 2026-04-29
status: ready-for-research
requirements: [GLTF-RENDER-3D-01]
depends_on: [Phase 55 GLTF-UPLOAD-01 (gltfStore IDB layer + Product.gltfId field), Phase 31 size override pattern, Phase 32 PBR pipeline (sets the visual baseline), Phase 53 right-click + Phase 54 click-to-select on wrapping group]
---

# Phase 56: Render GLTF in 3D (GLTF-RENDER-3D-01) — Context

## Goal

Products with `gltfId` render as the actual GLTF model in 3D, not a textured box. Phase 55 stored the file; Phase 56 renders it. **The magic moment of v1.14** — Jessica uploads a real chair and sees a real chair.

## Pre-existing infrastructure

- **Phase 55** `src/lib/gltfStore.ts`: `getGltf(id)` returns `{ blob, ... }` from IDB
- **Drei** `@react-three/drei@9.122` (in `package.json`): supports `useGLTF(path)` Suspense-friendly hook
- **`src/three/ProductMesh.tsx`**: current implementation — `<mesh>` + `<boxGeometry>` + textured material; Phase 31 dims via `resolveEffectiveDims`; Phase 53 right-click + Phase 54 click-to-select wired on the mesh root
- **`src/three/productTextureCache.ts`**: existing pattern for image-texture loading; gltf cache will mirror this shape

## Decisions

### D-01 — `useGltfBlobUrl(gltfId)` hook for blob → ObjectURL lifecycle

New file `src/hooks/useGltfBlobUrl.ts`. Hook:
1. Fetches blob from IDB on mount via `getGltf(gltfId)`
2. Creates ObjectURL via `URL.createObjectURL(blob)`
3. Caches by gltfId in a module-level Map (multiple products with same gltfId share one URL)
4. Returns `{ url: string | null, error: Error | null, loading: boolean }`
5. Revokes URL on full unmount (last referencing component) — ref-counted

**Why ref-counted cache:** if 3 products use the same gltfId, all 3 mount → one ObjectURL. When all 3 unmount → revoke. Avoids per-render leaks AND avoids over-eager revoke.

### D-02 — Auto-scale GLTF to user-specified bbox (Option B)

Compute GLTF model's bounding box after load via `new THREE.Box3().setFromObject(scene)`. Compute uniform scale factor that fits the model into `width × depth × height` (user-specified Product dims, with Phase 31 sizeScale + width/depthFtOverride applied via `resolveEffectiveDims`).

Use the **smallest of three** scale factors (`width/bboxX`, `height/bboxY`, `depth/bboxZ`) to maintain aspect ratio without distortion. Apply as `<group scale={uniformScale}>`.

**Why auto-scale:** GLTF authors use arbitrary scales (mm, cm, m). Without auto-scale, "chair.glb" might be 1mm or 1km. Auto-scaling to user's specified bbox makes Product dimensions the source of truth (matches existing image-only product behavior).

**Trade-off accepted:** non-uniform Products (e.g. `12×24×36 in`) will have whitespace on the smaller axis. Acceptable — Jessica can resize via Phase 31 handles to tune the fit.

### D-03 — Vertical centering: bottom-of-bbox on floor

After auto-scale, compute the scaled bbox. Translate the GLTF group so `bbox.min.y === 0` (model sits on floor at Y=0).

This matches the existing box behavior: `<mesh position={[x, height/2, z]}>` with a centered box puts the bottom on the floor at Y=0. GLTF gets the same alignment.

```typescript
const bbox = new THREE.Box3().setFromObject(scaledScene);
const yOffset = -bbox.min.y; // shift so min.y → 0
<group position={[x, yOffset, z]}>...</group>
```

### D-04 — Loading state: existing textured box as Suspense fallback

`<Suspense fallback={<TexturedBox ... />}>` wraps the GLTF render path. The fallback is the same `<mesh>` + `<boxGeometry>` + texture used by image-only products — extracted into a small `<ProductBox>` sub-component for reuse.

**Why fallback to box:** user already understands what a textured box means. Loading state is brief (drei caches GLTF after first load). No new "spinner" UI to design or test.

### D-05 — Error state: same fallback as loading

ErrorBoundary inside `<ProductMesh>` catches drei `useGLTF` failures. `fallback={<ProductBox ... />}` — identical to the loading fallback.

**Why same fallback:** consistent UX. Whether GLTF is loading, broken, or missing, user sees the textured box. Console error logs the cause. Simpler than designing a separate error indicator.

### D-06 — Selection highlight via outline `<lineSegments>` overlay

When `isSelected === true` AND product has GLTF, render a `<lineSegments>` overlay at the same position/scale showing the model's edges in accent color (`#7c5bf0` per Phase 33). Uses `THREE.EdgesGeometry(scene)` to extract edges.

```tsx
{isSelected && (
  <lineSegments scale={uniformScale} position={[x, yOffset, z]}>
    <edgesGeometry args={[geometry]} />
    <lineBasicMaterial color="#7c5bf0" linewidth={2} />
  </lineSegments>
)}
```

**Why outline overlay:** preserves GLTF's authored PBR materials (don't override `color` on a `<meshStandardMaterial>` we don't own). Outline is universally readable as "selected" across furniture types.

### D-07 — `<group>` wrapping for click handlers

Phase 53 right-click and Phase 54 left-click handlers attach to the root component currently. Wrap the entire GLTF + outline + position/rotation in a single `<group>` so handlers attach there:

```tsx
<group
  position={[x, yOffset, z]}
  rotation={[0, rotY, 0]}
  onPointerDown={handlePointerDown}
  onPointerUp={handlePointerUp}
  onContextMenu={handleContextMenu}
>
  <primitive object={scaledScene} />
  {isSelected && <SelectionOutline />}
</group>
```

**Why `<group>`:** click-to-select and right-click work without per-mesh wiring inside the GLTF model tree.

### D-08 — Branching logic in ProductMesh

Pseudocode:
```tsx
if (product?.gltfId) {
  return (
    <Suspense fallback={<ProductBox {...} />}>
      <ErrorBoundary fallback={<ProductBox {...} />}>
        <GltfProduct {...} />
      </ErrorBoundary>
    </Suspense>
  );
}
return <ProductBox {...} />;
```

Both paths share the same outer wrapper for click/context handlers.

### D-09 — Test coverage

**Unit tests (vitest):**
1. `useGltfBlobUrl` returns `{ url: null, loading: true }` initially when gltfId is provided
2. `useGltfBlobUrl` returns `{ url: <blob:...>, loading: false }` after fetch resolves
3. `useGltfBlobUrl` returns `{ url: null, error: Error }` when getGltf throws
4. Multiple consumers of same gltfId share one ObjectURL (ref-counting)
5. Last unmount revokes the URL

**Component tests (vitest + RTL):**
6. ProductMesh renders ProductBox when product has no gltfId
7. ProductMesh renders ProductBox (loading fallback) when gltfId present but URL not yet resolved
8. ProductMesh renders ProductBox (error fallback) when ErrorBoundary catches

**E2E (Playwright):**
9. Upload Box.glb (tiny Khronos sample), place product, switch to 3D → product renders (assert via canvas snapshot or DOM-introspection driver)
10. Phase 31 edge resize on GLTF product → bbox scales correctly (driver assertion)
11. Phase 53 right-click on GLTF product → context menu opens
12. Phase 54 click-to-select on GLTF product → selectedIds updates

### D-10 — Test fixtures

**For unit tests:** synthetic Blob (no parse needed; useGltfBlobUrl is the unit under test, not GLTFLoader).

**For e2e:** Khronos sample `Box.glb` (~3KB) embedded in `tests/e2e/fixtures/box.glb`. Real, valid, tiny — tests the full drei `useGLTF` path.

**Test driver extension:** `__driveUploadGltf` (Phase 55) already exists. Returns the new product id with gltfId. E2E uses this to seed scene faster than the modal UI.

### D-11 — Atomic commits per task

Mirror Phase 49–55 pattern. One commit per logical change.

### D-12 — Zero regressions

- Image-only products continue to render exactly as before (existing `<mesh>` + `<boxGeometry>` path)
- Phase 31 size-override edge handles work on GLTF products
- Phase 32 PBR pipeline untouched (no changes to texture cache, materials, or wall/floor/ceiling rendering)
- Phase 47 displayMode (NORMAL/SOLO/EXPLODE) — RoomGroup still receives the GLTF product as its child
- Phase 48 saved-camera works on GLTF products
- Phase 53 right-click + Phase 54 click-to-select work via wrapping `<group>`
- 6 pre-existing vitest failures unchanged

## Out of scope (this phase — covered in later v1.14 phases)

- 2D top-down silhouette rendering (Phase 57)
- Library UI indicator + auto-thumbnail (Phase 58)
- Cross-viewport integration verification (Phase 58)

## Out of scope (this milestone — confirmed v1.14 locks)

- OBJ format
- GLTF animations
- Custom material overrides on GLTF
- Multiple GLTFs per product (single model only)
- Drag-to-place from a 3D preview
- Shadow casting on GLTF (use whatever drei `useGLTF` defaults to; don't tune)

## Files we expect to touch

- `src/hooks/useGltfBlobUrl.ts` — NEW (~80 lines)
- `src/three/ProductMesh.tsx` — MAJOR REFACTOR: branch on gltfId; extract ProductBox sub-component; add GltfProduct sub-component; wrap in group
- `src/three/GltfProduct.tsx` — NEW sub-component (~80 lines): drei useGLTF + auto-scale + Y-offset + outline overlay
- `src/three/ProductBox.tsx` — NEW sub-component (extracted from ProductMesh): existing box rendering
- `tests/hooks/useGltfBlobUrl.test.ts` — NEW (5 unit tests)
- `tests/components/ProductMesh.gltf.test.tsx` — NEW (3 component tests)
- `tests/e2e/fixtures/box.glb` — NEW (Khronos Box.glb)
- `e2e/gltf-render-3d.spec.ts` — NEW (4 e2e scenarios)

Estimated 1 plan, 4-5 tasks, ~10 files. Mid-size phase.

## Open questions for research phase

1. **Drei `useGLTF` blob-URL behavior:** Phase 55 research validated this MEDIUM-confidence. Confirm with a quick code-read of drei sources (or @react-three/drei docs). Does `useGLTF("blob:http://...")` work? If not, propose direct `THREE.GLTFLoader().loadAsync()` + `<primitive>` instead.

2. **Auto-scale algorithm:** is there a cleaner way than three `Box3.setFromObject` + manual scale factor compute? E.g. drei's `useBounds()` hook, three's `Box3.getSize()`. Recommend the simplest approach.

3. **EdgesGeometry on a `<primitive object>`:** can we extract a single `EdgesGeometry` from an entire GLTF scene tree? Or do we need per-mesh edges? Phase 56 research should propose; if too complex, fall back to BoxHelper around the bbox.

4. **drei's GLTF cache:** does drei dispose of cached models when no longer used, or keep them resident? Affects D-01 ref-counting design — if drei caches separately, our ObjectURL revoke is more important.

5. **Phase 47 RoomGroup integration:** does the GLTF render correctly when offset by RoomGroup's `position={[offsetX, 0, 0]}` in EXPLODE mode? Our position is relative to the room; the group offset stacks. Should just work but verify.
