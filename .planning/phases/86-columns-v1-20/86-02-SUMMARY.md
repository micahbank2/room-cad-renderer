---
phase: 86-columns-v1-20
plan: 02
subsystem: cad-canvas
tags: [columns, fabric-tool, three-mesh, selection, hit-test, e2e]
wave: 2
requirements: [COL-01, COL-02, COL-03]
dependency-graph:
  requires:
    - "Phase 86-01 Column type + RoomDoc.columns + 13 column store actions"
    - "Phase 60 Stair tool/mesh pattern (template for tool + 3D mesh + RoomGroup iteration)"
    - "Phase 78 useResolvedMaterial pipeline (drop-in for column material)"
    - "Phase 81 hoveredEntityId convention (accent-purple 2D outline)"
  provides:
    - "Column placement tool (columnTool + columnSymbol)"
    - "2D renderColumns pass wired into FabricCanvas redraw"
    - "3D ColumnMesh + RoomGroup iteration block"
    - "selectTool column hit-test (wins over wall per D-01 Pitfall 4) + drag-to-move with single-undo"
    - "useActiveColumns hook + removeSelected cascade for columns"
    - "ContextMenuKind union widened with 'column'"
    - "GREEN e2e placement spec + 3 test drivers (__drivePlaceColumn / __getColumnCount / __getColumnConfig)"
  affects:
    - "Plan 86-03 (toolbar button + inspector + Rooms tree integration — depends on tool + ContextMenuKind)"
tech-stack:
  added: []
  patterns:
    - "Closure-state tool with cleanup return (Phase 60 stairTool template)"
    - "D-07 public-API bridge for pendingX config (productTool / stairTool / columnTool)"
    - "Rotated AABB hit-test in object local frame (cos/sin transform)"
    - "Phase 31 transaction pattern: empty update() at drag start + NoHistory mid-stroke"
    - "StrictMode-safe driver install with identity-check cleanup (CLAUDE.md §7)"
key-files:
  created:
    - "src/canvas/columnSymbol.ts"
    - "src/canvas/tools/columnTool.ts"
    - "src/three/ColumnMesh.tsx"
    - "src/test-utils/columnDrivers.ts"
    - "tests/e2e/specs/columns.placement.spec.ts"
  modified:
    - "src/canvas/fabricSync.ts"
    - "src/canvas/FabricCanvas.tsx"
    - "src/three/RoomGroup.tsx"
    - "src/canvas/tools/selectTool.ts"
    - "src/stores/cadStore.ts"
    - "src/stores/uiStore.ts"
    - "src/main.tsx"
decisions:
  - "Column.position IS bbox center (no UP-axis asymmetry vs Stair) — simpler tool + render math; no snap-engine integration in v1.20 (mirror Stair D-08a deferral)"
  - "Column hit-test inserted BEFORE wall check in selectTool — D-01 Pitfall 4 (column wins when cursor is inside both footprints). Rotated AABB transform via cos/sin into column local frame"
  - "Column drag uses Phase 31 transaction pattern (empty updateColumn at drag-start + moveColumnNoHistory mid-stroke) — no fast-path needed since redraw is cheap (single rect + label) and store-subscription redraws are sufficient"
  - "removeSelected cascade extended to columns (Rule 2 — Delete key on selected column had no path)"
  - "Auto-switch to select tool after placement (Phase 60 precedent) — user gets immediate selection feedback on the placed column"
metrics:
  duration-minutes: 22
  task-count: 3
  files-touched: 11
  tests-added: 2
  completed-date: 2026-05-15
---

# Phase 86 Plan 02: Column Tool + 2D/3D Rendering + Selection Summary

Land the tool + 2D + 3D rendering + selection/move integration for columns. With Plan 86-02 a user (or test driver) can: activate the column tool, click on the 2D canvas to place a column at the cursor, see the column rendered in both 2D (rotated rect + COLUMN label) and 3D (textured box rising from floor to room.wallHeight), and click the column to select / drag to move / Delete to remove. Plan 86-03 ships the toolbar button + inspector + Rooms tree integration to close the user-facing loop.

## What Shipped

### 2D placement + rendering
- **`src/canvas/columnSymbol.ts`** — `buildColumnSymbolShapes(column, scale, _origin, isSelected)` returns a rotated outline rect (accent-purple stroke when selected; light gray otherwise) + a centered uppercase name label (defaults to "COLUMN" when no override). 60 lines, simpler than stairSymbol (no step lines, no UP arrow).
- **`src/canvas/tools/columnTool.ts`** — `activateColumnTool(fc, scale, origin)` returns a cleanup function. `setPendingColumn` / `getPendingColumn` D-07 bridge holds the toolbar-set widthFt/depthFt/heightFt/rotation/shape config. mousemove draws an opacity-0.6 preview Group; mousedown commits via `addColumn` then auto-switches back to `select` (Phase 60 precedent); Escape cancels + switches back to select. Shift snaps rotation to 15° increments while previewing (D-02 mirror).
- **`renderColumns` in `src/canvas/fabricSync.ts`** — emits `fabric.Group` with `data: { type: "column", columnId }`, `angle: column.rotation`, originX/Y "center", evented:true (for right-click hit-test). Honors hiddenIds (Phase 46 cascade). Paints accent-purple hover outline (Phase 81 D-02 convention) when `hoveredId === column.id` and not selected. D-01 box-only enforcement: non-"box" shapes silently skipped.

### 3D rendering
- **`src/three/ColumnMesh.tsx`** — `boxGeometry(widthFt, heightFt, depthFt)` at `position=[x, heightFt/2, y]` with `rotY = -(rotation * pi / 180)` (matches StairMesh convention). Phase 78 `useResolvedMaterial` pipeline resolves the optional `column.materialId` (uniform tile-size for v1.20; envelope = max(widthFt, depthFt) × heightFt). Falls back to off-white #f5f5f5 / roughness 0.85 when materialId unset. Click-to-select via `useClickDetect` (Phase 54). Right-click opens context menu with kind=`"column"` (uiStore ContextMenuKind widened). Selection outline: single `Box3Helper` edges-geometry (1 draw call regardless of size). All hooks called unconditionally at top of body; D-01 box-only enforced via early-return AFTER all hooks (Rules of Hooks).
- **`src/three/RoomGroup.tsx`** — destructures `columns` from `roomDoc`; effectivelyHidden cascade extended for room-wide hide + new `${roomId}:columns` group-key (mirror stair pattern); `Object.values(columns ?? {}).map(...) → <ColumnMesh />` block added after stair iteration with defensive `?? {}` per Phase 60 Pitfall 2.

### Selection + interaction
- **`hitTestStore` in `src/canvas/tools/selectTool.ts`** — return type widened to include `"column"`. New column branch inserted BEFORE the wall check per D-01 Pitfall 4 (column wins when cursor is inside both footprints). Rotated AABB test: transforms point into the column's local un-rotated frame via cos/sin, then bound-checks against half-extents.
- **Drag-to-move column** — DragType union widened with `"column"`. Drag-start pushes a single history entry via empty `updateColumn(roomId, columnId, {})`; mousemove uses `moveColumnNoHistory(roomId, columnId, snapped)`; mouseup does NOT commit again (Phase 31 transaction pattern). Snap is grid-only for columns in v1.20 (matches Phase 60 stair D-08a deferral — column not yet on the snap-engine scene).
- **Delete key** — `removeSelected` in cadStore extended to cascade into `doc.columns[id]` (Rule 2 — selection-Delete previously had no path for columns).
- **Right-click context menu** — `ContextMenuKind` union widened with `"column"` in uiStore. FabricCanvas right-click hit-test loop adds a `data.type === "column"` branch that emits `{ kind: "column", nodeId: columnId }`.

### Test infrastructure
- **`src/test-utils/columnDrivers.ts`** — `installColumnDrivers()` returns a cleanup fn (StrictMode-safe via identity check per CLAUDE.md §7). Exposes `window.__drivePlaceColumn(xFt, yFt) → string` (adds a 1ft × 1ft column at the position with heightFt = room.wallHeight per D-03), `__getColumnCount()`, and `__getColumnConfig(id) → Column`. Gated by `import.meta.env.MODE === "test"`.
- **`src/main.tsx`** — `installColumnDrivers()` registered alongside the Phase 60 stair drivers.

### Hooks + helpers
- **`useActiveColumns()` in `src/stores/cadStore.ts`** — defensive `?? {}` selector, frozen `EMPTY_COLUMNS` constant per Phase 60 Pitfall 2.
- **`FabricCanvas.tsx`** — `useActiveColumns()` subscription wired into the redraw closure; `renderColumns` invoked after `renderStairs`; `columns` added to the `useCallback` dep array; `activeTool === "column"` uses crosshair cursor.

### E2E spec
- **`tests/e2e/specs/columns.placement.spec.ts`** — 2 GREEN tests:
  - **"Column tool driver places a column at the cursor position visible in 2D + 3D"** — Drives placement via `__drivePlaceColumn(5, 5)`, asserts `__getColumnCount === 1`, asserts `__getColumnConfig` returns `{ position: {x:5,y:5}, widthFt: 1, depthFt: 1, heightFt: 8, rotation: 0, shape: "box" }`, asserts `__fabricCanvas.getObjects()` contains a Group with `data.type === "column"` and `data.columnId === placedId`, then switches to 3D and asserts the column survives the mount (smoke: RoomGroup destructure doesn't crash).
  - **"Column heightFt initialized from room.wallHeight (D-03)"** — Loads a snapshot with `wallHeight: 12`, drives placement, asserts the new column's `heightFt === 12`.

## Verification Results

- `npx tsc --noEmit` — clean (only pre-existing TS5101 deprecation warnings)
- `npx vitest run` — **1095 passing | 11 todo** (no regression vs Wave 1 baseline; same 33 pre-existing unhandled rejections in `pickerMyTexturesIntegration.test.tsx` already documented in 86-01-SUMMARY)
- `npx playwright test tests/e2e/specs/columns.placement.spec.ts --project=chromium-dev` — **2 passed** in 6.2s

## Deviations from Plan

### Rule 2 — Auto-add missing critical functionality

**1. [Rule 2 - Critical] `removeSelected` had no path for columns**
- **Found during:** Task 3 (Delete-key flow review)
- **Issue:** Plan task 3 specified "On Delete key with a column selected: `removeColumn(roomId, columnId)`". But the Delete keypath in selectTool calls `useCADStore.getState().removeSelected(selectedIds)` (a bulk-delete that walks `walls`, `placedProducts`, `placedCustomElements`, `ceilings`, `stairs`). Without a `columns` branch the Delete key would silently no-op on a selected column.
- **Fix:** Extended `removeSelected` in `src/stores/cadStore.ts` to also `delete doc.columns[id]` — mirrors the Phase 60 stair line one for one.
- **Files modified:** src/stores/cadStore.ts
- **Commit:** 4b427c3 (rolled into Task 1)

**2. [Rule 2 - Critical] `ContextMenuKind` union missing `"column"`**
- **Found during:** Task 2 (ColumnMesh right-click handler)
- **Issue:** Plan note acknowledged this could be needed ("if useUIStore.openContextMenu does not yet accept a 'column' kind, extend the union"). It did need extending — both the type union AND the function-arg union (2 sites).
- **Fix:** Widened both kind union and the `openContextMenu` arg type in `src/stores/uiStore.ts` to include `"column"`.
- **Files modified:** src/stores/uiStore.ts
- **Commit:** 6f2716c (rolled into Task 2)

### Rule 3 — Auto-fix blocking issues

**3. [Rule 3 - Blocking] FabricCanvas needed `useActiveColumns` hook + redraw dep**
- **Found during:** Task 2 (renderColumns wiring)
- **Issue:** `renderColumns` needs a per-room subscription for the redraw closure. The plan didn't spell out the hook addition.
- **Fix:** Added `useActiveColumns()` selector in cadStore (mirror `useActiveStairs`) + subscribed in FabricCanvas + added `columns` to the redraw dep array. Also added right-click hit-test branch in FabricCanvas for `data.type === "column"` to dispatch the new context-menu kind.
- **Files modified:** src/stores/cadStore.ts, src/canvas/FabricCanvas.tsx
- **Commit:** 6f2716c (rolled into Task 2)

**4. [Rule 3 - Blocking] E2E test required a seeded wall for App auto-start**
- **Found during:** Task 3 (e2e first run timed out on `view-mode-3d` selector)
- **Issue:** `App.tsx` gates the canvas behind a `hasStarted` flag that auto-flips when `wallCount > 0 || placedCount > 0`. The initial spec seeded a column-only room, so the WelcomeScreen stayed up and the FloatingToolbar (with `[data-testid="view-mode-3d"]`) never mounted. Both inspector-tabs.spec.ts and our new spec have the same shape — the inspector spec seeds walls and works, ours did not.
- **Fix:** Added a single wall (`wall_a` from `(0,0)` to `(10,0)`) to both spec test snapshots so App auto-starts and the toolbar mounts before we query the testid.
- **Files modified:** tests/e2e/specs/columns.placement.spec.ts
- **Commit:** 1c8140b (rolled into Task 3 final spec)

### Plan-vs-actual scope alignment

- Plan suggested `setPendingColumn` widthFt could be a numeric constant; in practice we let the caller set whatever values they want (defaults will be wired by toolbar in 86-03). No semantic change vs plan — just left the toolbar config plumbing for the toolbar wave.
- Plan suggested `useResolvedMaterial(materialId, scaleFt, widthFt, heightFt)` with `scaleFt: undefined`. Confirmed: uniform tile-size for v1.20 ships exactly this; envelope-width is `max(widthFt, depthFt)` so a rotated rectangular column gets a consistent texture footprint regardless of orientation.

## Known Stubs

None — Plan 86-02 wires the full tool + 2D + 3D + selection + e2e loop end-to-end. The remaining "user-facing" UX (toolbar button, inspector tab, Rooms tree row) ships in Plan 86-03 — not stubs but a deliberate scope split between waves.

## Commits

- `4b427c3` — feat(86-02): add columnTool + columnSymbol + FabricCanvas wiring + test drivers
- `6f2716c` — feat(86-02): wire renderColumns in fabricSync + ColumnMesh + RoomGroup iteration
- `1c8140b` — feat(86-02): extend selectTool for column hit-test/drag/delete + GREEN placement e2e

## Self-Check: PASSED

- `src/canvas/columnSymbol.ts` — FOUND (buildColumnSymbolShapes exported)
- `src/canvas/tools/columnTool.ts` — FOUND (activateColumnTool + setPendingColumn/getPendingColumn bridge)
- `src/three/ColumnMesh.tsx` — FOUND (default export, boxGeometry + useResolvedMaterial)
- `src/test-utils/columnDrivers.ts` — FOUND (installColumnDrivers with identity-check cleanup)
- `tests/e2e/specs/columns.placement.spec.ts` — FOUND (2 GREEN tests)
- `src/canvas/fabricSync.ts` — renderColumns export added
- `src/canvas/FabricCanvas.tsx` — useActiveColumns + renderColumns + right-click branch + crosshair + activateColumnTool case
- `src/three/RoomGroup.tsx` — ColumnMesh import + columns destructure + effectivelyHidden cascade + iteration block
- `src/canvas/tools/selectTool.ts` — hitTestStore column branch + DragType "column" + drag-start branch + drag-move branch
- `src/stores/cadStore.ts` — useActiveColumns selector + removeSelected columns cascade
- `src/stores/uiStore.ts` — ContextMenuKind union widened with "column" (both type + arg sites)
- `src/main.tsx` — installColumnDrivers registered
- Commits `4b427c3`, `6f2716c`, `1c8140b` — FOUND in `git log`
- `npx vitest run` — 1095 passing (no regression)
- `npx playwright test columns.placement.spec.ts` — 2 GREEN in 6.2s
