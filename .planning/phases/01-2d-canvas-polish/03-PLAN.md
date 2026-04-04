---
phase: 01-2d-canvas-polish
plan: 03
type: execute
wave: 2
depends_on: [00]
files_modified:
  - src/canvas/rotationHandle.ts
  - src/canvas/fabricSync.ts
  - src/canvas/tools/selectTool.ts
  - src/stores/cadStore.ts
  - tests/rotationHandle.test.ts
  - tests/cadStore.test.ts
autonomous: true
requirements: [EDIT-08]
must_haves:
  truths:
    - "When a single product is selected, a small circle + line rotation handle appears above the product (Figma/Canva style, per D-05)"
    - "Dragging the handle rotates the product; by default angle snaps to 15° increments (per D-06)"
    - "Holding Shift during drag disables snap for free rotation (per D-06)"
    - "A single history entry is pushed per rotation drag; continuous drag does NOT spam the 50-entry history"
  artifacts:
    - path: "src/canvas/rotationHandle.ts"
      provides: "getHandleWorldPos, hitTestHandle, snapAngle helpers"
      exports: ["getHandleWorldPos", "hitTestHandle", "snapAngle", "angleFromCenterToPointer", "HANDLE_HIT_RADIUS_FT", "HANDLE_OFFSET_FT"]
    - path: "src/canvas/fabricSync.ts"
      provides: "renderProducts draws handle circle + line when single product selected"
      contains: "rotation-handle"
    - path: "src/canvas/tools/selectTool.ts"
      provides: "mousedown hit-tests handle first; mousemove drives rotation via rotateProductNoHistory"
      contains: "rotateProductNoHistory"
    - path: "src/stores/cadStore.ts"
      provides: "rotateProductNoHistory(id, angle) action that skips pushHistory"
      contains: "rotateProductNoHistory"
  key_links:
    - from: "selectTool mousedown"
      to: "rotationHandle.hitTestHandle"
      via: "distance check in feet coords"
      pattern: "hitTestHandle"
    - from: "selectTool mousemove rotate branch"
      to: "cadStore.rotateProductNoHistory"
      via: "atan2 + snap + no-history update"
      pattern: "rotateProductNoHistory"
---

<objective>
Implement EDIT-08: draggable rotation handle for selected products on the 2D canvas. Figma/Canva style — small circle above product connected by thin line (D-05). Default 15° snap; Shift disables snap (D-06). Move remains as direct body drag (D-07).

Per 01-RESEARCH.md §Pattern 3, use **Approach 2 (hand-rolled)** to preserve the existing selectTool store-based hit-testing architecture. Handle drawn in fabricSync; selectTool hit-tests handle BEFORE body drag.

Add `rotateProductNoHistory` action so continuous drag doesn't flood the 50-entry history. Single history snapshot pushed on mousedown (via one rotateProduct call with the current angle) as the undo boundary.

Purpose: Rotation is the first continuous-drag interaction; must feel smooth and be undoable as one step.
Output: Selected product shows handle; drag rotates with 15° snap; Shift disables; single history per drag.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-2d-canvas-polish/01-RESEARCH.md
@.planning/phases/01-2d-canvas-polish/01-CONTEXT.md
@src/canvas/tools/selectTool.ts
@src/canvas/fabricSync.ts
@src/stores/cadStore.ts
@src/types/cad.ts

<interfaces>
From src/types/cad.ts:
```typescript
interface PlacedProduct { id: string; productId: string; position: Point; rotation: number; }
interface Point { x: number; y: number; }
```

New action to add in cadStore:
```typescript
rotateProductNoHistory: (id: string, angle: number) => void;
```

Handle geometry:
- Local offset: (0, -(depth/2 + 0.8)) in product-local feet
- Rotated by pp.rotation deg, added to pp.position to get world coords
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add rotateProductNoHistory action to cadStore + tests</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/src/stores/cadStore.ts (existing rotateProduct at lines 128-135, CADState interface)
    - /Users/micahbank/room-cad-renderer/tests/cadStore.test.ts (updated in plan 02)
  </read_first>
  <files>src/stores/cadStore.ts, tests/cadStore.test.ts</files>
  <behavior>
    - Test 1: placeProduct then rotateProduct → rotation updated AND past.length increases by 1.
    - Test 2: placeProduct then rotateProductNoHistory → rotation updated AND past.length UNCHANGED.
  </behavior>
  <action>
    In /Users/micahbank/room-cad-renderer/src/stores/cadStore.ts:

    1. Add to CADState interface right after `rotateProduct` line:
    ```typescript
    rotateProductNoHistory: (id: string, angle: number) => void;
    ```

    2. Add implementation right after the existing `rotateProduct` block:
    ```typescript
    rotateProductNoHistory: (id, angle) =>
      set(
        produce((s: CADState) => {
          if (!s.placedProducts[id]) return;
          s.placedProducts[id].rotation = angle;
        })
      ),
    ```

    3. In /Users/micahbank/room-cad-renderer/tests/cadStore.test.ts, REPLACE the `it.todo("rotateProduct updates...")` and `it.todo("rotate: rotateProductNoHistory...")` entries with:
    ```typescript
    it("rotateProduct updates rotation and pushes history", () => {
      const id = useCADStore.getState().placeProduct("prod_1", { x: 0, y: 0 });
      const before = useCADStore.getState().past.length;
      useCADStore.getState().rotateProduct(id, 45);
      expect(useCADStore.getState().placedProducts[id].rotation).toBe(45);
      expect(useCADStore.getState().past.length).toBe(before + 1);
    });

    it("rotate: rotateProductNoHistory updates rotation without pushing history", () => {
      const id = useCADStore.getState().placeProduct("prod_1", { x: 0, y: 0 });
      const before = useCADStore.getState().past.length;
      useCADStore.getState().rotateProductNoHistory(id, 30);
      expect(useCADStore.getState().placedProducts[id].rotation).toBe(30);
      expect(useCADStore.getState().past.length).toBe(before);
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run tests/cadStore.test.ts -t "rotate" && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "rotateProductNoHistory: (id: string, angle: number) => void;" src/stores/cadStore.ts` succeeds
    - `grep -q "rotateProductNoHistory: (id, angle) =>" src/stores/cadStore.ts` succeeds
    - `awk '/rotateProductNoHistory: \(id, angle\)/,/^    \),/' src/stores/cadStore.ts | grep -c pushHistory` returns 0
    - `npx vitest run tests/cadStore.test.ts -t "rotateProduct updates"` passes
    - `npx vitest run tests/cadStore.test.ts -t "rotateProductNoHistory"` passes
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>rotateProductNoHistory exists and skips history push; both rotation tests pass.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create src/canvas/rotationHandle.ts with geometry + snap helpers + tests</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/.planning/phases/01-2d-canvas-polish/01-RESEARCH.md (§Pattern 3, lines 253-280)
    - /Users/micahbank/room-cad-renderer/tests/rotationHandle.test.ts (stubs)
    - /Users/micahbank/room-cad-renderer/src/types/cad.ts
  </read_first>
  <files>src/canvas/rotationHandle.ts, tests/rotationHandle.test.ts</files>
  <behavior>
    - Test 1: snapAngle(22, false) === 15; snapAngle(23, false) === 30.
    - Test 2: snapAngle(22.7, true) === 22.7 (shift disables).
    - Test 3: rotation=0 → handle at (x, y - depth/2 - 0.8); rotation=90 → handle at (x + depth/2 + 0.8, y).
  </behavior>
  <action>
    Create /Users/micahbank/room-cad-renderer/src/canvas/rotationHandle.ts with exact content:

    ```typescript
    import type { Point, PlacedProduct } from "@/types/cad";

    export const HANDLE_OFFSET_FT = 0.8;
    export const HANDLE_HIT_RADIUS_FT = 0.5;
    const SNAP_DEG = 15;

    export function getHandleWorldPos(pp: PlacedProduct, productDepthFt: number): Point {
      const localY = -(productDepthFt / 2 + HANDLE_OFFSET_FT);
      const rad = (pp.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: pp.position.x + 0 * cos - localY * sin,
        y: pp.position.y + 0 * sin + localY * cos,
      };
    }

    export function hitTestHandle(feetPos: Point, pp: PlacedProduct, productDepthFt: number): boolean {
      const h = getHandleWorldPos(pp, productDepthFt);
      const dx = feetPos.x - h.x;
      const dy = feetPos.y - h.y;
      return Math.sqrt(dx * dx + dy * dy) <= HANDLE_HIT_RADIUS_FT;
    }

    export function snapAngle(rawDeg: number, shiftHeld: boolean): number {
      const snapped = shiftHeld ? rawDeg : Math.round(rawDeg / SNAP_DEG) * SNAP_DEG;
      return ((snapped % 360) + 360) % 360;
    }

    export function angleFromCenterToPointer(center: Point, pointer: Point): number {
      const dx = pointer.x - center.x;
      const dy = pointer.y - center.y;
      return (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    }
    ```

    Then REPLACE /Users/micahbank/room-cad-renderer/tests/rotationHandle.test.ts with:

    ```typescript
    import { describe, it, expect } from "vitest";
    import { getHandleWorldPos, snapAngle, hitTestHandle } from "@/canvas/rotationHandle";
    import type { PlacedProduct } from "@/types/cad";

    describe("rotation handle math", () => {
      it("snap 15: raw 22deg rounds to 15, 23deg rounds to 30", () => {
        expect(snapAngle(22, false)).toBe(15);
        expect(snapAngle(23, false)).toBe(30);
        expect(snapAngle(0, false)).toBe(0);
        expect(snapAngle(90, false)).toBe(90);
      });

      it("shift disables snap: raw angle passes through unchanged", () => {
        expect(snapAngle(22.7, true)).toBeCloseTo(22.7);
        expect(snapAngle(13.4, true)).toBeCloseTo(13.4);
      });

      it("world position: handle offset rotates with product rotation", () => {
        const pp: PlacedProduct = { id: "pp_1", productId: "prod_1", position: { x: 10, y: 10 }, rotation: 0 };
        const h0 = getHandleWorldPos(pp, 4);
        expect(h0.x).toBeCloseTo(10);
        expect(h0.y).toBeCloseTo(10 - 2 - 0.8);

        const pp90: PlacedProduct = { ...pp, rotation: 90 };
        const h90 = getHandleWorldPos(pp90, 4);
        expect(h90.x).toBeCloseTo(12.8);
        expect(h90.y).toBeCloseTo(10);
      });

      it("hitTestHandle: within 0.5ft returns true, outside returns false", () => {
        const pp: PlacedProduct = { id: "pp_1", productId: "prod_1", position: { x: 10, y: 10 }, rotation: 0 };
        const h = getHandleWorldPos(pp, 4);
        expect(hitTestHandle({ x: h.x + 0.2, y: h.y + 0.2 }, pp, 4)).toBe(true);
        expect(hitTestHandle({ x: h.x + 1.0, y: h.y + 1.0 }, pp, 4)).toBe(false);
      });
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run tests/rotationHandle.test.ts && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/canvas/rotationHandle.ts` succeeds
    - `grep -q "export function getHandleWorldPos" src/canvas/rotationHandle.ts` succeeds
    - `grep -q "export function hitTestHandle" src/canvas/rotationHandle.ts` succeeds
    - `grep -q "export function snapAngle" src/canvas/rotationHandle.ts` succeeds
    - `grep -q "export function angleFromCenterToPointer" src/canvas/rotationHandle.ts` succeeds
    - `grep -q "HANDLE_OFFSET_FT = 0.8" src/canvas/rotationHandle.ts` succeeds
    - `grep -q "HANDLE_HIT_RADIUS_FT = 0.5" src/canvas/rotationHandle.ts` succeeds
    - `grep -q "SNAP_DEG = 15" src/canvas/rotationHandle.ts` succeeds
    - `npx vitest run tests/rotationHandle.test.ts` passes with 4 tests
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>Geometry/snap module is single source of truth for handle position.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Render handle visual in fabricSync.ts when product is single-selected</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/src/canvas/fabricSync.ts (renderProducts lines 97-183)
    - /Users/micahbank/room-cad-renderer/src/canvas/rotationHandle.ts (just created)
  </read_first>
  <files>src/canvas/fabricSync.ts</files>
  <action>
    In /Users/micahbank/room-cad-renderer/src/canvas/fabricSync.ts:

    1. Add import at top:
    ```typescript
    import { getHandleWorldPos } from "./rotationHandle";
    ```

    2. After the `fc.add(group);` line (around line 181) and still INSIDE the `for (const pp of Object.values(placedProducts))` loop, add:
    ```typescript
    // Rotation handle (EDIT-08): render when this product is single-selected
    if (isSelected && selectedIds.length === 1) {
      const handlePos = getHandleWorldPos(pp, product.depth);
      const hx = origin.x + handlePos.x * scale;
      const hy = origin.y + handlePos.y * scale;
      const line = new fabric.Line([cx, cy, hx, hy], {
        stroke: "#7c5bf0",
        strokeWidth: 1,
        selectable: false,
        evented: false,
        data: { type: "rotation-handle-line", placedProductId: pp.id },
      });
      const circle = new fabric.Circle({
        left: hx,
        top: hy,
        radius: 5,
        fill: "#12121d",
        stroke: "#7c5bf0",
        strokeWidth: 2,
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
        data: { type: "rotation-handle", placedProductId: pp.id },
      });
      fc.add(line);
      fc.add(circle);
    }
    ```

    Note: handle is added as top-level Fabric objects (not children of the group) to avoid double-rotation.
  </action>
  <verify>
    <automated>grep -q "getHandleWorldPos" src/canvas/fabricSync.ts && grep -q "rotation-handle" src/canvas/fabricSync.ts && npx tsc --noEmit && npx vitest run</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "import { getHandleWorldPos } from \"./rotationHandle\"" src/canvas/fabricSync.ts` succeeds
    - `grep -q "if (isSelected && selectedIds.length === 1)" src/canvas/fabricSync.ts` succeeds
    - `grep -q "new fabric.Line(\[cx, cy, hx, hy\]" src/canvas/fabricSync.ts` succeeds
    - `grep -q "new fabric.Circle({" src/canvas/fabricSync.ts` succeeds
    - `grep -q "stroke: \"#7c5bf0\"" src/canvas/fabricSync.ts` succeeds
    - `grep -q "\"rotation-handle\"" src/canvas/fabricSync.ts` succeeds
    - `npx tsc --noEmit` exits 0
    - `npx vitest run` exits 0 (no regressions)
  </acceptance_criteria>
  <done>Handle circle + line drawn in accent color when a single product is selected.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Extend selectTool to hit-test handle + drive rotation drag</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/src/canvas/tools/selectTool.ts (entire file)
    - /Users/micahbank/room-cad-renderer/src/canvas/rotationHandle.ts
    - /Users/micahbank/room-cad-renderer/.planning/phases/01-2d-canvas-polish/01-RESEARCH.md (§Pattern 3 lines 267-278)
  </read_first>
  <files>src/canvas/tools/selectTool.ts</files>
  <action>
    Modify /Users/micahbank/room-cad-renderer/src/canvas/tools/selectTool.ts:

    1. Add import after existing imports:
    ```typescript
    import { hitTestHandle, snapAngle, angleFromCenterToPointer } from "../rotationHandle";
    ```

    2. REPLACE the `SelectState` interface (lines 8-13) with:
    ```typescript
    interface SelectState {
      dragging: boolean;
      dragId: string | null;
      dragType: "wall" | "product" | "rotate" | null;
      dragOffsetFeet: Point | null;
      rotateInitialAngle: number | null;
    }
    ```

    3. REPLACE the initial state (lines 15-20) with:
    ```typescript
    const state: SelectState = {
      dragging: false,
      dragId: null,
      dragType: null,
      dragOffsetFeet: null,
      rotateInitialAngle: null,
    };
    ```

    4. In `onMouseDown` — AFTER `const feet = pxToFeet(pointer, origin, scale);` but BEFORE `const hit = hitTestStore(feet, _productLibrary);`, INSERT:
    ```typescript
    // Rotation handle hit-test takes priority (EDIT-08)
    const currentSelection = useUIStore.getState().selectedIds;
    if (currentSelection.length === 1) {
      const selId = currentSelection[0];
      const pp = useCADStore.getState().placedProducts[selId];
      if (pp) {
        const prod = _productLibrary.find((p) => p.id === pp.productId);
        if (prod && hitTestHandle(feet, pp, prod.depth)) {
          state.dragging = true;
          state.dragId = selId;
          state.dragType = "rotate";
          state.rotateInitialAngle = pp.rotation;
          // Push single history snapshot at drag start as undo boundary
          useCADStore.getState().rotateProduct(selId, pp.rotation);
          return;
        }
      }
    }
    ```

    5. REPLACE the entire `onMouseMove` function with:
    ```typescript
    const onMouseMove = (opt: fabric.TEvent) => {
      if (!state.dragging || !state.dragId) return;
      const pointer = fc.getViewportPoint(opt.e);
      const feet = pxToFeet(pointer, origin, scale);

      if (state.dragType === "rotate") {
        const pp = useCADStore.getState().placedProducts[state.dragId];
        if (!pp) return;
        const raw = angleFromCenterToPointer(pp.position, feet);
        const shiftHeld = (opt.e as MouseEvent).shiftKey === true;
        const next = snapAngle(raw, shiftHeld);
        useCADStore.getState().rotateProductNoHistory(state.dragId, next);
        return;
      }

      if (!state.dragOffsetFeet) return;
      const gridSnap = useUIStore.getState().gridSnap;
      const targetX = feet.x - state.dragOffsetFeet.x;
      const targetY = feet.y - state.dragOffsetFeet.y;
      const snapped =
        gridSnap > 0
          ? snapPoint({ x: targetX, y: targetY }, gridSnap)
          : { x: targetX, y: targetY };

      if (state.dragType === "product") {
        useCADStore.getState().moveProduct(state.dragId, snapped);
      } else if (state.dragType === "wall") {
        const wall = useCADStore.getState().walls[state.dragId];
        if (wall) {
          const cx = (wall.start.x + wall.end.x) / 2;
          const cy = (wall.start.y + wall.end.y) / 2;
          const dx = snapped.x - cx;
          const dy = snapped.y - cy;
          useCADStore.getState().updateWall(state.dragId, {
            start: { x: wall.start.x + dx, y: wall.start.y + dy },
            end: { x: wall.end.x + dx, y: wall.end.y + dy },
          });
        }
      }
    };
    ```

    6. REPLACE `onMouseUp` with:
    ```typescript
    const onMouseUp = () => {
      state.dragging = false;
      state.dragId = null;
      state.dragType = null;
      state.dragOffsetFeet = null;
      state.rotateInitialAngle = null;
    };
    ```
  </action>
  <verify>
    <automated>grep -q "hitTestHandle" src/canvas/tools/selectTool.ts && grep -q "snapAngle" src/canvas/tools/selectTool.ts && grep -q "rotateProductNoHistory" src/canvas/tools/selectTool.ts && grep -q "shiftKey" src/canvas/tools/selectTool.ts && npx tsc --noEmit && npx vitest run</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "import { hitTestHandle, snapAngle, angleFromCenterToPointer } from \"../rotationHandle\"" src/canvas/tools/selectTool.ts` succeeds
    - `grep -q "dragType: \"wall\" | \"product\" | \"rotate\" | null;" src/canvas/tools/selectTool.ts` succeeds
    - `grep -q "rotateInitialAngle:" src/canvas/tools/selectTool.ts` succeeds
    - `grep -q "state.dragType = \"rotate\"" src/canvas/tools/selectTool.ts` succeeds
    - `grep -q "rotateProductNoHistory(state.dragId, next)" src/canvas/tools/selectTool.ts` succeeds
    - `grep -q "(opt.e as MouseEvent).shiftKey === true" src/canvas/tools/selectTool.ts` succeeds
    - `grep -q "angleFromCenterToPointer(pp.position, feet)" src/canvas/tools/selectTool.ts` succeeds
    - `npx tsc --noEmit` exits 0
    - `npx vitest run` exits 0 (no regressions)
  </acceptance_criteria>
  <done>selectTool hit-tests handle before body drag; rotation drag uses no-history action; Shift disables snap.</done>
</task>

</tasks>

<verification>
- `npx vitest run` all green
- `npx tsc --noEmit` passes
- Manual (post-execute, browser): place a product, click to select → handle appears above; drag handle → product rotates in 15° steps; hold Shift while dragging → smooth rotation; undo (Cmd+Z) reverts to pre-drag angle in one step
</verification>

<success_criteria>
EDIT-08 closed: selected products show a rotation handle; drag rotates with 15° snap by default and free rotation with Shift; history integrity preserved.
</success_criteria>

<output>
Create `.planning/phases/01-2d-canvas-polish/01-03-SUMMARY.md` documenting: the rotationHandle module API, the single-source-of-truth pattern for handle position, the rotateProductNoHistory action, and the selectTool handle-first hit-test order.
</output>
