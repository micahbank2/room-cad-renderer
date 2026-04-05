---
phase: 08-home-save-tabs
plan: 01
subsystem: ui-shell
tags: [home-01, home-02, home-03, save-04, ui-01]
requirements_closed: [HOME-01, HOME-02, HOME-03, SAVE-04, UI-01]
affects:
  - src/components/WelcomeScreen.tsx
  - src/components/TemplatePickerDialog.tsx (new)
  - src/components/Toolbar.tsx
  - src/components/StatusBar.tsx
  - src/canvas/FabricCanvas.tsx
  - src/stores/cadStore.ts
  - src/types/cad.ts
  - src/App.tsx
metrics:
  completed: 2026-04-05
  duration: ~20m
---

# Phase 8 Summary

Closes 5 requirements: HOME-01 (2-CTA welcome), HOME-02 (FLOOR_PLAN tab),
HOME-03 (working template browser), SAVE-04 (prominent save status),
UI-01 (broken tabs removed).

## What shipped

**Welcome screen rewrite** (HOME-01 + UI-01): Clean hero with just
OBSIDIAN_CAD brand at top, big DESIGN_YOUR_SPACE title, and two
primary CTAs side-by-side. The fake LAYERS/ASSETS/MEASURE/HISTORY
decorations are gone.

**TemplatePickerDialog** (HOME-03): New modal with 4 template tiles
(Blank, Living Room, Bedroom, Kitchen). Reuses existing ROOM_TEMPLATES.
`showUploadOptions` prop adds Upload Image and Remove Image tiles
for in-app use. Opens from both the welcome screen and FLOOR_PLAN tab.

**FLOOR_PLAN top tab** (HOME-02): New button in the Toolbar between
the brand and the view tabs. Clicking opens TemplatePickerDialog with
upload options enabled.

**Upload flow**: `floorPlanImage?: string` field on RoomDoc stores
the image as a dataURL. `setFloorPlanImage` action in cadStore.
FabricCanvas renders it at 45% opacity behind the grid, scaled to
fit the room's width/length, cached via a module-level Map.

**Prominent save status** (SAVE-04): Moved from 9px StatusBar text
to a 10px Toolbar badge with cloud_done icon (SAVED) or spinning
progress_activity icon (SAVING). Success-color green. Min-width
prevents layout jitter during state transitions.
