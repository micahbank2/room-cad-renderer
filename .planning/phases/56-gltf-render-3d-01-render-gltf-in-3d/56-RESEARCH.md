---
phase: 56-gltf-render-3d-01-render-gltf-in-3d
type: research
created: 2026-05-04
domain: drei useGLTF / THREE.Box3 / ObjectURL lifecycle / R3F event propagation
confidence: HIGH
requirements: [GLTF-RENDER-3D-01]
---

# Phase 56: Render GLTF in 3D (GLTF-RENDER-3D-01) — Research

**Researched:** 2026-05-04
**Domain:** drei useGLTF blob-URL, ref-counted ObjectURL cache, THREE.Box3 auto-scale, EdgesGeometry on GLTF tree, Suspense + ErrorBoundary in R3F, R3F group event propagation
**Confidence:** HIGH — all findings from direct source reads of installed node_modules

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** — `useGltfBlobUrl(gltfId)` hook: fetch blob from IDB on mount, create ObjectURL, module-level ref-counted Map cache, return `{ url, error, loading }`, revoke only when refCount hits 0 on unmount
- **D-02** — Auto-scale GLTF to user bbox: `new THREE.Box3().setFromObject(scene)`, uniform scale = `Math.min(w/x, h/y, d/z)`, applied as `<group scale={uniformScale}>`
- **D-03** — Vertical centering: `yOffset = -bbox.min.y` so bbox.min.y === 0 (model sits on floor)
- **D-04** — Loading fallback: existing textured box (`<ProductBox>`) wrapped in `<Suspense fallback={<ProductBox />}>`
- **D-05** — Error fallback: same `<ProductBox>` via ErrorBoundary; console.error logs cause
- **D-06** — Selection highlight: `<lineSegments>` overlay in accent color `#7c5bf0`; `THREE.EdgesGeometry` per-mesh from GLTF tree (see §4 below for recommendation to use bbox wireframe instead)
- **D-07** — `<group>` wraps entire GLTF + outline; click/context handlers on group
- **D-08** — ProductMesh branches: `product?.gltfId` → GLTF path; else → ProductBox
- **D-09** — 5 unit + 3 component + 4 e2e tests (exact list in CONTEXT.md)
- **D-10** — Test fixtures: synthetic Blob for unit; `tests/e2e/fixtures/box.glb` for e2e
- **D-11** — Atomic commits per task
- **D-12** — Zero regressions on image-only products, Phase 31 overrides, Phase 32 PBR, Phase 47 RoomGroup, Phase 48 saved-camera, Phase 53 right-click, Phase 54 click-to-select

### Claude's Discretion

None specified — all decisions locked in CONTEXT.md.

### Deferred Ideas (OUT OF SCOPE)

- 2D top-down silhouette rendering (Phase 57)
- Library UI indicator + auto-thumbnail (Phase 58)
- OBJ format, GLTF animations, custom material overrides, LOD, cloud GLTF library
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GLTF-RENDER-3D-01 | Products with gltfId render as actual GLTF model in 3D. Loading shows textured-box fallback; failure falls back to bbox box. Position/rotation/Phase-31 sizeScale apply. Phase 53 right-click + Phase 54 click-to-select work via wrapping group. | §1 blob-URL, §2 hook design, §3 auto-scale, §4 outline, §5 Suspense+EB, §6 event propagation |
</phase_requirements>

---

## Summary

Phase 56 is the render counterpart to Phase 55's upload. The infrastructure is all in place: `gltfStore.ts` returns a `Blob`, `ProductMesh.tsx` is a 59-line file with a single `<mesh>`, and `react-error-boundary@6.1.1` is already installed as a production dependency. The drei `useGLTF` chain (Gltf.js:26) delegates entirely to R3F's `useLoader`, which calls `loader.load(url, ...)` with whatever string is passed — blob URLs are first-class (they are HTTP-fetchable by the browser). The entire implementation reduces to:

1. A `useGltfBlobUrl` hook that wraps IDB → ObjectURL lifecycle with ref-counting
2. A `GltfProduct` component that calls `useGLTF(url)`, auto-scales the scene, aligns to floor
3. A `ProductBox` extracted sub-component (the current mesh, unchanged)
4. A `ProductMesh` refactor that branches on `product.gltfId` and wraps in `<group>` for event handlers

No new npm dependencies are needed. `react-error-boundary` (`package.json:39`) is already installed; `THREE.Box3` and `THREE.EdgesGeometry` are part of `three@0.183.2` which is already installed.

**Primary recommendation:** Implement exactly as CONTEXT.md specifies. The only open question resolved by research is D-06 selection outline: recommend bbox wireframe over per-mesh EdgesGeometry (see §4).

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `@react-three/drei` | `^9.122.0` | `useGLTF` Suspense hook | `package.json:29` |
| `@react-three/fiber` | `^8.17.14` | `useLoader` + R3F event system | `package.json:30` |
| `three` | `^0.183.2` | `THREE.Box3`, `THREE.EdgesGeometry`, `THREE.LineSegments` | `package.json:43` |
| `react-error-boundary` | `^6.1.1` | `ErrorBoundary` component | `package.json:39` |

**No new installs required.**

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
src/
  hooks/
    useGltfBlobUrl.ts          # NEW — IDB → ObjectURL with ref-counted cache
  three/
    ProductBox.tsx             # NEW — extracted from ProductMesh (existing box mesh)
    GltfProduct.tsx            # NEW — drei useGLTF + auto-scale + floor-align + outline
    ProductMesh.tsx            # MAJOR REFACTOR — branch on gltfId, wrap in <group>
tests/
  hooks/
    useGltfBlobUrl.test.ts     # NEW — 5 unit tests
  components/
    ProductMesh.gltf.test.tsx  # NEW — 3 component tests
  e2e/
    fixtures/
      box.glb                  # NEW — Khronos Box.glb (~3KB)
    gltf-render-3d.spec.ts     # NEW — 4 e2e scenarios
```

---

## §1 — Drei `useGLTF` Blob-URL: HIGH Confidence Verification

**Finding: blob URLs work directly. Confidence: HIGH.**

Source: `node_modules/@react-three/drei/core/Gltf.js:26`

```javascript
const useGLTF = (path, useDraco, useMeshopt, extendLoader) =>
  useLoader(GLTFLoader, path, extensions(...));
```

`useGLTF` passes `path` verbatim to R3F's `useLoader`.

Source: `node_modules/@react-three/fiber/dist/events-0e73ba93.cjs.prod.js:1711`

```javascript
return Promise.all(input.map(input =>
  new Promise((res, reject) =>
    loader.load(input, data => { ... res(data); }, onProgress, reject)
  )
));
```

`loader.load(input, ...)` calls `THREE.GLTFLoader.load(url, ...)`. `GLTFLoader` internally uses `FileLoader` which calls `fetch(url)`. The browser's `fetch()` resolves `blob:http://localhost/...` identically to an HTTP URL — it reads from the local ObjectURL registry. There is no URL-scheme check in the drei or R3F source.

**Recommendation: use `useGLTF(url)` directly where `url` comes from `URL.createObjectURL(blob)`. No workaround needed.**

### drei Cache Behavior

`useGLTF.clear(path)` delegates to `useLoader.clear(GLTFLoader, path)` (Gltf.js:28), which calls `suspend-react`'s `clear([Proto, ...keys])`. The drei cache key IS the URL string. After `URL.revokeObjectURL(url)`, the same url string will never resolve again — so `useGLTF.clear(url)` must be called before revoking the ObjectURL. The ref-counted cache in `useGltfBlobUrl` must call `useGLTF.clear(url)` at revoke time (when refCount hits 0), not before.

**Cache cleanup sequence on last unmount:**
1. `useGLTF.clear(url)` — evict from suspend-react cache
2. `URL.revokeObjectURL(url)` — release browser memory

---

## §2 — `useGltfBlobUrl` Ref-Counted Cache Design

### Module-Level State

```typescript
// src/hooks/useGltfBlobUrl.ts

import { useEffect, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { getGltf } from "@/lib/gltfStore";

interface CacheEntry {
  url: string;
  refCount: number;
  // promise stored so concurrent mount requests share one IDB fetch
  promise: Promise<string>;
}

const cache = new Map<string, CacheEntry>();

function acquireUrl(gltfId: string): Promise<string> {
  const existing = cache.get(gltfId);
  if (existing) {
    existing.refCount++;
    return existing.promise;
  }
  const promise = getGltf(gltfId).then((model) => {
    if (!model) throw new Error(`GLTF not found in IDB: ${gltfId}`);
    const url = URL.createObjectURL(model.blob);
    // Update the entry with the resolved url (refCount already set to 1 below)
    cache.get(gltfId)!.url = url;
    return url;
  });
  cache.set(gltfId, { url: "", refCount: 1, promise });
  return promise;
}

function releaseUrl(gltfId: string): void {
  const entry = cache.get(gltfId);
  if (!entry) return;
  entry.refCount--;
  if (entry.refCount <= 0) {
    cache.delete(gltfId);
    if (entry.url) {
      useGLTF.clear(entry.url);          // evict drei's suspend-react cache first
      URL.revokeObjectURL(entry.url);    // then release browser memory
    }
  }
}

export function useGltfBlobUrl(gltfId: string | undefined): {
  url: string | null;
  error: Error | null;
  loading: boolean;
} {
  const [state, setState] = useState<{
    url: string | null;
    error: Error | null;
    loading: boolean;
  }>({ url: null, error: null, loading: !!gltfId });

  useEffect(() => {
    if (!gltfId) {
      setState({ url: null, error: null, loading: false });
      return;
    }
    let cancelled = false;
    setState({ url: null, error: null, loading: true });

    acquireUrl(gltfId)
      .then((url) => {
        if (!cancelled) setState({ url, error: null, loading: false });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ url: null, error: err, loading: false });
        // Release the ref we acquired (promise failed — blob never created)
        releaseUrl(gltfId);
      });

    return () => {
      cancelled = true;
      releaseUrl(gltfId);
    };
  }, [gltfId]);

  return state;
}
```

### React Strict Mode Safety

In React 18 Strict Mode (dev only), effects run twice: mount → unmount → mount. The ref-counting handles this correctly:

- First mount: `acquireUrl` → refCount = 1
- First unmount (cleanup): `releaseUrl` → refCount = 0 → revoke
- Second mount: `acquireUrl` again → new entry, refCount = 1

This means the URL gets created, revoked, and re-created. The second mount sees a fresh ObjectURL. This is correct behavior — Strict Mode is exercising the cleanup path. The double-create cost is dev-only and acceptable for the tiny IDB blob read.

### Multiple Consumers Sharing One URL

If 3 products in the same room share a gltfId:
- 1st mount: `cache.get(gltfId)` = undefined → new entry, refCount = 1, IDB fetch starts
- 2nd mount: `cache.get(gltfId)` = entry → refCount = 2, returns same promise (IDB fetch in flight)
- 3rd mount: refCount = 3, same promise

All three `await promise` → same URL string. One ObjectURL. Only when all 3 unmount (refCount → 0) is the URL revoked.

**Export `cache` as `__gltfBlobUrlCache` for tests (MODE === "test" gate), analogous to `__clearTextureCache` in `productTextureCache.ts:22`.**

---

## §3 — Auto-Scale Algorithm

**Source: `node_modules/three/src/math/Box3.js:150` (`setFromObject`) and `:231` (`getSize`)**

```typescript
// Inside GltfProduct component, after useGLTF resolves:
import * as THREE from "three";

const { scene } = useGLTF(url);

// Step 1: measure the model as-loaded (arbitrary author units)
const bbox = useMemo(() => {
  const b = new THREE.Box3().setFromObject(scene);
  return b;
}, [scene]);

const modelSize = useMemo(() => {
  const s = new THREE.Vector3();
  bbox.getSize(s);   // Box3.getSize(target) — three/src/math/Box3.js:231
  return s;
}, [bbox]);

// Step 2: target dimensions from resolveEffectiveDims (Phase 31)
// width = X axis, depth = Z axis, height = Y axis
const uniformScale = useMemo(() => {
  if (modelSize.x === 0 || modelSize.y === 0 || modelSize.z === 0) return 1;
  return Math.min(
    width  / modelSize.x,   // target width / model X extent
    height / modelSize.y,   // target height / model Y extent
    depth  / modelSize.z,   // target depth / model Z extent
  );
}, [modelSize, width, height, depth]);

// Step 3: Y offset — after scale, shift so bbox.min.y === 0
const yOffset = useMemo(() => {
  const scaledMinY = bbox.min.y * uniformScale;
  return -scaledMinY;
}, [bbox, uniformScale]);
```

**Edge cases:**
- **Zero-size axis** (e.g., a flat plane with Y extent = 0): guard with `if (modelSize.y === 0) skip that axis`. Use `Math.min` over only the non-zero axes. Implementation: filter before `Math.min`.
- **Missing geometry** (empty GLTF with no meshes): `Box3.setFromObject` on an empty group yields `Box3 { min: Infinity, max: -Infinity }` (empty box). `getSize` returns `Vector3(0,0,0)`. The zero-size guard catches this; fallback scale = 1.
- **Placeholder product** (`isPlaceholder = true` from `resolveEffectiveDims`): `width/depth/height` = 2ft each (PLACEHOLDER_DIM_FT). Auto-scale still works; model is scaled to 2×2×2 ft.

---

## §4 — Selection Outline: Bbox Wireframe (Recommended over Per-Mesh EdgesGeometry)

### The Problem with Per-Mesh EdgesGeometry

`THREE.EdgesGeometry(geometry)` takes a single `BufferGeometry`. A GLTF scene is a tree of `THREE.Mesh` nodes, each with its own geometry. To use EdgesGeometry on the whole model you'd need to traverse the scene, extract each mesh's geometry, compute EdgesGeometry per mesh, and render a `<lineSegments>` per mesh. For a chair model with 20+ meshes this creates 20+ separate draw calls for the outline alone.

### Recommended: Box3 Wireframe (Bbox outline)

A single `BoxHelper` or manually-constructed `LineSegments` around the computed bounding box:

```tsx
// SelectionOutline sub-component inside GltfProduct.tsx
// Rendered only when isSelected === true

import * as THREE from "three";

function SelectionOutline({
  bbox,
  uniformScale,
}: {
  bbox: THREE.Box3;
  uniformScale: number;
}) {
  const geometry = useMemo(() => {
    // Scale the bbox to match the rendered model
    const scaledMin = bbox.min.clone().multiplyScalar(uniformScale);
    const scaledMax = bbox.max.clone().multiplyScalar(uniformScale);
    const scaledBbox = new THREE.Box3(scaledMin, scaledMax);
    return new THREE.Box3Helper(scaledBbox).geometry;
  }, [bbox, uniformScale]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#7c5bf0" linewidth={2} />
    </lineSegments>
  );
}
```

**Alternatively**, use R3F's `<box3Helper>` primitive or construct 12 edges from the 8 bbox corner vertices manually. `THREE.Box3Helper` (available in three@0.183) renders a box wireframe in one draw call.

**Why bbox wireframe is better:**
- 1 draw call regardless of GLTF mesh count (HIGH impact for complex models)
- No need to traverse scene tree at selection time
- Consistent visual size that Jessica recognizes as "the product bounds"
- Same visual language as Phase 31's resize handles (which show the bbox)

**Recommendation: use `THREE.Box3Helper` pattern. This replaces D-06's per-edge `EdgesGeometry` approach with equivalent visual effect at lower cost.**

**Note on `linewidth`:** WebGL2 does not support `linewidth > 1` on most platforms. The `linewidth={2}` prop is accepted by `LineBasicMaterial` but silently clamped to 1 on most GPUs. This is acceptable — the accent color `#7c5bf0` is distinctive enough at 1px.

---

## §5 — Suspense + ErrorBoundary Structure

### react-error-boundary is Already Installed

`package.json:39`: `"react-error-boundary": "^6.1.1"` — production dependency. `node_modules/react-error-boundary/dist/react-error-boundary.d.ts:30` confirms the `ErrorBoundary` class export with `fallback` prop support.

**Do NOT write an inline class. Import from `react-error-boundary`.**

### ProductMesh Branching Structure

```tsx
// src/three/ProductMesh.tsx (after refactor)
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ProductBox from "./ProductBox";
import GltfProduct from "./GltfProduct";

export default function ProductMesh({ placed, product, isSelected }: Props) {
  const { handlePointerDown, handlePointerUp } = useClickDetect(() => {
    useUIStore.getState().select([placed.id]);
  });
  const { width, depth, height, isPlaceholder } = resolveEffectiveDims(product, placed);
  const rotY = -(placed.rotation * Math.PI) / 180;

  const handlers = {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onContextMenu: (e: ThreeEvent<MouseEvent>) => {
      if (e.nativeEvent.button !== 2) return;
      e.stopPropagation();
      e.nativeEvent.preventDefault();
      useUIStore.getState().openContextMenu("product", placed.id, {
        x: e.nativeEvent.clientX,
        y: e.nativeEvent.clientY,
      });
    },
  };

  if (product?.gltfId) {
    return (
      <group
        position={[placed.position.x, 0, placed.position.y]}
        rotation={[0, rotY, 0]}
        {...handlers}
      >
        <Suspense
          fallback={
            <ProductBox
              width={width} depth={depth} height={height}
              isSelected={isSelected} isPlaceholder={isPlaceholder}
              textureUrl={product?.imageUrl ?? null}
            />
          }
        >
          <ErrorBoundary
            fallback={
              <ProductBox
                width={width} depth={depth} height={height}
                isSelected={isSelected} isPlaceholder={isPlaceholder}
                textureUrl={product?.imageUrl ?? null}
              />
            }
          >
            <GltfProduct
              gltfId={product.gltfId}
              placed={placed}
              product={product}
              isSelected={isSelected}
              width={width} depth={depth} height={height}
            />
          </ErrorBoundary>
        </Suspense>
      </group>
    );
  }

  // Image-only / placeholder path — unchanged behavior
  return (
    <group
      position={[placed.position.x, 0, placed.position.y]}
      rotation={[0, rotY, 0]}
      {...handlers}
    >
      <ProductBox
        width={width} depth={depth} height={height}
        isSelected={isSelected} isPlaceholder={isPlaceholder}
        textureUrl={!isPlaceholder && product?.imageUrl ? product.imageUrl : null}
      />
    </group>
  );
}
```

**Note on Suspense in R3F:** `ThreeViewport.tsx:430` already uses `<Suspense fallback={null}>` inside the Scene component (for `<Environment>`), confirming Suspense works inside R3F's Canvas. Phase 32 PBR rendering also confirmed this pattern. HIGH confidence.

**Note on ErrorBoundary + Suspense ordering:** `<Suspense>` must wrap `<ErrorBoundary>` — not the reverse. Suspense catches thrown Promises (loading); ErrorBoundary catches thrown Errors (failures). If `useGLTF` throws an Error (network fail, corrupt file), the ErrorBoundary catches it before Suspense sees it.

---

## §6 — `<group>` Event Propagation in R3F

**Finding: R3F event propagation from child mesh to parent group works correctly. Confidence: HIGH.**

Source: `node_modules/@react-three/fiber/dist/events-776716bd.esm.js` — R3F's event system implements its own bubble/propagation on top of Three.js raycasting. When a ray intersects a child mesh inside a `<group onPointerDown={...}>`, the event bubbles up through the React component tree to the group's handler, unless a child calls `e.stopPropagation()`.

This is the same mechanism that `ThreeViewport.tsx:550` uses for `onPointerMissed` on the `<Canvas>` — events bubble from mesh to parent to canvas. The existing `ProductMesh` already relies on this for the canvas-level `onPointerMissed` deselect.

**After refactor:** handlers move from `<mesh>` to `<group>`. Clicks on any child mesh inside the GLTF scene tree (which is inside the group via `<primitive object={scene}>`) will bubble up to the group. `e.stopPropagation()` in the context-menu handler prevents the canvas-level empty-click handler from also firing — same as current behavior.

**GLTF `<primitive>` child meshes:** `<primitive object={scene}>` renders the GLTF scene graph directly. R3F's reconciler traverses the Three.js object tree and attaches its event listeners to each `THREE.Mesh` found. Pointer events on those meshes bubble to the parent `<group>` in the React tree. Confirmed by how `ThreeViewport.tsx` uses `onPointerMissed` on `<Canvas>` — the entire scene tree bubbles to the canvas level.

---

## §7 — GltfProduct Component Structure

```tsx
// src/three/GltfProduct.tsx
import * as THREE from "three";
import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import type { PlacedProduct } from "@/types/cad";
import type { Product } from "@/types/product";
import { useGltfBlobUrl } from "@/hooks/useGltfBlobUrl";

interface Props {
  gltfId: string;
  placed: PlacedProduct;
  product: Product;
  isSelected: boolean;
  width: number;
  depth: number;
  height: number;
}

export default function GltfProduct({
  gltfId,
  isSelected,
  width,
  depth,
  height,
}: Props) {
  const { url } = useGltfBlobUrl(gltfId);

  // useGLTF suspends until loaded (drei/core/Gltf.js:26 → useLoader → suspend-react)
  // url is non-null here because Suspense fallback shows while loading
  const { scene } = useGLTF(url!);

  // Compute bbox of the raw (unscaled) model
  const { bbox, modelSize } = useMemo(() => {
    const b = new THREE.Box3().setFromObject(scene);
    const s = new THREE.Vector3();
    b.getSize(s);
    return { bbox: b, modelSize: s };
  }, [scene]);

  // Uniform scale: fit model into user's specified bbox
  const uniformScale = useMemo(() => {
    const dims = [
      modelSize.x > 0 ? width  / modelSize.x : Infinity,
      modelSize.y > 0 ? height / modelSize.y : Infinity,
      modelSize.z > 0 ? depth  / modelSize.z : Infinity,
    ].filter(isFinite);
    if (dims.length === 0) return 1;
    return Math.min(...dims);
  }, [modelSize, width, height, depth]);

  // Y offset: shift so bbox.min.y * scale = 0 (model sits on floor)
  const yOffset = useMemo(
    () => -bbox.min.y * uniformScale,
    [bbox, uniformScale],
  );

  // Bbox wireframe for selection outline (§4)
  const outlineGeometry = useMemo(() => {
    if (!isSelected) return null;
    const scaledMin = bbox.min.clone().multiplyScalar(uniformScale);
    const scaledMax = bbox.max.clone().multiplyScalar(uniformScale);
    const helper = new THREE.Box3Helper(new THREE.Box3(scaledMin, scaledMax));
    return helper.geometry;
  }, [isSelected, bbox, uniformScale]);

  // GltfProduct is always rendered inside a <group position={[x, 0, z]} rotation>
  // from ProductMesh. The local position here is just the Y offset.
  return (
    <group position={[0, yOffset, 0]} scale={[uniformScale, uniformScale, uniformScale]}>
      <primitive object={scene} castShadow receiveShadow />
      {isSelected && outlineGeometry && (
        <lineSegments geometry={outlineGeometry}>
          <lineBasicMaterial color="#7c5bf0" linewidth={2} />
        </lineSegments>
      )}
    </group>
  );
}
```

**Note:** `useGltfBlobUrl` returns `loading: true` initially. `GltfProduct` is only rendered inside `<Suspense>`, and `useGLTF(url!)` will suspend (throw a Promise) while loading. The `url!` non-null assertion is safe: `useGltfBlobUrl` resolves before `GltfProduct` would attempt to call `useGLTF` with a non-null URL — the Suspense boundary ensures the fallback box is shown during `loading: true`.

**Edge: `url` is null while loading.** When `GltfProduct` first renders, `url` may still be null (IDB fetch in flight). Calling `useGLTF(null!)` would be wrong. Solution: suspend early if `url` is null:

```typescript
if (!url) throw new Promise<void>(() => {}); // permanent suspend until url resolves
```

Or better: don't render `GltfProduct` until `url` is non-null. The cleanest approach is to have `useGltfBlobUrl` throw the pending promise when loading (making the hook itself Suspense-compatible), mirroring how `useLoader` works. Alternatively, keep `useGltfBlobUrl` returning `{ url, loading }` and add a guard at the `GltfProduct` render boundary: `if (!url) return null;` — but this skips Suspense. The recommended approach for correctness:

**Recommended implementation:** `GltfProduct` receives `url: string` (already resolved — not `string | null`). `ProductMesh` does not render `GltfProduct` until `url` is ready. Use a wrapper:

```tsx
// In ProductMesh:
const { url, loading, error } = useGltfBlobUrl(product.gltfId);

if (product?.gltfId) {
  return (
    <group ... handlers>
      {url ? (
        <Suspense fallback={<ProductBox ... />}>
          <ErrorBoundary fallback={<ProductBox ... />}>
            <GltfProduct url={url} ... />
          </ErrorBoundary>
        </Suspense>
      ) : (
        <ProductBox ... />  // shows while IDB fetch is in flight (loading or error)
      )}
    </group>
  );
}
```

This is cleaner: `useGltfBlobUrl` stays a simple `{ url, loading, error }` hook (matching D-01), `GltfProduct` always receives a non-null string URL, and `useGLTF` suspends on the network/parse phase. The `<Suspense>` boundary covers drei's async parse (typically a few frames); `useGltfBlobUrl`'s loading state covers the IDB fetch (typically < 10ms).

---

## §8 — RoomGroup (Phase 47) Integration

**Finding: GLTF products work correctly inside RoomGroup's group transform. Confidence: HIGH.**

Source: `src/three/RoomGroup.tsx:103` — `<group position={[offsetX, 0, 0]}>` is the room's root node. Inside it, `ProductMesh` is rendered at `src/three/RoomGroup.tsx:117–128`. After the Phase 56 refactor, `ProductMesh` becomes a `<group position={[placed.position.x, 0, placed.position.y]}>`. Inside that, `GltfProduct` renders a `<group position={[0, yOffset, 0]} scale={...}>`.

Three.js group transforms compose multiplicatively — the world transform of the GLTF scene is: `RoomGroup.position × ProductMesh.position × GltfProduct.position × GltfProduct.scale`. This is standard Three.js matrix composition and requires no special handling. EXPLODE mode simply changes `offsetX` on the RoomGroup, which shifts all room contents including GLTF products uniformly.

---

## §9 — ProductBox Extraction

The current `ProductMesh.tsx` (59 lines total) contains one `<mesh>` with `<boxGeometry>` and `<meshStandardMaterial>`. Extraction to `ProductBox.tsx` is a pure refactor: copy the mesh JSX, add props for `width/depth/height/isSelected/isPlaceholder/textureUrl`, delete it from `ProductMesh`. Existing tests that exercise ProductMesh's box rendering should still pass after extraction because the visual output is identical.

**Props interface for `ProductBox`:**

```typescript
interface ProductBoxProps {
  width: number;
  depth: number;
  height: number;
  isSelected: boolean;
  isPlaceholder: boolean;
  textureUrl: string | null;
}
```

The `position` and `rotation` props move to the wrapping `<group>` in `ProductMesh`, so `ProductBox` becomes a pure geometry/material component with no transform state.

---

## §10 — Test Coverage Detail

### Unit Tests (5) — `tests/hooks/useGltfBlobUrl.test.ts`

Test with fake-indexeddb (already a devDep: `package.json:57`) and synthetic Blobs. Mock `URL.createObjectURL` and `URL.revokeObjectURL` (jsdom provides stubs).

1. Returns `{ url: null, loading: true }` synchronously when gltfId is provided (before IDB resolves)
2. Returns `{ url: "blob:...", loading: false }` after IDB resolves — uses `renderHook` + `waitFor`
3. Returns `{ url: null, error: Error, loading: false }` when `getGltf` throws
4. Multiple consumers of same gltfId → `URL.createObjectURL` called exactly once (shared cache)
5. Last unmount triggers `URL.revokeObjectURL` (spy assertion); earlier unmounts do not

**Strict Mode note:** tests run in `jsdom` (not a browser), so Strict Mode double-invoke is not active in test environment unless `<StrictMode>` is explicitly wrapped. Unit tests test the hook directly via `renderHook`; Strict Mode behavior is verified by the ref-counting logic in tests 4 and 5.

### Component Tests (3) — `tests/components/ProductMesh.gltf.test.tsx`

Mock `useGltfBlobUrl` and `useGLTF` at module level.

6. `product.gltfId = undefined` → ProductMesh renders `<boxGeometry>` (no GLTF path)
7. `product.gltfId = "gltf_abc"`, `useGltfBlobUrl` returns `{ url: null, loading: true }` → ProductBox rendered (loading fallback)
8. `ErrorBoundary` catches a thrown error from `useGLTF` mock → ProductBox rendered (error fallback)

### E2E Tests (4) — `e2e/gltf-render-3d.spec.ts`

Fixture: `tests/e2e/fixtures/box.glb` (Khronos Box.glb, ~3KB, real valid GLB).

9. Upload Box.glb → place product → switch to 3D → canvas snapshot shows non-box geometry (or assert via `__driveMeshSelect` driver that product renders)
10. Phase 31 edge resize on GLTF product → `window.__driveResize(id, "E", 3)` → assert `resolveEffectiveDims` produces correct width via store state
11. Phase 53 right-click on GLTF product → `window.__driveMeshSelect(id)` → right-click simulation → context menu opens
12. Phase 54 click-to-select → `window.__driveMeshSelect(id)` → verify `selectedIds` contains product id

**Test driver addition:** `window.__driveUploadGltf(blob, name)` already exists from Phase 55. E2e tests use this to seed the GLTF product faster than the modal UI (per D-10 in 56-CONTEXT.md).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Suspense-compatible loader | Custom fetch + cache | `drei useGLTF` | Already handles suspend-react integration, DRACO, Meshopt |
| Error boundary | Inline class component | `react-error-boundary@6.1.1` | Already installed (package.json:39), well-tested |
| Bbox computation | Manual vertex traversal | `THREE.Box3.setFromObject` | Handles nested groups, bone-driven meshes, skinned geometry |
| ObjectURL lifecycle | Ad-hoc create/revoke | Module-level ref-counted Map | Per-render create/revoke causes flicker and memory spikes |

---

## Common Pitfalls

### Pitfall 1: Calling `useGLTF(null)` Before URL Resolves
**What goes wrong:** `useGLTF(null!)` passes null to `GLTFLoader.load()`, which throws immediately.
**Why it happens:** `useGltfBlobUrl` has an async gap between mount and IDB resolution.
**How to avoid:** Conditional render — only mount `<GltfProduct>` when `url` is non-null. Show `<ProductBox>` during loading.
**Warning signs:** Console error "Could not load null" during dev.

### Pitfall 2: Revoking ObjectURL Before `useGLTF.clear`
**What goes wrong:** drei's suspend-react cache holds the URL as a key. If the URL is revoked but not cleared from the cache, subsequent renders with the same gltfId attempt to re-use a stale cache entry pointing to a revoked blob URL — the load will fail silently (fetch returns a network error for a revoked blob).
**How to avoid:** Always call `useGLTF.clear(url)` before `URL.revokeObjectURL(url)`. In `useGltfBlobUrl`'s `releaseUrl`, the order is: clear → revoke.
**Warning signs:** GLTF renders once, then disappears after unmount/remount.

### Pitfall 3: `Box3.setFromObject` on Uninitialized Scene
**What goes wrong:** `scene` from `useGLTF` is the live Three.js scene reference. On the first render frame, child meshes may not have updated their world matrices. `setFromObject` without `scene.updateWorldMatrix(true, true)` may return stale bounds.
**How to avoid:** Call `scene.updateWorldMatrix(true, true)` before `Box3.setFromObject(scene)`.
**Warning signs:** Auto-scale appears incorrect on first load, corrects itself after camera move.

### Pitfall 4: Position Mismatch — `<group position>` on Both ProductMesh and GltfProduct
**What goes wrong:** If both `ProductMesh`'s outer group and `GltfProduct`'s inner group apply Y offsets, the product floats above the floor.
**How to avoid:** Only `GltfProduct` applies `yOffset` on Y. `ProductMesh`'s outer group uses Y=0. The current `<mesh position={[x, height/2, z]}>` in `ProductMesh` (ProductMesh.tsx:33) centers the box — this logic moves to `ProductBox`, which sets its own Y via `position={[0, height/2, 0]}` since the outer group now owns X/Z.
**Warning signs:** Products visually floating or clipping through floor.

### Pitfall 5: `<primitive object={scene}>` Mutation After Dispose
**What goes wrong:** `useGLTF` returns the same Three.js scene object reference across renders. If `useGLTF.clear(url)` is called while the scene is still mounted, Three.js may dispose geometries/materials while R3F is still rendering them.
**How to avoid:** Clear the drei cache ONLY on full unmount (refCount → 0), never during an active render. The ref-counted design ensures this.
**Warning signs:** Console "WebGL: INVALID_OPERATION: uniformMatrix4fv: location is not from current program" after unmount.

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Custom Suspense resources | `suspend-react` (used internally by R3F useLoader) | drei 9.x delegates to suspend-react automatically |
| Manual GLTFLoader + fetch | `useGLTF` | Handles DRACO, Meshopt, suspend, cache |
| Inline ErrorBoundary class | `react-error-boundary` (installed as dep) | Better ergonomics, resets via `resetKeys` prop |

---

## Environment Availability

Step 2.6: SKIPPED — no external dependencies. All libraries already installed. Phase is code-only changes within the existing browser SPA. IndexedDB is available in all browsers (confirmed: existing Phase 55 code uses `idb-keyval` + `fake-indexeddb` in tests).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest@4.1.2 + @testing-library/react@16 + Playwright@1.59.1 |
| Config file | `vite.config.ts` (vitest inline config inferred from Phase 55 test patterns) |
| Quick run command | `npm run test:quick` |
| Full suite command | `npm run test && npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GLTF-RENDER-3D-01 (load path) | `useGltfBlobUrl` IDB→ObjectURL lifecycle | unit | `vitest run tests/hooks/useGltfBlobUrl.test.ts` | Wave 0 |
| GLTF-RENDER-3D-01 (box fallback) | ProductMesh shows box when no gltfId or loading | component | `vitest run tests/components/ProductMesh.gltf.test.tsx` | Wave 0 |
| GLTF-RENDER-3D-01 (render) | GLTF model renders in 3D after upload | e2e | `playwright test e2e/gltf-render-3d.spec.ts` | Wave 0 |
| GLTF-RENDER-3D-01 (Phase 31 compat) | Edge resize applies to GLTF product | e2e | `playwright test e2e/gltf-render-3d.spec.ts` | Wave 0 |
| GLTF-RENDER-3D-01 (Phase 53 compat) | Right-click on GLTF opens context menu | e2e | `playwright test e2e/gltf-render-3d.spec.ts` | Wave 0 |
| GLTF-RENDER-3D-01 (Phase 54 compat) | Click-to-select GLTF product | e2e | `playwright test e2e/gltf-render-3d.spec.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:quick`
- **Per wave merge:** `npm run test`
- **Phase gate:** full suite green (including e2e) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/hooks/useGltfBlobUrl.test.ts` — covers D-09 unit tests 1–5
- [ ] `tests/components/ProductMesh.gltf.test.tsx` — covers D-09 component tests 6–8
- [ ] `tests/e2e/fixtures/box.glb` — Khronos Box.glb binary fixture
- [ ] `e2e/gltf-render-3d.spec.ts` — covers D-09 e2e tests 9–12

---

## Task Breakdown Estimate

**1 plan, 5 tasks.** Matches Phase 49–55 compact shape.

| Task | Description | Files | Tests |
|------|-------------|-------|-------|
| T1 | `useGltfBlobUrl` hook + 5 unit tests (TDD) | `src/hooks/useGltfBlobUrl.ts`, `tests/hooks/useGltfBlobUrl.test.ts` | 5 unit |
| T2 | `ProductBox` extraction (pure refactor — no behavior change) | `src/three/ProductBox.tsx`, `src/three/ProductMesh.tsx` (slim) | existing tests pass |
| T3 | `GltfProduct` component: `useGLTF` + auto-scale + floor-align + bbox outline | `src/three/GltfProduct.tsx` | manual smoke |
| T4 | `ProductMesh` branching + `<group>` wrap + Suspense + ErrorBoundary + 3 component tests | `src/three/ProductMesh.tsx` (final), `tests/components/ProductMesh.gltf.test.tsx` | 3 component |
| T5 | Box.glb fixture + `e2e/gltf-render-3d.spec.ts` (4 e2e scenarios) | `tests/e2e/fixtures/box.glb`, `e2e/gltf-render-3d.spec.ts` | 4 e2e |

---

## Open Questions (Resolved)

1. **Drei `useGLTF` blob-URL behavior:** CONFIRMED working. `useGLTF(path)` passes the URL verbatim to `GLTFLoader.load()` which uses browser `fetch()`. Blob URLs are fetchable. HIGH confidence. (Gltf.js:26, events-0e73ba93.cjs.prod.js:1711)

2. **Auto-scale algorithm:** `THREE.Box3.setFromObject` + `getSize` + `Math.min(w/x, h/y, d/z)` is the standard approach. No drei helper needed. Call `scene.updateWorldMatrix(true, true)` first to avoid stale transforms.

3. **EdgesGeometry on GLTF tree:** Per-mesh EdgesGeometry is expensive for complex models. RESOLVED: use `THREE.Box3Helper` bbox wireframe — 1 draw call, simpler, visually consistent with Phase 31 resize handles.

4. **Drei GLTF cache disposal:** Drei uses `suspend-react` keyed by URL string. Cache is NOT automatically disposed when components unmount — entries persist. Our `useGltfBlobUrl` must call `useGLTF.clear(url)` at revoke time to avoid stale cache entries pointing to revoked blob URLs.

5. **Phase 47 RoomGroup integration:** THREE.js transform composition handles this automatically. RoomGroup's `position={[offsetX, 0, 0]}` + ProductMesh's position + GltfProduct's yOffset all compose correctly. Confirmed by reviewing RoomGroup.tsx:103.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/@react-three/drei/core/Gltf.js:26` — `useGLTF` implementation, blob URL passthrough
- `node_modules/@react-three/fiber/dist/events-0e73ba93.cjs.prod.js:1701–1731` — `useLoader` + `loadingFn` implementation, `loader.load(url)` call
- `node_modules/three/src/math/Box3.js:150,231` — `setFromObject`, `getSize` APIs
- `node_modules/react-error-boundary/dist/react-error-boundary.d.ts:30` — `ErrorBoundary` export with `fallback` prop
- `package.json:29,30,39,43` — version verification for all deps
- `src/three/ProductMesh.tsx` — refactor target, 59 lines
- `src/three/ThreeViewport.tsx:430` — Suspense inside R3F Canvas confirmed working
- `src/three/RoomGroup.tsx:103` — group position transform for Phase 47
- `src/lib/gltfStore.ts:37` — `getGltf(id)` signature returns `GltfModel | undefined`
- `src/types/product.ts:15` — `gltfId?: string` field confirmed
- `src/three/productTextureCache.ts` — ref pattern for cache module design

### Secondary (MEDIUM confidence)
- Phase 55 RESEARCH.md — blob URL MEDIUM confidence claim; upgraded to HIGH by direct source verification above

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — direct `package.json` + node_modules source reads
- Architecture: HIGH — all patterns grounded in existing file reads
- Pitfalls: HIGH — derived from source code analysis, not community reports
- Auto-scale math: HIGH — verified against three.js Box3.js source
- Event propagation: HIGH — R3F event system source + existing ThreeViewport patterns

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (stable libraries; no breaking changes expected in this timeframe)
