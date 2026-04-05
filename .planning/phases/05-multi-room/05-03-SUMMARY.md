---
phase: 05-multi-room
plan: 03
subsystem: multi-room
tags: [zustand, selectors, refactor, ui, ctrl-tab]
requires:
  - cadStore.useActiveRoom / useActiveWalls / useActivePlacedProducts / getActiveRoomDoc (Plan 02)
  - snapshotMigration.defaultSnapshot / migrateSnapshot (Plan 01)
  - roomTemplates.ROOM_TEMPLATES (Plan 01)
provides:
  - RoomTabs component (horizontal bar, active underline, + / x buttons)
  - AddRoomDialog component (name input + 2x2 template grid)
  - Ctrl/Cmd+Tab cycles active room forward
  - v2 snapshot shape ({ version, rooms, activeRoomId }) persisted by useAutoSave
affects:
  - All 10 consumer components/modules now read via active-room selectors
  - useAutoSave comparator fixed (Pitfall 1 resolved)
tech-stack:
  added: []
  patterns:
    - active-room selector pattern (useActive* hooks + getActiveRoomDoc for imperative)
    - last-room guard via roomList.length > 1 for delete affordance
    - Tab key handled inside existing keyboard useEffect (single listener)
key-files:
  created:
    - src/components/RoomTabs.tsx
    - src/components/AddRoomDialog.tsx
  modified:
    - src/App.tsx (imports, state, Tab handler, mount RoomTabs + AddRoomDialog)
    - src/hooks/useAutoSave.ts (comparator + save path)
    - src/components/ProjectManager.tsx (defaultSnapshot on New, v2 save shape)
    - src/components/WelcomeScreen.tsx (defaultSnapshot())
    - src/canvas/FabricCanvas.tsx (useActive* hooks + getActiveRoomDoc)
    - src/canvas/fabricSync.ts (no functional change — walls/placedProducts already passed as args)
    - src/canvas/tools/selectTool.ts (getActiveRoomDoc for all imperative reads)
    - src/canvas/tools/doorTool.ts
    - src/canvas/tools/windowTool.ts
    - src/three/ThreeViewport.tsx
    - src/three/WalkCameraController.tsx
    - src/components/Sidebar.tsx
    - src/components/RoomSettings.tsx
    - src/components/StatusBar.tsx
    - src/components/PropertiesPanel.tsx
    - tests/cadStore.test.ts (resetCADStoreForTests + activeDoc helper)
    - tests/useAutoSave.test.ts (resetCADStoreForTests)
    - tests/dragDrop.test.ts (Rule 1 fix: new shape assertions)
decisions:
  - Keep loadSnapshot single-source-of-truth: callers pass raw data; loadSnapshot calls migrateSnapshot internally. ProjectManager.handleLoad does not double-migrate.
  - RoomTabs uses inline confirm() + window.confirm, no custom confirm modal (keeps scope tight).
  - Ctrl/Cmd+Tab added to existing App.tsx keyboard useEffect to share input-focus guard.
  - StatusBar: dropped `room` hook (unused) during refactor — lint cleanup.
metrics:
  duration: 5m
  completed: "2026-04-05T13:28:34Z"
---

# Phase 5 Plan 03: Wire consumers + build room UI Summary

Wired the restructured multi-room cadStore into every consumer (15 files), fixed the autosave comparator to compare state.rooms/activeRoomId references (Pitfall 1), fixed the autosave save path to persist the v2 `{ version, rooms, activeRoomId }` shape (Pitfall 7), and shipped the ROOM_TABS + AddRoomDialog UI with Ctrl/Cmd+Tab room cycling — phase 5 is observably complete and all build/test criteria are green.

## What Was Built

- **Active-room selector swap**: Every `useCADStore((s) => s.walls | s.room | s.placedProducts)` call site now uses the Plan 02 selector hooks (`useActiveRoom`, `useActiveWalls`, `useActivePlacedProducts`). Every imperative `useCADStore.getState().walls` etc. call site now uses `getActiveRoomDoc()` with nullish fallbacks.
- **Autosave pitfall fixes**: `useAutoSave` compares `state.rooms === prevState.rooms && state.activeRoomId === prevState.activeRoomId` (ref equality, gated by immer — Pitfall 1), and persists `{ version: 2, rooms, activeRoomId }` (Pitfall 7).
- **Defensive migration**: `ProjectManager.handleNew` and `WelcomeScreen.handleBlankRoom` now call `loadSnapshot(defaultSnapshot())`. `ProjectManager.handleLoad` still calls `loadSnapshot(project.snapshot)` since Plan 02's `loadSnapshot` runs `migrateSnapshot` internally (single source of truth, avoids double-migrate).
- **RoomTabs component** (`src/components/RoomTabs.tsx`): Horizontal `bg-obsidian-low` bar above canvas. Each tab shows `room.name.toUpperCase().replace(/\s/g, "_")`. Active tab has `text-accent-light` + underline. Hover reveals `x` button (hidden if only 1 room remains). `x` triggers `window.confirm` + `removeRoom(id)`. `+ ADD_ROOM` button on right opens AddRoomDialog.
- **AddRoomDialog component** (`src/components/AddRoomDialog.tsx`): Modal with `ROOM_NAME` input + 2×2 template grid (LIVING_ROOM · 16 × 20, BEDROOM · 12 × 14, KITCHEN · 10 × 12, BLANK · 16 × 20). Selected template has accent border. `CREATE` disabled until name non-empty. Enter submits, Escape cancels. On create calls `addRoom(name, templateId)` which advances activeRoomId.
- **Ctrl/Cmd+Tab cycling**: Added to existing App.tsx keyboard useEffect. Reads `rooms` keys, finds current index, advances to `(i + 1) % ids.length`. Guard returns early if < 2 rooms or no activeRoomId.
- **Test updates**: `tests/cadStore.test.ts` + `tests/useAutoSave.test.ts` use `resetCADStoreForTests()`. Added `activeDoc()` helper for tests that read the store. Fixed `tests/dragDrop.test.ts` as a Rule 1 deviation (pre-existing test used old shape).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed tests/dragDrop.test.ts for new store shape**
- **Found during:** Task 1 verification (build green but tests failing)
- **Issue:** `tests/dragDrop.test.ts` `beforeEach` used legacy setState shape (`{ room, walls, placedProducts, past, future }`) and assertions read `useCADStore.getState().placedProducts` which is now undefined. 2 tests failed.
- **Fix:** Swapped `beforeEach` to `resetCADStoreForTests()`, added local `activeDoc()` helper, updated both assertion sites to read `activeDoc().placedProducts`.
- **Files modified:** tests/dragDrop.test.ts
- **Commit:** d518cde (bundled with Task 1 refactor commit)

**2. [Rule 2 - Cleanup] Removed unused `room` hook from StatusBar**
- **Found during:** Task 1 refactor
- **Issue:** After swapping to `useActiveRoom()`, the `room` variable was unused (StatusBar only renders wallCount/gridSnap/cameraMode). TypeScript would emit unused-var warning.
- **Fix:** Dropped the import + binding.
- **Files modified:** src/components/StatusBar.tsx
- **Commit:** d518cde

## Verification

- `npm run build` exits 0 (502.97 kB index, 926.77 kB ThreeViewport)
- `npm test -- --run` passes 115/115 tests (3 todo unchanged)
- `grep -rn "useCADStore((s) => s.walls)" src/` → 0 matches
- `grep -rn "useCADStore((s) => s.room)" src/ | grep -v "s.rooms"` → 0 matches
- `grep -rn "useCADStore((s) => s.placedProducts)" src/` → 0 matches
- `grep -rn "getState().walls\b" src/` → 0 matches
- `grep -rn "getState().placedProducts\b" src/` → 0 matches
- `grep "state.rooms === prevState.rooms" src/hooks/useAutoSave.ts` → matches
- `grep "version: 2" src/hooks/useAutoSave.ts` → matches
- `grep "defaultSnapshot" src/components/WelcomeScreen.tsx` → matches
- `grep "<RoomTabs" src/App.tsx` → matches
- `grep "<AddRoomDialog" src/App.tsx` → matches
- `grep "ctrlKey || e.metaKey" src/App.tsx` → matches
- `grep "isCanvas && <RoomTabs" src/App.tsx` → matches

## Self-Check: PASSED

- FOUND: src/components/RoomTabs.tsx
- FOUND: src/components/AddRoomDialog.tsx
- FOUND: commit d518cde (Task 1)
- FOUND: commit 48ce129 (Task 2)
