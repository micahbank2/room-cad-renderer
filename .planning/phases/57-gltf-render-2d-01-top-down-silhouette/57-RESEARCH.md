---
phase: 57-gltf-render-2d-01-top-down-silhouette
type: research
created: 2026-05-04
domain: THREE.GLTFLoader.parseAsync / Andrew's monotone chain / fabric.Polygon / fabricSync async-cache pattern
confidence: HIGH
requirements: [GLTF-RENDER-2D-01]
---

# Phase 57: Top-Down Silhouette in 2D (GLTF-RENDER-2D-01) — Research

**Researched:** 2026-05-04
**Domain:** Non-React GLTFLoader, vertex projection, convex hull, fabric.Polygon click-target, async silhouette cache
**Confidence:** HIGH — all findings from direct reads of installed source files

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** — Convex hull algorithm: Andrew's monotone chain (~30 lines); `computeTopDownSilhouette(scene: THREE.Group): Array<[number, number]>`
- **D-02** — Walk all geometry vertices (no decimation); apply mesh world transform
- **D-03** — In-memory cache only (module-level Map); no IDB persistence
- **D-04** — Lazy compute on first 2D render; fallback `fabric.Rect` while computing
- **D-05** — Async with re-render callback mirroring FIX-01 `getCachedImage` pattern exactly
- **D-06** — Visual style: `fill: rgba(202,195,215,0.15)`, `stroke: #7c5bf0`, `strokeWidth: 1`
- **D-07** — Auto-scale silhouette to user-specified `width × depth` bbox; uniform scale (smaller axis); center on placement center
- **D-08** — Fallback paths: corrupt → null sentinel → `fabric.Rect`; hull < 3 vertices → fallback rect; compute in progress → placeholder rect
- **D-09** — 6 unit (vitest) + 4 e2e (Playwright) tests; exact list locked
- **D-10** — Reuse `tests/e2e/fixtures/box.glb` from Phase 56; synthetic `THREE.Group` for unit tests
- **D-11** — Atomic commits per task
- **D-12** — Zero regressions: image-only → `fabric.Rect`; Phase 31 overrides; Phase 53 right-click; Phase 54 click-to-select; Phase 56 3D untouched; 6 pre-existing vitest failures unchanged

### Claude's Discretion

None specified — all decisions locked in CONTEXT.md.

### Deferred Ideas (OUT OF SCOPE)

- Library UI Box-icon indicator (Phase 58)
- Auto-thumbnail (Phase 58)
- Cross-viewport integration verification (Phase 58)
- OBJ format, GLTF animations, alpha shapes, IDB-persisted silhouette cache, decimation
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GLTF-RENDER-2D-01 | Products with gltfId render top-down silhouette polygon in 2D; image-only continues as rect; fallback to rect on failure | §1 GLTFLoader API, §2 world-transform, §3 convex hull, §4 fabric.Polygon click-target, §5 cache pattern, §6 styling tokens |
</phase_requirements>

---

## Summary

Phase 57 is architecturally a three-step pipeline: (1) load GLTF from IDB blob via `GLTFLoader.parseAsync`, (2) project all vertex positions top-down (x, z) after applying world transforms, (3) compute convex hull via Andrew's monotone chain and cache the result. The Fabric render path in `fabricSync.ts` branches on `product.gltfId`: GLTF products swap the inner `fabric.Rect` for a `fabric.Polygon`; image-only products are unchanged.

`GLTFLoader.parseAsync` is available at `node_modules/three/examples/jsm/loaders/GLTFLoader.js:556` and accepts an `ArrayBuffer` directly — no React, no DOM, no Suspense needed. This is the cleanest path for fabricSync (non-React code). The blob from `getGltf(id)` is converted via `blob.arrayBuffer()` and passed straight to `parseAsync`.

`fabric.Polygon` is a full first-class Fabric object that accepts the same `data` field as `fabric.Rect`, so the existing `data.placedProductId`-based click dispatch in `FabricCanvas.tsx` and the Phase 53/54 hit-test wiring continue to work without change.

**Primary recommendation:** Follow CONTEXT.md exactly. The only implementation nuance is world-transform application (call `scene.updateMatrixWorld(true, true)` before traverse) and the edge cases for SkinnedMesh and InstancedMesh listed in §2.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `three` | `^0.183.2` | `GLTFLoader`, `THREE.Vector3`, `BufferGeometry` | `package.json:43` |
| `fabric` | `^6.9.1` | `fabric.Polygon`, `fabric.Group`, `fabric.Canvas` | `package.json:33` |

**No new installs required.**

---

## Architecture Patterns

### Recommended File Structure (new files only)

```
src/
  lib/
    gltfSilhouette.ts            # NEW — computeTopDownSilhouette + getCachedSilhouette
tests/
  lib/
    gltfSilhouette.test.ts       # NEW — 6 unit tests
e2e/
  gltf-render-2d.spec.ts         # NEW — 4 e2e scenarios
src/
  test-utils/
    gltfDrivers.ts               # EXTEND — add __getProductRenderShape
  canvas/
    fabricSync.ts                # BRANCH — gltfId path + onAssetReady rename
```

---

## §1: GLTFLoader Without React/Drei

**Confirmed API** (`node_modules/three/examples/jsm/loaders/GLTFLoader.js:548–566`):

```typescript
// GLTFLoader.js:556
parseAsync( data, path ) {
  const scope = this;
  return new Promise( function ( resolve, reject ) {
    scope.parse( data, path, resolve, reject );
  } );
}
```

`parseAsync(data: string | ArrayBuffer, path: string): Promise<GLTF>`

For IDB blob path (preferred — avoids ObjectURL lifecycle):

```typescript
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getGltf } from "@/lib/gltfStore";

async function loadGltfScene(gltfId: string): Promise<THREE.Group | null> {
  const model = await getGltf(gltfId);
  if (!model) return null;                         // orphan — sentinel path
  const arrayBuffer = await model.blob.arrayBuffer();
  const loader = new GLTFLoader();
  const gltf = await loader.parseAsync(arrayBuffer, ""); // path="" ok for embedded GLBs
  return gltf.scene;
}
```

**Alternative via blob URL** (mirrors drei path — `loadAsync` from base `Loader.js:91`):

```typescript
const url = URL.createObjectURL(model.blob);
try {
  const gltf = await new GLTFLoader().loadAsync(url);
  return gltf.scene;
} finally {
  URL.revokeObjectURL(url);
}
```

**Recommendation: use `parseAsync(arrayBuffer, "")`.** Avoids ObjectURL creation/revocation. The path argument `""` is correct for self-contained `.glb` files (all binary data embedded). For `.gltf` + external `.bin` files the path would matter — but the Phase 55 upload stores the raw blob as-is, and GLBs are self-contained.

**Error handling:**
- `parseAsync` rejects if the ArrayBuffer is not valid GLTF/GLB binary. Wrap in try/catch; cache `null` as sentinel (D-08).
- `gltf.scene` is always a `THREE.Group`; it may have zero children if the GLTF has no geometry — handled by `computeTopDownSilhouette` returning `null` (D-08).

**Confidence:** HIGH — verified from installed source at `GLTFLoader.js:548–566`.

---

## §2: World-Transform Application

GLTF node transforms (translation, rotation, scale from `node.matrix`) are baked into `matrixWorld` only after `updateWorldMatrix` is called. Without this call, `matrixWorld` may be stale (identity for freshly parsed scenes that have never been rendered).

**Required call pattern:**

```typescript
import * as THREE from "three";

function extractTopDownPoints(scene: THREE.Group): Array<[number, number]> {
  // CRITICAL: force propagation of node transforms before reading matrixWorld
  scene.updateMatrixWorld(true, true);  // force=true, updateParents=true

  const points: Array<[number, number]> = [];
  const v = new THREE.Vector3();

  scene.traverse((node) => {
    // Guard: only Mesh nodes carry BufferGeometry
    if (!(node instanceof THREE.Mesh)) return;

    const geo = node.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position;
    if (!pos) return;

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(node.matrixWorld);
      points.push([v.x, v.z]);  // top-down: drop Y
    }
  });

  return points;
}
```

**Edge cases:**

| Node type | Handling |
|-----------|----------|
| `THREE.SkinnedMesh` | `instanceof THREE.Mesh` guard catches it (SkinnedMesh extends Mesh). BUT `matrixWorld` reflects only bind-pose transforms, not animation state — acceptable since GLTF animations are out of scope (D-12 deferred) |
| `THREE.InstancedMesh` | `instanceof THREE.Mesh` catches it but `attributes.position` reflects the instanced geometry, NOT the per-instance transforms. For furniture GLTFs, InstancedMesh is extremely rare. Acceptable to ignore per-instance matrices for now; the convex hull of the instanced geometry is still a valid conservative bound. Document as known limitation. |
| Nodes with `geometry` but no `position` attribute | `if (!pos) return` guard handles |
| Zero-area geometry (degenerate) | Andrew's monotone chain returns < 3 vertices → fallback rect (D-08) |

**Confidence:** HIGH — pattern confirmed from Phase 56 `GltfProduct.tsx:41` (`scene.updateWorldMatrix(true, true)`) and Three.js source.

---

## §3: Convex Hull — Andrew's Monotone Chain

**Decision (D-01):** Write inline (~30 lines). Three.js `ConvexHull.js` operates in 3D and is overkill. No 2D convex hull library is available as a project dependency.

**Implementation:**

```typescript
// Andrew's monotone chain — O(n log n), no external dependency
function cross2D(O: [number, number], A: [number, number], B: [number, number]): number {
  return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);
}

export function convexHull2D(points: Array<[number, number]>): Array<[number, number]> {
  const n = points.length;
  if (n < 3) return [...points];  // degenerate — caller checks hull.length < 3

  // Sort lexicographically: x asc, then z asc
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  // Lower hull
  const lower: Array<[number, number]> = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross2D(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  // Upper hull
  const upper: Array<[number, number]> = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross2D(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  // Remove last point of each half (it's the first point of the other half)
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}
```

**Edge cases:**

| Case | Behavior |
|------|----------|
| All points collinear | Hull has 2 points → caller sees `< 3` → fallback rect (D-08) |
| Exact duplicates | `cross2D <= 0` removes them during hull walk; safe |
| 1 or 2 points total | `n < 3` early return → caller sees `< 3` → fallback rect |
| Empty input | Returns `[]` → caller sees `< 3` → fallback rect |

**`computeTopDownSilhouette` full signature:**

```typescript
export function computeTopDownSilhouette(
  scene: THREE.Group
): Array<[number, number]> | null {
  const raw = extractTopDownPoints(scene);
  if (raw.length === 0) return null;          // empty geometry
  const hull = convexHull2D(raw);
  if (hull.length < 3) return null;           // degenerate
  return hull;
}
```

**Confidence:** HIGH — algorithm is standard, no library dependency risk.

---

## §4: fabric.Polygon Click-Target Confirmation

`fabric.Polygon` accepts the same `data` property as `fabric.Rect` — both inherit from `FabricObject`. The existing click dispatch in `FabricCanvas.tsx` uses `fc.findTarget(e)` and then reads `(obj as fabric.FabricObject & { data?: ... }).data?.placedProductId` — this works on any Fabric object type.

**Confirmed from `fabricSync.ts:917–925`:**

```typescript
// fabricSync.ts:917-925 — existing Group construction
const group = new fabric.Group(children, {
  left: cx,
  top: cy,
  originX: "center",
  originY: "center",
  angle: pp.rotation,
  selectable: false,
  evented: false,
  data: { type: "product", placedProductId: pp.id, productId: pp.productId },
});
```

The `data` field is on the `fabric.Group`, not on inner children. Phase 57 replaces the inner `border` (`fabric.Rect`) with a `fabric.Polygon`, but the Group wrapper and its `data` field stay identical. Phase 53 right-click and Phase 54 click-to-select both dispatch on the Group's `data.placedProductId` — the Polygon swap does not affect this wiring.

**Confidence:** HIGH — verified from `fabricSync.ts:917–925`.

---

## §5: getCachedSilhouette — FIX-01 Mirror

`productImageCache.ts` pattern (exact source, lines 1–27):

```typescript
// Exact pattern to mirror for gltfSilhouette.ts
const cache = new Map<string, HTMLImageElement>();
const loading = new Set<string>();

export function getCachedImage(id, url, onReady) {
  const hit = cache.get(productId);
  if (hit) return hit;              // synchronous hit
  if (loading.has(productId)) return null;  // already in flight
  loading.add(productId);
  // ... async load → cache.set → onReady()
  return null;
}
```

**`getCachedSilhouette` analog:**

```typescript
// src/lib/gltfSilhouette.ts
type Hull = Array<[number, number]>;
const silhouetteCache = new Map<string, Hull | null>();  // null = sentinel (failed)
const computing = new Set<string>();

export function getCachedSilhouette(
  gltfId: string,
  onReady: () => void
): Hull | null | undefined {
  if (silhouetteCache.has(gltfId)) return silhouetteCache.get(gltfId) ?? null;
  if (computing.has(gltfId)) return undefined;          // in flight → caller renders rect

  computing.add(gltfId);
  (async () => {
    try {
      const scene = await loadGltfScene(gltfId);
      const hull = scene ? computeTopDownSilhouette(scene) : null;
      silhouetteCache.set(gltfId, hull);
    } catch {
      silhouetteCache.set(gltfId, null);                // sentinel
    } finally {
      computing.delete(gltfId);
      onReady();
    }
  })();
  return undefined;
}
```

Return type semantics:
- `Hull` (Array) → cache hit, valid → render `fabric.Polygon`
- `null` → cache hit, failed/degenerate → render `fabric.Rect` fallback
- `undefined` → computing in progress → render `fabric.Rect` placeholder

**Confidence:** HIGH — mirrors `productImageCache.ts:1–27` exactly.

---

## §5b: onAssetReady Rename Recommendation

`fabricSync.ts:834` declares the `renderProducts` callback as `onImageReady?: () => void`. With Phase 57, both image loads and silhouette computations call this same callback (triggers `fc.renderAll() + onImageReady?.()`).

**Recommendation: rename `onImageReady` to `onAssetReady`** throughout:
- `fabricSync.ts:834` — parameter declaration
- `fabricSync.ts:903–904` — image cache callsite
- `fabricSync.ts` — silhouette cache callsite (new)
- `src/canvas/FabricCanvas.tsx` — all callsites that pass the callback

This is a semantic broadening rename only — no behavior change. Single callback, same action (`fc.renderAll()` + re-invoke `renderProducts`), whether triggered by image load or silhouette compute.

**Do not add a separate `onSilhouetteReady`.** One callback path is simpler and matches the FIX-01 pattern.

---

## §6: Polygon Styling — Token Verification

CONTEXT.md D-06 specifies:
- `fill: rgba(202, 195, 215, 0.15)`
- `stroke: #7c5bf0`
- `strokeWidth: 1`

**Token verification (from `src/index.css` design system via CLAUDE.md):**

| Token | Hex | RGB | Match |
|-------|-----|-----|-------|
| `--color-text-dim` | `#938ea0` | 147, 142, 160 | NOT the fill source |
| `--color-text-muted` | `#cac3d7` | 202, 195, 215 | **CONFIRMED MATCH** — fill is `text-muted` at 15% opacity |
| `--color-accent` | `#7c5bf0` | — | CONFIRMED MATCH — stroke is accent purple |

The CONTEXT.md comment "text-text-dim @ 15% opacity" is slightly imprecise — the correct token name is `--color-text-muted` (`#cac3d7` = RGB 202, 195, 215). The fill value `rgba(202, 195, 215, 0.15)` is correct and matches `text-muted`. Use the literal rgba value in code (not the CSS var) to match the existing pattern in `fabricSync.ts` (which uses literal `rgba(124,91,240,0.06)` for the border rect rather than a var reference).

**Confidence:** HIGH — verified from CLAUDE.md design system table.

---

## §7: Polygon Auto-Scale to User bbox (D-07)

```typescript
function scaleHullToProduct(
  hull: Array<[number, number]>,
  widthFt: number,
  depthFt: number,
  scalePxPerFt: number,
  cx: number,
  cy: number,
): Array<{ x: number; y: number }> {
  // 1. Compute hull bbox
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of hull) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  const hullW = maxX - minX;
  const hullD = maxZ - minZ;

  // 2. Uniform scale to fit user-specified dims (smaller axis wins — no distortion)
  const pw = widthFt * scalePxPerFt;
  const pd = depthFt * scalePxPerFt;
  const s = (hullW > 0 && hullD > 0)
    ? Math.min(pw / hullW, pd / hullD)
    : 1;

  // 3. Center hull on placement center
  const hullCx = (minX + maxX) / 2;
  const hullCz = (minZ + maxZ) / 2;

  return hull.map(([x, z]) => ({
    x: (x - hullCx) * s,
    y: (z - hullCz) * s,   // Fabric Y = Three.js Z (top-down)
  }));
}
```

The returned points are passed directly to `new fabric.Polygon(points, { originX: "center", originY: "center", ... })`. The Group then positions via `left: cx, top: cy`.

---

## §8: Test Coverage — File Paths and Assertion Shapes

### Unit tests — `tests/lib/gltfSilhouette.test.ts`

| # | Test | Assertion shape |
|---|------|-----------------|
| U1 | `computeTopDownSilhouette` on synthetic BoxGeometry scene returns ≥ 3 vertices | `expect(hull.length).toBeGreaterThanOrEqual(3)` |
| U2 | Y-axis dropped — all returned tuples are `[number, number]` length 2 (x, z) | `hull.every(p => p.length === 2)` |
| U3 | Interior points discarded — 9-point 3×3 grid → hull has exactly 4 corners | `expect(hull.length).toBe(4)` |
| U4 | Empty scene (no meshes) → `computeTopDownSilhouette` returns `null` | `expect(result).toBeNull()` |
| U5 | `getCachedSilhouette` cache hit returns the cached hull synchronously | First call populates cache; second call returns same object without async |
| U6 | `getCachedSilhouette` cache miss returns `undefined`; `onReady` fires after async resolves; cache then populated | `expect(result1).toBeUndefined()` → await → `expect(onReady).toHaveBeenCalledTimes(1)` → `expect(getCachedSilhouette(id, noop)).not.toBeUndefined()` |

**Setup for U1–U4:** Build a synthetic scene in-test with no GLTF parse:

```typescript
import * as THREE from "three";

function makeBoxScene(): THREE.Group {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
  group.add(mesh);
  return group;
}
```

No IDB, no blob URL — pure Three.js construction.

**Fixture for U5–U6:** Use a Vitest mock of `getGltf` to return a synthetic blob; mock `GLTFLoader.parseAsync` to resolve with a synthetic scene. Keep IDB out of unit test scope.

### E2E tests — `e2e/gltf-render-2d.spec.ts`

| # | Scenario | Assertion |
|---|----------|-----------|
| E1 | Place GLTF product in 2D → render shape is polygon | `window.__getProductRenderShape(placedId) === "polygon"` |
| E2 | Place image-only product → render shape is rect (regression) | `window.__getProductRenderShape(placedId) === "rect"` |
| E3 | Phase 31 edge resize on GLTF product → polygon scales (re-renders as polygon after resize) | `__getProductRenderShape` still `"polygon"` after `__driveResize` call |
| E4 | Phase 53 right-click + Phase 54 click-to-select still work on silhouette | Context menu appears; `selectedIds` contains `placedId` |

**Fixture:** reuse `tests/e2e/fixtures/box.glb` (Phase 56, 1664 bytes). Use `__driveAddGltfProduct` from `gltfDrivers.ts` to seed the GLTF product programmatically.

---

## §9: Test Driver — `__getProductRenderShape`

Extend `src/test-utils/gltfDrivers.ts` with:

```typescript
// Returns "polygon" | "rect" | null
// Walks the Fabric canvas, finds the Group for the given placedProductId,
// inspects whether the first non-image, non-text child is Polygon or Rect.
export function getProductRenderShape(
  placedProductId: string
): "polygon" | "rect" | null {
  if (typeof window === "undefined") return null;
  // Access Fabric canvas via global registered by FabricCanvas.tsx in test mode
  const fc = (window as unknown as { __fabricCanvas?: fabric.Canvas }).__fabricCanvas;
  if (!fc) return null;

  const group = fc.getObjects().find(
    (obj) => (obj as fabric.Group & { data?: { placedProductId?: string } })
      .data?.placedProductId === placedProductId
  ) as fabric.Group | undefined;
  if (!group) return null;

  const innerObjects = group.getObjects();
  const shapeChild = innerObjects.find(
    (o) => o instanceof fabric.Polygon || o instanceof fabric.Rect
  );
  if (!shapeChild) return null;
  return shapeChild instanceof fabric.Polygon ? "polygon" : "rect";
}
```

Install alongside existing drivers in `installGltfDrivers()`:

```typescript
w.__getProductRenderShape = getProductRenderShape;
```

Declare in `Window` global interface augmentation in the same file.

**Note:** `window.__fabricCanvas` requires FabricCanvas.tsx to register `window.__fabricCanvas = fc` in test mode (gated by `import.meta.env.MODE === "test"`). This is a one-line addition to `FabricCanvas.tsx` that mirrors the Phase 31 `window.__driveResize` pattern (`CLAUDE.md` §Drag-to-Resize).

---

## §10: Task Breakdown Estimate

**1 plan, 4 tasks** — matches Phase 49–56 compact shape.

| Task | Files | Description |
|------|-------|-------------|
| Task 1 (TDD) | `src/lib/gltfSilhouette.ts`, `tests/lib/gltfSilhouette.test.ts` | Write 6 unit tests first (red); implement `convexHull2D`, `computeTopDownSilhouette`, `getCachedSilhouette`, `loadGltfScene`; green |
| Task 2 | `src/canvas/fabricSync.ts` | Branch `renderProducts` on `product.gltfId`; swap `fabric.Rect` for `fabric.Polygon` when hull available; rename `onImageReady` → `onAssetReady`; update `FabricCanvas.tsx` callsite |
| Task 3 | `src/test-utils/gltfDrivers.ts`, `src/canvas/FabricCanvas.tsx` | Add `__getProductRenderShape` driver; register `window.__fabricCanvas` in FabricCanvas test mode |
| Task 4 | `e2e/gltf-render-2d.spec.ts` | 4 Playwright scenarios (E1–E4 above) |

---

## Common Pitfalls

### Pitfall 1: Stale matrixWorld
**What goes wrong:** Vertices appear at origin or wrong positions in the projection.
**Why it happens:** `updateWorldMatrix` is not called after parsing — freshly parsed scene has identity matrixWorld on all nodes.
**How to avoid:** Always call `scene.updateMatrixWorld(true, true)` before traverse. (Confirmed pattern from `GltfProduct.tsx:41`.)

### Pitfall 2: path="" breaks external-reference GLTF files
**What goes wrong:** `.gltf` files (not `.glb`) that reference external `.bin` files fail to parse because GLTFLoader can't resolve relative paths from `""`.
**Why it happens:** `parseAsync(buffer, "")` tells the loader the base path is empty string — relative `./model.bin` becomes `./model.bin` from nowhere.
**How to avoid:** Phase 55 accepts both `.gltf` and `.glb`. For Phase 57 silhouette, using `loadAsync(blobUrl)` instead of `parseAsync` handles external references via the blob URL's base. However, for simplicity: document that external-reference GLTFs require `loadAsync` path. For `box.glb` and most real uploads (self-contained GLBs), `parseAsync("", ...)` works.
**Warning signs:** `parseAsync` resolves with a scene that has zero meshes despite file appearing valid.

### Pitfall 3: InstancedMesh vertex count confusion
**What goes wrong:** A single instanced mesh with 1000 instances returns geometry for 1 instance only — the hull is too small.
**Why it happens:** `geometry.attributes.position` reflects the base geometry, not per-instance placements.
**How to avoid:** Acceptable for Phase 57 — convex hull of the base mesh is a valid conservative bound. Document in code comment.

### Pitfall 4: Hull points not centered on Group origin
**What goes wrong:** Polygon renders offset from the placement center.
**Why it happens:** GLTF authors don't always center their models at origin.
**How to avoid:** Compute hull bbox center, subtract it from all hull points before passing to `fabric.Polygon`. (See §7 `hullCx/hullCz` step.)

---

## Environment Availability

Step 2.6: SKIPPED — no new external dependencies. `three` and `fabric` are already installed; `GLTFLoader` is in the installed `three` package.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (installed; `vite.config.ts`) + Playwright (e2e) |
| Config file | `vite.config.ts` (vitest inline) |
| Quick run command | `npx vitest run tests/lib/gltfSilhouette.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GLTF-RENDER-2D-01 | computeTopDownSilhouette returns hull | unit | `npx vitest run tests/lib/gltfSilhouette.test.ts` | ❌ Wave 0 |
| GLTF-RENDER-2D-01 | getCachedSilhouette async + cache | unit | same | ❌ Wave 0 |
| GLTF-RENDER-2D-01 | GLTF product renders as polygon in 2D | e2e | `npx playwright test e2e/gltf-render-2d.spec.ts` | ❌ Wave 0 |
| GLTF-RENDER-2D-01 | Image-only product still renders rect | e2e | same | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `tests/lib/gltfSilhouette.test.ts` — covers U1–U6
- [ ] `e2e/gltf-render-2d.spec.ts` — covers E1–E4
- [ ] `src/lib/gltfSilhouette.ts` — implementation (created in Task 1)
- [ ] `window.__fabricCanvas` registration in `FabricCanvas.tsx` — needed by driver

---

## Sources

### Primary (HIGH confidence)
- `node_modules/three/examples/jsm/loaders/GLTFLoader.js:548–566` — `parseAsync` API
- `node_modules/three/src/loaders/Loader.js:91` — `loadAsync` API
- `src/canvas/productImageCache.ts:1–27` — FIX-01 async-cache pattern to mirror
- `src/canvas/fabricSync.ts:827–929` — `renderProducts` full function; `data.placedProductId` Group pattern
- `src/three/GltfProduct.tsx:41` — `scene.updateWorldMatrix(true, true)` confirmed pattern
- `src/lib/gltfStore.ts:37` — `getGltf(id)` returns `GltfModel | undefined`
- `src/test-utils/gltfDrivers.ts:47–96` — Phase 56 driver pattern to extend
- CLAUDE.md design system table — `--color-text-muted: #cac3d7` token verification

### Secondary (MEDIUM confidence)
- `.planning/phases/56-gltf-render-3d-01-render-gltf-in-3d/56-RESEARCH.md` — prior blob-URL and world-matrix research
- `.planning/phases/55-gltf-upload-01-gltf-glb-upload-storage/55-RESEARCH.md` — drei blob URL pattern note

---

## Metadata

**Confidence breakdown:**
- GLTFLoader API: HIGH — verified from installed source
- World-transform pattern: HIGH — confirmed from GltfProduct.tsx:41
- Andrew's monotone chain: HIGH — standard algorithm, no library dependency
- fabric.Polygon click-target: HIGH — verified from fabricSync.ts:917–925 (data on Group, not inner child)
- FIX-01 cache pattern: HIGH — verified from productImageCache.ts:1–27
- Token verification: HIGH — confirmed from CLAUDE.md design system table

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (stable stack; no fast-moving deps)
