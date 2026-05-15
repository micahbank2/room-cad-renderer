# Phase 86 — Context

**Captured:** 2026-05-15
**Phase:** 86 — Columns / Pillars (v1.20 milestone closer)
**Milestone:** v1.20 — Surface Depth & Architectural Expansion
**Issue closed:** [#19](https://github.com/micahbank2/room-cad-renderer/issues/19) (narrowed scope — see D-01)
**Branch:** `gsd/phase-86-columns`
**Research:** `86-RESEARCH.md`

---

## What This Phase Does

Adds **rectangular columns/pillars** as a new top-level architectural primitive — placeable in 2D, rendered in 3D, selectable/movable/resizable/deletable, and surfaced in the Rooms tree alongside stairs. Closes v1.20 by shipping the last outstanding architectural primitive (columns) ahead of v1.21 IA-polish work.

Mirrors the Phase 60 stair template almost 1:1. New snapshot version v9 → v10 with a **seed-empty migration** per room (matching the Phase 60 v3→v4 precedent — NOT a passthrough).

---

## Locked Decisions

### D-01 — Box geometry only in v1

Phase 86 ships **rectangular columns only**. The `Column` type carries a `shape: "box" | "cylinder"` field for forward compatibility, but **cylinder is not implemented in this phase**. Renderers branch on `shape === "box"` only; cylinder is a follow-on phase.

- 3D: `ColumnMesh` renders `<boxGeometry args={[widthFt, heightFt, depthFt]} />`.
- 2D: `fabricSync.renderColumns` emits a single rotated `fabric.Rect` per column (mirrors the stair outline rectangle pattern in `buildStairSymbolShapes`).
- Cylinder support deferred — file as a v1.21 follow-on GH issue when prioritized.

Implication for plans: Plan 86-01 widens the type union to `"box" | "cylinder"` but ALL renderers and tools assume `"box"` and ignore other values defensively (`if (column.shape !== "box") return null`).

### D-02 — Columns are leaf nodes in the Rooms tree

Add a **"Columns" group** under each room in `RoomsTreePanel`, mirroring the Phase 60 stair-group pattern exactly. Each column becomes a leaf node with:

- Visibility toggle (eye icon) wiring `uiStore.hiddenIds` — supports both per-column hide and `${roomId}:columns` group-level cascade
- Hover-highlight on the canvas via the existing Phase 81 `hoveredEntityId` mechanism — no new state introduced
- Click-to-select → `selectedIds = [columnId]`
- Double-click rename via `InlineEditableText` writing `column.labelOverride` (mirror Phase 60 D-08 stair rename)
- Camera-icon affordance for the saved-camera pattern (Phase 48 CAM-04) using `setSavedCameraOnColumnNoHistory` + `clearColumnSavedCameraNoHistory`

Implication for plans: `buildRoomTree.ts` gains a `columns` group key; `TreeNodeKind` union widens to include `"column"`; `RoomsTreePanel.tsx` focus/rename dispatch arms handle the new kind. No new ui-store state.

### D-03 — Column height is placement-locked

When a user places a column, its `heightFt` defaults to the active room's `room.wallHeight` AT PLACEMENT TIME and is then **stored as a static value**. Subsequent changes to `room.wallHeight` do **NOT** auto-resize existing columns.

The `ColumnInspector` Dimensions tab includes a **"Reset to wall height"** button that, on click, calls `resizeColumnHeight(roomId, columnId, room.wallHeight)` — exactly one history entry. Mirrors the Phase 31 RESET_SIZE affordance for `widthFtOverride`/`depthFtOverride` clears.

Rationale: honest behavior. The user explicitly chose the height when they placed the column; silently growing it on wall-height change would be surprising. The reset button gives an explicit one-click return-to-default.

Implication for plans: `columnTool` reads `room.wallHeight` at `setPendingColumn` time and passes it as a literal into the `addColumn` call. No wall-height watcher on existing columns.

### D-04 — Snapshot v9 → v10 with seed-empty migration

Bump `CADSnapshot.version` literal type from `9` to `10`. Add `migrateV9ToV10(snap)` to `src/lib/snapshotMigration.ts` that **iterates every RoomDoc and seeds `columns: {}`** (NOT a passthrough — matches the Phase 60 v3→v4 stair migration precedent at `snapshotMigration.ts:238-245`).

Wire the new migration into `cadStore.loadSnapshot` after `migratedV9 = migrateV8ToV9(...)` in the existing sequential pipeline. Update `defaultSnapshot()` to seed `columns: {}` on the freshly-minted main room.

Implication for plans: Plan 86-01 owns the schema bump + migration arm + pipeline wiring. Plans 86-02 and 86-03 consume an already-v10 snapshot. Consumers still use defensive `Object.values(doc.columns ?? {})` per the Phase 60 research Pitfall 2 contract.

### D-05 — Column data model

```ts
// src/types/cad.ts — new interface, sibling to Stair / CustomElement

export interface Column {
  /** Format: `col_<uid>`. */
  id: string;
  /** Footprint center on the floor plane, in feet (room-local). */
  position: Point;
  /** Footprint width in feet (X axis at rotation=0). Default 1.0. */
  widthFt: number;
  /** Footprint depth in feet (Y axis in 2D / Z axis in 3D at rotation=0). Default 1.0. */
  depthFt: number;
  /** Vertical extent in feet. Initialized from room.wallHeight at placement
   *  time per D-03; thereafter stored as a static value. */
  heightFt: number;
  /** Continuous radians. 0 = unrotated. Tool snaps to 15° while Shift held. */
  rotation: number;
  /** v1 ships "box" only (D-01). Type widened for future cylinder support. */
  shape: "box" | "cylinder";
  /** Phase 68 Material reference. Optional — falls back to a default off-white
   *  paint (`#f5f5f5`, roughness 0.85) when unset. */
  materialId?: string;
  /** Per-placement display name override (mirror Phase 60 D-08 stair). Max 40
   *  chars. Empty/undefined renders default "COLUMN" in 2D overlay. */
  name?: string;
  /** Phase 48 CAM-04 mirror (D-02 saved-camera affordance). */
  savedCameraPos?: [number, number, number];
  savedCameraTarget?: [number, number, number];
}

export const DEFAULT_COLUMN_WIDTH_FT = 1.0;
export const DEFAULT_COLUMN_DEPTH_FT = 1.0;

/** Non-id, non-position, non-heightFt defaults. heightFt is resolved at
 *  placement time from the active room's wallHeight (D-03). */
export const DEFAULT_COLUMN: Omit<Column, "id" | "position" | "heightFt"> = {
  widthFt: DEFAULT_COLUMN_WIDTH_FT,
  depthFt: DEFAULT_COLUMN_DEPTH_FT,
  rotation: 0,
  shape: "box",
  materialId: undefined,
  name: undefined,
};
```

`RoomDoc` gains a sibling field after `stairs?` (current `cad.ts:327`):

```ts
/** Phase 86 COL-01: per-room columns. Optional — older snapshots load with
 *  empty `{}` via v9→v10 migration. Consumers MUST use `?? {}` defensive
 *  fallback (Phase 60 research Pitfall 2 contract). */
columns?: Record<string, Column>;
```

Note: research recommended `rotation` in DEGREES (matching Stair). We keep **degrees** for consistency with the rest of the codebase (Stair, PlacedCustomElement, PlacedProduct all store degrees). The prompt's "radians" was a misstatement — confirmed via Stair.rotation usage at `StairMesh.tsx:80`.

### D-06 — Store actions mirror the Stair pattern exactly

The following 13 store actions land in `src/stores/cadStore.ts` (mirror `addStair`/`updateStair`/etc. at L1308–1383 line-for-line, swapping `stair` → `column` and `stairs` → `columns`):

| Action | Notes |
|--------|-------|
| `addColumn(roomId, partial: Partial<Column> & { position: Point }): string` | Generates `col_${uid()}`, applies DEFAULT_COLUMN, pushes history. heightFt MUST be supplied by caller (no implicit fallback — toolbar reads room.wallHeight at click time per D-03). |
| `updateColumn(roomId, columnId, patch)` | History-pushing patch via Object.assign. |
| `updateColumnNoHistory(roomId, columnId, patch)` | Drag-transaction sibling. |
| `removeColumn(roomId, columnId)` | History push + delete. |
| `removeColumnNoHistory(roomId, columnId)` | Bulk-delete sibling. |
| `moveColumn(roomId, columnId, position)` | Convenience wrapper for drag-end commit. |
| `moveColumnNoHistory(roomId, columnId, position)` | Drag-mid stroke. |
| `resizeColumnAxis(roomId, columnId, axis: "width" \| "depth", valueFt)` + `…NoHistory` | Clamps `[0.25, 50]` (matches `resizeProductAxis` floor). |
| `resizeColumnHeight(roomId, columnId, valueFt)` + `…NoHistory` | Mirror Phase 85 `resizeProductHeight` pair. Clamps `[0.25, 50]`. |
| `rotateColumn(roomId, columnId, degrees)` + `…NoHistory` | Sets `column.rotation` directly (no normalization beyond what Stair does). |
| `clearColumnOverrides(roomId, columnId)` | NO-OP in v1.20 — there's no override field on Column (widthFt/depthFt/heightFt are first-class numbers, not overrides). Included for API parity with Stair/Product so the inspector RESET button can call something. Implementation: pushHistory + reset widthFt/depthFt to defaults + heightFt = room.wallHeight. (NOTE: this is the "reset to wall height" button surface — D-03.) |
| `renameColumn(roomId, columnId, name)` | History-pushing thin wrapper over updateColumn({ name }). |
| `setSavedCameraOnColumnNoHistory(columnId, pos, target)` + `clearColumnSavedCameraNoHistory(columnId)` | Mirror Phase 48 stair saved-camera pair. |

Also: extend the `clearSavedCameraNoHistory` `kind` union at `cadStore.ts:157` from `"wall" | "product" | "ceiling" | "custom" | "stair"` to add `"column"`. Extend `CADState` interface above the implementations.

Implication for plans: Plan 86-01 ships all 13 actions + the state-interface declarations. Plans 86-02/86-03 consume them.

### D-07 — FloatingToolbar Column button uses lucide `Cuboid` icon

Add a Column button to the Structure group of `FloatingToolbar.tsx`, immediately AFTER the existing Stair button at L356. Use:

```tsx
{/* Column — D-01: rectangular box, v1.20. Cylinder deferred to a v1.21 phase. */}
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      variant="ghost"
      size="icon-touch"
      data-testid="tool-column"
      active={toolActive("column")}
      className={toolClass(toolActive("column"))}
      onClick={() => {
        const cad = useCADStore.getState();
        const roomId = cad.activeRoomId;
        const wallHeight = roomId ? cad.rooms[roomId]?.room.wallHeight ?? 8 : 8;
        setPendingColumn({
          widthFt: 1, depthFt: 1, heightFt: wallHeight, rotation: 0, shape: "box",
        });
        setTool("column");
      }}
    >
      <Cuboid size={22} />
    </Button>
  </TooltipTrigger>
  <TooltipContent side="top" collisionPadding={8}>Column tool <kbd>C</kbd></TooltipContent>
</Tooltip>
```

`Cuboid` is verified at `node_modules/lucide-react/dist/lucide-react.d.ts:6543`. Activates the new `"column"` tool added to the `ToolType` union (Plan 86-01).

Keyboard shortcut `C` is the recommended binding. CONFLICT NOTE: research found that `C` is **already used for the Ceiling tool** at `FloatingToolbar.tsx:335`. Plan 86-03 has Task: audit `src/lib/shortcuts.ts` and reassign — propose `Shift+C` for Column (Ceiling keeps `C`), OR drop the shortcut entirely for Phase 86 and file a follow-on issue. Default for Phase 86: **no keyboard shortcut yet**; ship the button only. Tooltip kbd display omitted until shortcut decision lands.

### D-08 — ColumnInspector tabs: Dimensions / Material / Rotation

Mirror the Phase 82 ProductInspector tab pattern (D-05 in Phase 82 CONTEXT). Use the shared `<Tabs>` primitive. Three tabs:

1. **Dimensions** — Reuse Phase 85 `<NumericInputRow>` and `clampInspectorValue` from `src/components/inspectors/PropertiesPanel.shared.tsx`. Inputs: Width / Depth / Height / X / Y. Each commits via the matching D-06 store action with silent clamp `[0.5, 50]` at the inspector layer (D-04 Phase 85 convention; store still clamps at `0.25` floor). Single-undo via no-history mid-edit + history push on commit. The **"Reset to wall height"** button (D-03) sits under the Height input — onClick calls `resizeColumnHeight(roomId, columnId, room.wallHeight)` exactly once → one history push.

2. **Material** — Reuse the Phase 68/82 material picker surface. Writes `column.materialId` via `updateColumn({ materialId })`. Falls back to off-white paint (`#f5f5f5`, roughness 0.85) when unset.

3. **Rotation** — A single `<NumericInputRow>` for rotation degrees (0–360 wrapping; commit via `rotateColumn`). Plus a quick "Reset to 0°" button. Single-undo per commit.

Also include a `SavedCameraButtons` block at the bottom of the inspector (outside tabs), mirroring `StairInspector` exactly — pass `kind="column"`, `id={column.id}`, `hasSavedCamera={!!column.savedCameraPos}`, wired to the new `setSavedCameraOnColumnNoHistory` + `clearColumnSavedCameraNoHistory` D-06 actions.

`RightInspector.tsx` discriminator (current L56+, mounts WallInspector/ProductInspector/CeilingInspector/CustomElementInspector/StairInspector based on `selectedIds[0]` entity type) gains a new branch for columns. Keys on `column.id` so React unmounts the previous inspector and remounts cleanly per Phase 82 D-03.

---

## Phasing Boundaries

| Stays in Phase 86 | Deferred |
|-------------------|----------|
| Box columns (rectangular) | Cylinder columns (file v1.21 follow-on) |
| Place/move/resize/rotate/delete | Object-to-object snap on column centers (depends on Phase 85.1) |
| Columns tree group | Drag-and-drop reorder of columns within tree (n/a — columns are unordered) |
| Material assignment (via D-08 Material tab) | Per-face material on columns (Phase 86 = uniform material across box faces) |
| Saved-camera affordance | Column copy/paste (Phase 53 CanvasContextMenu can extend later if needed) |
| Snapshot v9 → v10 with seed-empty migration | Column-to-column smart snap (consume-only for v1.20) |

---

## Tasks Live in Plans

- **86-01-PLAN.md** — Wave 1 — Data model + schema bump + store actions + RED tests
- **86-02-PLAN.md** — Wave 2 — Tool + 2D + 3D rendering + selection + hit-test
- **86-03-PLAN.md** — Wave 3 — Inspector + RoomsTreePanel integration + FloatingToolbar button + GREEN tests

Sequenced 1 → 2 → 3. Plan 86-02 depends on 86-01's types/actions. Plan 86-03 depends on 86-02's tool/rendering/select integration (needed to drive e2e flows).

---

## References

- `86-RESEARCH.md` — full Phase 60 file-by-file template, snapshot migration precedents, pitfalls
- `src/types/cad.ts:157–191` — Stair interface, the line-for-line model for Column
- `src/stores/cadStore.ts:1308–1383` — Stair store actions, the line-for-line model for D-06
- `src/canvas/tools/stairTool.ts` — columnTool template (snap consume-only, closure-state, cleanup)
- `src/three/StairMesh.tsx` — ColumnMesh template (simpler — single box, no step loop)
- `src/components/FloatingToolbar.tsx:319-356` — Structure group, exact placement for D-07
- `.planning/phases/85-parametric-controls-v1-20/85-CONTEXT.md` — D-04 (silent clamp), D-05 (single-undo numeric inputs) — the primitives Phase 86 reuses
- `.planning/phases/82-right-panel-inspector-v1-21/82-CONTEXT.md` — D-05 tab pattern for D-08

---

**Captured by:** GSD planner, 2026-05-15
**Decisions locked:** D-01 through D-08
