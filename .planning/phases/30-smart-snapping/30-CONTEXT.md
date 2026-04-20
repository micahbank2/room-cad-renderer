# Phase 30: Smart Snapping — Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

When Jessica drags or places an object, smart snap engages:
- The object's **edges** snap to nearby wall edges (outer faces) and to other objects' bounding-box edges
- Near a wall's **midpoint**, the object auto-centers on that wall
- A **visible guide** (accent-colored axis line + tick) appears while a snap is active, cleared on mouse:up
- Works during both **placement** (productTool) and **repositioning** (selectTool drag)
- Holding **Alt/Option** temporarily disables smart snap (grid still applies)

This phase is net-new (no pre-existing smart-snap code). All current snapping is grid-only via `snapPoint()`. Phase 30 adds a layer that runs before grid snap falls through.

Explicit non-goals: angle/rotation snapping, object-center snap targets, spacing/distribution guides, magnetic snap tools, persistent alignment constraints. All deferred.
</domain>

<decisions>
## Implementation Decisions

### Architecture
- **D-01:** New pure module `src/canvas/snapEngine.ts` — pure functions, no Fabric dependency, unit-testable.
  - Primary function shape: `computeSnap(candidate: { pos: Point, bbox: BBox }, scene: SceneGeometry, tolerancePx: number, scale: number): { snapped: Point, guides: SnapGuide[] }`
  - `SceneGeometry` = `{ walls: WallSegment[], placedObjects: BBox[] }` — minimal read shape, built from cadStore state at drag start (cached) or refreshed per-frame depending on what's cheap
  - `SnapGuide` = `{ kind: "axis" | "midpoint", axis: "x" | "y", value: number, span?: [number, number] }` — enough for the Fabric renderer to draw the guide
  - Pure function; no store reads, no side effects. Tool code passes state in and applies the returned snap.

### Snap targets (what we snap TO)
- **D-02:** In scope:
  - Wall **outer edges** (both faces of every thick wall, as line segments)
  - Wall **midpoints** (`(start + end) / 2`, per `closestPointOnWall` `t=0.5`)
  - Other **placed objects' bounding-box edges** (4 edges per object, derived from `position ± dimensions/2` with rotation accounted for)
- **D-02a:** Wall endpoints (corners), object centers, and angular/rotation snaps are OUT of scope — deferred.
- **D-02b:** The object being dragged must be **excluded from the scene** (don't snap to yourself). Filter by id before building the candidate list.

### Snap geometry (what snaps on the dragged object)
- **D-03:** The dragged object's **own bounding-box edges** (left/right/top/bottom of its footprint) are the snap points on the source side. For a product at `(cx, cy)` with width `w` and length `l`, candidate edges are `cx ± w/2` and `cy ± l/2`. Rotation is respected (use axis-aligned bbox of the rotated footprint for v1).
- **D-03a:** Midpoint auto-center (SNAP-02) treats the object's **center** as the snap point against the wall's midpoint. This is a separate candidate from edge snaps.

### Tolerance
- **D-04:** Pixel-based, zoom-aware. Tolerance constant `SNAP_TOLERANCE_PX = 8`. At feet-space, tolerance = `8 / scale`. Recomputed per mousemove from current `scale`.
- **D-04a:** Tolerance does NOT apply to grid snap — grid always rounds to `gridSnap` regardless.

### Conflict resolution
- **D-05:** **Per-axis independent.** Compute best X-snap and best Y-snap separately. Each axis picks its nearest candidate (if any within tolerance); otherwise falls back to the gridSnap-rounded value on that axis.
- **D-05a:** Within each axis, priority (if two candidates equally close, which is rare but possible): `midpoint > edge-to-edge > edge-to-wall-face`. Stable tiebreak; document in code comment.
- **D-05b:** If NO smart-snap candidate is within tolerance on an axis, grid snap applies on that axis (when `gridSnap > 0`). This preserves the current gridSnap experience.

### Guide visualization (SNAP-03)
- **D-06:** Accent-purple line extending across the canvas along the snapping axis (horizontal line if Y-snap, vertical line if X-snap), plus a small tick (~6px) at the exact snap point.
- **D-06a:** Color: existing `--color-accent` (purple `#7c5bf0`) at ~60% opacity. Line weight ~1px. No new tokens.
- **D-06b:** Guides are Fabric objects tagged `{ type: "snap-guide" }`. Cleared on `mouse:up` alongside the drag fast-path finalize; also cleared when a different snap engages (re-render guides for new axis). No store commits for guide state — pure canvas ephemera.
- **D-06c:** When both X and Y snap simultaneously, both guides render (crosshair effect).
- **D-06d:** Midpoint snap (SNAP-02) adds a distinct marker at the wall midpoint (small accent-purple dot on the wall's midline) in addition to the axis line, so Jessica sees "this is centered on this wall" rather than just "it snapped to X=5.00".

### Disable mechanism
- **D-07:** Hold **Alt / Option** during drag to disable smart snap while still applying `gridSnap`. Detection via `opt.e.altKey`. Alt has no existing meaning in any tool (Shift is already orthogonal-constrain in wallTool — do not overload).
- **D-07a:** No UI toggle; keyboard-only. Help content in `helpIndex.ts` / `helpContent.tsx` gets updated if the planner finds appropriate sections, otherwise noted in CLAUDE.md.

### Object scope
- **D-08:** Smart snap applies to: **products, custom elements, and ceilings** — everything the user can drag on the canvas. Walls are excluded (wall drawing uses its own orthogonal-constrain via Shift; wall drag is an endpoint move handled elsewhere). Openings are excluded (they slide along their host wall only).
- **D-08a:** Activation points:
  - `productTool` placement path (`src/canvas/tools/productTool.ts`) — before the store `placeProduct` call
  - `selectTool` drag path (`src/canvas/tools/selectTool.ts`) — the generic "move selected object" branch (around line 873–890); also the product/ceiling/custom-element drag branches that currently call `snapPoint`
- **D-08b:** The wall-endpoint-drag path (selectTool ~lines 765–789) does NOT use smart snap in v1 — wall endpoints are a different interaction (Phase 31 will touch this). Out of scope.

### Performance
- **D-09:** Smart snap runs every mousemove. Must be cheap. Implementation budget: O(N) linear scan of candidates (walls × 2 faces + placedObjects × 4 edges) — fine at Jessica's scene size (≤50 elements = ≤400 candidate segments, trivial).
- **D-09a:** No spatial index in v1. If a perf test shows per-frame snap > 1ms, revisit with a simple AABB bucket.
- **D-09b:** Scene geometry is captured once at drag start (endpoints are stable during drag since the dragged object is excluded). Re-derive only if the scene changes mid-drag (won't happen with Phase 25 drag fast-path). **Cache the `SceneGeometry` object in the drag closure.**
- **D-09c:** Phase 25 drag fast-path preservation: no store commits mid-drag. `snapEngine` returns values consumed only by Fabric rendering + the final `placeProduct`/`updateProduct` commit at mouse:up.

### Claude's Discretion
- Exact SceneGeometry caching location (drag closure vs. a weakmap on the fabric Canvas)
- Whether `SnapGuide` union covers edge vs axis distinctly or just axis+optional-marker
- Whether `computeSnap` returns full candidate list (debug info) or just the winner
- Planner picks the render implementation in Fabric (dashed line vs solid, line thickness within 1–2px)
- Exact order of hit-test vs. exclude-self logic
- Whether to expose `SNAP_TOLERANCE_PX` for future tuning or keep const

### Folded Todos
(none)
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source files (build sites + integration points)
- `src/canvas/tools/selectTool.ts` — drag move paths; especially the generic move branch (~lines 873–890) and ceiling/product/custom-element branches. D-08a primary integration point.
- `src/canvas/tools/productTool.ts` — placement (~lines 25–30). Add smart snap before `placeProduct` call.
- `src/canvas/tools/ceilingTool.ts` — ceiling drag (~lines 59–109). Add smart snap to ceiling drag path.
- `src/canvas/tools/toolUtils.ts` — shared coord helpers (`pxToFeet`, `findClosestWall`). Potential home for scene-geometry builder if not in snapEngine itself.
- `src/lib/geometry.ts` — `closestPointOnWall` (useful for midpoint test), `wallCorners` / `mitredWallCorners` (wall outer-edge derivation), `snapPoint` (fallback), `distance`.
- `src/types/cad.ts` — `WallSegment`, `PlacedProduct`, `Point`, `BBox`-equivalent (derive if absent).
- `src/stores/uiStore.ts` — `gridSnap` fallthrough per D-05b.
- `src/stores/cadStore.ts` — read access to `rooms[activeRoomId].walls`, `placedProducts`, `placedCustomElements`, `ceilings` for SceneGeometry build.
- `src/index.css` — `--color-accent` token (D-06a). No new tokens.
- `src/canvas/FabricCanvas.tsx` — tagged Fabric object cleanup pattern (search for `type: "dim"` or `type: "wall-dim"`). Same pattern for `type: "snap-guide"`.

### Prior-phase specs & context
- `.planning/REQUIREMENTS.md` §Smart Snapping — SNAP-01, SNAP-02, SNAP-03
- `.planning/PROJECT.md` — Phase 25 drag fast-path principle (no per-frame store commits)
- `.planning/phases/25-canvas-store-performance/` — drag fast-path architecture reference; MUST NOT regress
- `.planning/phases/28-auto-save/28-CONTEXT.md` — D-05b ui-store filter pattern (ensures smart-snap state doesn't accidentally trigger auto-save)

### External
- GitHub Issue [#17](https://github.com/micahbank2/room-cad-renderer/issues/17) — user-reported source for SNAP-01/02/03

No external ADRs — requirements fully captured in local planning docs and the decisions above.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `snapPoint(p, grid)` in `geometry.ts` — round-to-grid; keep as fallback when smart snap finds nothing.
- `closestPointOnWall(wall, p)` — returns `{point, t}`; `t=0.5` is the wall midpoint. Useful for D-03a midpoint test.
- `wallCorners(wall)` / `mitredWallCorners(wall, walls)` — produces the 4 corners of a thick wall; outer-face edges derive from corner pairs `[startLeft,endLeft]` and `[startRight,endRight]`.
- Tagged Fabric cleanup pattern (objects with `data: { type: "dim" }` etc. cleared on redraw) — reuse for `type: "snap-guide"`.
- Phase 25 drag fast-path in selectTool — mid-drag Fabric mutation, single commit at mouse:up. snapEngine integrates at mousemove; guide rendering uses the same fast-path philosophy.

### Established Patterns
- **Pure math in `@/lib` or `@/canvas`**: snapEngine fits — unit testable, no DOM/Fabric deps.
- **Tools call `useCADStore.getState()` / `useUIStore.getState()`** outside React. Scene geometry is read once at drag start and cached in closure (matches existing drag-offset caching patterns).
- **All measurements in feet; scale applied at render only.** snapEngine input/output are feet; tolerance converted from pixels at call site (`tolerancePx / scale`).
- **Obsidian palette, UPPERCASE_UNDERSCORE labels** — not applicable directly (no new user-facing labels), but preserved in any help/docs updates.

### Integration Points
- **productTool** (`src/canvas/tools/productTool.ts:25–30`): replace the bare `snapPoint` call with `computeSnap` → apply snapped position → render guides → call `placeProduct`. Guides cleared on mouseleave or after placement.
- **selectTool generic move** (`src/canvas/tools/selectTool.ts:873–890`): same substitution before `updateProductNoHistory` / `updateCeilingNoHistory` / `updateCustomElementNoHistory`. Guides cleared on mouse:up.
- **ceilingTool drag** (`src/canvas/tools/ceilingTool.ts:59–109`): same hook.
- **Fabric guide rendering**: new helper (e.g. `renderSnapGuides(fc, guides, scale, origin)` in `src/canvas/snapEngine.ts` or a sibling `src/canvas/snapGuides.ts`). Adds/removes Fabric objects tagged `type: "snap-guide"`. Called from each tool's mousemove.
- **Scene-geometry builder**: `buildSceneGeometry(state, excludeId)` — reads active room's walls + placedObjects (products + custom + ceilings), builds the edge-segment list. Cheap enough to rebuild per drag start; cached in closure thereafter.

</code_context>

<specifics>
## Specific Ideas

- Guide color references: existing accent purple `#7c5bf0` at ~60% opacity. NOT success green or warning orange — those mean other things in the app.
- Line spans the canvas (not just a segment) so Jessica sees the alignment reference, not just the contact point. Matches Figma/Sketch convention.
- Midpoint snap (SNAP-02) needs a visibly distinct cue (center-dot on the wall midline) so "this is centered on this wall" reads differently from "it's at X=5.0 for some other reason."
- Per-axis independence (D-05) matches how professional CAD tools work — naturally supports "X is aligned to wall, Y is snapped to grid" without extra UI.

</specifics>

<deferred>
## Deferred Ideas

- **Object center snapping** — would add power but ambiguity; revisit if telemetry shows alignment frustrations this doesn't solve.
- **Wall endpoint / corner snapping** — not in scope; wall endpoints get their own treatment in Phase 31 (drag-to-resize walls).
- **Angle / rotation snapping** — separate feature, not in SNAP-01/02/03.
- **Spacing / distribution guides** ("equal space between these 3 objects") — power-user feature, different phase.
- **Spatial index / quadtree** — not needed at Jessica's scene scale; premature optimization per D-09a.
- **Persistent alignment constraints** ("keep this aligned even after I move the other") — CAD-grade feature, out of scope for a personal visualization tool.
- **Toggle UI for smart snap on/off** — keyboard-only disable (Alt) is sufficient; no need to clutter the toolbar.
- **Wall-to-wall smart snap when drawing walls** — wallTool already uses orthogonal-constrain via Shift; smart snap's target set doesn't include "draw this new wall edge aligned to that existing wall's axis" in v1.
- **Openings snap to object edges** — openings slide along their host wall only; out of scope.
- **Metric / alternate unit tolerance** — feet is app-wide.

### Reviewed Todos (not folded)
(none)

</deferred>

---

*Phase: 30-smart-snapping*
*Context gathered: 2026-04-20*
