# Phase 30: Smart Snapping — Research

**Researched:** 2026-04-20
**Domain:** 2D CAD interaction — snap algorithms, Fabric.js ephemera, Zustand drag fast-path
**Confidence:** HIGH (net-new code; all dependencies in-repo and inspected)

## Summary

Phase 30 adds a zoom-aware smart-snap layer on top of the existing grid-only `snapPoint()` fallback across three tools (`productTool`, `selectTool`, `ceilingTool`) — excluding wall-endpoint drag per D-08b. The work partitions cleanly into:

1. A **pure** `snapEngine.ts` module (unit-testable, no Fabric, feet-in / feet-out).
2. A **Fabric-aware** `snapGuides.ts` helper that renders/clears `data: { type: "snap-guide" }` objects — mirrors the `type: "dim"` and `type: "ceiling-edge-preview"` patterns already in the codebase.
3. **Per-site integration**: replace each `snapPoint(feet, gridSnap)` call at 4 specific lines with `computeSnap(...)` + guide render, gated by `opt.e.altKey`.
4. **SceneGeometry cache** built once at drag start, held in the tool's closure — matches existing `dragPre` pattern in selectTool.

The big risks are all "don't break Phase 25": no store writes mid-drag, guide objects must be cleared symmetrically on mouse:up AND on cleanup (tool switch), and the SceneGeometry must be a snapshot (not a live store subscription) so it never mutates mid-gesture.

**Primary recommendation:** Build `snapEngine.ts` + its unit tests first (Wave 0/1), then a `snapGuides.ts` renderer, then wire in one tool at a time starting with `productTool` (simplest — no drag state machine). The RTL integration test reuses the `window.__*` driver pattern already seen in Phase 29's `dimensionEditor.test.ts`.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** Pure module `src/canvas/snapEngine.ts` — `computeSnap(candidate, scene, tolerancePx, scale) → { snapped, guides }`. No Fabric, no store reads, no side effects.
- **D-02** Snap targets: wall outer edges (both faces of every thick wall as line segments), wall midpoints (`t=0.5`), other placed objects' bbox edges (products + custom + ceilings).
- **D-02a** Wall endpoints/corners, object centers, angular snaps are OUT of scope.
- **D-02b** Exclude-self: filter dragged object id before building candidate list.
- **D-03** Dragged object's **own bbox edges** (left/right/top/bottom of its footprint, axis-aligned bbox of the rotated footprint) are the source snap points.
- **D-03a** Midpoint auto-center (SNAP-02): object **center** → wall midpoint. Separate candidate from edge snaps.
- **D-04** `SNAP_TOLERANCE_PX = 8`; feet tolerance = `8 / scale`, recomputed per mousemove.
- **D-04a** Tolerance does NOT apply to grid fallback — grid always rounds to `gridSnap`.
- **D-05** Per-axis independent. Best X-snap and best Y-snap computed separately.
- **D-05a** Intra-axis tiebreak: `midpoint > edge-edge > edge-wall-face`. Stable tiebreak; comment in code.
- **D-05b** No smart-snap within tolerance on an axis → grid snap applies on that axis (when `gridSnap > 0`).
- **D-06** Accent-purple (`--color-accent` = `#7c5bf0`) axis line extending across canvas + ~6px tick at snap point.
- **D-06a** ~60% opacity, line weight ~1px. No new tokens.
- **D-06b** Guides are Fabric objects tagged `data: { type: "snap-guide" }`. Cleared on `mouse:up` AND when a different snap engages. No store commits for guide state.
- **D-06c** When X and Y both snap simultaneously, both guides render (crosshair).
- **D-06d** Midpoint snap adds a distinct **accent-purple dot on the wall midline** in addition to the axis line.
- **D-07** Hold **Alt / Option** during drag to disable smart snap (grid still applies). `opt.e.altKey`. No UI toggle.
- **D-08** Scope: products + custom elements + ceilings. Walls excluded (endpoint/thickness/rotate drag paths untouched). Openings excluded.
- **D-08a** Integration sites: `productTool.ts` placement click (~L25–30); `selectTool.ts` generic move branch (~L873–890); `ceilingTool.ts` drag path (the phase references L59–109 — see note below).
- **D-08b** `selectTool` wall-endpoint drag (~L765–789) does NOT use smart snap in v1.
- **D-09** O(N) linear scan per frame. ~400 candidate segments at Jessica's scene size is trivial.
- **D-09a** No spatial index in v1.
- **D-09b** SceneGeometry captured once at drag start, cached in drag closure.
- **D-09c** Phase 25 drag fast-path preservation: no store commits mid-drag.

### Claude's Discretion
- SceneGeometry caching location (drag closure vs. WeakMap on fabric Canvas).
- Whether `SnapGuide` is a discriminated union by `kind` or `axis` + `marker?`.
- Whether `computeSnap` returns only the winner or a debug candidate list.
- Render implementation in Fabric (dashed vs solid, 1–2px).
- Order of hit-test vs. exclude-self.
- Whether to export `SNAP_TOLERANCE_PX` or keep const.

### Deferred Ideas (OUT OF SCOPE)
- Object center as a snap **target** (it's only a source for midpoint).
- Wall endpoint / corner snapping (Phase 31).
- Angle / rotation snapping.
- Spacing / distribution guides.
- Spatial index / quadtree.
- Persistent alignment constraints.
- Toolbar UI toggle for smart snap on/off.
- Smart snap while drawing walls (wallTool unchanged).
- Opening smart snap (openings slide along host wall only).
- Alternate units.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SNAP-01 | Edges snap to nearby wall & object edges within pixel tolerance | `snapEngine.computeSnap` per-axis edge loop (see Architecture Patterns §Per-axis algorithm); wall outer edges via `mitredWallCorners` corner pairs; object bbox derivation in §Axis-aligned bbox |
| SNAP-02 | Near wall midpoint, object auto-centers on wall | Midpoint candidate derived from `(start+end)/2` (equiv. `closestPointOnWall` with `t=0.5`); center-to-midpoint test is a separate candidate per D-03a; priority `midpoint > edge-edge > edge-wall-face` per D-05a |
| SNAP-03 | Visible guide (line / tick / highlight) shown while snap active | `snapGuides.ts` renderer; `data: { type: "snap-guide" }` cleanup mirrors existing `type: "dim"` / `type: "ceiling-edge-preview"` patterns; midpoint-dot adds distinct marker per D-06d |

## Project Constraints (from CLAUDE.md)

- **Obsidian CAD theme**: use existing `--color-accent` (`#7c5bf0`). No new tokens.
- **IBM Plex Mono** for any UI chrome (N/A here — guides are purely geometric).
- **Feet everywhere**: all module inputs/outputs in feet. `scale` applied at render boundary only.
- **Zustand store-driven**: tools read via `useCADStore.getState()` / `useUIStore.getState()` outside React; snapEngine takes state as a plain argument.
- **`@/*` path alias** throughout new imports.
- **Tool lifecycle contract**: `activate*(fc, scale, origin)` returns a `cleanup: () => void`. Any `fc.on(...)` added MUST be removed in cleanup; any Fabric objects added MUST be cleared in cleanup.
- **Phase 25 drag fast-path must NOT regress**: no per-frame `useCADStore.getState().updateXxxNoHistory()` calls for the fast-path branches (product move, wall move, wall endpoint, product rotate). Guide rendering must be Fabric-only ephemera.
- **GSD workflow**: research → plan → execute via GSD commands. No direct edits outside workflow.

## Standard Stack

This is **in-repo code only** — no new npm deps. Everything builds on existing modules.

### Core (in-repo)
| Module | Purpose | Used As |
|--------|---------|---------|
| `src/lib/geometry.ts` | `distance`, `closestPointOnWall`, `wallCorners`, `mitredWallCorners`, `snapPoint` | Building blocks for snap math + grid fallback |
| `src/canvas/tools/toolUtils.ts` | `pxToFeet` | Already shared between tools; extend with SceneGeometry builder if desired |
| `src/stores/cadStore.ts` | `getActiveRoomDoc`, `useCADStore.getState()` | Read walls / placedProducts / placedCustomElements / ceilings at drag start |
| `src/stores/uiStore.ts` | `useUIStore.getState().gridSnap` | Per-axis grid fallback per D-05b |
| `fabric` v6 | Rendering guides (Line + Circle with `data: { type: "snap-guide" }`) | Already a dep, no new install |

### New files
| File | Purpose |
|------|---------|
| `src/canvas/snapEngine.ts` | Pure `computeSnap` + types (`SnapCandidate`, `SceneGeometry`, `SnapGuide`, `SnapResult`) + `buildSceneGeometry` |
| `src/canvas/snapGuides.ts` | `renderSnapGuides(fc, guides, scale, origin)` + `clearSnapGuides(fc)` — Fabric-only side effects |
| `tests/snapEngine.test.ts` | Pure unit tests |
| `tests/snapGuides.test.ts` *(optional)* | Guide-object tagging / cleanup asserts |
| `tests/snapIntegration.test.ts` | RTL harness via exposed `window.__driveSnap` or reuse dragIntegration pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff / Why Not |
|------------|-----------|---------------------|
| Linear O(N) scan | kd-tree / AABB buckets | Premature per D-09a; scene size tiny |
| Single-fn `computeSnap` | Separate `computeSnapX` + `computeSnapY` | Single-fn with per-axis internal pass is simpler; planner can split if profiling shows need |
| SceneGeometry in closure | WeakMap keyed by `fabric.Canvas` | Closure matches existing `dragPre` precedent; WeakMap adds indirection |
| Axis-aligned bbox of rotated footprint | True oriented bbox + rotated-edge snap | Out of scope per D-03 ("for v1"); OBB math + guide rendering is a full second phase |

## Architecture Patterns

### Proposed module layout
```
src/canvas/
  snapEngine.ts          ← pure, no Fabric, unit-testable
  snapGuides.ts          ← Fabric render + cleanup (tagged objects)
  tools/
    productTool.ts       ← call computeSnap + renderSnapGuides in mousemove + mousedown
    selectTool.ts        ← call computeSnap in the generic-move branch (~L874)
    ceilingTool.ts       ← call computeSnap in ceiling-drag mousemove
    toolUtils.ts         ← (unchanged, OR add buildSceneGeometry helper here)
```

### Pattern 1: `snapEngine` type shapes (proposed, planner's discretion on final form)

```typescript
// src/canvas/snapEngine.ts
import type { Point, WallSegment } from "@/types/cad";

export const SNAP_TOLERANCE_PX = 8;

/** Axis-aligned bounding box in feet. Used for both source (dragged obj)
 *  and target (other placed objects). */
export interface BBox {
  /** Top-left corner (min x, min y). */
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  /** Identity used to exclude-self. */
  id: string;
}

/** Line segment in feet. Used for wall outer edges. */
export interface Segment {
  a: Point;
  b: Point;
  /** Wall id for exclude-self safety (wall drag is not a snap source in v1
   *  but still good hygiene). */
  wallId: string;
}

/** Built once at drag start. Excludes the dragged object by id. */
export interface SceneGeometry {
  /** Wall outer-edge segments (2 per wall — startLeft→endLeft + startRight→endRight). */
  wallEdges: Segment[];
  /** Wall midpoints in feet, one per wall. */
  wallMidpoints: Array<{ point: Point; wallId: string; axis: "x" | "y" | "diag" }>;
  /** Bounding boxes of all OTHER placed products, custom elements, ceilings. */
  objectBBoxes: BBox[];
}

/** What the renderer needs to draw one guide. */
export type SnapGuide =
  | { kind: "axis"; axis: "x" | "y"; value: number /* feet */ }
  | { kind: "midpoint-dot"; at: Point /* wall midpoint in feet */ };

export interface SnapInput {
  /** Candidate world-coord position the user is dragging toward, in feet,
   *  already grid-rounded IF caller wants that as the pre-snap seed (we don't;
   *  see D-05b — grid is the per-axis FALLBACK, not the input). */
  candidate: { pos: Point; bbox: BBox /* with id of the dragged object */ };
  scene: SceneGeometry;
  /** Pixel tolerance. Converted to feet inside = tolerancePx / scale. */
  tolerancePx: number;
  scale: number;
  /** Per D-05b fallback. 0 = no grid, no fallback. */
  gridSnap: number;
}

export interface SnapResult {
  /** Final snapped position in feet. If no smart snap AND no grid, returns
   *  candidate.pos unchanged. */
  snapped: Point;
  guides: SnapGuide[];
  /** Debug — which candidate won each axis (optional, for tests). */
  debug?: { xWinner?: string; yWinner?: string };
}

export function computeSnap(input: SnapInput): SnapResult;
export function buildSceneGeometry(
  state: ReturnType<typeof import("@/stores/cadStore").useCADStore.getState>,
  excludeId: string,
  productLibrary: import("@/types/product").Product[],
  customElementCatalog: Record<string, import("@/types/cad").CustomElement>,
): SceneGeometry;
```

**Design note:** `candidate` takes BOTH `pos` and `bbox` — the bbox is needed so the engine can evaluate snap between each of the 4 dragged edges (`minX`, `maxX`, `minY`, `maxY`) + the **center** (for midpoint) against every target. Caller computes the bbox once per frame from the dragged object's position + dimensions + rotation.

### Pattern 2: Per-axis snap algorithm (pseudocode)

```typescript
export function computeSnap(input: SnapInput): SnapResult {
  const { candidate, scene, tolerancePx, scale, gridSnap } = input;
  const tolFt = tolerancePx / scale;
  const { pos, bbox } = candidate;
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;

  // Source X-values on the dragged object: its left edge, right edge, center.
  const srcXs: Array<{ value: number; kind: "edge" | "center" }> = [
    { value: bbox.minX, kind: "edge" },
    { value: bbox.maxX, kind: "edge" },
    { value: cx,       kind: "center" },
  ];
  const srcYs: Array<{ value: number; kind: "edge" | "center" }> = [
    { value: bbox.minY, kind: "edge" },
    { value: bbox.maxY, kind: "edge" },
    { value: cy,       kind: "center" },
  ];

  // Target X-values: vertical wall outer edges + wall midpoint Xs + object bbox Xs.
  // A wall outer edge contributes to X-snap only if the segment is near-vertical
  // (|b.x - a.x| < ε). Diagonal wall edges are tested as full line segments
  // (point-to-segment distance) — see §Diagonal walls.
  //
  // For each (srcX, targetX) pair: dxFt = |srcX - targetX|.
  //   if dxFt <= tolFt and dxFt is the best seen → record winner + priority.
  //   Priority: center+midpoint → 3, edge+edge → 2, edge+wall-face → 1.
  //   If new candidate has strictly smaller dxFt OR equal dxFt and higher priority, replace.
  //   Record SHIFT to apply: newX = currentX + (targetX - srcX).

  // Same algorithm independently for Y.

  // Assemble snapped:
  const snappedX = xWinner ? pos.x + xShift : (gridSnap > 0 ? snapTo(pos.x, gridSnap) : pos.x);
  const snappedY = yWinner ? pos.y + yShift : (gridSnap > 0 ? snapTo(pos.y, gridSnap) : pos.y);

  // Build guides:
  const guides: SnapGuide[] = [];
  if (xWinner) guides.push({ kind: "axis", axis: "x", value: xWinner.targetValue });
  if (yWinner) guides.push({ kind: "axis", axis: "y", value: yWinner.targetValue });
  if (xWinner?.isMidpoint) guides.push({ kind: "midpoint-dot", at: xWinner.midpointAt });
  if (yWinner?.isMidpoint) guides.push({ kind: "midpoint-dot", at: yWinner.midpointAt });

  return { snapped: { x: snappedX, y: snappedY }, guides };
}
```

### Pattern 3: Axis-aligned bbox of a rotated product (v1)

For a placed product at `(cx, cy)` with pre-rotation dims `(w, d)` and rotation `θ` (degrees):
```typescript
function axisAlignedBBoxOfRotated(
  center: Point, width: number, depth: number, rotationDeg: number, id: string,
): BBox {
  const θ = (rotationDeg * Math.PI) / 180;
  const c = Math.abs(Math.cos(θ));
  const s = Math.abs(Math.sin(θ));
  const halfW = (width * c + depth * s) / 2;
  const halfD = (width * s + depth * c) / 2;
  return {
    id,
    minX: center.x - halfW, maxX: center.x + halfW,
    minY: center.y - halfD, maxY: center.y + halfD,
  };
}
```
For ceilings (polygon): `minX = min(points.x)`, etc. For custom elements: same as products using `el.width`/`el.depth` × `sizeScale`.

### Pattern 4: Wall outer-edge derivation

`mitredWallCorners(wall, walls)` returns `[startLeft, startRight, endRight, endLeft]` (same order as `wallCorners`). Outer edges:
```typescript
const [sL, sR, eR, eL] = mitredWallCorners(wall, allWalls);
const leftEdge:  Segment = { a: sL, b: eL, wallId: wall.id };
const rightEdge: Segment = { a: sR, b: eR, wallId: wall.id };
```
Use `mitredWallCorners` (not `wallCorners`) so snap targets match what's visible on screen — avoids "why did it snap to an edge 3 inches off the wall".

**Diagonal walls:** a wall at 45° has no single X or Y to snap to. Two approaches:
- **Recommended (v1):** decompose each wall edge into its bounding-box extent. A 45° edge from `(0,0)` to `(10,10)` contributes `x ∈ [0,10]` and `y ∈ [0,10]`. Dragged-object edges snap to the **endpoints' X-values** (start.x and end.x) and **endpoints' Y-values**. This is a reasonable v1 simplification and matches D-02's "wall outer edges" literally interpreted.
- **Better (if time):** point-to-segment projection — for each dragged edge value, project onto the full 2D segment and keep the snap only if the perpendicular distance is ≤ tolFt. More correct but more math.

Recommend v1 simple endpoint approach; flag the diagonal-wall limitation in OPEN QUESTIONS.

### Pattern 5: Fabric guide rendering (mirrors `type: "dim"` precedent)

```typescript
// src/canvas/snapGuides.ts
import * as fabric from "fabric";
import type { SnapGuide } from "./snapEngine";

const GUIDE_COLOR = "#7c5bf0";
const GUIDE_OPACITY = 0.6;

export function clearSnapGuides(fc: fabric.Canvas): void {
  const toRemove = fc.getObjects().filter(
    (o) => (o as unknown as { data?: { type?: string } }).data?.type === "snap-guide",
  );
  for (const o of toRemove) fc.remove(o);
}

export function renderSnapGuides(
  fc: fabric.Canvas,
  guides: SnapGuide[],
  scale: number,
  origin: { x: number; y: number },
): void {
  clearSnapGuides(fc);
  const canvasW = fc.getWidth?.() ?? 0;
  const canvasH = fc.getHeight?.() ?? 0;
  for (const g of guides) {
    if (g.kind === "axis" && g.axis === "x") {
      const px = origin.x + g.value * scale;
      fc.add(new fabric.Line([px, 0, px, canvasH], {
        stroke: GUIDE_COLOR, opacity: GUIDE_OPACITY, strokeWidth: 1,
        selectable: false, evented: false,
        data: { type: "snap-guide" },
      }));
      // 6px tick at the nearest source edge — optional; can use the
      // candidate's bbox center in caller if desired.
    } else if (g.kind === "axis" && g.axis === "y") {
      const py = origin.y + g.value * scale;
      fc.add(new fabric.Line([0, py, canvasW, py], {
        stroke: GUIDE_COLOR, opacity: GUIDE_OPACITY, strokeWidth: 1,
        selectable: false, evented: false,
        data: { type: "snap-guide" },
      }));
    } else if (g.kind === "midpoint-dot") {
      const px = origin.x + g.at.x * scale;
      const py = origin.y + g.at.y * scale;
      fc.add(new fabric.Circle({
        left: px, top: py, radius: 4, fill: GUIDE_COLOR, opacity: GUIDE_OPACITY,
        originX: "center", originY: "center",
        selectable: false, evented: false,
        data: { type: "snap-guide" },
      }));
    }
  }
  fc.requestRenderAll();
}
```

The `data: { type: "snap-guide" }` tag is the cleanup key. `clearSnapGuides` is safe to call every mousemove (idempotent — removes then re-adds). Also called in each tool's `mouse:up` and `cleanup()`.

### Integration site 1: `productTool.ts` placement

The phase description says "hover/mousemove AND click-to-place" — but `productTool.ts` currently has NO `mouse:move` handler. Two options:
- **Minimal:** only wire smart snap at `onMouseDown` (the click-to-place path), matching the existing code. Compute snap once at click time, apply, place. Render guide briefly then `clearSnapGuides`.
- **Richer (recommended):** add an `onMouseMove` handler that renders guides during hover (so Jessica sees where it WILL snap before clicking). Minimal extra code. Clear guides on `mouse:leave` / cleanup.

Proposed replacement for `onMouseDown` (L21–33):
```typescript
const onMouseDown = (opt: fabric.TEvent) => {
  if (!pendingProductId) return;
  const pointer = fc.getViewportPoint(opt.e);
  const feet = pxToFeet(pointer, origin, scale);
  const gridSnap = useUIStore.getState().gridSnap;
  const altHeld = (opt.e as MouseEvent).altKey === true;

  let snapped = feet;
  if (altHeld) {
    snapped = gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;
  } else {
    // Build scene + candidate bbox. A new product hasn't been placed yet —
    // exclude-self id is a sentinel like "__pending__" that no real object has.
    const state = useCADStore.getState();
    const scene = buildSceneGeometry(state, "__pending__", _productLibrary, /*customCatalog*/ ...);
    const product = _productLibrary.find(p => p.id === pendingProductId);
    const { width, depth } = effectiveDimensions(product, 1);
    const bbox = axisAlignedBBoxOfRotated(feet, width, depth, 0, "__pending__");
    const result = computeSnap({
      candidate: { pos: feet, bbox }, scene, tolerancePx: SNAP_TOLERANCE_PX, scale, gridSnap,
    });
    snapped = result.snapped;
  }
  clearSnapGuides(fc);
  useCADStore.getState().placeProduct(pendingProductId, snapped);
};
```

**Note:** `productTool` doesn't have access to `_productLibrary` yet — the module-level bridge pattern exists in `selectTool` (`setSelectToolProductLibrary`). Planner must add a parallel bridge for `productTool` (e.g. `setProductToolLibrary(products)`) so `buildSceneGeometry` can resolve product dimensions. This is a real cross-cutting concern — call it out in the plan.

### Integration site 2: `selectTool.ts` generic move (~L873–890)

Current:
```typescript
if (!dragOffsetFeet) return;
const gridSnap = useUIStore.getState().gridSnap;
const targetX = feet.x - dragOffsetFeet.x;
const targetY = feet.y - dragOffsetFeet.y;
const snapped =
  gridSnap > 0 ? snapPoint({ x: targetX, y: targetY }, gridSnap) : { x: targetX, y: targetY };
```
Replacement (apply the snap to BOTH axes then route to ceiling/product/custom branches — existing code already does that):
```typescript
if (!dragOffsetFeet) return;
const gridSnap = useUIStore.getState().gridSnap;
const altHeld = (opt.e as MouseEvent).altKey === true;
const targetPos = { x: feet.x - dragOffsetFeet.x, y: feet.y - dragOffsetFeet.y };

let snapped = targetPos;
if (altHeld) {
  snapped = gridSnap > 0 ? snapPoint(targetPos, gridSnap) : targetPos;
} else {
  // SceneGeometry cached in closure, built once on mouse:down (see below).
  const bbox = computeCurrentDraggedBBox(dragId!, dragType, targetPos /* use this as center */);
  const result = computeSnap({
    candidate: { pos: targetPos, bbox }, scene: cachedScene!, tolerancePx: SNAP_TOLERANCE_PX, scale, gridSnap,
  });
  snapped = result.snapped;
  renderSnapGuides(fc, result.guides, scale, origin);
}
```
Then existing `if (dragType === "ceiling") ... else if (dragType === "product")` continues unchanged, consuming `snapped`.

**Where to build `cachedScene`:** in the `onMouseDown` block where `dragType === "product" | "ceiling"` is assigned. Add:
```typescript
cachedScene = buildSceneGeometry(useCADStore.getState(), hit.id, _productLibrary, customCatalog);
```
Clear on mouseup and cleanup (set to null).

**Where to clear guides:** in `onMouseUp` (alongside `clearSizeTag()`) and in the `cleanup` function (alongside the existing fast-path revert).

### Integration site 3: `ceilingTool.ts`

**Correction to phase description:** `ceilingTool.ts` L59–109 is **ceiling DRAWING** (click-to-place-vertex polygon building), not ceiling *dragging*. Ceiling **drag** (once placed) happens in `selectTool.ts`' generic-move branch via `dragType === "ceiling"`. So:
- **Option A (match the description literally):** smart-snap the polygon vertex placement in `ceilingTool.onMouseDown` and mousemove preview at L57–112. This snaps each vertex to nearby walls/edges as Jessica draws — useful!
- **Option B (interpret as "ceiling *repositioning*"):** no change to `ceilingTool.ts`; smart snap automatically applies via the `selectTool` integration above because ceiling-drag uses the generic-move branch.

Recommend **both**: Option B is free (comes with selectTool integration). Option A is a minor extra but adds real value — Jessica drawing a ceiling polygon wants each vertex to land on a wall edge. Scope decision for planner, but Option A is cheap.

### Anti-Patterns to Avoid

- **Don't build SceneGeometry on every mousemove.** Build once at drag start; cache in closure. Per D-09b.
- **Don't call store writes inside `computeSnap`.** Pure fn per D-01.
- **Don't forget `clearSnapGuides` in the cleanup() path.** Tool switch mid-drag must remove the guide Fabric objects, same as `clearSizeTag()` does for the size tag.
- **Don't apply smart snap THEN grid.** Per D-05b, grid is the **fallback when smart snap doesn't engage on an axis** — not a second pass.
- **Don't re-enter selected object as a snap target.** Exclude-self by id; bbox must have `id` field.
- **Don't mix pixel and feet tolerances.** `tolFt = tolerancePx / scale` recomputed per frame; never cache it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Point-to-segment distance | Custom perpendicular formula | Use `closestPointOnWall(wall, p).point` + `distance()` — already in `geometry.ts` | Already unit-tested and correct |
| Wall corner derivation | New "wall outer edge" math | `mitredWallCorners(wall, allWalls)` | Handles mitred joins; snap targets match screen |
| Tagged Fabric cleanup | New observer / id registry | `data: { type: "snap-guide" }` + `fc.getObjects().filter(...)` | Matches `type: "dim"` + `ceiling-edge-preview` precedent (2 existing callers) |
| Grid snap | Rewrite rounding | `snapPoint(feet, gridSnap)` from `geometry.ts` | Unchanged contract, trusted fallback |
| Canvas → feet conversion | New coord helper | `pxToFeet` from `toolUtils.ts` | Already shared |
| Toolbar → tool bridge for product library | New state mechanism | Module-level `_library` + `setXxxLibrary()` fn | Matches `setSelectToolProductLibrary` + `setPendingProduct` precedent (explicit D-07 pattern) |

## Runtime State Inventory

Not applicable — this is net-new code, not a rename/refactor/migration. No pre-existing smart-snap state to migrate. Phase 28 auto-save will pick up the resulting position changes naturally (they go through `moveProduct` / `updateCustomElement` / `updateCeiling` which already trigger auto-save).

## Common Pitfalls

### Pitfall 1: SceneGeometry mutates mid-drag
**What goes wrong:** Scene object lookups (`getActiveRoomDoc().walls`) return live Zustand references. If another tick modifies the store mid-drag (it shouldn't, but defensively), the snap scene changes under the engine.
**Why:** Zustand + Immer returns fresh object refs per commit, but the cached `scene` you grabbed holds the old ref. Actually a protection — the cache is effectively a snapshot.
**Avoid:** Build `SceneGeometry` as a plain data structure (arrays of Segments/BBoxes), NOT a reference to store state. The `buildSceneGeometry` function should fully materialize the arrays — no lazy getters.
**Warning sign:** If you pass `state.walls` (a Record) into `computeSnap`, you're doing it wrong.

### Pitfall 2: Guides persist after mouse:up
**What goes wrong:** User drags, releases, guide line stays on canvas.
**Why:** Forgot to `clearSnapGuides(fc)` in `onMouseUp` or `cleanup()`.
**Avoid:** Audit every tool integration. Both `mouse:up` AND `cleanup()` must call `clearSnapGuides`. Add a unit test that asserts no `type: "snap-guide"` objects remain after mouseup.

### Pitfall 3: Guides persist across tool switch
**What goes wrong:** Drag, user hits `V` to switch tool mid-drag (ESC-like behavior). Existing `cleanup()` reverts the drag, but guides linger.
**Why:** `cleanup()` doesn't call `clearSnapGuides`.
**Avoid:** The `cleanup()` return functions in `selectTool`, `productTool`, `ceilingTool` must call `clearSnapGuides(fc)` alongside the existing Fabric unbinding.

### Pitfall 4: Phase 25 drag fast-path regression
**What goes wrong:** Smart-snap code accidentally calls `useCADStore.getState().updateProductNoHistory(...)` mid-frame.
**Why:** Copy-paste from the pre-Phase-25 path.
**Avoid:** `computeSnap` is pure. The value it returns must be applied via **Fabric object mutation** in the fast-path branches (`dragPre.fabricObj.set({ left, top })`), NOT via a store write. Match the existing `dragPre.kind === "product"` branch exactly — only add snapping BEFORE `fabricObj.set(...)`.

### Pitfall 5: Alt-key chord confusion
**What goes wrong:** Alt is also the macOS "drag-duplicate" convention in some apps, or Meta-click on some systems.
**Why:** Platform ambiguity.
**Avoid:** Spec says `opt.e.altKey` — this is truthy for Option on macOS and Alt on Windows. Shift is already orthogonal-constrain in `wallTool`; Ctrl/Meta is multi-select in `selectTool` (L469). Alt is genuinely unused. Verify once at integration time.

### Pitfall 6: Midpoint snap vs edge snap both engaged
**What goes wrong:** Midpoint Y-snap wins on Y, edge-edge X-snap wins on X — but the midpoint dot is only drawn for the axis that won via midpoint. Might look inconsistent.
**Avoid:** Spec is clear per D-05a/D-06d: per-axis winners are independent; midpoint dot renders if the winning Y (or X) is a midpoint snap. Document the tiebreak in code comment.

### Pitfall 7: Tolerance in feet crosses grid boundary
**What goes wrong:** At very low zoom (small `scale`), `tolFt = 8/scale` gets huge — snaps engage everywhere.
**Why:** Pixel-based tolerance scales inversely with zoom; at extreme zoom-out, 8px can equal many feet.
**Avoid:** Cap `tolFt` at a sane max (e.g. `Math.min(8/scale, 2)` = never more than 2 feet). Optional improvement; note for planner.

## Code Examples

### Example: exclude-self in buildSceneGeometry
```typescript
export function buildSceneGeometry(
  state: ReturnType<typeof useCADStore.getState>,
  excludeId: string,
  productLibrary: Product[],
  customCatalog: Record<string, CustomElement>,
): SceneGeometry {
  const doc = state.activeRoomId ? state.rooms[state.activeRoomId] : null;
  if (!doc) return { wallEdges: [], wallMidpoints: [], objectBBoxes: [] };

  const allWalls = Object.values(doc.walls);
  const wallEdges: Segment[] = [];
  const wallMidpoints: Array<{ point: Point; wallId: string; axis: "x" | "y" | "diag" }> = [];

  for (const w of allWalls) {
    const [sL, sR, eR, eL] = mitredWallCorners(w, allWalls);
    wallEdges.push({ a: sL, b: eL, wallId: w.id });
    wallEdges.push({ a: sR, b: eR, wallId: w.id });
    wallMidpoints.push({
      point: { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 },
      wallId: w.id,
      axis: classifyAxis(w),
    });
  }

  const objectBBoxes: BBox[] = [];
  for (const pp of Object.values(doc.placedProducts)) {
    if (pp.id === excludeId) continue;
    const prod = productLibrary.find(p => p.id === pp.productId);
    const { width, depth } = effectiveDimensions(prod, pp.sizeScale);
    objectBBoxes.push(axisAlignedBBoxOfRotated(pp.position, width, depth, pp.rotation, pp.id));
  }
  for (const pce of Object.values(doc.placedCustomElements ?? {})) {
    if (pce.id === excludeId) continue;
    const el = customCatalog[pce.customElementId];
    if (!el) continue;
    const sc = pce.sizeScale ?? 1;
    objectBBoxes.push(
      axisAlignedBBoxOfRotated(pce.position, el.width * sc, el.depth * sc, pce.rotation, pce.id),
    );
  }
  for (const c of Object.values(doc.ceilings ?? {})) {
    if (c.id === excludeId) continue;
    const xs = c.points.map(p => p.x);
    const ys = c.points.map(p => p.y);
    objectBBoxes.push({
      id: c.id,
      minX: Math.min(...xs), maxX: Math.max(...xs),
      minY: Math.min(...ys), maxY: Math.max(...ys),
    });
  }

  return { wallEdges, wallMidpoints, objectBBoxes };
}
```

### Example: per-axis scan (abbreviated)
```typescript
type Winner = {
  dxFt: number;
  priority: 1 | 2 | 3;
  targetValue: number;        // the world-feet X or Y of the target
  isMidpoint: boolean;
  midpointAt?: Point;
  srcValue: number;           // the dragged-obj src edge/center that won
};

function scanAxis(
  srcs: Array<{ value: number; kind: "edge" | "center" }>,
  targets: Array<{ value: number; kind: "wall-face" | "object-edge" | "midpoint"; midpointAt?: Point }>,
  tolFt: number,
): Winner | null {
  let best: Winner | null = null;
  for (const s of srcs) {
    for (const t of targets) {
      // Only center → midpoint pairs are "midpoint snaps".
      if (t.kind === "midpoint" && s.kind !== "center") continue;
      const dx = Math.abs(s.value - t.value);
      if (dx > tolFt) continue;
      const priority: 1 | 2 | 3 =
        t.kind === "midpoint" ? 3 : t.kind === "object-edge" ? 2 : 1;
      if (!best
          || dx < best.dxFt - 1e-9
          || (Math.abs(dx - best.dxFt) < 1e-9 && priority > best.priority)) {
        best = {
          dxFt: dx, priority,
          targetValue: t.value,
          isMidpoint: t.kind === "midpoint",
          midpointAt: t.midpointAt,
          srcValue: s.value,
        };
      }
    }
  }
  return best;
}
```

### Example: integration test via driver pattern (mirrors Phase 29)

Following `tests/dimensionEditor.test.ts` — tools can expose a `window.__driveSnap` helper in test mode so RTL can invoke without simulating real fabric mouse events.

```typescript
// In tool (dev/test only):
if (import.meta.env.MODE === "test") {
  (window as any).__driveSnap = (candidatePos: Point) => {
    // invoke the same code path as onMouseMove
  };
}

// In test:
it("drags a product near a wall edge and snaps X to wall face", async () => {
  renderAppWithRoom({ walls: [{ start: {x:0,y:0}, end: {x:0,y:10}, thickness: 0.5 }] });
  // place a product at (3, 5)
  // drive drag with candidate (0.3, 5) — within 8px tolerance at default scale
  (window as any).__driveSnap({ x: 0.3, y: 5 });
  // assert store has product at x ≈ 0.25 (wall outer edge right face)
});
```

Alternatively: reuse `tests/dragIntegration.test.ts` harness (already exists for Phase 25) and extend with snap scenarios.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Grid-only snap via `snapPoint()` everywhere | Grid is per-axis **fallback**; smart snap is primary when a candidate is within tolerance | This phase (30) | User gets Figma-like alignment without a manual toggle |
| Module-level `const state = {...}` in tools | Per-activation closure state; module-level only for explicit bridges (D-07) | Phase 26 tool cleanup refactor | Applies here: put `cachedScene` in the `activateSelectTool` closure, NOT module level |
| Fabric objects finalized on every store update | Phase 25 drag fast-path: Fabric mutation + single commit at mouse:up | Phase 25 | Smart snap MUST preserve this — guides are Fabric ephemera, snap value flows through the same single-commit path |

## Open Questions

1. **Diagonal walls and axis snap**
   - What we know: A 45° wall has no clean X or Y axis to snap to; SNAP-01 says "edges snap to edges".
   - What's unclear: v1 should use endpoint X/Y of the diagonal edge, OR full point-to-segment distance with perpendicular projection?
   - Recommendation: v1 = endpoint-only (cheap, documented limitation). Later = perpendicular projection. Planner decides based on wave budget.

2. **Guide tick marker (6px)**
   - What we know: D-06 says "plus a small tick (~6px) at the exact snap point".
   - What's unclear: "the exact snap point" = the dragged object's edge position? Or the target's position on the wall?
   - Recommendation: render at the target (visually clearer "this is what you aligned to"); small filled square or circle, separate from the full-canvas axis line.

3. **Alt detection timing**
   - What we know: `opt.e.altKey` is checked per mousemove.
   - What's unclear: What if user presses/releases Alt MID-drag? Should guides appear/disappear mid-gesture?
   - Recommendation: Yes, check altKey every frame; disabling is live. Natural behavior. No state to track.

4. **Product library access from `productTool`**
   - What we know: `productTool.ts` has no product library today — `placeProduct(id, pos)` stores only the id. But smart snap needs the pending product's dims to compute the bbox.
   - What's unclear: Add a `setProductToolLibrary()` bridge (parallel to `setSelectToolProductLibrary`), or access via a singleton import?
   - Recommendation: Add the bridge — matches existing pattern (D-07 public-API bridges are intentional).

5. **Is `bbox.id` redundant given the caller provides scene.excludeId?**
   - What we know: `buildSceneGeometry(state, excludeId)` already filters out the dragged object.
   - What's unclear: Do we ALSO need `bbox.id` on the source side?
   - Recommendation: Keep it for robustness (defense in depth) but optional. Planner can remove if they prefer.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| fabric | 2D canvas + guide rendering | ✓ | v6.9.1 | — |
| Node.js / npm | Build + tests | ✓ | via Vite | — |
| vitest | Unit tests | ✓ | (project runs tests via `npm test`) | — |
| @testing-library/react | Integration tests | ✓ | present in existing RTL tests (`dimensionOverlay.test.tsx`, `dragIntegration.test.ts`) | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

All work is achievable with the existing toolchain — no new npm installs required.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing; runs via `npm test`) |
| Config file | `vitest.config.ts` (inferred from existing `tests/*.test.ts`) |
| Quick run command | `npx vitest run tests/snapEngine.test.ts` |
| Full suite command | `npm test` (or `npx vitest run`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SNAP-01 | Dragged edge X within tolerance of wall face X → snaps X | unit | `npx vitest run tests/snapEngine.test.ts -t "edge snaps to wall face X"` | ❌ Wave 0 |
| SNAP-01 | Dragged edge Y within tolerance of other object bbox edge → snaps Y | unit | `npx vitest run tests/snapEngine.test.ts -t "edge snaps to object bbox edge Y"` | ❌ Wave 0 |
| SNAP-01 | Out-of-tolerance on both axes → returns grid-rounded value | unit | `npx vitest run tests/snapEngine.test.ts -t "falls back to grid when out of tolerance"` | ❌ Wave 0 |
| SNAP-01 | Out-of-tolerance and `gridSnap=0` → returns candidate unchanged | unit | `npx vitest run tests/snapEngine.test.ts -t "no snap no grid returns input"` | ❌ Wave 0 |
| SNAP-01 | excludeId is filtered from SceneGeometry | unit | `npx vitest run tests/snapEngine.test.ts -t "buildSceneGeometry excludes self"` | ❌ Wave 0 |
| SNAP-01 | Per-axis independent (X snaps, Y uses grid) | unit | `npx vitest run tests/snapEngine.test.ts -t "per-axis independent"` | ❌ Wave 0 |
| SNAP-01 | Tolerance uses `tolerancePx/scale` | unit | `npx vitest run tests/snapEngine.test.ts -t "tolerance scales with zoom"` | ❌ Wave 0 |
| SNAP-01 | altKey disables smart snap → grid only (integration check) | unit (caller-level) | `npx vitest run tests/snapEngine.test.ts -t "alt disable integration contract"` | ❌ Wave 0 |
| SNAP-02 | Dragged center within tolerance of wall midpoint → snaps center to midpoint | unit | `npx vitest run tests/snapEngine.test.ts -t "center snaps to wall midpoint"` | ❌ Wave 0 |
| SNAP-02 | Midpoint snap wins tiebreak over edge-edge at equal distance | unit | `npx vitest run tests/snapEngine.test.ts -t "midpoint wins equal-dist tiebreak"` | ❌ Wave 0 |
| SNAP-02 | Midpoint snap emits `midpoint-dot` guide with correct `at` point | unit | `npx vitest run tests/snapEngine.test.ts -t "midpoint snap emits midpoint-dot"` | ❌ Wave 0 |
| SNAP-03 | X-snap emits `{ kind: "axis", axis: "x", value }` with world-feet value | unit | `npx vitest run tests/snapEngine.test.ts -t "emits x-axis guide"` | ❌ Wave 0 |
| SNAP-03 | Both axes snap → 2 guides returned (crosshair case) | unit | `npx vitest run tests/snapEngine.test.ts -t "emits both guides on crosshair"` | ❌ Wave 0 |
| SNAP-03 | `renderSnapGuides` adds Fabric objects tagged `snap-guide`; `clearSnapGuides` removes them | unit | `npx vitest run tests/snapGuides.test.ts -t "render + clear snap guides"` | ❌ Wave 0 |
| SNAP-03 | RTL: drag product near wall → store commits snapped position AND canvas has `snap-guide` object during drag, zero after mouseup | integration | `npx vitest run tests/snapIntegration.test.ts -t "product drag shows guide and commits snapped"` | ❌ Wave 0 |
| SNAP-03 | RTL: Alt held during drag → no `snap-guide` objects rendered; grid-rounded commit | integration | `npx vitest run tests/snapIntegration.test.ts -t "alt disables smart snap"` | ❌ Wave 0 |
| (perf) | 50 walls + 20 products, 100 `computeSnap` calls < 50ms total | unit bench | `npx vitest run tests/snapEngine.test.ts -t "perf 100 frames budget"` | ❌ Wave 0 (optional) |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/snapEngine.test.ts tests/snapGuides.test.ts`
- **Per wave merge:** `npx vitest run tests/snap*.test.ts tests/dragIntegration.test.ts tests/toolCleanup.test.ts`
- **Phase gate:** `npm test` (full suite) green before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `tests/snapEngine.test.ts` — pure unit tests (required; covers SNAP-01/02/03 math + guide descriptor shape)
- [ ] `tests/snapGuides.test.ts` — Fabric render/clear unit test using a headless `new fabric.StaticCanvas(null)` or the existing `fabricSync.test.ts` harness
- [ ] `tests/snapIntegration.test.ts` — RTL end-to-end (product drag shows guide, commits snapped position, Alt disables)
- [ ] Add `window.__driveSnap` hook in each tool under `if (import.meta.env.MODE === "test")` OR extend `tests/dragIntegration.test.ts` with snap scenarios (preferred — reuses existing harness)

*(No framework install — vitest + RTL + fabric already present. No new test-infra dependencies.)*

## Sources

### Primary (HIGH confidence)
- `.planning/phases/30-smart-snapping/30-CONTEXT.md` — locked decisions D-01 through D-09c
- `.planning/REQUIREMENTS.md` — SNAP-01, SNAP-02, SNAP-03
- `src/canvas/tools/selectTool.ts` — generic-move branch at L873–890; drag fast-path machinery
- `src/canvas/tools/productTool.ts` — L21–33 placement path
- `src/canvas/tools/ceilingTool.ts` — L57–109 drawing path
- `src/canvas/tools/toolUtils.ts` — `pxToFeet` + `findClosestWall` helpers
- `src/lib/geometry.ts` — `closestPointOnWall`, `wallCorners`, `mitredWallCorners`, `snapPoint`, `distance`
- `src/types/cad.ts` — Point, WallSegment, PlacedProduct, PlacedCustomElement, Ceiling
- `src/canvas/dimensions.ts` — tagged Fabric object pattern (`data: { type: "dim" }`), referenced at lines 23/29/43/51/57/72/133
- `src/canvas/tools/ceilingTool.ts:38–42` — second tagged-cleanup precedent (`ceiling-edge-preview`)
- `tests/geometry.test.ts` — unit-test pattern to mirror
- `.planning/config.json` — confirms `nyquist_validation: true`, so Validation Architecture section required

### Secondary (MEDIUM confidence)
- `tests/dragIntegration.test.ts` (referenced by name; Phase 25 drag harness) — integration test reuse candidate
- `tests/dimensionEditor.test.ts` (Phase 29 driver pattern) — `window.__driveX` convention

### Tertiary (LOW confidence)
- None — no external web research needed; all dependencies are in-repo.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all modules inspected first-hand; no new deps.
- Architecture: HIGH — patterns match existing `dragPre` + `setXxxLibrary` + `type: "dim"` precedents.
- Pitfalls: HIGH for #1–#4 (direct inspection of code that must not regress); MEDIUM for #6–#7 (domain judgement).
- Diagonal-wall handling: MEDIUM — v1 simplification is a judgment call; flagged in OPEN QUESTIONS.
- Integration sites: HIGH — line numbers verified by reading the current files.

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (code locality makes this research stable; invalidated only if Phase 25 fast-path or tool-cleanup pattern changes)
