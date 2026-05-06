---
phase: 62-measurement-annotation-tools-measure-01
type: context
created: 2026-05-06
status: ready-for-research
requirements: [MEASURE-01]
depends_on: [Phase 30 smart-snap (snapEngine + snapGuides), Phase 31 inline-edit pattern (LabelOverrideInput skipNextBlurRef + Phase 33 InlineEditableText primitive), Phase 33 typography tokens (mono / muted), Phase 53/54 right-click + click-to-select wiring (lessons from Phase 61 D-11' — opening hit-test was NOT inheritance), formatFeet helper (lib/geometry.ts:191), existing room dimension labels (canvas/dimensions.ts)]
---

# Phase 62: Measurement + Annotation Tools (MEASURE-01) — Context

## Goal

Last v1.15 phase. Add three documentation features for the 2D plan view:

1. **Dimension lines** — click two points → line with auto-formatted feet+inches measurement label centered on the line. Smart-snap to wall endpoints during placement.
2. **Free-form text labels** — click → places editable text annotation. Phase 31 inline-edit pattern (double-click to edit text after placement).
3. **Auto room-area calculation** — every room shows its area in square feet. Computed via shoelace formula on the wall polygon. Visible in PropertiesPanel AND as a subtle overlay in the center of each room on the 2D canvas.

Communication tool. Useful for verifying layouts and sharing plans with contractors.

Source: REQUIREMENTS.md `MEASURE-01` ([#22](https://github.com/micahbank2/room-cad-renderer/issues/22)).

## Pre-existing infrastructure

- **`src/lib/geometry.ts:191`** — `formatFeet(feet: number): string` returns "X'-Y\"" — directly reusable for dimension labels.
- **`src/canvas/dimensions.ts`** — already draws room edge labels + per-wall dimension labels at fontSize 11/12 in `text-text-dim` color. Pattern + visual style we'll mirror for new dimension lines.
- **`src/components/ui/InlineEditableText.tsx`** — Phase 33 inline-edit primitive (extracted from Phase 31 LabelOverrideInput). Live-preview on keystroke, commit on Enter/blur, skipNextBlurRef + originalRef invariants. Direct reuse for label text editing.
- **`src/canvas/snapEngine.ts` + `snapGuides.ts`** — Phase 30 smart-snap. Measure tool consumes snap targets (wall endpoints + midpoints) without contributing new ones. Mirrors Phase 60/61 consume-only pattern.
- **Phase 53/54** right-click + click-to-select — the trap caught in Phase 61 (D-11'): annotations are a NEW entity kind and require explicit hit-test + menu wiring. Plan for ~30-40 LOC across uiStore + FabricCanvas + CanvasContextMenu (similar to Phase 61).

## Decisions

### D-01 — Two new entity types: MeasureLine + Annotation

```ts
export interface MeasureLine {
  id: string;                       // "meas_<uid>"
  start: Point;                     // first endpoint in feet (room-local)
  end: Point;                       // second endpoint in feet (room-local)
}

export interface Annotation {
  id: string;                       // "anno_<uid>"
  position: Point;                  // anchor point in feet (room-local)
  text: string;                     // free-form text, max 200 chars
}
```

Stored at room level: `RoomDoc.measureLines: Record<string, MeasureLine>` and `RoomDoc.annotations: Record<string, Annotation>`.

**Why room-level not snapshot-level:** annotations are scoped to specific rooms (Jessica annotates kitchen separately from living room). Tree integration mirrors Phase 60 stairs pattern.

### D-02 — Snapshot version bump v4 → v5

Adding `RoomDoc.measureLines` + `RoomDoc.annotations` requires version bump. Migration arm in `src/lib/snapshotMigration.ts`: walk each RoomDoc, set both fields to `{}` if missing, bump version 4 → 5.

Existing v4 snapshots (from Phase 60 stairs onwards) load with empty maps. v3 → v4 → v5 migration chain runs in sequence.

### D-03 — 2D-only rendering (no 3D)

User-facing choice. Dimension lines and labels visible only in 2D plan view. Switching to 3D shows the room without measurement clutter. Saves ~2 hours of drei `<Text>` billboard / camera-distance scaling complexity.

**Hypothesis-to-test from REQUIREMENTS resolved:** 2D-only is sufficient for the communication-with-contractors use case Jessica targets. Defer 3D measurements to v1.16+ if requested.

### D-04 — Room-area: PropertiesPanel + 2D canvas overlay

User-facing choice. Auto-area calculation appears in two places:

1. **PropertiesPanel** — when no entity is selected (Room is the implicit "selected" object), show `AREA: 248 SQ FT` near the existing Room dimensions section. Live-recalculates as walls move.
2. **2D canvas overlay** — subtle label in the center of each room polygon. Same color/font as existing room dimension labels (text-text-dim, 11px IBM Plex Mono). Always-visible (no toggle for v1.15).

**Why both:** canvas overlay = ambient awareness. PropertiesPanel = single source of truth + accessible from any selection.

**Computation:** shoelace formula on the wall polygon vertices (CCW winding). New helper `polygonArea(walls: WallSegment[]): number` in `src/lib/geometry.ts`.

### D-05 — Measure tool: click → live preview → click

User-facing choice. Placement flow:

1. User clicks Measure tool in Toolbar (lucide `Ruler` icon)
2. First click on canvas → first endpoint locked; ghost preview line follows cursor
3. Phase 30 smart-snap engages on live cursor — preview snaps to wall endpoints + midpoints
4. Second click commits both endpoints; tool deactivates back to select

Implementation: closure-state pattern from `productTool.ts`. Mid-flow Escape cancels.

### D-06 — Dimension line style: minimal

User-facing choice. Visual style:

- **Line:** thin (`strokeWidth: 1`) in `text-text-dim` color (matches existing room dimension labels)
- **Ticks:** small perpendicular ticks (~4px length) at each endpoint
- **Text:** `formatFeet(distance)` centered on line midpoint, IBM Plex Mono 11px, `text-text-dim` color, white background pill so it reads on hatched/textured surfaces
- **No arrows, no extension lines**

Wrapped in `fabric.Group` with `data: { type: "measureLine", measureLineId }`.

### D-07 — Label tool: click → place → immediate edit

User-facing choice. Placement flow:

1. User clicks Label tool in Toolbar (lucide `Type` icon)
2. Click on canvas → places `Annotation` with empty text at click point; immediately enters edit mode (mirrors Phase 31 InlineEditableText flow)
3. User types text → Enter or click-outside to commit
4. Empty commit removes the annotation (no-op label is useless)

Edit existing label: select + double-click to re-enter edit mode. Phase 31 pattern.

### D-08 — Annotation visual style

- Font: IBM Plex Mono (font-mono — matches CAD chrome convention from Phase 33)
- Size: 12px fixed
- Color: `text-text-primary` (slightly stronger than dimension labels to distinguish "intentional note" from "auto-measurement")
- Background: `bg-obsidian-low` rounded-sm pill (readable on any surface)
- Wrapped in `fabric.Group` with `data: { type: "annotation", annotationId }`

### D-09 — Smart-snap: consume-only

Measure tool consumes Phase 30 snap targets (wall endpoints + midpoints — existing snap scene). Does NOT add measure-line endpoints to the snap scene (other primitives don't snap to existing measurements).

`buildSceneGeometry()` and `snapEngine.ts` files **untouched**. Mirrors Phase 60 D-05 + Phase 61 D-09 consume-only pattern.

### D-10 — cadStore actions

Mirror Phase 60 stair pattern:
- `addMeasureLine(roomId, partial)`, `updateMeasureLine(roomId, id, patch)`, `removeMeasureLine(roomId, id)` + `*NoHistory` variants
- `addAnnotation(roomId, partial)`, `updateAnnotation(roomId, id, patch)`, `removeAnnotation(roomId, id)` + `*NoHistory` variants

### D-11 — Phase 53/54 wiring (NEW code per Phase 61 lesson)

Phase 61 D-11' caught that NEW entity kinds don't auto-inherit Phase 53/54. Same applies here. Required wiring:

1. `src/stores/uiStore.ts:154/159` — extend `ContextMenuKind` union with `"measureLine"` and `"annotation"`
2. `src/canvas/FabricCanvas.tsx:498` — add hit-test branches for both new kinds
3. `src/components/CanvasContextMenu.tsx` — `getActionsForKind('measureLine')` and `getActionsForKind('annotation')` branches
4. `src/canvas/fabricSync.ts` — render with `selectable: true, evented: true`
5. `src/stores/cadStore.ts` — `removeMeasureLine` + `removeAnnotation` invoked from menu Delete

Action sets per kind:
- **MeasureLine:** Delete (3 actions max — no Focus camera since it's 2D-only; no Save camera; no Hide; no Copy/Paste for v1.15)
- **Annotation:** Edit text (re-enters InlineEditableText), Delete

Lighter menu sets than wall/product since these are documentation-only entities.

### D-12 — Tree integration: optional empty group

Phase 46 `RoomsTreePanel` could gain new groups:
- "MEASUREMENTS" — list of measure lines per room
- "ANNOTATIONS" — list of labels per room

**Trade-off:** with N=10+ measurements per room (likely), the tree gets noisy. Recommend: SKIP tree integration for v1.15. Annotations + measurements are visual entities — Jessica interacts with them on the canvas, not the tree. If demand surfaces post-v1.15, add tree groups in v1.16.

### D-13 — Edit existing measurement / annotation

- **MeasureLine:** click to select. Drag either endpoint to move it (mirrors Phase 31 edge-handle drag pattern, but 2 points instead of bbox edges). Drag the body to translate. Right-click → Delete.
- **Annotation:** click to select. Drag the body to translate. Double-click to re-enter edit mode. Right-click → Edit text / Delete.

Single-undo via `*NoHistory` mid-drag, commit on mouse-up (Phase 31 pattern).

### D-14 — Toolbar buttons

Two new tools added to ToolPalette (vertical toolbar where Door/Window/Stair/etc. live):
- **Measure** (lucide `Ruler` icon) — keyboard shortcut: `M`
- **Label** (lucide `Type` icon) — keyboard shortcut: `T`

### D-15 — Test coverage

**Unit (vitest):**
1. `polygonArea(walls)` returns correct sq ft for axis-aligned rectangle, L-shape, and triangle
2. `addMeasureLine`/`updateMeasureLine`/`removeMeasureLine` actions
3. `addAnnotation`/`updateAnnotation`/`removeAnnotation` actions
4. Snapshot v4→v5 migration roundtrips (existing snapshots load with empty maps)

**Component (vitest + RTL):**
5. PropertiesPanel renders `AREA: XX SQ FT` when room is implicitly selected
6. Annotation edit mode: typing dispatches updateAnnotationNoHistory; Enter commits
7. MeasureLine endpoint drag updates start/end via *NoHistory; mouseup commits

**E2E (Playwright):**
8. Click Measure tool → click two points → measurement appears with formatFeet text
9. Click Measure tool → first click → cursor preview → second click commits (live preview asserted via test driver)
10. Smart-snap: drag measure preview near wall endpoint → snap engages
11. Click Label tool → click → annotation appears in edit mode → type "Closet" + Enter → label persists
12. Auto room-area: PropertiesPanel shows correct area for axis-aligned rectangle room
13. 2D canvas overlay shows room area in center of each room polygon
14. Right-click measurement → Delete; right-click annotation → Edit / Delete
15. Snapshot save → reload → measurements + annotations persist (v4→v5 migration)
16. Old v4 snapshot (Phase 60-era) loads cleanly with empty measureLines + annotations maps

### D-16 — Atomic commits per task

Mirror Phase 49–61 pattern.

### D-17 — Zero regressions

- Phase 30 smart-snap files untouched
- Phase 31 size-override unchanged
- Phase 32 PBR materials unchanged
- Phase 33 design system: new tools use existing tokens (no new fonts/colors)
- Phase 46 tree visibility cascade unchanged (tree integration deferred per D-12)
- Phase 47 RoomGroup unchanged (annotations are 2D-only per D-03)
- Phase 48 saved-camera unchanged
- Phase 53/54 existing branches intact; new "measureLine" + "annotation" branches added
- Phase 55-58 GLTF unchanged
- Phase 59 cutaway unchanged
- Phase 60 stairs unchanged
- Phase 61 openings unchanged
- Snapshot back-compat: v4 snapshots (with stairs) load with empty measureLines + annotations
- 4 pre-existing vitest failures must remain exactly 4

## Out of scope (this phase — confirmed v1.15 locks)

- 3D rendering of dimensions / labels (2D-only per D-03; defer to v1.16)
- Drag-to-measure (live preview during drag instead of click-click) — advanced UX, defer
- Multi-line annotations / rich text — plain text only
- Annotation rotation / scaling — anchor + text only
- Per-annotation font / color override — fixed style for v1.15
- Tree integration for measurements / annotations (D-12 deferral)
- Measurement chain (continuous segments) — single line only
- Angle measurement — distance only for v1.15
- Diameter / radius for arc-shaped openings — straight-line only
- Export-as-PDF with annotations — feature, defer to dedicated print/export phase
- Layer system (toggle annotation visibility separately) — always-visible for v1.15
- Snap to product corners or other annotations — wall endpoints + midpoints only

## Files we expect to touch

- `src/types/cad.ts` — add `MeasureLine` + `Annotation` interfaces; extend `RoomDoc` with `measureLines` + `annotations` fields; bump snapshot version literal v4 → v5
- `src/stores/cadStore.ts` — 6 new actions + 6 *NoHistory variants
- `src/lib/snapshotMigration.ts` — `migrateV4ToV5()` arm with empty-maps default
- `src/lib/geometry.ts` — new `polygonArea(walls)` shoelace helper
- `src/canvas/dimensions.ts` — extend with `drawMeasureLine` + `drawAnnotation` + `drawRoomAreaOverlay` builders (or new file `src/canvas/measureSymbols.ts`)
- `src/canvas/tools/measureTool.ts` — NEW (~120 lines): two-click placement with live preview + smart-snap
- `src/canvas/tools/labelTool.ts` — NEW (~80 lines): single-click placement with immediate edit mode
- `src/canvas/fabricSync.ts` — render measureLines + annotations + room-area overlay; selectable+evented
- `src/canvas/FabricCanvas.tsx` — register tool activations; hit-test branches for new kinds; handle live-preview cursor
- `src/components/Toolbar.tsx` — add Measure + Label buttons (lucide Ruler + Type icons; keyboard shortcuts M + T)
- `src/components/PropertiesPanel.tsx` — add Room area display (XX SQ FT) when no entity selected; new MeasureLine + Annotation sections (or keep minimal — Delete from right-click is sufficient for v1.15)
- `src/components/CanvasContextMenu.tsx` — `if (kind === "measureLine")` and `if (kind === "annotation")` branches
- `src/stores/uiStore.ts` — extend `ContextMenuKind` union with `"measureLine"` and `"annotation"`
- `src/test-utils/measureDrivers.ts` — NEW: `__drivePlaceMeasureLine`, `__drivePlaceAnnotation`, `__getRoomArea`
- `tests/lib/geometry.polygonArea.test.ts` — NEW (3 unit tests for shoelace)
- `tests/stores/cadStore.measure.test.ts` — NEW (4 unit tests U2-U4 + migration)
- `tests/components/PropertiesPanel.area.test.tsx` — NEW (3 component tests)
- `e2e/measurements.spec.ts` — NEW (9 e2e scenarios E1-E9)

Estimated 1 plan, 7-8 tasks, ~17 files. Mid-size phase, similar shape to Phase 60/61.

## Open questions for research phase

1. **Live-preview cursor in Fabric.js:** what's the canonical pattern for a ghost preview shape that follows the cursor between two clicks? Look at existing `wallTool.ts` (which has 2-click drawing for walls) for the reference pattern. Confirm Phase 30 smart-snap integrates with the preview cursor.

2. **`InlineEditableText` mounting on a fabric Canvas:** the primitive is React/DOM-based. For label editing, we need a DOM input overlay positioned over the fabric canvas at the annotation's screen coordinates. Pattern likely exists in Phase 29 dimension-label edit (`src/canvas/dimensionEditor.ts` referenced in `FabricCanvas.tsx:41`). Confirm reusable approach.

3. **Shoelace formula for room polygon:** existing wall data is `WallSegment[]` with start/end points. Are walls guaranteed CCW-wound? Some rooms may be drawn CW. Recommend `Math.abs(shoelace_sum) / 2` to be winding-agnostic, OR confirm a winding-fix exists.

4. **Room polygon centroid:** for the canvas-overlay area label, we need to position it at the centroid of the room polygon. For axis-aligned rectangles this is easy; for L-shapes the centroid of the bounding box may be OUTSIDE the room. Use the polygon centroid formula (vertex-weighted by area), OR the simpler "average of vertices" if rooms stay convex in v1.15.

5. **Phase 53 menu integration shape:** confirm exact location to inject `getActionsForKind('measureLine')` and `getActionsForKind('annotation')` branches per Phase 61 D-11' precedent. Lighter action sets — research should confirm the menu widget renders correctly with 1-2 actions (instead of 4-6).

6. **Snapshot migration test fixtures:** there may be existing v3 / v4 fixtures in `tests/__fixtures__/snapshots/` (or similar). Confirm the migration test pattern to mirror for v4 → v5.

7. **PropertiesPanel "no entity selected" state:** PropertiesPanel currently has sequential `if (entity)` blocks per Phase 61 research Q4. What does it show when nothing is selected? Is there an existing "Room" branch that fires when no individual entity is selected, or does it show empty? The room-area display fits naturally into a "Room properties" section — confirm location.
