---
phase: 47-room-display-modes-display-01
plan: "02"
subsystem: display-modes
tags: [display-modes, multi-room-render, uiStore, RoomGroup, ThreeViewport, localStorage, wave-1]
dependency_graph:
  requires: [47-01]
  provides: [uiStore.displayMode, RoomGroup, computeRoomOffsets, ThreeViewport-multi-room]
  affects: [47-03]
tech_stack:
  added: []
  patterns: [zustand-lazy-initializer, per-room-effectivelyHidden-cascade, displayMode-branch-render, localStorage-persistence]
key_files:
  created:
    - src/three/RoomGroup.tsx
  modified:
    - src/stores/uiStore.ts
    - src/test-utils/displayModeDrivers.ts
    - src/three/ThreeViewport.tsx
    - src/main.tsx
decisions:
  - "FloorMesh moved inside RoomGroup group transform (Pitfall 2 resolution) — one floor per room, world-shifted by offsetX"
  - "effectivelyHidden cascade removed from Scene level, reimplemented per-room inside RoomGroup (research Open Question 3)"
  - "walls for wallSideCameraTarget effect derived from rooms[activeRoomId] to avoid stale subscription"
  - "gridHelper positioned using active room dims (halfW/halfL) — kept at Scene level (Pitfall 3)"
  - "D-07 INSTANT: displayMode switch is a synchronous React render branch — no tween/lerp/useSpring added"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-26"
  tasks_completed: 3
  tasks_total: 3
  files_created: 0
  files_modified: 5
---

# Phase 47 Plan 02: uiStore.displayMode + RoomGroup + ThreeViewport Multi-Room Render Summary

**One-liner:** uiStore.displayMode with localStorage hydration + RoomGroup per-room group wrapper + ThreeViewport multi-room NORMAL/SOLO/EXPLODE branch render replacing single-room flat render.

## What Was Built

### Task 1: uiStore.displayMode + setDisplayMode + localStorage hydration
- Added `GSD_DISPLAY_MODE_KEY`, `VALID_DISPLAY_MODES`, `DisplayMode` type, and `readDisplayMode()` helper above the store factory in `src/stores/uiStore.ts`
- `readDisplayMode()`: synchronous, SSR-safe (`typeof window` guard), garbage/missing→"normal" fallback, try/catch for quota/privacy mode
- Added `displayMode: readDisplayMode()` initial value and `setDisplayMode(mode)` action to `UIState` interface and store body
- `setDisplayMode` writes to `localStorage["gsd:displayMode"]` with try/catch guard (D-05)
- Filled `displayModeDrivers.ts` stub bodies: `__driveDisplayMode` → `useUIStore.getState().setDisplayMode(mode)`, `__getDisplayMode` → `useUIStore.getState().displayMode`
- Wired `main.tsx`: `installDisplayModeDrivers()` alongside `installTreeDrivers()`

### Task 2: RoomGroup + computeRoomOffsets
- `computeRoomOffsets(rooms, mode)`: NORMAL/SOLO→all 0; EXPLODE→cumulative `max(width,length)*1.25` in Object.keys order (D-03)
- `RoomGroup`: `<group position={[offsetX,0,0]}>` wrapping FloorMesh + walls + products + ceilings + custom elements
- Per-room `effectivelyHidden` useMemo cascade (D-12): roomId→all leaves, `:walls`/`:ceiling`/`:products`/`:custom` group keys, individual leaf ids
- FloorMesh inside group (Pitfall 2 fix)
- gridHelper/Lighting/Environment NOT in RoomGroup (Pitfall 3 correct)

### Task 3: ThreeViewport multi-room render refactor
- Removed: `useActiveWalls`, `useActivePlacedProducts`, `useActiveCeilings`, `useActivePlacedCustomElements`, `useActiveRoomDoc` subscriptions; scene-level `effectivelyHidden` useMemo; flat FloorMesh/WallMesh/ProductMesh/CeilingMesh/CustomElementMesh render blocks
- Added: `rooms` + `displayMode` subscriptions; `roomOffsets` useMemo; `RoomGroup` import
- SOLO branch: `activeRoomId && rooms[activeRoomId]` → single RoomGroup at offsetX=0; null → empty scene (D-06)
- NORMAL/EXPLODE branch: `Object.entries(rooms).map(([id,doc])=><RoomGroup offsetX={roomOffsets[id]??0}...>)`
- wallSideCameraTarget effect: derives walls from `rooms[activeRoomId]?.walls`
- FabricCanvas.tsx: zero diff (D-04 + D-11 boundary enforced)

## Test Pass Delta

| Test Suite | Before Plan 02 | After Plan 02 |
|---|---|---|
| uiStore.displayMode.test.ts (8 tests) | RED (stub not implemented) | GREEN (8/8 pass) |
| ThreeViewport.displayMode.test.tsx (6 tests + 4 todo) | RED (stub returns {}) | GREEN (6/6 pass, 4 todo deferred to Plan 03) |
| Full suite | 6 failures (pre-existing) | 6 failures (pre-existing, unchanged) |

## Pitfall Resolutions

**Pitfall 1 (research):** Scene only rendered active room in NORMAL mode.
- Resolution: NORMAL/EXPLODE now iterates `Object.entries(rooms)` — all rooms render at computed offsets. Confirmed via `grep "Object.entries(rooms).map" src/three/ThreeViewport.tsx`.

**Pitfall 2 (research):** FloorMesh at Scene level not affected by room group transform.
- Resolution: FloorMesh moved inside RoomGroup `<group position={[offsetX,0,0]}>`. Confirmed: `grep -c "<FloorMesh" src/three/ThreeViewport.tsx` → 0; `grep -c "<FloorMesh" src/three/RoomGroup.tsx` → 1.

**Pitfall 3 (research):** gridHelper/Lighting/Environment inside RoomGroup would duplicate per room.
- Resolution: gridHelper, `<Lighting />`, `<Environment>` kept at Scene level. `grep -c "<gridHelper\|<Lighting\|<Environment" src/three/RoomGroup.tsx` → 0.

## Deviations from Plan

None — plan executed exactly as written. The `walls` variable in the wallSideCameraTarget useEffect dependency was a minor refactor (Rule 1 auto-fix — the wall lookup needed to change from the removed `walls` subscription to `rooms[activeRoomId]?.walls`). Tracked as inline deviation, no architectural change.

## Phase 35 + Phase 46 Regression Check

- Phase 46 hiddenIds cascade: reimplemented per-room inside RoomGroup — orthogonal to SOLO filtering at Scene level (D-04 spec). Full suite regression: 6 pre-existing failures, count unchanged.
- Phase 35 camera tween useEffects: kept intact, only `walls` dependency replaced with `rooms`/`activeRoomId` equivalents.
- FabricCanvas.tsx: `git diff src/canvas/FabricCanvas.tsx` → zero changes.

## Commits

| Hash | Message |
|---|---|
| e47669b | feat(47-02): uiStore.displayMode + setDisplayMode + localStorage hydration + driver install |
| 9109492 | feat(47-02): RoomGroup component + computeRoomOffsets multi-room rendering primitives |
| f6d1875 | feat(47-02): ThreeViewport multi-room render with displayMode branches |

## Self-Check: PASSED

All 5 modified files exist. All 3 task commits found (e47669b, 9109492, f6d1875). Tests: 8/8 uiStore.displayMode GREEN, 6/6 computeRoomOffsets GREEN, full suite 6 pre-existing failures unchanged.
