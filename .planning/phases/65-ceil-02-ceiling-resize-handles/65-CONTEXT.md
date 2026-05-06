---
phase: 65-ceil-02-ceiling-resize-handles
type: context
created: 2026-05-06
status: ready-for-research
requirements: [CEIL-02]
depends_on: [Phase 31 size-override resolver pattern + edge-handle drag, Phase 30 smart-snap engine, Phase 53 right-click "Reset size" action, Phase 12+ Ceiling polygon model (CCW points), CEIL.tsx + CeilingMesh.tsx renderers]
---

# Phase 65: Ceiling Resize Handles (CEIL-02) — Context

## Goal

Add edge-handle resize to ceilings. Currently users can only delete + redraw a ceiling. Mirror the Phase 31 product-resize pattern, adapted for the polygon-based ceiling model.

Source: REQUIREMENTS.md `CEIL-02` ([#70](https://github.com/micahbank2/room-cad-renderer/issues/70), promoted from Phase 999.1 backlog after re-deferral from v1.9 twice).

## Pre-existing infrastructure

- **Phase 31** `src/types/product.ts` `resolveEffectiveDims` pattern + edge-handle drag transaction (`update*(id, {})` to push history snapshot, `*NoHistory` mid-drag, single undo per drag). Direct template for ceiling resize.
- **Phase 30** `src/canvas/snapEngine.ts` + `src/canvas/snapGuides.ts` — smart-snap. Ceiling resize consumes wall-edge snap targets; doesn't add new ones. Mirrors Phase 60/61/62 consume-only pattern.
- **`src/types/cad.ts:197-228`** — existing `Ceiling` type. `points: Point[]` is the polygon (CCW winding). v1.16 adds two optional override fields.
- **`src/canvas/fabricSync.ts:165-187`** — existing `resize-handle` and `resize-handle-edge` Fabric pattern from Phase 31 product. Ceilings get the same wrapper structure with new `data.ceilingId`.
- **Phase 53** right-click menu — extend with "Reset size" action when ceiling has override fields set (mirrors product/customElement reset action from v1.6).
- **Phase 47 RoomGroup** — multi-room render. Ceilings render per-room; resize is local to the active room.

## Decisions

### D-01 — Polygon support: all polygons via proportional bbox scaling

User-facing choice. Compute the ceiling's axis-aligned bounding box (`bboxWidth`, `bboxDepth`). Show 4 edge handles at bbox-edge midpoints. Drag an edge → scale ALL polygon vertices proportionally along that axis:

```ts
// Drag east edge → newBboxWidth
const sx = newBboxWidth / oldBboxWidth;
const newPoints = ceiling.points.map((p) => ({
  x: bbox.minX + (p.x - bbox.minX) * sx,
  y: p.y,
}));
```

For L-shaped or hexagonal ceilings, the entire shape stretches uniformly. Standard CAD-tool behavior (SketchUp, Revit). Works for any polygon shape — no special-casing for "is this a rectangle?"

**Why proportional scaling over rectangles-only:** L-shapes are common (open-plan kitchen+dining), and the proportional approach handles them correctly without forcing the user to redraw.

### D-02 — Handle anchoring: bbox edge midpoints (4 handles)

User-facing choice. 4 handles at the midpoints of the bounding-box edges (N/S/E/W). Identical positioning logic to Phase 31 product-resize edge handles. NO corner handles for v1.16 — corner uniform-scale on a polygon is geometrically weird (which corner of an L-shape?).

If users want uniform scaling later, that's a v1.17 follow-up. For now: edge handles only.

### D-03 — Storage: override fields + render-time scale resolver

User-facing choice. Mirror Phase 31's pattern exactly:
- Add two optional fields to `Ceiling`:
  - `widthFtOverride?: number` — target bbox width
  - `depthFtOverride?: number` — target bbox depth
- Original `points` array is **preserved unchanged**. The ceiling's polygon shape is the source of truth.
- New helper `resolveCeilingPoints(ceiling): Point[]` computes scaled points at render time:
  - If neither override is set → return `ceiling.points` unchanged
  - If overrides are set → compute scale factors `sx = widthFtOverride / bboxWidth`, `sy = depthFtOverride / bboxDepth`, scale each vertex from `bbox.min`

**Why override pattern over mutate-and-keep-original:**
- Snapshot back-compat: existing ceilings have no `originalPoints` field, so a mutate-then-restore approach would fail RESET_SIZE on old saves. Override pattern works on every existing ceiling immediately.
- Single-source-of-truth: the polygon shape is `points`, period. Resize is purely a render concern.
- Matches Phase 31 product pattern → code reuse + audit consistency.

### D-04 — Snap behavior: Phase 30 consume-only

User-facing choice. Mirror Phase 60 D-05 + Phase 61 D-09 + Phase 62 D-09 — consume snap targets but don't contribute. Ceiling drag uses `computeSnap()` against the existing snap scene (wall endpoints + midpoints). Hold Alt to disable smart-snap (existing convention). Grid snap remains active with Alt held.

`buildSceneGeometry()` and `snapEngine.ts` files **untouched** (verified post-execution via `git diff`).

### D-05 — Drag transaction: Phase 31 single-undo pattern

```ts
// On drag start (mousedown on edge handle):
useCADStore.getState().updateCeiling(ceilingId, {});  // pushes history snapshot

// On drag move (mousemove):
useCADStore.getState().updateCeilingNoHistory(ceilingId, {
  widthFtOverride: newWidth,
});

// Mouseup → no commit needed, history already has the start snapshot
```

Verify gate: `past.length` increments by exactly 1 per complete drag (regardless of mousemove count). Mirrors Phase 31 product Pitfall 1.

### D-06 — Reset action: Phase 53 right-click + PropertiesPanel button

Two affordances for clearing overrides:
1. **Phase 53 right-click → "Reset size"** action. Active only when at least one override is set. Calls new `clearCeilingOverrides(ceilingId)` action. Already a precedent: `clearProductOverrides`, `clearCustomElementOverrides` exist from Phase 31.
2. **PropertiesPanel RESET_SIZE button** next to the width/depth display rows. Visible only when overrides set.

### D-07 — Ceiling 3D rendering integration

`CeilingMesh.tsx` already builds the polygon mesh from `ceiling.points`. v1.16 adds a one-line resolver call:
```tsx
const renderedPoints = resolveCeilingPoints(ceiling);
// build THREE.Shape from renderedPoints instead of ceiling.points
```
3D updates live as the user drags. No separate 3D handle work — drag happens in 2D, 3D mesh re-extrudes from the resolved points each frame.

### D-08 — PropertiesPanel rows

Mirror Phase 31 product "Width / Depth" inputs:
- "WIDTH" feet+inches input → writes `widthFtOverride`
- "DEPTH" feet+inches input → writes `depthFtOverride`
- RESET_SIZE button when at least one override is set
- Single-undo via `updateCeilingNoHistory` mid-keystroke + `updateCeiling` on Enter/blur (Phase 31 InlineEditableText pattern)

### D-09 — cadStore actions

New (mirror existing `resizeProductAxis` / `resizeCustomElementAxis`):
- `resizeCeilingAxis(ceilingId, axis: "width" | "depth", value: number)` — pushes history
- `resizeCeilingAxisNoHistory(ceilingId, axis, value)` — mid-drag, no history
- `clearCeilingOverrides(ceilingId)` — RESET_SIZE handler

### D-10 — Test coverage

**Unit (vitest):**
1. `resolveCeilingPoints` returns original points when no overrides set
2. `resolveCeilingPoints` scales L-shape vertices proportionally on width override
3. `resolveCeilingPoints` scales hexagonal vertices proportionally on depth override
4. `resolveCeilingPoints` handles both width + depth overrides simultaneously
5. `resizeCeilingAxis` pushes exactly one history entry
6. `clearCeilingOverrides` reverts to original points and clears both override fields

**Component (vitest + RTL):**
7. PropertiesPanel for selected ceiling shows width/depth inputs + RESET_SIZE button when overrides set
8. Width input commit dispatches `resizeCeilingAxis("width", value)` on Enter

**E2E (Playwright):**
9. Click ceiling in 2D → 4 edge handles appear at bbox edges
10. Drag east edge → bbox extends; PropertiesPanel WIDTH updates live; 3D ceiling re-extrudes
11. Smart-snap: drag west edge near wall → snap engages; release → ceiling flush against wall
12. Right-click ceiling with overrides → "Reset size" action visible; click → polygon returns to original
13. Single Ctrl+Z undoes the entire drag (one history entry, not many)
14. L-shape ceiling: drag east edge → all polygon vertices scale proportionally; shape preserved

### D-11 — Atomic commits per task

Mirror Phase 49–64.

### D-12 — Zero regressions

- Phase 12 ceiling polygon model unchanged (existing `Ceiling.points` is preserved as source of truth)
- Phase 18 paint / Phase 20 surface materials / Phase 32 PBR / Phase 34 user-textures all render via existing `resolveCeilingPoints` consumer (just receives possibly-scaled points)
- Phase 30 smart-snap: `snapEngine.ts` and `buildSceneGeometry.ts` untouched (consume-only)
- Phase 31 product / customElement size-override unchanged
- Phase 42 `Ceiling.scaleFt` (per-ceiling tile-size) unchanged — independent field, doesn't interact with shape resize
- Phase 46 tree visibility cascade unchanged
- Phase 47 RoomGroup multi-room render unchanged
- Phase 48 saved-camera unchanged
- Phase 53 right-click menu — adds one new action ("Reset size") only when applicable
- Phase 54 click-to-select — existing ceiling selection works; resize handles attach to selected ceiling
- Phase 55-62 GLTF / cutaway / stairs / openings / measurements unchanged
- 4 pre-existing vitest failures unchanged
- Snapshot back-compat: existing ceilings load without `widthFtOverride` / `depthFtOverride` fields → `resolveCeilingPoints` returns original points (zero behavior change)
- **NO snapshot version bump** — additive optional fields are back-compat (per Phase 61 OPEN-01 precedent)

## Out of scope (this phase)

- Corner handles for uniform scaling (geometrically weird on polygons; defer)
- Per-vertex drag (move individual polygon corners) — fundamentally different operation, separate phase if needed
- Auto-redraw / convert-to-rectangle option — unnecessary; proportional scaling covers all shapes
- Resize via PropertiesPanel slider only (no drag handles) — drag handles ARE the primary affordance
- Snap to other ceilings — only walls (consume-only)
- Body drag to move the ceiling — selectTool already handles this for ceilings; not new
- Live width/depth label overlay during drag — Phase 31 doesn't have this either; Properties panel updates live which is sufficient

## Files we expect to touch

- `src/types/cad.ts` — add `widthFtOverride?` and `depthFtOverride?` to `Ceiling` interface
- `src/lib/geometry.ts` — add `resolveCeilingPoints(ceiling): Point[]` helper + `polygonBbox(points): { minX, minY, maxX, maxY, width, depth }` if not already there
- `src/stores/cadStore.ts` — `resizeCeilingAxis`, `resizeCeilingAxisNoHistory`, `clearCeilingOverrides` actions
- `src/canvas/fabricSync.ts` — render 4 edge handles for selected ceilings (mirror existing product edge-handle code path); compute handle positions from `resolveCeilingPoints` bbox
- `src/canvas/tools/selectTool.ts` — extend edge-handle drag handler to recognize ceiling edge handles + dispatch resize actions; add Phase 30 snap on drag move
- `src/three/CeilingMesh.tsx` — replace `ceiling.points` with `resolveCeilingPoints(ceiling)` (one-line change)
- `src/components/PropertiesPanel.tsx` — extend ceiling section with width/depth inputs + RESET_SIZE button (when overrides set)
- `src/components/CanvasContextMenu.tsx` — add "Reset size" action to ceiling menu (visible when overrides set)
- `src/test-utils/ceilingDrivers.ts` — NEW: `__driveCeilingResize(ceilingId, axis, value)`, `__getCeilingBbox(ceilingId)`, `__getCeilingResolvedPoints(ceilingId)`
- `tests/lib/resolveCeilingPoints.test.ts` — NEW (4 unit tests U1-U4)
- `tests/stores/cadStore.ceiling-resize.test.ts` — NEW (2 unit tests U5-U6)
- `tests/components/PropertiesPanel.ceiling-resize.test.tsx` — NEW (2 component tests C1-C2)
- `e2e/ceiling-resize.spec.ts` — NEW (6 e2e scenarios E1-E6)

Estimated 1 plan, 6-7 tasks, ~13 files. Mid-size phase, smaller than Phase 60/62 because it's pure feature extension on an existing entity.

## Open questions for research phase

1. **Existing edge-handle code path:** Phase 31 product-resize uses `data.placedId` + `corner: "ne" | "nw" | "se" | "sw"` for corners and `data.placedId` + `edge: "n" | "s" | "e" | "w"` for edges (per `fabricSync.ts:165-187`). What's the cleanest way to add a parallel `data.ceilingId` + `edge` discriminator without bloating selectTool's hit-test? Confirm the dispatch pattern in `selectTool.ts`.

2. **`polygonBbox` helper location:** is there an existing helper in `src/lib/geometry.ts`? If yes, reuse. If no, where to add — geometry.ts or a new ceiling-specific module? Recommend geometry.ts to keep generic.

3. **Phase 30 snap dispatch from selectTool drag:** Phase 30's `computeSnap()` is invoked by `productTool.ts` and `wallEndpointSnap.ts`. For ceiling-resize drag (which is in selectTool, not a placement tool), what's the integration shape? Likely add a helper that selectTool calls during edge-handle drag. Research confirms.

4. **CanvasContextMenu "Reset size" wiring:** Phase 53's `getActionsForKind('ceiling')` exists per Phase 53 work. Is there already a precedent for conditional actions (visible only when X)? Phase 31 product has Reset Size — confirm the pattern + extend.

5. **Smart-snap visual feedback during drag:** Phase 30 draws purple accent guides via `snapGuides.ts`. Confirm this works automatically via the snap engine, or whether selectTool needs to explicitly draw guides during ceiling-resize drag.

6. **3D mesh re-extrude performance:** for L-shape ceilings with 6+ vertices, re-extruding the THREE.Shape on every mousemove (~60 fps) might cause GPU thrashing. Confirm via mid-drag profiling that `<CeilingMesh>` debounces or uses `useMemo` correctly. Phase 25 PERF-01 fast-path may apply.

7. **Polygon points field semantics during drag:** `points` array is the source of truth (D-03). But the bbox computation needs the LIVE size during a drag. Does `widthFtOverride` semantics mean "target absolute bbox width" OR "scale relative to original"? Mirror Phase 31: target absolute. Lock during research if any ambiguity.
