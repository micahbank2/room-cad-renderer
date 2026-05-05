---
phase: 59-wall-cutaway-mode-cutaway-01
type: context
created: 2026-05-05
status: ready-for-research
requirements: [CUTAWAY-01]
depends_on: [Phase 47 (RoomGroup + displayMode segmented control + uiStore.displayMode), Phase 46 (hiddenIds visibility cascade pattern), Phase 53 (right-click context menu on walls — wired in 3D + 2D), WallMesh.tsx (existing material refs + transparent-overlay patterns from wallpaper/wallArt)]
---

# Phase 59: Wall Cutaway Mode (CUTAWAY-01) — Context

## Goal

In 3D, when Jessica orbits to a side view, the wall closest to the camera should ghost out of the way so the room interior is visible. Standard CAD pattern. Three modes: `auto` (camera-relative auto-detection), `off` (default — no cutaway), `manual` (per-wall right-click toggle). Session-only state — never persists to snapshots.

Source: REQUIREMENTS.md `CUTAWAY-01` ([#21](https://github.com/micahbank2/room-cad-renderer/issues/21)).

## Pre-existing infrastructure

- **Phase 47** `src/three/RoomGroup.tsx` + `src/stores/uiStore.ts:145` — `displayMode: "normal" | "solo" | "explode"` Toolbar segmented control. Cutaway toolbar button mirrors this pattern.
- **Phase 47** `src/stores/uiStore.ts:72,195,279` — `hiddenIds: Set<string>` per-id visibility. Cutaway uses a separate state field — does NOT mutate `hiddenIds` (manual cutaway-hide is its own concept; tree visibility cascade is Phase 46's job).
- **Phase 53** right-click context menu — already wired on WallMesh in 3D and on wall polygons in 2D Fabric. Need to add one new action for cutaway-manual hide.
- **`src/three/WallMesh.tsx`** — root mesh + multiple child mesh overlays (wallpaper, wainscot, crown, art). Cutaway needs to apply transparency to the entire wall group, not just the base mesh.
- **`src/three/ThreeViewport.tsx:3,378`** — already imports `useFrame` and uses it for camera tweens. Cutaway raycast loop fits naturally here.
- **Phase 5.1 walk mode** — first-person camera mode. Cutaway is irrelevant in walk mode (Jessica is INSIDE the room) — disable cutaway entirely when `cameraMode === "walk"`.

## Decisions

### D-01 — Detection: most-opposed-normal wall

User-facing choice. To find which wall to ghost in auto-mode:

```ts
// Per wall: outward normal × camera look direction
const cameraForward = camera.getWorldDirection(new THREE.Vector3());
const dot = wall.outwardNormal.dot(cameraForward);
// Most-opposed = most-negative dot (wall is facing toward the camera)
// Pick the wall with the most-negative dot product among walls IN FRONT of camera
```

Outward normal computed once per wall from `(end - start)` perpendicular vector + room-center sign convention.

**Why most-opposed-normal:**
- Works on L-shaped, T-shaped, irregular rooms — the geometry-based criterion doesn't break on non-rectangular layouts
- Matches how real CAD tools detect "front wall"
- Cheap to compute (one dot product per wall, ~4-12 walls)

**Trade-off:** if Jessica orbits to a corner where two walls face the camera nearly equally, the algorithm picks one (the one with the slightly more negative dot). Acceptable — the ambiguity is geometric, not algorithmic.

### D-02 — Detection frequency: per-frame via `useFrame`

Auto-mode runs in `useFrame` inside ThreeViewport (the only `<Canvas>` child currently using `useFrame` for camera tweens). On each frame:
1. Compute camera forward direction
2. Compute polar angle (skip if top-down per D-04)
3. Compute dot product per wall in active room (or per room in EXPLODE per D-03)
4. Mark the most-opposed wall as `cutawayWallId` in a ref or Zustand store
5. WallMesh subscribes to that id and toggles its material transparency

Mostly stateless — re-running the same dot products on every frame is ~1µs total for 4-12 walls. No need to optimize via "only on camera-move" yet.

**Why per-frame:** simpler, no edge cases (e.g. camera-move detection misses fast camera tweens during preset transitions). Performance is non-issue at this scale.

### D-03 — Multi-room behavior in EXPLODE: per-room independent

When `displayMode === "explode"`, each room renders separately with an X-axis offset (Phase 47 D-03). Cutaway should run per-room — each room's nearest-wall (relative to the camera) ghosts independently. Visual result: each exploded room shows its interior.

For SOLO mode: cutaway applies to the single visible room.
For NORMAL mode: cutaway applies to active room only (other rooms typically aren't in view, or the user is already focused on one).

**Why per-room in EXPLODE:** the entire point of EXPLODE is to see all rooms at once; per-room cutaway preserves that intent.

### D-04 — Top-down auto-disable: polar angle threshold

User-facing choice. Cutaway disables when camera polar angle from horizon > 70°. Computed as `Math.acos(camera.position.y / camera.position.distanceTo(target))` then check against `70 * π/180`.

Below 70° (angled view): cutaway active.
Above 70° (top-down view): cutaway off, all walls visible.

Smooth transition — no hysteresis or debouncing needed. `useFrame` recomputes each frame; the threshold check is fast.

**Why 70°:** preserves cutaway through standard "3/4 view" angles (~30-60° polar) and isometric (45°). Disables only when looking nearly straight down where walls aren't blocking anyway.

### D-05 — Manual hide: per-wall right-click toggle

User-facing choice. Phase 53's `WallActions` registry gains a new action: **"Hide in 3D"** (lucide `EyeOff`) when wall is visible, **"Show in 3D"** when wall is in cutaway-manual state. Toggles `uiStore.cutawayManualWallIds: Set<string>`.

Multiple walls can be manually hidden simultaneously. Restoring: right-click the same wall (still right-clickable in the tree even when ghosted) → "Show in 3D". Clear-all is implicit: switching cutaway mode to `off` clears manual hides.

**Why right-click toggle:**
- Matches Phase 53 pattern Jessica already knows
- Keeps PropertiesPanel uncluttered
- Ghosted walls remain selectable in the Phase 46 tree (icon dimmed but row functional)

**Why a separate `cutawayManualWallIds` set instead of reusing `hiddenIds`:**
- `hiddenIds` is the global "hide everywhere" state (tree → 2D + 3D)
- Cutaway-manual is "hide ONLY in 3D when cutaway mode is active"
- Different semantics, different state. Reusing would corrupt Phase 46.

### D-06 — Toolbar UI: single cycling button

User-facing choice. New Toolbar icon button (lucide `EyeOff` or `Box`-with-cutout glyph). Click cycles `off → auto → off`. Active state: purple glow (Phase 47 displayMode active style). Tooltip shows current state ("Cutaway: Auto" / "Cutaway: Off"). Compact — doesn't crowd the toolbar.

Manual mode is NOT exposed in the toolbar (per D-05, manual is per-wall via right-click). The toolbar button only toggles auto-mode.

**Why cycling button vs. segmented control:**
- 2-state toggle doesn't justify a multi-segment widget
- Phase 47 segmented control is for 3-state (normal/solo/explode) — different scale
- Saves toolbar space for upcoming Phase 60-62 tools

### D-07 — Ghost style: 0.15 opacity, transparent, depthWrite: false

Locked by REQUIREMENTS.md acceptance:
```ts
material.transparent = true;
material.opacity = 0.15;
material.depthWrite = false;
```

Applied to ALL meshes inside the WallMesh group: base wall, wallpaper overlay, wainscot, crown, art, framed-art mesh. Easiest implementation: WallMesh subscribes to `isCutawayGhosted: boolean` derived state, conditionally applies these material props at the root group level OR per-mesh.

**Why depthWrite: false:** prevents the ghosted wall from blocking visibility of objects behind it (the whole point). Standard transparent-render Three.js pattern.

### D-08 — Walk mode: cutaway disabled

When `cameraMode === "walk"` (Phase 5.1 first-person), cutaway is irrelevant — Jessica is inside the room. Disable cutaway entirely (treat as `off` regardless of stored mode). On exit walk mode, restore previous mode.

Implementation: gate the `useFrame` raycast on `cameraMode !== "walk"` AND `viewMode === "3d" || viewMode === "split"`.

### D-09 — State location: uiStore (session-only)

New uiStore fields:
```ts
cutawayMode: "off" | "auto";  // default "off"
cutawayAutoDetectedWallId: string | null;  // ref-equivalent; written by useFrame, read by WallMesh
cutawayManualWallIds: Set<string>;  // walls hidden via right-click
```

Plus actions: `setCutawayMode(mode)`, `setCutawayAutoDetectedWall(wallId)`, `toggleCutawayManualWall(wallId)`, `clearCutawayManualWalls()`.

**Why uiStore not cadStore:** session-only, doesn't enter undo/redo, doesn't persist to snapshots (REQUIREMENTS acceptance is explicit). Mirrors Phase 47 displayMode location.

**Why NOT localStorage-persist:** unlike displayMode (Phase 47 D-05), cutaway is a per-room-viewing-session preference. Default off on app load is intentional — Jessica should opt into cutaway when she wants to see the interior, not have it always-on.

### D-10 — Test coverage

**Unit (vitest):**
1. `getCutawayWallId(walls, camera)` returns the wall with most-opposed normal; null when no walls
2. `getCutawayWallId` returns null when polar angle > 70°
3. `cutawayManualWallIds.toggle(id)` adds and removes correctly
4. `clearCutawayManualWalls` empties the set

**Component (vitest + RTL):**
5. WallMesh applies `transparent: true, opacity: 0.15, depthWrite: false` when `cutawayAutoDetectedWallId === wall.id`
6. WallMesh applies the same when `cutawayManualWallIds.has(wall.id)`
7. WallMesh renders normally when neither flag matches

**E2E (Playwright):**
8. Toolbar Cutaway button cycles off → auto → off; active state has accent border
9. In 3D auto-mode, orbiting around the room ghosts the wall closest to the camera (visual via canvas snapshot OR DOM-introspection driver)
10. Right-click wall in 3D → "Hide in 3D" → wall ghosts (driver assertion)
11. Top-down camera angle → no walls ghosted (auto-disable)
12. Walk mode → cutaway disabled regardless of stored mode

### D-11 — Atomic commits per task

Mirror Phase 49–58 pattern.

### D-12 — Zero regressions

- Phase 32 PBR materials (walls render with embedded materials when cutaway off)
- Phase 36 wallpaper / wallArt — ghost cleanly with the wall
- Phase 49–50 user-uploaded textures — same direct-`map` pattern preserved
- Phase 47 SOLO/EXPLODE displayMode — cutaway composes (D-03)
- Phase 46 hiddenIds — independent state (D-05)
- Phase 53 right-click menus — extended with one new action, existing 6 unchanged
- Phase 54 click-to-select — ghosted walls still clickable
- Phase 5.1 walk mode — cutaway disabled (D-08)
- Phase 48 saved cameras — work unchanged (cutaway is render-state, not camera state)

## Out of scope (this phase — confirmed v1.15 locks)

- Cutaway in 2D view (irrelevant — top-down is already cutaway by definition)
- Per-wall opacity slider (single 0.15 value works for v1.15)
- Animated ghost transitions (instant on/off — no fade)
- Cutaway through ceiling (always opaque)
- Cutaway through floor (always opaque)
- Multi-wall auto-cutaway (only ONE wall ghosts at a time in auto-mode; manual can hide multiple)
- Transparency-fade by camera distance (binary visible/ghosted only)
- Camera-position memory ("when I orbited last time, this was the cutaway wall") — fresh recompute every session

## Files we expect to touch

- `src/stores/uiStore.ts` — add `cutawayMode`, `cutawayAutoDetectedWallId`, `cutawayManualWallIds` + 4 actions
- `src/three/cutawayDetection.ts` — NEW (~50 lines): `getCutawayWallId(walls, camera)` + polar-angle helper
- `src/three/ThreeViewport.tsx` — `useFrame` block that calls `getCutawayWallId` and writes to uiStore
- `src/three/WallMesh.tsx` — subscribe to cutaway state, apply transparent/opacity/depthWrite when ghosted
- `src/components/Toolbar.tsx` — new Cutaway button (mirror Phase 47 displayMode active-state styling)
- `src/canvas/CanvasContextMenu.tsx` (or wherever wall-actions live) — add "Hide in 3D" / "Show in 3D" action
- `src/lib/cutawayActions.ts` — NEW (~30 lines): action builder + label-flip logic for context menu
- `tests/three/cutawayDetection.test.ts` — NEW (4 unit tests)
- `tests/components/WallMesh.cutaway.test.tsx` — NEW (3 component tests)
- `tests/stores/uiStore.cutaway.test.ts` — NEW (cutaway state actions)
- `e2e/wall-cutaway.spec.ts` — NEW (5 e2e scenarios)
- `src/test-utils/cutawayDrivers.ts` — NEW: `__getCutawayWallId`, `__driveSetCutawayMode`, `__getMaterialOpacity`

Estimated 1 plan, ~5 tasks, ~12 files. Mid-size phase.

## Open questions for research phase

1. **Outward normal computation:** existing `WallSegment` has `start` and `end` points. The outward normal needs a sign convention — is the room's centroid the right reference point for "which side is outside"? For convex rooms it's straightforward; for concave (L-shaped) the centroid may sit outside the room. Confirm via existing `wallCorners()` helper in `src/lib/geometry.ts` or propose alternative.

2. **`useFrame` performance under load:** with 6 rooms × 8 walls = 48 walls in EXPLODE mode, per-frame dot products are still cheap (~50µs). Confirm no allocations inside the loop (reuse `THREE.Vector3` objects). Phase 35 reduced-motion `useFrame` is the precedent — check its allocation discipline.

3. **WallMesh material refs vs. props:** WallMesh currently uses `matRefA`, `matRefB` for wallpaper materials (Phase 49 BUG-02 pattern). Cutaway needs to set transparent/opacity/depthWrite on the BASE wall material — recommend a new `matRefBase` ref + an effect that writes the props when cutaway state changes. Or use prop-driven `<meshStandardMaterial transparent={isGhosted}>` and let R3F reconcile. Pick the simpler one.

4. **Material.needsUpdate gotcha:** Phase 49 BUG-02 was caused by toggling material props post-mount without `needsUpdate`. Cutaway will toggle `transparent: true` ↔ `false` repeatedly. Confirm the prop-driven pattern doesn't trigger the same bug; if needed, use a constant `transparent: true` and only animate `opacity` (1 → 0.15) which doesn't require shader recompile.

5. **Phase 53 wall context-menu integration:** confirm the action registry's exact shape (`getActionsForKind('wall', wallId)` or similar), location (`src/lib/clipboardActions.ts` was extracted in v1.13), and how to inject the cutaway action without breaking Phase 53 tests. The right-click menu also needs to reflect current state — "Hide in 3D" vs. "Show in 3D" label flip per wall.

6. **Polar angle reference:** is "polar angle from horizon" measured against the world Y-axis (up) or against the OrbitControls target? Standard is world-up; OrbitControls' `azimuthalAngle` and `polarAngle` are exposed but their conventions differ from "elevation angle from horizon". Research should clarify and confirm 70° = `polarAngle < 0.35 rad` (i.e. close to looking straight down).
