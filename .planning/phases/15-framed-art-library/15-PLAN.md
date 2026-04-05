---
phase: 15-framed-art-library
plan: 01
subsystem: wall-surfaces
tags: [art-01, art-02, art-03, art-04, art-05, art-06]
requires: [cadStore, WallMesh, WallSurfacePanel, Sidebar]
provides: [FramedArtItem type + FRAME_PRESETS, global art library store, 3D frame geometry, from-library placement]
affects:
  - src/types/framedArt.ts (new)
  - src/types/cad.ts
  - src/stores/framedArtStore.ts (new)
  - src/three/WallMesh.tsx
  - src/components/FramedArtLibrary.tsx (new)
  - src/components/WallSurfacePanel.tsx
  - src/components/Sidebar.tsx
  - src/App.tsx
decisions:
  - "Framed art items are GLOBAL (like products) — persisted to IndexedDB under key 'room-cad-framed-art', available across all projects."
  - "FrameStyle is a preset enum with 7 options (none, thin-black, thick-gold, natural-wood, museum-white, floating, ornate) — no custom frame builder in v1."
  - "Reuse existing WallArt slot on WallSegment — add optional frameStyle field. Backward compat: missing frameStyle = plain plane (current behavior)."
  - "Placement via existing WallSurfacePanel — new '+ FROM_LIBRARY' button opens a picker; dims come from library item (editable after)."
  - "3D: frame renders as 4 boxGeometry strips (top/bottom/left/right) around an inset art plane. Frame depth protrudes from the wall face; art sits recessed in the frame opening."
  - "Library items are reusable but placements are independent copies — editing library item does NOT update existing placements."
metrics:
  requirements_closed: [ART-01, ART-02, ART-03, ART-04, ART-05, ART-06]
---

# Phase 15 Plan: Framed Art Library

## Goal

Jessica uploads art she loves (Pinterest finds, family photos, posters), combines it with a chosen frame preset, saves it to a reusable global library, and places framed pieces on any wall with real 3D frame geometry.

## Tasks

- [ ] Create `src/types/framedArt.ts` — FrameStyle type, FramedArtItem interface, FRAME_PRESETS constant
- [ ] Add optional `frameStyle?: FrameStyle` + `frameColor?: string` to WallArt in cad.ts
- [ ] Create `src/stores/framedArtStore.ts` — global library with load/add/remove/update, IndexedDB persistence (mirrors productStore pattern)
- [ ] Create `src/components/FramedArtLibrary.tsx` — sidebar panel with upload form (name, image, frame picker) + catalog list with delete
- [ ] Mount FramedArtLibrary in Sidebar.tsx
- [ ] Load framedArtStore in App.tsx on mount
- [ ] Update WallMesh.tsx — replace flat art plane with group (inset art + 4 frame strips using FRAME_PRESETS config)
- [ ] Add "+ FROM_LIBRARY" button to WallSurfacePanel — opens picker modal/dropdown, creates wallArt entry with chosen frameStyle + default 2'×2.5' dims

## Frame Presets

| Style | Width | Depth | Color | Notes |
|-------|-------|-------|-------|-------|
| none | 0 | 0 | — | flat plane (back-compat) |
| thin-black | 0.08 | 0.03 | #0d0d0d | minimalist |
| thick-gold | 0.25 | 0.08 | #b8912d | classic gallery |
| natural-wood | 0.15 | 0.06 | #8b6b4a | warm oak tone |
| museum-white | 0.20 | 0.10 | #f4f2ee | gallery mat |
| floating | 0.05 | 0.15 | #1a1a1a | deep thin offset |
| ornate | 0.35 | 0.12 | #c9a04f | wide gold |

All widths + depths in feet.

## Data Model

```ts
// types/framedArt.ts (NEW)
export type FrameStyle =
  | "none" | "thin-black" | "thick-gold" | "natural-wood"
  | "museum-white" | "floating" | "ornate";

export interface FramedArtItem {
  id: string;          // "fart_..."
  name: string;
  imageUrl: string;    // data URL
  frameStyle: FrameStyle;
}

export interface FramePreset {
  width: number;   // ft
  depth: number;   // ft
  color: string;   // hex
  label: string;
}
export const FRAME_PRESETS: Record<FrameStyle, FramePreset> = { ... };

// types/cad.ts (EXTEND WallArt)
export interface WallArt {
  id: string;
  offset: number;
  centerY: number;
  width: number;
  height: number;
  imageUrl: string;
  frameStyle?: FrameStyle;  // NEW
}
```

## 3D Rendering

Replace the current single `<planeGeometry>` in WallMesh with a group:
1. **Art plane** — inset at `thickness/2 + depth - 0.005` (just behind the frame front face), dims = (width - 2×frameW) × (height - 2×frameW)
2. **4 frame strips** — boxGeometry, one each for top/bottom/left/right, depth protruding from wall face
   - Top/bottom: `(width × frameW × depth)` at top/bottom edges
   - Left/right: `((height − 2×frameW) × frameW × depth)` between top/bottom strips
3. If `frameStyle="none"` or undefined → render single plane (current behavior)

## Verification

- [ ] ART_LIBRARY section appears in sidebar (below CUSTOM_ELEMENTS)
- [ ] Upload image + name + pick frame → CREATE adds to library
- [ ] Library persists after page refresh (IndexedDB)
- [ ] Delete button removes from library
- [ ] In WallSurfacePanel, + FROM_LIBRARY opens picker; clicking an item adds it to wallArt
- [ ] 2D shows art at correct position (reuses existing 2D rendering if any)
- [ ] 3D shows art with frame protruding from wall face
- [ ] All 7 frame presets render with distinct colors/widths/depths
- [ ] Legacy wall art (no frameStyle) still renders as flat plane — no regression
- [ ] Same library item placed twice on two different walls works independently
