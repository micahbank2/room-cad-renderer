---
phase: 86-columns-v1-20
plan: 01
subsystem: data-model
tags: [columns, schema, migration, store-actions, tdd-red]
wave: 1
requirements: [COL-01, COL-02, COL-03]
dependency-graph:
  requires:
    - "Phase 60 Stair pattern (template for store actions + seed-empty migration)"
    - "Phase 85 v8→v9 migration (prior snapshot version)"
  provides:
    - "Column data model (Column interface, DEFAULT_COLUMN, RoomDoc.columns)"
    - "Snapshot schema v10 with seed-empty migration from v9"
    - "13 column store actions per D-06 (+ NoHistory siblings)"
    - "ToolType union widened with 'column'"
  affects:
    - "Plans 86-02 (column placement tool — depends on store actions + ToolType)"
    - "Plans 86-03 (3D rendering + PropertiesPanel — depends on Column type + actions)"
tech-stack:
  added: []
  patterns:
    - "Seed-empty migration (Phase 60 v3→v4 stair precedent)"
    - "13-action D-06 store contract (mirrors Phase 60 stair + Phase 31 axis-resize)"
    - "Clamp [0.25, 50] for size axes (mirrors Phase 31 product axis resize)"
key-files:
  created:
    - "tests/unit/lib/snapshotMigration.v9-to-v10.test.ts"
    - "tests/unit/stores/cadStore.columns.test.ts"
  modified:
    - "src/types/cad.ts"
    - "src/lib/snapshotMigration.ts"
    - "src/stores/cadStore.ts"
    - "src/components/ProjectManager.tsx"
    - "src/components/TemplatePickerDialog.tsx"
    - "src/hooks/useAutoSave.ts"
    - "tests/snapshotMigration.test.ts"
    - "src/lib/__tests__/snapshotMigration.v8tov9.test.ts"
decisions:
  - "Reused Phase 60 Stair pattern verbatim — Column = room-scoped primitive (not a customElement) with column-specific fields (widthFt/depthFt/heightFt) and saved-camera mirrors"
  - "Schema v10 seed-empty migration (NOT a passthrough) — every RoomDoc gets columns: {} so consumers don't need defensive undefined checks at every read site"
  - "Clamp [0.25, 50] for width/depth/height axes — mirrors Phase 31 product resize bounds (Phase 60 stair used [0.5, 20] — Column wants smaller floor for thin pillars)"
  - "clearColumnOverrides resets heightFt to room.wallHeight (D-03 reset-to-wall-height surface) — width/depth reset to DEFAULT_COLUMN_WIDTH_FT/DEPTH_FT"
metrics:
  duration-minutes: 18
  task-count: 4
  files-touched: 9
  tests-added: 19
  completed-date: 2026-05-15
---

# Phase 86 Plan 01: Data Model + Schema v10 + 13 Store Actions Summary

Land the schema + store + test scaffolding for Phase 86 Columns BEFORE any tool, rendering, or UI wires up — RED-first per the Phase 85 + Phase 60 pattern. Pins the COL-01/02/03 contract in types + store so Plans 86-02 and 86-03 can iterate against a known target.

## What Shipped

- **Column type** (`src/types/cad.ts`) with all D-05 fields: `id`, `position`, `widthFt`, `depthFt`, `heightFt`, `rotation` (degrees), `shape` ("box" | "cylinder" — v1.20 ships "box" only), `materialId?`, `name?`, `savedCameraPos?`, `savedCameraTarget?`. Plus `DEFAULT_COLUMN_WIDTH_FT = 1.0`, `DEFAULT_COLUMN_DEPTH_FT = 1.0`, and `DEFAULT_COLUMN` const.
- **RoomDoc.columns** optional field (sibling to `stairs?`).
- **CADSnapshot.version** literal bumped 9 → 10.
- **ToolType** union extended with `"column"`.
- **migrateV9ToV10** (seed-empty) added to `src/lib/snapshotMigration.ts` — iterates every RoomDoc and ensures `columns: {}` is present. Idempotent on v10. Mirrors Phase 60 v3→v4 stair migration line-for-line.
- **migrateSnapshot** routing: v10 passthrough at top of pipeline; v9 inputs flow through migrateV9ToV10 (was previously a passthrough).
- **defaultSnapshot** emits version 10 with `columns: {}` seeded on the main room.
- **cadStore.loadSnapshot** pipeline appended: `const migratedV10 = migrateV9ToV10(migratedV9)`.
- **cadStore snapshot() write site** bumped 9 → 10.
- **Legacy version: 2 writes** in ProjectManager, useAutoSave, and TemplatePickerDialog bumped to version: 10 (Rule 3 — caused by CADSnapshot literal bump).
- **13 D-06 column store actions** with NoHistory siblings, mirroring Phase 60 stair pattern verbatim:
  - `addColumn`, `updateColumn`/`updateColumnNoHistory`
  - `removeColumn`/`removeColumnNoHistory`
  - `moveColumn`/`moveColumnNoHistory`
  - `resizeColumnAxis`/`resizeColumnAxisNoHistory` (clamp [0.25, 50])
  - `resizeColumnHeight`/`resizeColumnHeightNoHistory` (clamp [0.25, 50])
  - `rotateColumn`/`rotateColumnNoHistory` (no normalization)
  - `clearColumnOverrides` (resets width/depth to DEFAULT, height to room.wallHeight per D-03)
  - `renameColumn`
  - `setSavedCameraOnColumnNoHistory`, `clearColumnSavedCameraNoHistory`
- **clearSavedCameraNoHistory** kind union widened to include `"column"`; new branch clears savedCamera fields on the matched column.

## Tests Added

- `tests/unit/lib/snapshotMigration.v9-to-v10.test.ts` — 6 tests covering:
  - Seed-empty on every RoomDoc when absent
  - Preserves existing columns
  - Idempotency on v10 (same reference)
  - migrateSnapshot routes v9 through migrateV9ToV10
  - migrateSnapshot v10 passthrough returns identical reference
  - defaultSnapshot emits version 10 with columns: {} seeded
- `tests/unit/stores/cadStore.columns.test.ts` — 13 tests U1-U13 covering:
  - addColumn (defaults + partial overrides)
  - update/remove/move with single-undo
  - resizeColumnAxis (width + depth) with clamp [0.25, 50]
  - resizeColumnHeight with clamp + single-undo
  - rotateColumn (no normalization)
  - clearColumnOverrides (resets to DEFAULT + wallHeight per D-03)
  - renameColumn with single-undo
  - All NoHistory siblings (no past.length increment)
  - savedCamera set/clear + clearSavedCameraNoHistory("column", id) integration

## Verification Results

- `npx vitest run` — **1095 passing | 11 todo** (vs 1093 baseline + 13 new column tests + 6 new migration tests + 2 superseded routing tests updated)
- All 162 test files pass; no new errors introduced. 33 pre-existing React unmount errors during teardown are unrelated.
- `npx tsc --noEmit` — no new column-related errors; pre-existing `import.meta.env` and Fabric.js typing issues unchanged.

## Deviations from Plan

### Rule 3 — Auto-fix blocking issues

**1. [Rule 3 - Blocking] Three legacy `version: 2` writes blocked typecheck after CADSnapshot literal bump**
- **Found during:** Task 3 (typecheck pass)
- **Issue:** `ProjectManager.tsx:35`, `useAutoSave.ts:30`, `TemplatePickerDialog.tsx:61` all wrote `version: 2` directly. With CADSnapshot.version literal bumped from 9 → 10 (Task 1), these became `error TS2322: Type '2' is not assignable to type '10'`.
- **Fix:** Bumped all three writes to `version: 10` with a Phase 86 D-04 comment. (On-disk legacy values still flow through migrateSnapshot on load — this is the persist-at-current-schema-version path.)
- **Files modified:** src/components/ProjectManager.tsx, src/hooks/useAutoSave.ts, src/components/TemplatePickerDialog.tsx
- **Commit:** f3872bd

**2. [Rule 3 - Blocking] migrateSnapshot v1→v2 cast `2 as unknown as 6` needed updating to `2 as unknown as 10`**
- **Found during:** Task 2 (typecheck pass)
- **Issue:** The v1 legacy-snapshot path returns `version: 2 as unknown as 6` since downstream pipeline lifts to current. With CADSnapshot.version now `10`, the cast literal needed to be `10`.
- **Fix:** Updated cast + comment.
- **Files modified:** src/lib/snapshotMigration.ts
- **Commit:** 9a64946

**3. [Rule 3 - Blocking] Pre-existing test asserts in `snapshotMigration.v8tov9.test.ts` pinned v9-passthrough contract**
- **Found during:** Full test sweep after Task 4
- **Issue:** Two assertions pinned the obsolete v9-passthrough behavior (`v9 input passes through unchanged (same reference)` + `defaultSnapshot emits version 9`). These are exactly the contracts Phase 86 supersedes.
- **Fix:** Rewrote both to assert the new v9 → v10 migration contract + version 10 default.
- **Files modified:** src/lib/__tests__/snapshotMigration.v8tov9.test.ts
- **Commit:** 51ee123

### Plan-vs-actual scope alignment

- **Pre-existing snapshotMigration.test.ts** also pinned `version === 9` — updated alongside, not a deviation (was part of Task 2's plan-scoped touch on tests).

## Known Stubs

None — Task 1 ships full Column type, Task 3 ships full store actions, Tasks 2/4 ship full test coverage. No tool, rendering, or UI is wired up yet — that is the intended scope split for Plans 86-02 / 86-03 (rendering wave + tool wave).

## Commits

- `9446237` — feat(86-01): add Column type + RoomDoc.columns + ToolType extension + snapshot v10 bump
- `9a64946` — feat(86-01): wire migrateV9ToV10 into loadSnapshot pipeline + GREEN migration tests
- `f3872bd` — feat(86-01): implement 13 column store actions + clearSavedCamera kind union widening
- `51ee123` — test(86-01): GREEN unit tests for 13 column store actions + single-undo invariants

## Self-Check: PASSED

- `src/types/cad.ts` — FOUND, Column interface + DEFAULT_COLUMN + RoomDoc.columns + version: 10 + ToolType "column"
- `src/lib/snapshotMigration.ts` — FOUND, migrateV9ToV10 exported, defaultSnapshot at v10, v9→v10 routing
- `src/stores/cadStore.ts` — FOUND, migrateV9ToV10 imported + pipeline call, 13 actions + clearSavedCameraNoHistory union widened
- `tests/unit/lib/snapshotMigration.v9-to-v10.test.ts` — FOUND, 6 GREEN tests
- `tests/unit/stores/cadStore.columns.test.ts` — FOUND, 13 GREEN tests
- Commits `9446237`, `9a64946`, `f3872bd`, `51ee123` — FOUND
- `npx vitest run` — 1095 passing (no regression)
