---
phase: 06-2d-canvas-navigation
plan: 01
subsystem: 2d-canvas
tags: [zoom, pan, viewport, navigation, nav-01, nav-02, nav-03]
requires: [uiStore, FabricCanvas, Toolbar/ToolPalette]
provides: [userZoom state, panOffset state, scroll-wheel zoom, middle/space drag pan, fit-to-view reset, zoom controls UI, "0" keyboard shortcut]
affects:
  - src/stores/uiStore.ts
  - src/canvas/FabricCanvas.tsx
  - src/components/Toolbar.tsx
  - src/App.tsx
decisions:
  - "userZoom multiplies auto-fit scale; panOffset adds to auto-fit origin — single layered transform keeps tools' scale/origin contract unchanged"
  - "Zoom clamped to 0.25x–8x via MIN_ZOOM/MAX_ZOOM in store"
  - "zoomAt() helper takes cursor + baseFit + factor — keeps cursor-anchored zoom math in store (pure), not in canvas component"
  - "Pan via middle-mouse-drag OR space+left-drag (both supported)"
  - "'0' key fit-to-view only active in 2d/split views, not library"
  - "Scroll-wheel: exponential factor exp(-deltaY * 0.0015), ctrl/cmd+wheel = 3.3x faster (0.005)"
metrics:
  duration: ~10min
  requirements_closed: [NAV-01, NAV-02, NAV-03]
---

# Phase 6 Plan: 2D Canvas Navigation

## Goal

Jessica can zoom, pan, and fit-to-view the 2D canvas so she can work at any scale. Makes larger rooms workable (currently auto-fit is the only zoom level).

## Approach

Layer user zoom/pan on top of the existing auto-fit scale/origin math. The existing
tools (wall, door, window, select, product) read `scale` and `origin` to convert pointer
coordinates to world (feet) coordinates. By feeding them `baseScale * userZoom` and
`baseOrigin + panOffset`, all tools continue to work without modification.

## Contract

```
scale = baseFitScale * userZoom
origin = baseFitOrigin + panOffset

// baseFitScale and baseFitOrigin depend only on room dims and canvas size
// (same math as before). userZoom defaults to 1.0, panOffset to {0,0}.
```

## Tasks

- [x] Add `userZoom`, `panOffset`, `setUserZoom`, `setPanOffset`, `zoomAt`, `resetView` to uiStore
- [x] Add `getViewTransform()` helper to FabricCanvas replacing inline getScale/getOrigin
- [x] Update all FabricCanvas callsites (redraw, drag-drop scale getter, dblclick handler, overlay positioning)
- [x] Add `userZoom` + `panOffset` to FabricCanvas redraw dependency array
- [x] Add scroll-wheel zoom handler (zoom-to-cursor via `zoomAt()`)
- [x] Add middle-mouse + space+left-drag pan handler
- [x] Add zoom-in, zoom-out, fit-to-view buttons + "100%" indicator to ToolPalette
- [x] Wire `0` keyboard shortcut to `resetView()` in App.tsx

## Verification

- [x] Zoom indicator shows "100%" initially
- [x] Click zoom-in → 120% → 144% (1.2× compound)
- [x] Click zoom-out → divides by 1.2
- [x] Scroll wheel up over canvas center → zoomed in, cursor stays at same world point
- [x] Fit-to-view button → resets to 100%
- [x] Keyboard "0" → resets to 100%
- [x] Grid lines visibly larger when zoomed in (confirmed via screenshot at 386%)
- [x] Zoom is clamped at 25% minimum, 800% maximum

## Out of scope (deferred)

- Pinch-to-zoom on trackpad (requires gesture library)
- Mini-map / overview panel
- Zoom-to-selection
- Remembering zoom per-room (currently zoom resets when switching rooms)
