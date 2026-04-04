---
phase: 01-2d-canvas-polish
plan: 01
type: execute
wave: 1
depends_on: [00]
files_modified:
  - src/canvas/productImageCache.ts
  - src/canvas/fabricSync.ts
  - tests/productImageCache.test.ts
autonomous: true
requirements: [EDIT-09]
must_haves:
  truths:
    - "A placed product with product.imageUrl renders its image inside the Fabric group on the 2D canvas (not just a dashed border)"
    - "The image loads asynchronously without blocking redraw; fc.renderAll() is triggered once the cache is populated"
    - "Subsequent redraws render the same product image synchronously from cache"
  artifacts:
    - path: "src/canvas/productImageCache.ts"
      provides: "getCachedImage(productId, url, onReady) and invalidateProduct(productId)"
      exports: ["getCachedImage", "invalidateProduct"]
    - path: "src/canvas/fabricSync.ts"
      provides: "renderProducts integrates getCachedImage and splices FabricImage into group children on hit"
      contains: "getCachedImage"
  key_links:
    - from: "src/canvas/fabricSync.ts"
      to: "src/canvas/productImageCache.ts"
      via: "import { getCachedImage } + call in renderProducts loop"
      pattern: "getCachedImage\\("
    - from: "src/canvas/productImageCache.ts onload"
      to: "fc.renderAll via onReady callback"
      via: "onReady() invoked once per image"
      pattern: "onReady"
---

<objective>
Fix EDIT-09: product images must render visibly on the 2D Fabric canvas. Current code in `fabricSync.ts` lines 155-168 creates an `<img>` synchronously and checks `imgEl.complete && imgEl.naturalWidth > 0` — nearly always false for base64 data URLs from IndexedDB, so only the border renders.

Implement the module-level image cache pattern from 01-RESEARCH.md §Pattern 1 (the RECOMMENDED approach): `Map<productId, HTMLImageElement>` keyed by product.id. On first miss, start loading and return null; on load, cache the image and invoke `onReady()` to trigger `fc.renderAll()`. The subsequent redraw hits the cache and renders synchronously.

Purpose: Unblocks the "Jessica sees her actual furniture" magic moment. EDIT-09 is the highest-priority bug per STATE.md blockers.
Output: Product images render on the 2D canvas within ~1 frame of being decoded.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-2d-canvas-polish/01-RESEARCH.md
@.planning/phases/01-2d-canvas-polish/01-CONTEXT.md
@src/canvas/fabricSync.ts
@src/types/product.ts
@src/types/cad.ts

<interfaces>
From src/canvas/fabricSync.ts (current signature — must not change):
```typescript
export function renderProducts(
  fc: fabric.Canvas,
  placedProducts: Record<string, PlacedProduct>,
  productLibrary: Product[],
  scale: number,
  origin: { x: number; y: number },
  selectedIds: string[]
): void;
```

Product shape (src/types/product.ts):
```typescript
interface Product {
  id: string;
  name: string;
  width: number;  // feet
  depth: number;  // feet
  height: number; // feet
  imageUrl?: string;  // base64 data URL or http URL
  ...
}
```

Fabric v6 image constructor:
```typescript
new fabric.FabricImage(htmlImgElement, { scaleX, scaleY, originX, originY })
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create src/canvas/productImageCache.ts module with cache + onReady contract</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/.planning/phases/01-2d-canvas-polish/01-RESEARCH.md (§Pattern 1, lines 149-197 — exact cache pattern)
    - /Users/micahbank/room-cad-renderer/tests/productImageCache.test.ts (existing stubs to fill)
    - /Users/micahbank/room-cad-renderer/src/canvas/fabricSync.ts (current buggy render logic at lines 154-168)
  </read_first>
  <files>src/canvas/productImageCache.ts, tests/productImageCache.test.ts</files>
  <behavior>
    - Test 1 ("cache hit/miss: returns null on miss, cached HTMLImageElement on hit"): First call to `getCachedImage("p1", url, cb)` returns null. After onload fires, second call returns the HTMLImageElement.
    - Test 2 ("async load: onload populates cache and invokes onReady callback exactly once"): onReady callback is called exactly once per successful load; never called again on subsequent cache hits.
    - Edge: If a second getCachedImage call happens WHILE the first is loading (productId in `loading` Set), return null (don't double-fetch).
    - Edge: onerror removes from `loading` Set but does NOT add to cache and does NOT call onReady.
  </behavior>
  <action>
    Create /Users/micahbank/room-cad-renderer/src/canvas/productImageCache.ts with module-level state:

    ```typescript
    const cache = new Map<string, HTMLImageElement>();
    const loading = new Set<string>();

    export function getCachedImage(
      productId: string,
      url: string,
      onReady: () => void
    ): HTMLImageElement | null {
      const hit = cache.get(productId);
      if (hit) return hit;
      if (loading.has(productId)) return null;

      loading.add(productId);
      const img = new Image();
      img.onload = () => {
        loading.delete(productId);
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          cache.set(productId, img);
          onReady();
        }
      };
      img.onerror = () => {
        loading.delete(productId);
      };
      img.src = url;
      return null;
    }

    export function invalidateProduct(productId: string): void {
      cache.delete(productId);
    }

    // Test-only helper to reset module state between tests
    export function __resetCache(): void {
      cache.clear();
      loading.clear();
    }
    ```

    Then REPLACE stubs in /Users/micahbank/room-cad-renderer/tests/productImageCache.test.ts with real tests. Use a 1x1 transparent PNG data URL for deterministic load: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=`.

    ```typescript
    import { describe, it, expect, vi, beforeEach } from "vitest";
    import { getCachedImage, invalidateProduct, __resetCache } from "@/canvas/productImageCache";

    const ONE_PX_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    beforeEach(() => __resetCache());

    describe("productImageCache", () => {
      it("cache hit/miss: returns null on miss, cached HTMLImageElement on hit", async () => {
        const onReady = vi.fn();
        const first = getCachedImage("p1", ONE_PX_PNG, onReady);
        expect(first).toBeNull();
        // wait for onload microtask
        await new Promise((r) => setTimeout(r, 50));
        const second = getCachedImage("p1", ONE_PX_PNG, onReady);
        expect(second).not.toBeNull();
        expect(second).toBeInstanceOf(HTMLImageElement);
      });

      it("async load: onload populates cache and invokes onReady callback exactly once", async () => {
        const onReady = vi.fn();
        getCachedImage("p2", ONE_PX_PNG, onReady);
        await new Promise((r) => setTimeout(r, 50));
        expect(onReady).toHaveBeenCalledTimes(1);
        // subsequent hits should NOT call onReady again
        getCachedImage("p2", ONE_PX_PNG, onReady);
        expect(onReady).toHaveBeenCalledTimes(1);
      });

      it("invalidateProduct removes from cache", async () => {
        const onReady = vi.fn();
        getCachedImage("p3", ONE_PX_PNG, onReady);
        await new Promise((r) => setTimeout(r, 50));
        invalidateProduct("p3");
        const after = getCachedImage("p3", ONE_PX_PNG, onReady);
        expect(after).toBeNull();
      });
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run tests/productImageCache.test.ts --reporter=dot</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/canvas/productImageCache.ts` succeeds
    - `grep -q "export function getCachedImage" src/canvas/productImageCache.ts` succeeds
    - `grep -q "export function invalidateProduct" src/canvas/productImageCache.ts` succeeds
    - `grep -q "new Map<string, HTMLImageElement>" src/canvas/productImageCache.ts` succeeds
    - `grep -q "new Set<string>" src/canvas/productImageCache.ts` succeeds
    - `grep -q "img.onload" src/canvas/productImageCache.ts` succeeds
    - `grep -q "img.onerror" src/canvas/productImageCache.ts` succeeds
    - `grep -q "naturalWidth > 0" src/canvas/productImageCache.ts` succeeds
    - `npx vitest run tests/productImageCache.test.ts` exits 0
    - All 3 tests pass (no `it.todo` remaining in the file)
  </acceptance_criteria>
  <done>Cache module exists and passes tests for hit/miss, single onReady, and invalidation.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Integrate getCachedImage into renderProducts in fabricSync.ts</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/src/canvas/fabricSync.ts (current renderProducts, lines 97-183; buggy image loader at 154-168)
    - /Users/micahbank/room-cad-renderer/src/canvas/productImageCache.ts (just created)
    - /Users/micahbank/room-cad-renderer/.planning/phases/01-2d-canvas-polish/01-RESEARCH.md (§Code Examples EDIT-09, lines 467-480)
  </read_first>
  <files>src/canvas/fabricSync.ts</files>
  <action>
    In /Users/micahbank/room-cad-renderer/src/canvas/fabricSync.ts:

    1. Add import at top (after existing imports):
    ```typescript
    import { getCachedImage } from "./productImageCache";
    ```

    2. REPLACE lines 154-168 (the `if (product.imageUrl)` block that creates a raw Image and checks `imgEl.complete`) with:
    ```typescript
    // Async image loading via cache (EDIT-09 fix)
    if (product.imageUrl) {
      const cachedImg = getCachedImage(product.id, product.imageUrl, () => fc.renderAll());
      if (cachedImg) {
        const fImg = new fabric.FabricImage(cachedImg, {
          scaleX: pw / cachedImg.naturalWidth,
          scaleY: pd / cachedImg.naturalHeight,
          originX: "center",
          originY: "center",
        });
        children.splice(1, 0, fImg); // insert after border, before labels
      }
    }
    ```

    Do NOT change the renderProducts signature, the group construction, or any other part of the file. The border + labels still render on cache miss.
  </action>
  <verify>
    <automated>grep -q "getCachedImage" src/canvas/fabricSync.ts && grep -q "fc.renderAll()" src/canvas/fabricSync.ts && ! grep -q "imgEl.complete" src/canvas/fabricSync.ts && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "import { getCachedImage } from \"./productImageCache\"" src/canvas/fabricSync.ts` succeeds
    - `grep -q "getCachedImage(product.id, product.imageUrl" src/canvas/fabricSync.ts` succeeds
    - `grep -q "() => fc.renderAll()" src/canvas/fabricSync.ts` succeeds
    - `grep -q "scaleX: pw / cachedImg.naturalWidth" src/canvas/fabricSync.ts` succeeds
    - `grep -q "children.splice(1, 0, fImg)" src/canvas/fabricSync.ts` succeeds
    - `grep -c "imgEl.complete" src/canvas/fabricSync.ts` returns 0 (old bug removed)
    - `grep -c "imgEl.naturalWidth" src/canvas/fabricSync.ts` returns 0 (old bug removed)
    - `npx tsc --noEmit` exits 0 (no TypeScript errors)
    - `npx vitest run` exits 0
  </acceptance_criteria>
  <done>renderProducts uses the cache; raw Image creation and sync-complete check are gone; typecheck passes.</done>
</task>

</tasks>

<verification>
- `npx vitest run tests/productImageCache.test.ts` passes
- `npx tsc --noEmit` passes
- Manual (post-execute, browser): upload a product image, place on canvas, image renders inside border (not just dashed border)
</verification>

<success_criteria>
EDIT-09 is closed: products with imageUrl show their image on the 2D canvas. Cache prevents reloading on every redraw.
</success_criteria>

<output>
Create `.planning/phases/01-2d-canvas-polish/01-01-SUMMARY.md` documenting the cache module API, the fabricSync integration point, and confirming old sync image code was removed.
</output>
