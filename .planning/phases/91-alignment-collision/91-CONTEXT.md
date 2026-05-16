# Phase 91 — Object-to-Object Alignment Guides + Collision Detection

**Captured:** 2026-05-15
**Branch:** `gsd/phase-91-alignment-collision`
**Research:** [91-RESEARCH.md](./91-RESEARCH.md)

## Summary

Two small, contained extensions to the 2D canvas. (1) Adds **object-center** axis targets to the Phase 30 snap engine (center-to-center alignment was deferred from Phase 85 D-02) and wires **columns** + **stairs** into the snap scene as targets. (2) Adds **object-vs-object collision** so dragging a chair into another chair refuses the move silently. No new milestone — ships as a Polish Phase.

## Locked Decisions

### D-01 — Standalone polish phase (no v1.xx milestone)

Mirrors Phases 87 / 88 / 89 / 90: a Polish Phase listed under "Polish Phases" in `ROADMAP.md`, not tied to a versioned milestone. Ships as soon as verification passes.

### D-02 — Centers + edges as snap targets, both axes

Six snap modes per object pair: **center-X, center-Y, edge-left, edge-right, edge-top, edge-bottom**. Edges already work (Phase 30 `objectBBoxes`); this phase adds **center-X and center-Y** by extending the snap scene with an `objectCenters: Point[]` list.

**Equal-spacing snap is NOT in v1** — deferred to a follow-up phase. Equal-spacing requires a different algorithm (3-object detection) and is rare in interior-design workflows.

Implemented as a surgical extension of Phase 30 `snapEngine.ts`. No new module.

### D-03 — Silent refuse on collision

When the drop position would cause AABB intersection with another object, the move is **rejected silently** — the last valid position stays, no visual feedback, no toast, no red highlight. Predictable; matches Jessica's expectation of "the object can't go there."

**Red-highlight feedback is NOT in v1** — deferred. If Jessica complains the silent refuse feels broken, a 500ms red flash on the blocked object is the v1.1 layer.

### D-04 — Stairs are snap targets only

Stairs contribute to the snap scene (other objects can snap to their bbox edges + center), but **stair-drag itself is not extended in this phase**. There's no `moveStair` action in `cadStore.ts` today — only `removeStair` and the placement tool. Adding stair-drag-with-snap is a separate follow-on phase.

`buildSceneGeometry` must compute the stair bbox from `Stair.position` (which is bottom-step center per `cad.ts:160`) by offsetting along the rotation-implied UP vector by `(stepCount × runIn / 12) / 2`. Width is `widthFtOverride ?? DEFAULT_STAIR_WIDTH_FT` (3 ft).

### D-05 — Center beats edge when equally close

Priority ladder for snap selection (per-axis tiebreak):

```
priority 4 = midpoint (wall midpoint — center→midpoint only)
priority 3 = object-center        ← NEW in Phase 91
priority 2 = object-edge
priority 1 = wall-face
```

If both an object-center target and an object-edge target are within tolerance at the same distance, **center wins** — center alignment is the more meaningful intent in interior design. Phase 30's 3-tier ladder is renumbered to 4-tier.

### D-06 — Phase 25 transaction pattern preserved

Drag flow stays as-is: an empty `update*(id, {})` at drag start (pushes one history snapshot) + `*NoHistory` mid-drag. Snap + collision both apply to **mid-drag positions only**. The final position on mouseup is the snap-resolved, collision-resolved position. **No extra history entry** is pushed by snap or collision — the single drag-start snapshot remains the only history mutation per drag.

Phase 25 PERF-01 fast-path (`dragPre.fabricObj.set({...})`) is preserved: snap result is the input to `dragPre.fabricObj.set`; collision check runs between snap and `set`.

### D-07 — Naive O(n) AABB collision is fine for v1

Spatial hashing is NOT needed until product count exceeds ~50 (Jessica's projects are far below that). AABB uses Phase 30's `axisAlignedBBoxOfRotated` helper for rotated entities — over-conservative for 45°-rotated long objects (a 4ft×1ft couch becomes a ~3.5ft×3.5ft AABB) but **consistent across all entity types** and reuses the bboxes the snap engine already computes. True oriented-bbox collision is a follow-on.

Collision check reuses `cachedScene.objectBBoxes` (already built at drag start, exclude-self applied). No new scan, no new cache.

**Walls are NOT collision sources.** Walls are line segments, not bboxes — wall-vs-product collision is out of scope (and out-of-room placement is governed by a different system).

## Scope Boundaries

**In scope:**
- Object-center axis targets in snap engine (X + Y axes)
- Columns added to snap scene (bbox + center)
- Stairs added to snap scene (bbox + center, target-only)
- Columns wired into drag handler's smart-snap path (reverses the D-08a stair-precedent skip at `selectTool.ts:1500`)
- Silent-refuse AABB collision between products / custom-elements / columns / ceilings during drag
- Snap-then-collide ordering: snap runs first, then collision check on the snapped bbox

**Out of scope (deferred):**
- Equal-spacing snap (3-object detection) — v1.1 candidate
- Red-highlight collision feedback (500ms flash) — v1.1 candidate
- Stair drag with snap — separate follow-on phase (requires new `moveStair` action)
- Wall-vs-product collision — different system (out-of-room placement)
- True OBB collision for rotated objects — follow-on; AABB is good enough
- Spatial hashing / quad-tree — not needed under 50 objects

## Files Touched

| File | Purpose | Plan |
|------|---------|------|
| `src/canvas/snapEngine.ts` | Add `objectCenters` to `SceneGeometry`; emit object-center axis targets in `computeSnap`; extend `buildSceneGeometry` for columns + stairs | 91-01 |
| `src/canvas/tools/selectTool.ts` | Add `"column"` to smart-snap-target gating; extend cached-scene gating to include columns; remove D-08a-precedent skip comment; collision check between snap and fabric.set | 91-01, 91-02 |
| `src/canvas/objectCollision.ts` (NEW) | `wouldCollide(draggedBBox, sceneBBoxes): boolean` | 91-02 |
| `tests/snapEngine.objectCenters.test.ts` (NEW) | Unit RED→GREEN for center-to-center | 91-01 |
| `tests/objectCollision.test.ts` (NEW) | Unit RED→GREEN for AABB intersection | 91-02 |
| `tests/e2e/specs/91-alignment-collision.spec.ts` (NEW) | E2E RED→GREEN for center-snap + collision-refuse | 91-01, 91-02 |

## Test Bridges

Existing bridges to leverage:
- `useUIStore.getState().setActiveTool("select")` — activate Select tool
- `useUIStore.getState().gridSnap` — read grid-snap setting
- `useCADStore.getState().rooms[roomId].placedProducts` — read placed product positions for assertions
- `window.__driveResize` (Phase 31) — existing drag-driver pattern, may extend for object-move drag

May need to add (during execution — confirm by reading playwright-helpers):
- `window.__driveDragProduct(productId, fromFeet, toFeet)` if no existing helper drives mouse-down → move → up on a product.
- `window.__driveGetSnapGuides()` if assertions on the rendered accent-purple guide are needed (otherwise read `result.guides` via unit tests and use position assertions in e2e).

## Sequencing

Plan **91-01** must land before **91-02** — they share the same drag handler in `selectTool.ts` (mid-drag move callback at `:1442-1473`). Plan 91-02 plugs the collision check into the same code path Plan 91-01 just touched. Sequential, not parallel.

## Risks

- **Stair bbox-center math bug.** `Stair.position` is bottom-step center, NOT bbox center (`cad.ts:160`). Easy to get the offset direction wrong. Mitigation: dedicated unit test for `buildSceneGeometry` on a 90°-rotated stair.
- **Snap-then-collide ordering.** If we collision-check first then snap, you can snap into a collision. Always: candidate → snap → collision. Plan 91-02 must call out this ordering explicitly in the Task action.
- **Over-conservative AABB on rotated objects** (D-07). A 45°-rotated couch produces a square AABB ~40% wider than the visible footprint. Some valid drops will refuse. Documented; ship anyway.
- **D-07 Alt-key behavior (Phase 30).** Alt disables smart snap (grid only). **Alt must NOT disable collision** — collision is a hard constraint, Alt is a snap convenience. Plan 91-02 must call this out.
- **Cache invalidation on entity-count change mid-drag.** If a redraw fires mid-drag (it shouldn't — `_dragActive` flag suppresses), the cached scene becomes stale. Phase 30 already handles this; no new risk, but verify in regression sweep.
