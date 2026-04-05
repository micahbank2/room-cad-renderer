---
phase: 05-multi-room
plan: 01
subsystem: data-model
tags: [types, migration, templates, multi-room]
dependency-graph:
  requires: ["05-00"]
  provides: ["RoomDoc", "CADSnapshot v2", "migrateSnapshot", "ROOM_TEMPLATES"]
  affects: ["src/types/cad.ts", "src/lib/snapshotMigration.ts", "src/data/roomTemplates.ts"]
tech-stack:
  added: []
  patterns: ["pure-module data-model foundation (no React/Zustand deps)"]
key-files:
  created:
    - src/lib/snapshotMigration.ts
    - src/data/roomTemplates.ts
  modified:
    - src/types/cad.ts
    - tests/snapshotMigration.test.ts
    - tests/roomTemplates.test.ts
decisions:
  - "CADSnapshot bumped to version:2 with rooms + activeRoomId (D-01, D-02, D-15)"
  - "migrateSnapshot wraps v1 snapshot into single 'Main Room' (id=room_main) (D-05)"
  - "4 templates: LIVING_ROOM 16x20x9, BEDROOM 12x14x8, KITCHEN 10x12x8, BLANK 16x20x8 (D-11)"
  - "Templates produce 4 perimeter walls, no pre-populated openings or products (D-12, D-13)"
metrics:
  duration: "2m"
  completed: "2026-04-05"
requirements: [ROOM-01, ROOM-02]
---

# Phase 05 Plan 01: Data-Model Foundation Summary

**One-liner:** RoomDoc + CADSnapshot v2 types, v1→v2 migration helper, and 4 room templates (LIVING_ROOM/BEDROOM/KITCHEN/BLANK) — pure modules with full unit-test coverage.

## What Was Built

Three pure modules (no React, no Zustand) establish the schema contract for Phase 5's multi-room restructure:

1. **`src/types/cad.ts`** — Added `RoomDoc` interface (id, name, room, walls, placedProducts) and changed `CADSnapshot` to v2 shape `{ version: 2, rooms, activeRoomId }`. Exported `LegacySnapshotV1` for migration typing. Preserved all existing types (Point, WallSegment, Opening, PlacedProduct, Room, ToolType) verbatim.

2. **`src/lib/snapshotMigration.ts`** — `migrateSnapshot(raw)` with three branches: v2 passthrough (returns identical reference), v1 legacy wrap (packs into single RoomDoc `id=room_main name="Main Room"`), unknown/empty (returns `defaultSnapshot()`). `defaultSnapshot()` produces one 20×16×8 Main Room with empty walls/products.

3. **`src/data/roomTemplates.ts`** — `ROOM_TEMPLATES` record with four templates. Perimeter-wall generator builds 4 walls per rectangle (thickness 0.5, openings [], height = template wallHeight). Each template exposes `{id, label, room, makeWalls()}`. BLANK produces zero walls.

## Tasks Completed

| Task | Name                                                  | Commit  | Files                                                        |
| ---- | ----------------------------------------------------- | ------- | ------------------------------------------------------------ |
| 1    | Add RoomDoc + CADSnapshot v2 to src/types/cad.ts       | 8cb9098 | src/types/cad.ts                                             |
| 2    | Create snapshotMigration.ts + fill tests              | f8fa886 | src/lib/snapshotMigration.ts, tests/snapshotMigration.test.ts |
| 3    | Create roomTemplates.ts + fill tests                  | 531b778 | src/data/roomTemplates.ts, tests/roomTemplates.test.ts        |

## Tests

- `tests/snapshotMigration.test.ts`: 4/4 pass
- `tests/roomTemplates.test.ts`: 5/5 pass
- Combined run: 9/9 pass

Expected build failure: `npm run build` will fail at this point because `cadStore.ts` still uses the v1 shape — Plan 02 restructures the store to match the new schema.

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

- Preserved `export type ToolType` at end of cad.ts per plan direction
- Used exact sample implementation from `05-RESEARCH.md` for `migrateSnapshot`
- Used uid()-suffixed wall IDs (`wall_${uid()}`) in templates to avoid collisions

## Downstream Impact

- Plan 02 will import `RoomDoc`, `CADSnapshot`, `defaultSnapshot`, and `migrateSnapshot` into `cadStore.ts`.
- Plan 02 will import `ROOM_TEMPLATES` into `addRoom` action for the template-picker UI.
- All consumer files (`FabricCanvas`, `ThreeViewport`, `Sidebar`, etc.) still reference old shape — Plan 02 migrates them via active-room selectors.

## Self-Check: PASSED

- FOUND: src/types/cad.ts (modified)
- FOUND: src/lib/snapshotMigration.ts
- FOUND: src/data/roomTemplates.ts
- FOUND: commit 8cb9098
- FOUND: commit f8fa886
- FOUND: commit 531b778
- All 9 unit tests pass
