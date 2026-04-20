---
phase: 31-drag-resize-label-override
plan: 03
type: execute
wave: 2
depends_on: [31-02]
requirements: [EDIT-22, EDIT-23, EDIT-24, CUSTOM-06]
files_modified:
  - src/canvas/tools/selectTool.ts
  - src/canvas/fabricSync.ts
  - src/components/PropertiesPanel.tsx
  - src/three/ProductMesh.tsx
  - src/canvas/snapEngine.ts
autonomous: true

must_haves:
  truths:
    - "Selecting a product shows 4 edge handles at N/S/E/W midpoints AND 4 corners (EDIT-22)"
    - "Corner drag writes sizeScale (unchanged); edge drag writes widthFtOverride OR depthFtOverride grid-snapped to uiStore.gridSnap (EDIT-22)"
    - "Wall-endpoint drag invokes computeSnap with restricted scene (endpoints+midpoints only, no product bboxes); Shift locks ortho; Alt disables snap (EDIT-23, D-05/D-06/D-07)"
    - "Every drag-resize produces exactly ONE undo entry — past.length delta === 1 (EDIT-24)"
    - "Mid-drag mutations use *NoHistory variants; drag fast-path (_dragActive guard) preserved (EDIT-24 PERF-01 contract)"
    - "PropertiesPanel renders label-override input when a PlacedCustomElement is selected; placeholder = uppercase catalog name; maxLength=40 (CUSTOM-06, D-09/D-11/D-12)"
    - "Typing commits on Enter OR blur with exactly ONE history entry; Escape cancels and rewinds live-preview (CUSTOM-06, D-10)"
    - "fabricSync renders labelOverride.toUpperCase() ?? catalog.name.toUpperCase() at the custom-element label site (CUSTOM-06, D-14)"
    - "All 7 enumerated consumer sites of effectiveDimensions are migrated to resolveEffectiveDims / resolveEffectiveCustomDims where a PlacedProduct/PlacedCustomElement is available"
    - "Test driver bridges (window.__driveResize, window.__driveWallEndpoint, window.__driveLabelOverride, window.__getCustomElementLabel) are installed when import.meta.env.MODE === 'test'"
  artifacts:
    - path: "src/canvas/tools/selectTool.ts"
      provides: "product-resize-edge dragType branch + wall-endpoint smart-snap integration + test drivers"
      contains: "product-resize-edge"
    - path: "src/canvas/fabricSync.ts"
      provides: "Label-override lookup at custom element label render (~L85); resolveEffectiveDims/CustomDims migration at L811 + custom element render"
      contains: "labelOverride"
    - path: "src/components/PropertiesPanel.tsx"
      provides: "LabelOverrideInput block + RESET SIZE affordance for axis overrides"
      contains: "labelOverride"
    - path: "src/three/ProductMesh.tsx"
      provides: "Migrated to resolveEffectiveDims so 3D mesh respects per-axis overrides"
      contains: "resolveEffectiveDims"
    - path: "src/canvas/snapEngine.ts"
      provides: "Migrated buildSceneGeometry site (L186) to resolveEffectiveDims"
      contains: "resolveEffectiveDims"
  key_links:
    - from: "src/canvas/tools/selectTool.ts"
      to: "src/canvas/resizeHandles.ts"
      via: "import { hitTestAnyResizeHandle, edgeDragToAxisValue, getEdgeHandles } from '@/canvas/resizeHandles'"
      pattern: "hitTestAnyResizeHandle"
    - from: "src/canvas/tools/selectTool.ts"
      to: "src/canvas/wallEndpointSnap.ts"
      via: "import { buildWallEndpointSnapScene } from '@/canvas/wallEndpointSnap'"
      pattern: "buildWallEndpointSnapScene"
    - from: "src/canvas/tools/selectTool.ts"
      to: "src/canvas/snapEngine.ts + snapGuides.ts"
      via: "computeSnap + renderSnapGuides called inside wall-endpoint branch"
      pattern: "computeSnap"
    - from: "src/components/PropertiesPanel.tsx"
      to: "src/stores/cadStore.ts"
      via: "updatePlacedCustomElement + updatePlacedCustomElementNoHistory actions"
      pattern: "updatePlacedCustomElement"
    - from: "src/canvas/fabricSync.ts"
      to: "src/types/cad.ts"
      via: "p.labelOverride read at label render site (~L85)"
      pattern: "labelOverride"
---

<objective>
Wire the Wave 1 pure modules into live user flows: new edge-handle drag branch in selectTool, smart-snap on wall-endpoint drag, label-override input in PropertiesPanel, label lookup in fabricSync, and migrate every effectiveDimensions consumer that has a PlacedProduct/PlacedCustomElement in scope to resolveEffectiveDims.

Purpose: Close EDIT-22, EDIT-23, EDIT-24, CUSTOM-06 end-to-end. All 4 red integration test files from Plan 31-01 turn green.
Output: selectTool carries two new behaviors (edge-resize branch + wall-endpoint smart-snap); PropertiesPanel owns a custom-element branch with label-override input; fabricSync renders overrides; 3D + snap-scene + 2D-sync + tool paths all go through resolveEffectiveDims.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/31-drag-resize-label-override/31-CONTEXT.md
@.planning/phases/31-drag-resize-label-override/31-RESEARCH.md
@.planning/phases/31-drag-resize-label-override/31-02-SUMMARY.md
@src/canvas/tools/selectTool.ts
@src/canvas/fabricSync.ts
@src/canvas/snapEngine.ts
@src/canvas/snapGuides.ts
@src/canvas/resizeHandles.ts
@src/canvas/wallEndpointSnap.ts
@src/components/PropertiesPanel.tsx
@src/three/ProductMesh.tsx
@src/types/cad.ts
@src/types/product.ts
@src/stores/cadStore.ts
@tests/phase31Resize.test.tsx
@tests/phase31WallEndpoint.test.tsx
@tests/phase31Undo.test.tsx
@tests/phase31LabelOverride.test.tsx

<interfaces>
<!-- Driver bridges that this plan MUST install (documented in-file by Plan 31-01). -->

```typescript
// Installed inside selectTool.activate() body, gated by import.meta.env.MODE === "test":
if (import.meta.env.MODE === "test") {
  (window as any).__driveResize = {
    start: (placedId: string, handle: "corner-ne"|"corner-nw"|"corner-sw"|"corner-se"|"edge-n"|"edge-s"|"edge-e"|"edge-w") => { /* simulate mousedown */ },
    to: (feetX: number, feetY: number, opts?: { shift?: boolean; alt?: boolean }) => { /* simulate mousemove */ },
    end: () => { /* simulate mouseup */ },
  };
  (window as any).__driveWallEndpoint = {
    start: (wallId: string, which: "start"|"end") => {},
    to: (feetX: number, feetY: number, opts?: { shift?: boolean; alt?: boolean }) => {},
    end: () => {},
    getGuides: () => /* fc.getObjects().filter(o => o.data?.type === "snap-guide").map(o => ({ type: o.data.type })) */,
  };
}

// Installed inside PropertiesPanel when rendering label-override input:
if (import.meta.env.MODE === "test") {
  (window as any).__driveLabelOverride = {
    typeAndCommit: (pceId: string, text: string, mode: "enter"|"blur") => { /* programmatically drive input */ },
  };
}

// Installed inside fabricSync.ts at render — reads the current label from the rendered Fabric text object:
if (import.meta.env.MODE === "test") {
  (window as any).__getCustomElementLabel = (pceId: string): string | null => { /* lookup Fabric text by data.pceId tag */ };
}
```

```typescript
// dragType enum extension in selectTool.ts:
type DragType =
  | ...existing...
  | "product-resize"         // EXISTING: corner handle (sizeScale)
  | "product-resize-edge"    // NEW: edge handle (widthFtOverride | depthFtOverride)
  | "wall-endpoint";         // EXISTING: extended with smart-snap
```

```typescript
// dragPre state extensions:
dragPre = {
  kind: "product-resize-edge",
  placedId: string,
  edge: "n"|"s"|"e"|"w",
  pp: PlacedProduct | PlacedCustomElement,        // snapshot at drag start
  originalOverrides: { widthFtOverride?: number; depthFtOverride?: number },
} | {
  kind: "wall-endpoint",
  wallId: string,
  which: "start" | "end",
  origWall: WallSegment,
  cachedEndpointScene: SceneGeometry,             // NEW: built at mousedown
};
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Migrate effectiveDimensions consumers to resolveEffectiveDims + wire fabricSync label override</name>
  <files>src/three/ProductMesh.tsx, src/canvas/fabricSync.ts, src/canvas/snapEngine.ts, src/canvas/tools/selectTool.ts</files>
  <read_first>
    - src/three/ProductMesh.tsx L13 (current effectiveDimensions call)
    - src/canvas/fabricSync.ts L75-96 (custom element label render — L85 site), L805-815 (product render, L811 effectiveDimensions call)
    - src/canvas/snapEngine.ts L180-190 (buildSceneGeometry effectiveDimensions call at L186)
    - src/canvas/tools/selectTool.ts lines referenced in 31-RESEARCH §Pattern 3 consumer table (82, 291, 588, 855)
    - src/types/product.ts (resolveEffectiveDims + resolveEffectiveCustomDims from Plan 31-02)
    - .planning/phases/31-drag-resize-label-override/31-RESEARCH.md §Pattern 3 table of consumers
    - .planning/phases/31-drag-resize-label-override/31-CONTEXT.md §D-14
  </read_first>
  <behavior>
    Migrate every call site that has a PlacedProduct or PlacedCustomElement in scope from `effectiveDimensions(product, placed.sizeScale ?? 1)` to `resolveEffectiveDims(product, placed)`. Rationale: overrides must be authoritative everywhere the bbox is consumed — 3D mesh, 2D render, snap scene, hit-test, size tag, resize math.

    Consumer migration table (from RESEARCH):

    | File | Change |
    |------|--------|
    | src/three/ProductMesh.tsx L13 | `effectiveDimensions(product, placed.sizeScale)` → `resolveEffectiveDims(product, placed)` |
    | src/canvas/fabricSync.ts L811 (product render) | `effectiveDimensions(product, pp.sizeScale)` → `resolveEffectiveDims(product, pp)` |
    | src/canvas/fabricSync.ts L75-100 (custom element render) | current inline `el.width * sc` / `el.depth * sc` → `resolveEffectiveCustomDims(el, pce)` |
    | src/canvas/fabricSync.ts L85 (custom element label) | `new fabric.FabricText(el.name.toUpperCase(), ...)` → use labelOverride lookup (see below) |
    | src/canvas/snapEngine.ts L186 | `effectiveDimensions(prod, pp.sizeScale ?? 1)` → `resolveEffectiveDims(prod, pp)` |
    | src/canvas/tools/selectTool.ts L82 | Same — hit-test bbox |
    | src/canvas/tools/selectTool.ts L291 | Same — drag bbox |
    | src/canvas/tools/selectTool.ts L588 | Same — resize initial dims |
    | src/canvas/tools/selectTool.ts L855 | Same — size tag render |

    Label override at fabricSync.ts ~L85 (D-14):
    ```typescript
    // BEFORE:
    const label = new fabric.FabricText(el.name.toUpperCase(), { ... });
    // AFTER:
    const displayName = (p.labelOverride && p.labelOverride.trim() !== "")
      ? p.labelOverride
      : el.name;
    const label = new fabric.FabricText(displayName.toUpperCase(), { ... });
    // Tag for test lookup:
    (label as any).data = { ...(label as any).data, type: "custom-element-label", pceId: p.id };
    ```

    Install `window.__getCustomElementLabel` test bridge in fabricSync.ts at module level (or inside the main render function — gate by `import.meta.env.MODE === "test"`):
    ```typescript
    if (import.meta.env.MODE === "test" && typeof window !== "undefined") {
      (window as any).__getCustomElementLabel = (pceId: string): string | null => {
        const fc = (window as any).__fc;  // or read from a cached ref; use existing test hook if present
        if (!fc) return null;
        const obj = fc.getObjects().find((o: any) => o.data?.type === "custom-element-label" && o.data?.pceId === pceId);
        return obj ? (obj.text ?? null) : null;
      };
    }
    ```
    If fabricSync.ts doesn't already cache the fc instance, expose it via `window.__fc = fc` inside FabricCanvas.tsx's useEffect (gated by test mode) — Phase 30 likely already did this; verify by grep before adding.

    Do NOT modify `effectiveDimensions` in product.ts (anti-pattern guard from Plan 31-02).
  </behavior>
  <action>
    For each consumer in the migration table:
    1. Read the file, locate the exact line with `effectiveDimensions(` or the inline `el.width * sc` pattern.
    2. Replace per the behavior table above. If the PlacedProduct variable is named differently (`pp`, `placed`, `p`), use whatever's in scope — pass the whole placed object.
    3. For snapEngine.ts L186: `buildSceneGeometry` already has `pp` in scope (grep to confirm) — pass it directly.
    4. Leave `effectiveDimensions` usages in files where NO PlacedProduct is in scope (e.g., `productTool.ts` placement preview may only have the catalog Product). Do NOT force-migrate those — it's correct for preview to use sizeScale=1 default.

    fabricSync.ts label override:
    1. Grep for `el.name.toUpperCase()` to locate the exact line.
    2. Wrap with the `displayName` ternary shown above.
    3. Tag the Fabric text with `data.type = "custom-element-label"` and `data.pceId = p.id` for the test bridge.

    Test bridge `__getCustomElementLabel`:
    1. Grep `src/canvas/FabricCanvas.tsx` for existing `window.__fc` or `(window as any).__fc` — if present, reuse. If not, add inside the fabric canvas creation useEffect:
       ```typescript
       if (import.meta.env.MODE === "test" && typeof window !== "undefined") {
         (window as any).__fc = fc;
       }
       ```
    2. Add `__getCustomElementLabel` to fabricSync.ts (or FabricCanvas.tsx — wherever has cleanest access to fc) gated by test mode.

    Run relevant vitest runs to confirm migration doesn't regress:
    - `npx vitest run tests/fabricSync.test.ts tests/snapEngine.test.ts tests/snapIntegration.test.tsx`
  </action>
  <verify>
    <automated>npx vitest run tests/fabricSync.test.ts tests/snapEngine.test.ts tests/snapIntegration.test.tsx tests/resizeHandles.test.ts tests/resolveEffectiveDims.test.ts 2>&1 | tee /tmp/p31-t3-1.log; grep -q "failed" /tmp/p31-t3-1.log && exit 1 || exit 0</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "resolveEffectiveDims\|resolveEffectiveCustomDims" src/canvas/fabricSync.ts src/canvas/snapEngine.ts src/three/ProductMesh.tsx src/canvas/tools/selectTool.ts` returns ≥7 (covers the 7 enumerated consumer sites)
    - `grep -q "p.labelOverride\|pce.labelOverride\|placed.labelOverride" src/canvas/fabricSync.ts` succeeds (override lookup at label render)
    - `grep -q "data.*custom-element-label" src/canvas/fabricSync.ts` succeeds (Fabric text tag for test bridge)
    - `grep -q "__getCustomElementLabel" src/canvas/fabricSync.ts` OR `grep -q "__getCustomElementLabel" src/canvas/FabricCanvas.tsx` succeeds
    - `grep -q "import.meta.env.MODE === \"test\"" src/canvas/fabricSync.ts` OR the FabricCanvas.tsx counterpart returns a match
    - Existing `effectiveDimensions` export in `src/types/product.ts` still exists (anti-pattern guard)
    - Existing Phase 30 tests (snapEngine, snapGuides, snapIntegration) remain green
    - `npx tsc --noEmit` exits ZERO
  </acceptance_criteria>
  <done>All enumerated consumer sites go through resolveEffectiveDims / resolveEffectiveCustomDims. fabricSync custom-element label reads labelOverride first, catalog name second, uppercase. Test bridge __getCustomElementLabel exposes the rendered text by pceId. No Phase 30 regression.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: selectTool — product-resize-edge dragType + wall-endpoint smart-snap + test drivers</name>
  <files>src/canvas/tools/selectTool.ts</files>
  <read_first>
    - src/canvas/tools/selectTool.ts (FULL file — especially L560-905 dragType dispatch; L560-716 existing product-resize; L740-789 existing wall-endpoint; L875 is the smart-snap integration site)
    - src/canvas/resizeHandles.ts (hitTestAnyResizeHandle, edgeDragToAxisValue, getEdgeHandles from Plan 31-02)
    - src/canvas/wallEndpointSnap.ts (buildWallEndpointSnapScene)
    - src/canvas/snapEngine.ts (computeSnap, SNAP_TOLERANCE_PX, SceneGeometry)
    - src/canvas/snapGuides.ts (renderSnapGuides, clearSnapGuides)
    - src/lib/geometry.ts (snapPoint)
    - tests/phase31Resize.test.tsx, tests/phase31WallEndpoint.test.tsx, tests/phase31Undo.test.tsx (red specs — authoritative)
    - .planning/phases/31-drag-resize-label-override/31-RESEARCH.md §Pattern 2 §Pattern 4 §Pattern 6
    - .planning/phases/31-drag-resize-label-override/31-CONTEXT.md §D-03 §D-05 §D-06 §D-07 §D-08 §D-16 §D-17
    - CLAUDE.md §Tool cleanup pattern
  </read_first>
  <behavior>
    Three interlocking changes to selectTool.ts:

    (A) New dragType `"product-resize-edge"`:
    - At mousedown, AFTER existing corner hit-test fails, try `hitTestAnyResizeHandle(pointerFt, pp, width, depth)`. If result is `{ kind: "edge", which }`, set dragType = "product-resize-edge", snapshot originalOverrides, call `resizeProductAxis(id, axis, initialValue)` (or `resizeCustomElementAxis` if the selected placed object is a PlacedCustomElement) with initial valueFt computed from edgeDragToAxisValue — this pushes exactly ONE history entry.
    - On mousemove: compute `edgeDragToAxisValue(edge, pointerFt, pp)`, grid-snap valueFt via `snapPoint({ x: valueFt, y: 0 }, uiStore.gridSnap).x` (or a scalar snap helper), call `resizeProductAxisNoHistory(id, axis, snappedValue)` / `resizeCustomElementAxisNoHistory` accordingly. Set `_dragActive = true` so the Phase 25 fast-path engages.
    - On mouseup: no additional store write. Clear drag state. `_dragActive = false`.

    (B) Wall-endpoint branch smart-snap wiring (extend existing L740-789 + L875 area):
    - At mousedown for wall-endpoint drag (after existing `updateWall(id, {})` history push), additionally build `cachedEndpointScene = buildWallEndpointSnapScene(walls, wallId)` and store on dragPre.
    - On mousemove: implement the pseudocode from RESEARCH §Pattern 4:
      1. Raw candidate = feet pointer
      2. If Shift → lock to ortho axis (compare dx vs dy to opposite endpoint; lock the smaller)
      3. If NOT Alt → call `computeSnap({ candidate: { pos: candidate, bbox: degenerateBBox }, scene: cachedEndpointScene, tolerancePx: SNAP_TOLERANCE_PX, scale, gridSnap })` → apply snapped point + guides
      4. If Shift + snap → re-apply ortho constraint to snapped point (Pitfall 3 — post-snap re-override)
      5. If Alt AND gridSnap > 0 → `snapped = snapPoint(candidate, gridSnap)`
      6. `renderSnapGuides(fc, guides, scale, origin)`
      7. `updateWallNoHistory(wallId, { start: newStart, end: newEnd })`
    - On mouseup: `clearSnapGuides(fc)`, null the cached scene, no additional history push (the mousedown empty `updateWall(id, {})` already pushed).
    - On tool deactivate (cleanup closure): also `clearSnapGuides(fc)` defensively.

    (C) Test drivers under `import.meta.env.MODE === "test"`:
    - `window.__driveResize`: start(placedId, handle) simulates mousedown at the exact handle world position (compute via getEdgeHandles or existing getResizeHandles); `.to(x, y, opts)` simulates mousemove with optional shiftKey/altKey; `.end()` simulates mouseup.
    - `window.__driveWallEndpoint`: start(wallId, which), .to, .end, .getGuides — the last returns `fc.getObjects().filter(o => o.data?.type === "snap-guide").map(o => ({ type: "snap-guide" }))`.

    Edge handle rendering: add 4 small squares at N/S/E/W midpoints to the existing handle render pass, using the same fill/stroke/radius as corner handles (Claude's Discretion per CONTEXT §D). Render only on single selection (no bulk). Tag with `data.type === "resize-handle-edge"`.

    Cleanup closure: the existing `activate(fc, scale, origin)` function returns a cleanup; extend it to call `clearSnapGuides(fc)` and null any cached scene refs. Also drop the `window.__driveResize` / `window.__driveWallEndpoint` assignments on cleanup if previously set (prevent cross-test bleed).
  </behavior>
  <action>
    Working in src/canvas/tools/selectTool.ts:

    1. **Imports**: add
       ```typescript
       import { hitTestAnyResizeHandle, edgeDragToAxisValue, getEdgeHandles, EDGE_HANDLE_HIT_RADIUS_FT } from "@/canvas/resizeHandles";
       import { buildWallEndpointSnapScene } from "@/canvas/wallEndpointSnap";
       import { computeSnap, SNAP_TOLERANCE_PX, type SceneGeometry } from "@/canvas/snapEngine";
       import { renderSnapGuides, clearSnapGuides } from "@/canvas/snapGuides";
       ```

    2. **Extend DragType** to include `"product-resize-edge"`.

    3. **Mousedown branch** (inside the existing product-resize hit-test area): after corner check fails for a selected product/custom-element, call `hitTestAnyResizeHandle`. If edge hit:
       ```typescript
       const initial = edgeDragToAxisValue(edge.which, pointerFt, pp);
       const isPlacedCustom = /* detect via selection kind */;
       if (isPlacedCustom) {
         useCADStore.getState().resizeCustomElementAxis(pp.id, initial.axis, initial.valueFt);
       } else {
         useCADStore.getState().resizeProductAxis(pp.id, initial.axis, initial.valueFt);
       }
       dragType = "product-resize-edge";
       dragPre = { kind: "product-resize-edge", placedId: pp.id, edge: edge.which, pp: { ...pp }, isPlacedCustom, originalOverrides: { widthFtOverride: pp.widthFtOverride, depthFtOverride: pp.depthFtOverride } };
       _dragActive = true;
       ```

    4. **Mousemove branch** for "product-resize-edge":
       ```typescript
       if (dragType === "product-resize-edge" && dragPre?.kind === "product-resize-edge") {
         const result = edgeDragToAxisValue(dragPre.edge, pointerFt, dragPre.pp);
         const gridSnap = useUIStore.getState().gridSnap;
         const snappedValue = gridSnap > 0 ? Math.max(0.25, Math.round(result.valueFt / gridSnap) * gridSnap) : result.valueFt;
         if (dragPre.isPlacedCustom) {
           useCADStore.getState().resizeCustomElementAxisNoHistory(dragPre.placedId, result.axis, snappedValue);
         } else {
           useCADStore.getState().resizeProductAxisNoHistory(dragPre.placedId, result.axis, snappedValue);
         }
         fc.requestRenderAll();
         return;
       }
       ```

    5. **Mouseup for "product-resize-edge"**: no store write, reset drag state, `_dragActive = false`.

    6. **Wall-endpoint mousedown extension**: in the existing branch that handles wall endpoint drag (where the current `updateWall(wallId, {})` empty history push lives), add:
       ```typescript
       const walls = useCADStore.getState().rooms[activeRoomId]?.walls ?? {};
       cachedEndpointScene = buildWallEndpointSnapScene(walls, wallId);
       ```
       Store `cachedEndpointScene` in `dragPre`.

    7. **Wall-endpoint mousemove** — REPLACE/WRAP the existing snap-less logic at ~L875. Use the pseudocode from RESEARCH §Pattern 4. Key code:
       ```typescript
       if (dragType === "wall-endpoint") {
         if (!wallEndpointWhich || dragPre?.kind !== "wall-endpoint") return;
         const gridSnap = useUIStore.getState().gridSnap;
         const shiftHeld = (opt.e as MouseEvent)?.shiftKey === true;
         const altHeld = (opt.e as MouseEvent)?.altKey === true;

         const anchor = wallEndpointWhich === "start" ? dragPre.origWall.end : dragPre.origWall.start;
         let candidate = { ...feet };

         // Shift ortho lock (D-06)
         if (shiftHeld) {
           const dx = Math.abs(feet.x - anchor.x);
           const dy = Math.abs(feet.y - anchor.y);
           if (dx > dy) candidate.y = anchor.y;
           else candidate.x = anchor.x;
         }

         let snapped = candidate;
         let guides: any[] = [];
         if (!altHeld && dragPre.cachedEndpointScene) {
           const degenerateBBox = {
             id: "wall-endpoint-candidate",
             minX: candidate.x, maxX: candidate.x,
             minY: candidate.y, maxY: candidate.y,
           };
           const r = computeSnap({
             candidate: { pos: candidate, bbox: degenerateBBox },
             scene: dragPre.cachedEndpointScene,
             tolerancePx: SNAP_TOLERANCE_PX,
             scale,
             gridSnap,
           });
           snapped = r.snapped;
           guides = r.guides;
           // Pitfall 3: re-apply shift lock post-snap
           if (shiftHeld) {
             const dx = Math.abs(feet.x - anchor.x);
             const dy = Math.abs(feet.y - anchor.y);
             if (dx > dy) snapped.y = anchor.y;
             else snapped.x = anchor.x;
           }
         } else if (altHeld && gridSnap > 0) {
           snapped = snapPoint(candidate, gridSnap);
         }

         renderSnapGuides(fc, guides, scale, origin);

         const newStart = wallEndpointWhich === "start" ? snapped : dragPre.origWall.start;
         const newEnd = wallEndpointWhich === "end" ? snapped : dragPre.origWall.end;
         useCADStore.getState().updateWallNoHistory(wallId, { start: newStart, end: newEnd });
         fc.requestRenderAll();
         return;
       }
       ```

    8. **Wall-endpoint mouseup**: after existing cleanup, add `clearSnapGuides(fc)` and null `dragPre.cachedEndpointScene`.

    9. **Cleanup closure** (the `return () => { ... }` at end of activate): add
       ```typescript
       clearSnapGuides(fc);
       if (import.meta.env.MODE === "test" && typeof window !== "undefined") {
         delete (window as any).__driveResize;
         delete (window as any).__driveWallEndpoint;
       }
       ```

    10. **Edge handle visual render**: locate the existing corner-handle render code (grep for `getResizeHandles(` and `fabric.Rect` inside selectTool or its render sibling). For a single-selected product, ALSO call `getEdgeHandles(pp, width, depth)` and render 4 Fabric rects using the same fill/stroke/size as corner handles. Tag each with `data.type = "resize-handle-edge"` and `data.edge = "n"|"s"|"e"|"w"`.

    11. **Test drivers** (install near end of activate, gated by test mode):
        ```typescript
        if (import.meta.env.MODE === "test" && typeof window !== "undefined") {
          (window as any).__driveResize = {
            start: (placedId: string, handle: string) => {
              // Find the placed object (product or custom element), compute the handle's world point, synthesize a mousedown.
              // Set dragType, dragPre, call resizeProductAxis/resizeCustomElementAxis with initialValue as appropriate.
            },
            to: (x: number, y: number, opts: { shift?: boolean; alt?: boolean } = {}) => {
              // Call the mousemove branch directly with feet={x,y} and synthetic MouseEvent {shiftKey, altKey}.
            },
            end: () => {
              // Call the mouseup branch directly (reset dragType, clear dragPre, _dragActive = false).
            },
          };
          (window as any).__driveWallEndpoint = {
            start: (wallId: string, which: "start"|"end") => { /* symmetric to above — push empty updateWall, cache scene */ },
            to: (x: number, y: number, opts = {}) => { /* invoke the wall-endpoint mousemove with feet + synthetic event */ },
            end: () => { /* invoke mouseup: clearSnapGuides + reset */ },
            getGuides: () => fc.getObjects().filter((o: any) => o.data?.type === "snap-guide").map((o: any) => ({ type: "snap-guide" })),
          };
        }
        ```
        These drivers should reuse the internal event-handler functions — extract the body of the mousedown/mousemove/mouseup into named local helpers if needed to avoid duplication.

    12. Run the red integration tests:
        `npx vitest run tests/phase31Resize.test.tsx tests/phase31WallEndpoint.test.tsx` — they should turn green.
        `tests/phase31Undo.test.tsx` requires Task 3 for label-override coverage; corner/edge/wall-endpoint undo scenarios inside it should now pass, but the label-override case still red.

    13. Run full regression: `npx vitest run tests/` — no pre-existing test regresses.
  </action>
  <verify>
    <automated>npx vitest run tests/phase31Resize.test.tsx tests/phase31WallEndpoint.test.tsx tests/snapIntegration.test.tsx tests/dragIntegration.test.ts 2>&1 | tee /tmp/p31-t3-2.log; grep -q "failed" /tmp/p31-t3-2.log && exit 1 || exit 0</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "product-resize-edge" src/canvas/tools/selectTool.ts` succeeds (new dragType)
    - `grep -q "hitTestAnyResizeHandle" src/canvas/tools/selectTool.ts` succeeds
    - `grep -q "buildWallEndpointSnapScene" src/canvas/tools/selectTool.ts` succeeds
    - `grep -q "computeSnap" src/canvas/tools/selectTool.ts` succeeds (wall-endpoint smart-snap)
    - `grep -q "renderSnapGuides" src/canvas/tools/selectTool.ts` succeeds
    - `grep -q "__driveResize" src/canvas/tools/selectTool.ts` succeeds
    - `grep -q "__driveWallEndpoint" src/canvas/tools/selectTool.ts` succeeds
    - `grep -q "shiftKey" src/canvas/tools/selectTool.ts` AND `grep -q "altKey" src/canvas/tools/selectTool.ts` both succeed (modifier handling)
    - `grep -q "resizeProductAxisNoHistory\|resizeCustomElementAxisNoHistory" src/canvas/tools/selectTool.ts` succeeds (mid-drag uses NoHistory)
    - `grep -q "clearSnapGuides" src/canvas/tools/selectTool.ts` succeeds (drag-end + cleanup)
    - `grep -q "resize-handle-edge" src/canvas/tools/selectTool.ts` succeeds (tagged edge handles rendered)
    - `npx vitest run tests/phase31Resize.test.tsx` exits ZERO (green)
    - `npx vitest run tests/phase31WallEndpoint.test.tsx` exits ZERO (green)
    - Phase 30 suite still green: `npx vitest run tests/snapIntegration.test.tsx tests/snapEngine.test.ts tests/snapGuides.test.ts` exits ZERO
    - Phase 25 drag integration still green: `npx vitest run tests/dragIntegration.test.ts` exits ZERO
    - `npx tsc --noEmit` exits ZERO
  </acceptance_criteria>
  <done>selectTool has a new product-resize-edge drag branch (grid-snapped per-axis override, NoHistory mid-drag), wall-endpoint drag invokes smart-snap with restricted scene + Shift-ortho + Alt-disable, 4 edge handles render on single selection, test drivers (__driveResize, __driveWallEndpoint) are installed under test mode. Phase 31 Resize + WallEndpoint integration tests green; corner + edge + wall-endpoint sections of the single-undo test green. Phase 30/25 regression suites remain green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: PropertiesPanel — label-override input + RESET SIZE + test driver</name>
  <files>src/components/PropertiesPanel.tsx</files>
  <read_first>
    - src/components/PropertiesPanel.tsx FULL file (current structure, existing EditableRow L232-308 — mirror this pattern)
    - src/stores/cadStore.ts (updatePlacedCustomElement / NoHistory, clearProductOverrides, clearCustomElementOverrides from Plan 31-02)
    - src/stores/uiStore.ts (selectedIds — to find the selected PlacedCustomElement)
    - tests/phase31LabelOverride.test.tsx (red spec — authoritative)
    - tests/phase31Undo.test.tsx (label-override single-undo assertions — must also turn green)
    - tests/dimensionEditor.test.ts + src/canvas/dimensionOverlay.tsx if exists (Phase 29 commit-on-Enter/blur + Escape-cancel precedent)
    - .planning/phases/31-drag-resize-label-override/31-CONTEXT.md §D-09 §D-10 §D-11 §D-12 §D-13
    - .planning/phases/31-drag-resize-label-override/31-RESEARCH.md §Pattern 5 §Pitfall 6 §Open Question 1 (verify custom-element branch — may need new selector)
  </read_first>
  <behavior>
    Three additions to PropertiesPanel:

    (A) If not already present, add a custom-element-selection branch. Research Open Question 1 warns PropertiesPanel may not currently render anything for PlacedCustomElement. Verification step:
    - Grep current file for `placedCustomElement` / `PlacedCustomElement` / `customElements`. If zero matches, add a new selector:
      ```typescript
      const pce = useCADStore((s) => {
        const roomId = s.activeRoomId;
        const id = useUIStore.getState().selectedIds[0];
        if (!roomId || !id) return undefined;
        return s.rooms[roomId]?.placedCustomElements?.[id];
      });
      const customCatalog = useCADStore((s) => s.customElements);
      const ce = pce ? customCatalog?.[pce.customElementId] : undefined;
      ```
    - Guard the return-null at top of render: change `if (!wall && !pp && !ceiling) return null;` to `if (!wall && !pp && !ceiling && !pce) return null;`.

    (B) LabelOverrideInput block (rendered when `pce && ce`):
    - Input with `placeholder={ce.name.toUpperCase()}` (D-11 uppercase ghost)
    - `maxLength={40}` (D-12)
    - Controlled input: `value={draft}` with draft seeded from `pce.labelOverride ?? ""` on mount.
    - Track `originalValue = pce.labelOverride` at edit-session start for Escape revert.
    - onChange(v) → setDraft(v); call `updatePlacedCustomElementNoHistory(pce.id, { labelOverride: v })` for live preview (D-09, no debounce).
    - onKeyDown Enter → commit: final value = draft.trim() === "" ? undefined : draft.slice(0, 40); call `updatePlacedCustomElement(pce.id, { labelOverride: finalValue })`; blur the input.
    - onBlur → same commit logic as Enter (D-10).
    - onKeyDown Escape → call `updatePlacedCustomElementNoHistory(pce.id, { labelOverride: originalValue })` to rewind live-preview; reset draft to originalValue; blur.

    Pitfall 6 (input losing focus on redraw): use React controlled-input pattern (autoFocus only when first clicked; don't autoFocus by default). Phase 29 dimension editor likely handled this — mirror it.

    (C) RESET SIZE affordance (per Claude's Discretion + Open Question 3):
    - Show a small button next to the size fields when `pp?.widthFtOverride !== undefined || pp?.depthFtOverride !== undefined` (or same condition for pce).
    - Label: `RESET_SIZE` (uppercase mono per convention).
    - onClick → `clearProductOverrides(pp.id)` or `clearCustomElementOverrides(pce.id)`.

    (D) Test driver `window.__driveLabelOverride` (gated by test mode):
    ```typescript
    useEffect(() => {
      if (import.meta.env.MODE !== "test" || !pce) return;
      (window as any).__driveLabelOverride = {
        typeAndCommit: (pceId: string, text: string, mode: "enter"|"blur") => {
          // Read original value from store
          const original = useCADStore.getState().rooms[useCADStore.getState().activeRoomId!]?.placedCustomElements?.[pceId]?.labelOverride;
          // Simulate typing via NoHistory (one char at a time to match real UX)
          for (let i = 1; i <= text.length; i++) {
            useCADStore.getState().updatePlacedCustomElementNoHistory(pceId, { labelOverride: text.slice(0, i) });
          }
          // Commit: one history entry via updatePlacedCustomElement
          const finalValue = text.trim() === "" ? undefined : text.slice(0, 40);
          useCADStore.getState().updatePlacedCustomElement(pceId, { labelOverride: finalValue });
          // mode is observational — behavior is identical for enter/blur per D-10
          void mode;
          void original;
        },
      };
      return () => { delete (window as any).__driveLabelOverride; };
    }, [pce?.id]);
    ```
    This bypasses the DOM input but exercises the same store-action sequence. The RTL tests that type via userEvent and commit via Enter/blur exercise the DOM path; this driver is for programmatic flows (e.g., phase31Undo.test.tsx).

    Styling: use existing PropertiesPanel section styles. Label: `<label>LABEL_OVERRIDE</label>`. Wrap in the same panel-section div used by other property editors.
  </behavior>
  <action>
    1. Grep `src/components/PropertiesPanel.tsx` for `placedCustomElement` / `PlacedCustomElement`. Record whether any custom-element branch exists.

    2. If no custom-element branch exists, add selectors per behavior (A) and extend the early-return guard.

    3. Add a React component inside the file (or inline JSX) for the label override:
       ```tsx
       function LabelOverrideInput({ pce, catalogName }: { pce: PlacedCustomElement; catalogName: string }) {
         const updatePlacedCustomElement = useCADStore((s) => s.updatePlacedCustomElement);
         const updatePlacedCustomElementNoHistory = useCADStore((s) => s.updatePlacedCustomElementNoHistory);
         const [draft, setDraft] = useState<string>(pce.labelOverride ?? "");
         const originalRef = useRef<string | undefined>(pce.labelOverride);

         useEffect(() => {
           setDraft(pce.labelOverride ?? "");
           originalRef.current = pce.labelOverride;
         }, [pce.id]);

         const commit = () => {
           const finalValue = draft.trim() === "" ? undefined : draft.slice(0, 40);
           updatePlacedCustomElement(pce.id, { labelOverride: finalValue });
           originalRef.current = finalValue;
         };

         const cancel = () => {
           updatePlacedCustomElementNoHistory(pce.id, { labelOverride: originalRef.current });
           setDraft(originalRef.current ?? "");
         };

         return (
           <div className="flex flex-col gap-1">
             <label className="text-text-ghost font-mono text-xs tracking-wider">LABEL_OVERRIDE</label>
             <input
               type="text"
               value={draft}
               maxLength={40}
               placeholder={catalogName.toUpperCase()}
               onChange={(e) => {
                 const v = e.target.value;
                 setDraft(v);
                 updatePlacedCustomElementNoHistory(pce.id, { labelOverride: v });
               }}
               onKeyDown={(e) => {
                 if (e.key === "Enter") { commit(); (e.target as HTMLInputElement).blur(); }
                 else if (e.key === "Escape") { cancel(); (e.target as HTMLInputElement).blur(); }
               }}
               onBlur={commit}
               className="bg-obsidian-high border border-outline-variant/20 text-text-primary font-mono text-xs px-2 py-1"
               aria-label="Label override"
             />
           </div>
         );
       }
       ```

    4. Render `<LabelOverrideInput pce={pce} catalogName={ce.name} />` in the custom-element branch of the panel.

    5. Add the RESET SIZE button (conditional on overrides being set):
       ```tsx
       {(pce.widthFtOverride !== undefined || pce.depthFtOverride !== undefined) && (
         <button
           type="button"
           onClick={() => clearCustomElementOverrides(pce.id)}
           className="font-mono text-xs text-accent hover:text-accent-light"
         >RESET_SIZE</button>
       )}
       ```
       Do the symmetric version in the PlacedProduct branch for `pp.widthFtOverride / depthFtOverride` → `clearProductOverrides`.

    6. Install `window.__driveLabelOverride` driver per behavior (D) above.

    7. Run the red RTL tests:
       `npx vitest run tests/phase31LabelOverride.test.tsx` — green.
       `npx vitest run tests/phase31Undo.test.tsx` — fully green now (all 6+ assertions).

    8. Full regression:
       `npx vitest run tests/PropertiesPanel.length.test.tsx tests/phase31LabelOverride.test.tsx tests/phase31Undo.test.tsx tests/`
  </action>
  <verify>
    <automated>npx vitest run tests/phase31LabelOverride.test.tsx tests/phase31Undo.test.tsx tests/PropertiesPanel.length.test.tsx 2>&1 | tee /tmp/p31-t3-3.log; grep -q "failed" /tmp/p31-t3-3.log && exit 1 || exit 0</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "labelOverride" src/components/PropertiesPanel.tsx` succeeds
    - `grep -q "maxLength={40}\|maxLength: 40" src/components/PropertiesPanel.tsx` succeeds (D-12 enforced)
    - `grep -q "LABEL_OVERRIDE" src/components/PropertiesPanel.tsx` succeeds (uppercase mono label)
    - `grep -q "updatePlacedCustomElementNoHistory" src/components/PropertiesPanel.tsx` succeeds (live preview)
    - `grep -q "updatePlacedCustomElement(" src/components/PropertiesPanel.tsx` succeeds (commit)
    - `grep -q 'e.key === "Escape"' src/components/PropertiesPanel.tsx` succeeds (cancel path)
    - `grep -q "onBlur" src/components/PropertiesPanel.tsx` succeeds (blur commit)
    - `grep -q "RESET_SIZE" src/components/PropertiesPanel.tsx` succeeds (reset affordance)
    - `grep -q "clearCustomElementOverrides\|clearProductOverrides" src/components/PropertiesPanel.tsx` succeeds
    - `grep -q "__driveLabelOverride" src/components/PropertiesPanel.tsx` succeeds
    - `npx vitest run tests/phase31LabelOverride.test.tsx` exits ZERO (green)
    - `npx vitest run tests/phase31Undo.test.tsx` exits ZERO (green — ALL single-undo scenarios including label-override)
    - `tests/PropertiesPanel.length.test.tsx` still passes (Phase 29 regression)
    - `npx tsc --noEmit` exits ZERO
  </acceptance_criteria>
  <done>PropertiesPanel renders label-override input for selected PlacedCustomElement with uppercase-catalog-name ghost text, 40-char max, live preview via NoHistory, commit-on-Enter/blur with one history entry, Escape rewinds. RESET_SIZE button appears when any axis override is set. __driveLabelOverride test driver installed. All 4 red Phase 31 integration test files (Resize, WallEndpoint, LabelOverride, Undo) now GREEN.</done>
</task>

</tasks>

<verification>
- All 8 Phase 31 test files GREEN (the 4 Wave 0 unit tests from Plan 31-02 plus the 4 integration/RTL tests from this plan)
- Phase 30 suite still green (no regression in snap engine, guides, or snapIntegration)
- Phase 29 suite still green (dimensionEditor, PropertiesPanel.length)
- Phase 25 drag integration still green
- Phase 28 autosave tests still green
- `npx tsc --noEmit` clean
- `npm test -- --run` total pass count matches Plan 31-02 + ~Phase-31-integration-count (no new failures)
- `git diff --stat` confined to the 5 files in `files_modified`
- No direct mutations of `effectiveDimensions` (anti-pattern guard)
- No direct mutations of `updateCustomElement` (Pitfall 4 guard)
</verification>

<success_criteria>
- Corner drag → sizeScale changed, overrides undefined (EDIT-22 corner path)
- Edge drag → widthFtOverride OR depthFtOverride set to grid-snapped value, sizeScale unchanged (EDIT-22 edge path)
- Wall-endpoint drag near another endpoint/midpoint snaps within SNAP_TOLERANCE_PX=8 (EDIT-23, D-05)
- Shift locks ortho even with snap engaged (EDIT-23, D-06)
- Alt disables snap, keeps grid-snap (EDIT-23, D-07)
- Walls don't snap to product bboxes (EDIT-23 negative, D-05)
- Every drag: past.length delta === 1 (EDIT-24, D-16)
- Mid-drag uses NoHistory variants; _dragActive fast-path preserved (EDIT-24 PERF-01)
- Custom-element selection shows label-override input (CUSTOM-06)
- Live preview on keystroke, no debounce (CUSTOM-06, D-09)
- Enter OR blur commits one history entry (CUSTOM-06, D-10)
- Escape rewinds live-preview (CUSTOM-06 Open Q2 resolution)
- Empty string reverts to catalog name (CUSTOM-06, D-11)
- fabricSync renders override uppercase (CUSTOM-06, D-14)
- Override persists through save/load round-trip (D-13)
</success_criteria>

<output>
After completion, create `.planning/phases/31-drag-resize-label-override/31-03-SUMMARY.md` documenting:
- 5 files modified with line-count deltas
- Full list of red→green test flips (should be all 8 Phase 31 files green)
- Confirmation every requirement (EDIT-22/23/24/CUSTOM-06) has passing assertions
- The 7 consumer sites migrated to resolveEffectiveDims with file:line references
- Driver bridges installed with their exact window.__* names
- Confirmation that effectiveDimensions (product.ts) and updateCustomElement (cadStore.ts) were NOT touched
- Total vitest pass count before + after
</output>
