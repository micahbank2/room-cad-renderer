---
phase: 26-bug-sweep
plan: 01
subsystem: canvas-2d
tags: [fabric, product-image, async-load, react-state, fix-01, bug-fix]

# Dependency graph
requires:
  - phase: 26-bug-sweep
    plan: 00
    provides: RED test (tests/fabricSync.image.test.ts) that locked Pitfall 1 as the real root cause
provides:
  - renderProducts onImageReady callback — additive signal for Group rebuild on async load
  - FabricCanvas productImageTick tick state — forces redraw() re-execution when an image cache entry populates
  - GREEN test contract for FIX-01
affects: [26-03-wave3-verification-and-closeout]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tick-state dependency in a useCallback deps array as a React-idiomatic redraw signal (reusable for any async side-effect whose completion needs to force re-render)"
    - "Additive optional callback parameter on existing render function (no breaking change to other call sites)"

key-files:
  created: []
  modified:
    - src/canvas/fabricSync.ts
    - src/canvas/FabricCanvas.tsx
    - tests/fabricSync.image.test.ts

key-decisions:
  - "Option A (React tick state) chosen over Option B (fabric event) per 26-RESEARCH.md — keeps productImageCache decoupled from Fabric internals and preserves D-02."
  - "onImageReady is additive; existing renderProducts callers continue to work unchanged."
  - "Functional setState (t => t + 1) used to tolerate concurrent image loads without stale closures (D-03)."
  - "fc.renderAll() preserved inside the onReady callback — keeps immediate repaint path for any already-rebuilt Groups; onImageReady only adds the Group-rebuild signal on top."

requirements-completed: [FIX-01]

# Metrics
duration: 12min
completed: 2026-04-20
---

# Phase 26 Plan 01: FIX-01 Product Image Rebuild Summary

**Product thumbnails now render in the 2D canvas within one render cycle of their async image load — the cache's onReady now signals FabricCanvas to re-run `renderProducts`, which rebuilds the product Group with the FabricImage child (Pitfall 1 resolved).**

## Performance

- **Duration:** ~12 min
- **Tasks:** 1 (Task 1-01 — single auto task)
- **Files modified:** 3
- **Production diff:** 18 lines added / 3 lines changed (under the 20-line research estimate)

## Path Taken: Code Fix (not stale-close)

Wave 0 confirmed the RED test failed against current main — Pitfall 1 is real. D-04 stale-close path NOT triggered. Implemented Option A from 26-RESEARCH.md verbatim.

## Accomplishments

- **Root cause neutralized.** The productImageCache onReady fired but `fc.renderAll()` only re-painted the existing (image-less) Group. Now onReady also invokes `onImageReady`, which bumps a `productImageTick` React state in FabricCanvas. That tick is in the `redraw` useCallback's dependency array, so the next React commit recomputes `redraw`, the outer `useEffect(() => redraw(), [redraw])` fires, `fc.clear()` is called, and `renderProducts` re-runs — this time `getCachedImage` returns the populated image, the Group is built with a FabricImage child, and the thumbnail paints.
- **Zero coupling to fabric internals or productImageCache module.** Signal travels: cache onReady → renderProducts onImageReady param → FabricCanvas setState → React re-render → redraw. D-02 preserved.
- **Phase 25 semantics preserved.** `renderOnAddRemove: false` still holds; every paint still coalesces through an explicit `fc.renderAll()`; the full-redraw contract (fc.clear + re-build) is the only mutation path.
- **RED flipped to GREEN.** `tests/fabricSync.image.test.ts` was failing in Wave 0; after this plan it asserts the Group contains a FabricImage child AND the tick fired ≥1 time, and passes cleanly.
- **No regressions.** Full suite went from 186 passing / 7 failing (Wave 0 baseline) → 187 passing / 6 failing. The one failure that flipped is the new GREEN. The 6 remaining failures are pre-existing unrelated tests (productStore mock expectations — untouched by this plan).

## Exact Lines Changed

### src/canvas/fabricSync.ts

```diff
 export function renderProducts(
   fc: fabric.Canvas,
   placedProducts: Record<string, PlacedProduct>,
   productLibrary: Product[],
   scale: number,
   origin: { x: number; y: number },
-  selectedIds: string[]
+  selectedIds: string[],
+  onImageReady?: () => void,
 ) {
```

```diff
     if (!showPlaceholder && product!.imageUrl) {
-      const cachedImg = getCachedImage(product!.id, product!.imageUrl, () => fc.renderAll());
+      const cachedImg = getCachedImage(product!.id, product!.imageUrl, () => {
+        // fc.renderAll() repaints existing objects; onImageReady signals the
+        // caller (FabricCanvas) to re-invoke renderProducts so the Group
+        // rebuilds and includes the newly-cached FabricImage child (FIX-01).
+        fc.renderAll();
+        onImageReady?.();
+      });
```

### src/canvas/FabricCanvas.tsx

```diff
   const [wainscotEditSide, setWainscotEditSide] = useState<WallSide>("A");
+  // FIX-01: bumping this tick forces redraw() to re-execute (and rebuild the
+  // product Group) when an async product image finishes loading.
+  const [productImageTick, setProductImageTick] = useState(0);
```

```diff
-    // 4. Products
-    renderProducts(fc, placedProducts, productLibrary, scale, origin, selectedIds);
+    // 4. Products — onImageReady bumps the tick so this redraw re-runs once
+    // the async image load populates the cache, rebuilding the product Group
+    // with the FabricImage child (FIX-01). Functional setState avoids stale
+    // closures when multiple products finish loading concurrently (D-03).
+    renderProducts(
+      fc, placedProducts, productLibrary, scale, origin, selectedIds,
+      () => setProductImageTick((t) => t + 1),
+    );
```

```diff
-  }, [room, walls, ..., customCatalog]);
+  }, [room, walls, ..., customCatalog, productImageTick]);
```

### tests/fabricSync.image.test.ts

Adapted the RED test into a two-phase contract: `doRender()` performs `fc.clear()` + `renderProducts(..., onImageReady)`; the onImageReady callback increments `tick` and recurses into `doRender()`, simulating what FabricCanvas does via React state. Asserts Group contains FabricImage child AND tick ≥ 1.

## Task Commits

1. **Task 1-01: Wire image-loaded signal into FabricCanvas redraw** — `a655785` (fix)

_Metadata commit follows this summary._

## Test Outcomes

| Test | Before Plan 26-01 | After Plan 26-01 |
|------|-------------------|------------------|
| `tests/fabricSync.image.test.ts` | 1 failing (RED) | **1 passing (GREEN)** |
| `tests/productImageCache.test.ts` | 3 passing | 3 passing |
| `tests/dragIntegration.test.ts` | 3 passing | 3 passing |
| Full suite | 186 passed / 7 failed | **187 passed / 6 failed** |

The 6 remaining failures are pre-existing (productStore mock expectations) and unrelated to this plan's surface — they were red in Wave 0 and remain red here.

## Decisions Made

- **D-04 not invoked.** The RED test genuinely failed against current code; no stale-close applied to issue #42.
- **Option A selected** over Option B per research guidance. React state tick is idiomatic, decouples cache from fabric internals, and preserves D-02 (productImageCache unchanged).
- **Functional setState form (t => t + 1).** Guards against stale closures if two products finish loading in the same microtask burst.

## Deviations from Plan

**One deviation — test adaptation expanded to include `fc.clear()`.** The plan snippet for the updated test called `renderProducts` twice in sequence without clearing the canvas between calls. That left the stale (image-less) Group on the canvas alongside the rebuilt Group, and `fc.getObjects().find(...)` returned the first (stale) match so `hasImage` stayed false. Added `fc.clear()` at the top of `doRender()` — this faithfully mirrors what the real `FabricCanvas.redraw()` does (lines 142-143 of FabricCanvas.tsx: `fc.clear(); fc.backgroundColor = "#12121d";`) and is required for the test to model the production render pipeline accurately. No production-code semantics changed. Classified as **Rule 3 (blocking issue): test fidelity to production behavior** — needed to actually verify the fix.

## Issues Encountered

- Initial test run still failed after the fix was in place. Root cause: the test's second `renderProducts` invocation was adding a new Group without removing the old image-less Group. Fixed by calling `fc.clear()` at the start of each `doRender()` — matches what FabricCanvas.redraw() does in production. One iteration, no other blockers.

## User Setup Required

None — unit-tested change. Manual 2D smoke (drop product with imageUrl → see thumbnail) deferred to Plan 03 per D-10.

## Next Phase Readiness

- **Plan 26-02 (FIX-02 ceiling preset material):** Unblocked. Wave 0 redirected this plan away from persistence toward UI wiring / tier-resolution timing / visual perception. This plan's fix does not interact with ceiling surfaces at all.
- **Plan 26-03 (verify + closeout):** Will assert `tests/fabricSync.image.test.ts` GREEN against main, then move issue #42 to closed with the merge commit as evidence. Manual 2D smoke (place product with image → thumbnail visible on fresh canvas, then reload → thumbnail still visible) remains in Plan 03's checklist.

## Self-Check: PASSED

Verified:
- `src/canvas/fabricSync.ts` contains `onImageReady` (3 occurrences — signature + usage + comment).
- `src/canvas/FabricCanvas.tsx` contains `productImageTick` (3 semantic occurrences: declaration, setter call, dep array).
- `src/canvas/FabricCanvas.tsx` contains the functional setState form `setProductImageTick((t) => t + 1)`.
- `git diff src/canvas/productImageCache.ts` produces zero output — file unchanged (D-02 preserved).
- Commit `a655785` exists in `git log --oneline` referencing `26-01` and `FIX-01`.
- `npm run test -- --run tests/fabricSync.image.test.ts` → 1 passed (GREEN).
- `npm run test -- --run tests/productImageCache.test.ts` → 3 passed (no regression).
- `npm run test -- --run tests/dragIntegration.test.ts` → 3 passed (no regression).
- Full suite: 187 passed / 6 failed — exactly one net flip from Wave 0 baseline (186 → 187 passing, 7 → 6 failing), all pre-existing failures unchanged.

---
*Phase: 26-bug-sweep*
*Completed: 2026-04-20*
