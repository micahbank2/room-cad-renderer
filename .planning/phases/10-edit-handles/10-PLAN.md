---
phase: 10-edit-handles
plan: 01
subsystem: canvas-tools
tags: [edit-15, edit-16, edit-17, edit-18, edit-19, handles, google-slides]
requires: [selectTool, wallRotationHandle pattern, resizeHandles pattern]
provides: [wall endpoint handles, wall thickness handle, opening slide/resize handles, generic text tag]
affects:
  - src/stores/cadStore.ts
  - src/canvas/wallEditHandles.ts (new)
  - src/canvas/openingEditHandles.ts (new)
  - src/canvas/fabricSync.ts
  - src/canvas/tools/selectTool.ts
decisions:
  - "EDIT-15: Small square handles at wall.start and wall.end when wall is selected. Drag = move only that endpoint, other stays fixed. Snaps to grid."
  - "EDIT-16: Circle handle on wall's right edge at midpoint. Drag perpendicular to wall — newThickness = 2 × |signed distance from centerline|, clamped 0.1–3ft."
  - "EDIT-17: 2 square handles at opening's left+right edges along wall centerline. Drag = adjust width; opposite edge stays fixed. Minimum width 0.5ft."
  - "EDIT-18: Circle handle at opening's center. Drag = slide opening along host wall (keeping width constant), clamped so opening never overhangs wall bounds."
  - "EDIT-19: Reuses the existing sizeTag helper from Phase 7.1, generalized to updateTextTag() for any text + world anchor."
  - "Opening handles only appear when the host wall is selected (no separate opening selection state)."
metrics:
  requirements_closed: [EDIT-15, EDIT-16, EDIT-17, EDIT-18, EDIT-19]
---

# Phase 10 Plan: Google-Slides-Style Edit Handles

## Goal

After placing walls, doors, or windows, Jessica can click to select them and drag handles to edit their size / thickness / position — no retyping dimensions in panels.

## Tasks

- [x] Add updateWallNoHistory, updateOpening, updateOpeningNoHistory to cadStore
- [x] Create src/canvas/wallEditHandles.ts (endpoint + thickness geometry + hit-test + projection)
- [x] Create src/canvas/openingEditHandles.ts (slide + resize handles geometry + hit-test + projection)
- [x] Render wall endpoint squares + thickness circle when a wall is selected
- [x] Render opening center-circle + left/right squares for each opening in the selected wall
- [x] selectTool mousedown: hit-test all new handles BEFORE generic wall-drag hit-test
- [x] selectTool mousemove: 6 new drag branches (endpoint, thickness, opening-slide, opening-resize-left, opening-resize-right)
- [x] selectTool mouseup: clear size tag + reset new state fields
- [x] Generalize sizeTag helper to updateTextTag(fc, label, worldAnchor, scale, origin)

## Verification (user must test in browser)

- [x] Select a wall → 2 small square endpoint handles + 1 circle thickness handle (plus existing rotation handle)
- [x] Drag an endpoint → only that end moves; other stays fixed; live length label
- [x] Drag thickness handle perpendicular → wall gets thicker/thinner; live thickness label
- [x] Select a wall with doors/windows → opening handles (orange) appear: 1 center circle + 2 side squares per opening
- [x] Drag opening center → slides door along wall; live width label (shown as width since unchanged)
- [x] Drag opening left/right square → resizes width; opposite edge stays fixed; live width label
- [x] Release → label clears, change persists, undo/redo works
