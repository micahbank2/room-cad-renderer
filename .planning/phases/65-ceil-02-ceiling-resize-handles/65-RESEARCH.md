# Phase 65: Ceiling Resize Handles (CEIL-02) — Research

**Researched:** 2026-05-04
**Domain:** 2D CAD edge-handle drag + polygon resize + Phase 30 snap integration
**Confidence:** HIGH

## Summary

All 7 open questions resolved. The Phase 31 product edge-handle pattern in `selectTool.ts` is a near-perfect template — extend it with a `data.ceilingId` discriminator, a new `dragType === "ceiling-resize-edge"` branch, and a `cachedCeilingScene` (mirrors `cachedEndpointScene`). `polygonBbox` does not exist; add to `geometry.ts`. Snap guides render automatically once the calling tool calls `renderSnapGuides()` post-`computeSnap()` — no engine changes. The 3D `ShapeGeometry` re-extrudes via `useMemo([ceiling.points])`; we accept the perf hit (small polygons, well under GPU budget). `widthFtOverride` semantics are locked to **target absolute bbox width in feet** (matches Phase 31 product).

**Primary recommendation:** Mirror Phase 31 `product-resize-edge` path almost verbatim. Add ~6 store actions, ~2 geometry helpers, ~1 fabric handle render block, ~1 selectTool drag branch. Estimated 6 tasks, ~13 files. No risk to Phase 30 snap engine, no schema migration.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01** Polygon support via proportional bbox scaling (all polygons, no rectangle special-casing)
- **D-02** 4 edge handles at bbox-edge midpoints (N/S/E/W). NO corner handles for v1.16
- **D-03** Storage: `widthFtOverride?` + `depthFtOverride?` on `Ceiling` type. `points` array is preserved as source-of-truth. New `resolveCeilingPoints(ceiling): Point[]` helper computes scaled points at render time
- **D-04** Snap behavior: Phase 30 consume-only. `snapEngine.ts` and `buildSceneGeometry.ts` untouched
- **D-05** Drag transaction: Phase 31 single-undo pattern (`updateCeiling(id, {})` at start, `updateCeilingNoHistory` mid-drag)
- **D-06** Reset action: Phase 53 right-click "Reset size" (when overrides set) + PropertiesPanel RESET_SIZE button
- **D-07** 3D rendering: `CeilingMesh.tsx` calls `resolveCeilingPoints(ceiling)` (one-line change)
- **D-08** PropertiesPanel: feet+inches WIDTH/DEPTH inputs writing to overrides + RESET_SIZE button
- **D-09** New cadStore actions: `resizeCeilingAxis`, `resizeCeilingAxisNoHistory`, `clearCeilingOverrides`
- **D-10** Test coverage: 6 unit + 2 component + 6 e2e
- **D-11** Atomic commits per task (mirror Phase 49–64)
- **D-12** Zero regressions in Phases 12, 18, 20, 30, 31, 32, 34, 42, 46, 47, 48, 53, 54, 55–62. NO snapshot version bump (additive optional fields are back-compat).

### Claude's Discretion
- Exact placement of `polygonBbox` helper (research recommends `geometry.ts` for genericity)
- Whether to extract a `selectTool` shared helper for `computeSnap` dispatch from drag (research: do NOT extract; reuse existing `cachedScene` + add a new `cachedCeilingScene` mirror — minimal diff)
- Test fixture polygon shapes (research recommends: rectangle for U1, L-shape for U2, hexagon for U3)

### Deferred Ideas (OUT OF SCOPE)
- Corner uniform-scale handles
- Per-vertex (polygon corner) drag
- Auto-rectangle-conversion option
- Snap to other ceilings
- Live width/depth label overlay during drag
- Body-drag movement (already exists for ceilings, untouched)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CEIL-02 | Edge-handle resize for ceilings using proportional bbox scaling, smart-snap on drag, single-undo transaction, RESET_SIZE affordance | Q1 confirms selectTool integration shape; Q2 locates `polygonBbox`; Q3 confirms snap dispatch pattern; Q4 confirms conditional context-menu pattern; Q5 confirms snap-guide auto-render; Q6 confirms 3D perf is acceptable; Q7 locks override semantics |
</phase_requirements>

## Q1 — selectTool edge-handle dispatch path (HIGH confidence)

**Verdict:** Mirror the existing `dragType === "product-resize-edge"` branch with a parallel `dragType === "ceiling-resize-edge"` branch. The hit-test stays cheap (one extra `if` block in `onMouseDown` after the wall-handle block).

**Trace of Phase 31 product path** (`src/canvas/tools/selectTool.ts`):

1. `onMouseDown` (line 600). When exactly one item is selected, the function tries (in order): rotation handle → product corner/edge resize → custom element resize → wall endpoint/thickness/rotate → opening handles → fall through to body-hit `hitTestStore`.
2. Edge-handle path for products (lines 647-664):
   ```ts
   if (handleHit?.kind === "edge") {
     const initial = edgeDragToAxisValue(handleHit.which, feet, pp);
     dragging = true; dragId = selId; dragType = "product-resize-edge";
     edgeDragInfo = { placedId: selId, edge: handleHit.which, isCustom: false, pp: { ...pp } };
     useCADStore.getState().resizeProductAxis(selId, initial.axis, initial.valueFt); // history snapshot
     return;
   }
   ```
3. Move handler (lines 948-981):
   ```ts
   if (dragType === "product-resize-edge") {
     const result = edgeDragToAxisValue(edgeDragInfo.edge, feet, edgeDragInfo.pp);
     const snappedValue = gridSnap > 0 ? Math.max(0.25, Math.round(result.valueFt / gridSnap) * gridSnap) : result.valueFt;
     useCADStore.getState().resizeProductAxisNoHistory(...);
     fc.requestRenderAll();
     return;
   }
   ```
4. Mouseup commits via the cleanup at line 1307 (clears live size tag).

**Recommended ceiling integration:**

- Add a sibling block in `onMouseDown` after the existing wall handle block (~line 793), guarded by `currentSelection.length === 1` and the selected ID being a ceiling:
  ```ts
  const ceiling = (getActiveRoomDoc()?.ceilings ?? {})[selId];
  if (ceiling) {
    const handleHit = hitTestCeilingEdgeHandle(feet, ceiling); // new helper
    if (handleHit) {
      dragging = true; dragId = selId; dragType = "ceiling-resize-edge";
      ceilingEdgeDragInfo = {
        ceilingId: selId,
        edge: handleHit, // "n"|"s"|"e"|"w"
        origPoints: [...ceiling.points], // freeze polygon at drag start
        origBbox: polygonBbox(ceiling.points),
      };
      const initialAxisValue = handleHit === "n" || handleHit === "s"
        ? ceilingEdgeDragInfo.origBbox.depth
        : ceilingEdgeDragInfo.origBbox.width;
      useCADStore.getState().resizeCeilingAxis(
        selId,
        handleHit === "n" || handleHit === "s" ? "depth" : "width",
        initialAxisValue,
      );
      // Phase 30 — cache restricted snap scene at drag start
      cachedCeilingScene = buildSceneGeometry(useCADStore.getState() as any, selId, _productLibrary, customCatalog);
      return;
    }
  }
  ```
- Add a sibling `if (dragType === "ceiling-resize-edge")` branch in `onMouseMove` (~line 982). It computes the new axis value from pointer delta against `ceilingEdgeDragInfo.origBbox`, snaps via `computeSnap` against `cachedCeilingScene`, then writes via `resizeCeilingAxisNoHistory`.
- Mouseup: extend the line-1307 cleanup tuple to include `"ceiling-resize-edge"` so size-tag clears + snap-guide clears fire.

**Module-level state additions:** `ceilingEdgeDragInfo: { ceilingId, edge, origPoints, origBbox } | null` and `cachedCeilingScene: SceneGeometry | null`. Both follow exactly the `edgeDragInfo` / `cachedEndpointScene` precedent. No new file.

**Hit-test bloat risk:** Negligible — the new block runs only when (a) selection size = 1, and (b) the selected id is in `ceilings`. Selection guard short-circuits when products/walls are selected.

## Q2 — `polygonBbox` helper location (HIGH confidence)

**Verdict:** Does NOT exist in `geometry.ts`. Add it there.

**Evidence:**
- `src/lib/geometry.ts` exports: `snapTo`, `snapPoint`, `distance`, `angle`, `wallLength`, `constrainOrthogonal`, `wallCorners`, `mitredWallCorners`, `formatFeet`, `closestPointOnWall`, `uid`, `polygonArea`, `polygonCentroid`, `resizeWall`. No bbox helper.
- `CeilingMesh.tsx` lines 56-66 inlines its own bbox loop (`useMemo`). This is duplicate logic that resolveCeilingPoints will replace.
- `axisAlignedBBoxOfRotated` exists in `snapEngine.ts:107` but takes a center+w+d+rotation (rotated rect), NOT a polygon vertex list.

**Recommended signature:**
```ts
// src/lib/geometry.ts
export function polygonBbox(points: Point[]): {
  minX: number; minY: number; maxX: number; maxY: number;
  width: number; depth: number;
} {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, depth: 0 };
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, depth: maxY - minY };
}
```

After landing this, refactor `CeilingMesh.tsx:56-66` to call `polygonBbox(ceiling.points)`. Net: -10 lines, single source of truth.

## Q3 — Phase 30 snap dispatch from selectTool drag (HIGH confidence)

**Verdict:** Do NOT extract a shared helper. The selectTool already invokes `computeSnap` directly from its move handler in two places (wall-endpoint at line 1053, generic move at line 1202). Adding a third invocation for ceiling-edge-resize follows the same idiom and keeps the diff minimal.

**Existing pattern** (line 1042-1074, wall-endpoint drag):
```ts
if (!altHeld && cachedEndpointScene) {
  const degenerateBBox = { id: "wall-endpoint-candidate", minX: candidate.x, maxX: candidate.x, minY: candidate.y, maxY: candidate.y };
  const result = computeSnap({
    candidate: { pos: candidate, bbox: degenerateBBox },
    scene: cachedEndpointScene,
    tolerancePx: SNAP_TOLERANCE_PX, scale, gridSnap,
  });
  snapped = result.snapped;
  guides = result.guides;
}
renderSnapGuides(fc, guides, scale, origin);
```

**Recommended ceiling-edge integration** (in the new `dragType === "ceiling-resize-edge"` branch):
- Cache `SceneGeometry` once at drag start via `buildSceneGeometry(state, ceilingId, productLib, customCatalog)`. The `excludeId` param (the ceiling itself) prevents self-snap.
- During move: build a degenerate BBox at the dragged-edge midpoint (the bbox edge being resized), call `computeSnap`, take `result.snapped.x` (for E/W edges) or `result.snapped.y` (for N/S edges) as the new bbox boundary. Convert to new axis value: e.g. dragging east edge → `newWidth = snapped.x - origBbox.minX`.
- Call `renderSnapGuides(fc, result.guides, scale, origin)` at the end of every move.

**No engine changes needed.** Phase 30 already exposes `buildSceneGeometry` + `computeSnap` + `renderSnapGuides` for exactly this use.

**Pitfall:** Don't pass the ceiling's full bbox to `computeSnap` — only the moving edge's midpoint. Otherwise the engine treats the entire ceiling as the candidate and tries to snap all 4 edges simultaneously.

## Q4 — CanvasContextMenu conditional-action pattern (HIGH confidence)

**Verdict:** Conditional actions ARE supported — pattern is "compute action set inside the kind branch with runtime checks against store state." Existing precedents include the Phase 59 cutaway toggle (`isCutawayManual ? "Show in 3D" : "Hide in 3D"`) and the hide/show base action (`isHidden ? "Show" : "Hide"`).

**Current ceiling branch** (line 117-119):
```ts
if (kind === "ceiling") {
  return [...baseActions];
}
```

**Recommended extension:**
```ts
if (kind === "ceiling") {
  const ceiling = nodeId ? doc?.ceilings?.[nodeId] : undefined;
  const hasOverrides = ceiling
    ? (ceiling.widthFtOverride !== undefined || ceiling.depthFtOverride !== undefined)
    : false;
  const actions: ContextAction[] = [...baseActions];
  if (hasOverrides) {
    actions.push({
      id: "reset-size",
      label: "Reset size",
      icon: <RotateCcw size={14} />, // or whatever icon convention is used
      handler: () => { if (nodeId) store.clearCeilingOverrides(nodeId); },
    });
  }
  // existing delete action stays last (currently absent in ceiling branch — but
  // PROPS-DEL audit may add later; out of scope here)
  return actions;
}
```

**Note:** Product/customElement context-menu branches do NOT currently include a "Reset size" action — the reset affordance lives only in PropertiesPanel for products. For ceilings we add BOTH (per D-06). This is a small inconsistency the planner can flag, but it's user-facing and intentional.

**Icon choice:** lucide-react `RotateCcw` is the conventional reset icon. Confirm against existing imports in `CanvasContextMenu.tsx` header.

## Q5 — Snap-guide visual feedback (HIGH confidence)

**Verdict:** Guides are NOT automatic. The calling tool MUST explicitly invoke `renderSnapGuides(fc, result.guides, scale, origin)` after every `computeSnap` call. The function clears prior guides idempotently (`clearSnapGuides` on every entry), so calling on every mousemove is the documented pattern.

**Evidence:**
- `src/canvas/snapGuides.ts:42-47` — `renderSnapGuides` is a top-level function the tool calls. Clearance is idempotent (line 48: `clearSnapGuides(fc)` always runs first).
- `selectTool.ts:1074` — wall-endpoint drag explicitly calls `renderSnapGuides(fc, guides, scale, origin)`.
- `selectTool.ts:1210` — generic move drag does the same.
- Mouseup cleanup at line 1319: `clearSnapGuides(fc)` — required to remove guides when drag ends without a final snap.

**Existing product-resize-edge gap:** I confirmed via grep — `dragType === "product-resize-edge"` does NOT currently call `computeSnap` or `renderSnapGuides`. Phase 31 product edge-resize uses ONLY grid snap (line 956-960). This is a **pre-existing limitation** in Phase 31, not a Phase 65 problem.

**Implication for Phase 65:** Ceiling resize WILL use smart-snap (per D-04) — meaning ceiling resize will be MORE capable than product resize for snap-to-walls. This is fine and consistent with CONTEXT D-04. The planner should NOT retroactively add smart-snap to product resize (out of scope, would inflate the phase).

**Recommendation:** In the new `ceiling-resize-edge` move branch, follow the wall-endpoint pattern verbatim (build degenerate BBox at edge midpoint → computeSnap → renderSnapGuides). Verify via E2E that purple guides appear when an edge approaches a wall and disappear when Alt is held.

## Q6 — 3D mesh re-extrude performance (MEDIUM confidence)

**Verdict:** Acceptable for v1.16. `CeilingMesh.tsx:68-80` uses `useMemo([ceiling.points])` to cache the `THREE.ShapeGeometry`. During a drag, `ceiling.points` reference changes every mousemove (`updateCeilingNoHistory` immer-produces a new array), so `useMemo` invalidates and re-extrudes ~60×/sec. For the typical room (1-3 ceilings, 4-8 vertices each, simple `ShapeGeometry` not `ExtrudeGeometry`), this is well under the GPU's per-frame budget on a modern Mac.

**Mitigations available if perf becomes a problem:**
- Phase 25 PERF-01 fast-path applies to **Fabric** rendering (`renderOnAddRemove: false`, `_dragActive` flag) — does NOT translate directly to R3F + THREE.
- For R3F: equivalent would be a useRef'd geometry + manual `geometry.dispose()` + `geometry.attributes.position.needsUpdate = true`. Significantly more code, deferred to v1.17+ if profiling shows real issue.

**Verification gate:** Drag an L-shape ceiling east edge for 3 seconds straight; verify 3D viewport doesn't drop below 50 fps on a 2024 MacBook Pro M3. If it does, fall back to a 16ms throttle on `updateCeilingNoHistory` calls (one-line debounce).

**Important:** D-07 says "3D updates live as the user drags." This means we want re-extrude on every move. We're NOT trying to avoid re-extrudes — we're trying to keep them cheap. The ShapeGeometry path (flat ceiling, no extrude depth) is already cheap.

**Risk for planner:** Test with the 6-vertex L-shape (E2E scenario E5/U2). If perf is bad, the v1.16 ship-blocker is lifted by a 16ms throttle. Document this as a known acceptable risk.

## Q7 — `widthFtOverride` semantics (HIGH confidence)

**Verdict:** **Target absolute bbox width in feet.** Locked. Mirrors Phase 31 product semantics exactly.

**Evidence from `src/types/product.ts:96-115`:**
```ts
//   width  = widthFtOverride  ?? (libraryWidth × sizeScale)
//   depth  = depthFtOverride  ?? (libraryDepth × sizeScale)
export function resolveEffectiveDims(product, placed) {
  return {
    width: placed.widthFtOverride ?? baseW * scale,
    depth: placed.depthFtOverride ?? baseD * scale,
  };
}
```
Override is the absolute target width — NOT a multiplier. When set to e.g. `5.0`, the rendered width is exactly 5 feet regardless of `sizeScale`.

**Locked `resolveCeilingPoints` implementation:**
```ts
// src/lib/geometry.ts (or new src/lib/ceiling.ts — keeps domain-specific)
import type { Ceiling, Point } from "@/types/cad";
import { polygonBbox } from "./geometry";

export function resolveCeilingPoints(ceiling: Ceiling): Point[] {
  if (ceiling.widthFtOverride === undefined && ceiling.depthFtOverride === undefined) {
    return ceiling.points;
  }
  const bbox = polygonBbox(ceiling.points);
  if (bbox.width <= 0 || bbox.depth <= 0) return ceiling.points; // degenerate guard
  const sx = ceiling.widthFtOverride !== undefined ? ceiling.widthFtOverride / bbox.width : 1;
  const sy = ceiling.depthFtOverride !== undefined ? ceiling.depthFtOverride / bbox.depth : 1;
  return ceiling.points.map((p) => ({
    x: bbox.minX + (p.x - bbox.minX) * sx,
    y: bbox.minY + (p.y - bbox.minY) * sy,
  }));
}
```

**Note on consumer migration:** Every consumer of `ceiling.points` must switch to `resolveCeilingPoints(ceiling)`. Sites identified:
- `src/three/CeilingMesh.tsx:56-80` (bbox + geometry useMemos) — UPDATE
- `src/canvas/fabricSync.ts:204-247` (renderCeilings 2D polygon + limewash overlay) — UPDATE both polygon point arrays
- `src/canvas/tools/selectTool.ts` ceiling-body-drag path (line 854-863, 1213-1222) — uses centroid of `ceiling.points`. This is for the *body-drag* path (move whole ceiling) and should KEEP using `ceiling.points` (we move the source-of-truth polygon, not the rendered one). Confirm during planning — it's a subtle distinction.
- Any export/serialization path — `ceiling.points` is the persisted shape. resolveCeilingPoints is render-only. Saved snapshots store `points` + `widthFtOverride` + `depthFtOverride` separately.

**Edge case:** When the user drags an edge AND `points` is already at e.g. width=10, then sets `widthFtOverride=5`, then triggers RESET_SIZE — the ceiling returns to width=10 (the original `points`). This matches Phase 31 product behavior (override is purely additive; clearing overrides reverts to library/source state).

## Test fixture recommendations

| Test | Polygon | Validates |
|------|---------|-----------|
| U1 | 4-vertex rectangle (10×8 ft) | resolveCeilingPoints returns identity when no overrides |
| U2 | 6-vertex L-shape (e.g. open-plan kitchen+dining) | Proportional scaling preserves L-shape proportion on width override |
| U3 | 6-vertex hexagon | Proportional scaling on depth override (vertices not axis-aligned) |
| U4 | Same L-shape | Combined width + depth overrides simultaneously |
| U5 | Any | resizeCeilingAxis pushes exactly 1 history entry |
| U6 | Any with overrides set | clearCeilingOverrides reverts both fields to undefined |

**L-shape canonical fixture** (recommend baking into `tests/fixtures/ceilings.ts`):
```ts
export const L_SHAPE_CEILING_POINTS = [
  { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 4 },
  { x: 6, y: 4 }, { x: 6, y: 8 }, { x: 0, y: 8 },
]; // bbox: 10×8, area 64 sq ft
```

**E2E fixture for E5** (L-shape proportional test): Place this ceiling, drag east edge from x=10 to x=15 (50% extend), assert all vertices at x>0 scale by 1.5, vertices at x=0 stay at x=0.

## Standard Stack

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fabric.js | ^6.9.1 | 2D canvas + handle hit-testing | Already used for all canvas tools |
| three.js | ^0.183.2 | 3D ShapeGeometry re-extrude | Existing CeilingMesh consumer |
| zustand + immer | ^5.0.12 / ^11.1.4 | New cadStore actions | Existing pattern for resize* actions |
| vitest | repo default | Unit tests (resolveCeilingPoints, store actions) | Repo standard |
| Playwright | repo default | E2E (drag interaction, snap, undo) | Repo standard |

No new dependencies required.

## Architecture Patterns

**Pattern: Override + render-time resolver** (from Phase 31)
- Source-of-truth field stays unchanged (`points`)
- Optional override fields (`widthFtOverride`, `depthFtOverride`) are absolute target values
- Pure function `resolve*(entity)` computes the rendered output from source + overrides
- Reset = clear override fields (one store action)

**Pattern: Cached snap scene at drag start** (from Phase 30/31)
- `mousedown` builds `SceneGeometry` ONCE via `buildSceneGeometry(...)` and stores in module-level `cachedCeilingScene`
- `mousemove` reuses cached scene → no recomputation per frame
- `mouseup` clears `cachedCeilingScene = null`

**Pattern: Single-undo drag transaction** (from Phase 31)
- `mousedown` calls history-pushing action with no-op payload (`updateCeiling(id, {})`) to snapshot
- `mousemove` calls `*NoHistory` variant repeatedly
- `mouseup` no commit needed (snapshot already at start)
- Verify gate: `past.length` increments by exactly 1

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Polygon bbox | Inline `for` loop in CeilingMesh | New `polygonBbox` in geometry.ts | Already inlined in 1 place; consolidating + reuse |
| Snap engine | Custom snap logic for ceiling resize | `computeSnap` + `buildSceneGeometry` + `renderSnapGuides` | Phase 30 engine handles edge cases (Alt-disable, grid fallback, multi-target priority) |
| Drag transaction | Manual history.push then revert on cancel | `update*(id,{})` + `*NoHistory` pattern | Battle-tested in Phase 31; single-undo guarantee comes free |
| Override resolver | Inline scaling in every consumer | `resolveCeilingPoints(ceiling)` | Mirrors Phase 31 `resolveEffectiveDims`; planner audit easier |

## Common Pitfalls

### Pitfall 1: Self-snap during ceiling resize
**What goes wrong:** `buildSceneGeometry` includes the dragged ceiling's own walls/edges → ceiling snaps to itself.
**Why it happens:** `excludeId` param of `buildSceneGeometry` not passed.
**How to avoid:** Pass the ceilingId as `excludeId` (line 845-851 generic-move precedent does this for moved objects; same applies here).

### Pitfall 2: Forgetting to clear snap guides on Alt-toggle mid-drag
**What goes wrong:** User holds Alt mid-drag → smart-snap stops, but purple guides linger.
**How to avoid:** Always call `renderSnapGuides(fc, guides, scale, origin)` even when `guides=[]` (clears via the function's idempotent prior-clear).

### Pitfall 3: Mutating `origPoints` during drag
**What goes wrong:** Storing `origPoints: ceiling.points` (reference, not clone) → store mutations under us → resize math goes wrong.
**How to avoid:** Clone at drag start: `origPoints: ceiling.points.map((p) => ({ ...p }))`. Or just freeze the bbox: `origBbox: polygonBbox(ceiling.points)` and recompute scale from there (recommended — smaller cache).

### Pitfall 4: PropertiesPanel input commits during keystroke instead of blur/Enter
**What goes wrong:** Each keystroke pushes history → undo stack pollutes. Phase 31 InlineEditableText pattern: live-preview via `*NoHistory` mid-keystroke, commit via `update*` on Enter/blur.
**How to avoid:** Reuse the existing `InlineEditableText` or `LabelOverrideInput` pattern (Phase 31, line 518) for the WIDTH/DEPTH inputs.

### Pitfall 5: Body-drag path uses `points` directly; resize path uses bbox math
**What goes wrong:** Body-drag (line 1213-1222) updates `points` array directly. Edge-resize updates `widthFtOverride`. If user does body-drag THEN edge-resize, the resize bbox is computed from the body-dragged points (correct) — but if the consumer chain somehow mixes paths, math goes off.
**How to avoid:** Body-drag stays untouched (per CONTEXT "Out of scope"). Edge-resize only ever writes overrides. resolveCeilingPoints reads both `points` (current source) + overrides (delta) — works in any order.

## Code Examples

### Drag start (mousedown ceiling-edge handle)
```ts
// In selectTool.ts onMouseDown, after wall-handle block (~line 793)
const ceiling = (getActiveRoomDoc()?.ceilings ?? {})[selId];
if (ceiling) {
  const handleHit = hitTestCeilingEdgeHandle(feet, ceiling); // returns "n"|"s"|"e"|"w"|null
  if (handleHit) {
    const origBbox = polygonBbox(ceiling.points);
    dragging = true;
    dragId = selId;
    dragType = "ceiling-resize-edge";
    ceilingEdgeDragInfo = { ceilingId: selId, edge: handleHit, origBbox };
    const axis = handleHit === "n" || handleHit === "s" ? "depth" : "width";
    const initialValue = axis === "width" ? origBbox.width : origBbox.depth;
    useCADStore.getState().resizeCeilingAxis(selId, axis, initialValue);
    cachedCeilingScene = buildSceneGeometry(
      useCADStore.getState() as any,
      selId,
      _productLibrary,
      (useCADStore.getState() as any).customElements ?? {},
    );
    return;
  }
}
```

### Drag move
```ts
// In selectTool.ts onMouseMove, after product-resize-edge block (~line 982)
if (dragType === "ceiling-resize-edge" && ceilingEdgeDragInfo) {
  const { edge, origBbox } = ceilingEdgeDragInfo;
  const altHeld = (opt.e as MouseEvent).altKey === true;
  const gridSnap = useUIStore.getState().gridSnap;

  // Edge midpoint candidate
  const candidate: Point = edge === "e" ? { x: feet.x, y: (origBbox.minY + origBbox.maxY) / 2 }
                          : edge === "w" ? { x: feet.x, y: (origBbox.minY + origBbox.maxY) / 2 }
                          : edge === "n" ? { y: feet.y, x: (origBbox.minX + origBbox.maxX) / 2 }
                          :                { y: feet.y, x: (origBbox.minX + origBbox.maxX) / 2 };

  let snapped = candidate;
  let guides: SnapGuide[] = [];
  if (!altHeld && cachedCeilingScene) {
    const result = computeSnap({
      candidate: { pos: candidate, bbox: { id: "ceiling-edge", minX: candidate.x, maxX: candidate.x, minY: candidate.y, maxY: candidate.y } },
      scene: cachedCeilingScene,
      tolerancePx: SNAP_TOLERANCE_PX, scale, gridSnap,
    });
    snapped = result.snapped;
    guides = result.guides;
  } else if (gridSnap > 0) {
    snapped = snapPoint(candidate, gridSnap);
  }
  renderSnapGuides(fc, guides, scale, origin);

  // Convert snapped pointer → new axis value
  let newValue: number;
  if (edge === "e")      newValue = Math.max(0.5, snapped.x - origBbox.minX);
  else if (edge === "w") newValue = Math.max(0.5, origBbox.maxX - snapped.x);
  else if (edge === "n") newValue = Math.max(0.5, origBbox.maxY - snapped.y);
  else                   newValue = Math.max(0.5, snapped.y - origBbox.minY);

  const axis = edge === "n" || edge === "s" ? "depth" : "width";
  useCADStore.getState().resizeCeilingAxisNoHistory(dragId, axis, newValue);
  fc.requestRenderAll();
  return;
}
```

**Note on west/north edges:** When dragging west or north edge, the bbox `min` boundary moves rather than `max`. The override is still target absolute width/depth (the bbox maintains its shape but the polygon repositions implicitly via the resolveCeilingPoints scaling-from-min-corner math). Wait — verify: scaling from `bbox.minX` means west-edge drag wouldn't move minX. **Risk:** the scaling math assumes the unchanged corner is min. For west-edge drag, the unchanged corner should be max. Two options:
  1. Scale the polygon from max corner when widthFtOverride is set + west drag was the trigger. But we have no flag for "which edge originated the override."
  2. Mirror Phase 31: just store the new width and let resolveCeilingPoints scale from min. The polygon's min corner stays anchored regardless of which edge dragged. **User-visible effect:** dragging the west edge feels like "the east edge is anchored, west moves out" — but actually in our model, west stays anchored and east moves out (proportional scaling preserves min corner). For symmetric polygons (rectangle, hexagon) it's visually identical. For asymmetric L-shapes, dragging west could feel slightly off.

**Recommendation for planner:** Lock the simpler model — proportional scaling from `bbox.min` regardless of which edge the user dragged. Document the visual consequence in HUMAN-UAT.md. If user feedback is "it feels weird," v1.17 can add a "drag origin" override mode. This matches Phase 31 product behavior (drag west edge of a product, anchor stays at east — actually Phase 31 stores center+rotation so it's a different model).

**Confirm before planning:** Compare side-by-side how Phase 31 product handles west-edge drag (probably anchors center, moves both edges). If product anchors something other than min, the planner should weigh whether ceiling should match (anchor centroid) or differ (anchor min). My read is anchor-min is simpler and acceptable for v1.16, but flag for the discuss-phase if not already locked.

### Fabric handle render
```ts
// In fabricSync.ts renderCeilings, inside the for loop, when isSelected:
if (isSelected) {
  const resolved = resolveCeilingPoints(c);
  const bbox = polygonBbox(resolved);
  const handles = {
    n: { x: (bbox.minX + bbox.maxX) / 2, y: bbox.minY },
    s: { x: (bbox.minX + bbox.maxX) / 2, y: bbox.maxY },
    e: { x: bbox.maxX, y: (bbox.minY + bbox.maxY) / 2 },
    w: { x: bbox.minX, y: (bbox.minY + bbox.maxY) / 2 },
  };
  for (const key of ["n", "s", "e", "w"] as const) {
    const h = handles[key];
    fc.add(new fabric.Rect({
      left: origin.x + h.x * scale,
      top: origin.y + h.y * scale,
      width: 10, height: 10,
      fill: "#12121d", stroke: "#7c5bf0", strokeWidth: 2,
      originX: "center", originY: "center",
      selectable: false, evented: false,
      data: { type: "resize-handle-edge", edge: key, ceilingId: c.id }, // NOTE: ceilingId, not placedId
    }));
  }
}
```

**Discriminator:** `data.ceilingId` distinguishes from `data.placedId` in the hit-test. selectTool's `hitTestCeilingEdgeHandle` would scan for `obj.data?.type === "resize-handle-edge" && obj.data?.ceilingId === ceiling.id`.

## State of the Art

No external state-of-art shifts since training. Pattern is internal — Phase 31 product edge-resize is the gold standard for this codebase.

## Open Questions

1. **West/north-edge anchor behavior** (raised in Q7 deep-dive)
   - What we know: D-01 says proportional scaling. resolveCeilingPoints scales from `bbox.min`.
   - What's unclear: For west-edge drag, is "anchor min, move max" the right user mental model? Or should the model anchor max when west drags?
   - Recommendation: Lock to anchor-min for v1.16 (simplest); call out in HUMAN-UAT.md so Jessica can flag if it feels wrong. Defer "drag-origin-aware anchoring" to v1.17 if needed.

## Environment Availability

Skip — no external dependencies introduced. Pure code change in existing TypeScript stack.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (unit/component) + Playwright (e2e) |
| Config file | `vitest.config.ts` + `playwright.config.ts` |
| Quick run command | `npx vitest run tests/lib/resolveCeilingPoints.test.ts -t "<name>"` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CEIL-02 (resolver identity) | resolveCeilingPoints returns identity with no overrides | unit | `npx vitest run tests/lib/resolveCeilingPoints.test.ts -t "U1"` | ❌ Wave 0 |
| CEIL-02 (L-shape width) | L-shape width override scales all vertices proportionally | unit | `npx vitest run tests/lib/resolveCeilingPoints.test.ts -t "U2"` | ❌ Wave 0 |
| CEIL-02 (hex depth) | hexagon depth override scales proportionally | unit | `npx vitest run tests/lib/resolveCeilingPoints.test.ts -t "U3"` | ❌ Wave 0 |
| CEIL-02 (combined) | width+depth overrides simultaneously | unit | `npx vitest run tests/lib/resolveCeilingPoints.test.ts -t "U4"` | ❌ Wave 0 |
| CEIL-02 (single undo) | resizeCeilingAxis pushes exactly 1 history entry | unit | `npx vitest run tests/stores/cadStore.ceiling-resize.test.ts -t "U5"` | ❌ Wave 0 |
| CEIL-02 (clear overrides) | clearCeilingOverrides clears both fields | unit | `npx vitest run tests/stores/cadStore.ceiling-resize.test.ts -t "U6"` | ❌ Wave 0 |
| CEIL-02 (PropPanel render) | Width/depth inputs + RESET button shown for selected ceiling with overrides | component | `npx vitest run tests/components/PropertiesPanel.ceiling-resize.test.tsx -t "C1"` | ❌ Wave 0 |
| CEIL-02 (PropPanel commit) | Width input commit dispatches resizeCeilingAxis on Enter | component | `npx vitest run tests/components/PropertiesPanel.ceiling-resize.test.tsx -t "C2"` | ❌ Wave 0 |
| CEIL-02 (handles render) | Click ceiling → 4 edge handles appear at bbox edges | e2e | `npx playwright test e2e/ceiling-resize.spec.ts -g "E1"` | ❌ Wave 0 |
| CEIL-02 (drag east) | Drag east edge → bbox extends; PropertiesPanel + 3D mesh update live | e2e | `npx playwright test e2e/ceiling-resize.spec.ts -g "E2"` | ❌ Wave 0 |
| CEIL-02 (smart-snap) | Drag west edge near wall → snap engages; release flush | e2e | `npx playwright test e2e/ceiling-resize.spec.ts -g "E3"` | ❌ Wave 0 |
| CEIL-02 (right-click reset) | Right-click ceiling with overrides → "Reset size" → polygon returns to original | e2e | `npx playwright test e2e/ceiling-resize.spec.ts -g "E4"` | ❌ Wave 0 |
| CEIL-02 (single undo) | Single Ctrl+Z undoes entire drag | e2e | `npx playwright test e2e/ceiling-resize.spec.ts -g "E5"` | ❌ Wave 0 |
| CEIL-02 (L-shape) | Drag east edge of L-shape → all vertices scale proportionally | e2e | `npx playwright test e2e/ceiling-resize.spec.ts -g "E6"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/lib/resolveCeilingPoints.test.ts tests/stores/cadStore.ceiling-resize.test.ts`
- **Per wave merge:** `npx vitest run && npx playwright test e2e/ceiling-resize.spec.ts`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/resolveCeilingPoints.test.ts` — covers U1-U4
- [ ] `tests/stores/cadStore.ceiling-resize.test.ts` — covers U5-U6
- [ ] `tests/components/PropertiesPanel.ceiling-resize.test.tsx` — covers C1-C2
- [ ] `e2e/ceiling-resize.spec.ts` — covers E1-E6
- [ ] `tests/fixtures/ceilings.ts` — shared L-shape + hex polygon fixtures (Q1 recommendation)
- [ ] `src/test-utils/ceilingDrivers.ts` — `__driveCeilingResize`, `__getCeilingBbox`, `__getCeilingResolvedPoints` test drivers

## Sources

### Primary (HIGH confidence)
- `src/canvas/tools/selectTool.ts` — full edge-handle, drag-transaction, snap-cache pattern
- `src/types/product.ts:96-115` — locks `widthFtOverride` semantics
- `src/canvas/snapEngine.ts:107, 142, 301` — `computeSnap` + `buildSceneGeometry` exports
- `src/canvas/snapGuides.ts:42-110` — `renderSnapGuides` is caller-driven
- `src/components/CanvasContextMenu.tsx:36-158` — conditional-action precedent
- `src/components/PropertiesPanel.tsx:519-549` — RESET_SIZE button precedent
- `src/three/CeilingMesh.tsx:56-80` — bbox + ShapeGeometry useMemo (perf path)
- `src/canvas/wallEndpointSnap.ts` — restricted snap-scene precedent (not directly used here, but informs the pattern)
- `src/canvas/fabricSync.ts:140-247` — handle render + ceiling polygon render

### Secondary (MEDIUM confidence)
- Phase 25 PERF-01 fast-path applicability to R3F (training data + repo header comments) — NOT a direct fit; documented in Q6.

### Tertiary (LOW confidence)
- None — all findings verified against repo source.

## Project Constraints (from CLAUDE.md)

- **Tool cleanup pattern:** No new module-level singletons. Module-level `let`s for `ceilingEdgeDragInfo` and `cachedCeilingScene` are acceptable per existing precedents (`edgeDragInfo`, `cachedScene`, `cachedEndpointScene`) inside selectTool. They live inside the activate() closure conceptually but are scoped to the file because selectTool is a singleton tool.
- **Coordinate system:** all measurements in feet. Override fields stored in feet.
- **No snapshot version bump:** additive optional fields are back-compat (CONTEXT D-12, Phase 61 OPEN-01 precedent).
- **Atomic commits per task** (CONTEXT D-11).
- **Material Symbols allowlist:** `CanvasContextMenu.tsx` uses lucide-react icons (line 87-90) — `RotateCcw` for reset is consistent with the existing import pattern. Confirm no Material Symbols introduced.
- **GitHub Issues sync:** Phase plan creation should add `in-progress` label to GH #70 (CEIL-02). PR body must include `Closes #70`.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dependency already in repo
- Architecture: HIGH — mirrors Phase 31 verbatim with documented integration points
- Pitfalls: MEDIUM — the west/north-edge anchor behavior (Open Question 1) is the only meaningful design ambiguity left

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (30 days; stable internal patterns)
