---
phase: 25-canvas-store-performance
plan: 02
type: execute
wave: 2
depends_on: ["25-01"]
files_modified:
  - src/canvas/FabricCanvas.tsx
  - src/canvas/tools/selectTool.ts
autonomous: true
requirements: [PERF-01]
gap_closure: false

must_haves:
  truths:
    - "canvas.renderOnAddRemove is set to false at FabricCanvas construction"
    - "During an active drag, fc.clear() is NEVER called and redraw() is NEVER invoked"
    - "Only the single Fabric object being dragged is mutated in place; all other layers (grid, dims, non-moving walls/products/ceilings/custom elements) stay untouched"
    - "Drag-end commits exactly ONE store write via the existing history-pushing action, producing one history entry"
    - "Drag interruption (Escape / tool switch / cleanup invocation) reverts the Fabric object to pre-drag state and produces zero history entries"
    - "Fast path covers exactly the 4 D-03 operations: product move, wall move, wall endpoint drag, product rotation"
  artifacts:
    - path: "src/canvas/FabricCanvas.tsx"
      provides: "renderOnAddRemove: false at canvas init; no new redraw triggers during drag"
      contains: "renderOnAddRemove: false"
    - path: "src/canvas/tools/selectTool.ts"
      provides: "Drag fast path with pre-drag cache, direct Fabric mutation, mouse-up commit, cleanup revert"
      contains: "fc.requestRenderAll()"
  key_links:
    - from: "mouse:down handler"
      to: "closure-scoped dragPre cache"
      via: "Captures fabricObj ref + origLeft/origTop/origAngle + origFeetPos/Rotation before any mutation"
      pattern: "dragPre\\s*=\\s*\\{"
    - from: "mouse:move handler"
      to: "fabric.Object.set + fc.requestRenderAll"
      via: "Direct Fabric mutation; NO useCADStore.getState().moveProduct/updateWall/rotateProduct calls in the move block"
      pattern: "fabricObj\\.set|fabricGroup\\.set"
    - from: "mouse:up handler"
      to: "useCADStore.getState().moveProduct|updateWall|rotateProduct (committing variant)"
      via: "Called exactly once with final values"
      pattern: "moveProduct|updateWall|rotateProduct"
    - from: "cleanup-fn returned by activateSelectTool"
      to: "dragPre.fabricObj.set({ left: origLeft, top: origTop, angle: origAngle })"
      via: "Invoked on tool switch / unmount — reverts in-flight drag without store write"
      pattern: "dragPre.*origLeft|dragPre.*origAngle"
---

<objective>
Land the drag-only fast path per PERF-01 + D-01..D-06. Today every mouse:move during a drag writes to the Zustand store and triggers a full `FabricCanvas.redraw()` (clear + re-add ~100 objects + re-activate tool). The fast path caches pre-drag state at mouse:down, mutates only the moving Fabric object on mouse:move with `fc.requestRenderAll()`, and commits exactly once on mouse:up.

Purpose: Meet the 60fps sustained-drag target at 50 walls / 30 products. Preserve the single-history-entry undo/redo boundary. Guarantee clean revert when the drag is interrupted (tool switch, Escape, cleanup).
Output: `renderOnAddRemove: false` at canvas init; selectTool fast path covering 4 drag types; cleanup revert wired through the Phase 24 cleanup-fn contract. All Wave 0 PERF-01 tests flip RED → GREEN.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/25-canvas-store-performance/25-CONTEXT.md
@.planning/phases/25-canvas-store-performance/25-RESEARCH.md
@.planning/phases/25-canvas-store-performance/25-VALIDATION.md
@.planning/phases/25-canvas-store-performance/25-00-SUMMARY.md
@.planning/phases/25-canvas-store-performance/25-01-SUMMARY.md
@.planning/phases/24-tool-architecture-refactor/24-04-SUMMARY.md
@src/canvas/FabricCanvas.tsx
@src/canvas/tools/selectTool.ts
@src/canvas/tools/toolUtils.ts
@src/canvas/fabricSync.ts
@src/stores/cadStore.ts

<interfaces>
<!-- Phase 24 cleanup contract (locked). Every tool.activateXTool returns: -->
```typescript
type ToolCleanupFn = () => void;
export function activateSelectTool(
  fc: fabric.Canvas,
  scale: number,
  origin: Point,
): ToolCleanupFn;
```

<!-- Existing committing store actions (unchanged — fast path calls them ONCE on mouse:up): -->
```typescript
// from src/stores/cadStore.ts
moveProduct(id: string, position: Point): void;          // pushes history
updateWall(id: string, changes: Partial<WallSegment>): void;  // pushes history
rotateProduct(id: string, rotation: number): void;       // pushes history (product rotation handle)
moveCustomElement(id: string, position: Point): void;    // custom elements drag — same shape
```

<!-- Coordinate conversion (already in selectTool imports from toolUtils.ts): -->
```typescript
// pixel to feet (mouse events): pxToFeet(pointer, origin, scale) → Point
// feet to pixel (render): leftPx = origin.x + feet.x * scale; topPx = origin.y + feet.y * scale
```

<!-- Canvas init shape target (D-02): -->
```typescript
const fc = new fabric.Canvas(canvasElRef.current, {
  selection: false,
  preserveObjectStacking: true,
  renderOnAddRemove: false,   // ← NEW: D-02
});
```

<!-- Fabric object lookup by id pattern (existing in fabricSync — used to find group for an id):
     fc.getObjects() iterates; each group has `(group as any).data?.placedProductId` or similar.
     Research §"Drag fast-path wiring" names a helper `findFabricObjectByPlacedProductId` — planner may install a small helper in toolUtils.ts if useful, or inline a `fc.getObjects().find(...)` lookup at mouse:down. -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Set renderOnAddRemove: false at FabricCanvas init and audit render callsites</name>
  <files>src/canvas/FabricCanvas.tsx</files>
  <read_first>
    - src/canvas/FabricCanvas.tsx lines 97-204 (redraw + init; the fabric.Canvas constructor is at line 169)
    - src/canvas/fabricSync.ts (entire file — audit: every render fn must end in an explicit fc.renderAll or rely on its caller doing so. Existing async handlers at lines around product image cache call fc.renderAll() — confirm those still exist)
    - .planning/phases/25-canvas-store-performance/25-CONTEXT.md (D-02 locked)
    - .planning/phases/25-canvas-store-performance/25-RESEARCH.md §"Pattern 3" + §"Pitfall 2" (the audit checklist)
    - tests/fabricSync.test.ts (the "renderOnAddRemove disabled" Wave 0 test lives here)
  </read_first>
  <behavior>
    - After FabricCanvas mounts, `fc.renderOnAddRemove === false`.
    - Full redraw still produces visible output (redraw already ends in `fc.renderAll()` at FabricCanvas.tsx:158 — unchanged).
    - Async background image load (line ~134) still paints (still calls `fc.renderAll()` inside the onload callback).
    - Product image cache + bg image cache handlers still paint.
    - Wave 0 test `"renderOnAddRemove disabled"` flips GREEN.
  </behavior>
  <action>
    Edit `src/canvas/FabricCanvas.tsx` at the fabric.Canvas constructor (currently lines 169-172):

    **Before:**
    ```typescript
    const fc = new fabric.Canvas(canvasElRef.current, {
      selection: false,
      preserveObjectStacking: true,
    });
    ```

    **After:**
    ```typescript
    const fc = new fabric.Canvas(canvasElRef.current, {
      selection: false,
      preserveObjectStacking: true,
      renderOnAddRemove: false,  // Phase 25 D-02 — paints coalesce through explicit requestRenderAll/renderAll
    });
    ```

    Then audit (do NOT modify unless broken):
    - Confirm `redraw()` still ends with `fc.renderAll()` at line ~158.
    - Confirm every `*.onload = () => fc.renderAll()` in this file (floor plan bg at ~134) still exists.
    - Confirm fabricSync.ts async handlers (product image cache, bg image cache — roughly around the renderProducts function) still call fc.renderAll on load. If any relied on implicit renderOnAddRemove, add an explicit fc.renderAll() in the callback.

    Do NOT modify the redraw() body otherwise. Do NOT modify fabricSync.ts non-callback paths. Do NOT change the tool re-activation chain at FabricCanvas.tsx:161-162 — the fast path handles drag without triggering redraw in the first place.

    Implements: D-02, closes Pitfall 2.
  </action>
  <verify>
    <automated>npm test -- tests/fabricSync.test.ts -t "renderOnAddRemove disabled"</automated>
  </verify>
  <acceptance_criteria>
    - `src/canvas/FabricCanvas.tsx` contains the literal string `"renderOnAddRemove: false"`
    - `src/canvas/FabricCanvas.tsx` still contains `fc.renderAll()` at least once (the existing redraw-tail call — not removed)
    - `npm test -- tests/fabricSync.test.ts -t "renderOnAddRemove disabled"` exits 0 (was RED in Wave 0)
    - `npm test` full suite: 168 pre-existing passing preserved; no elements-disappear regression (if any test in `tests/fabricSync.test.ts` renders and inspects canvas object counts, they still pass)
    - Manual smoke: `npm run dev`, verify grid + walls + products + dims all visible on initial load (no invisible layer = implicit-render leak from Pitfall 2)
  </acceptance_criteria>
  <done>
    Canvas constructor sets renderOnAddRemove: false. No layer invisibility regression. Wave 0 `"renderOnAddRemove disabled"` test GREEN.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement drag fast path for 4 drag types in selectTool.ts (product move, wall move, wall endpoint, product rotation)</name>
  <files>src/canvas/tools/selectTool.ts</files>
  <read_first>
    - src/canvas/tools/selectTool.ts ENTIRE FILE — in particular:
      - Lines 1-165: imports + closure declarations from Phase 24 (where new `dragPre` closure `let` goes)
      - Lines 285-425: current mouse:down handlers for each drag type (the "seed history" pattern uses committing variant once on mousedown today)
      - Lines 450-647: mouse:move handlers for each drag type (the block being replaced)
      - Lines 649-675: mouse:up handlers
      - Lines 699-706: cleanup fn returned by activateSelectTool (D-06 revert hooks here)
    - src/canvas/tools/toolUtils.ts (pxToFeet signature; any helpers worth extending)
    - src/canvas/fabricSync.ts (how products/walls are stored on canvas — what `(group as any).data?.*` identifiers exist so mouse:down can locate the right fabric.Object)
    - src/stores/cadStore.ts — confirm signatures of `moveProduct`, `updateWall`, `rotateProduct`, `moveCustomElement`
    - .planning/phases/25-canvas-store-performance/25-CONTEXT.md (D-03, D-04, D-05, D-06 locked)
    - .planning/phases/25-canvas-store-performance/25-RESEARCH.md §"Pattern 1" + §"Drag fast-path wiring in selectTool.ts" (exact target shape + CAUTIONS about mouse:down seed-history)
    - tests/cadStore.test.ts "drag produces single history entry" + "wall drag produces single history entry" (Wave 0 contracts)
    - tests/toolCleanup.test.ts "drag interrupted by tool switch" (Wave 0 revert contract)
    - tests/fabricSync.test.ts "fast path does not clear canvas during drag" (Wave 0 no-clear contract)
  </read_first>
  <behavior>
    - Product drag (mouse:down on a product group, mouse:move, mouse:up): fabric.Group mutated in place on every move; zero store writes during move; ONE `moveProduct(id, finalPos)` call on mouse:up.
    - Wall drag (mouse:down on a wall polygon, mouse:move, mouse:up): same — one `updateWall(id, { start, end })` on mouse:up.
    - Wall endpoint drag: same — one `updateWall(id, { start })` or `updateWall(id, { end })` on mouse:up with the moved endpoint.
    - Product rotation handle drag: same — one `rotateProduct(id, finalRotation)` on mouse:up.
    - During any drag, `fc.clear()` is NEVER called.
    - On cleanup (tool switch / unmount / Escape): in-flight drag reverts fabric obj to pre-drag left/top/angle/points; no store write.
    - Wave 0 tests flip GREEN: "drag produces single history entry", "wall drag produces single history entry", "fast path does not clear canvas during drag", "drag interrupted by tool switch".
  </behavior>
  <action>
    Rework `selectTool.ts` drag handlers for the 4 D-03 operations. Keep all non-drag handlers (click-to-select, rotate-via-keyboard, ceiling drag, opening slide/resize, custom element drag, wall rotation, product resize) UNTOUCHED per D-03 scope.

    **Step 1 — Add closure-scoped drag cache** (near existing Phase 24 `let dragging`, `let dragId` declarations at lines 152-165):
    ```typescript
    type DragPre =
      | { kind: "product"; id: string; fabricObj: fabric.Object | null;
          origLeft: number; origTop: number; origAngle: number;
          origFeetPos: Point }
      | { kind: "product-rotate"; id: string; fabricObj: fabric.Object | null;
          origAngle: number; origFeetRotation: number }
      | { kind: "wall-move"; id: string; fabricObj: fabric.Object | null;
          origLeft: number; origTop: number;
          origFeetStart: Point; origFeetEnd: Point }
      | { kind: "wall-endpoint"; id: string; endpoint: "start" | "end";
          fabricObj: fabric.Object | null;
          origFeetStart: Point; origFeetEnd: Point };

    let dragPre: DragPre | null = null;
    let lastDragSnapped: Point | null = null;
    let lastDragRotation: number | null = null;
    ```

    **Step 2 — In mouse:down, for each of the 4 drag types, REPLACE the existing "seed-history on mousedown" call** with a cache-capture:

    For product drag (extend existing logic ~lines 425-434):
    - Find the fabric.Object for this product id: `const fabricObj = fc.getObjects().find(o => (o as any).data?.placedProductId === hit.id) ?? null;`
    - Cache: `dragPre = { kind: "product", id: hit.id, fabricObj, origLeft: fabricObj?.left ?? 0, origTop: fabricObj?.top ?? 0, origAngle: fabricObj?.angle ?? 0, origFeetPos: { ...pp.position } };`
    - DELETE the existing seed-history moveProduct call on mousedown (if present; this is the key change — no store writes during the drag, not even the seed).

    Repeat analogous pattern for wall move, wall endpoint, product rotation drags. For wall-move: identify the fabric polygon via `(obj as any).data?.wallId`. For wall-endpoint: cache the wall ID + which endpoint + current start/end in feet. For product-rotation: cache the fabric group + origAngle.

    **Step 3 — In mouse:move, REPLACE the per-frame store calls** (current lines 627-633 for product; the existing `updateWallNoHistory` / `rotateProductNoHistory` etc. calls for other drags):

    For product move:
    ```typescript
    if (dragType === "product" && dragPre?.kind === "product" && dragPre.fabricObj) {
      const newLeft = origin.x + snapped.x * scale;
      const newTop  = origin.y + snapped.y * scale;
      dragPre.fabricObj.set({ left: newLeft, top: newTop });
      fc.requestRenderAll();
      lastDragSnapped = snapped;
      return;   // skip the old store-write branch
    }
    ```

    For wall move: translate both endpoints by the pointer delta; mutate the fabric polygon's `points` array (use existing `wallCorners()` helper if already in scope, else import from toolUtils/geometry). Set left/top OR update points directly — whichever matches the polygon Fabric creates in fabricSync. `fc.requestRenderAll()`. Cache final `{ start, end }` in a local.

    For wall endpoint: compute new endpoint in feet; mutate the polygon points in place; `fc.requestRenderAll()`. Cache final `{ start }` or `{ end }` in a local.

    For product rotation: `dragPre.fabricObj.set({ angle: newAngleDeg })`; `fc.requestRenderAll()`; cache final rotation.

    **CRITICAL:** In EVERY mouse:move branch for these 4 drag types, ZERO calls to `useCADStore.getState().moveProduct | updateWall | updateWallNoHistory | rotateProduct | rotateProductNoHistory | moveCustomElement`. Ripgrep the mouse:move block at the end of the edit to confirm. The old `*NoHistory` calls inside these 4 branches MUST be deleted.

    **Step 4 — In mouse:up, COMMIT exactly once via the committing variant:**
    ```typescript
    if (dragPre?.kind === "product" && lastDragSnapped) {
      const store = useCADStore.getState();
      // Distinguish product vs custom element by checking where the id lives
      const doc = getActiveRoomDoc();
      if (doc?.placedProducts[dragPre.id]) {
        store.moveProduct(dragPre.id, lastDragSnapped);
      } else {
        store.moveCustomElement(dragPre.id, lastDragSnapped);
      }
    } else if (dragPre?.kind === "wall-move" && /* final start/end cached */) {
      useCADStore.getState().updateWall(dragPre.id, { start: finalStart, end: finalEnd });
    } else if (dragPre?.kind === "wall-endpoint" && /* final endpoint cached */) {
      const changes = dragPre.endpoint === "start" ? { start: final } : { end: final };
      useCADStore.getState().updateWall(dragPre.id, changes);
    } else if (dragPre?.kind === "product-rotate" && lastDragRotation != null) {
      useCADStore.getState().rotateProduct(dragPre.id, lastDragRotation);
    }
    dragPre = null;
    lastDragSnapped = null;
    lastDragRotation = null;
    ```

    **Step 5 — Extend the cleanup fn at lines 699-706** to revert an in-flight drag:
    ```typescript
    return () => {
      // D-06: if cleanup fires mid-drag, revert the fabric object and DO NOT write to store
      if (dragPre && dragPre.fabricObj) {
        if (dragPre.kind === "product" || dragPre.kind === "wall-move") {
          dragPre.fabricObj.set({
            left: dragPre.origLeft,
            top: dragPre.origTop,
          });
        }
        if (dragPre.kind === "product") {
          dragPre.fabricObj.set({ angle: dragPre.origAngle });
        }
        if (dragPre.kind === "product-rotate") {
          dragPre.fabricObj.set({ angle: dragPre.origAngle });
        }
        // wall-endpoint revert requires restoring polygon points — use orig start/end:
        if (dragPre.kind === "wall-endpoint" || dragPre.kind === "wall-move") {
          // Recompute polygon points from original feet coords and assign to fabricObj.points
          // (use wallCorners() helper with dragPre.origFeetStart/End + current wall thickness)
        }
        fc.requestRenderAll();
      }
      dragPre = null;
      lastDragSnapped = null;
      lastDragRotation = null;
      // ... existing listener-detach code from Phase 24 stays intact ...
    };
    ```

    **Guardrails:**
    - Do NOT introduce any module-level state (Phase 24 closure convention — use closure `let` only).
    - Do NOT add a new NoHistory store action. D-05 explicitly routes through zero store writes during drag.
    - Do NOT extend fast path to ceiling drag, opening drag, or custom element rotation. D-03 scopes to 4 operations only.
    - Do NOT remove the Phase 24 cleanup listener-detach code — only ADD the revert logic above it.
    - Keep the fabricObj lookup lazy: `fc.getObjects().find(...)` runs ONCE per mousedown, O(N), acceptable for 50-wall/30-product scenes.

    Implements: D-01, D-03, D-04, D-05, D-06.
  </action>
  <verify>
    <automated>npm test -- tests/cadStore.test.ts tests/toolCleanup.test.ts tests/fabricSync.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/canvas/tools/selectTool.ts` contains the literal string `fc.requestRenderAll()`
    - `src/canvas/tools/selectTool.ts` contains the literal string `dragPre`
    - `src/canvas/tools/selectTool.ts` mouse:move block for dragType === "product" does NOT call `moveProduct` or `moveCustomElement` — verify by ripgrep showing those calls only appear inside the mouse:up branch
    - `src/canvas/tools/selectTool.ts` DOES NOT declare any `const state = {...}` at module scope (Phase 24 closure convention preserved — grep: zero matches for `^const state = \{` at top level)
    - `npm test -- tests/cadStore.test.ts -t "drag produces single history entry"` exits 0
    - `npm test -- tests/cadStore.test.ts -t "wall drag produces single history entry"` exits 0
    - `npm test -- tests/fabricSync.test.ts -t "fast path does not clear canvas during drag"` exits 0 (was RED in Wave 0)
    - `npm test -- tests/toolCleanup.test.ts -t "drag interrupted by tool switch"` exits 0 (was RED in Wave 0)
    - `npm test -- tests/toolCleanup.test.ts` — all existing Phase 24 listener-leak tests STILL pass (no regression to cleanup fn contract)
    - Full `npm test`: 168 pre-existing passing PLUS 3 newly-green (fast path contracts) = 171+ passing; pre-existing 6 failures unchanged; 3 todo unchanged
    - Manual smoke: `npm run dev` → drag a product; confirm product moves smoothly; release; press Ctrl+Z → product returns to pre-drag position (single undo step, not 60)
    - Manual smoke: start a drag; press `W` mid-drag (tool switch); confirm product snaps back to pre-drag position; press Ctrl+Z → nothing to undo (no history was pushed)
  </acceptance_criteria>
  <done>
    4 drag types (product move, wall move, wall endpoint, product rotation) use the fast path: zero store writes during move, one commit on mouseup, clean revert on cleanup. All 4 Wave 0 PERF-01 tests GREEN. No regression to Phase 24 cleanup contract. Manual smoke confirms 60fps feel and single-undo boundary.
  </done>
</task>

</tasks>

<verification>
Quick run: `npm test -- tests/cadStore.test.ts tests/toolCleanup.test.ts tests/fabricSync.test.ts`. All 4 Wave 0 PERF-01 tests flip GREEN.

Full run: `npm test` — 168 pre-existing passing preserved, 4 new green (renderOnAddRemove disabled, fast path no-clear, drag-interrupt revert, plus the 2 single-history tests now exercised by real drag sim).

Manual smoke (D-12 style):
1. `npm run dev`; open http://localhost:5173
2. In console: `window.__cadSeed(50, 30)`
3. Drag a product — must feel smooth, no stutter
4. Release; Ctrl+Z — product returns to pre-drag position (ONE undo step, not sixty)
5. Start another drag; press `W` mid-drag — product snaps back (cleanup revert works); Ctrl+Z has nothing to undo
6. Drag a wall endpoint — wall reshapes smoothly; release; Ctrl+Z returns endpoint (one undo)
7. Use product rotation handle — rotates smoothly; release; Ctrl+Z returns angle (one undo)

Chrome DevTools Performance panel capture is Wave 3's job. This wave just has to make the drags ship.
</verification>

<success_criteria>
- [ ] `fc.renderOnAddRemove === false` at FabricCanvas init — `"renderOnAddRemove disabled"` test GREEN
- [ ] Fast path implemented for all 4 D-03 drag types
- [ ] Zero `useCADStore.getState().(moveProduct|updateWall|rotateProduct|moveCustomElement)` calls inside the mouse:move branches for those 4 drag types
- [ ] Exactly one committing store action call on mouse:up per drag — `"drag produces single history entry"` + `"wall drag produces single history entry"` tests GREEN
- [ ] Cleanup revert wired — `"drag interrupted by tool switch"` test GREEN
- [ ] All Phase 24 listener-leak tests still pass (no cleanup regression)
- [ ] Full suite: 168 pre-existing passing preserved; new green ≥ 4; failures unchanged
- [ ] Manual smoke confirms: smooth drag, single-undo, clean revert on tool switch
</success_criteria>

<output>
After completion, create `.planning/phases/25-canvas-store-performance/25-02-SUMMARY.md` documenting:
- Exact closure-state shape added to selectTool.ts (DragPre discriminated union)
- Which committing store actions are called on mouse:up for each drag type
- Confirmation that mouse:move does NOT call any store action for the 4 drag types
- Red→Green transitions for all 4 PERF-01 Wave 0 tests
- Manual smoke result: 50W/30P seeded; drag feels smooth; Ctrl+Z produces one undo per drag
- Any pitfalls hit during implementation (e.g., polygon point recomputation for wall endpoint revert)
</output>
