---
phase: 05-multi-room
plan: 02
subsystem: state-store
tags: [zustand, multi-room, store-restructure, tdd]
dependency-graph:
  requires: ["05-01 (RoomDoc type, CADSnapshot v2, migrateSnapshot, ROOM_TEMPLATES)"]
  provides: ["multi-room cadStore shape", "room-management actions", "active-room selector hooks", "getActiveRoomDoc imperative helper", "resetCADStoreForTests helper"]
  affects: ["src/canvas/FabricCanvas.tsx (consumer, breaks until Plan 03)", "src/canvas/fabricSync.ts (consumer)", "src/canvas/tools/*.ts (consumer)", "src/three/ThreeViewport.tsx (consumer)", "src/components/RoomSettings.tsx (consumer)", "src/hooks/useAutoSave.ts (consumer)", "src/App.tsx (consumer)"]
tech-stack:
  added: []
  patterns: ["active-room indirection (D-03): every action dereferences activeDoc(s) then mutates", "snapshot v2 captures { version, rooms, activeRoomId } — undo/redo naturally covers room add/remove", "switchRoom uses plain set (no produce, no history) per Pitfall 4", "last-room guard in removeRoom + activeRoomId reassignment", "defensive migrateSnapshot call in loadSnapshot accepts v1 or v2 raw input"]
key-files:
  created: []
  modified:
    - path: src/stores/cadStore.ts
      why: "Full restructure — state shape, all 14 actions, 4 new room-management actions, 4 selector hooks, 2 helpers"
    - path: tests/cadStore.multiRoom.test.ts
      why: "Filled 9 TDD stubs (preserved describe + test name strings verbatim)"
decisions:
  - "Active-room dereference pattern (activeDoc helper) applied uniformly across all 12 existing actions — single call-site for the null-guard keeps action bodies readable"
  - "switchRoom uses plain set (not produce+pushHistory) so Ctrl+Z after a room switch restores the CAD edit chain, not the switch itself (D-06, Pitfall 4)"
  - "removeRoom guard: Object.keys(s.rooms).length <= 1 — guarantees at least one room always exists so activeRoomId stays valid in default usage"
  - "loadSnapshot accepts `unknown` and calls migrateSnapshot defensively — single entry point for v1→v2 migration means autosave and project-load share one code path"
  - "resetCADStoreForTests uses useCADStore.setState with initialState() — clean Partial<CADState> reset without recreating the store instance"
metrics:
  duration: 2m
  completed-date: 2026-04-05
---

# Phase 5 Plan 02: cadStore Multi-Room Restructure Summary

The cadStore now holds `{ rooms: Record<string, RoomDoc>, activeRoomId: string | null }` instead of top-level `{ room, walls, placedProducts }`. All 12 existing actions mutate the active RoomDoc transparently, 4 new room-management actions (addRoom/renameRoom/removeRoom/switchRoom) land per locked decisions, and 9 multi-room test stubs now pass.

## What Was Built

- Restructured `src/stores/cadStore.ts` state shape to `{ rooms, activeRoomId, past, future }`.
- Rewrote 12 existing actions (setRoom, addWall, updateWall, resizeWallByLabel, removeWall, addOpening, placeProduct, moveProduct, rotateProduct, rotateProductNoHistory, removeProduct, removeSelected) to dereference `activeDoc(s)` before mutating walls / placedProducts / room.
- Added 4 room-management actions: `addRoom(name, templateId?)` (returns id), `renameRoom(id, name)`, `removeRoom(id)` (last-room guard + activeRoomId reassignment), `switchRoom(id)` (no history per Pitfall 4).
- Updated `snapshot()` / `pushHistory()` to capture `{ version: 2, rooms: deep-cloned, activeRoomId }`.
- Updated `undo` / `redo` to restore `rooms` + `activeRoomId` from snapshot.
- Updated `loadSnapshot(raw: unknown)` to defensively call `migrateSnapshot(raw)` — accepts v1 legacy or v2 input.
- Exported 4 selector hooks: `useActiveRoomDoc`, `useActiveRoom`, `useActiveWalls`, `useActivePlacedProducts`.
- Exported `getActiveRoomDoc()` non-hook helper for tools.
- Exported `resetCADStoreForTests()` helper.
- Filled all 9 TDD stub tests in `tests/cadStore.multiRoom.test.ts` preserving describe + test name strings verbatim.

## Test Results

```
npm test -- --run tests/cadStore.multiRoom.test.ts tests/snapshotMigration.test.ts tests/roomTemplates.test.ts
 Test Files  3 passed (3)
      Tests  18 passed (18)
```

Build still fails (consumers reference old shape) — that's Plan 03's scope, as noted in the plan spec.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `src/stores/cadStore.ts` modified, contains all required exports
- `tests/cadStore.multiRoom.test.ts` has 0 `it.todo`, 9 passing tests
- Commits exist: `c5e4f9d` (test), `fff4e4a` (feat)
- No top-level `s.walls[`, `s.placedProducts[`, or `s.room ` references remain
- 12 `s.activeRoomId` references (>= 6 required)
- All required exports present via grep
