---
phase: 86-columns-v1-20
plan: 03
subsystem: inspector + tree + toolbar
tags: [columns, inspector, tabs, rooms-tree, toolbar, e2e, v1.20-closer]
wave: 3
requirements: [COL-01, COL-02, COL-03]
dependency-graph:
  requires:
    - "Phase 86-01 — Column type + RoomDoc.columns + 13 column store actions"
    - "Phase 86-02 — columnTool (setPendingColumn bridge) + selectTool column branch + ContextMenuKind"
    - "Phase 82 — Tabs primitive + RightInspector dispatch + ProductInspector tabbed pattern (D-05)"
    - "Phase 85 — NumericInputRow + clampInspectorValue + installNumericInputDrivers (D-04, D-05)"
    - "Phase 81 — RoomsTreePanel onRename / onClickRow / hover infrastructure"
    - "Phase 60 — Stairs group as line-for-line template for the new Columns group"
  provides:
    - "ColumnInspector with Dimensions / Material / Rotation tabs + SavedCameraButtons trailing row"
    - "RightInspector dispatch arm for columns (keyed on column.id per Phase 82 D-03)"
    - "Columns group emitted under each room in buildRoomTree + RoomsTreePanel"
    - "focusOnColumn camera helper (bbox-fit, 1.5× diagonal)"
    - "FloatingToolbar Structure-group Column button (lucide Cuboid icon)"
    - "Component test suite (12 cases) + lifecycle e2e (2 cases)"
  affects:
    - "v1.20 Surface Depth & Architectural Expansion milestone — Phase 86 is the v1.20 closer; with this plan shipped the milestone is complete"
tech-stack:
  added: []
  patterns:
    - "Phase 82 D-05 tabbed inspector pattern (Tabs primitive + keyed mount + commit-on-blur numeric inputs)"
    - "Phase 85 NumericInputRow + clampInspectorValue (silent clamp [0.5, 50], single-undo)"
    - "Phase 60 Stairs-group emission pattern (always-emit, auto-numbered fallback, override wins)"
    - "Phase 86 D-03 reset-to-default button: one click → one cadStore action → one history push"
    - "Phase 86 D-07 toolbar-tool bridge: setPendingColumn(cfg) before setTool('column')"
key-files:
  created:
    - "src/components/inspectors/ColumnInspector.tsx"
    - "tests/unit/inspectors/columnInspector.test.tsx"
    - "tests/e2e/specs/columns.lifecycle.spec.ts"
  modified:
    - "src/components/RightInspector.tsx"
    - "src/components/inspectors/PropertiesPanel.shared.tsx"
    - "src/lib/buildRoomTree.ts"
    - "src/components/RoomsTreePanel/RoomsTreePanel.tsx"
    - "src/components/RoomsTreePanel/focusDispatch.ts"
    - "src/components/RoomsTreePanel/savedCameraSet.ts"
    - "src/components/FloatingToolbar.tsx"
decisions:
  - "ColumnInspector Material tab reuses the customElementFace MaterialPicker surface — same uniform-tile pipeline ColumnMesh consumes via Phase 78 useResolvedMaterial. No new surface union value needed."
  - "Rotation tab uses NumericInputRow with min=-360, max=360, step=1 (broader range than the default [0.5, 50] dimension clamp). Single Reset-to-0° button matches the D-03 Reset-to-wall-height pattern for consistency."
  - "Column tree rename writes Column.name directly (not labelOverride) — the Column type's per-placement display field is `name?: string` (D-05). Trimmed empty string commits as `undefined` so the auto-numbered fallback returns."
  - "FloatingToolbar Column button has NO keyboard shortcut in v1.20 — `C` collides with Ceiling tool. Filed as a follow-on UX question; tooltip is bare 'Column tool' string with no kbd element."
metrics:
  duration-minutes: 18
  task-count: 3
  files-touched: 10
  tests-added: 14
  completed-date: 2026-05-15
---

# Phase 86 Plan 03: ColumnInspector + Tree + Toolbar Summary

**Closes Phase 86 — and Phase 86 is the v1.20 milestone closer.** With this plan landed, Jessica can place, select, edit, rename, hide, focus, save-camera-on, and delete a column entirely through the visible UI: floating toolbar → 2D canvas → Rooms tree → right inspector tabs. No driver scaffolding required for the user-facing loop.

## What Shipped

### ColumnInspector (D-08)
- **`src/components/inspectors/ColumnInspector.tsx`** — new tabbed inspector mounted by RightInspector whenever the selected entity is a column. Three tabs:
  1. **Dimensions** — `NumericInputRow` for Width / Depth / Height (commits via `resizeColumnAxis` / `resizeColumnHeight`) and Position X / Y (`moveColumn`). Each commit silent-clamps at `[0.5, 50]` via `clampInspectorValue` and pushes exactly one history entry. The **"Reset to wall height"** button (D-03) reads `room.wallHeight` and calls `resizeColumnHeight(roomId, columnId, room.wallHeight)` — one click, one history push.
  2. **Material** — `<MaterialPicker surface="customElementFace">` writes `column.materialId` via `updateColumn({ materialId })`. Same picker surface ColumnMesh consumes via Phase 78 `useResolvedMaterial`.
  3. **Rotation** — `NumericInputRow` for degrees (min=-360, max=360, step=1) + **"Reset to 0°"** button. Single-undo per commit.
- **Trailing row** — `<SavedCameraButtons kind="column">` below the tabs (always visible).

### RightInspector dispatch
- **`src/components/RightInspector.tsx`** — `useActiveColumns()` hook subscription; column branch in the single-selection discriminator. Keyed on `column.id` per Phase 82 D-03 so each new column selection mounts a fresh inspector (resets the `activeTab` useState).
- **`src/components/inspectors/PropertiesPanel.shared.tsx`** — `SavedCameraButtons` `kind` union widened to include `"column"`; dispatch arm routes through new `setSavedCameraOnColumnNoHistory` action wired in Phase 86-01.

### Rooms tree integration (D-02)
- **`src/lib/buildRoomTree.ts`** — `TreeNodeKind` union widened with `"column"`; `groupKey` union widened with `"columns"`. Always-emit Columns group per room, line-for-line mirror of the Phase 60 Stairs group emission. `column.name` override wins; otherwise auto-numbered `Column`, `Column (2)`, `Column (3)`, ... starting at 1. Defensive `?? {}` per Phase 60 Pitfall 2.
- **`src/components/RoomsTreePanel/RoomsTreePanel.tsx`** — `onClickRow` column arm calls `focusOnColumn`; `onSavedCameraFocus` column arm reads `column.savedCameraPos` + `savedCameraTarget` and dispatches the same fallback as other leaves; `onRename` column arm writes `Column.name` (not `labelOverride` — Column's per-placement label field is named differently from Stair's).
- **`src/components/RoomsTreePanel/focusDispatch.ts`** — new `focusOnColumn(c)` mirroring `focusOnPlacedProduct` / `focusOnStair`: bbox-fit at 1.5× diagonal, target = footprint-center XY + half-height Z. Selects the column id.
- **`src/components/RoomsTreePanel/savedCameraSet.ts`** — iterate `room.columns ?? {}` so the Camera affordance shows on columns with a saved bookmark.

### FloatingToolbar Column button (D-07)
- **`src/components/FloatingToolbar.tsx`** — Structure group gains a Column button after the Stair button. Icon: lucide `Cuboid`. `size="icon-touch"` (44×44 px WCAG 2.5.5 AAA, Phase 83 D-01). `onClick` reads `room.wallHeight` from `useCADStore.getState().rooms[activeRoomId].room`, calls `setPendingColumn({ widthFt: 1, depthFt: 1, heightFt: wallHeight, rotation: 0, shape: "box" })`, then `setTool("column")`. Tooltip: bare `"Column tool"` — no keyboard shortcut yet (D-07: `C` collides with Ceiling).

### Tests
- **`tests/unit/inspectors/columnInspector.test.tsx`** — 12 GREEN cases covering: 3-tab render, W/D/H/X/Y commit paths, [0.5, 50] silent clamp (both bounds), Reset-to-wall-height single-history-push, rotation input + Reset-to-0° single-undo, general single-undo invariant.
- **`tests/e2e/specs/columns.lifecycle.spec.ts`** — 2 GREEN Playwright cases:
  - **"Toolbar → place → tree → inspector edit → reset-to-wall-height → reload survives"** — clicks the Column toolbar button (verifies activeTool → "column"), places via `__drivePlaceColumn`, asserts tree leaf appears, clicks the leaf to select, asserts the three tabs render, edits Width via the numeric input, presets a 12ft heightFt, clicks Reset-to-wall-height, asserts heightFt = 8 (room.wallHeight), reloads the page, asserts the column survived auto-save.
  - **"Delete key removes selected column; Ctrl+Z restores it (single undo)"** — places, selects, calls `removeSelected([id])` (the same path the Delete key takes in selectTool), asserts count=0, calls `undo()`, asserts count=1.

## Verification Results

- `npx tsc --noEmit` — clean (only pre-existing TS5101 deprecation warnings)
- `npx vitest run` — **1107 passing | 11 todo** (Wave 2 baseline was 1095; +12 ColumnInspector tests; 0 regressions; same 33 pre-existing unhandled rejections in `pickerMyTexturesIntegration.test.tsx` documented in 86-01-SUMMARY)
- `npx playwright test tests/e2e/specs/columns.placement.spec.ts tests/e2e/specs/columns.lifecycle.spec.ts --project=chromium-dev` — **4 passed** in 14.1s (2 Wave 2 placement specs + 2 Wave 3 lifecycle specs)

## Deviations from Plan

None — Plan 86-03 executed exactly as written. Two minor on-the-fly choices documented as decisions (above):
- Rotation tab uses `NumericInputRow` with widened `min=-360, max=360, step=1` rather than a separate primitive. Matches the Phase 85 single-undo invariant mechanically with no new component.
- Column tree rename writes `Column.name` rather than the Stair-style `labelOverride` — `Column.name` IS the per-placement display field per the D-05 type contract.

## Known Stubs

None — Plan 86-03 closes the user-facing column loop end-to-end. The full lifecycle (toolbar → place → tree → select → tabs → edit → reset → camera-save → rename → hide → focus → delete → undo) works through the visible UI.

## Commits

- `f845aee` — feat(86-03): add ColumnInspector with tabs + wire RightInspector dispatch
- `9687717` — feat(86-03): extend buildRoomTree + RoomsTreePanel for columns; add Cuboid Column toolbar button
- `b8e2eb0` — feat(86-03): add ColumnInspector component test + full lifecycle e2e (COL-01/02/03 GREEN)

## Self-Check: PASSED

- `src/components/inspectors/ColumnInspector.tsx` — FOUND (Dimensions / Material / Rotation tabs, NumericInputRow inputs, Reset-to-wall-height + Reset-to-0° buttons, SavedCameraButtons trailing row)
- `src/components/RightInspector.tsx` — modified (column branch + useActiveColumns import)
- `src/components/inspectors/PropertiesPanel.shared.tsx` — modified (SavedCameraButtons kind union widened)
- `src/lib/buildRoomTree.ts` — modified (TreeNodeKind + groupKey unions widened; columns group emission)
- `src/components/RoomsTreePanel/RoomsTreePanel.tsx` — modified (onClickRow / onSavedCameraFocus / onRename column arms)
- `src/components/RoomsTreePanel/focusDispatch.ts` — modified (focusOnColumn helper added)
- `src/components/RoomsTreePanel/savedCameraSet.ts` — modified (iterate room.columns)
- `src/components/FloatingToolbar.tsx` — modified (Cuboid import + Column button in Structure group + setPendingColumn import)
- `tests/unit/inspectors/columnInspector.test.tsx` — FOUND (12 cases, all GREEN)
- `tests/e2e/specs/columns.lifecycle.spec.ts` — FOUND (2 cases, all GREEN)
- Commits `f845aee`, `9687717`, `b8e2eb0` — FOUND in `git log`
- `npx vitest run` — 1107 passing (no regression)
- `npx playwright test columns.*.spec.ts` — 4 GREEN in 14.1s
