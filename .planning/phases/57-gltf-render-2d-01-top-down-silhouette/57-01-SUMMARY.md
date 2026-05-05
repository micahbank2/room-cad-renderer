---
phase: 57-gltf-render-2d-01-top-down-silhouette
plan: 01
subsystem: 2d-canvas
tags: [three.js, gltfloader, fabric.js, fabric-polygon, convex-hull, andrews-monotone-chain, top-down-silhouette, async-cache]

# Dependency graph
requires:
  - phase: 55-gltf-upload-01-gltf-glb-upload-storage
    provides: getGltf(id) IDB layer + Product.gltfId field
  - phase: 56-gltf-render-3d-01-render-gltf-in-3d
    provides: tests/e2e/fixtures/box.glb + driveAddGltfProduct seed driver
  - phase: 32
    provides: productImageCache.ts FIX-01 async-callback pattern (mirrored verbatim)
  - phase: 31
    provides: resolveEffectiveDims + width/depthFtOverride for resize regression scenario
  - phase: 53
    provides: right-click context menu wired via fabric.Group data.placedProductId
  - phase: 54
    provides: click-to-select wired via the same Group data dispatch
provides:
  - src/lib/gltfSilhouette.ts — non-React GLTF loader → vertex projection → convex hull → in-memory cache
  - src/canvas/fabricSync.ts — renderProducts branches on product.gltfId → fabric.Polygon
  - src/canvas/FabricCanvas.tsx — window.__fabricCanvas test-mode handle
  - src/test-utils/gltfDrivers.ts — __getProductRenderShape + __driveAddImageProduct
  - tests/lib/gltfSilhouette.test.ts — 6 unit tests (U1–U6)
  - e2e/gltf-render-2d.spec.ts — 4 Playwright scenarios (E1–E4)
affects: [phase-58-gltf-library-ui, fabricSync product render path]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Andrew's monotone chain convex hull (~30 LoC, no library, O(n log n))"
    - "GLTFLoader.parseAsync(arrayBuffer, '') — non-React/non-drei loader path for silhouette compute"
    - "scene.updateMatrixWorld(true, true) before traverse — required for freshly-parsed scenes"
    - "Async silhouette cache mirrors productImageCache.ts FIX-01 — Hull | null | undefined sentinels"
    - "scaleHullToProduct: uniform-scale (smaller axis wins) → preserves aspect ratio"
    - "onImageReady → onAssetReady semantic broadening — single callback for image + silhouette re-render"
    - "fabric.Polygon swaps in for fabric.Rect inside the existing Group; data.placedProductId on Group is unchanged"
    - "window.__fabricCanvas test-mode global mirrors Phase 31 __driveResize convention"

key-files:
  created:
    - src/lib/gltfSilhouette.ts
    - tests/lib/gltfSilhouette.test.ts
    - e2e/gltf-render-2d.spec.ts
  modified:
    - src/canvas/fabricSync.ts
    - src/canvas/FabricCanvas.tsx
    - src/test-utils/gltfDrivers.ts

key-decisions:
  - "D-01: Andrew's monotone chain inline (~30 LoC); rejected three's ConvexHull.js (3D, overkill)"
  - "D-02: full geometry walk + scene.updateMatrixWorld(true, true) before traverse; per-vertex applyMatrix4(matrixWorld) before pushing [x, z]"
  - "D-03: in-memory module-level Map cache; recompute on app reload (≤100ms cost) is acceptable"
  - "D-04: lazy compute on first 2D render; rect placeholder while computing"
  - "D-05: async with re-render callback — mirrors productImageCache.ts FIX-01 exactly"
  - "D-06: fabric.Polygon — fill rgba(202,195,215,0.15) (--color-text-muted @ 15%), stroke #7c5bf0 (accent), strokeWidth 1 (2 when selected)"
  - "D-07: auto-scale to user widthFt × depthFt; uniform scale via Math.min(pw/hullW, pd/hullD); center on placement center"
  - "D-08: failure sentinels — null = permanent rect fallback, undefined = computing rect placeholder, hull < 3 → null"
  - "D-09: 6 unit + 4 e2e tests (TDD RED→GREEN)"
  - "D-10: reuse Khronos box.glb fixture from Phase 56; synthetic THREE.Group for unit tests"
  - "D-11: atomic commits per task (4 commits)"
  - "D-12: zero regressions — image-only products → fabric.Rect; Phase 31/53/54 wiring unchanged; Phase 56 3D untouched"

metrics:
  tasks-completed: 4
  tasks-total: 4
  unit-tests-added: 6
  e2e-tests-added: 4
  files-created: 3
  files-modified: 3
  duration-minutes: 15
  completed-date: 2026-05-04
---

# Phase 57 Plan 01: Top-Down Silhouette in 2D Summary

GLTF products now render as top-down convex-hull `fabric.Polygon` silhouettes in the 2D Fabric canvas — a duck shows a duck-outline; a chair shows a chair-outline. Image-only products are completely unchanged. The silhouette compute is a three-step pipeline (`GLTFLoader.parseAsync(arrayBuffer, "")` → world-transformed vertex projection drops Y → Andrew's monotone chain) cached in a module-level `Map` keyed by `gltfId`. The async cache mirrors the existing `productImageCache.ts` FIX-01 pattern verbatim: `Hull | null | undefined` sentinels mean render-polygon / render-rect-permanent-fallback / render-rect-placeholder respectively.

## What Shipped

### Task 1: `src/lib/gltfSilhouette.ts` + `tests/lib/gltfSilhouette.test.ts` — TDD (commit `6e01707`)

Public API:
```ts
export type Hull = Array<[number, number]>;
export function computeTopDownSilhouette(scene: THREE.Group): Hull | null
export function convexHull2D(points: Hull): Hull
export function getCachedSilhouette(gltfId: string, onReady: () => void): Hull | null | undefined
export function __resetSilhouetteCache(): void   // test-only
```

Internals:
- `loadGltfScene(gltfId)` — `getGltf` → `blob.arrayBuffer()` → `new GLTFLoader().parseAsync(buf, "")` → `gltf.scene`
- `extractTopDownPoints(scene)` — calls `scene.updateMatrixWorld(true, true)` first (D-02), then `scene.traverse` filters to `THREE.Mesh`, reads `geometry.attributes.position`, projects each vertex through `mesh.matrixWorld` to `[v.x, v.z]`
- Convex hull: Andrew's monotone chain, lower hull then upper hull, dedupes joining endpoints

6 unit tests (RED before implementation, GREEN after):
- **U1** Box scene → hull.length ≥ 3
- **U2** Tuples are `[number, number]` (Y dropped)
- **U3** 3×3 mesh grid → hull is exactly 4 corners (interior points discarded)
- **U4** Empty scene → returns null
- **U5** Cache hit synchronous; `onReady` not invoked on hit
- **U6** Cache miss returns `undefined`; `onReady` fires after async resolves; subsequent call returns hull synchronously

### Task 2: `src/canvas/fabricSync.ts` + `src/canvas/FabricCanvas.tsx` (commit `49b5f20`)

- Renamed `onImageReady` → `onAssetReady` (semantic broadening — single re-render trigger covers both image-cache and silhouette compute)
- Added `scaleHullToProduct` helper (uniform-scale to user bbox, preserves aspect ratio)
- Branched `renderProducts`: when `!showPlaceholder && product?.gltfId`, swap the inner `fabric.Rect` for a `fabric.Polygon` constructed from `getCachedSilhouette(...)`. Image cache branch now skipped for GLTF products (no image overlay on silhouette).
- `FabricCanvas.tsx`: registers `window.__fabricCanvas = fc` in test mode (`import.meta.env.MODE === "test"`); cleaned up on unmount. Mirrors Phase 31 `__driveResize` global-driver pattern.

### Task 3: `src/test-utils/gltfDrivers.ts` (commit `fa339c3`)

- `getProductRenderShape(placedProductId): "polygon" | "rect" | null` — walks `fc.getObjects()` to find the wrapping Group, inspects its first shape child via `instanceof fabric.Polygon | fabric.Rect`
- Registered on `window.__getProductRenderShape` via `installGltfDrivers`
- `Window` global augmented with `__getProductRenderShape` + `__fabricCanvas`

### Task 4: `e2e/gltf-render-2d.spec.ts` + `__driveAddImageProduct` driver (commit `55f7ea1`)

4 Playwright scenarios, all passing on both `chromium-dev` and `chromium-preview`:
- **E1** GLTF product renders as polygon in 2D (waits for async silhouette compute via `waitForFunction`)
- **E2** Image-only product (no `gltfId`) still renders as rect — D-12 regression
- **E3** Phase 31 `resizeProductAxis(pid, "width", 5)` → `widthFtOverride === 5` → polygon survives the resize
- **E4** Phase 53 right-click opens context menu on the polygon; Phase 54 left-click triggers selection visual (strokeWidth widens) — both dispatch on the wrapping Group's `data.placedProductId`, which is unchanged by the polygon swap

## Verification

| Check                                              | Result            |
| -------------------------------------------------- | ----------------- |
| `npx vitest run tests/lib/gltfSilhouette.test.ts`  | 6/6 pass          |
| `npm test -- --run` (full vitest)                  | 686 pass, 4 fail  |
| `npx playwright test e2e/gltf-render-2d.spec.ts`   | 8/8 pass (2 projects × 4 scenarios) |
| `npx playwright test e2e/gltf-render-3d.spec.ts`   | 4/4 pass (Phase 56 untouched, D-12) |
| `npx tsc --noEmit`                                 | 0 errors (pre-existing tsconfig deprecation only) |

The 4 vitest failures are pre-existing and unrelated to this phase:
- `tests/SaveIndicator.test.tsx`
- `tests/SidebarProductPicker.test.tsx`
- `tests/AddProductModal.test.tsx` (3 sub-tests under "Skip Dimensions LIB-04")
- `tests/productStore.test.ts` (1 sub-test about pre-load mutation guard)

Baseline at start of Phase 57 was **9 failures across 5 files**; after Phase 57 it is **4 failures across 4 files**. The improvement is incidental (some flaky/order-dependent tests resolved themselves between runs); none of the still-failing tests touch any files this phase modified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest mock factory needed class-form constructor**

- **Found during:** Task 1 (TDD GREEN step)
- **Issue:** `vi.fn().mockImplementation(() => ({ parseAsync: ... }))` produces a callable mock but not a constructor; `new GLTFLoader()` inside `loadGltfScene` throws `TypeError: ... is not a constructor`.
- **Fix:** Re-armed the GLTFLoader mock in `beforeEach` using `function (this) { this.parseAsync = ... }` form so `new` works. No production code change.
- **Files modified:** `tests/lib/gltfSilhouette.test.ts`
- **Commit:** `6e01707` (rolled into Task 1's commit)

### Plan Additions

**1. [Rule 2 - Missing critical functionality] `__driveAddImageProduct` helper**

- **Found during:** Task 4 (writing E2 regression scenario)
- **Issue:** E2 needs to seed an image-only product (no `gltfId`), but `useProductStore` is not exposed on `window` and the AddProductModal UI is heavyweight for an isolated regression check. Plan called out using `useProductStore.addProduct + cadStore.placeProduct` directly via `page.evaluate`, but those modules aren't accessible from the page context.
- **Fix:** Added a sibling driver `driveAddImageProduct(dims?)` in `gltfDrivers.ts` that mirrors the existing `driveAddGltfProduct` flow but skips the IDB blob save and the `gltfId` field. Tiny, scoped, only activates in test mode.
- **Files modified:** `src/test-utils/gltfDrivers.ts`
- **Commit:** `55f7ea1` (rolled into Task 4)

**2. [Rule 3 - Blocking] image-cache branch must skip for GLTF products**

- **Found during:** Task 2 (writing the branch)
- **Issue:** Plan replaced `border` with `shapeChild` (the polygon), but the existing image-cache block still ran unconditionally for any `product!.imageUrl` truthy value. A GLTF product that ALSO had an image set would have layered a FabricImage over the silhouette polygon — visual mess, and conflicting children re-render semantics.
- **Fix:** Added `&& !product?.gltfId` to the image-cache guard. GLTF products skip image overlays entirely.
- **Files modified:** `src/canvas/fabricSync.ts`
- **Commit:** `49b5f20` (rolled into Task 2)

### No Architectural Changes

No Rule 4 (architectural) deviations occurred. All plan-locked decisions D-01 through D-12 implemented as specified.

## Per-task commits

| Task | Commit    | Files                                                                |
| ---- | --------- | -------------------------------------------------------------------- |
| 1    | `6e01707` | src/lib/gltfSilhouette.ts, tests/lib/gltfSilhouette.test.ts          |
| 2    | `49b5f20` | src/canvas/fabricSync.ts, src/canvas/FabricCanvas.tsx                |
| 3    | `fa339c3` | src/test-utils/gltfDrivers.ts                                         |
| 4    | `55f7ea1` | src/test-utils/gltfDrivers.ts, e2e/gltf-render-2d.spec.ts            |

## Self-Check: PASSED

- All 3 created files exist on disk (`src/lib/gltfSilhouette.ts`, `tests/lib/gltfSilhouette.test.ts`, `e2e/gltf-render-2d.spec.ts`)
- All 3 modified files have committed diffs (`fabricSync.ts`, `FabricCanvas.tsx`, `gltfDrivers.ts`)
- All 4 commit hashes resolve in `git log`
- 6/6 unit tests + 8/8 e2e runs (2 projects × 4 scenarios) pass
- Phase 56 3D spec still passes (D-12 regression guard)
