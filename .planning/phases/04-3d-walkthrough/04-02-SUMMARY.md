---
phase: 04-3d-walkthrough
plan: 02
subsystem: three-viewport
tags: [walk-mode, camera, pointer-lock, r3f, collision]
requires:
  - src/three/walkCollision.ts
  - src/stores/uiStore.ts (cameraMode)
provides:
  - WalkCameraController (R3F component)
  - Walk/Orbit toggle UI (toolbar + shortcut + statusbar)
  - WalkModeOverlay toast
affects:
  - src/three/ThreeViewport.tsx
  - src/components/Toolbar.tsx
  - src/components/StatusBar.tsx
  - src/App.tsx
tech-stack:
  added: []
  patterns:
    - "Conditional R3F control mount (OrbitControls ↔ PointerLockControls)"
    - "Per-frame useFrame integration for WASD + Shift run"
    - "Transient view-state preservation via useRef (not store)"
key-files:
  created:
    - src/three/WalkCameraController.tsx
  modified:
    - src/three/ThreeViewport.tsx
    - src/components/Toolbar.tsx
    - src/components/StatusBar.tsx
    - src/App.tsx
decisions:
  - "EYE_HEIGHT=5.5, WALK_SPEED=4, RUN_MULTIPLIER=2 as module-level exported constants"
  - "Camera direction derived per-frame via camera.getWorldDirection (reads PointerLock yaw)"
  - "Orbit pos/target stored in useRef in Scene; onChange updates refs live so switch-back restores framing"
  - "Toast uses opacity-animated absolute div over Canvas, 4s setTimeout"
metrics:
  duration: 5m
  completed: 2026-04-05
---

# Phase 04 Plan 02: Walk Mode Wiring Summary

Wire first-person walk mode into the 3D viewport: R3F WalkCameraController drives WASD+PointerLock movement with wall collision via canMoveTo, conditionally mounted alongside drei's PointerLockControls; orbit state preserved via refs for seamless mode toggling.

## What Was Built

**src/three/WalkCameraController.tsx (new)** — R3F component that:
- Spawns camera at room center at 5.5ft eye level on first mount (D-10)
- Listens to window keydown/keyup for W/A/S/D + arrows + Shift
- Per-frame via `useFrame`: reads camera yaw via `getWorldDirection`, composes forward+strafe vectors, runs `canMoveTo` on the proposed step, clamps Y to EYE_HEIGHT (D-06)
- Exports `EYE_HEIGHT`, `WALK_SPEED`, `RUN_MULTIPLIER` constants

**src/three/ThreeViewport.tsx (modified)** — Scene now conditionally renders `<OrbitControls>` OR `<PointerLockControls + WalkCameraController>`. Orbit position/target held in `useRef` and updated by `onChange` handler so switching back to orbit restores the prior framing (D-09). Outer component tracks `cameraMode` to render a 4-second fading toast overlay on walk entry (D-11).

**src/components/Toolbar.tsx (modified)** — Inserts a WALK/ORBIT button between the view tabs and spacer, visible only when viewMode is `3d` or `split`. Active state uses accent-light + bottom border (D-02).

**src/components/StatusBar.tsx (modified)** — Adds `CAM: WALK_MODE|ORBIT_MODE` label alongside SCALE (D-12).

**src/App.tsx (modified)** — Keyboard handler now routes `e` to `toggleCameraMode` when viewMode is 3d/split (D-03).

## Verification

- `npm run build` — exit 0, 628 modules transformed
- `npm test -- --run` — 97 passed / 3 todo / 0 failed (no Wave 1 regressions)

## Requirements Completed

- **VIZ-05** — 3D walk-through at eye level. Toggle button ✓, WASD/arrows/shift ✓, wall collision ✓, orbit state preserved ✓.

Covers decisions D-02 through D-13 from 04-CONTEXT.md.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

All artifact files exist:
- FOUND: src/three/WalkCameraController.tsx
- FOUND: src/three/ThreeViewport.tsx (modified)
- FOUND: src/components/Toolbar.tsx (modified)
- FOUND: src/components/StatusBar.tsx (modified)
- FOUND: src/App.tsx (modified)

Commits verified:
- FOUND: 279d3ff (WalkCameraController + ThreeViewport)
- FOUND: 57d7542 (Toolbar/StatusBar/App wiring)
