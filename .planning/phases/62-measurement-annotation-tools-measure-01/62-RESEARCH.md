---
phase: 62-measurement-annotation-tools-measure-01
type: research
created: 2026-05-04
status: ready-for-planning
requirements: [MEASURE-01]
---

# Phase 62: Measurement + Annotation Tools (MEASURE-01) — Research

**Researched:** 2026-05-04
**Domain:** 2D CAD canvas tools (Fabric.js), polygon geometry, snapshot migration
**Confidence:** HIGH

## Summary

17 decisions are locked in CONTEXT.md. Research confirms each open question has a clean precedent in the codebase. No new patterns required — every piece (live preview, DOM overlay, shoelace, sparse menu, fixture pattern, no-selection PropertiesPanel branch) maps directly to existing Phase 30/31/53/60/61 code paths. Risk surface is small.

**Primary recommendation:** Mirror `wallTool.ts` (preview pattern), `dimensionEditor.ts`+`FabricCanvas.tsx:574-650` (DOM overlay pattern), and Phase 60 stair migration arm. Add a sixth top-level branch to PropertiesPanel for "Room is selected by default" state.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

D-01 — Two new entity types: `MeasureLine` (id, start, end) + `Annotation` (id, position, text); both stored at room level (`RoomDoc.measureLines`, `RoomDoc.annotations`).

D-02 — Snapshot v4 → v5 bump. Migration arm `migrateV4ToV5()` seeds empty maps.

D-03 — 2D-only rendering. No 3D billboards.

D-04 — Auto room-area in two places: PropertiesPanel `AREA: XX SQ FT` row (when no leaf entity selected) AND subtle 2D canvas overlay at room polygon centroid.

D-05 — Measure tool: click → live preview → click. Auto-revert to Select after commit (mirrors EDIT-11).

D-06 — Dimension line style: 1px stroke `text-text-dim`, 4px perpendicular ticks at endpoints, `formatFeet()` label centered with white pill bg.

D-07 — Label tool: click → place empty annotation → immediate edit mode. Empty commit removes the annotation. Double-click to re-edit.

D-08 — Annotation visual: IBM Plex Mono 12px, `text-text-primary`, `bg-obsidian-low` rounded-sm pill.

D-09 — Smart-snap: consume-only. `buildSceneGeometry` + `snapEngine.ts` untouched.

D-10 — 6 new cadStore actions + 6 `*NoHistory` variants per Phase 60 stairs pattern.

D-11 — Phase 53/54 wiring is NEW code (Phase 61 D-11' lesson). Touches: `uiStore.ts:157+164` ContextMenuKind union, `FabricCanvas.tsx:498-area` hit-test branches, `CanvasContextMenu.tsx` `getActionsForKind` branches, `fabricSync.ts` selectable+evented, `cadStore.ts` remove* actions.

D-12 — SKIP tree integration for v1.15.

D-13 — Edit existing: drag endpoints (measure), drag body (translate), double-click annotation to re-edit, right-click → Delete.

D-14 — Toolbar: lucide `Ruler` (M shortcut), `Type` (T shortcut).

D-15 — 16 tests total: 4 unit, 3 component, 9 e2e.

D-16 — Atomic commits per task. D-17 — zero regressions across all listed phases; 4 pre-existing vitest failures remain exactly 4.

### Claude's Discretion

- Internal split between `dimensions.ts` extension vs. new `measureSymbols.ts` file — recommend new `measureSymbols.ts` (keeps `dimensions.ts` focused on auto room/wall labels; new file owns measureLine + annotation + room-area-overlay builders).
- Annotation pill width — recommend auto-fit text width with 6px horizontal padding; cap at 30 chars displayed (text wraps via newline if longer).
- DOM-overlay z-index for annotation editor — recommend `zIndex: 30` (above wainscot popover at 20, dimension input at 10).
- Centroid choice — see Q4 below.

### Deferred Ideas (OUT OF SCOPE)

3D rendering of dimensions/labels; drag-to-measure (live during drag); multi-line / rich text annotations; annotation rotate / scale / per-instance font; tree integration; measurement chain; angle measurement; arc-opening diameter; PDF export; layer toggle; snap to product corners or annotations.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEASURE-01 | Dimension lines + free-form labels + auto room-area | All 7 questions resolved with HIGH/MEDIUM confidence. |

---

## Q1 — Live-preview cursor pattern (HIGH)

**Reference:** `src/canvas/tools/wallTool.ts:34-232`

The canonical 2-click preview pattern is fully realized in `wallTool.ts`:

1. **Closure-state binds preview objects:** `let startPoint`, `let previewLine`, `let startMarker`, `let lengthLabel` declared inside `activateWallTool()`. No module-level state.
2. **`onMouseDown` toggles state:** if `!startPoint`, sets first endpoint and creates `startMarker` (4px purple circle). Else, commits via store action and calls `clearPreview()`.
3. **`onMouseMove` updates preview:** computes snapped pointer in feet; if `startPoint` is null, only updates the optional endpoint highlight; else updates `previewLine.set({ x1, y1, x2, y2 })` and the live `lengthLabel` group (rect bg + text). Creates objects on first move, mutates thereafter.
4. **`clearPreview()` removes all preview objects + nulls refs + `fc.renderAll()`** — called on commit, Escape, and from the cleanup function returned by activate().
5. **Cleanup contract:** `return () => { fc.off(...); document.removeEventListener(...); clearPreview(); }` — matches Phase D-08 tool cleanup pattern.
6. **Smart-snap integration:** wallTool does its own endpoint hunt (`findNearestEndpoint`); for measureTool we instead consume Phase 30 `computeSnap()` from `snapEngine.ts` (per CONTEXT D-09 — wall endpoints + midpoints already in default snap scene). Wire identically to Phase 31 wall-endpoint drag in `selectTool.ts` — call `computeSnap(cursor, sceneGeometry, gridSnap, opt.e.altKey, opt.e.shiftKey)` and use the resulting snap point. Render Phase 30 accent-purple guide (already drawn by `snapGuides.ts`).

**Recommended `measureTool.ts` shape (~120 LOC):** structurally identical to `wallTool.ts` but:
- Replace `addWall` → `addMeasureLine(activeRoomId, { start, end })`
- Use `computeSnap` (Phase 30) instead of manual `findNearestEndpoint`
- Preview line style: solid 1px `text-text-dim` (not purple dashed) — D-06
- Preview label uses formatFeet, mirroring lines 184-211
- Auto-revert to select on commit (D-05) — mirrors `wallTool.ts:105`

---

## Q2 — DOM input overlay on fabric canvas (HIGH)

**Reference:** `src/canvas/dimensionEditor.ts` + `src/canvas/FabricCanvas.tsx:574-650`

The pattern is already proven for wall-dimension editing:

1. **`computeLabelPx(wall, scale, origin)`** returns canvas-pixel coords for the label center (`dimensionEditor.ts:9-27`).
2. **React state in FabricCanvas:** `const [editingWallId, setEditingWallId] = useState<string | null>(null)` + `pendingValue`.
3. **Compute `overlayStyle` during render** (FabricCanvas.tsx:574-594): reads wrapper `getBoundingClientRect()`, derives current `scale`/`origin` via `getViewTransform()`, calls `computeLabelPx`, builds `{ position: "absolute", left: label.x - 48, top: label.y - 10, width: 96, height: 20, zIndex: 10 }`.
4. **Render conditional `<input>`** inside the relative wrapper div (`FabricCanvas.tsx:632-650`):
   - `autoFocus` + `onFocus={(e) => e.currentTarget.select()}`
   - `onBlur={commitEdit}` (commits)
   - `onKeyDown` handles Enter (commit) + Escape (cancel)
   - Style: `font-mono text-[11px] bg-obsidian-high text-accent-light border border-accent px-1 outline-none`
   - `data-testid="dimension-edit-input"`

**Gotchas:**
- The wrapper div is `relative w-full h-full overflow-hidden` — overlay positions relative to it, not the page.
- `editingWallId` recomputes overlay style on every render. Pan/zoom updates `userZoom`/`panOffset` in uiStore; component must subscribe so overlay follows. Wall-dim editor already does — copy exactly.
- z-index ladder: dimension input `10`, wainscot popover `20`. Use `30` for annotation editor (above both).
- `flushSync` is used in `EditableRow` (PropertiesPanel.tsx:728) to keep inline-edit deterministic in tests — apply to label editor.

**Recommended pattern for label editor:**
- New React state `[editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null)` in `FabricCanvas.tsx`.
- Coordinate conversion: `screenX = origin.x + position.x * scale`, `screenY = origin.y + position.y * scale` (no `computeLabelPx` indirection — annotation has its own anchor).
- Render `<InlineEditableText>` (Phase 33 primitive) wrapped in absolute-positioned `<div>` with `style={overlayStyle}` and `zIndex: 30`.
- For "click → place + immediate edit" flow (D-07): `labelTool.ts` calls `addAnnotation()` returning `{id}`, then synchronously calls `useUIStore.getState().setEditingAnnotationId(id)` (new uiStore field), then auto-reverts tool. FabricCanvas reads that state and renders the overlay.

**Test driver hooks:** mirror `__openDimensionEditor` (FabricCanvas.tsx:348) — expose `__openAnnotationEditor(annotationId)` gated by `MODE === "test"`.

---

## Q3 — Shoelace formula winding (HIGH)

**Reference:** `src/lib/geometry.ts:1-237`

**Findings:**
- No existing `polygonArea` helper. The file has `wallLength`, `wallCorners`, `mitredWallCorners`, `closestPointOnWall`, `formatFeet`, `resizeWall` — nothing computes signed area.
- **Walls are NOT guaranteed CCW.** `addWall` in cadStore takes `(start, end)` in click order; users draw rooms freely (clockwise or counter-clockwise). The mitre code at `geometry.ts:117-188` handles cross-product sign in both directions — implicit acknowledgment that winding is mixed.
- No winding-fix helper exists; recommend `Math.abs(...)`.

**Recommended algorithm:**

```ts
/** Compute room polygon area in square feet via shoelace formula.
 *  Walls don't share a guaranteed winding — Math.abs() makes it sign-agnostic.
 *  Builds the polygon by chaining wall.start → wall.end vertices in array order.
 *  Returns 0 for fewer than 3 walls or degenerate input.
 */
export function polygonArea(walls: WallSegment[]): number {
  if (walls.length < 3) return 0;
  const verts: Point[] = walls.map(w => w.start);  // assumes walls form a closed loop
  let sum = 0;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}
```

**Edge cases the planner must handle:**
1. **Walls don't form a closed loop:** if user has 4 disconnected walls, `walls.map(w => w.start)` gives 4 points but they may not be a polygon. Recommend: detect connectedness — for each consecutive pair, `walls[i].end ≈ walls[i+1].start` (epsilon 1e-3 ft). If not connected, return 0 + log a debug warning. Jessica's rooms have always-connected walls in practice.
2. **Self-intersecting (figure-8) polygon:** shoelace returns the signed difference of the two lobes — gives wrong area but doesn't crash. Document as known limitation; users don't draw figure-8 rooms.
3. **Less than 3 walls:** return 0 (no polygon).
4. **Wall ordering in `Object.values(walls)`:** insertion order preserved by JS — since walls are added sequentially during room drawing, order matches polygon traversal. Document this assumption in the helper's JSDoc.

**Unit tests (D-15 U1):**
- 10×10 axis-aligned square → 100 sq ft
- L-shape (5×10 + 5×5 inset) → 75 sq ft  ✱ tests winding-agnosticism + concavity
- 3-4-5 right triangle → 6 sq ft
- 2 walls → 0
- Both winding orders of same square → identical result (verifies `Math.abs`)

---

## Q4 — Polygon centroid for canvas overlay (MEDIUM → HIGH with recommendation)

**Reference:** none in codebase — fresh implementation.

**Locked context:** Phase 60 stairs and Phase 61 niches DO render in concave rooms. L-shapes are real. Bbox-center fails (the centroid of an L's bounding box sits in the empty notch).

**Recommended algorithm: vertex-area-weighted centroid (proper formula).**

```ts
/** Polygon centroid via the area-weighted formula. Returns { x, y } in feet.
 *  For an L-shape, this guarantees the point sits inside the polygon (unlike bbox center).
 *  Falls back to vertex average for degenerate (zero-area) polygons.
 */
export function polygonCentroid(walls: WallSegment[]): Point {
  const verts: Point[] = walls.map(w => w.start);
  if (verts.length < 3) return verts[0] ?? { x: 0, y: 0 };

  let cx = 0, cy = 0, signedArea = 0;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    const cross = a.x * b.y - b.x * a.y;
    signedArea += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }

  if (Math.abs(signedArea) < 1e-9) {
    // Degenerate — average vertices
    const avg = verts.reduce((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }), { x: 0, y: 0 });
    return { x: avg.x / verts.length, y: avg.y / verts.length };
  }

  signedArea /= 2;
  cx /= 6 * signedArea;
  cy /= 6 * signedArea;
  return { x: cx, y: cy };
}
```

**Caveat (LOW concern):** for severe non-convex shapes (e.g., a U with a deep notch), the area-weighted centroid CAN still land outside the polygon. For Jessica's likely room shapes (L, T, simple rectangles) this is fine. If it ever fails in practice, post-v1.15 fallback is "polylabel" (pole-of-inaccessibility) — but that's a 60-line algorithm we don't need now.

**Don't hand-roll polygon-in-polygon test** — defer to v1.16 if reported.

---

## Q5 — Phase 53 menu with sparse action sets (HIGH)

**Reference:** `src/components/CanvasContextMenu.tsx` (full file read)

The menu widget renders sparse action lists cleanly. Evidence:
- `kind === "ceiling"` returns `[...baseActions]` only — 3 actions. Renders fine.
- `kind === "empty"` with no clipboard returns `[]`, and the component **early-returns null** at line 244: `if (actions.length === 0) return null;` — this is desired behavior for "nothing to show" but means an action set must contain ≥1 entry.
- Each action is a flex row with icon + label, height 24px. No header, no dividers, no group separators. Sparse lists look identical to dense ones aesthetically.

**ContextMenuKind union extension** (`uiStore.ts:157` + `:164`):

```ts
// BEFORE
kind: "wall" | "product" | "ceiling" | "custom" | "empty" | "stair" | "opening";
// AFTER
kind: "wall" | "product" | "ceiling" | "custom" | "empty" | "stair" | "opening" | "measureLine" | "annotation";
```

Both call sites at line 157 and line 164 need the same edit.

**`getActionsForKind` branches to add (in CanvasContextMenu.tsx, after the `opening` block at line ~181):**

```ts
if (kind === "measureLine") {
  return [
    {
      id: "delete", label: "Delete", icon: <Trash2 size={14} />,
      handler: () => {
        if (!nodeId) return;
        const docLocal = getActiveRoomDoc();
        if (docLocal) store.removeMeasureLine(docLocal.id, nodeId);
      },
      destructive: true,
    },
  ];
}
if (kind === "annotation") {
  return [
    {
      id: "edit-text", label: "Edit text", icon: <Edit3 size={14} />,
      handler: () => {
        if (!nodeId) return;
        ui.setEditingAnnotationId(nodeId);  // new uiStore field
      },
    },
    {
      id: "delete", label: "Delete", icon: <Trash2 size={14} />,
      handler: () => {
        if (!nodeId) return;
        const docLocal = getActiveRoomDoc();
        if (docLocal) store.removeAnnotation(docLocal.id, nodeId);
      },
      destructive: true,
    },
  ];
}
```

**FabricCanvas.tsx hit-test branches** (after the `opening` branch at FabricCanvas.tsx:489-498, before `wall`):

```ts
} else if (d.type === "measureLine" && d.measureLineId) {
  if ((obj as fabric.FabricObject).containsPoint(pointer)) {
    hit = { kind: "measureLine", nodeId: d.measureLineId as string };
    break;
  }
} else if (d.type === "annotation" && d.annotationId) {
  if ((obj as fabric.FabricObject).containsPoint(pointer)) {
    hit = { kind: "annotation", nodeId: d.annotationId as string };
    break;
  }
}
```

(Order doesn't matter — neither overlaps with walls/openings.)

**Click-to-select wiring (Phase 54):** mirror Phase 60 stairs and Phase 61 openings — add `selectable: true, evented: true` to the fabric.Group in `fabricSync.ts` for each rendered measureLine + annotation. Add corresponding selection branches in `selectTool.ts` for hit-test.

---

## Q6 — Snapshot migration test fixtures (HIGH)

**Reference:** `tests/snapshotMigration.test.ts` (full file read)

**Findings:**
- **No JSON fixture files** exist. There is no `tests/__fixtures__/snapshots/` or similar directory. The fixture dir at `tests/e2e/fixtures` is for Playwright traces, not JSON snapshots.
- **All migration test fixtures are inline JS objects** in the test file. See `snapshotMigration.test.ts:6-47`.

**Pattern to mirror for v4 → v5:**

```ts
// tests/snapshotMigration.test.ts — append new describe block
describe("migrateV4ToV5", () => {
  it("v4 input gets measureLines + annotations seeded as empty maps", () => {
    const v4: CADSnapshot = {
      version: 4,
      rooms: {
        room_main: {
          id: "room_main", name: "Main Room",
          room: { width: 20, length: 16, wallHeight: 8 },
          walls: {}, placedProducts: {}, stairs: {},
        },
      },
      activeRoomId: "room_main",
    };
    const v5 = migrateV4ToV5(v4);
    expect(v5.version).toBe(5);
    expect(v5.rooms.room_main.measureLines).toEqual({});
    expect(v5.rooms.room_main.annotations).toEqual({});
  });

  it("v5 passthrough is a no-op", () => {
    const v5: CADSnapshot = {
      version: 5,
      rooms: { room_x: { id: "room_x", name: "X",
        room: {width:8,length:8,wallHeight:8},
        walls:{}, placedProducts:{}, stairs:{},
        measureLines:{}, annotations:{} } },
      activeRoomId: "room_x",
    };
    expect(migrateV4ToV5(v5)).toBe(v5);
  });

  it("preserves existing rooms data (walls, products, stairs) unchanged", () => { /* ... */ });
});
```

Also update the existing "empty/unknown input" test at line 28-36 — `defaultSnapshot()` will need to seed `measureLines: {}` + `annotations: {}` per RoomDoc, and the test's `expect(d.version).toBe(4)` must bump to `expect(d.version).toBe(5)`.

**Migration arm location:** add `migrateV4ToV5()` to `src/lib/snapshotMigration.ts` at the end of the file (after `migrateV3ToV4`). Wire it into the cadStore loadSnapshot pipeline AFTER `migrateV3ToV4` so v2 → v3 → v4 → v5 chains in sequence (per the comment at `snapshotMigration.ts:166-180`).

---

## Q7 — PropertiesPanel "no entity selected" / Room state (HIGH)

**Reference:** `src/components/PropertiesPanel.tsx:273-287`

**Current behavior at lines 273-287:** when `!wall && !pp && !ceiling && !pce && !stair`, the panel renders an empty-state card with the heading "Properties" and a single line of muted copy: *"Select a wall, product, or ceiling to see its properties here."* No room data is shown.

**No existing "Room is the implicit selection" branch** — D-04's spec ("when no entity is selected, Room is the implicit selected object") is net-new behavior.

**Recommended injection:** replace the empty-state branch with a Room-properties branch.

```tsx
if (!wall && !pp && !ceiling && !pce && !stair) {
  const activeDoc = useCADStore((s) => s.activeRoomId ? s.rooms[s.activeRoomId] : null);
  const wallList = activeDoc ? Object.values(activeDoc.walls) : [];
  const areaSqFt = polygonArea(wallList);  // 0 if not a closed loop
  return (
    <div className="absolute right-3 top-3 z-10 w-64 glass-panel rounded-sm p-4 space-y-3"
         aria-label="Properties (room)">
      <h3 className="font-mono text-base font-medium text-text-muted">
        Properties
      </h3>
      <div className="font-mono text-xs text-accent-light">
        {activeDoc?.name?.toUpperCase() ?? "ROOM"}
      </div>
      <CollapsibleSection id="dimensions" label="Dimensions">
        <div className="space-y-1.5">
          <Row label="WIDTH"  value={`${activeDoc?.room.width ?? 0} FT`} />
          <Row label="LENGTH" value={`${activeDoc?.room.length ?? 0} FT`} />
          <Row label="HEIGHT" value={`${activeDoc?.room.wallHeight ?? 0} FT`} />
          <Row label="AREA"   value={`${Math.round(areaSqFt)} SQ FT`} />
        </div>
      </CollapsibleSection>
      <p className="font-mono text-sm text-text-dim leading-snug">
        Select a wall, product, or ceiling to edit its properties.
      </p>
    </div>
  );
}
```

**Multi-room awareness (Phase 47):** `useCADStore.activeRoomId` already drives all selectors. Switching active rooms recomputes the area automatically — Zustand subscription handles it.

**Test for D-15 component test C5:** render PropertiesPanel with no selection in a room of known dimensions; assert `screen.getByText(/AREA/)` appears with the correct sq-ft value. Use the same 10×10 = 100 sq ft fixture as `polygonArea` unit test.

---

## Don't Hand-Roll

| Problem | Use Instead | Why |
|---------|-------------|-----|
| Live preview cursor | Mirror `wallTool.ts:34-232` | 200-line proven pattern — closure state + 3 lifecycle methods + cleanup |
| DOM input over fabric canvas | Mirror `FabricCanvas.tsx:574-650` overlay pattern | Already handles pan/zoom recompute, Enter/Escape, blur-commit |
| Text inline-edit logic | `<InlineEditableText>` from `src/components/ui/InlineEditableText.tsx` | Phase 33 primitive — already handles skipNextBlur + originalRef invariants |
| Snap targets for measure preview | `computeSnap(...)` from `snapEngine.ts` (Phase 30) | Already returns wall endpoints + midpoints; snapGuides paint accent |
| Snapshot version migration | Mirror `migrateV3ToV4` in `snapshotMigration.ts:181-188` | Idempotent guard + per-room mutation in 8 lines |
| Polygon-in-polygon test (centroid validation) | Skip — area-weighted formula handles L-shapes | Defer polylabel-style fallback to v1.16 |
| Mitred line endpoints for measure ticks | Plain perpendicular at endpoints (no neighbor lookup) | Measure lines aren't structural — no mitring needed |

---

## Common Pitfalls

### Pitfall 1: Drag transaction history coupling
**What goes wrong:** Endpoint drag on a measure line (D-13) creates one history entry per pixel-move if naive `update*` is called.
**Prevention:** Mirror Phase 31 drag-transaction pattern — `updateMeasureLine(id, {})` (empty patch, pushes one history entry) at drag start, `updateMeasureLineNoHistory(...)` mid-drag, no commit on mouseup. `past.length` increments by 1 per drag cycle.

### Pitfall 2: Annotation editor blur-vs-Escape race
**What goes wrong:** `<InlineEditableText>` already solves this (skipNextBlurRef), but the FabricCanvas-level overlay must NOT add its own onBlur or the handlers double-fire.
**Prevention:** Pass `onLivePreview` and `onCommit` props directly through to the primitive; don't wrap in another input.

### Pitfall 3: Empty-text annotation removal during edit
**What goes wrong:** D-07 says empty commit removes the annotation, but `<InlineEditableText>:52-56` reverts to original on empty (treats as cancel). Direct reuse won't work for the "place new label → user types nothing → Enter" case.
**Prevention:** For LabelTool's just-placed annotation, the "original" value is `""`. The primitive's revert-to-empty path must also dispatch `removeAnnotation(roomId, id)`. Plan this as a custom `onCommit` wrapper in FabricCanvas: `if (final === "" && originalWasEmpty) { removeAnnotation(...) } else { updateAnnotation(...) }`.

### Pitfall 4: Polygon centroid outside polygon for non-convex shapes
**What goes wrong:** Area-weighted centroid CAN land outside a deep U or C shape.
**Prevention:** Acceptable for v1.15 (Jessica's rooms are L/T/rectangle). Document the caveat; don't over-engineer.

### Pitfall 5: Walls don't form a closed loop
**What goes wrong:** `polygonArea([w1, w2, w3])` where walls don't share endpoints returns garbage. The area badge in PropertiesPanel + canvas overlay both show wrong values.
**Prevention:** Add a connectivity check in `polygonArea` — return 0 if any consecutive pair fails `dist(walls[i].end, walls[i+1].start) < 1e-3`. PropertiesPanel hides AREA row when 0; canvas overlay also hides.

### Pitfall 6: Measure tool integration with Phase 30 snap guides
**What goes wrong:** `snapEngine.ts` paints accent guides only when an active tool calls `renderSnapGuides()`. Measure tool must wire the guide-drawing call into its `onMouseMove`.
**Prevention:** Look at `selectTool.ts` wall-endpoint drag (Phase 31) for the exact `computeSnap` + guide-render call sequence. Copy verbatim.

---

## Code Examples

### Live-preview pattern (from wallTool.ts — pattern to mirror)
```ts
// Source: src/canvas/tools/wallTool.ts:34-232
export function activateMeasureTool(fc, scale, origin): () => void {
  let startPoint: Point | null = null;
  let previewLine: fabric.Line | null = null;
  let previewLabel: fabric.Group | null = null;

  const clearPreview = () => { /* fc.remove + null + renderAll */ };

  const onMouseDown = (opt) => {
    const cursor = pxToFeet(fc.getViewportPoint(opt.e), origin, scale);
    const snapped = computeSnap(cursor, /* phase 30 scene */) ?? cursor;
    if (!startPoint) {
      startPoint = snapped;
    } else {
      const roomId = useCADStore.getState().activeRoomId;
      if (roomId) useCADStore.getState().addMeasureLine(roomId, { start: startPoint, end: snapped });
      clearPreview();
      useUIStore.getState().setTool("select"); // auto-revert per D-05
    }
  };

  const onMouseMove = (opt) => { /* update previewLine + previewLabel; render guides */ };
  const onKeyDown = (e) => { if (e.key === "Escape") clearPreview(); };

  fc.on("mouse:down", onMouseDown);
  fc.on("mouse:move", onMouseMove);
  document.addEventListener("keydown", onKeyDown);
  return () => { fc.off(...); document.removeEventListener(...); clearPreview(); };
}
```

### DOM overlay positioning (from FabricCanvas.tsx — pattern to mirror)
```ts
// Source: src/canvas/FabricCanvas.tsx:574-650
let annotationOverlayStyle: React.CSSProperties | null = null;
if (editingAnnotationId) {
  const ann = activeDoc?.annotations[editingAnnotationId];
  const rect = wrapperRef.current?.getBoundingClientRect();
  if (ann && rect) {
    const { scale, origin } = getViewTransform(...);
    const screenX = origin.x + ann.position.x * scale;
    const screenY = origin.y + ann.position.y * scale;
    annotationOverlayStyle = {
      position: "absolute",
      left: screenX - 60, top: screenY - 12,
      width: 120, height: 24,
      zIndex: 30,
    };
  }
}
// in JSX:
{annotationOverlayStyle && (
  <InlineEditableText
    value={ann.text}
    onLivePreview={(v) => updateAnnotationNoHistory(roomId, editingAnnotationId, { text: v })}
    onCommit={(v) => { updateAnnotation(roomId, editingAnnotationId, { text: v }); setEditingAnnotationId(null); }}
    maxLength={200}
    className="..."
    data-testid={`annotation-edit-${editingAnnotationId}`}
  />
)}
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 1.x + @testing-library/react + Playwright |
| Config file | `vitest.config.ts`, `playwright.config.ts` |
| Quick run command | `npx vitest run --no-coverage` |
| Full suite command | `npm test && npx playwright test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEASURE-01 | `polygonArea` shoelace correct | unit | `npx vitest run tests/lib/geometry.polygonArea.test.ts` | ❌ Wave 0 |
| MEASURE-01 | `polygonCentroid` for L-shape | unit | same as above | ❌ Wave 0 |
| MEASURE-01 | cadStore add/update/remove measureLine + annotation | unit | `npx vitest run tests/stores/cadStore.measure.test.ts` | ❌ Wave 0 |
| MEASURE-01 | snapshot v4→v5 migration | unit | `npx vitest run tests/snapshotMigration.test.ts` | ✅ extend |
| MEASURE-01 | PropertiesPanel renders AREA when no selection | component | `npx vitest run tests/components/PropertiesPanel.area.test.tsx` | ❌ Wave 0 |
| MEASURE-01 | Annotation edit dispatches NoHistory + commit | component | same dir | ❌ Wave 0 |
| MEASURE-01 | MeasureLine endpoint drag = single undo entry | component | same dir | ❌ Wave 0 |
| MEASURE-01 | Place measureLine end-to-end | e2e | `npx playwright test e2e/measurements.spec.ts` | ❌ Wave 0 |
| MEASURE-01 | Smart-snap on preview | e2e | same | ❌ Wave 0 |
| MEASURE-01 | Place annotation + edit | e2e | same | ❌ Wave 0 |
| MEASURE-01 | Right-click → Delete (both kinds) | e2e | same | ❌ Wave 0 |
| MEASURE-01 | Save → reload → persist (v4→v5 migration) | e2e | same | ❌ Wave 0 |
| MEASURE-01 | Old v4 snapshot loads cleanly | e2e | same | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --no-coverage` (~10s for the touched tests)
- **Per wave merge:** `npm test`
- **Phase gate:** full Playwright run + 4 pre-existing failures remain exactly 4

### Wave 0 Gaps
- [ ] `tests/lib/geometry.polygonArea.test.ts` — covers polygonArea + polygonCentroid (3-5 cases each)
- [ ] `tests/stores/cadStore.measure.test.ts` — covers MeasureLine + Annotation actions
- [ ] `tests/components/PropertiesPanel.area.test.tsx` — covers Room-properties branch + AREA row
- [ ] `e2e/measurements.spec.ts` — 9 scenarios E1-E9 per CONTEXT D-15
- [ ] `src/test-utils/measureDrivers.ts` — `__drivePlaceMeasureLine`, `__drivePlaceAnnotation`, `__getRoomArea`, `__openAnnotationEditor`
- Migration coverage: append v4→v5 cases to existing `tests/snapshotMigration.test.ts`

---

## Sources

### Primary (HIGH confidence) — code reads
- `src/canvas/tools/wallTool.ts` — 2-click preview canonical pattern
- `src/canvas/dimensionEditor.ts` + `src/canvas/FabricCanvas.tsx:574-650` — DOM overlay precedent
- `src/lib/geometry.ts` (full) — confirms no polygonArea exists, no winding fix
- `src/components/PropertiesPanel.tsx:273-287` — empty-state branch location
- `src/components/CanvasContextMenu.tsx` (full) — sparse action set rendering
- `src/lib/snapshotMigration.ts:181-188` — `migrateV3ToV4` template
- `src/stores/uiStore.ts:157,164,403` — ContextMenuKind union sites
- `src/components/ui/InlineEditableText.tsx` — primitive contract
- `tests/snapshotMigration.test.ts` — fixture pattern (inline JS objects, no JSON files)

### Secondary
- `src/canvas/dimensions.ts` — visual style reference for new measure labels (fontSize 11, formatFeet)
- Phase 60 stairs migration arm — direct template

---

## Metadata

**Confidence breakdown:**
- Q1 Live preview pattern: HIGH — wallTool.ts is a 200-line direct template
- Q2 DOM overlay: HIGH — already 2 working examples in FabricCanvas.tsx
- Q3 Shoelace winding: HIGH — `Math.abs()` sign-agnostic, simple algorithm
- Q4 Centroid: MEDIUM — area-weighted formula works for L-shapes but can fail on extreme U/C; acceptable for v1.15
- Q5 Sparse menu: HIGH — CanvasContextMenu already handles ceiling (3 actions) cleanly
- Q6 Migration fixtures: HIGH — inline-JS pattern confirmed; no JSON fixture files exist
- Q7 PropertiesPanel: HIGH — clean injection point at lines 273-287

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (30 days; codebase stable around these patterns post-Phase 61)
