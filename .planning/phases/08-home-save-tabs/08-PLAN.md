---
phase: 08-home-save-tabs
plan: 01
subsystem: ui-shell
tags: [home-01, home-02, home-03, save-04, ui-01, welcome, template-picker]
requires: [WelcomeScreen, Toolbar, StatusBar, ROOM_TEMPLATES]
provides: [2-CTA welcome, TemplatePickerDialog, FLOOR_PLAN top tab, floorPlanImage bg, prominent save status]
affects:
  - src/components/WelcomeScreen.tsx (rewrite)
  - src/components/TemplatePickerDialog.tsx (new)
  - src/components/Toolbar.tsx
  - src/components/StatusBar.tsx
  - src/canvas/FabricCanvas.tsx
  - src/stores/cadStore.ts
  - src/types/cad.ts
  - src/App.tsx
decisions:
  - "HOME-01: two primary CTAs only (Create / Upload). Templates are a secondary choice inside the Create flow via TemplatePickerDialog."
  - "HOME-02: FLOOR_PLAN is a button (not a view mode). Opens TemplatePickerDialog with upload options."
  - "HOME-03: Template picker reuses existing ROOM_TEMPLATES. Blank room uses defaultSnapshot."
  - "UPLOAD_FLOOR_PLAN: image stored per-room as RoomDoc.floorPlanImage (dataURL). Rendered at 45% opacity behind grid on 2D canvas."
  - "SAVE-04: save status moved to Toolbar with cloud icon + larger font. Old 9px indicator in StatusBar removed."
  - "UI-01: broken LAYERS/ASSETS/MEASURE/HISTORY tabs removed from WelcomeScreen entirely (they were decorative, not functional)."
metrics:
  requirements_closed: [HOME-01, HOME-02, HOME-03, SAVE-04, UI-01]
---

# Phase 8 Plan: Home Page, Save Visibility, Tabs

## Goal

Welcome screen focuses Jessica on exactly two paths (create or upload), save state is obvious, and the fake tabs don't pretend to work.

## Tasks

- [x] Rewrite WelcomeScreen: minimal top bar, 2 CTAs (Create / Upload), no fake nav/sidebar
- [x] Create TemplatePickerDialog with 4 templates (Blank, Living Room, Bedroom, Kitchen)
- [x] Add showUploadOptions prop to dialog for Upload + Remove-Image tiles
- [x] Add floorPlanImage?: string to RoomDoc type
- [x] Add setFloorPlanImage action to cadStore (with history)
- [x] Render floorPlanImage as 45%-opacity background on 2D canvas
- [x] Add FLOOR_PLAN button to Toolbar opening TemplatePickerDialog (with upload options)
- [x] Move save status to Toolbar as ToolbarSaveStatus: cloud_done icon + "SAVED" or spinner + "SAVING"
- [x] Remove small SaveIndicator from StatusBar (now redundant)

## Verification

- [x] Welcome screen shows exactly 2 CTAs (CREATE_FLOOR_PLAN, UPLOAD_FLOOR_PLAN)
- [x] No broken LAYERS/ASSETS/MEASURE/HISTORY tabs anywhere
- [x] Clicking CREATE_FLOOR_PLAN → template picker with 4 options → pick one → canvas loads
- [x] Clicking UPLOAD_FLOOR_PLAN → file picker → image loads as canvas background
- [x] FLOOR_PLAN tab in toolbar opens same picker (with Upload Image + Remove Image tiles)
- [x] Save status visible in top toolbar with cloud icon, large enough to notice
