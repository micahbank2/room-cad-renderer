---
phase: 26-bug-sweep
plan: 01
type: execute
wave: 1
depends_on: [26-00]
files_modified:
  - src/canvas/fabricSync.ts
  - src/canvas/FabricCanvas.tsx
  - tests/fabricSync.image.test.ts
autonomous: true
requirements: [FIX-01]
must_haves:
  truths:
    - "Placing a product with an imageUrl results in a product Group that contains a FabricImage child after the async image load completes, within the same render cycle triggered by the load (no user interaction required)"
    - "The productImageCache Promise-dedup abstraction is preserved unchanged (D-02)"
    - "Phase 25 full-redraw semantics (renderOnAddRemove: false + explicit redraw on store change) are preserved; no incremental-update side channel introduced"
    - "The Wave 0 RED test tests/fabricSync.image.test.ts is now GREEN"
    - "First-paint correctness is prioritized over concurrent-load dedup (D-03)"
  artifacts:
    - path: "src/canvas/fabricSync.ts"
      provides: "renderProducts with a rebuild trigger on image load (Group rebuilt, not just renderAll)"
      contains: "getCachedImage"
    - path: "src/canvas/FabricCanvas.tsx"
      provides: "redraw signal that fires when an async product image finishes loading"
      contains: "renderProducts"
  key_links:
    - from: "productImageCache onReady callback"
      to: "FabricCanvas.tsx redraw() (re-invokes renderProducts)"
      via: "store signal OR React tick state — not fc.renderAll() alone"
      pattern: "renderProducts"
    - from: "tests/fabricSync.image.test.ts"
      to: "src/canvas/fabricSync.ts renderProducts"
      via: "post-onload assertion that Group contains FabricImage"
      pattern: "fabric.FabricImage"
---

<objective>
Fix FIX-01: Product thumbnails render in the 2D canvas within one render cycle after image onload (issue #42). Root cause hypothesis (26-RESEARCH.md Pitfall 1): `productImageCache` calls `fc.renderAll()` on load, but `renderAll()` only re-paints existing fabric objects — it does NOT rebuild the product `Group` to include the newly-available `FabricImage` child. The correct trigger must invalidate the React dependency array or call `redraw()` so `renderProducts()` re-executes and rebuilds the Group.

**Pre-fix gate:** This plan depends on 26-00. If Plan 00's Task 0-01 test passed unexpectedly (GREEN), this plan becomes a stale-close: document in SUMMARY, close issue #42 with repro evidence per D-04, and skip the code change. Otherwise proceed.

Preserve (per decisions):
- `productImageCache.ts` unchanged (D-02)
- Tier resolution / UI write paths in fabric objects unchanged
- `renderOnAddRemove: false` and explicit redraw semantics (Phase 25)

Purpose: Restore the observable user promise — place a product, see the thumbnail, on reload the thumbnail is there too.

Output: A minimal fix (< 20 lines per research estimate) plus a GREEN test from Plan 00.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/26-bug-sweep/26-CONTEXT.md
@.planning/phases/26-bug-sweep/26-RESEARCH.md
@.planning/phases/26-bug-sweep/26-VALIDATION.md
@.planning/phases/26-bug-sweep/26-00-wave0-red-tests-SUMMARY.md

@src/canvas/fabricSync.ts
@src/canvas/FabricCanvas.tsx
@src/canvas/productImageCache.ts
@tests/fabricSync.image.test.ts

<interfaces>
<!-- Current production code shape to change — minimal surface. -->

From src/canvas/fabricSync.ts (line 868-880 — exact current code):
```typescript
if (!showPlaceholder && product!.imageUrl) {
  const cachedImg = getCachedImage(product!.id, product!.imageUrl, () => fc.renderAll());
  if (cachedImg) {
    const fImg = new fabric.FabricImage(cachedImg, { ... });
    children.splice(1, 0, fImg);
  }
}
```

From src/canvas/FabricCanvas.tsx (line 183 — renderProducts invocation inside redraw()):
```typescript
renderProducts(fc, placedProducts, productLibrary, scale, origin, selectedIds);
```

The redraw() useCallback's dependency array (line 199) is:
```typescript
}, [room, walls, placedProducts, productLibrary, activeTool, selectedIds, showGrid, userZoom, panOffset, floorPlanImage, ceilings, placedCustoms, customCatalog]);
```

No current entry causes renderProducts to re-run when an async image finishes loading — this is the bug surface.

From src/canvas/productImageCache.ts:
```typescript
export function getCachedImage(productId: string, url: string, onReady: () => void): HTMLImageElement | null;
// onReady fires exactly once when cache populates. DO NOT MODIFY — per D-02.
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1-01: Wire the image-loaded signal into FabricCanvas redraw so renderProducts rebuilds the Group</name>
  <files>src/canvas/fabricSync.ts, src/canvas/FabricCanvas.tsx, tests/fabricSync.image.test.ts</files>
  <read_first>
    - src/canvas/fabricSync.ts (lines 800-920 — entire renderProducts, and its exported signature at top of file so you can add an optional `onImageReady?: () => void` param without breaking other callers)
    - src/canvas/FabricCanvas.tsx (all — specifically lines 75-200 to see the existing `useState`/`useCallback` patterns, the redraw() dependency array, and how FabricCanvas already uses `useState` for things like `bgImageCache` handling at lines 160-170)
    - src/canvas/productImageCache.ts (all 37 lines — DO NOT MODIFY, but read to confirm the onReady contract)
    - .planning/phases/26-bug-sweep/26-00-wave0-red-tests-SUMMARY.md (outcome of Task 0-01; if GREEN, STOP — see stale-close path below)
    - .planning/phases/26-bug-sweep/26-RESEARCH.md (Code Examples → Option A is the recommended fix shape; the task below implements Option A)
    - tests/fabricSync.image.test.ts (the RED test that must turn GREEN)
  </read_first>
  <behavior>
    - After `renderProducts` is called and a product Group is created without a FabricImage child (cache miss), when the async image onload fires, a subsequent re-invocation of `renderProducts` happens within one render cycle and the resulting Group contains a `fabric.FabricImage` child.
    - Existing tests continue to pass (no regression in productImageCache.test.ts, dragIntegration.test.ts, etc.).
    - The fix does NOT modify `productImageCache.ts`.
    - The fix does NOT change any wall, door, window, ceiling, or custom-element render behavior.
    - If the RED test was unexpectedly GREEN at Wave 0, no production code change is made; instead, the task is documented as a stale-close.
  </behavior>
  <action>
    Step 1 — Gate check:
    - Read `.planning/phases/26-bug-sweep/26-00-wave0-red-tests-SUMMARY.md`.
    - IF Task 0-01's outcome was GREEN (test unexpectedly passed against current main): STOP the code change. Add a one-line comment-level marker to the plan SUMMARY, skip Step 2 entirely, and in the final commit message note "FIX-01 closed as stale per D-04 — RED test passed against current code; no fix applied." The manual close-out for issue #42 happens in Plan 03.
    - ELSE (RED test failed as expected): Proceed to Step 2.

    Step 2 — Implement Option A (from research Code Examples) — React tick state in FabricCanvas that makes renderProducts re-run on image load:

    (a) Modify `src/canvas/fabricSync.ts` — extend `renderProducts` with an optional callback parameter that is invoked INSIDE the getCachedImage onReady callback (instead of calling `fc.renderAll()` directly). Add the parameter at the end so existing call sites don't break. Exact edit at line ~868-870:
    ```typescript
    // BEFORE (line 868):
    export function renderProducts(
      fc: fabric.Canvas,
      placedProducts: Record<string, PlacedProduct>,
      productLibrary: Product[],
      scale: number,
      origin: { x: number; y: number },
      selectedIds: string[],
    ): void { ... }

    // AFTER:
    export function renderProducts(
      fc: fabric.Canvas,
      placedProducts: Record<string, PlacedProduct>,
      productLibrary: Product[],
      scale: number,
      origin: { x: number; y: number },
      selectedIds: string[],
      onImageReady?: () => void,
    ): void { ... }
    ```
    And inside the function body at line ~870:
    ```typescript
    // BEFORE:
    const cachedImg = getCachedImage(product!.id, product!.imageUrl, () => fc.renderAll());

    // AFTER:
    const cachedImg = getCachedImage(product!.id, product!.imageUrl, () => {
      fc.renderAll();
      onImageReady?.();
    });
    ```
    Rationale: `fc.renderAll()` stays as-is for immediate re-paint correctness (zero regression risk). The new `onImageReady` callback is the signal that drives a Group rebuild. This is additive — existing callers keep working.

    (b) Modify `src/canvas/FabricCanvas.tsx` — add a `useState` tick that, when bumped, participates in the `redraw` useCallback's dependency array and therefore forces the canvas to re-run all render* functions (which rebuilds the product Group):
    ```typescript
    // Near the top of the FabricCanvas component, alongside existing useRef / useState:
    const [productImageTick, setProductImageTick] = useState(0);

    // In the redraw useCallback body, pass the callback through:
    renderProducts(
      fc, placedProducts, productLibrary, scale, origin, selectedIds,
      () => setProductImageTick((t) => t + 1),
    );

    // Add `productImageTick` to the redraw useCallback's dependency array
    // (currently line ~199) so redraw() recomputes when the tick changes.
    ```
    IMPORTANT notes:
    - Use the FUNCTIONAL setState form `(t) => t + 1` to avoid stale closures during concurrent loads (D-03 accepts double-load in the name of first-paint correctness).
    - Place the state DECLARATION BEFORE the redraw useCallback so it is in scope.
    - Add `productImageTick` to BOTH the redraw useCallback deps AND the outer `useEffect(() => { redraw(); }, [redraw])` chain will re-fire correctly since redraw identity changes.

    (c) Update `tests/fabricSync.image.test.ts` — adapt the RED test to exercise the new onImageReady callback:
    ```typescript
    // Replace the single-render body with a two-phase render that simulates
    // what FabricCanvas does: first renderProducts call schedules onReady;
    // when onReady fires we re-invoke renderProducts (simulating React tick).
    it("rebuilds the product Group to include a FabricImage child after onload fires", async () => {
      const ONE_PX_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
      const fc = new fabric.Canvas(null as unknown as HTMLCanvasElement, { renderOnAddRemove: false });
      const productLibrary = [{ id: "prod_A", name: "Sofa", category: "seating", width: 6, depth: 3, height: 3, imageUrl: ONE_PX_PNG }];
      const placedProducts = { pp_1: { id: "pp_1", productId: "prod_A", position: { x: 5, y: 5 }, rotation: 0 } };

      let tick = 0;
      const doRender = () => renderProducts(
        fc, placedProducts as any, productLibrary as any, 20, { x: 0, y: 0 }, [],
        () => { tick++; doRender(); }, // simulate React re-render on image load
      );
      doRender();
      await new Promise((r) => setTimeout(r, 30));

      const group = fc.getObjects().find(
        (o: any) => o.data?.type === "product" && o.data?.placedProductId === "pp_1"
      ) as fabric.Group | undefined;
      expect(group).toBeDefined();
      const hasImage = group!.getObjects().some((child: any) => child instanceof fabric.FabricImage);
      expect(hasImage).toBe(true);
      expect(tick).toBeGreaterThanOrEqual(1);
    });
    ```

    Commit message: `fix(26-01): rebuild product Group on async image load (FIX-01)`
    (Or, if stale-close path: `docs(26-01): close FIX-01 as stale per D-04 — no code change`.)
  </action>
  <verify>
    <automated>npm run test -- --run tests/fabricSync.image.test.ts tests/productImageCache.test.ts tests/dragIntegration.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -n "onImageReady" src/canvas/fabricSync.ts` returns at least 2 matches (signature + usage).
    - `grep -n "productImageTick" src/canvas/FabricCanvas.tsx` returns at least 3 matches (declaration, setter call, dep array).
    - `grep -n "setProductImageTick((t) => t + 1)" src/canvas/FabricCanvas.tsx` returns at least 1 match (functional setState form).
    - `git diff src/canvas/productImageCache.ts` produces ZERO output (file unchanged per D-02).
    - `npm run test -- --run tests/fabricSync.image.test.ts` passes (GREEN).
    - `npm run test -- --run tests/productImageCache.test.ts` passes (no regression in existing cache tests).
    - `npm run test -- --run tests/dragIntegration.test.ts` passes (no regression in Phase 25 drag fast-path).
    - If stale-close path was taken: `git diff src/canvas/` and `git diff src/` produce ZERO output; commit message notes "closed as stale per D-04".
  </acceptance_criteria>
  <done>
    FIX-01 product Group rebuilds on async image load; Wave 0 RED test is GREEN; no modifications to productImageCache.ts; no regressions in existing tests; issue #42 is either fixed (code path) or ready-to-close (stale path).
  </done>
</task>

</tasks>

<verification>
- `npm run test -- --run` full suite: same failure set as baseline (expect 179+ passing, new test added as GREEN).
- `git log --oneline -5` shows a commit referencing `26-01` and `FIX-01`.
- Manual smoke (deferred to Plan 03 D-10): place a product with image → thumbnail visible within one render cycle on fresh canvas.
</verification>

<success_criteria>
- Wave 0 RED test for FIX-01 is now GREEN.
- productImageCache.ts unchanged (D-02 preserved).
- Full suite passes.
- Minimal, < 20-line production diff per research estimate.
</success_criteria>

<output>
After completion, create `.planning/phases/26-bug-sweep/26-01-fix01-product-image-rebuild-SUMMARY.md` recording:
1. Which path was taken: code-fix OR stale-close (D-04).
2. Exact lines changed (or "no change").
3. Test outcome before/after.
4. Any deviations from Option A and why.
</output>
