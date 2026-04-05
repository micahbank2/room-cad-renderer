---
phase: 07-placement-interaction-fixes
plan: 01
subsystem: canvas-tools
tags: [edit-10, edit-11, edit-13]
requires: [wallTool, doorTool, windowTool]
provides: [placement preview, tool auto-revert, live wall length label]
affects:
  - src/canvas/tools/wallTool.ts
  - src/canvas/tools/doorTool.ts
  - src/canvas/tools/windowTool.ts
decisions:
  - "Preview rectangle shown on mousemove using same geometry as the actual opening renderer — wysiwyg."
  - "Length label is a Fabric Group (Rect+Text) so we can style it consistently with the Obsidian theme."
  - "EDIT-12 and EDIT-14 deferred — scope larger than anticipated."
metrics:
  completed: 2026-04-05
  duration: ~15m
  requirements_closed: [EDIT-10, EDIT-11, EDIT-13]
  requirements_deferred: [EDIT-12, EDIT-14]
---

# Phase 7 Summary: Placement & Interaction Fixes

Three UX improvements for the 2D canvas drawing tools:

1. **Live placement preview (EDIT-10)**: door and window tools now show
   a translucent preview rectangle on the wall as you hover, using
   the same geometry that will be rendered when you click. No more
   surprises — you see exactly where the opening will land.

2. **Tool auto-revert (EDIT-11)**: after placing one wall, door, or
   window, the active tool switches back to Select automatically.
   Eliminates the "why is it still in wall mode?" confusion.

3. **Live wall-length label (EDIT-13)**: while drawing a wall, a small
   Obsidian-themed label shows the current length in feet+inches at
   the midpoint of the preview line. Updates continuously as you move
   the cursor.

## Deferred

- **EDIT-12 (rotate placed walls/doors/windows)**: scope creep — wall
  rotation breaks shared endpoints with other walls, and doors/windows
  don't rotate independently. Needs a dedicated design pass.
- **EDIT-14 (live size tag while resizing products)**: no resize
  handles exist on products yet. Adding them requires per-placement
  dimension overrides on PlacedProduct. Deferred to Phase 7.1.

## Implementation notes

- Both door and window tools factor preview logic into local helpers
  `updatePreview()` and `clearPreview()`. Same geometry as fabricSync
  opening renderer, just with dashed stroke.
- Wall-tool length label uses `formatFeet()` for consistent display
  (e.g., "6'-8\"").
- All tool cleanups now clear their respective preview/label objects.
