---
phase: 16-wainscoting-library
plan: 01
subsystem: wall-surfaces
tags: [wain-01, wain-02, wain-03, wain-04]
requires: [cadStore, WallMesh, WallSurfacePanel, Sidebar, framedArtStore pattern]
provides: [7 wainscot style types + renderers, global library store, 3D preview, style dropdown]
affects:
  - src/types/wainscotStyle.ts (new)
  - src/types/cad.ts
  - src/stores/wainscotStyleStore.ts (new)
  - src/stores/cadStore.ts
  - src/three/wainscotStyles.tsx (new)
  - src/three/WallMesh.tsx
  - src/components/WainscotLibrary.tsx (new)
  - src/components/WainscotPreview3D.tsx (new)
  - src/components/WallSurfacePanel.tsx
  - src/components/Sidebar.tsx
  - src/App.tsx
decisions:
  - "7 hard-coded style categories (recessed-panel, raised-panel, beadboard, board-and-batten, shiplap, flat-panel, english-grid) because each needs its own 3D geometry renderer."
  - "User-buildable library of named presets wrapping one of the 7 categories + knobs. Matches products/framed-art library pattern."
  - "Reference model: wall stores styleItemId. Edit library item → all walls re-render. Delete → walls fall back to legacy recessed-panel."
  - "Live 3D preview inside builder form (tiny R3F canvas with rotating preview wall)."
  - "Back-compat: existing WainscotConfig keeps heightFt+color; if styleItemId missing, fall through to legacy recessed-panel renderer."
  - "Style-specific knobs hidden/shown based on selected style in builder form."
metrics:
  requirements_closed: [WAIN-01, WAIN-02, WAIN-03, WAIN-04]
---

# Phase 16 Plan: Wainscoting Style Library

## Goal

Jessica builds named wainscoting presets (e.g. "Entryway Board & Batten") using any of 7 real architectural styles, previews them in 3D in the builder, saves to a global library, and applies them per-side on any wall. Editing a library item updates all walls using it.

## Tasks

- [ ] Create `src/types/wainscotStyle.ts` — WainscotStyle enum, WainscotStyleItem interface, STYLE_META constant (labels + default knobs + knob visibility map)
- [ ] Create `src/stores/wainscotStyleStore.ts` — global IndexedDB store (key: `room-cad-wainscot-styles`)
- [ ] Extend `WainscotConfig` in cad.ts with optional `styleItemId`; keep heightFt+color for legacy fallback
- [ ] Update `toggleWainscoting` in cadStore to accept optional styleItemId
- [ ] Create `src/three/wainscotStyles.tsx` — 7 renderer functions, each returns JSX mesh group for one style
- [ ] Update WallMesh.tsx — replace inline wainscoting JSX with lookup + dispatch to style renderer
- [ ] Create `src/components/WainscotPreview3D.tsx` — small R3F canvas rendering a preview wall (e.g. 8'×3'×0.5') with the current style applied
- [ ] Create `src/components/WainscotLibrary.tsx` — sidebar panel: catalog list + + NEW builder with live preview
- [ ] Update WallSurfacePanel.tsx — replace inline wainscoting config UI with style-picker dropdown (reads library)
- [ ] Mount WainscotLibrary in Sidebar (below FRAMED_ART_LIBRARY)
- [ ] Load wainscotStyleStore in App.tsx

## Data Model

```ts
// NEW: types/wainscotStyle.ts
export type WainscotStyle =
  | "recessed-panel" | "raised-panel" | "beadboard"
  | "board-and-batten" | "shiplap" | "flat-panel" | "english-grid";

export interface WainscotStyleItem {
  id: string;            // "wain_..."
  name: string;
  style: WainscotStyle;
  heightFt: number;      // chair rail height
  color: string;
  // Optional style-specific knobs (each style uses its own subset)
  panelWidth?: number;   // recessed / raised / flat / english
  plankWidth?: number;   // beadboard
  battenWidth?: number;  // board-and-batten
  plankHeight?: number;  // shiplap
  stileWidth?: number;   // recessed / raised / english
  gridRows?: number;     // english
  depth?: number;        // protrusion, default 0.18
}

// EXTENDED: types/cad.ts
interface WainscotConfig {
  enabled: boolean;
  styleItemId?: string;  // NEW
  heightFt: number;      // legacy fallback
  color: string;         // legacy fallback
}
```

## Style renderers

Each returns `<group>` of meshes for a wall of given length/height.
Signature: `(config: { length, color, heightFt, ...knobs }) => JSX.Element`.

| Style | Distinct geometry |
|-------|-------------------|
| recessed-panel | Frame with inset panel (current look) — stiles + rails + recessed backing |
| raised-panel | Frame with OUTSET panel (panel protrudes beyond frame plane) |
| beadboard | Vertical narrow planks (plankWidth ~0.25') with v-groove gaps between each |
| board-and-batten | Flat backing + wide vertical battens (battenWidth ~0.33') at intervals |
| shiplap | Horizontal planks (plankHeight ~0.5') with 0.02' shadow gaps between rows |
| flat-panel | Clean single rectangle + chair cap, no stiles/rails/panels |
| english-grid | Multi-row recessed grid (gridRows × colCount derived from wall length) |

All styles include a chair rail cap at the top (except flat-panel which is the chair cap itself).

## Verification

- [ ] WAINSCOT_LIBRARY section in sidebar (below FRAMED_ART_LIBRARY)
- [ ] + NEW opens builder form with style dropdown + name + height + color + style-specific knobs + 3D preview
- [ ] Switching style in dropdown updates preview + shows/hides knobs
- [ ] SAVE_TO_LIBRARY creates catalog card showing style label + color swatch + name
- [ ] All 7 styles render distinctly in both preview and on actual walls
- [ ] Library persists after page refresh (IndexedDB)
- [ ] Delete library item removes card
- [ ] WAINSCOTING in WallSurfacePanel: checkbox + dropdown listing library items
- [ ] Selecting a library item applies it to active side (calls toggleWainscoting with styleItemId)
- [ ] Editing a library item updates all walls using it in real-time
- [ ] Deleting a library item → walls fall back to legacy recessed-panel render
- [ ] Pre-Phase-16 walls (only heightFt/color, no styleItemId) still render as recessed-panel (no regression)
- [ ] Works per-side (applies to activeWallSide from Phase 17)
