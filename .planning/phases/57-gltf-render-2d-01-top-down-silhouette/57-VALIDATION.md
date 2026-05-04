---
phase: 57-gltf-render-2d-01-top-down-silhouette
type: validation
requirements: [GLTF-RENDER-2D-01]
created: 2026-05-04
---

# Phase 57: Validation Map — GLTF-RENDER-2D-01

Maps every requirement acceptance criterion to its test path and assertion.

---

## Requirement: GLTF-RENDER-2D-01

> Products with GLTF models render a top-down silhouette in 2D, not a textured rectangle.
> Image-only products continue to show the textured rectangle. Fall back to bbox rectangle
> if silhouette compute fails. No regression on image-only products.

---

## Unit Tests — `tests/lib/gltfSilhouette.test.ts`

Run: `npx vitest run tests/lib/gltfSilhouette.test.ts`

| ID | Description | File | Assertion |
|----|-------------|------|-----------|
| U1 | computeTopDownSilhouette returns ≥ 3 hull vertices for a cube | tests/lib/gltfSilhouette.test.ts | `expect(hull!.length).toBeGreaterThanOrEqual(3)` |
| U2 | All hull vertices are [x, z] tuples — Y axis dropped | tests/lib/gltfSilhouette.test.ts | `hull!.every(p => p.length === 2)` must be true |
| U3 | Interior points discarded — 3×3 grid of 9 coplanar points → 4-corner hull | tests/lib/gltfSilhouette.test.ts | `expect(hull!.length).toBe(4)` |
| U4 | Empty scene (no meshes) → null | tests/lib/gltfSilhouette.test.ts | `expect(computeTopDownSilhouette(emptyScene)).toBeNull()` |
| U5 | getCachedSilhouette cache hit returns hull synchronously; onReady NOT called | tests/lib/gltfSilhouette.test.ts | `expect(onReady).toHaveBeenCalledTimes(0)` after second call |
| U6 | getCachedSilhouette cache miss returns undefined; onReady fires once async; third call is sync hit | tests/lib/gltfSilhouette.test.ts | `expect(result1).toBeUndefined()` → `await vi.waitFor(...)` → `expect(onReady).toHaveBeenCalledTimes(1)` → `expect(result3).not.toBeUndefined()` |

### Setup for U1–U4

```typescript
import * as THREE from "three";

function makeBoxScene(): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2)));
  return g;
}

function makeEmptyScene(): THREE.Group {
  return new THREE.Group(); // no children
}

function make3x3GridScene(): THREE.Group {
  // 9 points on the XZ plane (Y=0)
  // Interior point (0,0,0) must be rejected by convex hull
  const positions = new Float32Array([
    -1,-1,0,  0,-1,0,  1,-1,0,
    -1, 0,0,  0, 0,0,  1, 0,0,
    -1, 1,0,  0, 1,0,  1, 1,0,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo));
  return g;
}
```

### Setup for U5–U6

```typescript
import { vi } from "vitest";
import { getCachedSilhouette, __resetSilhouetteCache } from "@/lib/gltfSilhouette";

vi.mock("@/lib/gltfStore", () => ({
  getGltf: vi.fn().mockResolvedValue({
    blob: new Blob([new Uint8Array(4)]),
    id: "gltf_test",
    sha256: "abc",
    name: "test.glb",
    sizeBytes: 4,
    uploadedAt: 0,
  }),
}));

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: vi.fn().mockImplementation(() => ({
    parseAsync: vi.fn().mockResolvedValue({ scene: makeBoxScene() }),
  })),
}));

beforeEach(() => __resetSilhouetteCache());
```

---

## E2E Tests — `e2e/gltf-render-2d.spec.ts`

Run: `npx playwright test e2e/gltf-render-2d.spec.ts --reporter=line`

| ID | Scenario | Key Assertion | Regression Guard |
|----|----------|---------------|-----------------|
| E1 | Place GLTF product in 2D → polygon | `window.__getProductRenderShape(placedId) === "polygon"` | — |
| E2 | Place image-only product in 2D → rect | `window.__getProductRenderShape(placedId) === "rect"` | Phase 32 PBR pipeline unchanged |
| E3 | Phase 31 edge-resize on GLTF product → still polygon | `__getProductRenderShape` returns "polygon" after `__driveResize(placedId, "E", 2)` | Phase 31 widthFtOverride set in store |
| E4 | Phase 53 right-click + Phase 54 click-to-select on silhouette polygon | context-menu DOM visible; `useUIStore.getState().selectedIds.includes(placedId)` | Both work for non-GLTF products too |

### Driver prerequisite

`window.__fabricCanvas` must be registered by `FabricCanvas.tsx` in test mode (Task 2).
`window.__getProductRenderShape` must be registered by `installGltfDrivers()` in test mode (Task 3).
`window.__driveAddGltfProduct` already registered in Phase 56.
`window.__driveResize` already registered in Phase 31.

### Test fixture

```
tests/e2e/fixtures/box.glb  ← Khronos Box.glb, committed in Phase 56 (~3KB)
```

---

## Regression Guards (D-12)

These must pass after every task commit:

| Guard | How to verify | Phase origin |
|-------|--------------|-------------|
| Image-only products render rect + FabricImage | E2 scenario | Phase 32 |
| Phase 31 widthFtOverride / sizeScale apply to GLTF products | E3 scenario | Phase 31 |
| Phase 53 right-click opens context menu on GLTF product | E4 scenario | Phase 53 |
| Phase 54 click-to-select works on GLTF product | E4 scenario | Phase 54 |
| Phase 56 3D rendering untouched | `npx playwright test e2e/gltf-render-3d.spec.ts` | Phase 56 |
| 6 pre-existing vitest failures unchanged | `npx vitest run` — count stable | All prior phases |

---

## Coverage → Acceptance Criterion Map

| Acceptance Criterion | Covered By |
|---------------------|-----------|
| New `src/lib/gltfSilhouette.ts` computes 2D top-down silhouette | U1–U4 |
| Cached per gltfId in memory | U5, U6 |
| fabric.Polygon rendered instead of fabric.Rect | E1 |
| Fall back to bbox rectangle if compute fails | U4 (null path), U6 (sentinel), fabricSync.ts branch logic |
| No regression on image-only products | E2 |
| Phase 31 overrides work on GLTF products | E3 |
| Phase 53/54 wiring works on polygon | E4 |

---

## Full Verification Commands (ordered)

```bash
# After Task 1 (TDD red→green):
npx vitest run tests/lib/gltfSilhouette.test.ts

# After Task 2:
npx tsc --noEmit

# After Task 3:
npx tsc --noEmit --project tsconfig.json 2>&1 | grep -E "gltfDrivers|error TS"

# After Task 4:
npx playwright test e2e/gltf-render-2d.spec.ts --reporter=line

# Full regression sweep:
npx vitest run
npx playwright test e2e/gltf-render-3d.spec.ts --reporter=line
npx tsc --noEmit
```
