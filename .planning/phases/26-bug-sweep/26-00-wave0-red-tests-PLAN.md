---
phase: 26-bug-sweep
plan: 00
type: execute
wave: 0
depends_on: []
files_modified:
  - tests/fabricSync.image.test.ts
  - tests/ceilingMaterial.persistence.test.ts
autonomous: true
requirements: [FIX-01, FIX-02]
must_haves:
  truths:
    - "Both bugs have deterministic RED tests before any fix is written (D-09)"
    - "Test for FIX-01 asserts product Group contains FabricImage child after image onload fires"
    - "Test for FIX-02 asserts surfaceMaterialId survives structuredClone round-trip and tier-1 color is correct for CONCRETE/WOOD_PLANK/PLASTER/PAINTED_DRYWALL"
    - "If either RED test passes unmodified against current code, the corresponding bug is confirmed stale (D-04 for FIX-01)"
  artifacts:
    - path: "tests/fabricSync.image.test.ts"
      provides: "RED/GREEN contract test for FIX-01 — Group rebuild on image load"
      min_lines: 40
      contains: "FabricImage"
    - path: "tests/ceilingMaterial.persistence.test.ts"
      provides: "RED/GREEN contract test for FIX-02 — surfaceMaterialId round-trip and preset distinctness"
      min_lines: 40
      contains: "surfaceMaterialId"
  key_links:
    - from: "tests/fabricSync.image.test.ts"
      to: "src/canvas/fabricSync.ts renderProducts"
      via: "direct import and invocation in happy-dom"
      pattern: "renderProducts"
    - from: "tests/ceilingMaterial.persistence.test.ts"
      to: "structuredClone + SURFACE_MATERIALS"
      via: "direct structuredClone call on a Ceiling fixture"
      pattern: "structuredClone"
---

<objective>
Create two new RED contract tests that deterministically reproduce the FIX-01 and FIX-02 bug surfaces against current `main` (D-01, D-05, D-09). Tests MUST fail (RED) if the bug exists — which is the expected outcome per research hypotheses (Pitfall 1 for FIX-01; Pitfall 3/4 for FIX-02). If a RED test unexpectedly passes, that is the signal to close the underlying issue as stale (D-04 for FIX-01).

Purpose: Establish the pre-fix regression guard before touching any production code. Mirrors Phase 25 Wave 0 validation-scaffolding pattern (D-09).

Output: Two new test files under `tests/` that compile, run with `npm run test -- --run`, and produce clear RED failures tied to the hypothesized root causes.
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

@src/canvas/productImageCache.ts
@src/canvas/fabricSync.ts
@src/data/surfaceMaterials.ts
@tests/productImageCache.test.ts
@tests/ceilingMaterial.test.ts

<interfaces>
<!-- Key contracts the executor needs. Extracted from codebase. Do NOT explore the tree. -->

From src/canvas/productImageCache.ts:
```typescript
export function getCachedImage(
  productId: string,
  url: string,
  onReady: () => void
): HTMLImageElement | null;
export function invalidateProduct(productId: string): void;
export function __resetCache(): void;
```

From src/canvas/fabricSync.ts (line 868-880, current usage):
```typescript
// Async image loading via cache — only for real products with images
if (!showPlaceholder && product!.imageUrl) {
  const cachedImg = getCachedImage(product!.id, product!.imageUrl, () => fc.renderAll());
  if (cachedImg) {
    const fImg = new fabric.FabricImage(cachedImg, { ... });
    children.splice(1, 0, fImg); // after border, before labels
  }
}
// Group is created with data: { type: "product", placedProductId: pp.id, productId: pp.productId }
export function renderProducts(
  fc: fabric.Canvas,
  placedProducts: Record<string, PlacedProduct>,
  productLibrary: Product[],
  scale: number,
  origin: { x: number; y: number },
  selectedIds: string[]
): void;
```

From src/data/surfaceMaterials.ts (ceiling entries — concrete values used in assertions):
```typescript
SURFACE_MATERIALS.PLASTER         = { color: "#f0ebe0", roughness: 0.9,  surface: "ceiling" }
SURFACE_MATERIALS.WOOD_PLANK      = { color: "#a0794f", roughness: 0.75, surface: "ceiling" }
SURFACE_MATERIALS.PAINTED_DRYWALL = { color: "#f5f5f5", roughness: 0.8,  surface: "ceiling" }
SURFACE_MATERIALS.CONCRETE        = { color: "#8a8a8a", roughness: 0.85, surface: "both" }
```

From tests/productImageCache.test.ts (MockImage pattern — REUSE VERBATIM, do not reinvent):
```typescript
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;
  private _src = "";
  get src() { return this._src; }
  set src(v: string) {
    this._src = v;
    queueMicrotask(() => {
      this.naturalWidth = 1;
      this.naturalHeight = 1;
      this.onload?.();
    });
  }
}
// In beforeEach: __resetCache(); OriginalImage = globalThis.Image; globalThis.Image = MockImage;
// In afterEach: globalThis.Image = OriginalImage;
```

From src/types/cad.ts (Ceiling type shape the round-trip test uses):
```typescript
interface Ceiling {
  id: string;
  points: Point[];
  height: number;
  material: string;                    // legacy (Tier 3)
  paintId?: string;                    // Tier 2
  limeWash?: boolean;
  surfaceMaterialId?: string;          // Tier 1 — the field FIX-02 must preserve
}
```

From src/types/product.ts:
```typescript
interface Product {
  id: string;
  name: string;
  category: string;
  width: number; depth: number; height: number;
  imageUrl?: string;   // data: URL — the field FIX-01 depends on
}
interface PlacedProduct {
  id: string; productId: string;
  position: Point; rotation: number;
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 0-01: Create RED test for FIX-01 — Group must contain FabricImage child after image onload</name>
  <files>tests/fabricSync.image.test.ts</files>
  <read_first>
    - src/canvas/fabricSync.ts (lines 800-920 — renderProducts function, exact current call shape of getCachedImage with `() => fc.renderAll()` callback)
    - src/canvas/productImageCache.ts (all 37 lines — exports: getCachedImage, invalidateProduct, __resetCache)
    - tests/productImageCache.test.ts (all 67 lines — MockImage class and Image global override pattern; REUSE VERBATIM per D-02 "preserve cache abstraction")
    - .planning/phases/26-bug-sweep/26-RESEARCH.md (Pitfall 1 — `fc.renderAll()` alone won't insert freshly-loaded image into an existing Group; this is the bug the RED test must expose)
    - src/types/product.ts (Product / PlacedProduct shape)
    - .planning/phases/26-bug-sweep/26-VALIDATION.md (sampling rate + command shape)
  </read_first>
  <action>
    Create `tests/fabricSync.image.test.ts` with a single `describe("renderProducts async image load (FIX-01)")` block.

    Test setup (copy MockImage + Image-global-override pattern VERBATIM from tests/productImageCache.test.ts lines 6-37):
    - `import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";`
    - `import * as fabric from "fabric";`
    - `import { renderProducts } from "@/canvas/fabricSync";`
    - `import { __resetCache } from "@/canvas/productImageCache";`
    - Define the same `MockImage` class (1x1 data, fires onload via queueMicrotask after src set).
    - `beforeEach`: call `__resetCache()`, save `globalThis.Image`, assign `MockImage` to `globalThis.Image`.
    - `afterEach`: restore `globalThis.Image`.

    Test body — write ONE failing test:
    ```typescript
    it("rebuilds the product Group to include a FabricImage child after onload fires", async () => {
      const ONE_PX_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
      const fc = new fabric.Canvas(null as unknown as HTMLCanvasElement, { renderOnAddRemove: false });
      const productLibrary = [{
        id: "prod_A", name: "Sofa", category: "seating",
        width: 6, depth: 3, height: 3, imageUrl: ONE_PX_PNG,
      }];
      const placedProducts = {
        pp_1: { id: "pp_1", productId: "prod_A", position: { x: 5, y: 5 }, rotation: 0 },
      };
      // First render — image cache miss, Group built WITHOUT FabricImage
      renderProducts(fc, placedProducts as any, productLibrary as any, 20, { x: 0, y: 0 }, []);
      // Wait for MockImage onload → onReady → fc.renderAll()
      await new Promise((r) => setTimeout(r, 20));
      // Assertion: the product Group MUST now contain a FabricImage child
      const group = fc.getObjects().find(
        (o: any) => o.data?.type === "product" && o.data?.placedProductId === "pp_1"
      ) as fabric.Group | undefined;
      expect(group).toBeDefined();
      const hasImage = group!.getObjects().some((child: any) => child instanceof fabric.FabricImage);
      expect(hasImage).toBe(true); // RED — Pitfall 1: renderAll() does not rebuild the Group
    });
    ```

    Commit message: `test(26-00): add RED test for FIX-01 product image Group rebuild`

    IMPORTANT: This test is EXPECTED to fail against current code. That confirms the Pitfall 1 hypothesis. If it passes, flag in the SUMMARY that FIX-01 is stale and Plan 01 may become a no-op per D-04 (close issue #42).
  </action>
  <verify>
    <automated>npm run test -- --run tests/fabricSync.image.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - File `tests/fabricSync.image.test.ts` exists.
    - `grep -n "class MockImage" tests/fabricSync.image.test.ts` returns 1 match.
    - `grep -n "fabric.FabricImage" tests/fabricSync.image.test.ts` returns at least 1 match.
    - `grep -n "renderProducts" tests/fabricSync.image.test.ts` returns at least 1 match.
    - `grep -n "__resetCache" tests/fabricSync.image.test.ts` returns at least 1 match.
    - Running `npm run test -- --run tests/fabricSync.image.test.ts` prints "1 failed" (the new RED test) OR "1 passed" (FIX-01 is stale — flag in summary).
    - No other test files are modified.
  </acceptance_criteria>
  <done>RED test file committed; test is runnable; outcome (RED or unexpected GREEN) recorded in the task summary so Plan 01 knows whether to fix or close as stale.</done>
</task>

<task type="auto">
  <name>Task 0-02: Create RED test for FIX-02 — surfaceMaterialId round-trips via structuredClone and preset colors are distinct</name>
  <files>tests/ceilingMaterial.persistence.test.ts</files>
  <read_first>
    - src/three/CeilingMesh.tsx (lines 30-48 — exact tier resolution)
    - src/data/surfaceMaterials.ts (all 118 lines — confirm concrete color/roughness values used in assertions)
    - src/stores/cadStore.ts (lines 98-132 — snapshot() uses structuredClone(toPlain(state.rooms)); lines 445-460 — setCeilingSurfaceMaterial)
    - tests/ceilingMaterial.test.ts (all 92 lines — existing tier-resolution test pattern to stay consistent with)
    - .planning/phases/26-bug-sweep/26-RESEARCH.md (Pitfall 3 — near-white presets appear identical; Pitfall 4 — snapshot drop)
    - src/types/cad.ts (Ceiling interface at lines ~116-130)
  </read_first>
  <action>
    Create `tests/ceilingMaterial.persistence.test.ts` with two `describe` blocks:

    Block 1 — `describe("Ceiling preset distinctness (FIX-02 Pitfall 3)")`:
    Write tests asserting that ceiling preset color values are DISTINCT strings. Use the exact concrete hex values from SURFACE_MATERIALS:
    ```typescript
    import { describe, it, expect } from "vitest";
    import { SURFACE_MATERIALS } from "@/data/surfaceMaterials";

    it("ceiling presets have distinct colors", () => {
      expect(SURFACE_MATERIALS.PLASTER.color).toBe("#f0ebe0");
      expect(SURFACE_MATERIALS.WOOD_PLANK.color).toBe("#a0794f");
      expect(SURFACE_MATERIALS.PAINTED_DRYWALL.color).toBe("#f5f5f5");
      expect(SURFACE_MATERIALS.CONCRETE.color).toBe("#8a8a8a");
      // Pitfall 3 guard: PLASTER and PAINTED_DRYWALL must not be the same hex
      expect(SURFACE_MATERIALS.PLASTER.color).not.toBe(SURFACE_MATERIALS.PAINTED_DRYWALL.color);
    });

    it("ceiling preset WOOD_PLANK has roughness 0.75 and PLASTER has 0.9", () => {
      expect(SURFACE_MATERIALS.WOOD_PLANK.roughness).toBe(0.75);
      expect(SURFACE_MATERIALS.PLASTER.roughness).toBe(0.9);
    });
    ```

    Block 2 — `describe("Ceiling surfaceMaterialId structuredClone round-trip (FIX-02 Pitfall 4)")`:
    Mirror Phase 25 D-07 pattern — construct a plain Ceiling-shaped fixture, structuredClone it, assert surfaceMaterialId survives:
    ```typescript
    import type { Ceiling } from "@/types/cad";

    it("surfaceMaterialId survives structuredClone", () => {
      const ceiling: Ceiling = {
        id: "c1",
        points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
        height: 8,
        material: "#ffffff",
        surfaceMaterialId: "WOOD_PLANK",
      };
      const clone = structuredClone(ceiling);
      expect(clone.surfaceMaterialId).toBe("WOOD_PLANK");
      expect(clone.material).toBe("#ffffff"); // tier-3 untouched
    });

    it("setting surfaceMaterialId clears paintId and limeWash (mirrors setCeilingSurfaceMaterial)", () => {
      // Pure-function simulation of the store action's effect; confirms the contract
      // that will be round-tripped. The actual store action is tested elsewhere.
      const before = { paintId: "FB-2005", limeWash: true, material: "#ffffff" };
      const after = { ...before, surfaceMaterialId: "CONCRETE" };
      delete (after as any).paintId;
      delete (after as any).limeWash;
      const clone = structuredClone(after);
      expect(clone.surfaceMaterialId).toBe("CONCRETE");
      expect((clone as any).paintId).toBeUndefined();
      expect((clone as any).limeWash).toBeUndefined();
    });

    it("JSON round-trip (save path) preserves surfaceMaterialId", () => {
      const ceiling = { id: "c1", points: [], height: 8, material: "#ffffff", surfaceMaterialId: "PLASTER" };
      const roundTripped = JSON.parse(JSON.stringify(structuredClone(ceiling)));
      expect(roundTripped.surfaceMaterialId).toBe("PLASTER");
    });
    ```

    Note: These tests are EXPECTED to pass against current code (structuredClone preserves plain strings). If they pass, that confirms Pitfall 4 is NOT the root cause and the real FIX-02 bug must be elsewhere (UI wiring or visual perception — Pitfall 3). If they fail, that pinpoints a serialization bug. Either outcome narrows Plan 02's fix target.

    Commit message: `test(26-00): add RED/baseline test for FIX-02 preset distinctness and round-trip`
  </action>
  <verify>
    <automated>npm run test -- --run tests/ceilingMaterial.persistence.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - File `tests/ceilingMaterial.persistence.test.ts` exists.
    - `grep -n "structuredClone" tests/ceilingMaterial.persistence.test.ts` returns at least 2 matches.
    - `grep -n "surfaceMaterialId" tests/ceilingMaterial.persistence.test.ts` returns at least 4 matches.
    - `grep -n "WOOD_PLANK\|PLASTER\|PAINTED_DRYWALL\|CONCRETE" tests/ceilingMaterial.persistence.test.ts` returns at least 4 matches.
    - `grep -n "#a0794f" tests/ceilingMaterial.persistence.test.ts` returns at least 1 match (concrete WOOD_PLANK color — no abstraction).
    - Running `npm run test -- --run tests/ceilingMaterial.persistence.test.ts` completes (outcome — pass or fail — is recorded in summary; either narrows Plan 02's target).
    - No production code modified.
  </acceptance_criteria>
  <done>Baseline/RED test file committed and runnable; outcome recorded (pass = Pitfall 4 ruled out, investigate UI/perception for Plan 02; fail = serialization bug found, fix in Plan 02).</done>
</task>

</tasks>

<verification>
- Both new test files compile and run under `npm run test -- --run`.
- Full suite still has same pre-existing failure set (no regression introduced by new files).
- Commit messages reference `26-00` phase slug.
</verification>

<success_criteria>
- `ls tests/fabricSync.image.test.ts tests/ceilingMaterial.persistence.test.ts` returns both paths.
- Phase 26 Wave 0 RED/baseline gate is in place BEFORE any production code touch (D-09).
- The actual test outcomes (RED/GREEN) are captured in the plan SUMMARY so Plans 01 and 02 receive clear pointers on what to fix or close-as-stale.
</success_criteria>

<output>
After completion, create `.planning/phases/26-bug-sweep/26-00-wave0-red-tests-SUMMARY.md` recording:
1. Exact RED/GREEN outcome of each new test against current main.
2. Whether Plan 01 should proceed to fix (RED) or close #42 as stale (GREEN → D-04).
3. Whether Plan 02's root-cause hypothesis shifts (Pitfall 3 UI vs. Pitfall 4 snapshot).
</output>
