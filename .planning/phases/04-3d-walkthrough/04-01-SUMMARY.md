---
phase: 04-3d-walkthrough
plan: 01
subsystem: 3d-walkthrough
tags: [walk-mode, collision, state, tests]
requires: [04-00]
provides: [cameraMode-state, walkCollision-module]
affects: [src/stores/uiStore.ts, src/three/walkCollision.ts]
tech-stack:
  added: []
  patterns: [pure-function-collision, zustand-mode-toggle, axis-slide-fallback]
key-files:
  created:
    - src/three/walkCollision.ts
  modified:
    - src/stores/uiStore.ts
    - tests/uiStore.test.ts
    - tests/walkCollision.test.ts
decisions:
  - "cameraMode lives on uiStore alongside activeTool/selectedIds/showGrid (D-01)"
  - "canMoveTo is pure (no THREE dep) — testable in isolation, called by useFrame in Wave 2"
  - "Wall collision = padded AABB per segment (padding + thickness/2 inflate) (D-07)"
  - "Axis-slide fallback: full move -> x-only slide -> z-only slide -> stay put"
  - "Room bounds clamp applied to final result (D-08)"
  - "Openings ignored in v1 (D-07) — no door-aware passthrough, deferred"
metrics:
  duration: 2m
  tasks: 2
  files: 4
  completed: 2026-04-05
---

# Phase 04 Plan 01: Walk-mode state + collision primitive Summary

cameraMode ('orbit' | 'walk') state on uiStore + pure canMoveTo collision function (walls as padded AABBs, room-bounds clamp, axis-slide fallback).

## What Was Built

### cameraMode state (uiStore)
Added `cameraMode: "orbit" | "walk"` to UIState with two actions: `setCameraMode(mode)` and `toggleCameraMode()`. Default is `"orbit"` — preserves existing behavior. No changes to any consumers; Wave 2 will subscribe from Toolbar/StatusBar/ThreeViewport.

### walkCollision.ts (pure module)
New file at `src/three/walkCollision.ts` exporting:
- `WALL_PADDING = 1` (feet)
- `Point2 { x, z }` interface
- `canMoveTo(from, to, walls, room, padding?)` → `Point2`

**Collision model:** Each wall segment is treated as an AABB inflated by `padding + thickness/2`. The function tries the clamped target, then an x-only slide, then a z-only slide, then stays put. Every candidate is clamped to room bounds so the camera can never leave the floor.

**Mapping note:** `WallSegment.start.y` / `end.y` are interpreted as z-coordinates since the 2D canvas uses Point{x,y} but Three.js uses {x,z}.

### Test coverage
- `tests/uiStore.test.ts`: 5 tests (default, set walk, set orbit, toggle x2 directions)
- `tests/walkCollision.test.ts`: 12 tests (no-walls pass-through, wall AABB block, diagonal slide, bound clamping for x/z, custom padding override, WALL_PADDING constant, openings-ignored, room-bounds pure clamp)

Total: 17 new passing tests, 0 remaining `it.todo` stubs in these files. Full suite: 97 passed | 3 todo (unrelated Wave 0 stubs in other phases).

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria satisfied on first run.

## Verification

- `npm test -- --run tests/uiStore.test.ts` → 5 passed
- `npm test -- --run tests/walkCollision.test.ts` → 12 passed
- `npm test -- --run` → 97 passed | 3 todo (no regressions)
- `npm run build` → exits 0, no type errors
- `grep -c "cameraMode" src/stores/uiStore.ts` → 6
- `grep -c "import.*three" src/three/walkCollision.ts` → 0 (pure)
- `grep -c "it.todo" tests/walkCollision.test.ts tests/uiStore.test.ts` → 0

## Self-Check: PASSED

Files verified:
- FOUND: src/three/walkCollision.ts
- FOUND: src/stores/uiStore.ts
- FOUND: tests/uiStore.test.ts
- FOUND: tests/walkCollision.test.ts

Commits verified:
- FOUND: fbbc9f7 (feat(04-01): add cameraMode state to uiStore)
- FOUND: b5cbe06 (feat(04-01): add canMoveTo walk-mode collision helper)
