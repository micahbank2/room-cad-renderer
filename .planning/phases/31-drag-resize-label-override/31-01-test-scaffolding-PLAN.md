---
phase: 31-drag-resize-label-override
plan: 01
type: execute
wave: 0
depends_on: []
requirements: [EDIT-22, EDIT-23, EDIT-24, CUSTOM-06]
files_modified:
  - tests/resizeHandles.test.ts
  - tests/resolveEffectiveDims.test.ts
  - tests/wallEndpointSnap.test.ts
  - tests/updatePlacedCustomElement.test.ts
  - tests/phase31Resize.test.tsx
  - tests/phase31WallEndpoint.test.tsx
  - tests/phase31Undo.test.tsx
  - tests/phase31LabelOverride.test.tsx
autonomous: true

must_haves:
  truths:
    - "Red test stubs exist for every EDIT-22/23/24 + CUSTOM-06 behavior before implementation"
    - "Test suites fail with 'not implemented' / 'module not found' / type error before Wave 1"
    - "Driver contract window.__driveResize / __driveWallEndpoint / __driveLabelOverride is documented in-file for Wave 2"
    - "Single-undo assertion (past.length delta === 1) is expressed as executable vitest"
  artifacts:
    - path: "tests/resizeHandles.test.ts"
      provides: "Unit coverage for corner + edge hit-test (rotation-aware, corner priority)"
      contains: "hitTestAnyResizeHandle"
    - path: "tests/resolveEffectiveDims.test.ts"
      provides: "Unit coverage for override resolver (override ?? libraryDim × sizeScale)"
      contains: "resolveEffectiveDims"
    - path: "tests/wallEndpointSnap.test.ts"
      provides: "Unit coverage for restricted snap scene builder (endpoints + midpoints only; no product bboxes)"
      contains: "buildWallEndpointSnapScene"
    - path: "tests/updatePlacedCustomElement.test.ts"
      provides: "Unit coverage for new store action (placement mutation, NOT catalog)"
      contains: "updatePlacedCustomElement"
    - path: "tests/phase31Resize.test.tsx"
      provides: "Integration coverage for corner (sizeScale) + edge (widthFtOverride/depthFtOverride) drag"
      contains: "__driveResize"
    - path: "tests/phase31WallEndpoint.test.tsx"
      provides: "Integration coverage for wall-endpoint smart-snap + Shift + Alt"
      contains: "__driveWallEndpoint"
    - path: "tests/phase31Undo.test.tsx"
      provides: "Single-undo regression coverage (EDIT-24) for all 4 drag types + label edit"
      contains: "past.length"
    - path: "tests/phase31LabelOverride.test.tsx"
      provides: "RTL coverage for PropertiesPanel label-override input + fabricSync render lookup"
      contains: "__driveLabelOverride"
  key_links:
    - from: "tests/resizeHandles.test.ts"
      to: "src/canvas/resizeHandles.ts"
      via: "import { hitTestAnyResizeHandle, getEdgeHandles, edgeDragToAxisValue } from '@/canvas/resizeHandles'"
      pattern: "from ['\"]@/canvas/resizeHandles['\"]"
    - from: "tests/resolveEffectiveDims.test.ts"
      to: "src/types/product.ts"
      via: "import { resolveEffectiveDims } from '@/types/product'"
      pattern: "resolveEffectiveDims"
    - from: "tests/wallEndpointSnap.test.ts"
      to: "src/canvas/wallEndpointSnap.ts"
      via: "import { buildWallEndpointSnapScene } from '@/canvas/wallEndpointSnap'"
      pattern: "buildWallEndpointSnapScene"
    - from: "tests/updatePlacedCustomElement.test.ts"
      to: "src/stores/cadStore.ts"
      via: "useCADStore.getState().updatePlacedCustomElement(id, { labelOverride })"
      pattern: "updatePlacedCustomElement"
---

<objective>
Create red (failing) test stubs for every new pure module, store action, tool branch, and UI flow introduced by Phase 31. No production code in this plan.

Purpose: Lock EDIT-22/23/24 + CUSTOM-06 contracts before Wave 1/2 code, mirror the Phase 29/30 TDD shape. The driver bridge contracts (`window.__driveResize`, `window.__driveWallEndpoint`, `window.__driveLabelOverride`) are documented inline for Wave 2 to implement against.
Output: 8 test files in `tests/` that all FAIL on `npm test -- --run`, producing "module not found" / "is not a function" / assertion errors.
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
@.planning/phases/31-drag-resize-label-override/31-VALIDATION.md
@tests/snapEngine.test.ts
@tests/snapGuides.test.ts
@tests/dimensionEditor.test.ts
@src/canvas/resizeHandles.ts
@src/canvas/wallEditHandles.ts
@src/canvas/snapEngine.ts

<interfaces>
<!-- Forthcoming type/function signatures that tests must reference. Wave 1/2 implement these exactly. -->

```typescript
// src/canvas/resizeHandles.ts (EXTENDED)
export type CornerHandle = "ne" | "nw" | "sw" | "se";
export type EdgeHandle = "n" | "s" | "e" | "w";
export const EDGE_HANDLE_HIT_RADIUS_FT = 0.5;

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
// src/types/product.ts (EXTENDED — wraps existing effectiveDimensions, does NOT replace)
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
// src/canvas/wallEndpointSnap.ts (NEW)
import type { SceneGeometry } from "@/canvas/snapEngine";
import type { WallSegment } from "@/types/cad";

export function buildWallEndpointSnapScene(
  walls: Record<string, WallSegment>,
  draggedWallId: string,
): SceneGeometry;
```

```typescript
// src/stores/cadStore.ts (NEW actions)
updatePlacedCustomElement: (id: string, changes: Partial<PlacedCustomElement>) => void;
updatePlacedCustomElementNoHistory: (id: string, changes: Partial<PlacedCustomElement>) => void;
resizeProductAxis: (id: string, axis: "width" | "depth", valueFt: number) => void;
resizeProductAxisNoHistory: (id: string, axis: "width" | "depth", valueFt: number) => void;
resizeCustomElementAxis: (id: string, axis: "width" | "depth", valueFt: number) => void;
resizeCustomElementAxisNoHistory: (id: string, axis: "width" | "depth", valueFt: number) => void;
clearProductOverrides: (id: string) => void;
clearCustomElementOverrides: (id: string) => void;
```

```typescript
// src/types/cad.ts (FIELD ADDITIONS — all optional, no migration per D-04)
interface PlacedProduct {
  // ...existing...
  widthFtOverride?: number;
  depthFtOverride?: number;
}
interface PlacedCustomElement {
  // ...existing...
  widthFtOverride?: number;
  depthFtOverride?: number;
  labelOverride?: string;
}
```

```typescript
// Driver bridges (installed by selectTool.ts / PropertiesPanel.tsx when import.meta.env.MODE === "test")
declare global {
  interface Window {
    __driveResize?: {
      start: (placedId: string, handle: "corner-ne"|"corner-nw"|"corner-sw"|"corner-se"|"edge-n"|"edge-s"|"edge-e"|"edge-w") => void;
      to: (feetX: number, feetY: number, opts?: { shift?: boolean; alt?: boolean }) => void;
      end: () => void;
    };
    __driveWallEndpoint?: {
      start: (wallId: string, which: "start"|"end") => void;
      to: (feetX: number, feetY: number, opts?: { shift?: boolean; alt?: boolean }) => void;
      end: () => void;
      getGuides: () => Array<{ type: string }>;
    };
    __driveLabelOverride?: {
      typeAndCommit: (placedCustomElementId: string, text: string, mode: "enter"|"blur") => void;
    };
  }
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Pure-module unit test stubs (resizeHandles + resolveEffectiveDims + wallEndpointSnap + updatePlacedCustomElement)</name>
  <files>tests/resizeHandles.test.ts, tests/resolveEffectiveDims.test.ts, tests/wallEndpointSnap.test.ts, tests/updatePlacedCustomElement.test.ts</files>
  <read_first>
    - tests/snapEngine.test.ts (vitest pure-function stub pattern)
    - tests/cadStore.test.ts (store-action test pattern, getState/setState + past.length assertions)
    - src/canvas/resizeHandles.ts (existing corner getResizeHandles + hitTestResizeHandle to extend)
    - src/canvas/snapEngine.ts (SceneGeometry + BBox shape to match in wallEndpointSnap)
    - src/stores/cadStore.ts (updateWall / updateWallNoHistory pattern to mirror)
    - .planning/phases/31-drag-resize-label-override/31-RESEARCH.md §Pattern 1 (Edge-Handle Hit-Test), §Pattern 3 (Effective-Dimension Resolver), §Example: Restricted Snap Scene
  </read_first>
  <behavior>
    FOUR test files, each exercising one pure module. All four MUST fail initially because the extended exports / new module / new action do not exist yet.

    === tests/resizeHandles.test.ts ===

    describe('getEdgeHandles'):
    - rotation=0, width=4, depth=2, position=(10,10) → returns { n:(10,9), s:(10,11), e:(12,10), w:(8,10) } (y increases south per canvas convention)
    - rotation=90, same product → n becomes (9,10), e becomes (10,12) (CCW 90° rotation applied)
    - rotation=45, width=2, depth=2, position=(0,0) → e world point equals (cos45, sin45) ≈ (0.707, 0.707)

    describe('hitTestEdgeHandle'):
    - pointer exactly on north handle → returns "n"
    - pointer 0.4ft from east handle → returns "e" (within EDGE_HANDLE_HIT_RADIUS_FT=0.5)
    - pointer 0.6ft from all handles → returns null
    - EDGE_HANDLE_HIT_RADIUS_FT exported === 0.5

    describe('hitTestAnyResizeHandle (Pitfall 1 — corners win ties)'):
    - small product where NE corner (hw,-hd) and N edge (0,-hd) are both within 0.5ft of pointer → returns { kind:"corner", which:"ne" }
    - pointer only near edge midpoint (not corner) → returns { kind:"edge", which:"n" }
    - pointer far from all 8 handles → returns null

    describe('edgeDragToAxisValue'):
    - rotation=0, pp.position=(0,0), edge="e", pointer=(3, 0) → { axis:"width", valueFt:6 } (2×|lx|)
    - rotation=0, edge="n", pointer=(0, -2) → { axis:"depth", valueFt:4 }
    - rotation=90, edge="e", pointer=(0, 3) in world → rotates back to local lx=3 → { axis:"width", valueFt:6 }
    - Clamping: pointer=(100,0), edge="e" → valueFt=50 (Math.min(50, ...))
    - Clamping: pointer=(0.05,0), edge="e" → valueFt=0.25 (Math.max(0.25, ...))

    At least 13 it() blocks total.

    === tests/resolveEffectiveDims.test.ts ===

    describe('resolveEffectiveDims'):
    - Product { width:4, depth:2, height:3 }, placed { sizeScale: 2 } → { width:8, depth:4, height:3, isPlaceholder:false }
    - Product { width:4, depth:2, height:3 }, placed { sizeScale: 2, widthFtOverride: 10 } → { width:10, depth:4, height:3, isPlaceholder:false }
    - Product { width:4, depth:2, height:3 }, placed { sizeScale: 2, depthFtOverride: 5 } → { width:8, depth:5, ... }
    - Product { width:4, depth:2, height:3 }, placed { sizeScale: 2, widthFtOverride: 10, depthFtOverride: 5 } → { width:10, depth:5, ... }
    - Product undefined (orphan), placed { sizeScale:1 } → { width:2, depth:2, height:2, isPlaceholder:true } (placeholder fallback preserved)
    - Product with null width, placed {} (no overrides, no sizeScale) → placeholder path
    - Product fine, placed {} (no sizeScale) → sizeScale defaulted to 1

    describe('resolveEffectiveCustomDims'):
    - CustomElement { width:3, depth:3, height:7 }, placed { sizeScale:1 } → { width:3, depth:3, height:7 }
    - CustomElement { width:3, depth:3, height:7 }, placed { sizeScale:1, widthFtOverride:6 } → { width:6, depth:3, height:7 }
    - CustomElement undefined, placed {} → { width:2, depth:2, height:2 } (placeholder; no isPlaceholder field — custom elements don't distinguish)
    - Override takes precedence over sizeScale (D-02)

    At least 11 it() blocks.

    === tests/wallEndpointSnap.test.ts ===

    describe('buildWallEndpointSnapScene'):
    - walls = { w1: {start:(0,0), end:(10,0)}, w2: {start:(5,5), end:(5,10)} }, draggedWallId="w1"
      → objectBBoxes.length === 2 (w2 start + w2 end, both zero-size at those points)
      → wallMidpoints.length === 1, midpoint at (5, 7.5), wallId="w2", axis="y"
      → wallEdges.length === 0 (D-05: no wall-face snapping for endpoints)
    - Three walls, dragging w1 → scene excludes w1's own endpoints + midpoint
    - Diagonal wall (non-ortho) → classifyAxis returns "diag"
    - Horizontal wall (dy=0) → axis="x"
    - Vertical wall (dx=0) → axis="y"
    - Product bboxes NOT in scene (D-05 negative): even if test passes placedProducts to the function signature, they should not appear (either function doesn't accept them at all, or they're ignored — test the former by only passing walls)

    At least 7 it() blocks.

    === tests/updatePlacedCustomElement.test.ts ===

    beforeEach: reset store to known state via `useCADStore.setState` with a room containing one placedCustomElement {id:"pce-1", customElementId:"ce-1", position:(0,0), rotation:0} and a catalog customElement {id:"ce-1", name:"Fridge", width:3, depth:3, height:6, shape:"box", color:"#ccc"}.

    describe('updatePlacedCustomElement (Pitfall 4 — distinct from updateCustomElement)'):
    - Calling updatePlacedCustomElement("pce-1", { labelOverride: "Big Fridge" }) → active room's placedCustomElements["pce-1"].labelOverride === "Big Fridge"
    - The CATALOG entry customElements["ce-1"].name remains "Fridge" (unchanged)
    - past.length grows by exactly 1 after one call (history push)
    - Calling with non-existent id is a no-op (no throw, no history push)
    - Partial update preserves other fields (position, rotation unchanged)
    - Supports widthFtOverride and depthFtOverride fields in the Partial

    describe('updatePlacedCustomElementNoHistory'):
    - Same mutation semantics as updatePlacedCustomElement
    - past.length does NOT grow after call
    - Used for live-preview mid-edit

    describe('clearProductOverrides / clearCustomElementOverrides'):
    - After setting widthFtOverride/depthFtOverride, calling clearProductOverrides sets both fields to undefined
    - past.length grows by 1
    - sizeScale is NOT touched

    At least 10 it() blocks.
  </behavior>
  <action>
    Create the four files using the existing tests/ conventions. Each file must import from the forthcoming module paths. Running vitest MUST produce red output (module not found or "is not a function").

    File 1 — `tests/resizeHandles.test.ts`:
    ```typescript
    import { describe, it, expect } from "vitest";
    import {
      getEdgeHandles,
      hitTestEdgeHandle,
      hitTestAnyResizeHandle,
      edgeDragToAxisValue,
      EDGE_HANDLE_HIT_RADIUS_FT,
    } from "@/canvas/resizeHandles";
    import type { PlacedProduct } from "@/types/cad";
    ```
    Use inline PlacedProduct fixtures. Reference D-IDs in test names (e.g., `it("Pitfall 1: corner wins tie over edge", ...)`).

    File 2 — `tests/resolveEffectiveDims.test.ts`:
    ```typescript
    import { describe, it, expect } from "vitest";
    import { resolveEffectiveDims, resolveEffectiveCustomDims, PLACEHOLDER_DIM_FT } from "@/types/product";
    import type { Product } from "@/types/product";
    import type { PlacedProduct, PlacedCustomElement, CustomElement } from "@/types/cad";
    ```

    File 3 — `tests/wallEndpointSnap.test.ts`:
    ```typescript
    import { describe, it, expect } from "vitest";
    import { buildWallEndpointSnapScene } from "@/canvas/wallEndpointSnap";
    import type { WallSegment } from "@/types/cad";
    ```
    Build WallSegment fixtures inline (include all required fields: id, start, end, thickness, height, openings:[]). Assert `scene.wallEdges.length === 0`, `scene.objectBBoxes.length === 2`, `scene.wallMidpoints[0].axis === "y"`.

    File 4 — `tests/updatePlacedCustomElement.test.ts`:
    ```typescript
    import { describe, it, expect, beforeEach } from "vitest";
    import { useCADStore } from "@/stores/cadStore";
    ```
    Use `useCADStore.setState(...)` to seed a room with one placedCustomElement + catalog. Call the new actions via `useCADStore.getState().updatePlacedCustomElement(...)`. Read back via `useCADStore.getState().rooms[activeRoomId].placedCustomElements`. Assert `past.length` delta precisely.

    Do NOT use `it.todo` — every it() block must execute.
  </action>
  <verify>
    <automated>npx vitest run tests/resizeHandles.test.ts tests/resolveEffectiveDims.test.ts tests/wallEndpointSnap.test.ts tests/updatePlacedCustomElement.test.ts 2>&1 | tee /tmp/phase31-wave0-unit.log; grep -qE "(Cannot find module|is not a function|FAIL)" /tmp/phase31-wave0-unit.log</automated>
  </verify>
  <acceptance_criteria>
    - All four files exist under `tests/`
    - Each imports from the `@/*` path of its forthcoming module
    - `tests/resizeHandles.test.ts` contains ≥13 `it(` blocks and references `hitTestAnyResizeHandle` and `edgeDragToAxisValue`
    - `tests/resolveEffectiveDims.test.ts` contains ≥11 `it(` blocks and references `resolveEffectiveDims` and `resolveEffectiveCustomDims`
    - `tests/wallEndpointSnap.test.ts` contains ≥7 `it(` blocks, asserts `wallEdges.length === 0`, and references `buildWallEndpointSnapScene`
    - `tests/updatePlacedCustomElement.test.ts` contains ≥10 `it(` blocks and references `updatePlacedCustomElement`, `updatePlacedCustomElementNoHistory`, `clearProductOverrides`
    - Running `npx vitest run tests/resizeHandles.test.ts tests/resolveEffectiveDims.test.ts tests/wallEndpointSnap.test.ts tests/updatePlacedCustomElement.test.ts` exits NON-ZERO (red)
    - grep -c "it(" across the 4 files returns ≥41
  </acceptance_criteria>
  <done>Four red unit test files exist; every pure-module contract (edge hit-test, override resolver, restricted snap scene, new store action) is expressed as executable vitest assertions. Running them fails with module-not-found or assertion errors.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Integration + RTL test stubs (resize + wall-endpoint + single-undo + label-override)</name>
  <files>tests/phase31Resize.test.tsx, tests/phase31WallEndpoint.test.tsx, tests/phase31Undo.test.tsx, tests/phase31LabelOverride.test.tsx</files>
  <read_first>
    - tests/snapIntegration.test.tsx (Phase 30 RTL harness pattern — canonical reference)
    - tests/dimensionEditor.test.ts (Phase 29 window.__drive* driver pattern + commit-on-Enter/blur)
    - tests/setup.ts (test setup for happy-dom + canvas polyfills)
    - src/canvas/tools/selectTool.ts L560-905 (existing dragType dispatch, wall-endpoint branch, productTool driver precedent)
    - .planning/phases/31-drag-resize-label-override/31-RESEARCH.md §Validation Architecture §Test Driver Bridges
    - .planning/phases/31-drag-resize-label-override/31-CONTEXT.md §D-01 through §D-17
  </read_first>
  <behavior>
    FOUR integration/RTL test files. Each mounts a minimal harness (App or FabricCanvas+PropertiesPanel), seeds cadStore, calls `window.__drive*` drivers (to be installed by Wave 2), asserts on store state + canvas objects. All MUST fail because drivers are not installed yet.

    === tests/phase31Resize.test.tsx ===

    beforeEach: reset cadStore; seed room { width:20, length:20, wallHeight:8 }; add one PlacedProduct {id:"pp-1", productId:"prod-1", position:(5,5), rotation:0, sizeScale:1}; seed productLibrary with prod-1 { width:2, depth:2, height:3 }.

    describe('corner drag writes sizeScale (EDIT-22 corner path unchanged)'):
    - render(<App />); setActiveTool("select"); select pp-1; wait for window.__driveResize
    - __driveResize.start("pp-1", "corner-ne"); __driveResize.to(8, 2); __driveResize.end()
    - useCADStore.getState().rooms[activeId].placedProducts["pp-1"].sizeScale !== 1 (changed)
    - widthFtOverride and depthFtOverride are BOTH undefined (corner drag must not write per-axis)

    describe('edge drag writes widthFtOverride (EDIT-22 edge path NEW)'):
    - __driveResize.start("pp-1", "edge-e"); __driveResize.to(8, 5); __driveResize.end()
    - placedProducts["pp-1"].widthFtOverride === <grid-snapped value near 6ft> (2 × |8-5| = 6, rounded to uiStore.gridSnap=0.5)
    - placedProducts["pp-1"].depthFtOverride === undefined
    - sizeScale unchanged from pre-drag value

    describe('edge drag writes depthFtOverride (n/s)'):
    - __driveResize.start("pp-1", "edge-n"); __driveResize.to(5, 1); __driveResize.end()
    - placedProducts["pp-1"].depthFtOverride === <grid-snapped value>
    - placedProducts["pp-1"].widthFtOverride === undefined

    describe('grid-snap applies to edge drag (EDIT-22 grid clause)'):
    - set uiStore.gridSnap = 1.0; edge-e drag ending at unsnapped 6.3ft → stored value is 6 or 7 (integer)

    describe('clearProductOverrides reverts to sizeScale'):
    - After edge drag sets widthFtOverride, call useCADStore.getState().clearProductOverrides("pp-1")
    - widthFtOverride and depthFtOverride both undefined
    - sizeScale unchanged

    At least 6 it() blocks.

    === tests/phase31WallEndpoint.test.tsx ===

    beforeEach: seed 2 walls — w1 horizontal from (0,0) to (10,0); w2 vertical from (15,0) to (15,10).

    describe('EDIT-23 snap to other wall endpoint'):
    - __driveWallEndpoint.start("w1", "end"); __driveWallEndpoint.to(14.9, 0.1); __driveWallEndpoint.end()
    - walls["w1"].end.x ≈ 15 (snapped to w2.start.x within SNAP_TOLERANCE_PX=8)
    - walls["w1"].end.y ≈ 0 (snapped to w2.start.y)
    - __driveWallEndpoint.getGuides().length >= 1 during the drag (called after .to, before .end)

    describe('EDIT-23 snap to wall midpoint (D-05 midpoints in scene)'):
    - __driveWallEndpoint.start("w1", "end"); __driveWallEndpoint.to(14.9, 4.9); __driveWallEndpoint.end()
    - walls["w1"].end ≈ (15, 5) (w2 midpoint)

    describe('D-06 Shift-orthogonal locks axis, snap applies within lock'):
    - __driveWallEndpoint.start("w1", "end"); __driveWallEndpoint.to(12, 3, { shift: true }); __driveWallEndpoint.end()
    - walls["w1"].end.y === walls["w1"].start.y (y locked to 0 — horizontal wall stays horizontal)
    - walls["w1"].end.x may be snapped to 15 (w2's x), but y MUST equal 0

    describe('D-07 Alt disables smart-snap, keeps grid-snap'):
    - Set uiStore.gridSnap = 1.0; __driveWallEndpoint.start("w1", "end"); __driveWallEndpoint.to(14.9, 0.1, { alt: true }); __driveWallEndpoint.end()
    - walls["w1"].end.x === 15 (grid-rounded; not necessarily wall-snap)
    - walls["w1"].end.y === 0 (grid-rounded to nearest 1.0)
    - __driveWallEndpoint.getGuides().length === 0 (no snap guides when Alt held)

    describe('D-05 negative: walls do NOT snap to product bboxes'):
    - Seed a PlacedProduct at (14.8, 0.2) with bbox overlapping potential snap zone
    - __driveWallEndpoint.start("w1", "end"); __driveWallEndpoint.to(14.8, 0.2); __driveWallEndpoint.end()
    - walls["w1"].end is NOT snapped to the product bbox corner (x stays near 14.8 after grid-snap; does not jump to 14.8-half-width of product)
    - Guides contain no object-edge targets originating from the product

    describe('guides clear on drag end'):
    - After __driveWallEndpoint.end(), __driveWallEndpoint.getGuides().length === 0

    At least 6 it() blocks.

    === tests/phase31Undo.test.tsx ===

    beforeEach: reset cadStore; seed room + 1 product + 1 custom element + 1 wall.

    describe('EDIT-24 single-undo: corner drag'):
    - const before = useCADStore.getState().past.length
    - __driveResize.start("pp-1", "corner-ne"); .to(..); .to(..); .to(..); .end()
    - expect(useCADStore.getState().past.length).toBe(before + 1)

    describe('EDIT-24 single-undo: edge drag (product)'):
    - Same pattern with "edge-e" handle
    - past.length delta === 1

    describe('EDIT-24 single-undo: edge drag (custom element)'):
    - Use __driveResize against a placedCustomElement id
    - past.length delta === 1

    describe('EDIT-24 single-undo: wall endpoint drag'):
    - __driveWallEndpoint.start("w1","end"); multiple .to(); .end()
    - past.length delta === 1

    describe('CUSTOM-06 single-undo: label-override edit session'):
    - __driveLabelOverride.typeAndCommit("pce-1", "Couch", "enter")
    - past.length delta === 1 (not +len("Couch"))
    - Repeat with mode: "blur" — same delta

    describe('EDIT-24 undo fully restores pre-drag state'):
    - Capture pre-drag snapshot (sizeScale, widthFtOverride, position)
    - Do a full corner drag
    - Call useCADStore.getState().undo()
    - Every captured field equals its pre-drag value

    At least 6 it() blocks.

    === tests/phase31LabelOverride.test.tsx ===

    beforeEach: seed custom element catalog { ce-1: { name: "Fridge" } } + placedCustomElement { pce-1: { customElementId: "ce-1", position:(5,5), rotation:0 } }.

    describe('CUSTOM-06 PropertiesPanel renders input when custom element selected'):
    - setActiveTool("select"); selection state set to pce-1
    - render(<App />) or (<PropertiesPanel />) — query for input[placeholder*="FRIDGE"] (D-11 uppercase catalog name as ghost)
    - Input's maxLength === 40 (D-12)

    describe('CUSTOM-06 live preview on keystroke (D-09 no debounce)'):
    - Type "couch" one char at a time via userEvent
    - After each keystroke, placedCustomElements["pce-1"].labelOverride reflects partial text
    - updatePlacedCustomElementNoHistory was the call path (past.length unchanged during typing — assert via before/after past.length)

    describe('CUSTOM-06 commit on Enter writes history (D-10)'):
    - Type "couch", press Enter
    - past.length grew by exactly 1 over the whole session

    describe('CUSTOM-06 commit on blur writes history (D-10)'):
    - Type "couch", blur the input (fireEvent.blur or click elsewhere)
    - past.length grew by exactly 1

    describe('CUSTOM-06 empty reverts to catalog name (D-11)'):
    - Type "", commit → placedCustomElements["pce-1"].labelOverride === undefined
    - fabricSync renders uppercase "FRIDGE" (catalog name) — assert via render lookup helper OR via reading from canvas getObjects() filter

    describe('CUSTOM-06 Escape cancels live-preview (mirror Phase 29)'):
    - Seed pce-1 with pre-existing labelOverride = "Original"
    - Type "new", press Escape
    - placedCustomElements["pce-1"].labelOverride === "Original" (reverted via NoHistory rewind)
    - past.length unchanged

    describe('CUSTOM-06 fabricSync label render uses override'):
    - Seed labelOverride = "Mini Fridge"
    - Render, read canvas text objects, find the label attached to pce-1, assert text === "MINI FRIDGE"

    describe('CUSTOM-06 override persists through save/load round-trip'):
    - Set labelOverride = "Bob"
    - Snapshot via useCADStore.getState() → JSON.stringify → JSON.parse → loadSnapshot
    - labelOverride === "Bob" survives

    At least 8 it() blocks.
  </behavior>
  <action>
    Create the four files. File 1 — `tests/phase31Resize.test.tsx`:
    ```typescript
    import { describe, it, expect, beforeEach } from "vitest";
    import { render } from "@testing-library/react";
    import App from "@/App";
    import { useCADStore } from "@/stores/cadStore";
    import { useUIStore } from "@/stores/uiStore";

    declare global {
      interface Window {
        __driveResize?: {
          start: (placedId: string, handle: "corner-ne"|"corner-nw"|"corner-sw"|"corner-se"|"edge-n"|"edge-s"|"edge-e"|"edge-w") => void;
          to: (feetX: number, feetY: number, opts?: { shift?: boolean; alt?: boolean }) => void;
          end: () => void;
        };
      }
    }
    ```
    In-file header comment: "`window.__driveResize` is installed by selectTool.ts when import.meta.env.MODE === 'test' — see Plan 31-02/31-03."

    File 2 — `tests/phase31WallEndpoint.test.tsx`: mirror File 1's pattern with `__driveWallEndpoint`. Reference D-05, D-06, D-07 in test names.

    File 3 — `tests/phase31Undo.test.tsx`: reuse both `__driveResize` and `__driveWallEndpoint` and `__driveLabelOverride` drivers. Core assertion idiom:
    ```typescript
    const before = useCADStore.getState().past.length;
    window.__driveResize!.start("pp-1", "corner-ne");
    window.__driveResize!.to(7, 3);
    window.__driveResize!.to(8, 2);
    window.__driveResize!.end();
    expect(useCADStore.getState().past.length).toBe(before + 1);
    ```

    File 4 — `tests/phase31LabelOverride.test.tsx`: full RTL with userEvent:
    ```typescript
    import { render, fireEvent, screen } from "@testing-library/react";
    import userEvent from "@testing-library/user-event";
    ```
    Use `screen.getByPlaceholderText(/FRIDGE/)` or `getByLabelText` to find the input. For the fabricSync render assertion, expose a helper (to be installed in Plan 31-03): `window.__getCustomElementLabel(pceId: string): string` — OR read directly via the fabric canvas DOM ref. Document the expected helper in a file comment.

    Handle happy-dom canvas polyfill needs: import from `tests/setup.ts` (already wired). If snapIntegration.test.tsx does additional setup (e.g., fake-indexeddb), mirror it.

    At top of each file, assert driver existence before use:
    ```typescript
    await vi.waitFor(() => expect(window.__driveResize).toBeDefined());
    ```

    Do NOT use it.todo; every block must execute and fail.
  </action>
  <verify>
    <automated>npx vitest run tests/phase31Resize.test.tsx tests/phase31WallEndpoint.test.tsx tests/phase31Undo.test.tsx tests/phase31LabelOverride.test.tsx 2>&1 | tee /tmp/phase31-wave0-int.log; grep -qE "(Cannot find|is not a function|FAIL|toBeDefined)" /tmp/phase31-wave0-int.log</automated>
  </verify>
  <acceptance_criteria>
    - All four .tsx files exist under `tests/`
    - `tests/phase31Resize.test.tsx` contains ≥6 `it(` blocks and references `__driveResize`, `corner-ne`, `edge-e`, `widthFtOverride`
    - `tests/phase31WallEndpoint.test.tsx` contains ≥6 `it(` blocks and references `__driveWallEndpoint`, `shift: true`, `alt: true`, `getGuides`
    - `tests/phase31Undo.test.tsx` contains ≥6 `it(` blocks and the exact substring `past.length` appears ≥6 times
    - `tests/phase31LabelOverride.test.tsx` contains ≥8 `it(` blocks and references `__driveLabelOverride`, `labelOverride`, `maxLength`
    - Running `npx vitest run tests/phase31Resize.test.tsx tests/phase31WallEndpoint.test.tsx tests/phase31Undo.test.tsx tests/phase31LabelOverride.test.tsx` exits NON-ZERO (red)
    - grep finds comment line referencing "Plan 31-02" or "Plan 31-03" in each file (driver contract advertisement)
  </acceptance_criteria>
  <done>Four red integration/RTL test files exist. Every EDIT-22/23/24 drag path, CUSTOM-06 label UX (live preview, Enter/blur commit, Escape cancel, empty-reverts, save/load round-trip), and EDIT-24 single-undo assertion is expressed as executable vitest. Driver contracts (`window.__driveResize`, `window.__driveWallEndpoint`, `window.__driveLabelOverride`) are documented in-file for Wave 2.</done>
</task>

</tasks>

<verification>
- All 8 test files exist under `tests/`
- Running `npx vitest run tests/resizeHandles.test.ts tests/resolveEffectiveDims.test.ts tests/wallEndpointSnap.test.ts tests/updatePlacedCustomElement.test.ts tests/phase31Resize.test.tsx tests/phase31WallEndpoint.test.tsx tests/phase31Undo.test.tsx tests/phase31LabelOverride.test.tsx` produces FAIL output (red state expected)
- No new code under `src/` — test-scaffolding-only plan
- Each test file imports from the `@/*` alias for its forthcoming module
- Driver contracts `__driveResize`, `__driveWallEndpoint`, `__driveLabelOverride` are documented in-file for Wave 2 consumption
- `npm test -- --run` total fail count shows ≥50 new failures traceable to Phase 31 assertions
</verification>

<success_criteria>
- 8 red test files exist; each fails with module-not-found, function-not-defined, or assertion error
- Every row in 31-VALIDATION.md §Wave 0 Requirements maps to at least one it() block
- Every row in 31-RESEARCH.md §Phase Requirements → Test Map maps to at least one it() block
- EDIT-24 single-undo assertion is executable in 5 distinct scenarios (corner, edge-product, edge-custom, wall-endpoint, label-override)
- D-17 regression tests for all 3 drag types + label edit are in place
- Driver contracts are advertised in-file for Wave 2
</success_criteria>

<output>
After completion, create `.planning/phases/31-drag-resize-label-override/31-01-SUMMARY.md` documenting:
- 8 test files created with paths
- it() count per file (should total ≥57 across all 8)
- Red state confirmation command + output snippet showing failure counts
- Driver contracts advertised to Wave 2 (`__driveResize`, `__driveWallEndpoint`, `__driveLabelOverride`) with full signatures
- Cross-reference back to 31-VALIDATION.md §Wave 0 Requirements showing each bullet is satisfied
</output>
