---
phase: 12-floor-materials
plan: 01
subsystem: materials
tags: [floor-01, floor-02, floor-03]
requirements_closed: [FLOOR-01, FLOOR-02, FLOOR-03]
affects:
  - src/data/floorMaterials.ts
  - src/types/cad.ts
  - src/stores/cadStore.ts
  - src/three/FloorMesh.tsx
  - src/three/ThreeViewport.tsx
  - src/components/FloorMaterialPicker.tsx
  - src/components/Sidebar.tsx
metrics:
  completed: 2026-04-05
  duration: ~15m
---

# Phase 12 Summary

Closes FLOOR-01/02/03 — floor material picking, custom texture upload,
and scale/rotation controls.

## What shipped

**8-preset catalog:** WOOD_OAK, WOOD_WALNUT, TILE_WHITE, TILE_BLACK,
CONCRETE, CARPET, MARBLE, STONE. Each preset is a solid-color
baseline with its own roughness (concrete 0.85, marble 0.2, etc.).
Real procedural/image textures can land in v1.3 without changing
the data model.

**Custom texture upload:** Jessica uploads an image file → stored as
data URL in `RoomDoc.floorMaterial.imageUrl`. Rendered on the floor
with `repeat = width / scaleFt` and rotation applied via texture UV.
Module-level cache (`customTextureCache`) prevents re-loading on
every redraw.

**Scale + rotation controls:** Stored as feet (`scaleFt`) and
degrees (`rotationDeg`). Scale is the pattern's repeat distance in
feet — more intuitive than Three.js UV repeat counts.

**FloorMesh component:** Encapsulates all three rendering paths
(fallback procedural wood, preset color, custom texture). Keeps
ThreeViewport clean.

**Sidebar UI:** FloorMaterialPicker component between LAYERS and
SNAP. Dropdown, color swatch preview, file upload, scale/rotation
inputs, reset button.

## Data model

```ts
interface FloorMaterial {
  kind: "preset" | "custom";
  presetId?: string;   // preset kind only
  imageUrl?: string;   // custom kind only
  scaleFt: number;
  rotationDeg: number;
}

interface RoomDoc {
  // ... existing
  floorMaterial?: FloorMaterial;
}
```

Default (undefined) = procedural wood floor from v1.0.

## Not yet

- Procedural patterns for tile presets (grout lines, herringbone)
- Bump/normal maps for presets (depth perception)
- Floor material preview swatches on the dropdown itself
