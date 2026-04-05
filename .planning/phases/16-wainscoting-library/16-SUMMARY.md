---
phase: 16-wainscoting-library
plan: 01
subsystem: wall-surfaces
tags: [wain-01, wain-02, wain-03, wain-04]
requirements_closed: [WAIN-01, WAIN-02, WAIN-03, WAIN-04]
affects:
  - src/types/wainscotStyle.ts
  - src/types/cad.ts
  - src/stores/wainscotStyleStore.ts
  - src/stores/cadStore.ts
  - src/three/wainscotStyles.tsx
  - src/three/WallMesh.tsx
  - src/components/WainscotLibrary.tsx
  - src/components/WainscotPreview3D.tsx
  - src/components/WallSurfacePanel.tsx
  - src/components/Sidebar.tsx
  - src/App.tsx
metrics:
  completed: 2026-04-05
  duration: ~35m
---

# Phase 16 Summary

Closes WAIN-01/02/03/04 — wainscoting style library with 7 real 3D geometries and live preview.

## What shipped

**7 real 3D wainscoting styles** (no textured fakes):
- **RECESSED_PANEL** — stiles + rails + inset panel (current look)
- **RAISED_PANEL** — same frame but panels protrude beyond frame plane
- **BEADBOARD** — narrow vertical planks with v-grooves
- **BOARD_AND_BATTEN** — flat backing + wide vertical battens + top band
- **SHIPLAP** — horizontal overlapping planks with shadow gaps
- **FLAT_PANEL** — clean slab + chair cap, minimal detail
- **ENGLISH_GRID** — multi-row grid of recessed panels (configurable rows)

**Global library** (IndexedDB, key `room-cad-wainscot-styles`): Jessica builds named presets wrapping one of the 7 styles + knobs (panel width, stile width, plank width, batten width, depth, grid rows, chair rail height, color). Saved presets reusable across all projects.

**Builder UI** with live 3D preview: + NEW in WAINSCOT_LIBRARY opens a form with style dropdown, per-style knobs (shown/hidden based on style meta), and a rotating R3F canvas rendering the exact geometry Jessica will get on her wall. Preview updates live as knobs change.

**Reference model:** wall stores `styleItemId`. WallMesh looks up the style from `wainscotStyleStore` at render time. Edit a library item → all walls using it update immediately. Delete a library item → walls fall back to legacy recessed-panel using heightFt + color from when they were set.

**Per-side integration:** WAINSCOTING picker in WallSurfacePanel applies to whichever side (A/B) is active in the Phase 17 toggle. Each side independently picks its own wainscoting style.

## Performance

WainscotPreview3D lazy-loaded via `React.lazy` — the R3F stack only pulls in when the user clicks + NEW. Main bundle stayed at 602KB (identical to pre-Phase-16 baseline). Preview stub is 1.2KB; wainscotStyles geometry code is 925KB (deferred).

## Data model

```ts
// NEW: types/wainscotStyle.ts
type WainscotStyle = "recessed-panel" | "raised-panel" | "beadboard"
                   | "board-and-batten" | "shiplap" | "flat-panel" | "english-grid";

interface WainscotStyleItem {
  id: string;
  name: string;
  style: WainscotStyle;
  heightFt: number;
  color: string;
  // style-specific knobs (optional, defaults per style):
  panelWidth?: number; plankWidth?: number; battenWidth?: number;
  plankHeight?: number; stileWidth?: number; gridRows?: number; depth?: number;
}

// EXTENDED: WainscotConfig
interface WainscotConfig {
  enabled: boolean;
  styleItemId?: string;  // NEW — references library
  heightFt: number;      // fallback if styleItemId missing
  color: string;         // fallback if styleItemId missing
}
```

## Deferred

- **Per-wall knob overrides:** currently all knobs are library-level. A wall can't say "use this library style but make panels 0.5ft wider."
- **Copy style → other side:** no one-click button to mirror a wainscoting style to SIDE_B.
- **Style thumbnails in catalog list:** list items show color swatch + style label; full-size thumbnails would help at a glance.
