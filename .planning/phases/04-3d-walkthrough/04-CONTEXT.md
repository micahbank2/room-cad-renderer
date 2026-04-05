# Phase 4: 3D Walkthrough - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Jessica can switch the 3D viewport from orbit-camera mode to a first-person "walk" mode at eye level (~5.5 ft), move through the room with WASD + arrow keys, look around with the mouse, and switch back to orbit mode with her previous orbit position restored. Scope is strictly VIZ-05 — no multi-room navigation (Phase 5), no gamepad support, no crouch/jump, no collision with products.

</domain>

<decisions>
## Implementation Decisions

*User ran --auto — Claude captured recommended defaults.*

### Camera Mode Toggle (VIZ-05)
- **D-01:** Add a `cameraMode: "orbit" | "walk"` field to `uiStore` (already the home of view interaction state) with actions `setCameraMode` and `toggleCameraMode`. Default is `"orbit"` (current behavior preserved).
- **D-02:** Add a WALK/ORBIT button to `Toolbar.tsx` next to the view tabs (2D_PLAN / 3D_VIEW / LIBRARY / SPLIT). Button label switches between "WALK" (when in orbit) and "ORBIT" (when in walk). Icon: `directions_walk` from Material Symbols. Button only visible when `viewMode === "3d"` or `"split"`.
- **D-03:** Keyboard shortcut `E` (for "Eye-level") toggles cameraMode when in 3D/split view. Mirrors existing single-key shortcuts V/W/D/N from App.tsx keyboard handler.

### Walk Camera Controls (VIZ-05)
- **D-04:** Use drei's `<PointerLockControls>` for mouse look. Click on the 3D viewport to enter pointer-lock mode; Escape exits back to the UI cursor. This is the browser-standard FPS pattern and works with R3F out of the box.
- **D-05:** WASD + arrow keys drive movement. W/Up = forward, S/Down = back, A/Left = strafe left, D/Right = strafe right. Movement speed: 4 ft/sec (walking pace). Shift modifier multiplies speed by 2 (fast walk, 8 ft/sec). Movement direction is relative to the camera's current look direction (horizontal plane only — no vertical movement via keys).
- **D-06:** Eye-level height: **5.5 ft** (typical standing eye height, rounded). Camera position Y is locked to 5.5 regardless of WASD input — no flying, no crouching.
- **D-07:** Collision: walk camera **cannot pass through walls**. Simple AABB check against each wall segment before committing a movement step. No collision with placed products — Jessica can walk through furniture (makes tight spaces navigable). No collision with doors/windows (Jessica can walk through openings naturally).
- **D-08:** Room bounds clamp: camera position is clamped to `0 ≤ x ≤ room.width` and `0 ≤ z ≤ room.length` as a safety net outside wall collision.

### State Preservation (VIZ-05 — success criterion 3)
- **D-09:** When switching INTO walk mode, save the current orbit camera's position and target to refs in `ThreeViewport.tsx`. When switching BACK to orbit mode, restore those values on the next OrbitControls mount. Use `useRef` (not store) since this is transient view state the user expects to reset on page refresh.
- **D-10:** Walk camera starting position on first entry: center of room at eye level, facing toward the longest wall (`{ x: room.width/2, y: 5.5, z: room.length/2 }`, yaw = 0).

### UI Affordances (VIZ-05 — discoverability)
- **D-11:** When user enters walk mode, show a subtle status overlay in the 3D viewport (top-center): `WALK_MODE · WASD to move · Mouse to look · ESC to exit`. Obsidian CAD styling (font-mono, text-text-dim, bg-obsidian-deepest/80 backdrop). Fades out after 4 seconds.
- **D-12:** StatusBar shows `WALK` or `ORBIT` as the current camera mode label (next to or replacing the existing tool status text in 3D view).
- **D-13:** Cursor changes to `pointer` when hovering the 3D viewport in walk mode (indicates click-to-lock); pointer-lock hides it automatically during locked movement.

### Claude's Discretion
- Exact AABB collision tolerance (e.g., 1 ft padding from walls so camera doesn't clip into geometry).
- `PointerLockControls` maxPolarAngle to prevent looking straight up/down past vertical.
- Whether to use `useFrame` for per-frame WASD integration or key-event-based stepping (recommendation: useFrame for smooth motion).
- Overlay fade animation details (CSS transition, opacity).
- Whether to disable OrbitControls entirely in walk mode or just not render the component (recommendation: conditional mount, simpler).
- Toolbar button color/state when walk mode is active — use accent-light when active, text-text-dim when inactive.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` §Phase 4 — Phase 4 goal, VIZ-05, 3 success criteria
- `.planning/REQUIREMENTS.md` §3D Visualization — VIZ-05

### Project Context
- `.planning/PROJECT.md` — "Feel the space" magic moment is this phase's north star

### Prior Phase Context
- `.planning/phases/03-3d-product-rendering/03-CONTEXT.md` — Canvas gl props (tone mapping, preserveDrawingBuffer), shadow config that walk mode inherits
- `.planning/phases/01-2d-canvas-polish/01-CONTEXT.md` — Obsidian CAD token conventions; keyboard shortcut registration pattern

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — R3F store-driven scene, declarative mesh components
- `.planning/codebase/CONVENTIONS.md` — Obsidian CAD tokens, font-mono UI chrome

### Key Source Files
- `src/three/ThreeViewport.tsx` — Canvas + Scene + OrbitControls host; conditional mount target for walk controls
- `src/stores/uiStore.ts` — Add `cameraMode` field + `setCameraMode`/`toggleCameraMode` actions
- `src/components/Toolbar.tsx` — Add WALK/ORBIT toggle button (next to view tabs)
- `src/components/StatusBar.tsx` — Surface current camera mode
- `src/App.tsx` — Keyboard shortcut map (V/W/D/N) — add `E` → toggleCameraMode
- `src/types/cad.ts` — `Room` type (width, length, wallHeight) used for bounds clamp + wall collision
- `src/stores/cadStore.ts` — Read `room` + `walls` for collision
- `src/lib/geometry.ts` — Existing point/line helpers (may need segment-collision helper)
- `src/three/WallMesh.tsx` — Wall segment geometry (reference for collision AABB shape)

### External Reference
- drei `<PointerLockControls>`: https://drei.docs.pmnd.rs/controls/pointer-lock-controls
- R3F `useFrame` for per-frame input integration: https://r3f.docs.pmnd.rs/api/hooks#useframe

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **@react-three/drei v9** — Already installed; exports `PointerLockControls`, `KeyboardControls`. Can use one or both.
- **uiStore** — Has `activeTool`, `selectedIds`, `showGrid` — a natural home for `cameraMode`.
- **Toolbar view tabs pattern** — Existing tab button styling (accent-light active, text-text-dim inactive). Reuse for WALK/ORBIT button.
- **StatusBar** — Already renders tool + coords — slot camera mode there.
- **Keyboard shortcut handler in App.tsx** — Already bypasses inputs/textareas; add `E` to the existing map.
- **Room bounds + walls in cadStore** — All collision data is already store-accessible.

### Established Patterns
- **Conditional R3F components:** `OrbitControls` mounts declaratively — just gate on `cameraMode === "orbit"`.
- **Feet world units:** All geometry stored in feet; 5.5 is literally the eye-level Y value.
- **Store-driven interaction state:** cameraMode belongs in uiStore alongside activeTool/selectedIds.
- **Obsidian token UI chrome:** Overlays use font-mono, obsidian-deepest/80 backdrop, accent for active states.

### Integration Points
- **ThreeViewport.tsx Scene component** — Add `cameraMode` subscription from uiStore; conditionally render `<OrbitControls>` or `<PointerLockControls + WalkCameraController />`. Save/restore orbit camera via refs.
- **NEW: src/three/WalkCameraController.tsx** — R3F component using `useFrame` to read keyboard state and integrate camera position each frame. Handles WASD, Shift modifier, height clamp, room bounds clamp, wall AABB collision.
- **NEW: src/three/walkCollision.ts** — Pure function `canMoveTo(from, to, walls): Point` — returns the target point or slides along the colliding wall. Testable in isolation.
- **Toolbar.tsx** — Add walk toggle button conditional on `viewMode === "3d" || viewMode === "split"`; subscribe to `cameraMode` and `toggleCameraMode` from uiStore.
- **App.tsx keyboard handler** — Add `e: "toggleCameraMode"` branch (skip if viewMode is 2d or library).
- **StatusBar.tsx** — Read `cameraMode` from uiStore; show `WALK_MODE` or `ORBIT_MODE`.
- **NEW: WalkModeOverlay** — Small React component (inline in ThreeViewport or sibling) — renders instruction toast on walk-mode entry, auto-hides.

</code_context>

<specifics>
## Specific Ideas

- **Eye-level height:** 5.5 ft.
- **Walk speed:** 4 ft/sec base, 8 ft/sec with Shift.
- **Keyboard:** WASD + arrow keys (both); `E` toggles mode; Escape exits pointer-lock.
- **Mouse look:** drei `PointerLockControls`.
- **Collision:** walls only, no product collision, no door/window collision.
- **State restoration:** orbit camera position/target saved in ref, restored on mode switch back.
- **Discoverability toast:** `WALK_MODE · WASD to move · Mouse to look · ESC to exit`, 4-second fade.
- **Spawn position:** room center at 5.5 ft, yaw 0.

</specifics>

<deferred>
## Deferred Ideas

- **Gamepad / controller support** — deferred.
- **Crouch / jump / fly** — deferred, no vertical movement.
- **Product collision** — explicitly excluded, Jessica can walk through furniture.
- **Multi-room walk-through with door transitions** — Phase 5.
- **Minimap in walk mode** — deferred.
- **Camera path recording / playback** — deferred.
- **Touch / mobile walk controls** — explicitly out of scope (desktop-only per PROJECT.md).
- **VR / WebXR support** — deferred, v2+.
- **Mouse sensitivity setting** — use drei default for v1.
- **Door-aware collision** (pass through opening in wall) — deferred; v1 ignores openings in walls. Acceptable since Jessica can turn around.
- **Ceiling geometry** — no ceiling exists yet, so no head-bump concerns.

</deferred>

---

*Phase: 04-3d-walkthrough*
*Context gathered: 2026-04-05 (via --auto)*
