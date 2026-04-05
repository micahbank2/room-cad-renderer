---
phase: 10-edit-handles
plan: 01
subsystem: canvas-tools
tags: [edit-15, edit-16, edit-17, edit-18, edit-19]
requirements_closed: [EDIT-15, EDIT-16, EDIT-17, EDIT-18, EDIT-19]
affects:
  - src/stores/cadStore.ts
  - src/canvas/wallEditHandles.ts
  - src/canvas/openingEditHandles.ts
  - src/canvas/fabricSync.ts
  - src/canvas/tools/selectTool.ts
metrics:
  completed: 2026-04-05
  duration: ~25m
---

# Phase 10 Summary

Closes EDIT-15 through EDIT-19 — the final Phase in v1.1. Users can
now post-edit walls, doors, and windows with Google-Slides-style
handles.

## What shipped

**Wall endpoint handles (EDIT-15):** Square handles at start and end
of selected walls. Drag moves only that endpoint; the other stays
fixed. Grid snap honored.

**Wall thickness handle (EDIT-16):** Circle on the wall's right edge
at midpoint. Dragging perpendicular to the wall adjusts thickness
via projected signed distance. Clamped 0.1–3 ft.

**Opening resize handles (EDIT-17):** Each door/window on the
selected wall shows 2 small orange squares at its left and right
edges along the wall centerline. Drag either to resize the opening's
width while keeping the opposite edge fixed. Minimum 0.5 ft.

**Opening slide handle (EDIT-18):** Orange circle at each opening's
center. Drag to slide the opening along its host wall (width kept
constant), clamped so the opening never overhangs wall bounds.

**Live dimension tags (EDIT-19):** Generic updateTextTag helper
replaces the old sizeTag; shows current length/thickness/width in
feet+inches anchored to the wall or opening during any drag.

## Data-model additions

- `updateWallNoHistory(id, changes)` — drag-friendly partial update
- `updateOpening(wallId, openingId, changes)` — with history
- `updateOpeningNoHistory(wallId, openingId, changes)` — drag-friendly

## Files

- **New:** wallEditHandles.ts, openingEditHandles.ts
- **Modified:** cadStore.ts (+3 actions), fabricSync.ts (render handles),
  selectTool.ts (6 new drag branches, updateTextTag helper)
