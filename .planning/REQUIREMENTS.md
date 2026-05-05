# Requirements — v1.15 Architectural Toolbar Expansion

After v1.14 shipped real GLTF furniture, v1.15 expands the architectural primitives so Jessica can model her actual home — not just a rectangle. Continues phase numbering from 58 → starts at 59.

## Active Requirements

### Architectural Primitives

- [ ] **CUTAWAY-01** — In 3D, the user can see the room interior from any camera angle. The wall closest to the camera (or any user-specified wall) becomes ghosted or invisible so it doesn't block the view. Standard CAD cutaway pattern. Source: [#21](https://github.com/micahbank2/room-cad-renderer/issues/21).
  - **Verifiable:** Open a room in 3D. Orbit around to a side view — the nearest wall blocks the interior. Toggle "cutaway mode" (Toolbar button OR right-click → Hide wall). The blocking wall ghosts (semi-transparent) or disappears entirely. Switch camera angle — the cutaway updates to whichever wall is nearest. Switch back to top-down — all walls visible again (cutaway only applies to angled views). Phase 47 SOLO/EXPLODE display modes coexist with cutaway. No regression on Phase 32 PBR materials, Phase 36 wallpaper/wallArt, Phase 49–50 user-textures.
  - **Acceptance:** New `cutawayMode` UI store flag (`auto` / `off` / `manual:<wallId>`). Auto-mode raycasts from camera each frame to find the nearest blocking wall (R3F `useFrame` hook). Manual mode: per-wall context-menu action "Hide wall in 3D" (Phase 53 menu integration). Ghosted walls render at 0.15 opacity with `transparent: true` and `depthWrite: false` (visual cue still shows the wall exists). Cutaway respects Phase 46 hiddenIds (already-hidden walls stay hidden). Cutaway state is session-only (NOT persisted to snapshot — Jessica's room geometry shouldn't change based on viewing preference).
  - **Hypothesis to test:** R3F `useFrame` raycast against wall meshes is performant enough at 60fps for 4-12 walls. Confirm during research; fall back to per-camera-move recompute if needed.

- [ ] **STAIRS-01** — User can place stairs as a new architectural primitive. Configurable rise per step, run per step, total width, and orientation (4 cardinal directions). Renders as connected step boxes in 3D and as a stair-symbol polygon (with directional indicator) in 2D. Source: [#19 partial](https://github.com/micahbank2/room-cad-renderer/issues/19).
  - **Verifiable:** Toolbar gains "Stairs" tool (lucide icon — `Stairs` or `StepForward`). Click in 2D → place stair element with default config (7" rise, 11" run, 36" width, 12 steps). 2D shows top-down stair symbol with arrow indicating rise direction. Switch to 3D → stairs render as connected stepped boxes. PropertiesPanel exposes editable rise / run / width / step count. Phase 31 size-override compatible (drag handles adjust width). Phase 53/54 right-click + click-to-select work. Phase 48 saved-camera works on stair tree node.
  - **Acceptance:** New `Stair` type in `src/types/cad.ts` with `position`, `rotation`, `riseIn`, `runIn`, `widthIn`, `stepCount` fields. New `StairTool` in `src/canvas/tools/stairTool.ts` mirroring `productTool` pattern. `cadStore` actions: `addStair`, `updateStair`, `removeStair`, plus `*NoHistory` variants. 2D rendering: `fabric.Polygon` outline + parallel hatch lines (one per step) + arrow → wrapped in `fabric.Group` with `data.stairId`. 3D rendering: `<StairMesh>` component renders N stacked `<boxGeometry>` meshes. Tree integration: stairs appear under their containing room with a `Stairs` lucide icon. Snapshot serialization includes stairs. No regression on existing primitives.
  - **Hypothesis to test:** Confirm Fabric.js can render the stair-symbol polygon with hatch lines as a single Group. Confirm stair element doesn't conflict with existing `customElement.kind` enum (it's a separate top-level entity, not a custom element).

- [ ] **OPEN-01** — User can place wall openings beyond doors and windows: archways, pass-throughs, and niches. Extends the existing wall-opening codepath (Opening type already has `kind` field — currently `door` or `window`). Source: [#19 partial](https://github.com/micahbank2/room-cad-renderer/issues/19).
  - **Verifiable:** Toolbar gains 3 new tool buttons (or extends Door/Window menu): Archway, Pass-through (full-height opening), Niche (rectangular cutout, doesn't go to floor). Click on a wall in 2D → places opening at click point with kind-specific defaults (archway: 36" wide × 84" tall with arched top; pass-through: 60" × full wall height; niche: 24" × 36" × 6" deep recess). 2D shows kind-specific symbol. 3D renders correct cutout shape — archway has rounded top, pass-through is full-height rectangle, niche is a recessed box (not a through-hole). PropertiesPanel exposes kind-specific dimensions.
  - **Acceptance:** Extend `Opening.kind` enum with `"archway"` | `"passthrough"` | `"niche"`. WallMesh's `THREE.Shape` builder (which currently does rectangular holes for doors/windows) gains kind-specific path generation: archway uses `Path.bezierCurveTo` for the arched top, niche generates a recessed face mesh instead of a through-hole. New tools mirror existing `doorTool` / `windowTool`. Phase 33 design system compliance for new icons (lucide). Snapshot back-compat: existing snapshots with `kind: "door" | "window"` load unchanged.
  - **Hypothesis to test:** `THREE.Shape` supports curve operations for archway tops; confirm `ExtrudeGeometry` with bezier-curve hole renders cleanly without artifacts. For niche (recessed, not through), the architecture decision is whether to render as a separate mesh vs. modify the wall's extrude geometry — confirm during research.

- [ ] **MEASURE-01** — User can place measurement and annotation tools: dimension lines between any two points, free-form text labels, and automatic per-room area calculation in square feet. Source: [#22](https://github.com/micahbank2/room-cad-renderer/issues/22).
  - **Verifiable:** Toolbar gains "Measure" tool (lucide `Ruler`) and "Label" tool (lucide `Type` or `Tag`). Measure tool: click two points in 2D → dimension line drawn between them with auto-formatted feet+inches label centered on the line. Click on a wall endpoint to snap to it (Phase 30 smart-snap integration). Delete via Phase 53 right-click. Label tool: click in 2D → places editable text annotation. Phase 31 inline-edit pattern for label text (double-click to edit). Auto room-area: PropertiesPanel for a Room shows `Area: XX sq ft` computed from the wall polygon enclosed area. 3D: dimension lines optionally render as flat overlay text (Phase 33 design tokens for typography).
  - **Acceptance:** New `MeasureLine` and `Annotation` types in `cad.ts` with `points`, `text`, `position`, `kind` fields. Stored at room level (not custom-element kind). 2D rendering via Fabric `fabric.Line` + `fabric.Text` for dimension; `fabric.Textbox` for annotation. 3D rendering optional (D-04 in research) — may defer to "show in 2D only" if 3D text is complex. Auto-area calc: `polygonArea(wall.start, wall.end ...)` shoelace formula, displayed in `RoomSettings` and PropertiesPanel. New tools follow `tools/` cleanup pattern. Snapshot includes measurements + annotations. Phase 53/54 wiring for select + right-click. No regression on placement tools.
  - **Hypothesis to test:** 3D dimension-line rendering vs. 2D-only — research should pick the path. drei `<Text>` may suffice for 3D labels but adds complexity; 2D-only is simpler and probably sufficient for Jessica's communication-with-contractors use case.

## Out of Scope (this milestone)

| Item | Reason |
|------|--------|
| Columns ([#19](https://github.com/micahbank2/room-cad-renderer/issues/19) partial) | Decorative; uncommon in modern interior plans. Defer to v1.16+ if needed. |
| Levels / platforms ([#19](https://github.com/micahbank2/room-cad-renderer/issues/19) partial) | Niche use case (sunken/raised floors). Defer. |
| Window presets ([#20](https://github.com/micahbank2/room-cad-renderer/issues/20)) | Current generic window already places fine; preset variants are mostly cosmetic. |
| Stair landings / multi-flight stairs | First version is straight runs only. Multi-flight is real complexity (turning angles, intermediate landings) — defer. |
| Curved walls | Existing wall model is straight-segments only. Curved-wall support is a v2.0+ rebuild. |
| 3D dimension-line text | May ship as 2D-only depending on research outcome. |
| Live measurement tool (drag-to-measure) | First version is click-click placement; live-drag preview is a polish item. |
| Annotation rich-text formatting | Plain text only in v1.15. |
| OBJ format support (carry-over from v1.14) | Defer to v1.16+ if demand surfaces. |
| GLTF animations (carry-over from v1.14) | Furniture rarely animated. |
| Custom material overrides on GLTF (carry-over from v1.14) | PBR embedded materials sufficient. |
| LOD / progressive loading (carry-over from v1.14) | 25MB cap keeps load times fine. |
| R3F v9 / React 19 upgrade ([#56](https://github.com/micahbank2/room-cad-renderer/issues/56)) | Still gated on R3F v9 stability. |
| Phase 999.1 ceiling resize handles | Re-deferred again. |
| Phase 999.3 per-surface tile-size override | Re-deferred again. |
| Phase 999.4 EXPLODE+saved-camera offset ([#127](https://github.com/micahbank2/room-cad-renderer/issues/127)) | Narrow trigger. |
| Wall-texture flake on chromium-dev ([#141](https://github.com/micahbank2/room-cad-renderer/issues/141)) | Pre-existing; tracked. |

## Validated Requirements (Earlier Milestones)

See `.planning/milestones/v1.0-REQUIREMENTS.md` through `.planning/milestones/v1.14-REQUIREMENTS.md`. All v1.0–v1.14 requirements shipped or formally deferred.

## Traceability

| Requirement | Phase | Plans |
|-------------|-------|-------|
| CUTAWAY-01 | Phase 59 | TBD |
| STAIRS-01 | Phase 60 | TBD |
| OPEN-01 | Phase 61 | TBD |
| MEASURE-01 | Phase 62 | TBD |

---

*Last updated: 2026-05-05*
