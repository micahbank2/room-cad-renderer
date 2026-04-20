---
phase: 31-drag-resize-label-override
plan: 02
type: execute
wave: 1
depends_on: [31-01]
requirements: [EDIT-22, EDIT-23, CUSTOM-06]
files_modified:
  - src/types/cad.ts
  - src/types/product.ts
  - src/canvas/resizeHandles.ts
  - src/canvas/wallEndpointSnap.ts
  - src/stores/cadStore.ts
autonomous: true

must_haves:
  truths:
    - "Schema additions (widthFtOverride, depthFtOverride on PlacedProduct + PlacedCustomElement; labelOverride on PlacedCustomElement) compile clean and are optional (D-04 no migration)"
    - "resolveEffectiveDims returns override when present, libraryDim × sizeScale otherwise (D-02)"
    - "Edge-handle hit-test detects N/S/E/W midpoints; corners win ties (Pitfall 1)"
    - "buildWallEndpointSnapScene emits zero-size endpoint BBoxes + wall midpoints, NO wallEdges, NO product bboxes (D-05)"
    - "New store actions (updatePlacedCustomElement + NoHistory, resizeProductAxis + NoHistory, resizeCustomElementAxis + NoHistory, clearProductOverrides, clearCustomElementOverrides) follow the updateWall/updateWallNoHistory drag-transaction pattern"
    - "All 4 Task-1 unit tests from Plan 31-01 turn green; integration tests from Plan 31-01 stay red (they wait on Wave 2 drivers)"
  artifacts:
    - path: "src/types/cad.ts"
      provides: "PlacedProduct.widthFtOverride / depthFtOverride; PlacedCustomElement.widthFtOverride / depthFtOverride / labelOverride"
      contains: "widthFtOverride"
    - path: "src/types/product.ts"
      provides: "resolveEffectiveDims + resolveEffectiveCustomDims wrappers (existing effectiveDimensions untouched)"
      contains: "resolveEffectiveDims"
    - path: "src/canvas/resizeHandles.ts"
      provides: "getEdgeHandles, hitTestEdgeHandle, hitTestAnyResizeHandle, edgeDragToAxisValue, EDGE_HANDLE_HIT_RADIUS_FT"
      contains: "hitTestAnyResizeHandle"
    - path: "src/canvas/wallEndpointSnap.ts"
      provides: "buildWallEndpointSnapScene — restricted scene for wall-endpoint drag (D-05)"
      contains: "buildWallEndpointSnapScene"
    - path: "src/stores/cadStore.ts"
      provides: "updatePlacedCustomElement / NoHistory + resizeProductAxis / NoHistory + resizeCustomElementAxis / NoHistory + clearProductOverrides + clearCustomElementOverrides"
      contains: "updatePlacedCustomElement"
  key_links:
    - from: "src/canvas/wallEndpointSnap.ts"
      to: "src/canvas/snapEngine.ts"
      via: "import type { SceneGeometry, BBox } from '@/canvas/snapEngine'"
      pattern: "SceneGeometry"
    - from: "src/stores/cadStore.ts"
      to: "src/types/cad.ts"
      via: "Partial<PlacedCustomElement> parameter to updatePlacedCustomElement"
      pattern: "Partial<PlacedCustomElement>"
    - from: "src/types/product.ts"
      to: "src/types/cad.ts"
      via: "Pick<PlacedProduct, 'sizeScale' | 'widthFtOverride' | 'depthFtOverride'>"
      pattern: "widthFtOverride"
---

<objective>
Implement all pure-module primitives Phase 31 depends on. These are independent, side-effect-free additions that do not touch any canvas tool, UI component, or render path yet. Wave 2 (Plan 31-03) will wire them into selectTool + PropertiesPanel + fabricSync.

Purpose: Land the contracts the red tests from Plan 31-01 were written against. Unit tests for pure modules turn green; integration tests stay red (they need drivers installed in Wave 2).
Output: Extended `resizeHandles.ts`, new `wallEndpointSnap.ts`, extended `product.ts` with resolver, extended `cad.ts` schema, extended `cadStore.ts` with new actions.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/31-drag-resize-label-override/31-CONTEXT.md
@.planning/phases/31-drag-resize-label-override/31-RESEARCH.md
@.planning/phases/31-drag-resize-label-override/31-01-SUMMARY.md
@src/canvas/resizeHandles.ts
@src/canvas/snapEngine.ts
@src/canvas/snapGuides.ts
@src/stores/cadStore.ts
@src/types/cad.ts
@src/types/product.ts
@tests/resizeHandles.test.ts
@tests/resolveEffectiveDims.test.ts
@tests/wallEndpointSnap.test.ts
@tests/updatePlacedCustomElement.test.ts

<interfaces>
<!-- Signatures to implement exactly. All red tests from Plan 31-01 import these from the @/* paths below. -->

```typescript
// src/types/cad.ts — field additions only (D-04: all optional)
export interface PlacedProduct {
  id: string;
  productId: string;
  position: Point;
  rotation: number;
  sizeScale?: number;
  widthFtOverride?: number;   // NEW
  depthFtOverride?: number;   // NEW
}
export interface PlacedCustomElement {
  id: string;
  customElementId: string;
  position: Point;
  rotation: number;
  sizeScale?: number;
  widthFtOverride?: number;   // NEW
  depthFtOverride?: number;   // NEW
  labelOverride?: string;     // NEW (D-13)
}
```

```typescript
// src/types/product.ts — NEW wrappers, existing effectiveDimensions UNCHANGED
import type { PlacedProduct, PlacedCustomElement, CustomElement } from "@/types/cad";

export function resolveEffectiveDims(
  product: Product | undefined | null,
  placed: Pick<PlacedProduct, "sizeScale" | "widthFtOverride" | "depthFtOverride">,
): { width: number; depth: number; height: number; isPlaceholder: boolean };

export function resolveEffectiveCustomDims(
  el: CustomElement | undefined,
  placed: Pick<PlacedCustomElement, "sizeScale" | "widthFtOverride" | "depthFtOverride">,
): { width: number; depth: number; height: number };
```

```typescript
// src/canvas/resizeHandles.ts — additions
export const EDGE_HANDLE_HIT_RADIUS_FT = 0.5;
export type CornerHandle = "ne" | "nw" | "sw" | "se";
export type EdgeHandle = "n" | "s" | "e" | "w";

export function getEdgeHandles(
  pp: PlacedProduct | PlacedCustomElement,
  widthFt: number,
  depthFt: number,
): { n: Point; s: Point; e: Point; w: Point };

export function hitTestEdgeHandle(
  pointerFt: Point,
  pp: PlacedProduct | PlacedCustomElement,
  widthFt: number,
  depthFt: number,
): EdgeHandle | null;

export function hitTestAnyResizeHandle(
  pointerFt: Point,
  pp: PlacedProduct | PlacedCustomElement,
  widthFt: number,
  depthFt: number,
):
  | { kind: "corner"; which: CornerHandle }
  | { kind: "edge"; which: EdgeHandle }
  | null;

export function edgeDragToAxisValue(
  edge: EdgeHandle,
  pointerFt: Point,
  pp: PlacedProduct | PlacedCustomElement,
): { axis: "width" | "depth"; valueFt: number };
```

```typescript
// src/canvas/wallEndpointSnap.ts — NEW FILE
import type { SceneGeometry, BBox } from "@/canvas/snapEngine";
import type { WallSegment } from "@/types/cad";

export function buildWallEndpointSnapScene(
  walls: Record<string, WallSegment>,
  draggedWallId: string,
): SceneGeometry;
```

```typescript
// src/stores/cadStore.ts — NEW actions (added to CADState interface + create<CADState>())
updatePlacedCustomElement: (id: string, changes: Partial<PlacedCustomElement>) => void;
updatePlacedCustomElementNoHistory: (id: string, changes: Partial<PlacedCustomElement>) => void;
resizeProductAxis: (id: string, axis: "width" | "depth", valueFt: number) => void;
resizeProductAxisNoHistory: (id: string, axis: "width" | "depth", valueFt: number) => void;
resizeCustomElementAxis: (id: string, axis: "width" | "depth", valueFt: number) => void;
resizeCustomElementAxisNoHistory: (id: string, axis: "width" | "depth", valueFt: number) => void;
clearProductOverrides: (id: string) => void;
clearCustomElementOverrides: (id: string) => void;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Schema + resolver additions (cad.ts + product.ts)</name>
  <files>src/types/cad.ts, src/types/product.ts</files>
  <read_first>
    - src/types/cad.ts (current PlacedProduct L79-88, PlacedCustomElement L108-114)
    - src/types/product.ts (current effectiveDimensions L38-62 — MUST NOT modify signature per RESEARCH anti-pattern)
    - tests/resolveEffectiveDims.test.ts (red test file — this is your spec)
    - .planning/phases/31-drag-resize-label-override/31-CONTEXT.md §D-01 §D-02 §D-04 §D-13
    - .planning/phases/31-drag-resize-label-override/31-RESEARCH.md §Pattern 3 Effective-Dimension Resolver
  </read_first>
  <behavior>
    Schema: Add three optional fields to existing interfaces. Do NOT reorder. Do NOT touch unrelated fields.

    Resolver: NEW function `resolveEffectiveDims(product, placed)` with precedence:
    - `width = placed.widthFtOverride ?? (product?.width ?? PLACEHOLDER_DIM_FT) × (placed.sizeScale ?? 1)`
    - `depth = placed.depthFtOverride ?? (product?.depth ?? PLACEHOLDER_DIM_FT) × (placed.sizeScale ?? 1)`
    - `height = product?.height ?? PLACEHOLDER_DIM_FT` (no override; height never has sizeScale applied per existing effectiveDimensions L58)
    - `isPlaceholder = !product || product.width == null || product.depth == null || product.height == null`
    - If isPlaceholder AND no overrides set, return `{ width: PLACEHOLDER_DIM_FT * sizeScale, depth: PLACEHOLDER_DIM_FT * sizeScale, height: PLACEHOLDER_DIM_FT, isPlaceholder: true }` (matches existing effectiveDimensions contract)
    - If isPlaceholder but override IS set, override wins over PLACEHOLDER_DIM_FT

    Same contract for `resolveEffectiveCustomDims(el, placed)` except:
    - No Product undefined case distinction for height (CustomElement.height is always a number when `el` is defined)
    - If el is undefined: fallback to { width: PLACEHOLDER_DIM_FT, depth: PLACEHOLDER_DIM_FT, height: PLACEHOLDER_DIM_FT } (without isPlaceholder flag per test spec)
    - No `isPlaceholder` in return type
  </behavior>
  <action>
    1. Edit `src/types/cad.ts`:
       - In `interface PlacedProduct` (around L79-88), after `sizeScale?: number;`, add:
         ```typescript
         /** D-01/D-02: per-axis width override. Set only by edge-handle drag.
          *  When present, resolver returns override (ignores sizeScale for width). */
         widthFtOverride?: number;
         /** D-01/D-02: per-axis depth override. Set only by edge-handle drag. */
         depthFtOverride?: number;
         ```
       - In `interface PlacedCustomElement` (around L108-114), after `sizeScale?: number;`, add:
         ```typescript
         /** D-01/D-02: per-axis width override. */
         widthFtOverride?: number;
         /** D-01/D-02: per-axis depth override. */
         depthFtOverride?: number;
         /** D-13: per-placement display name override. Empty/undefined → render catalog name. Max 40 chars (client-enforced). */
         labelOverride?: string;
         ```
       - No other changes.

    2. Edit `src/types/product.ts`:
       - KEEP existing `effectiveDimensions` function UNCHANGED (per anti-pattern warning in RESEARCH).
       - Append new imports at top:
         ```typescript
         import type { PlacedProduct, PlacedCustomElement, CustomElement } from "@/types/cad";
         ```
       - Append new function `resolveEffectiveDims`:
         ```typescript
         export function resolveEffectiveDims(
           product: Product | undefined | null,
           placed: Pick<PlacedProduct, "sizeScale" | "widthFtOverride" | "depthFtOverride">,
         ): { width: number; depth: number; height: number; isPlaceholder: boolean } {
           const scale = placed.sizeScale && placed.sizeScale > 0 ? placed.sizeScale : 1;
           const isPlaceholder = !product || product.width == null || product.depth == null || product.height == null;
           const baseW = isPlaceholder ? PLACEHOLDER_DIM_FT : (product!.width as number);
           const baseD = isPlaceholder ? PLACEHOLDER_DIM_FT : (product!.depth as number);
           const baseH = isPlaceholder ? PLACEHOLDER_DIM_FT : (product!.height as number);
           return {
             width: placed.widthFtOverride ?? baseW * scale,
             depth: placed.depthFtOverride ?? baseD * scale,
             height: baseH,
             isPlaceholder,
           };
         }
         ```
       - Append `resolveEffectiveCustomDims`:
         ```typescript
         export function resolveEffectiveCustomDims(
           el: CustomElement | undefined,
           placed: Pick<PlacedCustomElement, "sizeScale" | "widthFtOverride" | "depthFtOverride">,
         ): { width: number; depth: number; height: number } {
           const scale = placed.sizeScale && placed.sizeScale > 0 ? placed.sizeScale : 1;
           if (!el) {
             return { width: PLACEHOLDER_DIM_FT, depth: PLACEHOLDER_DIM_FT, height: PLACEHOLDER_DIM_FT };
           }
           return {
             width: placed.widthFtOverride ?? el.width * scale,
             depth: placed.depthFtOverride ?? el.depth * scale,
             height: el.height,
           };
         }
         ```
    3. Run `npx vitest run tests/resolveEffectiveDims.test.ts` — must be GREEN.
    4. Run `npx tsc --noEmit` — must pass cleanly (only pre-existing warnings allowed).
  </action>
  <verify>
    <automated>npx vitest run tests/resolveEffectiveDims.test.ts 2>&1 | tee /tmp/p31-t1.log; grep -E "(passed|Tests)" /tmp/p31-t1.log | tail -3; grep -q "failed" /tmp/p31-t1.log && exit 1 || exit 0</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "widthFtOverride" src/types/cad.ts` returns ≥2 (PlacedProduct + PlacedCustomElement)
    - `grep -c "labelOverride" src/types/cad.ts` returns ≥1
    - `grep -q "export function resolveEffectiveDims" src/types/product.ts` succeeds
    - `grep -q "export function resolveEffectiveCustomDims" src/types/product.ts` succeeds
    - The ORIGINAL `export function effectiveDimensions(` line still exists unchanged in product.ts (anti-pattern guard)
    - `npx vitest run tests/resolveEffectiveDims.test.ts` exits ZERO (all green)
    - `npx tsc --noEmit` exits ZERO
  </acceptance_criteria>
  <done>Schema fields + resolver functions exist. Red resolveEffectiveDims test file turns fully green. No consumers have migrated yet (Wave 2's job). Existing effectiveDimensions signature is byte-identical to pre-edit.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Edge-handle hit-test + axis math (resizeHandles.ts)</name>
  <files>src/canvas/resizeHandles.ts</files>
  <read_first>
    - src/canvas/resizeHandles.ts (current getResizeHandles + hitTestResizeHandle)
    - tests/resizeHandles.test.ts (red spec — this is ground truth)
    - .planning/phases/31-drag-resize-label-override/31-RESEARCH.md §Pattern 1 Edge-Handle Hit-Test §Pitfall 1 §Example: Extended Resize-Handle Hit-Test
    - .planning/phases/31-drag-resize-label-override/31-CONTEXT.md §D-03 (corner vs edge split)
  </read_first>
  <behavior>
    Extend `resizeHandles.ts` with edge-midpoint handles. Existing exports stay untouched.

    Local (pre-rotation) edge coords: `n=(0,-hd)`, `s=(0,+hd)`, `e=(+hw,0)`, `w=(-hw,0)`. Apply same rotation + translation as existing getResizeHandles.

    Hit-test priority (Pitfall 1): corners first, edges fall through only if no corner match.

    Axis math for edgeDragToAxisValue: convert pointer to object-local coords (inverse rotation), then:
    - edge="e" or "w" → axis="width", valueFt = 2 × |lx| clamped to [0.25, 50]
    - edge="n" or "s" → axis="depth", valueFt = 2 × |ly| clamped to [0.25, 50]

    Generalize the parameter type from `PlacedProduct` to `PlacedProduct | PlacedCustomElement` on getEdgeHandles, hitTestEdgeHandle, hitTestAnyResizeHandle, edgeDragToAxisValue (both interfaces share `{ position, rotation }` which is all we access).

    Do NOT modify existing getResizeHandles or hitTestResizeHandle.
  </behavior>
  <action>
    Append to `src/canvas/resizeHandles.ts` after the existing exports:

    ```typescript
    import type { Point, PlacedProduct, PlacedCustomElement } from "@/types/cad";

    export const EDGE_HANDLE_HIT_RADIUS_FT = 0.5;
    export type CornerHandle = "ne" | "nw" | "sw" | "se";
    export type EdgeHandle = "n" | "s" | "e" | "w";

    /** Return the 4 edge midpoint handle positions in world feet, rotation-aware. */
    export function getEdgeHandles(
      pp: PlacedProduct | PlacedCustomElement,
      widthFt: number,
      depthFt: number,
    ): { n: Point; s: Point; e: Point; w: Point } {
      const hw = widthFt / 2;
      const hd = depthFt / 2;
      const local = {
        n: { x: 0, y: -hd },
        s: { x: 0, y: hd },
        e: { x: hw, y: 0 },
        w: { x: -hw, y: 0 },
      };
      const rad = (pp.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const toWorld = (p: Point): Point => ({
        x: pp.position.x + p.x * cos - p.y * sin,
        y: pp.position.y + p.x * sin + p.y * cos,
      });
      return {
        n: toWorld(local.n),
        s: toWorld(local.s),
        e: toWorld(local.e),
        w: toWorld(local.w),
      };
    }

    export function hitTestEdgeHandle(
      pointerFt: Point,
      pp: PlacedProduct | PlacedCustomElement,
      widthFt: number,
      depthFt: number,
    ): EdgeHandle | null {
      const handles = getEdgeHandles(pp, widthFt, depthFt);
      for (const key of ["n", "s", "e", "w"] as const) {
        const h = handles[key];
        const dx = pointerFt.x - h.x;
        const dy = pointerFt.y - h.y;
        if (Math.sqrt(dx * dx + dy * dy) <= EDGE_HANDLE_HIT_RADIUS_FT) return key;
      }
      return null;
    }

    /** Combined hit-test with corner priority (Pitfall 1: corners win ties). */
    export function hitTestAnyResizeHandle(
      pointerFt: Point,
      pp: PlacedProduct | PlacedCustomElement,
      widthFt: number,
      depthFt: number,
    ):
      | { kind: "corner"; which: CornerHandle }
      | { kind: "edge"; which: EdgeHandle }
      | null {
      const corner = hitTestResizeHandle(pointerFt, pp as PlacedProduct, widthFt, depthFt);
      if (corner) return { kind: "corner", which: corner };
      const edge = hitTestEdgeHandle(pointerFt, pp, widthFt, depthFt);
      if (edge) return { kind: "edge", which: edge };
      return null;
    }

    /** Convert pointer world coords to an axis-value for edge-handle drag.
     *  valueFt is the new absolute width/depth (2 × |local distance|), clamped to [0.25, 50]. */
    export function edgeDragToAxisValue(
      edge: EdgeHandle,
      pointerFt: Point,
      pp: PlacedProduct | PlacedCustomElement,
    ): { axis: "width" | "depth"; valueFt: number } {
      const rad = (-pp.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const dx = pointerFt.x - pp.position.x;
      const dy = pointerFt.y - pp.position.y;
      const lx = dx * cos - dy * sin;
      const ly = dx * sin + dy * cos;
      if (edge === "e" || edge === "w") {
        return { axis: "width", valueFt: Math.max(0.25, Math.min(50, 2 * Math.abs(lx))) };
      }
      return { axis: "depth", valueFt: Math.max(0.25, Math.min(50, 2 * Math.abs(ly))) };
    }
    ```

    Widen the existing `hitTestResizeHandle` signature to also accept `PlacedCustomElement` IF (and only if) an intersection-type widening is needed to avoid a `as PlacedProduct` cast. Otherwise keep the cast inside `hitTestAnyResizeHandle` as shown.

    Run `npx vitest run tests/resizeHandles.test.ts` — all green.
  </action>
  <verify>
    <automated>npx vitest run tests/resizeHandles.test.ts 2>&1 | tee /tmp/p31-t2.log; grep -q "failed" /tmp/p31-t2.log && exit 1 || exit 0</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "export function" src/canvas/resizeHandles.ts` returns ≥6 (original 3 + new 4: getEdgeHandles, hitTestEdgeHandle, hitTestAnyResizeHandle, edgeDragToAxisValue)
    - `grep -q "EDGE_HANDLE_HIT_RADIUS_FT = 0.5" src/canvas/resizeHandles.ts` succeeds
    - `grep -q "export function hitTestAnyResizeHandle" src/canvas/resizeHandles.ts` succeeds
    - `grep -q "valueFt: Math.max(0.25, Math.min(50," src/canvas/resizeHandles.ts` succeeds (clamping)
    - Original `export function getResizeHandles` and `export function hitTestResizeHandle` and `export function cornerDiagonalFt` still exist
    - `npx vitest run tests/resizeHandles.test.ts` exits ZERO
    - `npx tsc --noEmit` exits ZERO
  </acceptance_criteria>
  <done>Edge-handle API complete. Red resizeHandles test suite turns green. Corner hit-test priority preserved (Pitfall 1). Axis math clamps to [0.25, 50] ft.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Wall-endpoint snap scene builder (wallEndpointSnap.ts)</name>
  <files>src/canvas/wallEndpointSnap.ts</files>
  <read_first>
    - src/canvas/snapEngine.ts (SceneGeometry + BBox shape — match exactly)
    - tests/wallEndpointSnap.test.ts (red spec)
    - .planning/phases/31-drag-resize-label-override/31-RESEARCH.md §Pattern 4 Wall-Endpoint Smart-Snap Integration §Example: Restricted Snap Scene for Wall Endpoints
    - .planning/phases/31-drag-resize-label-override/31-CONTEXT.md §D-05
  </read_first>
  <behavior>
    NEW module. Builds a SceneGeometry containing ONLY:
    - `wallEdges: []` (D-05: no wall-face snapping for endpoint drag)
    - `wallMidpoints: [...]` (one per OTHER wall, with axis classification)
    - `objectBBoxes: [...]` (two zero-size BBoxes per OTHER wall — one at each endpoint)

    Product/ceiling/custom-element bboxes MUST NOT appear (D-05 negative — walls don't snap to furniture).

    classifyAxis logic: if |dx| < 1e-6 → "y", if |dy| < 1e-6 → "x", else "diag". (Identical to snapEngine logic — duplicate rather than import to avoid coupling if snapEngine doesn't export it.)

    Skip the dragged wall itself — its own endpoints/midpoint would create self-snap artifacts.
  </behavior>
  <action>
    Create `src/canvas/wallEndpointSnap.ts`:

    ```typescript
    import type { SceneGeometry, BBox } from "@/canvas/snapEngine";
    import type { WallSegment, Point } from "@/types/cad";

    function classifyAxis(w: WallSegment): "x" | "y" | "diag" {
      const dx = Math.abs(w.end.x - w.start.x);
      const dy = Math.abs(w.end.y - w.start.y);
      if (dx < 1e-6) return "y";
      if (dy < 1e-6) return "x";
      return "diag";
    }

    /** D-05: build a snap scene containing ONLY other-wall endpoints + midpoints.
     *  Product / ceiling / custom-element bboxes are intentionally excluded —
     *  walls should not snap to furniture (wrong precedence). */
    export function buildWallEndpointSnapScene(
      walls: Record<string, WallSegment>,
      draggedWallId: string,
    ): SceneGeometry {
      const objectBBoxes: BBox[] = [];
      const wallMidpoints: SceneGeometry["wallMidpoints"] = [];

      for (const w of Object.values(walls)) {
        if (!w || w.id === draggedWallId) continue;
        // Zero-size BBox at each endpoint — computeSnap's objectBBoxes scan picks
        // these up as object-edge targets (priority 2) without engine changes.
        objectBBoxes.push({
          id: `${w.id}-start`,
          minX: w.start.x, maxX: w.start.x,
          minY: w.start.y, maxY: w.start.y,
        });
        objectBBoxes.push({
          id: `${w.id}-end`,
          minX: w.end.x, maxX: w.end.x,
          minY: w.end.y, maxY: w.end.y,
        });
        wallMidpoints.push({
          point: { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 },
          wallId: w.id,
          axis: classifyAxis(w),
        });
      }

      return { wallEdges: [], wallMidpoints, objectBBoxes };
    }
    ```

    If `BBox` is not exported from `snapEngine.ts`, either add `export` to its declaration OR inline the shape here. Prefer adding the export if minimal (one-line change) so both files share the canonical type.

    Run `npx vitest run tests/wallEndpointSnap.test.ts` — green.
  </action>
  <verify>
    <automated>npx vitest run tests/wallEndpointSnap.test.ts 2>&1 | tee /tmp/p31-t3.log; grep -q "failed" /tmp/p31-t3.log && exit 1 || exit 0</automated>
  </verify>
  <acceptance_criteria>
    - File exists: `src/canvas/wallEndpointSnap.ts`
    - `grep -q "export function buildWallEndpointSnapScene" src/canvas/wallEndpointSnap.ts` succeeds
    - `grep -q "wallEdges: \[\]" src/canvas/wallEndpointSnap.ts` succeeds (D-05 empty wallEdges)
    - `grep -q "w.id === draggedWallId" src/canvas/wallEndpointSnap.ts` succeeds (self-exclusion)
    - `npx vitest run tests/wallEndpointSnap.test.ts` exits ZERO
    - `npx tsc --noEmit` exits ZERO
  </acceptance_criteria>
  <done>Restricted snap scene builder exists. D-05 contract enforced (no wallEdges, no product bboxes). Red wallEndpointSnap test file turns green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Store actions for placement + axis-resize + override clearing (cadStore.ts)</name>
  <files>src/stores/cadStore.ts</files>
  <read_first>
    - src/stores/cadStore.ts (existing updateWall / updateWallNoHistory pattern L210-234; resizeProduct / resizeProductNoHistory; pushHistory helper; updateCustomElement L605 — the CATALOG mutator, MUST NOT reuse)
    - tests/updatePlacedCustomElement.test.ts (red spec — authoritative)
    - .planning/phases/31-drag-resize-label-override/31-RESEARCH.md §Pitfall 4 §Pattern 2 Per-Axis Resize Store Actions
    - .planning/phases/31-drag-resize-label-override/31-CONTEXT.md §D-16
  </read_first>
  <behavior>
    Add 8 new actions to cadStore:
    1. `updatePlacedCustomElement(id, Partial<PlacedCustomElement>)` — mutates `rooms[activeRoomId].placedCustomElements[id]`, pushes history.
    2. `updatePlacedCustomElementNoHistory(id, Partial<...>)` — same mutation, no pushHistory.
    3. `resizeProductAxis(id, axis, valueFt)` — writes `widthFtOverride` OR `depthFtOverride` based on axis, pushes history, clamps valueFt to [0.25, 50].
    4. `resizeProductAxisNoHistory(id, axis, valueFt)` — same, no history.
    5. `resizeCustomElementAxis(id, axis, valueFt)` — mirrors for placedCustomElements, pushes history.
    6. `resizeCustomElementAxisNoHistory(id, axis, valueFt)` — no history.
    7. `clearProductOverrides(id)` — sets widthFtOverride + depthFtOverride to undefined on a placedProduct, pushes history.
    8. `clearCustomElementOverrides(id)` — same for placedCustomElement.

    All actions: no-op if id not found (no throw, no history push). All use the active room (same as existing updateWall).

    Critical (Pitfall 4): `updatePlacedCustomElement` writes to `rooms[activeRoomId].placedCustomElements[id]`, NOT `customElements[id]` (the catalog). Re-read the RESEARCH pitfall before writing.
  </behavior>
  <action>
    1. Add action signatures to the `CADState` interface (near existing updateCustomElement, around L65-75). Group them logically.

    2. Implement each action inside the `create<CADState>()((set, get) => ({ ... }))` body, mirroring the shape of `updateWall` / `updateWallNoHistory`:

    ```typescript
    // Example pattern for one action — replicate for the others:
    updatePlacedCustomElement: (id, changes) => {
      set(
        produce((s: CADState) => {
          const roomId = s.activeRoomId;
          if (!roomId) return;
          const room = s.rooms[roomId];
          if (!room || !room.placedCustomElements) return;
          const pce = room.placedCustomElements[id];
          if (!pce) return;
          pushHistory(s);
          Object.assign(pce, changes);
        })
      );
    },
    updatePlacedCustomElementNoHistory: (id, changes) => {
      set(
        produce((s: CADState) => {
          const roomId = s.activeRoomId;
          if (!roomId) return;
          const room = s.rooms[roomId];
          if (!room || !room.placedCustomElements) return;
          const pce = room.placedCustomElements[id];
          if (!pce) return;
          Object.assign(pce, changes);
        })
      );
    },
    ```

    For `resizeProductAxis(id, axis, valueFt)`:
    ```typescript
    resizeProductAxis: (id, axis, valueFt) => {
      set(produce((s: CADState) => {
        const roomId = s.activeRoomId;
        if (!roomId) return;
        const pp = s.rooms[roomId]?.placedProducts?.[id];
        if (!pp) return;
        const v = Math.max(0.25, Math.min(50, valueFt));
        pushHistory(s);
        if (axis === "width") pp.widthFtOverride = v;
        else pp.depthFtOverride = v;
      }));
    },
    ```
    NoHistory variant: identical minus pushHistory line.

    For `clearProductOverrides(id)`:
    ```typescript
    clearProductOverrides: (id) => {
      set(produce((s: CADState) => {
        const roomId = s.activeRoomId;
        if (!roomId) return;
        const pp = s.rooms[roomId]?.placedProducts?.[id];
        if (!pp) return;
        pushHistory(s);
        pp.widthFtOverride = undefined;
        pp.depthFtOverride = undefined;
      }));
    },
    ```

    Mirror for custom elements (target `placedCustomElements` instead).

    3. Run `npx vitest run tests/updatePlacedCustomElement.test.ts` — all green.

    4. Run full test suite quick: `npx vitest run tests/cadStore*.test.ts tests/updatePlacedCustomElement.test.ts` — confirm no regressions.
  </action>
  <verify>
    <automated>npx vitest run tests/updatePlacedCustomElement.test.ts tests/cadStore.test.ts tests/cadStore.multiRoom.test.ts tests/cadStore.resizeWallByLabel.test.ts 2>&1 | tee /tmp/p31-t4.log; grep -q "failed" /tmp/p31-t4.log && exit 1 || exit 0</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "updatePlacedCustomElement" src/stores/cadStore.ts` returns ≥4 (interface decl + NoHistory decl + 2 impls)
    - `grep -c "resizeProductAxis" src/stores/cadStore.ts` returns ≥4
    - `grep -c "resizeCustomElementAxis" src/stores/cadStore.ts` returns ≥4
    - `grep -q "clearProductOverrides" src/stores/cadStore.ts` succeeds
    - `grep -q "clearCustomElementOverrides" src/stores/cadStore.ts` succeeds
    - The existing `updateCustomElement:` action (CATALOG mutator around L605) still exists and its body still references `root.customElements[id]` OR `s.customElements[id]` — NOT placedCustomElements (Pitfall 4 guard)
    - `npx vitest run tests/updatePlacedCustomElement.test.ts` exits ZERO
    - No pre-existing cadStore tests regress (tests/cadStore.test.ts, tests/cadStore.multiRoom.test.ts, tests/cadStore.resizeWallByLabel.test.ts all still green)
    - `npx tsc --noEmit` exits ZERO
  </acceptance_criteria>
  <done>8 new store actions exist and follow the existing updateWall/NoHistory drag-transaction shape. Pitfall 4 avoided (updatePlacedCustomElement targets placements, updateCustomElement still targets catalog). Red updatePlacedCustomElement test file turns green. Full cadStore regression suite still green.</done>
</task>

</tasks>

<verification>
- All 4 Wave 0 unit test files (tests/resizeHandles.test.ts, tests/resolveEffectiveDims.test.ts, tests/wallEndpointSnap.test.ts, tests/updatePlacedCustomElement.test.ts) now GREEN
- Wave 0 integration tests (phase31Resize/WallEndpoint/Undo/LabelOverride) STILL RED — they await Wave 2 drivers
- `npx tsc --noEmit` passes cleanly
- `npm test -- --run` total pass count increased by the number of new unit assertions (≥41)
- No existing test regresses
- `git diff --stat` shows changes limited to the 5 files in `files_modified`
</verification>

<success_criteria>
- Schema additions are byte-minimal (only 3 new optional fields, zero field reorders)
- `effectiveDimensions` in `src/types/product.ts` is UNCHANGED (anti-pattern guard)
- `updateCustomElement` in `src/stores/cadStore.ts` is UNCHANGED (Pitfall 4 guard)
- Every signature in the <interfaces> block is implemented exactly
- All 4 pure-module unit test files green
- Integration tests red (expected — Wave 2 closes them)
</success_criteria>

<output>
After completion, create `.planning/phases/31-drag-resize-label-override/31-02-SUMMARY.md` documenting:
- 5 files modified with line-count deltas
- Which test files flipped red→green (the 4 unit test files)
- Which test files are still red (the 4 integration files) and why (drivers pending Wave 2)
- Exact new function/action signatures added
- Confirmation that `effectiveDimensions` and `updateCustomElement` were not touched
- Full suite pass count before + after
</output>
