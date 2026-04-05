# Phase 5: Multi-Room - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

One project can hold multiple rooms. Jessica can add rooms (ROOM-01), switch between them in the same canvas view, each room keeps its own walls + placed products in isolation, and she can start a new room from a preset template instead of drawing from scratch (ROOM-02). Scope is strictly ROOM-01 and ROOM-02 — no doorways connecting rooms, no whole-house floor-plan overlay, no cross-room product transfer, no 3D multi-room visualization.

</domain>

<decisions>
## Implementation Decisions

*User ran --auto — Claude's recommended defaults.*

### Data Model Restructure (ROOM-01)
- **D-01:** Restructure `cadStore` state to hold a rooms collection:
  ```ts
  rooms: Record<string, RoomDoc>        // keyed by room id
  activeRoomId: string | null
  ```
  Where `RoomDoc` is:
  ```ts
  interface RoomDoc {
    id: string              // "room_<uid>"
    name: string            // "Living Room", "Bedroom 1", etc.
    room: Room              // width/length/wallHeight
    walls: Record<string, WallSegment>
    placedProducts: Record<string, PlacedProduct>
  }
  ```
  Legacy top-level `room`/`walls`/`placedProducts` fields are removed.
- **D-02:** `CADSnapshot` becomes:
  ```ts
  interface CADSnapshot {
    rooms: Record<string, RoomDoc>
    activeRoomId: string | null
  }
  ```
  Undo/redo continues to capture full snapshots at the store level (global history, not per-room). Acceptable trade-off: one undo/redo chain across all rooms keeps the mental model simple.
- **D-03:** All existing store actions (`addWall`, `updateWall`, `removeWall`, `placeProduct`, `moveProduct`, `rotateProduct`, `removeProduct`, `setRoom`, `resizeWallByLabel`, `addOpening`) operate on the **active room**. Each action reads `s.rooms[s.activeRoomId]` and mutates its `walls` / `placedProducts` / `room` — keeps call sites unchanged.
- **D-04:** Add selectors/accessors so consumers read from the active room:
  - `useCADStore((s) => s.rooms[s.activeRoomId!]?.walls ?? {})`
  - Same for `placedProducts`, `room`
  Provide 3 convenience hooks to avoid spreading the selector everywhere: `useActiveWalls()`, `useActivePlacedProducts()`, `useActiveRoom()`.
- **D-05:** Migration: on load, if legacy single-room snapshot (no `rooms` field, has `room`/`walls`/`placedProducts` at root), wrap it in a single `RoomDoc` named "Main Room" with `id = "room_main"` and set `activeRoomId = "room_main"`. Applies to `loadSnapshot` and `useAutoSave` deserialization paths.

### Multi-Room Actions (ROOM-01)
- **D-06:** New cadStore actions:
  - `addRoom(name: string, template?: RoomTemplateId): string` — creates a RoomDoc, pushes history, returns new room id. If template provided, pre-populates walls from template.
  - `renameRoom(id: string, name: string): void`
  - `removeRoom(id: string): void` — cannot remove the last room; if removed room is active, switches active to another.
  - `switchRoom(id: string): void` — sets `activeRoomId`. Does NOT push history (transient UI state).
- **D-07:** When only one room exists at project creation, its name defaults to **"Main Room"**. When a second room is added, Jessica picks the name in the Add Room dialog (required field).

### Room Switching UI (ROOM-01 — success criterion 1)
- **D-08:** Add a horizontal **ROOM_TABS** bar directly above the canvas area, spanning the width of the canvas column. Each tab shows the room name (uppercase snake like `LIVING_ROOM`), active room has accent-light underline, `+` button on the right opens Add Room dialog. Close (×) button on hover (disabled if only one room).
- **D-09:** Visible on 2D, 3D, and split views. NOT shown on LIBRARY view.
- **D-10:** Keyboard shortcut: `Ctrl/Cmd + Tab` cycles rooms forward (no modifier-conflict with OS). Don't add single-key shortcuts for room switching — avoid clashes with V/W/D/N/E.

### Room Templates (ROOM-02)
- **D-11:** Three built-in templates in `src/data/roomTemplates.ts`:
  - **LIVING_ROOM**: 16 ft × 20 ft rectangle, wall height 9 ft
  - **BEDROOM**: 12 ft × 14 ft rectangle, wall height 8 ft
  - **KITCHEN**: 10 ft × 12 ft rectangle, wall height 8 ft
  Plus **BLANK** (no template): defaults to 16×20×8 empty room, no walls.
- **D-12:** Template produces a `Partial<RoomDoc>` with 4 pre-drawn perimeter walls forming the rectangle (thickness 0.5 ft, openings: []). Wall positions in feet coordinates with origin at (0,0).
- **D-13:** Templates DO NOT pre-populate doors, windows, or placed products. Jessica adds those herself — reduces template opinion and keeps the spec simple.
- **D-14:** Template picker UI lives inside the **Add Room dialog**. Dialog has: Name input (required), 2×2 template grid with template names + rough dimensions label (e.g., "LIVING_ROOM · 16 × 20 ft"), Create button. Obsidian CAD styling.

### Project Serialization (ROOM-01 — cross-cutting)
- **D-15:** `CADSnapshot` schema version bump. Serialization stores `{ version: 2, rooms, activeRoomId }`. On load, version-1 snapshots are migrated to version 2 in-memory (per D-05).
- **D-16:** Existing projects in IndexedDB continue to load (backwards compatible via migration). No destructive data changes.
- **D-17:** Auto-save debounce behavior unchanged — debounced save triggers on any change to any room.

### Product Isolation (ROOM-01 — success criterion 3)
- **D-18:** `placedProducts` lives **inside** each RoomDoc. Products placed in Room A never appear in Room B's canvas or 3D view. The global product *library* is still shared (unchanged from Phase 2).
- **D-19:** When deleting a room, its placed products are deleted too (no prompt to migrate).

### Claude's Discretion
- Exact wall coordinates for each template (planner decides — just needs to form a rectangle of stated size).
- Whether ROOM_TABS uses a horizontal scroll when many rooms exist, or wraps.
- Colors for active vs inactive room tabs — use existing Obsidian CAD token conventions (accent-light active, text-text-dim inactive).
- Add Room dialog's exact layout — modal overlay in the Obsidian CAD style consistent with AddProductModal.
- Whether deleting a room requires confirmation (recommendation: yes, simple confirm dialog — irreversible destructive action).
- Whether undo after `addRoom` removes the whole room or just the last wall edit (recommendation: global undo removes the whole room, consistent with snapshot-based history).
- How the Welcome Screen integrates — whether "Start Blank Room" button also offers template picker (recommendation: keep WelcomeScreen simple, add rooms via canvas tab bar).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` §Phase 5 — Phase 5 goal, ROOM-01/ROOM-02, 3 success criteria
- `.planning/REQUIREMENTS.md` §Rooms — ROOM-01, ROOM-02

### Project Context
- `.planning/PROJECT.md` — Multi-room active requirement, "one project can contain multiple rooms"

### Prior Phase Context
- `.planning/phases/02-product-library/02-CONTEXT.md` — productStore pattern (decoupled global state)
- `.planning/phases/01-2d-canvas-polish/01-CONTEXT.md` — auto-save debounce pattern, Obsidian CAD tokens

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — Store-driven rendering; this phase changes the shape of that store
- `.planning/codebase/CONVENTIONS.md` — Obsidian CAD tokens, UPPERCASE_SNAKE UI labels

### Key Source Files
- `src/types/cad.ts` — Add `RoomDoc` interface; update `CADSnapshot` to version 2
- `src/stores/cadStore.ts` — Major restructure; add `rooms`/`activeRoomId` fields + room-management actions
- `src/lib/serialization.ts` — Snapshot version field + v1→v2 migration
- `src/hooks/useAutoSave.ts` — Update to read/write new snapshot shape
- `src/canvas/FabricCanvas.tsx` — Update all `useCADStore` reads to use active-room selectors
- `src/canvas/fabricSync.ts` — Same selector updates
- `src/canvas/tools/*.ts` — Tool handlers mutate active room via existing actions (no change expected if D-03 is implemented transparently)
- `src/three/ThreeViewport.tsx` — Update Scene component to read active room
- `src/components/Sidebar.tsx` — Read active room for SYSTEM_STATS (AREA, WALLS, PRODUCTS)
- `src/components/RoomSettings.tsx` — Operates on active room
- `src/components/StatusBar.tsx` — Can optionally surface active room name
- `src/components/PropertiesPanel.tsx` — Reads active room's placed products
- `src/components/ProjectManager.tsx` — Load/save flow respects new snapshot shape
- NEW: `src/components/RoomTabs.tsx` — Horizontal tab bar
- NEW: `src/components/AddRoomDialog.tsx` — Name + template picker modal
- NEW: `src/data/roomTemplates.ts` — LIVING_ROOM, BEDROOM, KITCHEN, BLANK template definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Zustand + Immer store pattern** — cadStore restructure follows existing idiom.
- **Existing CADSnapshot round-trip** — `snapshot()` and history push already exist; just need to capture new shape.
- **AddProductModal** — Reference design for the Add Room dialog (obsidian-mid, backdrop-blur, form layout).
- **uid() helper** — For new room IDs (`room_<uid>`).
- **RoomSettings.tsx** — Already edits the active room's dimensions, will need to read active room via selector.
- **Toolbar view-tab pattern** — Reference for ROOM_TABS styling (accent-light active border).

### Established Patterns
- **Store-driven rendering:** All consumers read from cadStore; changing the store shape touches many read-sites but each change is a 1-line selector swap.
- **Snapshot-based undo:** Global history captures entire state — adding rooms to state means history captures room additions naturally.
- **Feet coords:** Walls stored in feet; templates define walls as feet coordinates.
- **Obsidian tokens:** Use font-mono, accent-light (active), text-text-dim (inactive), obsidian-low (tab bar bg).

### Integration Points
- **cadStore.ts** — Convert `room`/`walls`/`placedProducts` to indirection through active room. Add new actions `addRoom`, `switchRoom`, `renameRoom`, `removeRoom`. Default state: one room "Main Room" with id `room_main`, activeRoomId = `room_main`.
- **Selectors** — Provide `useActiveRoom()`, `useActiveWalls()`, `useActivePlacedProducts()` hooks in cadStore or a new `selectors.ts`.
- **Serialization** — Bump snapshot version, write migration in load path.
- **FabricCanvas / ThreeViewport** — Update subscriptions to use active-room selectors.
- **RoomTabs + AddRoomDialog** — New components rendered at top of canvas container (between Toolbar and canvas).
- **App.tsx** — Ctrl/Cmd+Tab handler for room cycling (respect `e.target instanceof HTMLInputElement` guard).

</code_context>

<specifics>
## Specific Ideas

- **Default first-room name:** `"Main Room"` (id `room_main`).
- **Room ID format:** `room_<uid()>`.
- **Templates:**
  - LIVING_ROOM: 16×20 ft, wallHeight 9 ft
  - BEDROOM: 12×14 ft, wallHeight 8 ft
  - KITCHEN: 10×12 ft, wallHeight 8 ft
  - BLANK: 16×20 ft, wallHeight 8 ft, no walls
- **Keyboard:** Ctrl/Cmd+Tab cycles rooms.
- **Confirmation:** Deleting a room prompts confirm.
- **Snapshot version:** 2 (existing = 1).
- **UI label case:** ROOM_TABS, MAIN_ROOM, LIVING_ROOM, BEDROOM, KITCHEN, + ADD_ROOM.

</specifics>

<deferred>
## Deferred Ideas

- **Connected whole-house floor plan** (rooms linking via doorways) — explicitly v2 per PROJECT.md.
- **Moving products between rooms** — deferred.
- **Duplicating a room** ("save as template" / "copy Living Room") — deferred.
- **User-defined custom templates** — deferred, built-in only in v1.
- **Pre-populated furniture in templates** (e.g., bed in BEDROOM) — explicitly out per D-13.
- **Doors/windows in templates** — deferred.
- **Per-room undo history** — explicitly global history per D-02.
- **Room ordering / drag-to-reorder tabs** — deferred.
- **Hide/show rooms toggle** — deferred.
- **Seeing all rooms simultaneously in a house floorplan view** — deferred (v2).
- **Room-specific lighting / 3D environment presets** — deferred.
- **Template marketplace / sharing** — out of scope.

</deferred>

---

*Phase: 05-multi-room*
*Context gathered: 2026-04-05 (via --auto)*
