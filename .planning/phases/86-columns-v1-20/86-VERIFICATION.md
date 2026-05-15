---
phase: 86-columns-v1-20
verified: 2026-05-15T11:05:00Z
status: human_needed
score: 14/14 must-haves verified (automated); 1 human spot-check pending
re_verification: null
human_verification:
  - test: "Place a column via the Cuboid toolbar button and verify 2D + 3D appearance"
    expected: "Click Cuboid icon (Structure group) → click inside a room on the 2D canvas. A 1ft × 1ft column appears at click position with footprint outline + label in 2D. Toggle to 3D (or split view): an extruded box pillar at room wallHeight is visible. Tool auto-switches back to Select after placement."
    why_human: "Visual verification of 2D rendering, 3D extrusion, label positioning, accent-purple hover-glow, and the tactile feel of the placement → auto-select handoff cannot be confirmed programmatically."
  - test: "Reset-to-wall-height single-undo"
    expected: "Select a column, change height in Dimensions tab (e.g. 6ft), click 'Reset to wall height' → height jumps back to the room wallHeight. Press Ctrl+Z exactly once → height returns to the manually-set 6ft. (Reset must be ONE history entry, not many.)"
    why_human: "Confirms the perceived feel of single-undo on a Reset button (D-03). Code path is verified (pushHistory called once in clearColumnOverrides) but the user-facing 'Ctrl+Z once' must be felt by Jessica."
---

# Phase 86: Columns v1.20 Verification Report

**Phase Goal:** Columns/pillars as a new architectural element type. Jessica picks Column tool → clicks in room → column appears in 2D + 3D. Mirror Phase 60 stair pattern. **Closes v1.20 milestone.**
**Verified:** 2026-05-15
**Status:** human_needed (all automated checks pass; 2 visual spot-checks pending)

## Goal Achievement

### Observable Truths

| #   | Truth                                                                  | Status     | Evidence                                                                                          |
| --- | ---------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| 1   | Column type exists with all D-05 fields incl. `shape: "box"\|"cylinder"` | ✓ VERIFIED | `src/types/cad.ts:204-240` — Column interface, DEFAULT_COLUMN_WIDTH/DEPTH_FT, DEFAULT_COLUMN const |
| 2   | `Room.columns: Record<string, Column>` field present                    | ✓ VERIFIED | `src/types/cad.ts:382-385` — `columns?: Record<string, Column>`                                    |
| 3   | `ToolType` union includes `"column"`                                    | ✓ VERIFIED | `src/types/cad.ts:473` — `\| "column"`                                                              |
| 4   | `CADSnapshot.version === 10`                                            | ✓ VERIFIED | `src/types/cad.ts:438` — `version: 10`                                                              |
| 5   | `migrateV9ToV10` exists, seed-empty (not passthrough)                   | ✓ VERIFIED | `snapshotMigration.ts:599-612` — iterates every RoomDoc, seeds `columns = {}`, idempotent on v10  |
| 6   | All 13 D-06 store actions + NoHistory siblings                          | ✓ VERIFIED | `cadStore.ts:168-182` declarations + `:1461-1620` implementations — all 13 actions land           |
| 7   | `columnTool.ts` placement flow + auto-switch back to select             | ✓ VERIFIED | `src/canvas/tools/columnTool.ts:133-141` — `setTool("select")` after placement; setPendingColumn bridge |
| 8   | `renderColumns` in fabricSync with hover-glow + hidden-cascade          | ✓ VERIFIED | `fabricSync.ts:1296-1320` — box-only render, hiddenIds skip, data: `{type:"column", columnId}`     |
| 9   | `ColumnMesh.tsx` with boxGeometry + useResolvedMaterial                 | ✓ VERIFIED | `ColumnMesh.tsx:23,42,89` — useResolvedMaterial, `<boxGeometry args={[widthFt, heightFt, depthFt]}/>` |
| 10  | `RoomGroup` iterates `room.columns` for 3D meshes                       | ✓ VERIFIED | `RoomGroup.tsx:14,74,200-208` — imports ColumnMesh, destructures columns, renders per room        |
| 11  | selectTool column hit-test (priority over walls per D-01 Pitfall 4)     | ✓ VERIFIED | `selectTool.ts:135-151` — column hit BEFORE walls; rotated AABB transform; drag branch at 994-1002 |
| 12  | `ColumnInspector` with Dimensions/Material/Rotation tabs + Reset btn    | ✓ VERIFIED | `ColumnInspector.tsx:71-180` — Tabs primitive, MaterialPicker, Reset-to-wall-height at line 139    |
| 13  | `RightInspector` routes to ColumnInspector when column selected         | ✓ VERIFIED | `RightInspector.tsx:22,33,168-171` — useActiveColumns, ColumnInspector keyed on column.id          |
| 14  | `buildRoomTree` surfaces columns + `RoomsTreePanel` Columns group       | ✓ VERIFIED | `buildRoomTree.ts:118-134` always-emit pattern; `RoomsTreePanel.tsx:243,309,333` rename via Column.name |
| 15  | `FloatingToolbar` Cuboid Column button (data-testid="tool-column")      | ✓ VERIFIED | `FloatingToolbar.tsx:27,61,368-386` — Cuboid lucide icon, Structure group, no `C` shortcut         |
| 16  | 1107+ vitest tests pass, 0 regressions                                  | ✓ VERIFIED | Full suite: **163 files / 1107 passed / 11 todo / 0 failed** (19.69s). Column-specific: 31/31 pass |
| 17  | v1.20 milestone closed in REQUIREMENTS.md                               | ✓ VERIFIED | REQUIREMENTS.md:14-17 (PBR all ✓), :26-28 (PARAM all ✓), :32-34 (COL-01/02/03 all ✓)                |

**Score:** 17/17 truths verified

### Required Artifacts (Levels 1-3)

| Artifact                                                | Status   | Notes                                                                       |
| ------------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| `src/types/cad.ts`                                      | ✓ WIRED  | Column, DEFAULT_COLUMN, Room.columns, version 10, ToolType — all consumed   |
| `src/lib/snapshotMigration.ts`                          | ✓ WIRED  | migrateV9ToV10 routed in migrateSnapshot at `:77-80`; defaultSnapshot at v10 |
| `src/stores/cadStore.ts`                                | ✓ WIRED  | 13+13 actions; clamp [0.25, 50]; clearColumnOverrides resets to wallHeight  |
| `src/canvas/tools/columnTool.ts`                        | ✓ WIRED  | setPendingColumn bridge consumed by FloatingToolbar; auto-switch to select  |
| `src/canvas/fabricSync.ts` (renderColumns)              | ✓ WIRED  | Invoked from FabricCanvas redraw with columns + hiddenIds + hoveredEntityId |
| `src/three/ColumnMesh.tsx`                              | ✓ WIRED  | useResolvedMaterial pipeline (Phase 78); mounted from RoomGroup             |
| `src/three/RoomGroup.tsx`                               | ✓ WIRED  | columns destructured + iterated; cascade-hidden support                     |
| `src/canvas/tools/selectTool.ts` (column branch)        | ✓ WIRED  | Hit-test priority over walls; drag uses Phase 31 transaction pattern         |
| `src/components/inspectors/ColumnInspector.tsx`         | ✓ WIRED  | 3 tabs; reset-to-wall-height single-undo; NumericInputRow + MaterialPicker  |
| `src/components/RightInspector.tsx`                     | ✓ WIRED  | useActiveColumns + ColumnInspector dispatch                                 |
| `src/lib/buildRoomTree.ts`                              | ✓ WIRED  | always-emit Columns group; Column.name wins over auto-numbered fallback     |
| `src/components/RoomsTreePanel/RoomsTreePanel.tsx`      | ✓ WIRED  | column rename writes Column.name; hover + visibility wired                  |
| `src/components/FloatingToolbar.tsx`                    | ✓ WIRED  | Cuboid icon, Structure group, setPendingColumn → setTool("column")          |

### Data-Flow Trace (Level 4)

| Artifact              | Data Variable | Source                              | Produces Real Data | Status     |
| --------------------- | ------------- | ----------------------------------- | ------------------ | ---------- |
| ColumnMesh            | `column.*`    | Zustand store (RoomGroup.props)     | Yes — from cadStore.rooms[].columns | ✓ FLOWING  |
| renderColumns (2D)    | `columns`     | FabricCanvas redraw → store         | Yes — store-driven                  | ✓ FLOWING  |
| ColumnInspector       | `column`      | useActiveColumns hook               | Yes — derived from active room      | ✓ FLOWING  |
| RoomsTreePanel        | `column`      | buildRoomTree(rooms)                | Yes — rooms[].columns iterated      | ✓ FLOWING  |
| FloatingToolbar btn   | `setPendingColumn` config | local default config        | Yes — feeds tool on click           | ✓ FLOWING  |

### Behavioral Spot-Checks

| Behavior                                  | Command                                          | Result                            | Status   |
| ----------------------------------------- | ------------------------------------------------ | --------------------------------- | -------- |
| Column unit tests pass                    | `vitest run tests/unit/.../column*`              | 3 files / 31 passed / 0 failed    | ✓ PASS   |
| Full suite no regressions                 | `vitest run`                                     | 163 files / 1107 passed / 0 failed | ✓ PASS   |
| Migration is seed-empty (not passthrough) | Code review of migrateV9ToV10                    | Iterates RoomDocs, seeds `{}`      | ✓ PASS   |
| Clearance of clearColumnOverrides = 1 undo| Code review of clearColumnOverrides              | One `pushHistory(s)` then mutates  | ✓ PASS   |
| E2E placement + lifecycle specs exist     | `ls tests/e2e/specs/columns*`                    | 2 spec files present (placement + lifecycle) | ✓ PASS |
| E2E specs runtime-GREEN                   | Skipped (Playwright not run; spec authoring + drivers verified by code) | n/a | ? SKIP (visual) |

### Requirements Coverage

| Requirement | Description                                                                           | Status | Evidence                                                                |
| ----------- | ------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| COL-01      | Place column with round/rect cross-section, configurable W/D/H (default to wallHeight)| ✓ SATISFIED | columnTool + Column.shape ("box" only in v1; cylinder field reserved per D-01); height defaults from doc.room.wallHeight at placement |
| COL-02      | 2D footprint + 3D extruded pillar with material slot                                  | ✓ SATISFIED | renderColumns + ColumnMesh boxGeometry + useResolvedMaterial            |
| COL-03      | Selectable, movable, deletable via select tool; PropertiesPanel shows dims + finish   | ✓ SATISFIED | selectTool column branch (hit-test + drag + Delete cascade) + ColumnInspector tabs |

Note on COL-01 "round/rect": D-01 explicitly locks v1.20 to box-only (cylinder shape field reserved for v1.21+). REQUIREMENTS.md "round or rectangular" is marked checked despite this narrowing — confirmed acceptable per D-01 decision document. UI does not expose a shape toggle in v1.20.

### Anti-Patterns Found

None. Scan of column-touching files (`columnTool.ts`, `ColumnMesh.tsx`, `ColumnInspector.tsx`, `fabricSync.ts`, `RoomGroup.tsx`, `selectTool.ts`, `cadStore.ts`, `snapshotMigration.ts`, `buildRoomTree.ts`, `RoomsTreePanel.tsx`, `FloatingToolbar.tsx`) found:
- No TODO/FIXME blockers on column code paths
- No stub returns or empty handlers
- All hardcoded empty defaults (`columns: {}` in seed migration) are intentional D-04 design
- Hover-glow + cascade-hidden + history-push patterns match Phase 60 stair template line-for-line

### Human Verification Required

Two visual spot-checks (see frontmatter `human_verification` for full instructions):

1. **End-to-end placement → 2D + 3D verification** — code wiring is verified but the actual rendered appearance, hover-glow color, label positioning, and the auto-select-after-placement feel require Jessica's eyes.
2. **Reset-to-wall-height single-undo** — code path inserts exactly one `pushHistory(s)` call; needs human confirmation that Ctrl+Z once reverts the reset.

### Gaps Summary

**No automated gaps detected.** All 17 observable truths verified, all 13 artifacts pass Levels 1-4, all 13 store actions present with NoHistory siblings, snapshot v9→v10 migration is seed-empty (not passthrough), 1107 vitest tests pass with 0 regressions, e2e spec files present, v1.20 milestone marked complete in REQUIREMENTS.md.

Phase 86 closes v1.20 (Surface Depth & Architectural Expansion). All four sub-milestones — PBR (Phase 77/78), PARAM (Phase 85), WIN-PRESETS (Phase 79), COL (Phase 86) — verified checked in REQUIREMENTS.md.

Status set to **human_needed** rather than passed solely because Phase 86 introduces a new tool + 2D/3D rendering pair that Jessica must visually confirm in the running app. All code-side checks are green.

---

_Verified: 2026-05-15_
_Verifier: Claude (gsd-verifier)_
