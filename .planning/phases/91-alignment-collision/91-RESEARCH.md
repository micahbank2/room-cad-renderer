# Phase 91 — Object-to-Object Alignment Guides + Collision Detection — Research

**Researched:** 2026-05-15
**Domain:** 2D canvas snap engine + object-vs-object collision
**Confidence:** HIGH (Phase 30 + Phase 86 patterns are well-established; collision is greenfield but small)

## Summary

Phase 30 (v1.6) already built the smart-snap engine that does most of what Phase 85.1 asked for. `src/canvas/snapEngine.ts` already produces snap targets from object bbox **edges** (left/right/top/bottom) for placed products, placed custom elements, and ceilings. What's missing is:

1. **Object centers as snap targets** (D-02 in Phase 85 CONTEXT — center-to-center alignment was explicitly deferred).
2. **Columns + stairs as snap targets** (Phase 86 columns landed without snap-engine integration per a `D-08a stair-precedent` comment at `selectTool.ts:1500`; stairs aren't even draggable yet — no `moveStair` action exists).
3. **Object-vs-object collision detection** (greenfield — no current code).

This is a small, contained phase. Scope it tight.

**Primary recommendation:** Two plans. Plan 01 extends `snapEngine.ts` (add object centers + column/stair bboxes to scene) and wires columns into the existing snap path. Plan 02 adds `objectCollision.ts` + refuse-mode drop validation in `selectTool.ts`.

## Project Constraints (from CLAUDE.md)

- **D-09 / Phase 71 UI labels:** mixed case for any new chrome. v1 is canvas-behavior-only — no new labels expected.
- **StrictMode-safe useEffect cleanup pattern (§7):** if any module-level registry is added (e.g. a collision-feedback overlay layer), identity-check cleanup applies.
- **Phase 25 PERF-01 fast-path:** product drag mutates the Fabric group directly mid-stroke (`dragPre.fabricObj.set({...})`) and writes to the store only via `*NoHistory`. Don't break this. Snap result is the input to `dragPre.fabricObj.set` at `selectTool.ts:1487-1496`.
- **Single-undo (Phase 25/31 transaction pattern):** drag pushes one history entry at drag start (empty `updateX(id, {})`), uses `*NoHistory` mid-drag. Collision-refuse must not push extra entries.
- **D-08a precedent (`selectTool.ts:1500`):** "Snap-engine path skipped for v1.20 (D-08a stair-precedent) — falls through to the grid-only `snapped` computed above." For columns. Reversing this is the substance of Plan 01.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ALIGN-91-01 | Dragging a product/custom-element/column shows an accent-purple guide line when its center aligns with another object's center on X or Y axis | `snapEngine.ts` already supports center sources; add object **centers** to `SceneGeometry.objectBBoxes` consumers or as a new `objectCenters` list (see Phase 85 D-02). Reuse existing `renderSnapGuides` for the visual. |
| ALIGN-91-02 | Edge-to-edge alignment guides (left/right/top/bottom) also fire | Already shipping per `snapEngine.ts:372-377` — covered by existing object-edge targets. No change needed. |
| ALIGN-91-03 | Columns participate in snap (as snap source AND as snap target) | Snap source: rewrite the `dragType === "column"` branch at `selectTool.ts:1497-1507` to use the cached scene like the `product` branch above. Snap target: extend `buildSceneGeometry` to include columns and stairs. |
| COL-91-01 | Dropping an object onto another object is refused — object returns to last valid position | New `src/canvas/objectCollision.ts`; called from mouse:up commit in `selectTool.ts`. Naive O(n) AABB scan (D-09 in Phase 30 precedent). |
| COL-91-02 | Brief red highlight on the colliding object as feedback (~500ms) | Optional in v1 — recommend deferring to v1.1 if scope tightens. If shipped: small Fabric overlay polygon, cleared by `setTimeout`. StrictMode-safe pattern applies. |

## Current State

### Smart-snap engine (Phase 30 — already ships)

- **Pure engine:** `src/canvas/snapEngine.ts` — `computeSnap(input: SnapInput): SnapResult`. Per-axis scan, priority tiebreak (midpoint > object-edge > wall-face), pixel tolerance capped at 2ft, grid fallback per axis when no winner.
- **Scene builder:** `buildSceneGeometry(state, excludeId, productLibrary, customCatalog)` — already excludes the dragged object by id (D-02b) and packs:
  - `wallEdges: Segment[]` (left + right outer faces per wall)
  - `wallMidpoints: { point, wallId, axis }[]`
  - `objectBBoxes: BBox[]` — products, custom elements, ceilings only.
  - **NOT included today:** columns, stairs, object centers (axis-only).
- **Guides:** `src/canvas/snapGuides.ts` — `renderSnapGuides(fc, guides, scale, origin)` / `clearSnapGuides(fc)`. Accent-purple `#7c5bf0` at 60% opacity. Handles `axis` (full-canvas axis line) + `midpoint-dot` guide kinds. Adding object-center guides reuses the existing `axis` kind (it's already an X or Y value).
- **Restricted-scene precedent (Phase 31 D-08b):** `src/canvas/wallEndpointSnap.ts` — `buildWallEndpointSnapScene(walls, excludeId)` returns a SceneGeometry with ONLY wall endpoints/midpoints so wall endpoint drag doesn't snap to product bboxes. Pattern is "build a SceneGeometry with only the targets you want." Same pattern applies if we ever need to restrict object-drag to NOT snap to other objects (probably not — full scene is fine).

### Drag flow in selectTool.ts

- **Generic-move handler:** lines 1442-1473. Computes `targetPos` from cursor − `dragOffsetFeet`, then snaps:
  ```ts
  const isSmartSnapTarget = dragType === "product" || dragType === "ceiling";
  if (!isSmartSnapTarget || altHeld || !cachedScene) {
    snapped = gridSnap > 0 ? snapPoint(targetPos, gridSnap) : targetPos;
  } else {
    const draggedBBox = computeDraggedBBox(dragId, bboxKind, targetPos);
    const result = computeSnap({...cachedScene, candidate: {pos: targetPos, bbox: draggedBBox}, ...});
    snapped = result.snapped;
    renderSnapGuides(fc, result.guides, scale, origin);
  }
  ```
- **Column drag (Phase 86) — `selectTool.ts:1497-1507`:** explicitly skips smart-snap. Comment cites "D-08a stair-precedent" deferral. Plan 01 reverses this: add `"column"` to `isSmartSnapTarget` and add a column branch to `computeDraggedBBox` (use `widthFt × depthFt × rotation`).
- **Cached scene at drag start — `selectTool.ts:976-986`:** `cachedScene = buildSceneGeometry(state, hit.id, _productLibrary, customCatalog)`. Currently gated on `hit.type === "product" || hit.type === "ceiling"`. Extend to `|| hit.type === "column"`.
- **Stairs:** NOT draggable today. No `moveStair`/`updateStairPosition` action in `cadStore.ts` (only `removeStair`, plus the placement tool). Adding stair drag is a separate scope item — **defer to a later phase** unless explicitly in scope. Phase 91 should treat stairs as a snap TARGET (read-only — extend `buildSceneGeometry` to include `doc.stairs`) but NOT as a snap source.

### Entity types in scope as snap targets

| Entity | Today in scene? | After Plan 01 |
|---|---|---|
| Product (`placedProducts`) | yes (bbox edges) | + bbox center |
| Custom element (`placedCustomElements`) | yes (bbox edges) | + bbox center |
| Ceiling (`ceilings`) | yes (bbox edges) | + bbox center |
| Column (`columns`, room-scoped, Phase 86) | **no** | edges + center |
| Stair (`stairs`, room-scoped, Phase 60) | **no** | edges + center (target only) |
| Wall (`walls`) | yes (outer faces + midpoints) | unchanged |

Column geometry: rotated AABB via `axisAlignedBBoxOfRotated(col.position, col.widthFt, col.depthFt, col.rotation, col.id)`. Stair geometry needs care: `Stair.position` is bottom-step center (not bbox center per `cad.ts:160`). Stair effective width = `widthFtOverride ?? DEFAULT_STAIR_WIDTH_FT` (3ft); effective depth = `stepCount × runIn / 12`. Compute bbox center by offsetting from `position` along the UP direction implied by `rotation`. (Plan 01 should write a small helper `stairBBox(stair): BBox` co-located with snap scene code.)

### Object centers — the Phase 85 D-02 ask

Phase 30 already passes the dragged object's center as a `srcs` value in `computeSnap` (`snapEngine.ts:319, 325`). What's missing is including OTHER objects' centers as **targets**. Options:

- **Option A (recommended):** Add `objectCenters: Point[]` to `SceneGeometry`. In `computeSnap`, push these as `kind: "object-center"` axis targets. Priority tier sits between `object-edge` (2) and `midpoint` (3) — recommend priority 2.5 (or rename: midpoint=4, object-center=3, object-edge=2, wall-face=1).
- **Option B:** Reuse `objectBBoxes` and derive centers inline in `computeSnap`. Less explicit, slightly less code.

**Recommend Option A** — explicit, future-proof, and matches Phase 85 CONTEXT's suggested shape exactly: "add `objectCenters: Point[]` to `SceneGeometry`."

### Collision precedent

- `src/three/walkCollision.ts` — 3D walk-mode camera-vs-wall. Different domain (camera ellipse vs. wall segments). Not reusable for 2D object-vs-object.
- No 2D collision anywhere.

## Implementation Plan

### Plan 91-01 — Object-center alignment + columns/stairs in scene

**Files touched:**
- `src/canvas/snapEngine.ts` — add `objectCenters: Point[]` to `SceneGeometry`; emit object-center axis targets in `computeSnap` (priority slot between object-edge and midpoint); extend `buildSceneGeometry` to scan `doc.columns` (rotated AABB) and `doc.stairs` (bottom-step center → bbox center offset + computed depth). Each contributes a `BBox` to `objectBBoxes` AND a center point to `objectCenters`.
- `src/canvas/tools/selectTool.ts` — (a) extend cached-scene gating at `:976` to include `hit.type === "column"`; (b) add `"column"` to `isSmartSnapTarget` at `:1454`; (c) add a column branch to `computeDraggedBBox` near `:392-440` using `axisAlignedBBoxOfRotated(col.position, col.widthFt, col.depthFt, col.rotation, col.id)`; (d) remove the D-08a-precedent skip comment at `:1500`.
- **Tests:** Extend `src/canvas/__tests__/snapEngine.*` with a "center-to-center" axis-match case + a "column-bbox-contributes-as-target" case. Add an e2e driver test: drag product A toward product B → guide appears when centers align → released → A's center matches B's center on the snapped axis.

**Tasks (~3):**
1. snapEngine `objectCenters` plumbing + tests (RED → GREEN).
2. `buildSceneGeometry` extension for columns + stairs (RED → GREEN).
3. selectTool column-as-snap-source wiring + e2e test for column drag snapping to a product's center.

### Plan 91-02 — Collision detection (refuse mode)

**Files touched:**
- `src/canvas/objectCollision.ts` (new). Exports `wouldCollide(draggedBBox: BBox, scene: BBox[]): { hits: BBox[] }`. Naive O(n) AABB intersection. Reuses `BBox` from `snapEngine.ts`.
- `src/canvas/tools/selectTool.ts` — call `wouldCollide(snappedBBox, cachedScene.objectBBoxes)` in the move handler after snap but before applying the new position. If hits found:
  - **Refuse:** ignore this frame's `targetPos`. Either skip the `dragPre.fabricObj.set({...})` call entirely (Fabric object stays at its previous frame position) OR roll back to `lastDragFeetPos` (the last accepted position cached in the closure). Recommend **skip-this-frame** — Fabric is already at the previous valid position; doing nothing keeps it there.
  - **No visual feedback in v1.** A red highlight is nice-to-have but adds StrictMode-cleanup surface + a Fabric overlay layer. Defer to a follow-on if Jessica wants louder feedback.
- **Tests:** Pure unit tests for `wouldCollide` (AABB intersection edge cases — touching, contained, disjoint). E2E: drag chair A into chair B — A stops at the last valid position; release leaves A non-overlapping with B.

**Tasks (~2):**
1. `objectCollision.ts` + unit tests (RED → GREEN).
2. selectTool integration + e2e refuse-mode test.

**Snap-then-collide ordering:** snap fires first (current code path), then collision check on the snapped bbox. If snap would push the object INTO a collision, the move is refused and the object stays put. This is correct — the user is dragging close enough to a target that snap engaged; if snap would overlap, refusing is the cleanest behavior (alternative auto-nudge is out of scope per CONTEXT).

## Don't Hand-Roll

| Problem | Don't build | Use instead |
|---|---|---|
| Snap line rendering | Custom Fabric line layer | `renderSnapGuides` / `clearSnapGuides` (Phase 30) |
| Rotated bbox math | Custom OBB code | `axisAlignedBBoxOfRotated` (Phase 30) |
| Scene caching at drag start | Per-frame rebuild | Existing `cachedScene` ref in selectTool (Phase 30 D-09b) |
| Restricted snap scene | Filter scene mid-snap | `buildWallEndpointSnapScene` pattern (Phase 31) — though probably not needed for Phase 91 |

## Common Pitfalls

1. **Performance: scene rebuild per frame.** Phase 30 already caches at drag start. Plan 01 must NOT rebuild per mousemove. Extend the cache gating but keep the cache pattern.
2. **AABB on rotated objects is over-conservative.** A 45°-rotated 4ft×1ft couch produces a ~3.5ft×3.5ft AABB. Collision will refuse drops that visually fit. For v1 this is acceptable; document and ship. True OBB collision is a follow-on.
3. **Snap-then-collide order matters.** If we collision-check first then snap, you can snap into a collision. Always: candidate → snap → collision. (Same as current snap → fabric.set sequence; collision slots between snap and set.)
4. **Stair `position` is bottom-step center, NOT bbox center.** `cad.ts:160` is explicit. `buildSceneGeometry` must offset along the rotation-implied UP vector by `(stepCount × runIn / 12) / 2` to get bbox center. Easy to get wrong; write a unit test.
5. **Column hit-test order in selectTool already accounts for columns winning over walls** (`:135-153`). Snap engine doesn't share that hit-test — no risk here, but call out: snap and hit-test are independent.
6. **D-07 Alt-key behavior (Phase 30):** Alt disables smart snap (grid only). Preserve this for collision too — Alt should NOT disable collision. Collision is a hard constraint; Alt is a snap convenience.
7. **StrictMode + module-level state:** if Plan 02 adds an overlay-highlight registry (deferred per recommendation), use the identity-check cleanup pattern. v1 ships without it → no StrictMode surface added.

## Runtime State Inventory

Skipped — this phase is greenfield canvas behavior. No renames, no migrations, no stored state changes. No external configuration. `RoomDoc.stairs` and `RoomDoc.columns` already exist (Phase 60 + 86); we only READ them in scene building.

## Environment Availability

Skipped — pure in-app code changes. No new dependencies.

## Validation Architecture

| Property | Value |
|---|---|
| Framework | Vitest (unit) + Playwright (e2e), as established Phase 30+ |
| Quick run | `npm run test -- snapEngine` for snap unit; `npm run test -- objectCollision` for collision unit |
| Full suite | `npm run test && npm run e2e` |

### Phase Requirements → Test Map

| Req | Behavior | Test type | Command | Exists? |
|---|---|---|---|---|
| ALIGN-91-01 | object-center axis target fires | unit | `npm run test -- snapEngine` | ❌ Wave 0 |
| ALIGN-91-03 | column snap-source + target | unit + e2e | `npm run test -- snapEngine` + Playwright spec | ❌ Wave 0 |
| COL-91-01 | refuse-mode AABB intersection | unit + e2e | `npm run test -- objectCollision` + Playwright spec | ❌ Wave 0 |

### Wave 0 gaps

- `src/canvas/__tests__/snapEngine.objectCenters.test.ts` — RED tests for center-to-center.
- `src/canvas/__tests__/objectCollision.test.ts` — RED tests for AABB intersection.
- `e2e/alignment-collision.spec.ts` — Playwright drag-test using `window.__driveResize`-style driver (or extend an existing drag driver).

## Open Questions for Plan Phase

1. **Snap types in v1:** all of (object-center-X, object-center-Y, equal-spacing)? Or start with just center-X/center-Y and skip equal-spacing? **Recommend: center-X + center-Y only.** Edges already work. Equal-spacing requires a different algorithm (3-object detection) and is rare in interior design. Defer to v1.1.
2. **Collision feedback:** silent refuse, or 500ms red highlight on the blocked object? **Recommend: silent refuse for v1.** Object snaps back to last valid position; cursor keeps moving; user feels the "wall." If Jessica complains it feels broken, layer the red highlight in v1.1.
3. **Stair drag in scope?** No `moveStair` action exists. **Recommend: NO** — stairs are snap targets only in Phase 91. Add stair drag in a follow-on phase if Jessica needs to reposition placed stairs. (She probably does eventually, but that's not THIS phase.)
4. **Walls as snap targets for products** — already shipping (Phase 30 `wallEdges`). No change.
5. **Object-center priority vs. object-edge?** Object-center should beat object-edge when both match within tolerance (center alignment is the more meaningful intent). **Recommend: midpoint (4) > object-center (3) > object-edge (2) > wall-face (1).** Renumber Phase 30's 3-tier ladder to 4-tier.

## Sources

### Primary (HIGH confidence)
- `src/canvas/snapEngine.ts` — Phase 30 pure snap engine
- `src/canvas/snapGuides.ts` — accent-purple guide rendering
- `src/canvas/wallEndpointSnap.ts` — restricted-scene precedent
- `src/canvas/tools/selectTool.ts` — drag handlers, smart-snap integration, hit test
- `src/types/cad.ts` — `Stair` (`:157-178`), `Column` (`:204-229`), `PlacedProduct`, `PlacedCustomElement`
- `src/stores/cadStore.ts` — `updateColumn`, `moveColumnNoHistory`, no `moveStair`
- `.planning/phases/30-smart-snapping/30-CONTEXT.md` — D-01..D-09 snap engine decisions
- `.planning/phases/85-parametric-controls-v1-20/85-CONTEXT.md` — D-02 deferral text for Phase 85.1

## Metadata

**Confidence breakdown:**
- Snap-engine extension: HIGH — pattern is established, surgical extension.
- Column/stair scene contribution: HIGH — types are clear, helper math is standard.
- Collision refuse-mode: MEDIUM — UX feel (silent refuse) is a recommendation, not a verified-by-Jessica decision. Plan phase should confirm via discuss-phase.
- Object-center priority slotting: MEDIUM — recommend 4-tier ladder; final order is a Plan-01 decision.

**Research date:** 2026-05-15
**Valid until:** 2026-06-15 (Phase 30 + 86 patterns are stable; nothing time-sensitive in scope)
