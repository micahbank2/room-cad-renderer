---
phase: 47-room-display-modes-display-01
type: context
created: 2026-04-26
status: ready-for-research
requirements: [DISPLAY-01]
depends_on: [Phase 46 (rooms tree provides activeRoomId semantic), Phase 35 (no-tween policy reference)]
---

# Phase 47: Room Display Modes (DISPLAY-01) — Context

## Goal

Toolbar gains a NORMAL / SOLO / EXPLODE display-mode selector. Lets the user inspect a single room in isolation (SOLO) or see all rooms separated along an axis (EXPLODE) without losing the all-rooms NORMAL view.

## Requirement Source

[REQUIREMENTS.md DISPLAY-01](../../REQUIREMENTS.md) — full acceptance criteria. Source issue: [#80](https://github.com/micahbank2/room-cad-renderer/issues/80).

## Decisions

### D-01 — UI surface: Toolbar segmented control

Three buttons grouped together (NORMAL / SOLO / EXPLODE) in the Toolbar, visible only when `viewMode === "3d" || viewMode === "split"`. Mirrors the visibility gate of Walk/Orbit (`cameraMode`) — matching precedent set in `src/components/Toolbar.tsx`.

**Why:** Walk/Orbit is the closest semantic sibling ("how am I seeing this scene") and already lives in the Toolbar. Avoids inventing a new UI pattern for this mode-pick.

**Rejected alternatives:**
- Sidebar / RoomsTreePanel header — hidden when sidebar collapsed; awkward in 2D-only.
- Canvas overlay — no existing precedent; introduces a new chrome pattern.

### D-02 — uiStore field shape mirrors cameraMode

```ts
displayMode: "normal" | "solo" | "explode";
setDisplayMode: (mode: "normal" | "solo" | "explode") => void;
```

Default value: `"normal"`. View-state only — same constraints as Phase 46's hiddenIds and Phase 35's pendingPresetRequest:
- No cadStore mutations
- No undo entries
- No autosave triggers
- No history pollution

### D-03 — EXPLODE layout: X-axis only, 25% padding

Each room positioned at `(maxRoomDim × 1.25 × index, 0, 0)` along the X-axis, where `maxRoomDim = Math.max(room.width, room.length)` for that specific room. Rooms stacked in `Object.keys(rooms)` insertion order.

**Why X-axis only:**
- Z-axis offset would conflict with the 3D camera-orbit center which expects rooms near the origin
- Y-axis offset would float rooms in mid-air, breaking the floor-plane reference
- X-axis spread reads as "exploded layout" the same way Pascal's reference does

**Why 25% padding:**
- Tight (0%) makes rooms look adjacent / connected rather than separated
- Full padding (100%) makes the scene too sparse to scan
- 25% is enough whitespace to read each room as a separate volume without scrolling/zooming far

### D-04 — SOLO composes with Phase 46 hiddenIds

SOLO filters at the room level: only `activeRoomId`'s meshes render. Within that room, Phase 46's `hiddenIds` continues to apply (a wall hidden via the eye icon stays hidden in SOLO too). The two filters stack — SOLO doesn't reset `hiddenIds`, and `hiddenIds` doesn't override SOLO.

**Why composition:**
- SOLO answers "which rooms render" — a coarse axis
- hiddenIds answers "what inside a room renders" — a fine axis
- Treating them as orthogonal preserves both Phase 46 and Phase 47 contracts cleanly
- Reset-on-mode-change would surprise the user (they already hid a wall for a reason)

### D-05 — Persist displayMode to localStorage

Storage key: `gsd:displayMode`. Hydrated on app mount. On unparseable / missing → `"normal"` (default).

**Why persist:**
- Walk/Orbit is in the same UX neighborhood and is session-persistent (via project save)
- Matches user intuition ("I left it in SOLO; I expect SOLO when I come back")
- Cheap — single localStorage write on `setDisplayMode`

### D-06 — Empty / null activeRoomId in SOLO: render empty scene

If SOLO is active and `activeRoomId` is null or doesn't exist in `rooms`, the 3D scene renders empty (no rooms, no fallback). The toolbar buttons remain interactive — user can switch to NORMAL to see all rooms again.

**Why no fallback:**
- The "no active room" state should be brief (immediately after deleting the last room before Welcome screen takes over)
- Auto-falling-back to NORMAL would surprise the user (they explicitly chose SOLO)
- Auto-picking the first room in the dict is a guessing game; just show empty and let the user decide

### D-07 — Switching modes is INSTANT (no tween)

Per REQUIREMENTS: "Switching modes is instant — no tween. This is a structural mode change, not a transition." This is a HARD constraint, not a UI polish choice. Reduced-motion behavior (D-39) is moot — there's no animation to gate.

**Why no tween:**
- EXPLODE involves moving every wall/product across the scene; tweening 100+ meshes simultaneously would be janky
- The mode switch is a category change ("show me a different layout"), not a continuous transition
- Phase 35's tween policy explicitly limits tweening to camera moves, not scene-graph repositioning

### D-08 — EXPLODE camera positioning: no auto-frame

When user enters EXPLODE, the camera does NOT auto-zoom-out to frame all rooms. They use existing camera controls (orbit / zoom) to find a vantage point.

**Why no auto-frame:**
- Phase 35 camera presets exist — user can hit `1` (eye-level) or `3` (3-quarter) to reframe
- Auto-zooming would fight the user's existing camera state
- Adds complexity (compute world-space bbox of all rooms post-offset) for marginal value

### D-09 — UI labels and icons (lucide)

Three Toolbar buttons. Icons from lucide-react (per Phase 33 D-33 icon policy):

| Mode    | Label   | Icon (lucide)    | Tooltip                              |
|---------|---------|------------------|--------------------------------------|
| normal  | NORMAL  | `LayoutGrid`     | All rooms render together            |
| solo    | SOLO    | `Square`         | Only the active room renders         |
| explode | EXPLODE | `Move3d`         | Rooms separated along X-axis         |

Active button styling matches the existing Toolbar active-button pattern (`bg-accent/10` + `text-accent` + `border-accent/30`).

## Out of scope (do NOT do in Phase 47)

- Per-room saved camera angles (CAM-04 / Phase 48)
- EXPLODE layout customization (axis pick, spacing slider) — single canonical layout only
- EXPLODE animation between modes — D-07 locks it as instant
- SOLO room picker (separate from `activeRoomId`) — SOLO inherits the tree's active room
- displayMode persistence per-project (it's a global UI preference, like `cameraMode`)

## Files we expect to touch (estimate)

- `src/stores/uiStore.ts` — add `displayMode` + `setDisplayMode` + localStorage hydration
- `src/three/ThreeViewport.tsx` — gate `Object.values(rooms).map` on displayMode; apply X-offset for EXPLODE; filter to `activeRoomId` for SOLO
- `src/components/Toolbar.tsx` — three new buttons (NORMAL / SOLO / EXPLODE) gated on viewMode === "3d" || "split"
- New tests:
  - `src/stores/__tests__/uiStore.displayMode.test.ts` — field default, setter, localStorage round-trip
  - `src/three/__tests__/ThreeViewport.displayMode.test.tsx` — render-iteration filter for SOLO + offset for EXPLODE
  - `src/components/__tests__/Toolbar.displayMode.test.tsx` — 3 buttons render, click drives setDisplayMode, gated on viewMode
- `e2e/display-mode-cycle.spec.ts` — switch through all 3 modes via toolbar, verify scene-graph changes (snapshot or driver assertion)

Estimated 1 plan, 3-4 tasks. Smaller than Phase 46.

## Open questions for research phase

None — all decisions locked above. Researcher should confirm:
1. lucide `Move3d` icon exists in current version (fallback: `MoveHorizontal` or `Box`)
2. `Object.keys(rooms)` insertion order is stable across the relevant codepaths (Zustand + immer should preserve, but verify)
3. No hidden coupling between `cameraMode` storage and a future `displayMode` storage (key namespace check)
