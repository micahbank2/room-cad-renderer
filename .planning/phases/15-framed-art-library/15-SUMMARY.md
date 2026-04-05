---
phase: 15-framed-art-library
plan: 01
subsystem: wall-surfaces
tags: [art-01, art-02, art-03, art-04, art-05, art-06]
requirements_closed: [ART-01, ART-02, ART-03, ART-04, ART-05, ART-06]
affects:
  - src/types/framedArt.ts
  - src/types/cad.ts
  - src/stores/framedArtStore.ts
  - src/three/WallMesh.tsx
  - src/components/FramedArtLibrary.tsx
  - src/components/WallSurfacePanel.tsx
  - src/components/Sidebar.tsx
  - src/App.tsx
metrics:
  completed: 2026-04-05
  duration: ~20m
---

# Phase 15 Summary

Closes ART-01/02/03/04/05/06 — global framed art library with real 3D frame geometry.

## What shipped

**Global library:** FramedArtItem persisted to IndexedDB under key
`room-cad-framed-art`. Mirrors productStore: load on mount, subscribe
to persist. Reusable across all projects, not per-project.

**7 frame presets:** none, thin-black, thick-gold, natural-wood,
museum-white, floating, ornate. Each preset configures frame width,
depth (protrusion from wall), and color.

**Sidebar ART_LIBRARY section:** Upload image + name + pick frame
style from dropdown → SAVE_TO_LIBRARY adds it. Cards show scaled
frame preview around the image thumbnail.

**+ LIB button** in WallSurfacePanel (when a wall is selected):
opens inline picker listing all library items. Clicking an item
creates a wallArt entry on that wall at default 2'×2.5' with the
item's frameStyle preserved.

**Real 3D frame geometry in WallMesh.tsx:** replaces the flat
plane with a 4-strip boxGeometry group (top/bottom/left/right)
plus an inset art plane. Frame strips protrude from the wall face
at configured depth; art sits recessed in the frame opening.

**Backward compat:** WallArt entries without `frameStyle` render as
flat planes (current behavior). No migration needed.

## Data model

```ts
// NEW: types/framedArt.ts
type FrameStyle = "none" | "thin-black" | "thick-gold"
                | "natural-wood" | "museum-white" | "floating" | "ornate";

interface FramedArtItem {
  id: string;
  name: string;
  imageUrl: string;
  frameStyle: FrameStyle;
}

const FRAME_PRESETS: Record<FrameStyle, { width, depth, color, label }>;

// EXTENDED: types/cad.ts
interface WallArt {
  // ...existing fields...
  frameStyle?: FrameStyle; // NEW, optional
}
```

## Deferred

- **Dims editor on placed art:** can edit width/height via direct
  wallArt manipulation but no slick UI yet; default drop is 2'×2.5'
- **Frame color override:** presets are fixed; per-placement color
  tweaks will land in v1.3 (color system milestone)
- **Position editor:** offset + centerY aren't exposed in UI yet
- **Library item preview in 3D:** placing from library uses stock
  dims, not the image's natural aspect ratio
