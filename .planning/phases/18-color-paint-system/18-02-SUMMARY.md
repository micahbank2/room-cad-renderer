---
phase: 18-color-paint-system
plan: "02"
subsystem: paint-rendering
tags: [paint, 3d, 2d, WallMesh, CeilingMesh, fabricSync, lime-wash]
dependency_graph:
  requires:
    - PaintColor type (src/types/paint.ts) — from Plan 01
    - resolvePaintHex utility (src/lib/colorUtils.ts) — from Plan 01
    - paintStore derived view (src/stores/paintStore.ts) — from Plan 01
    - cadStore Wallpaper.kind="paint" + Ceiling.paintId (src/types/cad.ts) — from Plan 01
  provides:
    - 3D wall paint rendering via paintId (src/three/WallMesh.tsx)
    - 3D ceiling paint rendering via paintId (src/three/CeilingMesh.tsx)
    - 2D wall paint fill + lime wash pattern overlay (src/canvas/fabricSync.ts)
    - 2D ceiling paint fill + lime wash pattern overlay (src/canvas/fabricSync.ts)
  affects:
    - src/three/WallMesh.tsx (paint branch added to renderWallpaperOverlay)
    - src/three/CeilingMesh.tsx (paintId resolution + roughness)
    - src/canvas/fabricSync.ts (paint fill + getLimeWashPattern)
tech_stack:
  added: []
  patterns:
    - usePaintStore hook inside React components (WallMesh, CeilingMesh)
    - usePaintStore.getState() imperative access in non-React module (fabricSync.ts)
    - Cached fabric.Pattern with fixed dot positions for lime wash (no Math.random())
    - kind="paint" branch BEFORE kind="color" in WallMesh renderWallpaperOverlay
key_files:
  created: []
  modified:
    - src/three/WallMesh.tsx
    - src/three/CeilingMesh.tsx
    - src/canvas/fabricSync.ts
decisions:
  - Paint branch in WallMesh placed before color branch to prevent fall-through (Pitfall 3)
  - getLimeWashPattern cached at module scope to prevent flicker on every Fabric redraw
  - 2D floor plan shows Side A paint color as wall polygon fill (top-down view shows dominant side)
  - Ceiling paint shown at 30% opacity in 2D (consistent with existing ceiling overlay pattern)
metrics:
  duration: ~20 minutes
  completed: 2026-04-05
  tasks: 2 of 2
  files_created: 0
  files_modified: 3
  tests_added: 0
  tests_passing: 140
---

# Phase 18 Plan 02: Paint Rendering (3D + 2D) Summary

**One-liner:** Paint colors and lime wash finish wired into all three renderers — WallMesh (3D), CeilingMesh (3D), and fabricSync (2D) — using resolvePaintHex + paintStore.

## What Was Built

### Task 1: 3D Paint Rendering (WallMesh + CeilingMesh)

**WallMesh.tsx:**
- Added `import { resolvePaintHex } from "@/lib/colorUtils"` and `import { usePaintStore } from "@/stores/paintStore"`
- Subscribed to `customColors` via `usePaintStore((s) => s.customColors)` inside the component
- Added `kind === "paint"` branch in `renderWallpaperOverlay` BEFORE the `kind === "color"` path
- Paint branch: resolves paintId to hex via `resolvePaintHex`, sets `roughness = wp.limeWash ? 0.95 : 0.85`
- Returns a `<mesh>` plane at wall surface with `<meshStandardMaterial>` using the resolved color
- Existing `kind="color"` and `kind="pattern"` paths unchanged

**CeilingMesh.tsx:**
- Added `import { resolvePaintHex } from "@/lib/colorUtils"` and `import { usePaintStore } from "@/stores/paintStore"`
- Subscribed to `customColors` via `usePaintStore((s) => s.customColors)` inside the component
- Replaced hardcoded `const color = ceiling.material.startsWith("#") ? ...` with paintId-aware resolution:
  - `ceiling.paintId` takes precedence → `resolvePaintHex(ceiling.paintId, customColors)`
  - Falls back to existing material string logic for backward compatibility
- Added `const roughness = ceiling.limeWash ? 0.95 : 0.8` and applied to `meshStandardMaterial`

### Task 2: 2D Paint Rendering (fabricSync.ts)

**Module-level additions:**
- Added `import { resolvePaintHex } from "@/lib/colorUtils"` and `import { usePaintStore } from "@/stores/paintStore"`
- Added `getLimeWashPattern()` function: cached `fabric.Pattern` with 8 fixed dot positions at `rgba(255,255,255,0.18)` on a 32×32 canvas. No `Math.random()` — stable across all redraws.

**renderWalls():**
- Added `const customColors = usePaintStore.getState().customColors` (imperative, non-hook)
- Before polygon creation, checks `wall.wallpaper?.A?.kind === "paint"` and resolves hex
- Paint color applied as the wall polygon `fill` (visible in 2D top-down floor plan)
- Lime wash overlay: second `fabric.Polygon` with `fill: getLimeWashPattern()` at `opacity: 0.2`
- Existing `WALL_FILL` default maintained for all non-paint walls

**renderCeilings():**
- Added `const customColors = usePaintStore.getState().customColors`
- Checks `c.paintId` and resolves hex, applies as `fill` with `+ "30"` alpha suffix (30% opacity, consistent with existing overlay pattern)
- Lime wash overlay added as second polygon at `opacity: 0.2`
- Backward compat: ceilings without `paintId` render exactly as before

## Verification

TypeScript: Clean (only pre-existing deprecation warning about `baseUrl` in TypeScript 6 — not a new error from our changes).

Tests: 140 pass, 1 pre-existing failure (`SidebarProductPicker` drag test — documented in Plan 01 SUMMARY as deferred, caused by happy-dom vs jsdom behavioral difference with `dataTransfer.effectAllowed`).

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

Note: `npm install` was run to install `happy-dom` in the main repo node_modules (listed in package.json from Plan 01 but not yet installed in test environment). This was a Rule 3 (blocking) fix — tests couldn't run without it.

## Known Stubs

None. All paint data flows are wired end-to-end:
- `resolvePaintHex` uses the real F&B catalog and custom colors
- `usePaintStore` subscribes to real `cadStore.customPaints`
- 3D renderers apply real `THREE.Color` via resolved hex
- 2D canvas applies real fill colors to Fabric polygons

## Self-Check: PASSED
