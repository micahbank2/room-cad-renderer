---
phase: 12-floor-materials
plan: 01
subsystem: materials
tags: [floor-01, floor-02, floor-03, materials, texture-upload]
requires: [cadStore, ThreeViewport, Sidebar]
provides: [FloorMaterial type, 8 presets, custom upload, scale/rotation controls, FloorMesh]
affects:
  - src/data/floorMaterials.ts (new)
  - src/types/cad.ts
  - src/stores/cadStore.ts
  - src/three/FloorMesh.tsx (new)
  - src/three/ThreeViewport.tsx
  - src/components/FloorMaterialPicker.tsx (new)
  - src/components/Sidebar.tsx
decisions:
  - "Floor material stored per-room on RoomDoc.floorMaterial (optional). Default = undefined = procedural wood floor from v1.0."
  - "FloorMaterial supports kind='preset' (8 curated solid-color presets) or kind='custom' (user-uploaded image as data URL)."
  - "Presets are solid-color baselines with per-material roughness. Real textures can be added in v1.3 without breaking the data model."
  - "Custom texture applies repeat = width/scaleFt and rotation from the FloorMaterial fields."
  - "FloorMesh component handles all three rendering paths (fallback wood, preset color, custom texture) so ThreeViewport stays clean."
  - "Scale stored as repeat-distance in feet (easier to reason about than Three.js UV repeat counts)."
metrics:
  requirements_closed: [FLOOR-01, FLOOR-02, FLOOR-03]
---

# Phase 12 Plan: Floor Materials

## Goal

Jessica can pick a floor material from a preset catalog or upload her own texture, with scale + rotation controls so tile patterns read at the right size.

## Tasks

- [x] Create src/data/floorMaterials.ts with 8 presets (WOOD_OAK, WOOD_WALNUT, TILE_WHITE, TILE_BLACK, CONCRETE, CARPET, MARBLE, STONE)
- [x] Add FloorMaterial type to src/types/cad.ts
- [x] Add floorMaterial?: FloorMaterial to RoomDoc
- [x] Add setFloorMaterial action to cadStore (with history)
- [x] Create src/three/FloorMesh.tsx (handles fallback/preset/custom rendering paths)
- [x] Swap ThreeViewport's inline floor mesh for <FloorMesh />
- [x] Create src/components/FloorMaterialPicker.tsx (preset dropdown + upload + scale/rotation inputs + reset)
- [x] Mount FloorMaterialPicker in Sidebar

## Verification

- [x] FLOOR_MATERIAL section appears in sidebar between LAYERS and SNAP
- [x] Dropdown lists DEFAULT_WOOD + 8 presets + UPLOAD_IMAGE
- [x] Pick a preset → 3D floor switches to that solid color with matching roughness
- [x] Color swatch preview appears under dropdown when preset selected
- [x] Select UPLOAD_IMAGE → file picker opens → choose image → floor updates with texture
- [x] SCALE input changes pattern repeat distance in feet
- [x] ROTATION input rotates texture in degrees
- [x] RESET_TO_DEFAULT clears material → returns to procedural wood floor
- [x] State persists in store + survives reload via auto-save
