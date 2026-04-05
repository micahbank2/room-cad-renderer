---
phase: 17-per-side-wall-treatments
plan: 01
subsystem: wall-surfaces
tags: [side-01, side-02, side-03]
requirements_closed: [SIDE-01, SIDE-02, SIDE-03]
affects:
  - src/types/cad.ts
  - src/stores/cadStore.ts
  - src/stores/uiStore.ts
  - src/lib/snapshotMigration.ts
  - src/components/WallSurfacePanel.tsx
  - src/three/WallMesh.tsx
metrics:
  completed: 2026-04-05
  duration: ~25m
---

# Phase 17 Summary

Closes SIDE-01/02/03 — every wall treatment is now per-side.

## What shipped

**Data model:** Each of wallpaper, wainscoting, crownMolding wraps
its config in `{ A?, B? }`. WallArt items get a `side?: WallSide`
field (defaults to "A" when missing). Snapshot migration auto-wraps
legacy singleton shapes on load so existing projects survive.

**uiStore:** `activeWallSide: "A" | "B"` with `setActiveWallSide`.
Persists across wall selections (so if you toggle to SIDE_B you
stay on B when selecting another wall).

**WallSurfacePanel UI:** SIDE_A / SIDE_B toggle at the top. Every
control below — wallpaper, wainscoting, crown, art add, art list —
reads and writes the active side. Art list only shows items tagged
with active side. + LIB and + ADD tag new art with active side.

**3D rendering (WallMesh.tsx):** Neutral drywall base wall (no
wallpaper bleeding across all 6 faces anymore). Wallpaper becomes
a per-face overlay plane. Wainscoting + crown + art decor extracted
into a `renderSideDecor()` helper called twice — once for side A,
once inside a `<group rotation={[0, Math.PI, 0]}>` that flips the
entire decor onto the -Z face for side B. Same code, two faces.

## Migration

```ts
// Legacy: wall.wallpaper = { kind: "pattern", imageUrl, scaleFt }
// After:  wall.wallpaper = { A: { kind: "pattern", imageUrl, scaleFt } }
```

Detection uses a presence check on the legacy shape's key fields
(`.kind` for Wallpaper, `.enabled` for trim) — if present, wrap in
`{ A: <legacy> }`. Runs in `migrateSnapshot` every load.

## Gotchas resolved

- **Wallpaper bleed:** ExtrudeGeometry wrapped the wallpaper texture
  onto all 6 faces of the wall (top/bottom/edges included). Moving
  wallpaper to overlay planes fixes this.
- **Mirror X on side B:** the `rotation={[0, π, 0]}` group naturally
  flips local X and Z, so an art item at offset=2 from wall.start
  appears at the same "2ft from wall.start" position on both faces
  (just viewed from opposite sides). Consistent mental model.

## Deferred

- **Per-side 2D icons:** FabricCanvas renders wall art on a single
  face in 2D. A small "A/B" badge next to art items would help but
  isn't blocking.
- **Copy to other side:** no one-click "mirror SIDE_A to SIDE_B"
  action yet — user re-enters trim height/color manually.
