---
phase: 13-wall-surfaces-trim
plan: 01
subsystem: wall-surfaces
tags: [surface-01, surface-02, surface-03, surface-04, trim-01, trim-02, trim-03]
requirements_closed: [SURFACE-01, SURFACE-02, SURFACE-03, SURFACE-04, TRIM-01, TRIM-02, TRIM-03]
affects:
  - src/types/cad.ts
  - src/stores/cadStore.ts
  - src/three/WallMesh.tsx
  - src/components/WallSurfacePanel.tsx
  - src/components/PropertiesPanel.tsx
metrics:
  completed: 2026-04-05
  duration: ~20m
---

# Phase 13 Summary

Closes 7 requirements: SURFACE-01/02/03/04 (wallpaper + wall art) and
TRIM-01/02/03 (wainscoting + crown molding). Each wall independently
supports all four surface treatments.

## What shipped

**Wallpaper (SURFACE-01):** Per-wall solid color OR pattern image
(data URL). Pattern repeats controlled by scaleFt. Applied to the
full wall as the main material texture.

**Wall art (SURFACE-02/03/04):** Placed as textured planes on the
wall's interior face. Each item has offset (along wall), centerY
(height from floor), width, height, and imageUrl. Default size
2×2.5 ft centered at wall mid-height.

**Wainscoting (TRIM-01):** Per-wall toggle with editable height (0.5–6 ft,
default 3 ft) and color. Renders as a colored plane at the bottom
of the wall's interior face.

**Crown molding (TRIM-02):** Per-wall toggle with editable band
height (0.17–1 ft, default 0.33 ft = 4") and color. Renders at top
of wall's interior face.

**3D rendering (TRIM-03 + SURFACE):** WallMesh wrapped in a group
with the base wall + optional wainscoting plane + optional crown
plane + wall art planes. All offset 0.01–0.02 ft from the wall face
to prevent z-fighting.

**WallSurfacePanel:** New component appearing inside PropertiesPanel
when exactly one wall is selected. Color picker + pattern upload for
wallpaper, height/color inputs for trim, file upload for wall art
with a list + remove buttons.

## Data model

```ts
interface WallSegment {
  // ... existing fields
  wallpaper?: Wallpaper;
  wainscoting?: { enabled: boolean; heightFt: number; color: string };
  crownMolding?: { enabled: boolean; heightFt: number; color: string };
  wallArt?: WallArt[];
}
```

## Not yet

- Edit handles to reposition wall art directly in the 3D/2D view (can
  still be done via re-adding at a different default)
- True 3D profile geometry for wainscoting/crown (currently flat planes)
- Per-wall paint color separate from wallpaper (v1.3 color system)
