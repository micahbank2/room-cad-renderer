---
phase: 24-tool-architecture-refactor
plan: 03
type: execute
wave: 2
depends_on: [24-02]
files_modified:
  - src/canvas/tools/doorTool.ts
  - src/canvas/tools/windowTool.ts
  - src/canvas/tools/productTool.ts
  - src/canvas/tools/ceilingTool.ts
  - src/canvas/tools/wallTool.ts
  - src/canvas/tools/selectTool.ts
  - src/canvas/FabricCanvas.tsx
  - tests/toolCleanup.test.ts
autonomous: true
requirements:
  - TOOL-01
  - TOOL-02
must_haves:
  truths:
    - "Zero (fc as any) casts remain in src/canvas/tools/ — all 18 eliminated"
    - "No module-level const state = {...} declaration exists in any tool file"
    - "No WallToolState / SelectState / CeilingToolState wrapper interface exists in any tool file"
    - "productTool.pendingProductId and selectTool._productLibrary REMAIN module-scoped (public-API bridge per D-07)"
    - "Every activateXTool returns () => void"
    - "No deactivateXTool export exists in any tool file"
    - "FabricCanvas.tsx stores the returned cleanup fn in a useRef and invokes it on tool switch and unmount"
    - "tests/toolCleanup.test.ts describe.skip is flipped to describe; 6 listener-leak tests now run and pass"
    - "npm test passes with same failure set as baseline PLUS 6 new passing tests from toolCleanup.test.ts"
    - "npx tsc --noEmit exits 0"
    - "No behavioral regression — all 6 tools still draw/place/select identically"
  artifacts:
    - path: src/canvas/tools/productTool.ts
      provides: "Product placement tool with cleanup-fn return and module-scoped pendingProductId public API"
      exports: ["activateProductTool", "setPendingProduct"]
    - path: src/canvas/tools/doorTool.ts
      provides: "Door placement tool with cleanup-fn return and closure state"
      exports: ["activateDoorTool"]
    - path: src/canvas/tools/windowTool.ts
      provides: "Window placement tool with cleanup-fn return and closure state"
      exports: ["activateWindowTool"]
    - path: src/canvas/tools/ceilingTool.ts
      provides: "Ceiling polygon tool with cleanup-fn return and closure state (commitCeiling + cleanup moved into closure)"
      exports: ["activateCeilingTool"]
    - path: src/canvas/tools/wallTool.ts
      provides: "Wall drawing tool with cleanup-fn return and closure state (cleanup() helper inlined into closure)"
      exports: ["activateWallTool"]
    - path: src/canvas/tools/selectTool.ts
      provides: "Select tool with cleanup-fn return and closure state; _productLibrary + setSelectToolProductLibrary remain module-scoped"
      exports: ["activateSelectTool", "setSelectToolProductLibrary"]
    - path: src/canvas/FabricCanvas.tsx
      provides: "Consumer updated to store and invoke cleanup fn via useRef"
      contains: "toolCleanupRef"
  key_links:
    - from: src/canvas/FabricCanvas.tsx
      to: src/canvas/tools/*Tool.ts
      via: "useRef<(() => void) | null>(null) holds active cleanup fn; invoked before re-activate and on unmount"
      pattern: "toolCleanupRef\\.current"
    - from: tests/toolCleanup.test.ts
      to: "activateXTool return values"
      via: "expectLeakFree helper invokes returned cleanup fn and inspects fc.__eventListeners"
      pattern: "describe\\(\"tool cleanup"
---

<objective>
Wave 2 is the structural core of the phase: convert all 6 tools to the cleanup-fn return pattern (TOOL-01) and move their mutable state into the activate closure (TOOL-02). Also updates the single consumer (FabricCanvas.tsx) to hold the returned cleanup fn in a useRef and invoke it on tool switch + unmount. Finally, un-skips the listener-leak test created in Wave 0.

Purpose: Eliminate all 18 `(fc as any).__xToolCleanup` casts. Make tool lifecycle match the React useEffect idiom. Ensure two parallel tool activations (hypothetical multi-canvas future) cannot bleed state. Convert the "manual smoke test" verification into an automated regression guard.

Output: 6 tool files refactored, FabricCanvas.tsx tool dispatch rewritten around `toolCleanupRef`, tests/toolCleanup.test.ts active with 6 passing cases, test baseline unchanged except for +6 passing tests.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/24-tool-architecture-refactor/24-CONTEXT.md
@.planning/phases/24-tool-architecture-refactor/24-RESEARCH.md
@.planning/phases/24-tool-architecture-refactor/24-VALIDATION.md
@.planning/phases/24-tool-architecture-refactor/24-01-SUMMARY.md
@.planning/phases/24-tool-architecture-refactor/24-02-SUMMARY.md
@src/canvas/tools/toolUtils.ts
@src/canvas/FabricCanvas.tsx
@tests/toolCleanup.test.ts

<interfaces>
<!-- Cleanup-fn contract — all 6 tools must conform: -->
```typescript
type CleanupFn = () => void;

// All 6 activate fns share this shape after Wave 2:
export function activateXTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number },
): CleanupFn;
```

<!-- FabricCanvas.tsx new dispatch shape (RESEARCH.md §3): -->
```typescript
const toolCleanupRef = useRef<(() => void) | null>(null);

// In redraw useCallback (replaces lines 160-161):
toolCleanupRef.current?.();
toolCleanupRef.current = activateCurrentTool(fc, activeTool, scale, origin);

// In unmount effect (replaces line 198):
toolCleanupRef.current?.();
toolCleanupRef.current = null;
fc.dispose();

// activateCurrentTool switch (replaces lines 474-500) returns (() => void) | null
```

<!-- Module-scope bindings that STAY (D-07 + RESEARCH.md §9): -->
```typescript
// productTool.ts — toolbar → tool bridge, public API:
let pendingProductId: string | null = null;
export function setPendingProduct(productId: string | null): void;
// getPendingProduct: DEAD CODE — delete export per RESEARCH.md §9 Q1

// selectTool.ts — productLibrary injection bridge, public API:
let _productLibrary: Product[] = [];
export function setSelectToolProductLibrary(lib: Product[]): void;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Refactor 4 simple tools (door, window, product, ceiling) to cleanup-fn pattern + closure state</name>
  <files>src/canvas/tools/doorTool.ts, src/canvas/tools/windowTool.ts, src/canvas/tools/productTool.ts, src/canvas/tools/ceilingTool.ts</files>
  <read_first>
    - src/canvas/tools/doorTool.ts (current — module-level `let previewPolygon` at line ~10, module-level `updatePreview`/`clearPreview` at lines ~45/102, `(fc as any).__doorToolCleanup` at lines 160/169/170, `deactivateDoorTool(fc)` export and self-call on line 115)
    - src/canvas/tools/windowTool.ts (same structure as doorTool; lines 156/165/166 casts, self-call line 113)
    - src/canvas/tools/productTool.ts (module-level `let pendingProductId` at line 8 STAYS per D-07, local `pxToFeet` already gone, `(fc as any).__productToolCleanup` at lines 60/67/70, self-call line 34, dead-code `getPendingProduct` export at line 14)
    - src/canvas/tools/ceilingTool.ts (module-level `const state` at lines 7–19, `commitCeiling(fc)` at line ~170, `cleanup(fc)` at line ~180, casts at lines 161/201/204, self-call line 46)
    - .planning/phases/24-tool-architecture-refactor/24-RESEARCH.md §"Before/after: productTool.ts" (canonical example)
    - .planning/phases/24-tool-architecture-refactor/24-RESEARCH.md §2 "Every module-level mutable state declaration" (per-tool inventory)
    - .planning/phases/24-tool-architecture-refactor/24-RESEARCH.md "Common Pitfalls" (pitfalls 1, 2, 4, 5, 6 apply)
  </read_first>
  <behavior>
    - Each activate fn returns () => void (typed explicitly in signature)
    - All `(fc as any).__xToolCleanup` patterns removed — zero casts remain in these 4 files
    - Each tool's first-line `deactivateXTool(fc)` self-call removed (FabricCanvas now owns the lifecycle)
    - Each deactivate export deleted
    - In ceilingTool: `const state` object dissolved into individual `let` bindings inside activateCeilingTool; `commitCeiling` and `cleanup` module-level helpers moved INSIDE the activate closure (close over the let bindings)
    - In doorTool/windowTool: module-level `let previewPolygon` moved into closure; `updatePreview` and `clearPreview` moved INSIDE the activate closure (close over `previewPolygon`)
    - In productTool: `let pendingProductId` REMAINS module-scoped (D-07); `getPendingProduct` export DELETED (dead code per RESEARCH.md §9 Q1)
    - Cleanup fn removes BOTH Fabric listeners (`fc.off`) AND document keydown listeners (`document.removeEventListener`) — Pitfall #1
    - Cleanup fn ALSO removes preview Fabric objects (polygons, vertex markers) — Pitfall #2 — not just listeners
  </behavior>
  <action>
    Process files in this order: **productTool → doorTool → windowTool → ceilingTool**. productTool first because it's simplest (no per-activation state). ceilingTool last because it has the most helper inlining.

    ---

    **1. productTool.ts** (reference the RESEARCH.md §"Before/after: productTool.ts" exemplar — this is the canonical transformation for the 4 simple tools):

    Before (excerpt):
    ```typescript
    let pendingProductId: string | null = null;

    export function setPendingProduct(productId: string | null) { pendingProductId = productId; }
    export function getPendingProduct() { return pendingProductId; }  // DEAD CODE

    export function activateProductTool(fc, scale, origin) {
      deactivateProductTool(fc);  // REMOVE
      const onMouseDown = (opt) => { /* ... */ };
      const onKeyDown = (e) => { /* ... */ };
      fc.on("mouse:down", onMouseDown);
      document.addEventListener("keydown", onKeyDown);
      (fc as any).__productToolCleanup = () => {  // REMOVE cast
        fc.off("mouse:down", onMouseDown);
        document.removeEventListener("keydown", onKeyDown);
      };
    }

    export function deactivateProductTool(fc) {  // REMOVE
      const cleanupFn = (fc as any).__productToolCleanup;
      if (cleanupFn) { cleanupFn(); delete (fc as any).__productToolCleanup; }
    }
    ```

    After:
    ```typescript
    import { pxToFeet } from "./toolUtils";
    // ...existing other imports unchanged

    let pendingProductId: string | null = null;  // KEEP — public API per D-07

    export function setPendingProduct(productId: string | null) {
      pendingProductId = productId;
    }
    // getPendingProduct DELETED (dead code — RESEARCH.md §9 Q1)

    export function activateProductTool(
      fc: fabric.Canvas,
      scale: number,
      origin: { x: number; y: number },
    ): () => void {
      // (no self-clean first-line call — FabricCanvas.tsx invokes prior cleanup)
      const onMouseDown = (opt: fabric.TEvent) => {
        // ... existing body unchanged
      };
      const onKeyDown = (e: KeyboardEvent) => {
        // ... existing body unchanged
      };
      fc.on("mouse:down", onMouseDown);
      document.addEventListener("keydown", onKeyDown);
      return () => {
        fc.off("mouse:down", onMouseDown);
        document.removeEventListener("keydown", onKeyDown);
      };
    }
    // deactivateProductTool export DELETED
    ```

    ---

    **2. doorTool.ts**:

    - KEEP `const DOOR_WIDTH = 3;` and the `SNAP_THRESHOLD` const only if it's still referenced locally (grep). Remove if unused after Wave 1 consolidation.
    - KEEP `updatePreview` and `clearPreview` behavior, but move them INSIDE `activateDoorTool` as local arrow functions that close over a `let previewPolygon: fabric.Polygon | null = null;` binding.
    - Move module-level `let previewPolygon = null` at line 10 INTO the closure.
    - Convert the cleanup block at lines 160+: `(fc as any).__doorToolCleanup = () => { ... }` becomes `return () => { /* same body */ }`. Ensure cleanup:
      1. Calls `fc.off(...)` for every listener attached
      2. Calls `document.removeEventListener("keydown", onKeyDown)` (Pitfall #1)
      3. Calls `clearPreview(fc)` to remove any active preview polygon (Pitfall #2)
    - Delete the `deactivateDoorTool` export at lines ~165–172.
    - Remove the self-clean line `deactivateDoorTool(fc);` at the start of `activateDoorTool` (line ~115).
    - Change function signature from implicit-void to explicit `(): () => void` return type.

    ---

    **3. windowTool.ts**: identical transformation to doorTool.ts. Substitute `DOOR` with `WINDOW`. Line numbers: preview at ~10, cleanup cast at ~156, self-call at ~113.

    ---

    **4. ceilingTool.ts**:

    Starting state (lines 7–19):
    ```typescript
    interface CeilingToolState {
      points: Point[];
      previewLine: fabric.Line | null;
      vertexMarkers: fabric.Circle[];
      closingEdge: fabric.Line | null;
    }
    const state: CeilingToolState = { points: [], previewLine: null, vertexMarkers: [], closingEdge: null };
    ```

    After refactor:
    ```typescript
    // Interface CeilingToolState DELETED (D-06 — no wrapper interfaces)
    // Module-level `const state = ...` DELETED

    export function activateCeilingTool(
      fc: fabric.Canvas,
      scale: number,
      origin: { x: number; y: number },
    ): () => void {
      let points: Point[] = [];
      let previewLine: fabric.Line | null = null;
      let vertexMarkers: fabric.Circle[] = [];
      let closingEdge: fabric.Line | null = null;

      const commitCeiling = () => {
        // BODY of the previous module-level commitCeiling(fc), with every `state.X` replaced by `X`.
        // Keeps `fc` from closure instead of accepting it as a parameter.
      };

      const cleanup = () => {
        // BODY of previous module-level cleanup(fc). Removes preview objects.
        // `state.previewLine` → `previewLine`, etc.
        // Sets `points = []`, `previewLine = null`, `vertexMarkers = []`, `closingEdge = null`.
        if (previewLine) { fc.remove(previewLine); previewLine = null; }
        vertexMarkers.forEach(m => fc.remove(m));
        vertexMarkers = [];
        if (closingEdge) { fc.remove(closingEdge); closingEdge = null; }
        points = [];
      };

      const onMouseDown = (opt: fabric.TEvent) => { /* replace state.X with X throughout */ };
      const onMouseMove = (opt: fabric.TEvent) => { /* same */ };
      const onKeyDown = (e: KeyboardEvent) => { /* same */ };

      fc.on("mouse:down", onMouseDown);
      fc.on("mouse:move", onMouseMove);
      document.addEventListener("keydown", onKeyDown);

      return () => {
        cleanup();
        fc.off("mouse:down", onMouseDown);
        fc.off("mouse:move", onMouseMove);
        document.removeEventListener("keydown", onKeyDown);
      };
    }
    // deactivateCeilingTool export DELETED
    ```

    Mechanical rule: every `state.X` becomes `X`; every `function commitCeiling(fc) { ... }` / `function cleanup(fc) { ... }` moves inside the closure and drops the `fc` parameter (captured via closure). `commitCeiling` may still need `fc` passed in if any call site expects it — simplest is to drop the parameter since `fc` is in scope.

    Remove the self-call `deactivateCeilingTool(fc)` on line 46 (no longer needed).

    ---

    **Verification after each file:**
    1. `grep -c "(fc as any)" src/canvas/tools/<file>.ts` — must be 0
    2. `grep -c "deactivate.*Tool" src/canvas/tools/<file>.ts` — must be 0 (export gone, self-call gone)
    3. `npx tsc --noEmit` — must exit 0
    4. `npm test` — baseline preserved

    **Important — DO NOT touch selectTool.ts or wallTool.ts in this task.** They're Task 2's job.
  </action>
  <verify>
    <automated>! grep -E "\(fc as any\)" src/canvas/tools/doorTool.ts src/canvas/tools/windowTool.ts src/canvas/tools/productTool.ts src/canvas/tools/ceilingTool.ts; ! grep -E "^export function deactivate" src/canvas/tools/doorTool.ts src/canvas/tools/windowTool.ts src/canvas/tools/productTool.ts src/canvas/tools/ceilingTool.ts; ! grep -E "^const state" src/canvas/tools/ceilingTool.ts; ! grep -q "getPendingProduct" src/canvas/tools/productTool.ts; npx tsc --noEmit && npm test</automated>
  </verify>
  <acceptance_criteria>
    - `! grep -E "\\(fc as any\\)" src/canvas/tools/doorTool.ts` (zero casts)
    - `! grep -E "\\(fc as any\\)" src/canvas/tools/windowTool.ts`
    - `! grep -E "\\(fc as any\\)" src/canvas/tools/productTool.ts`
    - `! grep -E "\\(fc as any\\)" src/canvas/tools/ceilingTool.ts`
    - `! grep -E "^export function deactivate(Door|Window|Product|Ceiling)Tool" src/canvas/tools/*.ts`
    - `! grep -E "^const state\\s*:" src/canvas/tools/ceilingTool.ts` (state object dissolved)
    - `! grep -E "^interface CeilingToolState" src/canvas/tools/ceilingTool.ts` (wrapper interface gone per D-06)
    - `grep -q "^let pendingProductId" src/canvas/tools/productTool.ts` (module-scope preserved per D-07)
    - `grep -q "^export function setPendingProduct" src/canvas/tools/productTool.ts` (public API preserved)
    - `! grep -q "getPendingProduct" src/canvas/tools/productTool.ts` (dead code deleted)
    - `grep -q "\\): () => void {" src/canvas/tools/doorTool.ts` (explicit return type)
    - `grep -q "\\): () => void {" src/canvas/tools/windowTool.ts`
    - `grep -q "\\): () => void {" src/canvas/tools/productTool.ts`
    - `grep -q "\\): () => void {" src/canvas/tools/ceilingTool.ts`
    - `npx tsc --noEmit` exits 0
    - `npm test` — same baseline as Wave 1 (FabricCanvas still uses old API — its calls to deactivateXTool are broken at this point, so **this task must be committed together with Task 3's FabricCanvas update to keep the build green**. Alternative: include Task 3 changes atomically in same commit.)
  </acceptance_criteria>
  <done>4 simple tools refactored to cleanup-fn + closure-state pattern. Deactivate exports deleted. productTool.pendingProductId remains module-scoped. getPendingProduct dead-code export removed. Note: build will be red between this task and Task 3 completion since FabricCanvas.tsx still imports deactivateXTool — tasks should be committed as a single unit OR Task 3 must land first (see Task 3 note).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Refactor wallTool.ts and selectTool.ts to cleanup-fn pattern + closure state</name>
  <files>src/canvas/tools/wallTool.ts, src/canvas/tools/selectTool.ts</files>
  <read_first>
    - src/canvas/tools/wallTool.ts (module-level `const state` at lines 7–21, `WallToolState` interface, module-level `cleanup(fc)` helper at lines 235–254 that reads state.*, `(fc as any)` at lines 227/257/260, self-call `cleanup(fc)` at line 64)
    - src/canvas/tools/selectTool.ts (module-level `const state` at lines 41–75, `SelectState` interface with 15 fields, `_productLibrary` + `setSelectToolProductLibrary` STAYS module-scope, `(fc as any)` at lines 733/743/746, self-call `deactivateSelectTool(fc)` at line 299, possible `sizeTag` module-scope per RESEARCH.md Pitfall #5)
    - .planning/phases/24-tool-architecture-refactor/24-RESEARCH.md §2 "wallTool.ts" + "selectTool.ts" inventory
    - .planning/phases/24-tool-architecture-refactor/24-RESEARCH.md Pitfall #5 "selectTool's sizeTag is module-scoped, easy to miss"
    - .planning/phases/24-tool-architecture-refactor/24-RESEARCH.md Pitfall #2 "cleanup() helpers clear preview objects"
  </read_first>
  <behavior>
    - wallTool.ts: `WallToolState` interface deleted; `const state` object dissolved into `let startPoint`, `let previewLine`, `let startMarker`, `let endpointHighlight`, `let lengthLabel` inside activateWallTool; module-level `cleanup(fc)` helper moved INSIDE the activate closure; self-call `cleanup(fc)` at line 64 removed; `(fc as any).__wallToolCleanup` replaced with `return () => { ... }`; `deactivateWallTool` export deleted
    - `findNearestEndpoint(cursor, excludeStart)` function at line 28 REMAINS at module scope (pure, no state access — per RESEARCH.md §2 and D-08)
    - selectTool.ts: `SelectState` interface deleted; `const state` object dissolved into 15 `let` bindings inside activateSelectTool; `(fc as any)` replaced with return cleanup fn; `deactivateSelectTool` export deleted; self-call at line 299 removed; `sizeTag` (if module-scope) moved into closure
    - selectTool.ts: `let _productLibrary` and `export function setSelectToolProductLibrary` REMAIN module-scoped (public API per D-07 + RESEARCH.md §9)
    - selectTool.ts: 4 custom-elements `as any` casts (lines 134/135/341/526 per CONTEXT.md D-10) are DEFERRED — do NOT touch them
  </behavior>
  <action>
    **1. wallTool.ts**:

    Starting state (lines 7–21):
    ```typescript
    interface WallToolState {
      startPoint: Point | null;
      previewLine: fabric.Line | null;
      startMarker: fabric.Circle | null;
      endpointHighlight: fabric.Circle | null;
      lengthLabel: fabric.Group | null;
    }
    const state: WallToolState = {
      startPoint: null,
      previewLine: null,
      startMarker: null,
      endpointHighlight: null,
      lengthLabel: null,
    };
    ```

    After:
    ```typescript
    // interface WallToolState DELETED (D-06)
    // const state DELETED

    export function activateWallTool(
      fc: fabric.Canvas,
      scale: number,
      origin: { x: number; y: number },
    ): () => void {
      let startPoint: Point | null = null;
      let previewLine: fabric.Line | null = null;
      let startMarker: fabric.Circle | null = null;
      let endpointHighlight: fabric.Circle | null = null;
      let lengthLabel: fabric.Group | null = null;

      // Move the module-level `function cleanup(fc: fabric.Canvas)` at lines 235–254
      // INSIDE the closure as a local arrow fn that closes over the above lets:
      const clearPreview = () => {
        if (previewLine) { fc.remove(previewLine); previewLine = null; }
        if (startMarker) { fc.remove(startMarker); startMarker = null; }
        if (endpointHighlight) { fc.remove(endpointHighlight); endpointHighlight = null; }
        if (lengthLabel) { fc.remove(lengthLabel); lengthLabel = null; }
        startPoint = null;
      };

      // ... existing handlers (onMouseDown, onMouseMove, onMouseUp, onKeyDown)
      // Replace every `state.X` with just `X` throughout. Ignore findNearestEndpoint — stays at module scope.

      fc.on("mouse:down", onMouseDown);
      fc.on("mouse:move", onMouseMove);
      // ... plus any other fc.on calls present today
      document.addEventListener("keydown", onKeyDown);

      return () => {
        clearPreview();
        fc.off("mouse:down", onMouseDown);
        fc.off("mouse:move", onMouseMove);
        // ... any other fc.off calls
        document.removeEventListener("keydown", onKeyDown);
      };
    }

    // Module-level `function cleanup(fc)` DELETED (inlined into closure)
    // `export function deactivateWallTool(fc)` DELETED
    // `findNearestEndpoint(cursor, excludeStart)` at line 28 STAYS — pure helper, no state access
    ```

    Remove self-call `cleanup(fc)` at line 64 (FabricCanvas owns lifecycle).

    Verify: `grep -c "state\\." src/canvas/tools/wallTool.ts` — should be 0 after refactor.

    ---

    **2. selectTool.ts** (largest file — 750+ lines):

    Start with a grep inventory BEFORE editing:
    ```
    grep -cn "state\\." src/canvas/tools/selectTool.ts
    grep -n "sizeTag" src/canvas/tools/selectTool.ts
    grep -n "_productLibrary" src/canvas/tools/selectTool.ts
    grep -n "^const\\|^let\\|^interface\\|^export function" src/canvas/tools/selectTool.ts
    ```

    Apply these transformations:

    a. Delete `interface SelectState { ... }` (lines ~41–60, 15 fields).

    b. Delete module-level `const state: SelectState = { ... }` (lines ~61–75).

    c. Inside `activateSelectTool`, add 15 `let` bindings at the top, initialized to the same values the former `state` object had:
    ```typescript
    let dragging = false;
    let dragId: string | null = null;
    let dragType: "product" | "wall" | "opening" | null = null;
    let dragOffsetFeet: Point = { x: 0, y: 0 };
    let rotateInitialAngle = 0;
    let wallRotateInitialAngleDeg = 0;
    let wallRotatePointerStartDeg = 0;
    let resizeInitialScale = 1;
    let resizeInitialDiagFt = 0;
    let wallEndpointWhich: "start" | "end" | null = null;
    let openingWallId: string | null = null;
    let openingId: string | null = null;
    let openingInitialOffset = 0;
    let openingInitialWidth = 0;
    let openingInitialPointerOffset = 0;
    ```
    (Match the EXACT types and initial values from the deleted interface/object — read them before editing.)

    d. Replace every `state.X` in the activate body with `X`. Research §2 Verified at source says no module-scope helpers read `state` directly (only event handlers inside activateSelectTool) — this should be a mechanical find-replace. **Verify**: after editing, `grep -n "state\\." src/canvas/tools/selectTool.ts` must return zero matches.

    e. If `let sizeTag: fabric.Group | null = null` exists at module scope (Pitfall #5), move it into the closure alongside the other `let` bindings. If `clearSizeTag(fc)` is a module-level helper that reads `sizeTag`, also inline it into the closure.

    f. KEEP module-scoped:
       - `let _productLibrary: Product[] = [];` (~line 290 area)
       - `export function setSelectToolProductLibrary(lib: Product[]): void { _productLibrary = lib; }`
       - Anything else that's a cross-boundary bridge consumed by FabricCanvas.tsx

    g. Replace the `(fc as any).__selectToolCleanup = () => { ... }` block at lines 733+ with `return () => { /* same body */ }`. Cleanup fn must:
       - Remove all `fc.off(...)` listeners
       - Remove `document.removeEventListener("keydown", onKeyDown)`
       - Clear any preview objects / size tags (Pitfall #2)

    h. Delete the `export function deactivateSelectTool(fc)` block at lines 743+.

    i. Delete the self-call `deactivateSelectTool(fc);` at line 299.

    j. Add explicit return type: `): () => void {`.

    k. **DO NOT** touch the 4 custom-elements `as any` casts at lines 134/135/341/526 — deferred per D-10.

    ---

    Verification after both files:
    ```
    grep -c "(fc as any)" src/canvas/tools/wallTool.ts   # must be 0
    grep -c "(fc as any)" src/canvas/tools/selectTool.ts # must be 4 (deferred custom-elements casts)
    grep -c "^const state" src/canvas/tools/wallTool.ts src/canvas/tools/selectTool.ts  # must be 0
    grep "^interface.*State" src/canvas/tools/wallTool.ts src/canvas/tools/selectTool.ts  # must be empty
    ```

    selectTool.ts still has exactly 4 `(fc as any)` casts — those are the deferred custom-elements ones (D-10). To satisfy the phase's "zero `(fc as any)` in tools/" success criterion, those 4 aren't on `fc` — they're on `useCADStore.getState()`. The phase criterion is specifically `ripgrep "(fc as any)" src/canvas/tools/` → zero matches. Confirm by reading the 4 lines: if they're `(useCADStore.getState() as any)` the `(fc as any)` grep is already zero. If they actually read `(fc as any)`, re-check D-10 scope — but per CONTEXT.md §decisions line 38, they're `custom-elements catalog access`, which goes through the store, not `fc`.

    **Precise check:** `grep -E "\\(fc as any\\)" src/canvas/tools/selectTool.ts` must return zero. `grep -E "as any" src/canvas/tools/selectTool.ts` may return 4 (deferred casts on other objects).
  </action>
  <verify>
    <automated>! grep -E "\\(fc as any\\)" src/canvas/tools/wallTool.ts src/canvas/tools/selectTool.ts; ! grep -E "^const state" src/canvas/tools/wallTool.ts src/canvas/tools/selectTool.ts; ! grep -E "^interface (WallTool|Select)State" src/canvas/tools/wallTool.ts src/canvas/tools/selectTool.ts; grep -q "^let _productLibrary" src/canvas/tools/selectTool.ts; grep -q "^export function setSelectToolProductLibrary" src/canvas/tools/selectTool.ts; grep -q "function findNearestEndpoint" src/canvas/tools/wallTool.ts; npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `! grep -E "\\(fc as any\\)" src/canvas/tools/wallTool.ts` (zero casts)
    - `! grep -E "\\(fc as any\\)" src/canvas/tools/selectTool.ts` (zero casts on `fc`; the 4 deferred `as any` casts are on `useCADStore.getState()`, not `fc`)
    - `! grep -E "^const state\\s*:" src/canvas/tools/wallTool.ts src/canvas/tools/selectTool.ts`
    - `! grep -E "^interface (WallToolState|SelectState)" src/canvas/tools/wallTool.ts src/canvas/tools/selectTool.ts`
    - `! grep -E "^export function deactivate(Wall|Select)Tool" src/canvas/tools/*.ts`
    - `grep -q "^let _productLibrary" src/canvas/tools/selectTool.ts` (module-scope per D-07)
    - `grep -q "^export function setSelectToolProductLibrary" src/canvas/tools/selectTool.ts` (public API preserved)
    - `grep -q "function findNearestEndpoint" src/canvas/tools/wallTool.ts` (module-scope helper preserved)
    - `grep -q "\\): () => void {" src/canvas/tools/wallTool.ts` (explicit return type)
    - `grep -q "\\): () => void {" src/canvas/tools/selectTool.ts`
    - `! grep -E "^\\s*state\\." src/canvas/tools/wallTool.ts src/canvas/tools/selectTool.ts` (no lingering state.X references)
    - `npx tsc --noEmit` exits 0 (even if FabricCanvas.tsx hasn't landed Task 3 yet, this may surface type errors — that's expected; commit Task 2 + 3 atomically or land Task 3 first)
  </acceptance_criteria>
  <done>wallTool and selectTool refactored. All 18 `(fc as any)` casts on `fc` eliminated across tools/. `state` objects + wrapper interfaces dissolved. Module-scope bridges preserved per D-07.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Update FabricCanvas.tsx tool-dispatch to cleanup-fn ref + un-skip toolCleanup tests</name>
  <files>src/canvas/FabricCanvas.tsx, tests/toolCleanup.test.ts</files>
  <read_first>
    - src/canvas/FabricCanvas.tsx (lines 18–23 imports, lines 160–161 redraw useCallback, line 198 unmount, lines 465–500 deactivateAllTools + activateCurrentTool helpers)
    - tests/toolCleanup.test.ts (Wave 0 scaffold with describe.skip)
    - .planning/phases/24-tool-architecture-refactor/24-RESEARCH.md §3 "Every call site" table + "Recommended cleanup-fn storage shape"
    - .planning/phases/24-tool-architecture-refactor/24-RESEARCH.md Pitfall #3 "Double-cleanup on unmount" + Pitfall #4 "unknown tool types"
  </read_first>
  <behavior>
    - FabricCanvas imports drop all `deactivate*Tool` imports (lines 18–23); keep all 6 `activate*Tool` imports
    - A `useRef<(() => void) | null>(null)` named `toolCleanupRef` is declared inside the FabricCanvas component body
    - `redraw` useCallback: replaces `deactivateAllTools(fc); activateCurrentTool(fc, ...);` with `toolCleanupRef.current?.(); toolCleanupRef.current = activateCurrentTool(fc, activeTool, scale, origin);`
    - Unmount effect: replaces `deactivateAllTools(fc);` with `toolCleanupRef.current?.(); toolCleanupRef.current = null;` BEFORE `fc.dispose()` (Pitfall #3 — order matters)
    - `deactivateAllTools` helper (lines ~465–472) DELETED
    - `activateCurrentTool` helper signature changes to return `(() => void) | null`; unknown-tool default returns `null` (Pitfall #4)
    - The 3 deferred `as any` casts on Fabric event types at lines 210/250/251 are UNTOUCHED (D-11)
    - tests/toolCleanup.test.ts: `describe.skip(...)` flipped to `describe(...)`; 6 tests now run and pass
  </behavior>
  <action>
    **1. src/canvas/FabricCanvas.tsx**:

    a. At the top of the file, update imports. Before (lines 18–23):
    ```typescript
    import { activateSelectTool, deactivateSelectTool } from "./tools/selectTool";
    import { activateWallTool, deactivateWallTool } from "./tools/wallTool";
    import { activateDoorTool, deactivateDoorTool } from "./tools/doorTool";
    import { activateWindowTool, deactivateWindowTool } from "./tools/windowTool";
    import { activateProductTool, deactivateProductTool } from "./tools/productTool";
    import { activateCeilingTool, deactivateCeilingTool } from "./tools/ceilingTool";
    ```

    After:
    ```typescript
    import { activateSelectTool, setSelectToolProductLibrary } from "./tools/selectTool";
    import { activateWallTool } from "./tools/wallTool";
    import { activateDoorTool } from "./tools/doorTool";
    import { activateWindowTool } from "./tools/windowTool";
    import { activateProductTool } from "./tools/productTool";
    import { activateCeilingTool } from "./tools/ceilingTool";
    ```
    (Preserve `setSelectToolProductLibrary` import if it was already there — check line 93 `useEffect → setSelectToolProductLibrary(productLibrary)`.)

    b. Inside the `FabricCanvas` component body, alongside the other `useRef` declarations, add:
    ```typescript
    const toolCleanupRef = useRef<(() => void) | null>(null);
    ```

    c. In the `redraw` useCallback (around lines 160–161), replace:
    ```typescript
    deactivateAllTools(fc);
    activateCurrentTool(fc, activeTool, scale, origin);
    ```
    With:
    ```typescript
    toolCleanupRef.current?.();
    toolCleanupRef.current = activateCurrentTool(fc, activeTool, scale, origin);
    ```

    d. In the unmount effect (around line 198), replace:
    ```typescript
    deactivateAllTools(fc);
    fc.dispose();
    ```
    With (Pitfall #3 — invoke cleanup BEFORE dispose):
    ```typescript
    toolCleanupRef.current?.();
    toolCleanupRef.current = null;
    fc.dispose();
    ```

    e. Delete the `deactivateAllTools` helper function (lines ~465–472) in full.

    f. Update `activateCurrentTool` helper (lines ~474–500). Before:
    ```typescript
    function activateCurrentTool(
      fc: fabric.Canvas,
      tool: string,
      scale: number,
      origin: { x: number; y: number },
    ): void {
      switch (tool) {
        case "select":  activateSelectTool(fc, scale, origin); break;
        case "wall":    activateWallTool(fc, scale, origin); break;
        // ...
      }
    }
    ```

    After (Pitfall #4 — handle unknown-tool case):
    ```typescript
    function activateCurrentTool(
      fc: fabric.Canvas,
      tool: string,
      scale: number,
      origin: { x: number; y: number },
    ): (() => void) | null {
      switch (tool) {
        case "select":  return activateSelectTool(fc, scale, origin);
        case "wall":    return activateWallTool(fc, scale, origin);
        case "product": return activateProductTool(fc, scale, origin);
        case "door":    return activateDoorTool(fc, scale, origin);
        case "window":  return activateWindowTool(fc, scale, origin);
        case "ceiling": return activateCeilingTool(fc, scale, origin);
        default:        return null;
      }
    }
    ```

    g. Do NOT modify lines 210, 250, 251 — the 3 deferred `as any` casts on fabric event types (D-11).

    h. Run `npx tsc --noEmit` — must exit 0. If any type error surfaces, check that all 6 tool files completed Tasks 1–2 with explicit `() => void` return types.

    ---

    **2. tests/toolCleanup.test.ts**:

    Edit the file created in Wave 0. Change:
    ```typescript
    describe.skip("tool cleanup — no listener leaks (Wave 2 enables)", () => {
    ```
    To:
    ```typescript
    describe("tool cleanup — no listener leaks", () => {
    ```

    Remove the `as Activator` casts if the tool signatures now strictly match the `Activator` type (they should — all 6 activate fns return `() => void`). Keep the cast if TypeScript complains about variance.

    Run `npm test -- toolCleanup` — expect all 6 tests to pass. If any test fails:
    - Check that the tool's cleanup fn removes BOTH fc listeners AND document keydown listeners (Pitfall #1)
    - Check that cleanup also removes preview Fabric objects (Pitfall #2)
    - Use `console.log(Object.entries((fc as any).__eventListeners ?? {}).map(([k,v]) => [k, v.length]))` in the test to inspect which event has stragglers

    If selectTool's leak test is flaky due to interaction with `_productLibrary` setup, ensure the test calls `setSelectToolProductLibrary([])` before activation.

    ---

    **3. Full suite run:**

    `npm test` — expect baseline (165 passing) + 6 new passing tests = 171 passing + 6 pre-existing failures = **177 total, 6 failing (same names as Wave 0 baseline)**.

    Wait — the baseline was 171 total (165 passing + 6 failing). Adding 6 new passing tests gives **177 total (171 passing + 6 failing)**. Confirm by running and recording.
  </action>
  <verify>
    <automated>! grep -E "deactivate(Select|Wall|Door|Window|Product|Ceiling)Tool" src/canvas/FabricCanvas.tsx; ! grep -E "^function deactivateAllTools" src/canvas/FabricCanvas.tsx; grep -q "toolCleanupRef" src/canvas/FabricCanvas.tsx; grep -q "useRef<(() => void) | null>" src/canvas/FabricCanvas.tsx; ! grep -q "describe.skip" tests/toolCleanup.test.ts; npx tsc --noEmit && npm test</automated>
  </verify>
  <acceptance_criteria>
    - `! grep -E "deactivate(Select|Wall|Door|Window|Product|Ceiling)Tool" src/canvas/FabricCanvas.tsx` (imports and calls removed)
    - `! grep -E "^function deactivateAllTools" src/canvas/FabricCanvas.tsx` (helper deleted)
    - `grep -q "toolCleanupRef" src/canvas/FabricCanvas.tsx` (ref declared)
    - `grep -q "useRef<(() => void) | null>" src/canvas/FabricCanvas.tsx` (correct type)
    - `grep -q "toolCleanupRef.current?.()" src/canvas/FabricCanvas.tsx` (invoked at least once for switch + once for unmount)
    - `grep -c "toolCleanupRef.current" src/canvas/FabricCanvas.tsx` returns ≥ 4 (2 sites × 2 references each: invoke + assign)
    - `grep -q "activateCurrentTool.*: (() => void) | null" src/canvas/FabricCanvas.tsx` (return type updated — match may be split across lines; verify by reading)
    - `grep -q "default:\\s*return null" src/canvas/FabricCanvas.tsx` (unknown-tool case handled per Pitfall #4)
    - `! grep -q "describe.skip" tests/toolCleanup.test.ts` (tests un-skipped)
    - `grep -q "describe(\"tool cleanup" tests/toolCleanup.test.ts` (tests active)
    - `grep -c "test(\"" tests/toolCleanup.test.ts` returns ≥ 6
    - `npx tsc --noEmit` exits 0
    - `npm test -- toolCleanup` — all 6 tests pass
    - `npm test` full suite: **171 passing + 6 pre-existing failing = 177 total** (baseline + 6 new passing). Same 6 failing test names as VALIDATION.md baseline.
    - 3 deferred `as any` casts at FabricCanvas.tsx lines 210/250/251 UNTOUCHED: `grep -c "as any" src/canvas/FabricCanvas.tsx` returns 3
  </acceptance_criteria>
  <done>FabricCanvas.tsx owns tool lifecycle via `toolCleanupRef`. All 6 tools return `() => void`. All 18 `(fc as any)` casts gone. Listener-leak test active with 6 passing cases. No behavioral regression.</done>
</task>

</tasks>

<verification>
Wave 2 complete when all three tasks verified:

1. Zero `(fc as any)` in tools/: `! grep -rE "\(fc as any\)" src/canvas/tools/`
2. Zero module-level `const state`: `! grep -E "^const state" src/canvas/tools/*.ts`
3. Zero deactivate exports: `! grep -rE "^export function deactivate" src/canvas/tools/`
4. All 6 activate fns return cleanup: `grep -l "): () => void {" src/canvas/tools/*Tool.ts | wc -l` returns 6
5. FabricCanvas.tsx uses toolCleanupRef: `grep -q "toolCleanupRef.current" src/canvas/FabricCanvas.tsx`
6. Tests un-skipped + passing: `npm test -- toolCleanup` exits 0
7. Full suite baseline intact: `npm test` matches "171 passing + 6 pre-existing failing"
8. Type-check clean: `npx tsc --noEmit` exits 0
9. D-07 preservation: `grep -q "^let pendingProductId" src/canvas/tools/productTool.ts` AND `grep -q "^let _productLibrary" src/canvas/tools/selectTool.ts`
10. D-10 / D-11 deferred casts preserved: selectTool has 4 non-`(fc as any)` casts (on `useCADStore.getState()`); FabricCanvas.tsx has 3 `as any` casts at event-type lines.
</verification>

<success_criteria>
- [ ] All 18 `(fc as any)` casts eliminated from `src/canvas/tools/` (TOOL-01 ✅)
- [ ] Zero module-level `const state` declarations in any tool file (TOOL-02 ✅)
- [ ] Zero wrapper-interface state types (`WallToolState`, `SelectState`, `CeilingToolState`) remaining
- [ ] `productTool.pendingProductId` + `selectTool._productLibrary` remain module-scoped (D-07)
- [ ] All 6 `activateXTool` fns return `() => void` with explicit type annotation
- [ ] All 6 `deactivateXTool` exports deleted
- [ ] `getPendingProduct` dead-code export removed from productTool.ts
- [ ] FabricCanvas.tsx uses `toolCleanupRef = useRef<(() => void) | null>(null)` and invokes it on tool switch + unmount
- [ ] `deactivateAllTools` helper deleted from FabricCanvas.tsx
- [ ] `activateCurrentTool` returns `(() => void) | null` with `default: return null` for unknown tools
- [ ] `tests/toolCleanup.test.ts` active (`describe` not `describe.skip`) with 6 passing listener-leak tests
- [ ] `npm test` full suite: 171 passing + 6 pre-existing failing (baseline + 6 new passing from toolCleanup)
- [ ] `npx tsc --noEmit` exits 0
- [ ] Manual smoke (deferred to Plan 04): draw 3 walls, place door, place window, place product, draw ceiling, rapid tool switch ×10 — no crashes, no visual regressions
</success_criteria>

<output>
After completion, create `.planning/phases/24-tool-architecture-refactor/24-03-SUMMARY.md` documenting:
- Per-file line counts before/after (especially selectTool — expect shrink from 750 to ~735 lines after interface + state object removal)
- Confirmation of all 18 cast eliminations with file paths
- List of module-scope bindings INTENTIONALLY preserved (pendingProductId, _productLibrary, findNearestEndpoint)
- Confirmation that the 3 FabricCanvas.tsx event-type `as any` casts + 4 selectTool custom-elements `as any` casts remain UNTOUCHED per D-10/D-11
- Test suite delta: 165→171 passing, 6→6 failing (same names)
- Handoff for Plan 04 (Wave 3): phase-level verification, manual smoke, PR prep
</output>
