---
phase: 01-2d-canvas-polish
plan: 04
type: execute
wave: 2
depends_on: [00]
files_modified:
  - src/canvas/dimensionEditor.ts
  - src/canvas/FabricCanvas.tsx
  - src/lib/geometry.ts
  - src/stores/cadStore.ts
  - tests/dimensionEditor.test.ts
  - tests/geometry.test.ts
  - tests/cadStore.test.ts
autonomous: true
requirements: [EDIT-06]
must_haves:
  truths:
    - "Double-clicking a wall dimension label opens an inline text input at the label's position"
    - "Typing a number and pressing Enter resizes that wall to that length in feet (D-10: plain feet only)"
    - "Pressing Escape cancels without changing anything"
    - "Wall resize keeps start fixed and moves end along the wall's unit vector (D-09)"
    - "If another wall shares the moved endpoint (within 0.01ft epsilon), that wall's matching endpoint moves with it to preserve the corner (D-09)"
  artifacts:
    - path: "src/canvas/dimensionEditor.ts"
      provides: "hitTestDimLabel(feet, wall, scale, origin) + computeLabelPx(wall, scale, origin) helpers"
      exports: ["hitTestDimLabel", "computeLabelPx", "DIM_LABEL_HIT_RADIUS_PX"]
    - path: "src/lib/geometry.ts"
      provides: "resizeWall(wall, newLengthFt) returns new end point along unit vector"
      exports: ["resizeWall"]
    - path: "src/stores/cadStore.ts"
      provides: "resizeWallByLabel(wallId, newLengthFt) action with corner propagation"
      contains: "resizeWallByLabel"
    - path: "src/canvas/FabricCanvas.tsx"
      provides: "mouse:dblclick listener + absolutely-positioned input overlay + Enter/Escape handlers"
      contains: "dimensionEdit"
  key_links:
    - from: "FabricCanvas dblclick"
      to: "dimensionEditor.hitTestDimLabel"
      via: "feet coord + label bbox check"
      pattern: "hitTestDimLabel"
    - from: "Input Enter commit"
      to: "cadStore.resizeWallByLabel"
      via: "parseFloat -> action"
      pattern: "resizeWallByLabel"
    - from: "resizeWallByLabel"
      to: "shared-corner walls"
      via: "epsilon 0.01ft endpoint match"
      pattern: "0.01"
---

<objective>
Implement EDIT-06: double-click a wall dimension label to edit its length. Input in plain feet (D-10). Enter commits, Escape cancels (D-08). Wall start stays fixed; end moves along unit vector (D-09). Shared endpoints propagate to preserve corners (D-09, epsilon 0.01ft).

Per 01-RESEARCH.md §Pattern 4, render an absolutely-positioned HTML `<input>` as a sibling of the canvas, positioned using the same scale/origin that placed the label. Use Fabric v6's `mouse:dblclick` event + store-based hit-test against label bounds.

Purpose: Jessica can precisely dial in room dimensions without redrawing walls. Natural CAD interaction.
Output: Dim labels are double-clickable; inline input resizes wall; corner walls follow.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-2d-canvas-polish/01-RESEARCH.md
@.planning/phases/01-2d-canvas-polish/01-CONTEXT.md
@src/canvas/dimensions.ts
@src/canvas/FabricCanvas.tsx
@src/lib/geometry.ts
@src/stores/cadStore.ts
@src/types/cad.ts

<interfaces>
From src/canvas/dimensions.ts (drawWallDimension computes label at):
```typescript
const midX = origin.x + ((wall.start.x + wall.end.x) / 2) * scale;
const midY = origin.y + ((wall.start.y + wall.end.y) / 2) * scale;
const perpAngle = (angleDeg + 90) * (Math.PI / 180);
const offsetDist = 14;
const labelX = midX + Math.cos(perpAngle) * offsetDist;
const labelY = midY + Math.sin(perpAngle) * offsetDist;
// background rect is ~(text.length*7+8) wide, 16 tall, centered on (labelX, labelY)
```

From src/types/cad.ts:
```typescript
interface WallSegment { id: string; start: Point; end: Point; thickness: number; height: number; openings: Opening[]; }
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add resizeWall geometry helper + test</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/src/lib/geometry.ts (existing helpers)
    - /Users/micahbank/room-cad-renderer/src/types/cad.ts (WallSegment, Point)
    - /Users/micahbank/room-cad-renderer/tests/geometry.test.ts (stubs)
  </read_first>
  <files>src/lib/geometry.ts, tests/geometry.test.ts</files>
  <behavior>
    - Test: resizeWall({start:{x:0,y:0}, end:{x:3,y:4}, ...}, 10) returns new end point {x:6, y:8} (unit vector (0.6, 0.8) * 10).
    - Test: resizeWall with zero-length wall returns the start point unchanged (degenerate case).
    - Test: resizeWall with negative or zero newLength returns the start point (invalid input guard).
  </behavior>
  <action>
    Append to /Users/micahbank/room-cad-renderer/src/lib/geometry.ts (after existing exports):

    ```typescript
    /**
     * Resize a wall by moving its end point along the wall's current unit vector
     * so the new segment length equals newLengthFt. Start is kept fixed.
     * Returns the new end point. For zero-length or invalid inputs, returns start.
     */
    export function resizeWall(wall: WallSegment, newLengthFt: number): Point {
      if (!(newLengthFt > 0)) return { ...wall.start };
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return { ...wall.start };
      const ux = dx / len;
      const uy = dy / len;
      return { x: wall.start.x + ux * newLengthFt, y: wall.start.y + uy * newLengthFt };
    }
    ```

    REPLACE /Users/micahbank/room-cad-renderer/tests/geometry.test.ts with:
    ```typescript
    import { describe, it, expect } from "vitest";
    import { snapTo, distance, wallLength, formatFeet, wallCorners, closestPointOnWall, resizeWall } from "@/lib/geometry";
    import type { WallSegment } from "@/types/cad";

    function mkWall(start: {x:number;y:number}, end: {x:number;y:number}): WallSegment {
      return { id: "w1", start, end, thickness: 0.5, height: 8, openings: [] };
    }

    describe("geometry helpers", () => {
      it("snapTo rounds to nearest increment", () => {
        expect(snapTo(3.2, 0.5)).toBe(3.0);
        expect(snapTo(3.3, 0.5)).toBe(3.5);
      });

      it("distance between two points", () => {
        expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
      });

      it("wallLength of a segment", () => {
        expect(wallLength(mkWall({ x: 0, y: 0 }, { x: 3, y: 4 }))).toBe(5);
      });

      it("formatFeet renders feet and inches", () => {
        expect(formatFeet(3)).toBe("3'");
        expect(formatFeet(3.5)).toBe("3'-6\"");
      });

      it("wallCorners returns 4 corners", () => {
        const c = wallCorners(mkWall({ x: 0, y: 0 }, { x: 10, y: 0 }));
        expect(c).toHaveLength(4);
      });

      it("closestPointOnWall returns t in [0,1]", () => {
        const w = mkWall({ x: 0, y: 0 }, { x: 10, y: 0 });
        const r = closestPointOnWall(w, { x: 5, y: 3 });
        expect(r.t).toBeGreaterThanOrEqual(0);
        expect(r.t).toBeLessThanOrEqual(1);
      });

      it("resize wall: keeps start fixed, moves end along unit vector", () => {
        const w = mkWall({ x: 0, y: 0 }, { x: 3, y: 4 });  // length 5, unit (0.6, 0.8)
        const newEnd = resizeWall(w, 10);
        expect(newEnd.x).toBeCloseTo(6);
        expect(newEnd.y).toBeCloseTo(8);
      });

      it("resize wall: invalid length returns start unchanged", () => {
        const w = mkWall({ x: 1, y: 2 }, { x: 5, y: 6 });
        expect(resizeWall(w, 0)).toEqual({ x: 1, y: 2 });
        expect(resizeWall(w, -5)).toEqual({ x: 1, y: 2 });
      });

      it("resize wall: zero-length wall returns start", () => {
        const w = mkWall({ x: 2, y: 2 }, { x: 2, y: 2 });
        expect(resizeWall(w, 10)).toEqual({ x: 2, y: 2 });
      });
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run tests/geometry.test.ts && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "export function resizeWall" src/lib/geometry.ts` succeeds
    - `grep -q "if (!(newLengthFt > 0))" src/lib/geometry.ts` succeeds
    - `grep -q "wall.start.x + ux \* newLengthFt" src/lib/geometry.ts` succeeds
    - `npx vitest run tests/geometry.test.ts` passes all tests (no remaining `it.todo`)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>resizeWall geometry helper exists and is fully tested.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add resizeWallByLabel store action with corner propagation + test</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/src/stores/cadStore.ts (existing updateWall, pushHistory pattern)
    - /Users/micahbank/room-cad-renderer/src/lib/geometry.ts (resizeWall just added)
    - /Users/micahbank/room-cad-renderer/tests/cadStore.test.ts
  </read_first>
  <files>src/stores/cadStore.ts, tests/cadStore.test.ts</files>
  <behavior>
    - Test ("updateWall: wall resize corner propagates to shared-endpoint walls"): Given two walls sharing a corner at (10,0) — wallA from (0,0)→(10,0), wallB from (10,0)→(10,10). Call resizeWallByLabel(wallA.id, 5). Then wallA.end = (5,0) AND wallB.start = (5,0) (corner moved together). wallB.end remains (10,10).
  </behavior>
  <action>
    In /Users/micahbank/room-cad-renderer/src/stores/cadStore.ts:

    1. Add import at top:
    ```typescript
    import { resizeWall } from "@/lib/geometry";
    ```

    2. Add to CADState interface (after `updateWall` line 25):
    ```typescript
    resizeWallByLabel: (id: string, newLengthFt: number) => void;
    ```

    3. Add implementation after the existing `updateWall` block (after line 90):
    ```typescript
    resizeWallByLabel: (id, newLengthFt) =>
      set(
        produce((s: CADState) => {
          const wall = s.walls[id];
          if (!wall) return;
          if (!(newLengthFt > 0)) return;
          pushHistory(s);
          const oldEnd = { x: wall.end.x, y: wall.end.y };
          const newEnd = resizeWall(wall, newLengthFt);
          wall.end = newEnd;
          // Propagate to any wall whose start OR end matches oldEnd within epsilon
          const EPS = 0.01;
          for (const other of Object.values(s.walls)) {
            if (other.id === id) continue;
            if (Math.abs(other.start.x - oldEnd.x) < EPS && Math.abs(other.start.y - oldEnd.y) < EPS) {
              other.start = { x: newEnd.x, y: newEnd.y };
            }
            if (Math.abs(other.end.x - oldEnd.x) < EPS && Math.abs(other.end.y - oldEnd.y) < EPS) {
              other.end = { x: newEnd.x, y: newEnd.y };
            }
          }
        })
      ),
    ```

    4. In /Users/micahbank/room-cad-renderer/tests/cadStore.test.ts, REPLACE the `it.todo("updateWall: wall resize corner propagates to shared-endpoint walls")` with:
    ```typescript
    it("updateWall: wall resize corner propagates to shared-endpoint walls", () => {
      useCADStore.getState().addWall({ x: 0, y: 0 }, { x: 10, y: 0 });
      useCADStore.getState().addWall({ x: 10, y: 0 }, { x: 10, y: 10 });
      const walls = useCADStore.getState().walls;
      const wallAId = Object.values(walls).find((w) => w.start.x === 0)!.id;
      const wallBId = Object.values(walls).find((w) => w.start.x === 10 && w.start.y === 0)!.id;

      useCADStore.getState().resizeWallByLabel(wallAId, 5);

      const wallA = useCADStore.getState().walls[wallAId];
      const wallB = useCADStore.getState().walls[wallBId];
      expect(wallA.end.x).toBeCloseTo(5);
      expect(wallA.end.y).toBeCloseTo(0);
      expect(wallB.start.x).toBeCloseTo(5);
      expect(wallB.start.y).toBeCloseTo(0);
      expect(wallB.end.x).toBeCloseTo(10);
      expect(wallB.end.y).toBeCloseTo(10);
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run tests/cadStore.test.ts -t "resize corner" && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "resizeWallByLabel: (id: string, newLengthFt: number) => void;" src/stores/cadStore.ts` succeeds
    - `grep -q "resizeWallByLabel: (id, newLengthFt) =>" src/stores/cadStore.ts` succeeds
    - `grep -q "import { resizeWall }" src/stores/cadStore.ts` succeeds
    - `grep -q "const EPS = 0.01;" src/stores/cadStore.ts` succeeds
    - `grep -q "Math.abs(other.start.x - oldEnd.x) < EPS" src/stores/cadStore.ts` succeeds
    - `grep -q "Math.abs(other.end.x - oldEnd.x) < EPS" src/stores/cadStore.ts` succeeds
    - `npx vitest run tests/cadStore.test.ts -t "resize corner"` passes
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>resizeWallByLabel action exists with corner propagation at 0.01ft epsilon; test passes.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Create src/canvas/dimensionEditor.ts with hit-test + label position helpers + tests</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/src/canvas/dimensions.ts (drawWallDimension label positioning lines 78-137)
    - /Users/micahbank/room-cad-renderer/tests/dimensionEditor.test.ts (stubs)
    - /Users/micahbank/room-cad-renderer/src/types/cad.ts
  </read_first>
  <files>src/canvas/dimensionEditor.ts, tests/dimensionEditor.test.ts</files>
  <behavior>
    - Test ("position: overlay x/y matches drawWallDimension perpendicular offset"): For a horizontal wall from (0,0) to (10,0), scale=10, origin={x:0,y:0}, label px = midX (50) + 0 (perp up) or -14 below. Verify computeLabelPx returns the same (midX, midY + perpYoffset).
    - Test ("invalid input: non-numeric or <=0 parseFloat results cancel silently"): validateInput("abc") returns null; validateInput("0") returns null; validateInput("-5") returns null; validateInput("12") returns 12; validateInput("3.5ft") returns 3.5 (parseFloat ignores suffix).
  </behavior>
  <action>
    Create /Users/micahbank/room-cad-renderer/src/canvas/dimensionEditor.ts with exact content:

    ```typescript
    import type { WallSegment } from "@/types/cad";

    export const DIM_LABEL_HIT_RADIUS_PX = 24;
    const OFFSET_DIST_PX = 14;

    export interface LabelPx { x: number; y: number; angleDeg: number; }

    /** Compute the wall dimension label position in canvas pixels. Mirrors drawWallDimension. */
    export function computeLabelPx(
      wall: WallSegment,
      scale: number,
      origin: { x: number; y: number }
    ): LabelPx {
      const midX = origin.x + ((wall.start.x + wall.end.x) / 2) * scale;
      const midY = origin.y + ((wall.start.y + wall.end.y) / 2) * scale;
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      const perpAngle = (angleDeg + 90) * (Math.PI / 180);
      if (angleDeg > 90) angleDeg -= 180;
      if (angleDeg < -90) angleDeg += 180;
      return {
        x: midX + Math.cos(perpAngle) * OFFSET_DIST_PX,
        y: midY + Math.sin(perpAngle) * OFFSET_DIST_PX,
        angleDeg,
      };
    }

    /** Hit-test: is the canvas-pixel point within DIM_LABEL_HIT_RADIUS_PX of the label center? */
    export function hitTestDimLabel(
      pxPoint: { x: number; y: number },
      wall: WallSegment,
      scale: number,
      origin: { x: number; y: number }
    ): boolean {
      const label = computeLabelPx(wall, scale, origin);
      const dx = pxPoint.x - label.x;
      const dy = pxPoint.y - label.y;
      return Math.sqrt(dx * dx + dy * dy) <= DIM_LABEL_HIT_RADIUS_PX;
    }

    /** Parse input string as feet. Returns null if invalid (non-numeric or <=0). */
    export function validateInput(raw: string): number | null {
      const trimmed = raw.trim();
      if (trimmed === "") return null;
      const n = parseFloat(trimmed);
      if (!isFinite(n) || n <= 0) return null;
      return n;
    }
    ```

    REPLACE /Users/micahbank/room-cad-renderer/tests/dimensionEditor.test.ts with:
    ```typescript
    import { describe, it, expect } from "vitest";
    import { computeLabelPx, hitTestDimLabel, validateInput } from "@/canvas/dimensionEditor";
    import type { WallSegment } from "@/types/cad";

    function mkWall(start: {x:number;y:number}, end: {x:number;y:number}): WallSegment {
      return { id: "w1", start, end, thickness: 0.5, height: 8, openings: [] };
    }

    describe("dimension editor overlay", () => {
      it("position: overlay x/y matches drawWallDimension perpendicular offset", () => {
        const wall = mkWall({ x: 0, y: 0 }, { x: 10, y: 0 });
        const label = computeLabelPx(wall, 10, { x: 0, y: 0 });
        // midX = 50, midY = 0. angleDeg = 0. perpAngle = 90° -> cos=0, sin=1. offset 14.
        expect(label.x).toBeCloseTo(50);
        expect(label.y).toBeCloseTo(14);
      });

      it("hitTestDimLabel: within 24px returns true", () => {
        const wall = mkWall({ x: 0, y: 0 }, { x: 10, y: 0 });
        const label = computeLabelPx(wall, 10, { x: 0, y: 0 });
        expect(hitTestDimLabel({ x: label.x + 5, y: label.y + 5 }, wall, 10, { x: 0, y: 0 })).toBe(true);
        expect(hitTestDimLabel({ x: label.x + 50, y: label.y + 50 }, wall, 10, { x: 0, y: 0 })).toBe(false);
      });

      it("invalid input: non-numeric or <=0 parseFloat results cancel silently", () => {
        expect(validateInput("abc")).toBeNull();
        expect(validateInput("0")).toBeNull();
        expect(validateInput("-5")).toBeNull();
        expect(validateInput("")).toBeNull();
        expect(validateInput("   ")).toBeNull();
        expect(validateInput("12")).toBe(12);
        expect(validateInput("3.5")).toBe(3.5);
        expect(validateInput("3.5ft")).toBe(3.5);
      });
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run tests/dimensionEditor.test.ts && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/canvas/dimensionEditor.ts` succeeds
    - `grep -q "export function computeLabelPx" src/canvas/dimensionEditor.ts` succeeds
    - `grep -q "export function hitTestDimLabel" src/canvas/dimensionEditor.ts` succeeds
    - `grep -q "export function validateInput" src/canvas/dimensionEditor.ts` succeeds
    - `grep -q "DIM_LABEL_HIT_RADIUS_PX = 24" src/canvas/dimensionEditor.ts` succeeds
    - `grep -q "OFFSET_DIST_PX = 14" src/canvas/dimensionEditor.ts` succeeds
    - `npx vitest run tests/dimensionEditor.test.ts` passes 3 tests
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>dimensionEditor helpers tested; computeLabelPx mirrors drawWallDimension positioning.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Wire inline input overlay into FabricCanvas.tsx</name>
  <read_first>
    - /Users/micahbank/room-cad-renderer/src/canvas/FabricCanvas.tsx (entire file)
    - /Users/micahbank/room-cad-renderer/src/canvas/dimensionEditor.ts (just created)
    - /Users/micahbank/room-cad-renderer/.planning/phases/01-2d-canvas-polish/01-RESEARCH.md (§Pattern 4, §Pitfall 5 line 451)
  </read_first>
  <files>src/canvas/FabricCanvas.tsx</files>
  <action>
    Modify /Users/micahbank/room-cad-renderer/src/canvas/FabricCanvas.tsx:

    1. Add imports at top:
    ```typescript
    import { useState } from "react";  // add to existing react import if needed
    import { computeLabelPx, hitTestDimLabel, validateInput } from "./dimensionEditor";
    ```
    (Merge with existing React import line 1.)

    2. Add local state inside the component (after `const fcRef = useRef...`):
    ```typescript
    const [editingWallId, setEditingWallId] = useState<string | null>(null);
    const [pendingValue, setPendingValue] = useState<string>("");
    ```

    3. Add a new useEffect that attaches `mouse:dblclick` handler to the Fabric canvas. Place it after the init canvas useEffect and before `useEffect(() => { redraw(); }, [redraw]);`:
    ```typescript
    // Double-click on wall dim label to edit (EDIT-06)
    useEffect(() => {
      const fc = fcRef.current;
      const wrapper = wrapperRef.current;
      if (!fc || !wrapper) return;
      const onDblClick = (opt: fabric.TEvent) => {
        const pointer = fc.getViewportPoint(opt.e);
        const rect = wrapper.getBoundingClientRect();
        const r = useCADStore.getState().room;
        const scale = getScale(r.width, r.length, rect.width, rect.height);
        const origin = getOrigin(r.width, r.length, scale, rect.width, rect.height);
        const walls = useCADStore.getState().walls;
        for (const wall of Object.values(walls)) {
          if (hitTestDimLabel(pointer, wall, scale, origin)) {
            const currentLen = Math.sqrt(
              (wall.end.x - wall.start.x) ** 2 + (wall.end.y - wall.start.y) ** 2
            );
            setPendingValue(currentLen.toFixed(2));
            setEditingWallId(wall.id);
            return;
          }
        }
      };
      fc.on("mouse:dblclick", onDblClick);
      return () => { fc.off("mouse:dblclick", onDblClick); };
    }, []);
    ```

    4. Compute overlay position at render time (inside the component body, before return):
    ```typescript
    let overlayStyle: React.CSSProperties | null = null;
    if (editingWallId) {
      const wall = useCADStore.getState().walls[editingWallId];
      const wrapper = wrapperRef.current;
      if (wall && wrapper) {
        const rect = wrapper.getBoundingClientRect();
        const scale = getScale(room.width, room.length, rect.width, rect.height);
        const origin = getOrigin(room.width, room.length, scale, rect.width, rect.height);
        const label = computeLabelPx(wall, scale, origin);
        overlayStyle = {
          position: "absolute",
          left: label.x - 32,
          top: label.y - 10,
          width: 64,
          height: 20,
          zIndex: 10,
        };
      }
    }

    function commitEdit() {
      if (!editingWallId) return;
      const parsed = validateInput(pendingValue);
      if (parsed !== null) {
        useCADStore.getState().resizeWallByLabel(editingWallId, parsed);
      }
      setEditingWallId(null);
      setPendingValue("");
    }

    function cancelEdit() {
      setEditingWallId(null);
      setPendingValue("");
    }
    ```

    5. In the returned JSX, add the input overlay inside the wrapper div (after the `<canvas>`):
    ```tsx
    {overlayStyle && (
      <input
        type="text"
        autoFocus
        value={pendingValue}
        onChange={(e) => setPendingValue(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
          if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
        }}
        style={overlayStyle}
        className="font-mono text-[11px] bg-obsidian-high text-accent-light border border-accent px-1 outline-none"
        data-testid="dimension-edit-input"
      />
    )}
    ```
  </action>
  <verify>
    <automated>grep -q "mouse:dblclick" src/canvas/FabricCanvas.tsx && grep -q "hitTestDimLabel" src/canvas/FabricCanvas.tsx && grep -q "resizeWallByLabel" src/canvas/FabricCanvas.tsx && grep -q "editingWallId" src/canvas/FabricCanvas.tsx && grep -q "data-testid=\"dimension-edit-input\"" src/canvas/FabricCanvas.tsx && npx tsc --noEmit && npx vitest run</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "import { computeLabelPx, hitTestDimLabel, validateInput } from \"./dimensionEditor\"" src/canvas/FabricCanvas.tsx` succeeds
    - `grep -q "const \\[editingWallId, setEditingWallId\\]" src/canvas/FabricCanvas.tsx` succeeds
    - `grep -q "fc.on(\"mouse:dblclick\", onDblClick)" src/canvas/FabricCanvas.tsx` succeeds
    - `grep -q "resizeWallByLabel(editingWallId, parsed)" src/canvas/FabricCanvas.tsx` succeeds
    - `grep -q "e.key === \"Enter\"" src/canvas/FabricCanvas.tsx` succeeds
    - `grep -q "e.key === \"Escape\"" src/canvas/FabricCanvas.tsx` succeeds
    - `grep -q "font-mono text-\\[11px\\] bg-obsidian-high text-accent-light" src/canvas/FabricCanvas.tsx` succeeds
    - `grep -q "data-testid=\"dimension-edit-input\"" src/canvas/FabricCanvas.tsx` succeeds
    - `npx tsc --noEmit` exits 0
    - `npx vitest run` exits 0
  </acceptance_criteria>
  <done>Double-click wall label opens inline input; Enter commits via resizeWallByLabel; Escape cancels.</done>
</task>

</tasks>

<verification>
- `npx vitest run` all green
- `npx tsc --noEmit` passes
- Manual (post-execute, browser): draw two walls meeting at a corner, double-click a dim label, type new length in feet, press Enter → wall resizes and connected wall's endpoint moves with the corner
</verification>

<success_criteria>
EDIT-06 closed: wall dimension labels are editable via double-click overlay; corners propagate.
</success_criteria>

<output>
Create `.planning/phases/01-2d-canvas-polish/01-04-SUMMARY.md` documenting: resizeWall geometry helper, resizeWallByLabel action with 0.01ft corner epsilon, dimensionEditor hit-test + input-validate helpers, and the overlay input wiring in FabricCanvas.
</output>
