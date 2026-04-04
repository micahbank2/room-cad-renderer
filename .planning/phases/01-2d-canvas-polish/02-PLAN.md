---
phase: 01-2d-canvas-polish
plan: 02
type: execute
wave: 2
depends_on: [00]
files_modified:
  - src/canvas/dragDrop.ts
  - src/canvas/FabricCanvas.tsx
  - src/components/ProductLibrary.tsx
  - src/stores/cadStore.ts
  - tests/dragDrop.test.ts
  - tests/cadStore.test.ts
autonomous: true
requirements: [EDIT-07]
must_haves:
  truths:
    - "Jessica drags a product card from the library sidebar and drops it onto the canvas; the product appears at the drop point snapped to the grid"
    - "The newly dropped product is auto-selected (per D-03) — she can immediately rotate or nudge"
    - "The existing click-to-place flow (productTool.ts) still works unchanged (per D-04)"
  artifacts:
    - path: "src/canvas/dragDrop.ts"
      provides: "attachDragDropHandlers(wrapperEl, getScaleOrigin) returning cleanup fn"
      exports: ["attachDragDropHandlers", "DRAG_MIME"]
    - path: "src/components/ProductLibrary.tsx"
      provides: "product card has draggable + dragstart that sets dataTransfer with DRAG_MIME payload"
      contains: "draggable"
    - path: "src/canvas/FabricCanvas.tsx"
      provides: "wrapper div has dragover+drop handlers attached in mount effect"
      contains: "attachDragDropHandlers"
    - path: "src/stores/cadStore.ts"
      provides: "placeProduct returns the new string id"
      contains: "return id"
  key_links:
    - from: "ProductLibrary card dragstart"
      to: "FabricCanvas wrapper drop"
      via: "dataTransfer with MIME 'application/x-room-cad-product'"
      pattern: "application/x-room-cad-product"
    - from: "drop handler"
      to: "cadStore.placeProduct + uiStore.select"
      via: "snapPoint -> placeProduct returns id -> uiStore.select([id])"
      pattern: "placeProduct\\(.*\\).*select\\(\\["
---

<objective>
Implement EDIT-07: drag a product from the library sidebar onto the 2D canvas to place it at the cursor position. Uses HTML5 drag-and-drop API (per D-01). Drop position snaps to grid (per D-02). Newly placed product is auto-selected (per D-03). Existing click-to-place remains as fallback (per D-04).

Primary blocker noted in RESEARCH §Pattern 2: `cadStore.placeProduct` currently returns void — must be modified to return the new `id: string` so the drop handler can auto-select.

Purpose: This is the primary product-placement flow Jessica will use. Drag-drop feels natural; click-to-place requires two clicks (library card to select + canvas click).
Output: Library card is draggable; canvas wrapper is a drop target; drop places + auto-selects a product.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-2d-canvas-polish/01-RESEARCH.md
@.planning/phases/01-2d-canvas-polish/01-CONTEXT.md
@src/canvas/FabricCanvas.tsx
@src/canvas/tools/productTool.ts
@src/stores/cadStore.ts
@src/stores/uiStore.ts
@src/lib/geometry.ts
@src/components/ProductLibrary.tsx

<interfaces>
From src/stores/cadStore.ts (current — placeProduct signature must change):
```typescript
// CURRENT: placeProduct: (productId: string, position: Point) => void;
// NEW:     placeProduct: (productId: string, position: Point) => string;  // returns new pp_ id
```

From src/stores/uiStore.ts:
```typescript
select: (ids: string[]) => void;
```

From src/lib/geometry.ts:
```typescript
export function snapPoint(p: Point, grid: number): Point;
```

Scale/origin calculation (same as FabricCanvas.tsx redraw):
```typescript
const pad = 50;
const scale = Math.min((cW - pad*2) / roomW, (cH - pad*2) / roomH);
const origin = { x: (cW - roomW*scale)/2, y: (cH - roomH*scale)/2 };
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Modify cadStore.placeProduct to return new id</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/src/stores/cadStore.ts (current placeProduct at lines 110-117; CADState interface at lines 15-36)
    - /Users/micahbank/room-cad-renderer/tests/cadStore.test.ts (stubs from plan 00)
  </read_first>
  <files>src/stores/cadStore.ts, tests/cadStore.test.ts</files>
  <behavior>
    - Test ("placeProduct returns new id and adds to placedProducts"): Calling placeProduct returns a string starting with "pp_". The returned id is a key in state.placedProducts with productId + position set correctly.
  </behavior>
  <action>
    In /Users/micahbank/room-cad-renderer/src/stores/cadStore.ts:

    1. Change CADState interface (line 28):
       FROM: `placeProduct: (productId: string, position: Point) => void;`
       TO:   `placeProduct: (productId: string, position: Point) => string;`

    2. Change the implementation (lines 110-117). The current body uses `set(produce(...))` which does not return a value. Rewrite as:

    ```typescript
    placeProduct: (productId, position) => {
      const id = `pp_${uid()}`;
      set(
        produce((s: CADState) => {
          pushHistory(s);
          s.placedProducts[id] = { id, productId, position, rotation: 0 };
        })
      );
      return id;
    },
    ```

    Then REPLACE the matching `it.todo` in /Users/micahbank/room-cad-renderer/tests/cadStore.test.ts with a real test. Add this full file content (preserving other it.todo entries that other plans will fill):

    ```typescript
    import { describe, it, expect, beforeEach } from "vitest";
    import { useCADStore } from "@/stores/cadStore";

    function reset() {
      useCADStore.setState({
        room: { width: 20, length: 16, wallHeight: 8 },
        walls: {},
        placedProducts: {},
        past: [],
        future: [],
      });
    }

    describe("cadStore actions", () => {
      beforeEach(reset);

      it("placeProduct returns new id and adds to placedProducts", () => {
        const id = useCADStore.getState().placeProduct("prod_1", { x: 5, y: 6 });
        expect(id).toMatch(/^pp_/);
        const pp = useCADStore.getState().placedProducts[id];
        expect(pp).toBeDefined();
        expect(pp.productId).toBe("prod_1");
        expect(pp.position).toEqual({ x: 5, y: 6 });
        expect(pp.rotation).toBe(0);
      });

      it.todo("moveProduct updates position");
      it.todo("rotateProduct updates rotation and pushes history");
      it.todo("rotate: rotateProductNoHistory updates rotation without pushing history");
      it.todo("updateWall: wall resize corner propagates to shared-endpoint walls");
      it.todo("undo restores prior snapshot");
      it.todo("redo re-applies undone snapshot");
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run tests/cadStore.test.ts -t "placeProduct returns" && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "placeProduct: (productId: string, position: Point) => string;" src/stores/cadStore.ts` succeeds
    - `grep -q "return id;" src/stores/cadStore.ts` succeeds
    - `grep -B1 "return id;" src/stores/cadStore.ts | grep -q "placeProduct\\|pushHistory\\|placedProducts"` succeeds
    - `npx vitest run tests/cadStore.test.ts -t "placeProduct returns"` passes
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>placeProduct returns new id; first real cadStore test passes.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create src/canvas/dragDrop.ts with attachDragDropHandlers and coord translation</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/.planning/phases/01-2d-canvas-polish/01-RESEARCH.md (§Pattern 2, §Code Examples EDIT-07 lines 482-540)
    - /Users/micahbank/room-cad-renderer/src/canvas/tools/productTool.ts (existing pxToFeet pattern)
    - /Users/micahbank/room-cad-renderer/tests/dragDrop.test.ts (stubs from plan 00)
  </read_first>
  <files>src/canvas/dragDrop.ts, tests/dragDrop.test.ts</files>
  <behavior>
    - Test ("coord translation: clientX/Y minus rect + origin divided by scale yields feet"): Given clientX=150, rect.left=50, origin.x=20, scale=10 → feet.x = (150-50-20)/10 = 8. Same for y.
    - Test ("snap + place: dropped point snaps to grid then calls placeProduct"): With gridSnap=0.5, a feet point {x:3.2, y:4.7} is passed as {x:3.0, y:4.5} to placeProduct.
    - Test ("auto-select: newly placed product id is set in uiStore.selectedIds"): After drop, uiStore.selectedIds equals [returnedId].
  </behavior>
  <action>
    Create /Users/micahbank/room-cad-renderer/src/canvas/dragDrop.ts with exact content:

    ```typescript
    import { useCADStore } from "@/stores/cadStore";
    import { useUIStore } from "@/stores/uiStore";
    import { snapPoint } from "@/lib/geometry";
    import type { Point } from "@/types/cad";

    export const DRAG_MIME = "application/x-room-cad-product";

    export interface ScaleOrigin {
      scale: number;
      origin: { x: number; y: number };
    }

    /** Convert clientX/Y to canvas-local feet coordinates. */
    export function clientToFeet(
      clientX: number,
      clientY: number,
      rect: { left: number; top: number },
      scale: number,
      origin: { x: number; y: number }
    ): Point {
      const px = { x: clientX - rect.left, y: clientY - rect.top };
      return {
        x: (px.x - origin.x) / scale,
        y: (px.y - origin.y) / scale,
      };
    }

    /**
     * Attach dragover + drop listeners to the canvas wrapper element.
     * getScaleOrigin() must return the CURRENT scale/origin (recomputed per call)
     * because redraw() recomputes them on every resize.
     * Returns a cleanup function.
     */
    export function attachDragDropHandlers(
      wrapper: HTMLElement,
      getScaleOrigin: () => ScaleOrigin
    ): () => void {
      const onDragOver = (e: DragEvent) => {
        if (!e.dataTransfer?.types.includes(DRAG_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      };

      const onDrop = (e: DragEvent) => {
        e.preventDefault();
        const productId = e.dataTransfer?.getData(DRAG_MIME);
        if (!productId) return;
        const rect = wrapper.getBoundingClientRect();
        const { scale, origin } = getScaleOrigin();
        const feet = clientToFeet(e.clientX, e.clientY, rect, scale, origin);
        const gridSnap = useUIStore.getState().gridSnap;
        const snapped = gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;
        const newId = useCADStore.getState().placeProduct(productId, snapped);
        useUIStore.getState().select([newId]);
      };

      wrapper.addEventListener("dragover", onDragOver);
      wrapper.addEventListener("drop", onDrop);

      return () => {
        wrapper.removeEventListener("dragover", onDragOver);
        wrapper.removeEventListener("drop", onDrop);
      };
    }
    ```

    Then REPLACE /Users/micahbank/room-cad-renderer/tests/dragDrop.test.ts with:

    ```typescript
    import { describe, it, expect, beforeEach } from "vitest";
    import { clientToFeet, attachDragDropHandlers, DRAG_MIME } from "@/canvas/dragDrop";
    import { useCADStore } from "@/stores/cadStore";
    import { useUIStore } from "@/stores/uiStore";

    beforeEach(() => {
      useCADStore.setState({
        room: { width: 20, length: 16, wallHeight: 8 },
        walls: {},
        placedProducts: {},
        past: [],
        future: [],
      });
      useUIStore.setState({ selectedIds: [], gridSnap: 0.5 });
    });

    describe("drag-drop placement", () => {
      it("coord translation: clientX/Y minus rect + origin divided by scale yields feet", () => {
        const feet = clientToFeet(150, 250, { left: 50, top: 100 }, 10, { x: 20, y: 30 });
        expect(feet.x).toBe((150 - 50 - 20) / 10); // 8
        expect(feet.y).toBe((250 - 100 - 30) / 10); // 12
      });

      it("snap + place: dropped point snaps to grid then calls placeProduct", () => {
        const wrapper = document.createElement("div");
        document.body.appendChild(wrapper);
        // Force a getBoundingClientRect by setting layout
        wrapper.getBoundingClientRect = () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => {} }) as DOMRect;

        const cleanup = attachDragDropHandlers(wrapper, () => ({ scale: 10, origin: { x: 0, y: 0 } }));

        const dt = new DataTransfer();
        dt.setData(DRAG_MIME, "prod_xyz");
        const dropEvt = new DragEvent("drop", { bubbles: true, cancelable: true, clientX: 32, clientY: 47, dataTransfer: dt });
        wrapper.dispatchEvent(dropEvt);

        const products = Object.values(useCADStore.getState().placedProducts);
        expect(products).toHaveLength(1);
        // clientToFeet -> (32/10, 47/10) = (3.2, 4.7); snap 0.5 -> (3.0, 4.5)
        expect(products[0].position).toEqual({ x: 3.0, y: 4.5 });
        expect(products[0].productId).toBe("prod_xyz");
        cleanup();
        wrapper.remove();
      });

      it("auto-select: newly placed product id is set in uiStore.selectedIds", () => {
        const wrapper = document.createElement("div");
        document.body.appendChild(wrapper);
        wrapper.getBoundingClientRect = () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => {} }) as DOMRect;
        const cleanup = attachDragDropHandlers(wrapper, () => ({ scale: 10, origin: { x: 0, y: 0 } }));

        const dt = new DataTransfer();
        dt.setData(DRAG_MIME, "prod_xyz");
        wrapper.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, clientX: 10, clientY: 10, dataTransfer: dt }));

        const selected = useUIStore.getState().selectedIds;
        expect(selected).toHaveLength(1);
        expect(selected[0]).toMatch(/^pp_/);
        const placedIds = Object.keys(useCADStore.getState().placedProducts);
        expect(selected[0]).toBe(placedIds[0]);
        cleanup();
        wrapper.remove();
      });
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run tests/dragDrop.test.ts && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/canvas/dragDrop.ts` succeeds
    - `grep -q "export const DRAG_MIME" src/canvas/dragDrop.ts` succeeds
    - `grep -q "application/x-room-cad-product" src/canvas/dragDrop.ts` succeeds
    - `grep -q "export function attachDragDropHandlers" src/canvas/dragDrop.ts` succeeds
    - `grep -q "export function clientToFeet" src/canvas/dragDrop.ts` succeeds
    - `grep -q "e.preventDefault()" src/canvas/dragDrop.ts` succeeds
    - `grep -q "snapPoint(feet, gridSnap)" src/canvas/dragDrop.ts` succeeds
    - `grep -q "placeProduct(productId, snapped)" src/canvas/dragDrop.ts` succeeds
    - `grep -q "select(\\[newId\\])" src/canvas/dragDrop.ts` succeeds
    - `npx vitest run tests/dragDrop.test.ts` exits 0 with 3 passing tests
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>dragDrop module tested; coord translation + snap + place + auto-select all work.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Wire dragDrop into FabricCanvas.tsx and make ProductLibrary cards draggable</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/src/canvas/FabricCanvas.tsx (mount effect at lines 86-111; wrapperRef; getScale/getOrigin at lines 19-29)
    - /Users/micahbank/room-cad-renderer/src/components/ProductLibrary.tsx (product card rendering)
    - /Users/micahbank/room-cad-renderer/src/canvas/dragDrop.ts (just created)
  </read_first>
  <files>src/canvas/FabricCanvas.tsx, src/components/ProductLibrary.tsx</files>
  <action>
    **A. Edit /Users/micahbank/room-cad-renderer/src/canvas/FabricCanvas.tsx:**

    1. Add import at top after existing canvas-tool imports:
    ```typescript
    import { attachDragDropHandlers } from "./dragDrop";
    ```

    2. Inside the init canvas mount effect (the useEffect with `[]` deps starting at line 86), after `fcRef.current = fc;` and before `redraw();`, add:
    ```typescript
    const detachDragDrop = attachDragDropHandlers(wrapperRef.current!, () => {
      const wrapper = wrapperRef.current!;
      const rect = wrapper.getBoundingClientRect();
      const r = useCADStore.getState().room;
      const scale = getScale(r.width, r.length, rect.width, rect.height);
      const origin = getOrigin(r.width, r.length, scale, rect.width, rect.height);
      return { scale, origin };
    });
    ```

    3. In the cleanup return of that same effect (currently `return () => { window.removeEventListener... fc.dispose() ... }`), add `detachDragDrop();` as the first line of cleanup.

    **B. Edit /Users/micahbank/room-cad-renderer/src/components/ProductLibrary.tsx:**

    First read the file to find the product card rendering element (the `.map` over products). Then:

    1. Add import at top:
    ```typescript
    import { DRAG_MIME } from "@/canvas/dragDrop";
    ```

    2. On the outermost element of each product card (inside the `.map`), add:
    ```typescript
    draggable
    onDragStart={(e) => {
      e.dataTransfer.setData(DRAG_MIME, product.id);
      e.dataTransfer.effectAllowed = "copy";
    }}
    ```

    Keep all existing click-to-place behavior intact (do not remove any existing onClick handlers — D-04 says click-to-place stays as fallback).
  </action>
  <verify>
    <automated>grep -q "attachDragDropHandlers" src/canvas/FabricCanvas.tsx && grep -q "detachDragDrop" src/canvas/FabricCanvas.tsx && grep -q "draggable" src/components/ProductLibrary.tsx && grep -q "DRAG_MIME" src/components/ProductLibrary.tsx && npx tsc --noEmit && npx vitest run</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "import { attachDragDropHandlers } from \"./dragDrop\"" src/canvas/FabricCanvas.tsx` succeeds
    - `grep -q "attachDragDropHandlers(wrapperRef.current" src/canvas/FabricCanvas.tsx` succeeds
    - `grep -q "detachDragDrop()" src/canvas/FabricCanvas.tsx` succeeds
    - `grep -q "getScale(r.width, r.length" src/canvas/FabricCanvas.tsx` succeeds
    - `grep -q "import { DRAG_MIME } from \"@/canvas/dragDrop\"" src/components/ProductLibrary.tsx` succeeds
    - `grep -q "draggable" src/components/ProductLibrary.tsx` succeeds
    - `grep -q "e.dataTransfer.setData(DRAG_MIME, product.id)" src/components/ProductLibrary.tsx` succeeds
    - `grep -q "effectAllowed = \"copy\"" src/components/ProductLibrary.tsx` succeeds
    - `npx tsc --noEmit` exits 0
    - `npx vitest run` exits 0 (no regressions)
  </acceptance_criteria>
  <done>Drop target attached in FabricCanvas mount; source attached on ProductLibrary cards; existing click flow still intact.</done>
</task>

</tasks>

<verification>
- `npx vitest run` all green
- `npx tsc --noEmit` passes
- Manual (post-execute, browser): drag a product from library sidebar onto canvas → product appears at drop point, snapped to 0.5ft grid, auto-selected (shows selection stroke)
</verification>

<success_criteria>
EDIT-07 closed: Jessica can drag library cards onto the canvas to place products.
</success_criteria>

<output>
Create `.planning/phases/01-2d-canvas-polish/01-02-SUMMARY.md` describing the dragDrop module, the FabricCanvas wiring, the ProductLibrary changes, and the placeProduct signature change (noting downstream impact: productTool.ts still works because it ignores the return value).
</output>
