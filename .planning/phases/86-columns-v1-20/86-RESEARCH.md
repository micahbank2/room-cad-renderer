# Phase 86: Columns / Pillars (v1.20 milestone closer) — Research

**Researched:** 2026-05-15
**Domain:** New top-level architectural primitive (mirror Phase 60 stairs)
**Confidence:** HIGH (Phase 60 is a direct, well-documented template; every integration site is already grooved by Phase 60/62/82/85)
**Requirements addressed:** COL-01, COL-02, COL-03 (`.planning/milestones/v1.20-REQUIREMENTS.md` L53–65 — note: requirements file labels these as "Phase 81" but they were renumbered to **Phase 86** during v1.20 execution because Phase 81 was consumed by IA polish per D-02 boundary in CLAUDE.md).

---

## Summary

Columns mirror Phase 60 stairs almost 1:1. Stairs landed seven months ago as the first "new top-level architectural primitive" — that template (RoomDoc field + tool + 2D `renderXxx` in fabricSync + new 3D `XxxMesh.tsx` + Inspector + FloatingToolbar Structure-group button + snapshot bump + migration arm + drivers + e2e) is the playbook. Phase 86 inherits it directly.

**Primary recommendation:** Ship a **rectangular column (Box geometry, W × D × room.height by default)** as v1. Defer the round/cylinder shape to a follow-up; bake the affordance for shape variants into the type (`shape: "box"` literal now, `"box" | "cylinder"` later). Requirement COL-01 mentions "round or rectangular" — see Open Question #1 below; we recommend explicitly scoping v1 to rectangular and tracking the round variant as a v1.21 carry-over.

## User Constraints

> CONTEXT.md does not yet exist for Phase 86 — `/gsd:discuss-phase` has not run. The orchestrator handed scope directly. The planner should still run `/gsd:discuss-phase` if any of the Open Questions below need user input before implementation.

**Effective constraints from orchestrator prompt:**
- Mirror Phase 60 stair pattern
- Snapshot bump v9 → v10 (Phase 86 is the only schema change in this milestone after Phase 85's v8→v9)
- Recommendation bias: rectangular box, standalone placement (not wall-aligned), default 1ft × 1ft × room.height
- v1.20 closer — no follow-up phase to clean up
- `src/three/` modification is **expected and approved** (this is v1.20 architectural feature work, not a Phase 81 D-02 IA-polish violation)

**From CLAUDE.md (project-level):**
- §7 StrictMode-safe useEffect cleanup pattern — applies if column tool installs a test driver or any module-level callback registry
- D-09 mixed-case UI labels ("Column" not "COLUMN"); D-10 UPPERCASE preserved only for dynamic CAD identifiers (the column's display name in 2D overlay stays `.toUpperCase()`)
- D-15 Pascal token system: no `bg-obsidian-*`, no `glass-panel`; use `bg-card / text-foreground / bg-accent` etc.
- D-33 icon policy: lucide-react only. `Cuboid` is the right glyph for a rectangular column (see §"FloatingToolbar — Structure group" below)

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COL-01 | Place a round or rectangular column with configurable size via toolbar | §"Recommended Column Shape" + §"Data Model" + §"Implementation Plan" Task 3 (columnTool) |
| COL-02 | Column renders correctly in 2D (footprint) and 3D (extruded pillar at wall height) | §"Implementation Plan" Tasks 4 (fabricSync renderColumns) + 5 (ColumnMesh) |
| COL-03 | Selectable, movable, deletable; PropertiesPanel shows shape/size/position fields; single-undo contract | §"Implementation Plan" Tasks 2 (store actions w/ NoHistory variants) + 7 (ColumnInspector) |

---

## Current State

### Phase 60 stair template — direct files to mirror

| Role | Phase 60 file | Phase 86 equivalent |
|------|---------------|---------------------|
| Type definition | `src/types/cad.ts:157–191` (Stair interface + DEFAULT_STAIR consts) | Add `Column` interface + `DEFAULT_COLUMN` consts in same file |
| RoomDoc field | `src/types/cad.ts:327` (`stairs?: Record<string, Stair>`) | Add `columns?: Record<string, Column>` (same line zone) |
| Snapshot version | `src/types/cad.ts:376` (`version: 9`) | Bump to `version: 10` + update comment block at L358–375 |
| Snapshot default | `src/lib/snapshotMigration.ts:11–26` (`defaultSnapshot()`) | Add `columns: {}` to the seeded RoomDoc |
| Migration arm | `src/lib/snapshotMigration.ts:238–245` (`migrateV3ToV4` — non-trivial seed pattern) | New `migrateV9ToV10()` — **NOT a passthrough**, must seed `columns: {}` per RoomDoc |
| Migration pipeline | `src/stores/cadStore.ts:1594` (`migratedV9 = migrateV8ToV9(migratedV8)`) | Append `migratedV10 = migrateV9ToV10(migratedV9)` |
| Store actions | `src/stores/cadStore.ts:1308–1383` (addStair / updateStair / removeStair + NoHistory + resizeStairWidth) | Add `addColumn / updateColumn / removeColumn / resizeColumnAxis / clearColumnOverrides` + NoHistory variants |
| Type union | `src/types/cad.ts:394–409` (ToolType) | Add `"column"` after `"label"` |
| Tool | `src/canvas/tools/stairTool.ts` (312 lines) | New `src/canvas/tools/columnTool.ts` |
| 2D render | `src/canvas/fabricSync.ts:1221` (`renderStairs()`) | New `renderColumns()` in same file (parallel to stairs/measure/annotations passes) |
| Symbol helper | `src/canvas/stairSymbol.ts` (pure fabric.Object[] builder) | New `src/canvas/columnSymbol.ts` (simpler — single rotated rect + label) |
| 3D mesh | `src/three/StairMesh.tsx` (108 lines) | New `src/three/ColumnMesh.tsx` (simpler — single boxGeometry, no stepCount loop) |
| 3D mount | `src/three/RoomGroup.tsx` (iterates `doc.stairs ?? {}`) | Add parallel `Object.values(doc.columns ?? {}).map(...)` block |
| Inspector | `src/components/inspectors/StairInspector.tsx` (38 lines — flat pane) | New `src/components/inspectors/ColumnInspector.tsx` (flat pane per Phase 82 D-04) |
| FloatingToolbar | `src/components/FloatingToolbar.tsx:338–356` (Structure group, Footprints icon) | Add Column button in same group, `Cuboid` icon |
| Drivers | `src/test-utils/stairDrivers.ts` | New `src/test-utils/columnDrivers.ts` (gated by `import.meta.env.MODE === "test"`) |
| E2E | `e2e/stairs.spec.ts` | New `e2e/columns.spec.ts` |

### Existing v9 architecture (verified)

- `CADSnapshot.version: 9` (Phase 85, `src/types/cad.ts:376`)
- `RoomDoc` already carries: `walls`, `placedProducts`, `ceilings?`, `floorMaterial?`, `floorMaterialId?`, `placedCustomElements?`, `stairs?`, `measureLines?`, `annotations?`. Column slots cleanly as another optional sibling.
- `ToolType` already includes 12 tools (Phase 62 added measure/label). Add `"column"` as #13.
- `useResolvedMaterial(materialId, scaleFt, widthFt, heightFt)` (`src/three/useResolvedMaterial.ts:53`) is the standardized hook the column should call to pick up Phase 78 PBR maps for free.
- Phase 85 `<NumericInputRow>` (`src/components/inspectors/PropertiesPanel.shared.tsx`) handles single-undo numeric input — ColumnInspector reuses it directly.
- `installNumericInputDrivers()` and the StrictMode-safe identity-check cleanup pattern (CLAUDE.md §7) — reuse, don't reinvent.

### Snapshot migration precedent (critical reference)

The migration pipeline is **sequential, not chained**: cadStore.loadSnapshot at L1585–1594 calls `migrateSnapshot → migrateFloorMaterials → migrateV3ToV4 → migrateV4ToV5 → migrateV5ToV6 (async) → migrateV6ToV7 → migrateV7ToV8 → migrateV8ToV9`. Phase 86 appends `migrateV9ToV10` to the end.

Two precedent shapes:

1. **Trivial passthrough** (Phase 69 v6→v7, Phase 81 v7→v8, Phase 85 v8→v9 — `migrateV8ToV9` at `snapshotMigration.ts:581–585`): version bump only, no data change. Used when the new field is optional and absence is correct legacy behavior.

2. **Seed-empty-record** (Phase 60 v3→v4 `migrateV3ToV4` at L238–245; Phase 62 v4→v5 `migrateV4ToV5` at L256+): iterate all RoomDocs, ensure new field is `{}`, then bump version. Used when consumers MUST be able to read the field without `?? {}` everywhere — though the codebase still defensively uses `?? {}` per research Pitfall 2.

**Phase 86 picks #2.** Columns get `columns: {}` seeded per RoomDoc so the new `renderColumns()` and `RoomGroup` iteration paths can run on freshly-migrated v9 snapshots without crashes. Defensive `?? {}` at consumer sites is non-negotiable (CLAUDE.md §7 pattern parallel).

---

## Recommended Column Shape (Opinionated)

**Ship a rectangular pillar — `THREE.BoxGeometry(widthFt, heightFt, depthFt)` — as v1.**

Why box first:
- **Simplest primitive that satisfies COL-02.** A rectangular column placed in the room at wall height is unambiguously "a structural column." Jessica's house, in particular: most modern interior load-bearing columns ARE rectangular drywall-wrapped pillars, not classical round columns. Box is the realistic default.
- **One primitive shared with walls.** Wall `THREE.ExtrudeGeometry` and box columns both rasterize cleanly under the existing lighting + Phase 78 PBR maps without special-casing. A cylinder requires segment-count tuning, UV mapping that doesn't tile cleanly against the wall textures, and a different selection-bbox path.
- **2D footprint is a rotated rectangle.** Fabric.js `fabric.Rect` with `angle: column.rotation` — identical to how stair outline rectangles render today via `buildStairSymbolShapes`. A round 2D footprint would need `fabric.Circle` plus an "are we a circle in 2D" branch in the selection hit-test.
- **Phase 78 materials integrate with zero new work.** `useResolvedMaterial(materialId, scaleFt, widthFt + depthFt + heightFt)` already handles tiled PBR maps on rectangular surfaces. A cylinder needs cylindrical UV unwrapping.

**Defer cylinder shape** to a v1.21+ follow-up. Encode the affordance now: `shape: "box"` as a literal type. When the round variant ships later, widening to `shape: "box" | "cylinder"` is a passthrough migration.

**Override rationale:** if user says "no, I want round columns for our entryway specifically" during `/gsd:discuss-phase`, the cleanest deviation is to ship BOTH shapes in Phase 86 with a `shape` field + `diameterFt` (cylinder) / `widthFt + depthFt` (box) discriminated union. Add ~80 lines to ColumnMesh (cylinder branch) and ~40 lines to columnSymbol (circle branch). Confidence MEDIUM — not researched in depth, but the data-model affordance is there.

---

## Data Model Recommendation

```ts
// src/types/cad.ts — add after Stair (L191) and before CustomElement (L193)

/**
 * Phase 86 COL-01 (v1.20): rectangular column / pillar primitive.
 *
 * Stored at the room level (`RoomDoc.columns`). NOT a customElement because
 * columns are structural architecture (room-scoped, persist with the room),
 * not catalog placements.
 *
 * IMPORTANT (parallels Stair D-04): `position` is the FOOTPRINT CENTER on the
 * floor plane (XZ in 3D / xy in 2D feet). The column extrudes upward from
 * y=0 to y=heightFt in 3D.
 *
 * v1 ships rectangular columns only. The `shape` field is a literal `"box"`
 * to leave room for `"cylinder"` in a future schema bump without further
 * type churn at consumer sites.
 */
export interface Column {
  /** Format: `col_<uid>`. */
  id: string;
  /** Footprint center on the floor plane, in feet. */
  position: Point;
  /** v1.20 ships rectangular only; literal scope for forward compatibility. */
  shape: "box";
  /** Footprint width in feet (X axis at rotation=0). Default 1.0. */
  widthFt: number;
  /** Footprint depth in feet (Y axis in 2D / Z axis in 3D at rotation=0). Default 1.0. */
  depthFt: number;
  /** Vertical extent in feet. Default 8 (matches typical wall height); see Open Q4. */
  heightFt: number;
  /** Continuous degrees (matches Stair D-02 + PlacedCustomElement.rotation). */
  rotation: number;
  /** Phase 68 Material reference. Optional — falls back to a hard-coded
   *  default paint (`#f5f5f5`, roughness 0.85) until MAT-LINK lands. */
  materialId?: string;
  /** Per-column tile-size override (feet). Mirrors `RoomDoc.floorScaleFt` /
   *  `Ceiling.scaleFt`. */
  scaleFt?: number;
  /** Per-placement label override. Empty/undefined renders default "COLUMN".
   *  Max 40 chars. */
  labelOverride?: string;
  /** Phase 48 CAM-04 mirror — focus-camera affordance. */
  savedCameraPos?: [number, number, number];
  savedCameraTarget?: [number, number, number];
}

export const DEFAULT_COLUMN_WIDTH_FT = 1.0;
export const DEFAULT_COLUMN_DEPTH_FT = 1.0;

/** Non-id, non-position, non-heightFt defaults. heightFt is resolved at
 *  placement time from the active room's wallHeight (see Open Q4). */
export const DEFAULT_COLUMN: Omit<Column, "id" | "position" | "heightFt"> = {
  shape: "box",
  widthFt: DEFAULT_COLUMN_WIDTH_FT,
  depthFt: DEFAULT_COLUMN_DEPTH_FT,
  rotation: 0,
  materialId: undefined,
  scaleFt: undefined,
  labelOverride: undefined,
};
```

**RoomDoc extension** (after `stairs?` at L327):

```ts
/** Phase 86 COL-01: per-room rectangular columns. Optional — older snapshots
 *  load with empty `{}` via v9→v10 migration. Consumers MUST use `?? {}`
 *  defensive fallback (research Pitfall 2 — same contract as stairs). */
columns?: Record<string, Column>;
```

**CADSnapshot version bump** (L376):

```ts
/* Phase 86 COL-01: bumped from 9 to 10 — adds Room.columns: Record<string, Column>.
 * Migration seeds {} per RoomDoc (NOT a passthrough — mirrors Phase 60 v3→v4
 * + Phase 62 v4→v5 shape). */
version: 10;
```

**Decisions baked in:**
- Single `position` (XY footprint center), single `rotation` — same shape as PlacedCustomElement, simple to drag and rotate
- `widthFt` / `depthFt` / `heightFt` are first-class numbers (no `widthFtOverride` separation needed — there's no "catalog" column to override)
- `materialId` is optional and falls back to a hardcoded paint — keeps Phase 86 small; full material picker can land in MAT-LINK-01 later
- `shape: "box"` literal future-proofs without complicating consumers today

---

## Implementation Plan

Recommend **3 plans across 2 waves**, mirroring Phase 60's plan-count split and Phase 85's wave-cadence:

### Plan 86-01 (Wave 1) — Data model + schema bump + store actions
**Files:** `src/types/cad.ts`, `src/stores/cadStore.ts`, `src/lib/snapshotMigration.ts`, `tests/stores/cadStore.columns.test.ts`

1. Add `Column` interface + `DEFAULT_COLUMN_WIDTH_FT` / `DEFAULT_COLUMN_DEPTH_FT` / `DEFAULT_COLUMN` to `src/types/cad.ts`
2. Add `columns?: Record<string, Column>` to RoomDoc
3. Bump `CADSnapshot.version` literal type 9 → 10
4. Add `"column"` to ToolType union (Phase 60 placed `"stair"` at L401–402; column slots in after `"label"` at L408)
5. Add `migrateV9ToV10()` to `snapshotMigration.ts` — seed `columns: {}` per RoomDoc (mirror `migrateV3ToV4` L238–245 exactly)
6. Update `defaultSnapshot()` to seed `columns: {}` on the new room
7. Append `migrateV9ToV10` to `cadStore.loadSnapshot` pipeline (after `migratedV9 = migrateV8ToV9(...)` at L1594)
8. cadStore actions (mirror stair-action signatures at L161–167 + L1308–1383):
   - `addColumn(roomId, partial: Partial<Column> & { position: Point }): string`
   - `updateColumn(roomId, columnId, patch)` + `updateColumnNoHistory`
   - `removeColumn(roomId, columnId)` + `removeColumnNoHistory`
   - `resizeColumnAxis(roomId, columnId, axis: "width"|"depth"|"height", valueFt)` + NoHistory (mirror Phase 31 `resizeProductAxis`)
   - `moveColumnNoHistory(roomId, columnId, position)` for drag mid-stroke
   - `setSavedCameraOnColumnNoHistory` + `clearColumnSavedCameraNoHistory` (mirror stair Phase 48 pattern)
9. createRoom factory: seed `columns: {}` (defense in depth alongside the migration)
10. Unit tests U1–U5 (mirror stair tests):
    - U1: `addColumn` writes defaults; returned id starts with `col_`
    - U2: `updateColumn` preserves untouched fields
    - U3: `removeColumn` deletes; subsequent updates are noops
    - U4: NoHistory variants do NOT increment `past.length`
    - U5: v9→v10 roundtrip — write a v9 snapshot with `columns` absent → migrate → `columns: {}` per room, version: 10

### Plan 86-02 (Wave 2 — parallel-eligible with 86-03) — Tool + 2D + 3D rendering + selection
**Files:** `src/canvas/columnSymbol.ts`, `src/canvas/tools/columnTool.ts`, `src/canvas/tools/selectTool.ts`, `src/canvas/fabricSync.ts`, `src/three/ColumnMesh.tsx`, `src/three/RoomGroup.tsx`

1. **`src/canvas/columnSymbol.ts`** (new, ~50 lines — simpler than stairSymbol because no step lines, no UP arrow):
   - `buildColumnSymbolShapes(column, scale, origin): fabric.Object[]`
   - Returns: `[outlineRect, optionalLabel]`
   - Pure helper — no fabric.Canvas mutation, no store reads
2. **`src/canvas/tools/columnTool.ts`** (new, ~150 lines — mirror `stairTool.ts` structure but simpler, no D-04 origin asymmetry because column footprint center === bbox center):
   - Closure state + `cleanup: () => void` return
   - Snap consume-only via existing `computeSnap()` (do NOT modify `buildSceneGeometry` — column is consume-only for v1; Open Q3)
   - Module-level `pendingColumnConfig` + `setPendingColumn()` exported (FloatingToolbar→tool bridge — same precedent as `setPendingStair`, `setPendingProduct`, listed as a D-07 public-API exception in CLAUDE.md)
   - **heightFt defaulting:** at `setPendingColumn()` time the FloatingToolbar reads `room.wallHeight` from the active room and passes it in — keeps the tool dumb about cadStore reads
   - onMouseDown commits via `addColumn`
   - Escape deactivates
3. **`src/canvas/fabricSync.ts` — `renderColumns()`** (new function, parallel to `renderStairs` at L1221):
   - Iterate `Object.values(doc.columns ?? {})`
   - Skip if `hiddenIds.has(column.id)`
   - Wrap `buildColumnSymbolShapes()` output in `fabric.Group` with `data: { type: 'column', columnId: column.id }`
   - Selection accent + hover accent identical to stair pattern
4. **`src/canvas/tools/selectTool.ts`** — extend hit-test to recognize columns:
   - Add `column` branch to the kind discriminator
   - Drag-to-move calls `moveColumnNoHistory` mid-drag + `updateColumn` (history) on release for single-undo
   - **Hit-test priority (research Pitfall 4):** if click lands inside both a wall footprint and a column footprint, column wins. Columns are smaller and drawn on top in 2D.
5. **`src/three/ColumnMesh.tsx`** (new, ~80 lines — much simpler than StairMesh):
   ```tsx
   export default function ColumnMesh({ column, isSelected }: Props) {
     const resolved = useResolvedMaterial(
       column.materialId,
       column.scaleFt,
       Math.max(column.widthFt, column.depthFt),
       column.heightFt,
     );
     const { handlePointerDown, handlePointerUp } = useClickDetect(() =>
       useUIStore.getState().select([column.id])
     );
     const onContextMenu = (e: ThreeEvent<MouseEvent>) => { /* mirror Stair */ };
     const rotY = -(column.rotation * Math.PI) / 180;
     return (
       <group
         position={[column.position.x, column.heightFt / 2, column.position.y]}
         rotation={[0, rotY, 0]}
         onPointerDown={handlePointerDown}
         onPointerUp={handlePointerUp}
         onContextMenu={onContextMenu}
       >
         <mesh castShadow receiveShadow>
           <boxGeometry args={[column.widthFt, column.heightFt, column.depthFt]} />
           {resolved ? (
             <meshStandardMaterial
               map={resolved.colorMap ?? undefined}
               roughnessMap={resolved.roughnessMap ?? undefined}
               aoMap={resolved.aoMap ?? undefined}
               displacementMap={resolved.displacementMap ?? undefined}
               color={resolved.color ?? "#f5f5f5"}
               roughness={0.85}
             />
           ) : (
             <meshStandardMaterial color="#f5f5f5" roughness={0.85} />
           )}
         </mesh>
         {isSelected && <SelectionBoxOutline ... />}
       </group>
     );
   }
   ```
6. **`src/three/RoomGroup.tsx`** — add `Object.values(doc.columns ?? {}).map(...)` block alongside stairs

### Plan 86-03 (Wave 2 — parallel-eligible with 86-02) — Inspector + FloatingToolbar
**Files:** `src/components/inspectors/ColumnInspector.tsx`, `src/components/inspectors/index.ts` (if barrel exists), `src/components/RightInspector.tsx` (dispatch), `src/components/FloatingToolbar.tsx`, `src/components/PropertiesPanel.tsx` (entity selector + render branch)

1. **`src/components/inspectors/ColumnInspector.tsx`** (new, ~120 lines — flat pane per Phase 82 D-04, NOT tabbed):
   - Uses `NumericInputRow` (Phase 85) for Width / Depth / Height / X / Y / Rotation
   - Text input for label override (max 40 chars)
   - SavedCameraButtons section (reuse PropertiesPanel.shared)
   - Reset-to-room-height button next to Height input
2. **PropertiesPanel.tsx dispatch** — add `column` discriminator branch (mirror the sequential `if (entity)` discriminator at the existing stair branch)
3. **FloatingToolbar Structure group** (`src/components/FloatingToolbar.tsx:319`):
   ```tsx
   {/* Column — D-15: substitute for material-symbols 'view_column' */}
   <Tooltip>
     <TooltipTrigger asChild>
       <Button
         variant="ghost"
         size="icon-touch"
         data-testid="tool-column"
         active={toolActive("column")}
         className={toolClass(toolActive("column"))}
         onClick={() => {
           const room = useCADStore.getState().rooms[useCADStore.getState().activeRoomId!];
           setPendingColumn({
             widthFt: 1, depthFt: 1, heightFt: room?.room.wallHeight ?? 8, rotation: 0,
           });
           setTool("column");
         }}
       >
         <Cuboid size={22} />
       </Button>
     </TooltipTrigger>
     <TooltipContent side="top" collisionPadding={8}>Column tool</TooltipContent>
   </Tooltip>
   ```
   Place AFTER the existing Stair button at L356. Recommended icon: **`Cuboid` from lucide-react** (verified at `node_modules/lucide-react/dist/lucide-react.d.ts:6543`). Visually a 3D box — unambiguously a "column / pillar" affordance. Avoid `Columns3` (looks like a data table) and `Cylinder` (round, doesn't match the rectangular v1).

### Wave 0 (test infrastructure — runs concurrent with Plan 86-01)
- Add `tests/stores/cadStore.columns.test.ts` (5 unit tests, RED first)
- Add `src/test-utils/columnDrivers.ts` (`__drivePlaceColumn`, `__getColumnCount`, `__getColumnConfig`, `__driveResizeColumn`, `__driveMoveColumn`)
- Add `e2e/columns.spec.ts` skeleton with 5 scenarios (place, select, move-undo, resize-undo, delete)

---

## Pitfalls

### Pitfall 1: Snapshot v9 → v10 migration MUST be seed-empty, not passthrough
**What goes wrong:** Reusing the trivial passthrough shape from `migrateV8ToV9` (L581–585) means a v9 snapshot loaded into v10 has `doc.columns === undefined`. Any consumer that does `Object.values(doc.columns)` (no `?? {}`) throws.
**How to avoid:** Mirror `migrateV3ToV4` (stairs) at L238–245 — iterate every RoomDoc, ensure `columns: {}` is set, then bump version. Phase 60 already shipped this template in production.
**Detection:** Unit test U5 (write v9 snapshot without `columns` → migrate → assert `version === 10` AND every room has `columns: {}`).

### Pitfall 2: Forgetting defensive `?? {}` at consumer sites
**What goes wrong:** Even with the migration in place, hand-written test fixtures or future migration arms might forget to seed `columns: {}`. Every read site (RoomGroup, fabricSync, buildRoomTree if column tree-node ships, CanvasContextMenu, focusDispatch) must use `doc.columns ?? {}`.
**How to avoid:** Grep audit — `grep -rn "doc\.columns\\." src/` should return zero hits without `?? {}` nearby. Phase 60 documents this exact pitfall (research Pitfall 2 in `60-01-PLAN.md`).

### Pitfall 3: heightFt drift when room.wallHeight changes
**What goes wrong:** User places a column with default heightFt=8 (matching room.wallHeight). Later they raise wall height to 10. Column stays at 8 (looks short).
**How to avoid:** **Don't auto-follow** — store the heightFt at placement time as an absolute value. Add an explicit "Reset to wall height" button next to the Height input in ColumnInspector (mirror Phase 31 RESET_SIZE pattern for product overrides). Honest behavior: the user explicitly chose 8 ft when they placed the column; silently growing it on wall-height change is surprising. Flag this for `/gsd:discuss-phase` confirmation (Open Q4).

### Pitfall 4: Selection hit-test priority — column inside a wall footprint
**What goes wrong:** User places a column flush against a wall (or inside the wall's thickness band, which is common for load-bearing applications). 2D click on the overlap zone is ambiguous: wall or column?
**How to avoid:** Column wins. Hit-test order in selectTool: products → custom elements → columns → stairs → walls. Columns are typically smaller than walls and drawn on top in 2D. Verify with e2e scenario — place column at wall edge → click → assert `selectedIds.has(columnId)` not `wallId`.

### Pitfall 5: Smart-snap — columns participate or not?
**What goes wrong:** Phase 30 smart-snap currently uses wall endpoints + midpoints + product/customElement bboxes (`buildSceneGeometry`). If columns are NOT added to the snap scene, walls and products won't snap to columns when placing nearby. If they ARE added, the scene-construction code in `buildSceneGeometry` needs a new entity-type branch.
**How to avoid:** **Consume-only for v1.20** — same call Phase 60 stairs made. Column placement uses smart-snap to find walls/products; other primitives do NOT snap to columns. Document as Open Q3 — if user wants other primitives to snap to columns, that's a ~30-line addition to `buildSceneGeometry` to emit column-bbox snap targets. Cleaner to defer.

### Pitfall 6: StrictMode-safe test driver registration
**What goes wrong:** `columnDrivers.ts` writes `window.__drivePlaceColumn` at module evaluation. React StrictMode (active in dev) double-mounts components. Without identity-check cleanup, a second mount can clobber a registration the first mount made.
**How to avoid:** Follow CLAUDE.md §7 pattern. Phase 79 / Phase 85 already shipped the `installNumericInputDrivers()` template — reuse the same identity-check shape. Specifically, register inside `useEffect` with cleanup that nulls only if the current ref matches.

---

## Runtime State Inventory

> Phase 86 is a greenfield add (new type, new tool, new mesh). No rename / refactor / migration.

| Category | Items found | Action required |
|----------|-------------|------------------|
| Stored data | None — `columns: {}` is a NEW field. Existing v9 snapshots in IndexedDB will pick up the empty record via migration. | Migration arm `migrateV9ToV10` seeds the empty record. |
| Live service config | None — this is a local-first browser app, no external services. | None. |
| OS-registered state | None. | None. |
| Secrets / env vars | None. | None. |
| Build artifacts | None — Vite rebuilds from source. | None. |

---

## Environment Availability

> Phase 86 has zero external dependencies beyond what's already in the project. No new tools, services, runtimes, or CLIs needed.

| Dependency | Required by | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node + npm | Build / test / e2e | ✓ (already installed; package-lock.json present) | — | — |
| Vite | Dev server / bundler | ✓ (`vite ^8.0.3`, devDependency) | ^8.0.3 | — |
| Three.js | ColumnMesh boxGeometry | ✓ (`three ^0.183.2`) | ^0.183.2 | — |
| @react-three/fiber | ColumnMesh JSX | ✓ (`^8.17.14`) | ^8.17.14 | — |
| Fabric.js | columnSymbol fabric.Rect | ✓ (`^6.9.1`) | ^6.9.1 | — |
| Zustand + Immer | cadStore actions | ✓ (`zustand ^5.0.12`, `immer ^11.1.4`) | — | — |
| lucide-react `Cuboid` | FloatingToolbar icon | ✓ (verified at lucide-react.d.ts:6543) | matches project lucide-react | Substitute `Box` icon |
| Playwright | e2e/columns.spec.ts | ✓ (e2e/stairs.spec.ts already runs) | — | — |
| Vitest | columns unit + component tests | ✓ (vitest infrastructure shipping since Phase 60) | — | — |

**No missing dependencies. No fallback needed.**

---

## Validation Architecture

`.planning/config.json` not present, so treating `workflow.nyquist_validation` as enabled-by-default.

### Test framework
| Property | Value |
|----------|-------|
| Framework | Vitest (unit + component) + Playwright (e2e) |
| Config files | `vitest.config.ts`, `playwright.config.ts` |
| Quick run command | `npx vitest run tests/stores/cadStore.columns.test.ts` |
| Full suite command | `npm run test && npm run test:e2e` |

### Requirements → tests
| Req ID | Behavior | Test type | Automated command | File exists? |
|--------|----------|-----------|-------------------|--------------|
| COL-01 (place rectangular with size) | columnTool places column at click with default config | unit + e2e | `npx vitest run tests/stores/cadStore.columns.test.ts -t "addColumn"` + `npx playwright test e2e/columns.spec.ts -g "places at click"` | ❌ Wave 0 |
| COL-01 (configurable size) | ColumnInspector NumericInputRow writes widthFt/depthFt/heightFt with single-undo | component + e2e | `npx vitest run tests/components/ColumnInspector.test.tsx` + e2e resize-undo | ❌ Wave 0 |
| COL-02 (2D footprint) | renderColumns emits fabric.Group with `data.type === 'column'` at correct position | e2e (DOM assertion via fabric scene introspection) | `npx playwright test e2e/columns.spec.ts -g "2D footprint"` | ❌ Wave 0 |
| COL-02 (3D extrusion at wall height) | ColumnMesh boxGeometry args match `[widthFt, heightFt, depthFt]` at correct y-position | e2e (three.js scene introspection — mirror E3 from Phase 60) | `npx playwright test e2e/columns.spec.ts -g "3D extrudes"` | ❌ Wave 0 |
| COL-03 (selectable) | Click in 2D selects column | e2e | `npx playwright test e2e/columns.spec.ts -g "selects"` | ❌ Wave 0 |
| COL-03 (movable + single-undo) | Drag column → `moveColumnNoHistory` mid-drag, `updateColumn` on release; Ctrl+Z reverts in 1 step | e2e | `npx playwright test e2e/columns.spec.ts -g "drag undo"` | ❌ Wave 0 |
| COL-03 (deletable) | Delete key removes column | e2e | `npx playwright test e2e/columns.spec.ts -g "delete"` | ❌ Wave 0 |
| COL-03 (PropertiesPanel shows shape/size/position) | ColumnInspector renders width/depth/height/x/y/rotation inputs when column selected | component | `npx vitest run tests/components/ColumnInspector.test.tsx -t "renders inputs"` | ❌ Wave 0 |

### Sampling rate
- **Per task commit:** `npx tsc --noEmit && npx vitest run tests/stores/cadStore.columns.test.ts` (~5 s)
- **Per wave merge:** `npm run test && npm run test:e2e -- e2e/columns.spec.ts e2e/stairs.spec.ts` (regression-aware: stair spec runs alongside to catch Structure-group breakage)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 gaps
- [ ] `tests/stores/cadStore.columns.test.ts` — covers COL-01 (defaults), COL-03 (CRUD + NoHistory). New file.
- [ ] `tests/components/ColumnInspector.test.tsx` — covers COL-03 (inspector renders inputs, single-undo on commit). New file.
- [ ] `tests/snapshot/migrateV9ToV10.test.ts` — covers schema bump roundtrip. New file. (Or fold into cadStore.columns.test.ts.)
- [ ] `e2e/columns.spec.ts` — covers COL-01 (place), COL-02 (2D + 3D), COL-03 (select / move-undo / resize-undo / delete). New file, ~6 scenarios.
- [ ] `src/test-utils/columnDrivers.ts` — drivers gated by `import.meta.env.MODE === "test"`, mirroring `stairDrivers.ts` pattern. New file.

No new framework installs needed.

---

## Plan Decomposition

| Plan | Wave | Files | Tests | Owner |
|------|------|-------|-------|-------|
| **86-01** Data model + schema + store actions | Wave 1 | `src/types/cad.ts`, `src/stores/cadStore.ts`, `src/lib/snapshotMigration.ts`, `tests/stores/cadStore.columns.test.ts` | 5 unit | sequential — gates 86-02 and 86-03 |
| **86-02** Tool + 2D + 3D rendering + selection | Wave 2 | `src/canvas/columnSymbol.ts`, `src/canvas/tools/columnTool.ts`, `src/canvas/tools/selectTool.ts` (extend), `src/canvas/fabricSync.ts` (extend), `src/three/ColumnMesh.tsx`, `src/three/RoomGroup.tsx` (extend) | ~3 e2e scenarios (place, 2D render, 3D render) | parallel with 86-03 |
| **86-03** Inspector + FloatingToolbar button | Wave 2 | `src/components/inspectors/ColumnInspector.tsx`, `src/components/PropertiesPanel.tsx` (dispatch), `src/components/FloatingToolbar.tsx` (button + import), `src/test-utils/columnDrivers.ts`, `e2e/columns.spec.ts` | 1 component test + ~3 e2e scenarios (select, resize-undo, delete) | parallel with 86-02 |

Total: ~14 files modified or created. ~5 unit + 1 component + 6 e2e = 12 tests.

---

## Open Questions

1. **Rectangular box only, or both box + cylinder in v1?**
   - What we know: Requirement COL-01 says "round or rectangular." The simplest-thing-that-could-work is rectangular box. Cylinder is realistic to add but doubles the ColumnMesh + columnSymbol surface area and adds 1 discriminator branch through every consumer.
   - Recommendation: **Box only.** Defer cylinder to a v1.21 follow-up issue. Encode the affordance now (`shape: "box"` literal). If user disagrees during `/gsd:discuss-phase`, ship both — ~120 extra lines of code, no schema rework needed.

2. **Default column dimensions.**
   - What we know: Real interior load-bearing columns are typically 12"–24" square (drywall-wrapped steel). 1ft × 1ft is a sensible "small structural column" default; visually obvious in 3D without dominating the room.
   - Recommendation: **1ft × 1ft footprint, heightFt = room.wallHeight at placement time.**

3. **Default material.**
   - What we know: Walls default to off-white paint (`#f5f5f5`, roughness 0.85). Columns commonly match wall finish in modern interiors.
   - Recommendation: **Same off-white paint default as walls.** Column gains `materialId?` optional field so user can apply a material later via the Apply-Material panel (Phase 68 wiring). No new material picker UI in Phase 86.

4. **Does column height auto-follow room.wallHeight changes?**
   - What we know: Walls auto-grow when wallHeight changes (single source of truth). Columns are user-placed entities — could go either way.
   - Recommendation: **Stay at placement-time height. Add a "Reset to wall height" button.** Honest behavior; user explicitly chose the height when they placed it. Flag for `/gsd:discuss-phase` confirmation.

5. **Placement constraints — anywhere, or must be inside room polygon?**
   - What we know: Phase 60 stairs can be placed anywhere on the canvas (no polygon constraint). Products and custom elements likewise.
   - Recommendation: **Match stair/product behavior — place anywhere.** If column ends up outside the room walls, that's user's choice. Adding polygon-containment validation is a separate feature (would apply to multiple entity types).

6. **Tree integration?**
   - What we know: Phase 60 stairs added a STAIRS group to RoomsTreePanel. Phase 62 measure-lines did NOT (decorative annotations). Columns are structural — closer to stairs.
   - Recommendation: **Add COLUMNS group to RoomsTreePanel** for parity with stairs. Adds ~3 sites: `buildRoomTree.ts` groupKey union, RoomsTreePanel render, TreeRow icon (use `Cuboid` lucide — no allowlist exception needed since we're not using material-symbols here). **Counterpoint:** this expands the surface area by ~50 lines. If keeping Phase 86 lean is the priority, defer tree integration to a v1.21 polish phase. Flag for `/gsd:discuss-phase`.

7. **CanvasContextMenu integration?**
   - What we know: Phase 53 right-click menu has a `kind` discriminator with arms for wall/product/ceiling/custom/stair/empty. Adding column requires extending ContextMenuKind union at 3 sites in uiStore.ts (per Phase 60 research) + a new branch in CanvasContextMenu.tsx.
   - Recommendation: **Yes — extend.** Without right-click, user can't access Focus/Save Camera/Copy/Paste/Delete from the canvas. ~30 lines across 3 files. Don't ship Phase 86 without this.

---

## Sources

### Primary (HIGH confidence — repo state directly read)
- `src/types/cad.ts:140–409` — Stair interface, RoomDoc structure, CADSnapshot version, ToolType union
- `src/lib/snapshotMigration.ts:11–585` — full migration pipeline including `migrateV3ToV4` (seed-empty template) and `migrateV8ToV9` (passthrough template)
- `src/stores/cadStore.ts:161–167, 1308–1383, 1585–1594` — stair action signatures, implementation pattern, loadSnapshot migration pipeline
- `src/three/StairMesh.tsx` — full 108-line template for ColumnMesh
- `src/three/useResolvedMaterial.ts:1–60` — material-pipeline hook signature
- `src/canvas/tools/stairTool.ts` (verified exists at 312 lines) — columnTool template
- `src/canvas/fabricSync.ts:1221+` — `renderStairs()` template for `renderColumns()`
- `src/components/FloatingToolbar.tsx:318–358` — Structure-group exact location for column button
- `src/components/inspectors/StairInspector.tsx` — flat-pane inspector template
- `src/components/inspectors/ProductInspector.tsx:25–145` — NumericInputRow + driver-install pattern from Phase 85
- `.planning/phases/60-stairs-stairs-01/60-01-PLAN.md` — full Phase 60 plan with task structure, audit grep commands, pitfalls catalogued
- `.planning/milestones/v1.20-REQUIREMENTS.md:53–65` — COL-01 / COL-02 / COL-03 verifiable acceptance
- `node_modules/lucide-react/dist/lucide-react.d.ts:6543` — `Cuboid` icon export verified

### Secondary (MEDIUM confidence)
- CLAUDE.md (project) — D-09, D-10, D-15, D-33 styling/icon policies; §7 StrictMode pattern
- CLAUDE.md (global) — PR-on-push rule, label taxonomy

---

## Metadata

**Confidence breakdown:**
- Data model: HIGH — Column type is a strict subset of Stair patterns; every field has direct precedent
- Implementation plan: HIGH — Phase 60 file-by-file template proven in production for 7 months
- Migration: HIGH — `migrateV9ToV10` is a near-copy of `migrateV3ToV4`
- Material pipeline: HIGH — `useResolvedMaterial` drop-in via Phase 78
- Inspector: HIGH — Phase 85 `NumericInputRow` is the production numeric-input pattern
- Plan decomposition: MEDIUM — 3-plan split is recommended but ultimately a planner call; Phase 60 used 1-plan, Phase 85 used 3-plan
- Open questions: USER INPUT NEEDED on Q1 (shape scope), Q4 (height auto-follow), Q6 (tree integration)

**Research date:** 2026-05-15
**Valid until:** 2026-06-15 (30 days — stable codebase, no upstream lib version churn expected)
