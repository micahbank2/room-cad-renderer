# Phase 5: Multi-Room - Research

**Researched:** 2026-04-05
**Domain:** Zustand store restructure + snapshot schema migration
**Confidence:** HIGH (100% in-repo investigation; all findings verified against actual source files)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `cadStore` holds `rooms: Record<string, RoomDoc>` + `activeRoomId: string | null`. Legacy top-level `room`/`walls`/`placedProducts` fields removed.
  ```ts
  interface RoomDoc {
    id: string              // "room_<uid>"
    name: string            // "Living Room", "Bedroom 1", etc.
    room: Room              // width/length/wallHeight
    walls: Record<string, WallSegment>
    placedProducts: Record<string, PlacedProduct>
  }
  ```
- **D-02:** `CADSnapshot` becomes `{ rooms, activeRoomId }`. Undo/redo captures full snapshots globally (one history chain across all rooms).
- **D-03:** Existing store actions (`addWall`, `updateWall`, `removeWall`, `placeProduct`, `moveProduct`, `rotateProduct`, `removeProduct`, `setRoom`, `resizeWallByLabel`, `addOpening`) all mutate **active room** transparently. Call sites unchanged.
- **D-04:** Selectors read from active room. Provide 3 convenience hooks: `useActiveWalls()`, `useActivePlacedProducts()`, `useActiveRoom()`.
- **D-05:** Migration: legacy v1 snapshot (has `room`/`walls`/`placedProducts` at root, no `rooms`) wraps into single RoomDoc named "Main Room", id `room_main`, `activeRoomId = "room_main"`. Applied in `loadSnapshot` AND `useAutoSave` deserialization.
- **D-06:** New actions: `addRoom(name, template?) → string`, `renameRoom(id, name)`, `removeRoom(id)` (can't remove last, switch active if removed), `switchRoom(id)` (NO history push — transient UI).
- **D-07:** First room defaults to "Main Room". Second+ rooms: name required in Add Room dialog.
- **D-08:** ROOM_TABS horizontal bar above canvas, accent-light underline on active, `+` opens Add Room dialog, × on hover (disabled if 1 room).
- **D-09:** ROOM_TABS visible on 2D/3D/split. NOT on LIBRARY view.
- **D-10:** Ctrl/Cmd+Tab cycles rooms forward. No single-key shortcuts (avoid V/W/D/N/E clash).
- **D-11:** Templates in `src/data/roomTemplates.ts`: LIVING_ROOM 16×20×9, BEDROOM 12×14×8, KITCHEN 10×12×8, BLANK 16×20×8 no walls.
- **D-12:** Templates = 4 perimeter walls, thickness 0.5ft, openings: [], origin at (0,0).
- **D-13:** No doors/windows/furniture pre-populated.
- **D-14:** Template picker lives inside Add Room dialog: name input (required), 2×2 template grid, Obsidian CAD styling.
- **D-15:** Snapshot schema: `{ version: 2, rooms, activeRoomId }`. Migrate v1→v2 in-memory on load.
- **D-16:** Backwards compat via migration — no destructive data changes.
- **D-17:** Auto-save debounce unchanged — triggers on any change to any room.
- **D-18:** `placedProducts` lives **inside** each RoomDoc. Products in Room A don't appear in Room B. Product library remains global.
- **D-19:** Deleting a room deletes its placed products (no migration prompt).

### Claude's Discretion
- Exact wall coordinates per template (planner picks — must form a rectangle at stated size).
- Whether ROOM_TABS uses horizontal scroll or wrap for many rooms.
- Active/inactive tab colors (recommend: accent-light active, text-text-dim inactive).
- Add Room dialog exact layout (modal, Obsidian CAD style, consistent with AddProductModal).
- Whether deleting a room requires confirm (recommend: yes).
- Whether `undo` after `addRoom` removes the whole room (recommend: yes, global snapshot semantics).
- Whether WelcomeScreen "Start Blank Room" offers template picker (recommend: no, keep simple, add rooms from canvas tab bar).

### Deferred Ideas (OUT OF SCOPE)
- Connected whole-house floor plan (v2 per PROJECT.md)
- Moving products between rooms
- Duplicating a room
- User-defined custom templates
- Pre-populated furniture in templates
- Doors/windows in templates
- Per-room undo history (explicitly global per D-02)
- Room ordering / drag-to-reorder tabs
- Hide/show rooms toggle
- Simultaneous multi-room floorplan view (v2)
- Per-room lighting / 3D environment presets
- Template marketplace / sharing
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ROOM-01 | User can create multiple rooms within one project | Data-model restructure (D-01/D-02), new actions (D-06), ROOM_TABS UI (D-08), migration (D-05/D-15), product isolation (D-18) |
| ROOM-02 | Room templates (living room, bedroom, kitchen presets) | Templates module (D-11/D-12/D-13), Add Room dialog template picker (D-14) |
</phase_requirements>

## Summary

Phase 5 is a **data-shape refactor with broad blast radius**. The cadStore currently exposes three top-level slices (`room`, `walls`, `placedProducts`) that are read in **~10 files** and mutated in **~15 call sites**. Wrapping them inside a `rooms: Record<id, RoomDoc>` + `activeRoomId` indirection touches every one, but the pattern is mechanical: each read becomes an active-room selector, each internal action prepends `s.rooms[s.activeRoomId]` to its mutation path.

The project already has a proven migration precedent (`productStore.load()` at `src/stores/productStore.ts:21-36`) that shapes the snapshot-version-migration path. The serialization layer is trivially backwards-compatible: `SavedProject.snapshot` is typed as `CADSnapshot` but nothing in IndexedDB validates the shape — inject version detection in `loadSnapshot` + `useAutoSave` + `loadProject` call sites.

**Primary recommendation:** Implement in this order:
1. Types (`RoomDoc`, new `CADSnapshot` v2 shape, keep v1 type as `LegacySnapshotV1` for migration)
2. cadStore (state + actions rewrite + selector hooks)
3. Serialization migration helper (`migrateSnapshot(data) → CADSnapshot v2`)
4. Update every read-site via the 3 selector hooks (mechanical find+replace)
5. ROOM_TABS + AddRoomDialog components
6. App.tsx wiring (Ctrl/Cmd+Tab, mount ROOM_TABS above canvas containers)

The biggest gotchas are the **autosave subscribe equality check** (currently compares `state.room === prevState.room` etc — the new subscribe must compare `state.rooms` reference) and the **test files that setState directly with the old shape** (4 tests manually reset the store with `{room, walls, placedProducts, past, future}`).

## Standard Stack

This is a pure refactor — no new runtime dependencies.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.12 | Store already in use | Already the project's state lib |
| immer | ^11.1.4 | Already used inside `produce()` | Existing pattern in cadStore |
| idb-keyval | ^6.2.2 | IndexedDB persistence | Already used for projects + productStore |

**No install step needed.**

## Architecture Patterns

### Recommended File Structure (new + modified)
```
src/
├── types/
│   └── cad.ts                   # + RoomDoc, CADSnapshot v2, LegacySnapshotV1
├── stores/
│   └── cadStore.ts              # restructure: rooms + activeRoomId; add room actions; add selector hooks
├── lib/
│   └── serialization.ts         # + migrateSnapshot(raw) v1→v2; SavedProject unchanged
├── data/
│   └── roomTemplates.ts         # NEW: LIVING_ROOM, BEDROOM, KITCHEN, BLANK
├── components/
│   ├── RoomTabs.tsx             # NEW: horizontal tab bar
│   └── AddRoomDialog.tsx        # NEW: name input + 2×2 template picker
├── canvas/FabricCanvas.tsx      # swap useCADStore selectors → useActive* hooks
├── three/ThreeViewport.tsx      # same
├── three/WalkCameraController.tsx  # same
├── components/Sidebar.tsx       # same
├── components/RoomSettings.tsx  # same
├── components/StatusBar.tsx     # same (optionally show active room name)
├── components/PropertiesPanel.tsx # same
├── components/ProjectManager.tsx  # handleNew + handleLoad need v2 snapshot
├── components/WelcomeScreen.tsx # handleBlankRoom needs v2 snapshot
├── hooks/useAutoSave.ts         # subscribe compares state.rooms + activeRoomId
└── App.tsx                      # Ctrl/Cmd+Tab handler, mount <RoomTabs/> above canvas
```

### Pattern 1: Active-Room Selector Hooks
**What:** Thin hooks that dereference the active room via `s.rooms[s.activeRoomId!]`.
**When to use:** Every existing `useCADStore((s) => s.walls)` call site.
**Example:**
```ts
// src/stores/cadStore.ts (additions)
export const useActiveRoom = () =>
  useCADStore((s) => (s.activeRoomId ? s.rooms[s.activeRoomId]?.room : undefined));
export const useActiveWalls = () =>
  useCADStore((s) => (s.activeRoomId ? s.rooms[s.activeRoomId]?.walls ?? {} : {}));
export const useActivePlacedProducts = () =>
  useCADStore((s) => (s.activeRoomId ? s.rooms[s.activeRoomId]?.placedProducts ?? {} : {}));
```
**Guard:** Since `activeRoomId` is nullable, every hook returns a safe default (`undefined` for room, `{}` for walls/placedProducts). Default store state should always have one room (`room_main`), so `activeRoomId` is never null in practice — the nullable type is only for the brief "project closed" state.

### Pattern 2: Transparent Action Mutation
**What:** Existing action names unchanged; internals dereference `s.rooms[s.activeRoomId]`.
**Example:**
```ts
addWall: (start, end) =>
  set(produce((s: CADState) => {
    const activeId = s.activeRoomId;
    if (!activeId) return;
    const doc = s.rooms[activeId];
    if (!doc) return;
    pushHistory(s);
    const id = `wall_${uid()}`;
    doc.walls[id] = {
      id, start, end,
      thickness: 0.5,
      height: doc.room.wallHeight,
      openings: [],
    };
  })),
```
**Benefit:** Every existing `useCADStore.getState().addWall(...)` call site in tool files stays identical.

### Pattern 3: Snapshot Version Migration (follows productStore precedent)
**Where to place:** `src/lib/serialization.ts` as a new exported `migrateSnapshot()` function called by `loadProject()` consumers (ProjectManager, WelcomeScreen, useAutoSave).
**Example:**
```ts
// src/lib/serialization.ts
export function migrateSnapshot(raw: any): CADSnapshot {
  // v2 already
  if (raw && raw.version === 2 && raw.rooms) return raw as CADSnapshot;
  // v1 legacy — wrap into single RoomDoc
  if (raw && raw.room && raw.walls !== undefined) {
    const mainRoom: RoomDoc = {
      id: "room_main",
      name: "Main Room",
      room: raw.room,
      walls: raw.walls ?? {},
      placedProducts: raw.placedProducts ?? {},
    };
    return {
      version: 2,
      rooms: { room_main: mainRoom },
      activeRoomId: "room_main",
    };
  }
  // empty/unknown — return empty default with one Main Room
  return defaultSnapshot();
}
```

### Anti-Patterns to Avoid
- **Conditional-shape store:** Do not try to keep `s.walls` as a getter or a computed alias. Pick one shape (rooms-only) and force every consumer onto selectors. Proxy/getter shims on Zustand state break referential equality and Immer.
- **Per-room history stacks:** D-02 locks this as global. Don't be clever.
- **Mutating `s.rooms[id].walls` via object spread:** Stay inside `produce()` blocks with direct mutation — consistent with existing pattern.
- **Forgetting `removeRoom` last-room guard:** The action must bail if `Object.keys(s.rooms).length <= 1`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deep clone for snapshots | Custom recursive clone | Existing `JSON.parse(JSON.stringify(...))` pattern in `snapshot()` | Already proven, matches existing code |
| Deep equality for subscribe | `isEqual` / structural comparison | Zustand reference equality on `state.rooms` / `state.activeRoomId` | Immer guarantees new object identity only when values change |
| UUID for room IDs | Crypto/nanoid | Existing `uid()` from `@/lib/geometry` | Consistent with `wall_`, `pp_`, `op_`, `proj_` prefixes |
| Confirmation modal | New Modal component | Browser `confirm()` (v1) or inline Obsidian-styled confirm | Simple destructive action, single-user tool |
| Snapshot versioning | DB schema migrations | Inline `migrateSnapshot()` function matching `productStore.load()` migration | Already the idiom in this codebase |

**Key insight:** Every piece of "infrastructure" this phase needs already exists in the codebase. The phase is entirely surface-area changes, not new capability introduction.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **Saved projects in IndexedDB** at keys `room-cad-project-*`. Each stores `{ id, name, updatedAt, snapshot }` where `snapshot` is v1 shape `{room, walls, placedProducts}`. An unknown number of projects exist in Jessica's browser. | **Data migration via read-path** (D-05/D-15). `migrateSnapshot()` converts v1→v2 at load time. No write migration — next autosave will persist v2 shape. |
| Live service config | None — no external services. | None. |
| OS-registered state | None — browser-only app. | None. |
| Secrets/env vars | None. | None. |
| Build artifacts | None — no compiled schema, no codegen. | None. |

**Canonical question answered:** After the repo is updated, the only runtime state that still carries the old shape is IndexedDB project records — handled by in-memory migration at load. Saved projects remain loadable; next autosave rewrites them as v2.

## Common Pitfalls

### Pitfall 1: useAutoSave subscribe equality check stale
**What goes wrong:** `useAutoSave.ts:17-22` compares `state.room === prevState.room && state.walls === prevState.walls && state.placedProducts === prevState.placedProducts`. After restructure, these fields no longer exist at the top level — the check would always be `undefined === undefined → true` and autosave would **never fire**.
**Why it happens:** Rename/refactor leaves stale reference comparisons.
**How to avoid:** Replace with `state.rooms === prevState.rooms && state.activeRoomId === prevState.activeRoomId`. Immer produces new `state.rooms` identity whenever any nested room mutates, so reference equality works.
**Warning signs:** "Save never fires" / "status stays idle forever" during manual testing.

### Pitfall 2: Test files reset store with old shape
**What goes wrong:** `tests/cadStore.test.ts:4-12` and `tests/useAutoSave.test.ts:16-23` call `useCADStore.setState({ room, walls, placedProducts, past, future })`. After restructure, these setState calls leave the store in a **half-migrated state** with extra top-level fields that no selector reads.
**Why it happens:** Tests bypass the store's action layer.
**How to avoid:** Update every `setState` reset to `{ rooms: { room_main: {...}}, activeRoomId: "room_main", past: [], future: [] }`. Consider exposing a `resetStore()` test helper in cadStore to centralize.
**Warning signs:** Tests pass individually but fail when run together; "undefined is not an object (evaluating s.rooms[s.activeRoomId])".

### Pitfall 3: loadSnapshot wipes history but new snapshots are v2
**What goes wrong:** `loadSnapshot(snap)` receives a snapshot. If callers pass a v1 shape (WelcomeScreen's `handleBlankRoom` currently does at `WelcomeScreen.tsx:11-15`, ProjectManager's `handleNew` at `ProjectManager.tsx:57-63`), the store ends up with undefined `rooms`.
**Why it happens:** Multiple call sites construct snapshots inline.
**How to avoid:** Either (a) update every inline snapshot construction to v2 shape, or (b) run `migrateSnapshot()` inside `loadSnapshot` itself. **Recommend (b)** — more defensive, single source of truth.
**Warning signs:** Click "New" → blank white canvas; console shows `Cannot read properties of undefined (reading 'walls')`.

### Pitfall 4: switchRoom pushing history breaks undo
**What goes wrong:** If `switchRoom` pushes to history (as other actions do), every room-tab click consumes undo slots. Hitting Ctrl+Z after switching would bring you back to the previous room instead of undoing a wall edit.
**Why it happens:** Following the pattern-blindly.
**How to avoid:** D-06 explicitly states `switchRoom` does NOT push history. Implement as a plain `set()` without `pushHistory(s)`.
**Warning signs:** Ctrl+Z cycles through room switches instead of edits.

### Pitfall 5: Opening orphaned when wall is in non-active room
**What goes wrong:** Tool handlers read `useCADStore.getState().walls` (see `doorTool.ts:23`, `windowTool.ts:23`, `selectTool.ts:138/180`). After restructure, `.walls` no longer exists at root; tools will read `undefined`.
**Why it happens:** Tools use `getState()` directly for performance (outside React). They MUST be updated to `useCADStore.getState().rooms[useCADStore.getState().activeRoomId!].walls` or an equivalent helper.
**How to avoid:** Provide a non-hook helper `getActiveRoomDoc()` in cadStore that tools can call. Then `const walls = getActiveRoomDoc().walls`.
**Warning signs:** Door/window tools silently stop detecting walls; select tool can't drag anything.

### Pitfall 6: renderProducts reads placedProducts per-room but productLibrary still global
**What goes wrong:** The rendering code uses `productLibrary.find((p) => p.id === pp.productId)` to pair placed products with library entries. This pattern is fine — productStore stays global per D-18. Just confirm no coupling leaks.
**How to avoid:** No change needed. Product lookup remains global.

### Pitfall 7: useAutoSave.getState() reads old shape
**What goes wrong:** `useAutoSave.ts:36` does `const { room, walls, placedProducts } = useCADStore.getState();` and `saveProject(id, name, { room, walls, placedProducts })`. After restructure, these fields are undefined. Autosave would save empty snapshots.
**How to avoid:** Rewrite to `const { rooms, activeRoomId } = useCADStore.getState(); saveProject(id, name, { version: 2, rooms, activeRoomId });`.
**Warning signs:** Projects save with no data; reload shows empty room.

## Code Examples

### Example: addRoom with template
```ts
// src/stores/cadStore.ts
import { ROOM_TEMPLATES, type RoomTemplateId } from "@/data/roomTemplates";

addRoom: (name, templateId) => {
  const newId = `room_${uid()}`;
  set(produce((s: CADState) => {
    pushHistory(s);
    const template = templateId ? ROOM_TEMPLATES[templateId] : ROOM_TEMPLATES.BLANK;
    s.rooms[newId] = {
      id: newId,
      name,
      room: { ...template.room },
      walls: template.makeWalls(),  // template yields Record<string, WallSegment>
      placedProducts: {},
    };
    s.activeRoomId = newId;
  }));
  return newId;
},
```

### Example: template definition
```ts
// src/data/roomTemplates.ts
import type { Room, WallSegment } from "@/types/cad";
import { uid } from "@/lib/geometry";

export type RoomTemplateId = "LIVING_ROOM" | "BEDROOM" | "KITCHEN" | "BLANK";

interface RoomTemplate {
  id: RoomTemplateId;
  label: string;
  room: Room;
  makeWalls: () => Record<string, WallSegment>;
}

function perimeterWalls(w: number, l: number, h: number): Record<string, WallSegment> {
  const corners = [
    { x: 0, y: 0 }, { x: w, y: 0 },
    { x: w, y: l }, { x: 0, y: l },
  ];
  const walls: Record<string, WallSegment> = {};
  for (let i = 0; i < 4; i++) {
    const id = `wall_${uid()}`;
    walls[id] = {
      id,
      start: corners[i],
      end: corners[(i + 1) % 4],
      thickness: 0.5,
      height: h,
      openings: [],
    };
  }
  return walls;
}

export const ROOM_TEMPLATES: Record<RoomTemplateId, RoomTemplate> = {
  LIVING_ROOM: {
    id: "LIVING_ROOM", label: "LIVING_ROOM · 16 × 20 ft",
    room: { width: 16, length: 20, wallHeight: 9 },
    makeWalls: () => perimeterWalls(16, 20, 9),
  },
  BEDROOM: {
    id: "BEDROOM", label: "BEDROOM · 12 × 14 ft",
    room: { width: 12, length: 14, wallHeight: 8 },
    makeWalls: () => perimeterWalls(12, 14, 8),
  },
  KITCHEN: {
    id: "KITCHEN", label: "KITCHEN · 10 × 12 ft",
    room: { width: 10, length: 12, wallHeight: 8 },
    makeWalls: () => perimeterWalls(10, 12, 8),
  },
  BLANK: {
    id: "BLANK", label: "BLANK · 16 × 20 ft",
    room: { width: 16, length: 20, wallHeight: 8 },
    makeWalls: () => ({}),
  },
};
```

## Store Consumer Inventory

Every call site that must change. Grep-verified against `src/`.

### Selector reads (subscriber form — need `useActive*()` hooks)

| File | Lines | Current | Change |
|------|-------|---------|--------|
| `src/App.tsx` | 26 | `useCADStore((s) => Object.keys(s.walls).length)` | `Object.keys(useActiveWalls()).length` |
| `src/canvas/FabricCanvas.tsx` | 40-42 | `s.room` / `s.walls` / `s.placedProducts` | `useActiveRoom()` / `useActiveWalls()` / `useActivePlacedProducts()` |
| `src/three/ThreeViewport.tsx` | 19-21, 111 | `s.room` / `s.walls` / `s.placedProducts` | same as above |
| `src/three/WalkCameraController.tsx` | 21-22 | `s.room` / `s.walls` | `useActiveRoom()` / `useActiveWalls()` |
| `src/components/Sidebar.tsx` | 12-14 | `s.room` / `s.walls` / `s.placedProducts` | same as above |
| `src/components/RoomSettings.tsx` | 4 | `s.room` | `useActiveRoom()` |
| `src/components/StatusBar.tsx` | 15-16 | `s.room` / `s.walls` | same as above |
| `src/components/PropertiesPanel.tsx` | 14-15 | `s.walls` / `s.placedProducts` | same as above |
| `src/components/ProjectManager.tsx` | 22-24 | `s.room` / `s.walls` / `s.placedProducts` | Read full snapshot `{rooms, activeRoomId}` for save; loadSnapshot for load. |

### Imperative reads (`getState()` — need helper `getActiveRoomDoc()`)

| File | Lines | Current | Change |
|------|-------|---------|--------|
| `src/hooks/useAutoSave.ts` | 15, 36 | subscribe comparator; `{room, walls, placedProducts}` destructure | compare `state.rooms`/`state.activeRoomId`; destructure `{rooms, activeRoomId}` |
| `src/canvas/FabricCanvas.tsx` | 102, 135, 138, 183 | `getState().room` / `getState().walls` | `getActiveRoomDoc().room` / `.walls` |
| `src/canvas/dragDrop.ts` | 53 | `placeProduct(...)` | no change (D-03 — transparent) |
| `src/canvas/tools/productTool.ts` | 44 | `placeProduct(...)` | no change |
| `src/canvas/tools/wallTool.ts` | 69 | `addWall(...)` | no change |
| `src/canvas/tools/doorTool.ts` | 23, 59 | `getState().walls`; `addOpening(...)` | `getActiveRoomDoc().walls`; addOpening unchanged |
| `src/canvas/tools/windowTool.ts` | 23, 58 | `getState().walls`; `addOpening(...)` | same |
| `src/canvas/tools/selectTool.ts` | 45, 107, 116, 131, 139, 159, 164, 178, 180, 186, 213 | `getState().walls` / `.placedProducts`; action calls | read-sites → `getActiveRoomDoc()`; action calls unchanged |

### Inline snapshot construction (need v2 shape or migration)

| File | Lines | Current | Change |
|------|-------|---------|--------|
| `src/components/WelcomeScreen.tsx` | 11-15 | `loadSnapshot({room, walls: {}, placedProducts: {}})` | `loadSnapshot(defaultSnapshot())` — helper that returns v2 with Main Room |
| `src/components/ProjectManager.tsx` | 57-63 (handleNew), 41-47 (handleLoad) | same; `loadSnapshot(project.snapshot)` direct | wrap loaded snapshot in `migrateSnapshot()` |
| `src/hooks/useAutoSave.ts` | 37 | `saveProject(id, name, {room, walls, placedProducts})` | `saveProject(id, name, {version: 2, rooms, activeRoomId})` |
| `src/components/ProjectManager.tsx` | 34 (handleSave) | same inline snapshot | same |

## Undo/Redo Edge Cases

**Current behavior (`cadStore.ts:193-215`):** `undo()` pops last `past` snapshot, pushes current to `future`, replaces `room`/`walls`/`placedProducts` fields. `redo()` is the mirror.

**Edge cases for multi-room:**

1. **Undo after addRoom:** Global snapshot semantics → undo removes the whole room. This is D-06 + the recommended discretion. No special handling needed if history snapshot captures `{rooms, activeRoomId}`.
2. **Undo after removeRoom:** Room comes back with all its walls/products intact, AND `activeRoomId` restores to whatever it was pre-delete. Free because snapshot captures activeRoomId.
3. **Undo after renameRoom:** Name restores. Free.
4. **Undo while in Room B of a Room-A edit:** Undo brings back Room A's state change, but `activeRoomId` was also captured pre-mutation → could snap user back to Room A. **This is correct behavior** — the user will see the undo happen. If disliked later, can split snapshot into dataSnapshot + uiSnapshot — but out of scope.
5. **switchRoom NOT pushing history (D-06):** Correct — prevents history pollution from pure UI actions.
6. **History memory footprint:** Each snapshot now deep-clones all rooms. 50-entry MAX_HISTORY × N rooms × M walls. For Jessica's use case (≤10 rooms, ≤20 walls each), memory is bounded (< 5MB). **Acceptable.**

## Test Patterns (reference for planner)

### Test file touches required

| Test file | Why | Change |
|-----------|-----|--------|
| `tests/cadStore.test.ts` | `reset()` uses old shape (lines 4-12) | Update to v2 shape `{rooms: {room_main: {...}}, activeRoomId: "room_main", past: [], future: []}` |
| `tests/useAutoSave.test.ts` | Same pattern (lines 16-23) | Same |
| `tests/dragDrop.test.ts` | Likely tests placeProduct via cadStore | Verify, update if it setState's |
| `tests/fabricSync.test.ts` | Reads walls/placedProducts | Verify, update if it setState's |

### New test scaffolding needed (Wave 0)

| File | Purpose |
|------|---------|
| `tests/cadStoreRooms.test.ts` | addRoom/renameRoom/removeRoom/switchRoom actions + last-room guard + template wall creation |
| `tests/snapshotMigration.test.ts` | v1→v2 migration: legacy shape wraps into Main Room; v2 passthrough; empty input → default |
| `tests/roomTemplates.test.ts` | Each template produces correct wall count (4 or 0), correct dimensions, perimeter closes |

### Test pattern (established, use this)
```ts
beforeEach(() => {
  useCADStore.setState({
    rooms: {
      room_main: {
        id: "room_main",
        name: "Main Room",
        room: { width: 20, length: 16, wallHeight: 8 },
        walls: {},
        placedProducts: {},
      },
    },
    activeRoomId: "room_main",
    past: [],
    future: [],
  });
});
```

Expose a `resetCADStoreForTests()` helper on the store module to avoid repetition across test files.

## Environment Availability

Skipped — code/config-only refactor, no new external dependencies.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.2 + @testing-library/react ^16 + jsdom ^29.0.1 |
| Config file | `vite.config.ts` (vitest inline config) |
| Quick run command | `npm run test:quick` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ROOM-01 | addRoom creates RoomDoc and returns id | unit | `vitest run tests/cadStoreRooms.test.ts -t "addRoom"` | ❌ Wave 0 |
| ROOM-01 | switchRoom updates activeRoomId without pushing history | unit | `vitest run tests/cadStoreRooms.test.ts -t "switchRoom no history"` | ❌ Wave 0 |
| ROOM-01 | removeRoom refuses to delete last room | unit | `vitest run tests/cadStoreRooms.test.ts -t "removeRoom last-room guard"` | ❌ Wave 0 |
| ROOM-01 | removeRoom switches active if active was deleted | unit | `vitest run tests/cadStoreRooms.test.ts -t "removeRoom reassigns active"` | ❌ Wave 0 |
| ROOM-01 | addWall operates on active room only | unit | `vitest run tests/cadStoreRooms.test.ts -t "addWall targets active room"` | ❌ Wave 0 |
| ROOM-01 | placedProducts isolated across rooms | unit | `vitest run tests/cadStoreRooms.test.ts -t "products isolated"` | ❌ Wave 0 |
| ROOM-01 | v1→v2 migration wraps legacy snapshot into Main Room | unit | `vitest run tests/snapshotMigration.test.ts -t "v1 to v2"` | ❌ Wave 0 |
| ROOM-01 | v2 snapshot passthrough unchanged | unit | `vitest run tests/snapshotMigration.test.ts -t "v2 passthrough"` | ❌ Wave 0 |
| ROOM-01 | existing cadStore tests still pass post-refactor | unit | `vitest run tests/cadStore.test.ts` | ✅ needs update |
| ROOM-01 | useAutoSave tests still pass post-refactor | unit | `vitest run tests/useAutoSave.test.ts` | ✅ needs update |
| ROOM-01 | Global undo captures room additions/deletions | unit | `vitest run tests/cadStoreRooms.test.ts -t "undo addRoom"` | ❌ Wave 0 |
| ROOM-02 | LIVING_ROOM template produces 4 walls at 16×20 | unit | `vitest run tests/roomTemplates.test.ts -t "LIVING_ROOM"` | ❌ Wave 0 |
| ROOM-02 | BEDROOM template produces 4 walls at 12×14 | unit | `vitest run tests/roomTemplates.test.ts -t "BEDROOM"` | ❌ Wave 0 |
| ROOM-02 | KITCHEN template produces 4 walls at 10×12 | unit | `vitest run tests/roomTemplates.test.ts -t "KITCHEN"` | ❌ Wave 0 |
| ROOM-02 | BLANK template produces zero walls | unit | `vitest run tests/roomTemplates.test.ts -t "BLANK"` | ❌ Wave 0 |
| ROOM-02 | addRoom with template pre-populates perimeter walls | unit | `vitest run tests/cadStoreRooms.test.ts -t "addRoom with template"` | ❌ Wave 0 |
| ROOM-01 UI | Ctrl/Cmd+Tab cycles activeRoomId (App.tsx handler) | manual | — | — |
| ROOM-01 UI | Click room tab switches canvas (FabricCanvas re-renders) | manual | — | — |
| ROOM-02 UI | Add Room dialog shows 2×2 template grid | manual | — | — |

### Sampling Rate
- **Per task commit:** `npm run test:quick`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/cadStoreRooms.test.ts` — new test file for room-management actions + isolation + undo (covers ROOM-01)
- [ ] `tests/snapshotMigration.test.ts` — v1→v2 migration helper (covers ROOM-01 migration)
- [ ] `tests/roomTemplates.test.ts` — template wall generation (covers ROOM-02)
- [ ] Update `tests/cadStore.test.ts` reset helper to v2 shape
- [ ] Update `tests/useAutoSave.test.ts` reset helper to v2 shape
- [ ] Expose `resetCADStoreForTests()` in `src/stores/cadStore.ts` to standardize setState resets
- [ ] Framework install: none needed (vitest already configured)

## Sources

### Primary (HIGH confidence — in-repo verified)
- `src/stores/cadStore.ts` (current state shape, actions, snapshot/pushHistory helpers, undo/redo impl)
- `src/types/cad.ts` (CADSnapshot, Room, WallSegment, PlacedProduct types)
- `src/lib/serialization.ts` (SavedProject, saveProject/loadProject/listProjects — no schema enforcement)
- `src/hooks/useAutoSave.ts` (subscribe equality check, getState destructure)
- `src/canvas/FabricCanvas.tsx` (scale/origin derivation, redraw lifecycle, dim editor)
- `src/canvas/fabricSync.ts` (renderWalls, renderProducts)
- `src/three/ThreeViewport.tsx` (Scene subscriber, OrbitControls/PointerLockControls)
- `src/components/Sidebar.tsx`, `RoomSettings.tsx`, `StatusBar.tsx`, `PropertiesPanel.tsx`, `ProjectManager.tsx`, `WelcomeScreen.tsx` (consumer patterns)
- `src/canvas/tools/*.ts` (imperative getState reads)
- `src/stores/productStore.ts` (migration precedent: lines 21-36)
- `tests/cadStore.test.ts`, `tests/useAutoSave.test.ts`, `tests/productStore.test.ts` (test reset patterns)
- Grep across `src/`: 26 `useCADStore` references, 25 snapshot references

### Secondary (MEDIUM)
- `.planning/phases/02-product-library/02-CONTEXT.md` — productStore decoupling precedent
- `.planning/phases/01-2d-canvas-polish/01-CONTEXT.md` — auto-save debounce pattern

### Tertiary (LOW)
None — this research is entirely in-repo, no external dependencies.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps, all existing libs
- Architecture: HIGH — pattern matches existing codebase idioms (productStore migration, Zustand+Immer)
- Consumer inventory: HIGH — grep-verified file-by-file
- Pitfalls: HIGH — identified via code-reading each consumer
- Undo/redo edge cases: HIGH — current impl read in full

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable — internal refactor, no fast-moving external deps)
