---
phase: 17-per-side-wall-treatments
plan: 01
subsystem: wall-surfaces
tags: [side-01, side-02, side-03]
requires: [cadStore, WallMesh, WallSurfacePanel, uiStore, snapshotMigration]
provides: [WallSide type, side-aware wall treatments, SIDE toggle UI, dual-face 3D rendering]
affects:
  - src/types/cad.ts
  - src/stores/cadStore.ts
  - src/stores/uiStore.ts
  - src/lib/snapshotMigration.ts
  - src/components/WallSurfacePanel.tsx
  - src/three/WallMesh.tsx
decisions:
  - "Each treatment wraps its config in { A?, B? } (Option A from discussion). Min schema churn, clean back-compat via migration."
  - "SIDE_A / SIDE_B neutral labels (not INSIDE/OUTSIDE) — works for divider walls between rooms."
  - "Wainscoting + crown + wallpaper are all per-side independently."
  - "WallArt items tagged with side field (defaults to 'A' if missing)."
  - "activeWallSide lives in uiStore — persists until explicit toggle, not per-wall selection."
  - "3D: side B wrapped in a group rotated 180° around Y — same decor code runs for both faces with natural X/Z flip."
  - "Base wall mesh gets neutral drywall color; wallpaper moves to per-face overlay planes (fixes bleed-to-all-faces bug)."
  - "Migration detects legacy singleton shape (presence of .kind/.enabled) and wraps in { A: <legacy> }."
metrics:
  requirements_closed: [SIDE-01, SIDE-02, SIDE-03]
---

# Phase 17 Plan: Per-Side Wall Treatments

## Goal

Every wall treatment (wallpaper, wainscoting, crown molding, wall art) becomes side-aware. User picks SIDE_A or SIDE_B and applies independently. Divider walls between rooms can have totally different treatments on each face.

## Tasks

- [x] Add `WallSide` type + named `WainscotConfig` / `CrownConfig` interfaces
- [x] Wrap `wallpaper`, `wainscoting`, `crownMolding` on WallSegment in `{ A?, B? }` shape
- [x] Add `side?: WallSide` field to WallArt
- [x] Migration in snapshotMigration.ts: detect legacy singleton shape + wrap in `{ A: <old> }`
- [x] Add `activeWallSide` + `setActiveWallSide` to uiStore
- [x] Update 3 store actions to take `side: WallSide` param: setWallpaper, toggleWainscoting, toggleCrownMolding
- [x] WallSurfacePanel: SIDE_A / SIDE_B toggle, all reads/writes route through activeSide
- [x] WallMesh.tsx: neutral base wall + per-face wallpaper overlays + both-sides decor rendering

## Data Model

```ts
type WallSide = "A" | "B";

interface WallSegment {
  // BEFORE: wallpaper?: Wallpaper
  wallpaper?: { A?: Wallpaper; B?: Wallpaper };

  // BEFORE: wainscoting?: { enabled, heightFt, color }
  wainscoting?: { A?: WainscotConfig; B?: WainscotConfig };

  // BEFORE: crownMolding?: { enabled, heightFt, color }
  crownMolding?: { A?: CrownConfig; B?: CrownConfig };

  // WallArt array unchanged; items gain side field
  wallArt?: WallArt[];  // each: side?: WallSide (defaults to "A")
}
```

## Verification

- [x] SIDE_A / SIDE_B toggle appears in WallSurfacePanel when wall selected
- [x] Wallpaper applies to chosen side only — 3D shows the other face as plain drywall
- [x] Wainscoting + crown molding render independently per side
- [x] Wall art items tagged with correct side; art panel shows only items for active side
- [x] Legacy snapshots auto-migrate (wrap singleton treatments in `{ A: ... }`)
- [x] Undo/redo preserves per-side state correctly
- [x] Save/load roundtrips per-side treatments
- [x] Build clean, no typecheck errors
