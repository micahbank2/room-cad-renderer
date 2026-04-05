---
phase: 06-2d-canvas-navigation
plan: 01
subsystem: 2d-canvas
tags: [zoom, pan, viewport, nav-01, nav-02, nav-03]
requires: [uiStore, FabricCanvas]
provides: [userZoom, panOffset, zoomAt, resetView, scroll-zoom, middle/space-drag pan, zoom controls]
affects:
  - src/stores/uiStore.ts
  - src/canvas/FabricCanvas.tsx
  - src/components/Toolbar.tsx
  - src/App.tsx
decisions:
  - "Layered transform: scale = baseAutoFit * userZoom, origin = baseAutoFit + panOffset. Tools work unchanged."
  - "zoomAt() keeps cursor-anchored zoom math pure inside the store."
  - "Pan supports middle-drag AND space+left-drag."
  - "Zoom clamped 0.25x–8x via store-level Math.max/min."
metrics:
  duration: ~10m
  completed: 2026-04-05
  tasks: 9
  files_modified: 4
requirements_closed: [NAV-01, NAV-02, NAV-03]
---

# Phase 6 Summary: 2D Canvas Navigation

Added scroll-wheel zoom (cursor-anchored), pan (middle-drag or space+drag), and
explicit zoom controls (+/-/fit) to the 2D canvas. All existing tools (wall,
door, window, select, product) work unchanged at any zoom level because the
user zoom/pan is layered into the scale/origin contract they already receive.

## Implementation notes

- `uiStore.zoomAt(cursor, factor, baseFit)` computes cursor-anchored zoom
  entirely in the store (pure), so the canvas component only passes the cursor
  position and base-fit transform — no zoom math in React.
- `FabricCanvas.getViewTransform()` composes `baseAutoFit * userZoom` and
  `baseAutoFitOrigin + panOffset` into the single `{scale, origin}` tuple that
  every tool/renderer already consumes.
- Scroll-wheel factor is exponential: `exp(-deltaY * 0.0015)` for smooth zoom,
  5× faster with ctrl/cmd held.
- Pan uses a dedicated useEffect on the wrapper div. Middle-button down or
  space-key-held + left-down starts a drag; mouseup ends it.
- "0" key resets view to auto-fit (userZoom=1, panOffset=0,0).

## Verified
- Zoom buttons: 100% → 120% → 144% → 120% → 100%
- Scroll wheel: 100% → 135% after one scroll-up tick
- Zoom clamped: can't exceed 800% or drop below 25%
- Fit-to-view button and "0" keyboard shortcut both reset to 100%
- Grid visibly scales at 386% zoom
