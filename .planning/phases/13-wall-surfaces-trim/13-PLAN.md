---
phase: 13-wall-surfaces-trim
plan: 01
subsystem: wall-surfaces
tags: [surface-01, surface-02, surface-03, surface-04, trim-01, trim-02, trim-03]
requires: [WallSegment type, WallMesh, PropertiesPanel]
provides: [wallpaper, wall art, wainscoting, crown molding]
affects:
  - src/types/cad.ts
  - src/stores/cadStore.ts
  - src/three/WallMesh.tsx
  - src/components/WallSurfacePanel.tsx (new)
  - src/components/PropertiesPanel.tsx
decisions:
  - "All wall surfaces (wallpaper, wainscoting, crown, art) stored per-wall on WallSegment. Matches real construction."
  - "Wallpaper is either solid color or pattern image (data URL). Pattern repeats are controlled via scaleFt."
  - "Wainscoting + crown molding render as PLANE meshes offset slightly from the wall's interior face (no 3D profile — just colored bands). Can add profile geometry in v1.3."
  - "Wall art items are textured planes on the wall face. Positioned by offset (along wall) + centerY (height)."
  - "WallSurfacePanel appears inside PropertiesPanel when exactly one wall is selected."
  - "Each art item defaults to 2×2.5 ft positioned at 2ft offset, centered at wall's mid-height — sensible defaults Jessica can tweak."
metrics:
  requirements_closed: [SURFACE-01, SURFACE-02, SURFACE-03, SURFACE-04, TRIM-01, TRIM-02, TRIM-03]
---

# Phase 13 Plan: Wall Surfaces + Architectural Trim

## Goal

Each wall independently supports wallpaper, wainscoting, crown molding, and placed wall art items.

## Tasks

- [x] Add wallpaper, wainscoting, crownMolding, wallArt fields to WallSegment
- [x] Add Wallpaper + WallArt types
- [x] Add 6 store actions (setWallpaper, toggleWainscoting, toggleCrownMolding, addWallArt, updateWallArt, removeWallArt)
- [x] Update WallMesh to render wallpaper (color or pattern texture)
- [x] Update WallMesh to render wainscoting + crown bands as offset planes
- [x] Update WallMesh to render wall art items as textured planes
- [x] Create WallSurfacePanel (wallpaper picker + trim toggles + art list)
- [x] Mount WallSurfacePanel inside PropertiesPanel wall branch

## Verification

- [x] Select a wall → WALL_SURFACE section appears in PropertiesPanel
- [x] Pick wallpaper color → 3D wall updates
- [x] Upload wallpaper pattern → 3D wall gets textured with repeats
- [x] Toggle wainscoting → band appears at bottom of wall in 3D
- [x] Adjust wainscoting height → band resizes
- [x] Pick wainscoting color → band color changes
- [x] Toggle crown molding → band appears at top of wall
- [x] Click "+ ADD" wall art → file picker → image becomes a plane on the wall
- [x] Remove art item → plane disappears
- [x] All changes persist via auto-save + survive reload
