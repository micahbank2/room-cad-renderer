---
phase: 74-toolbar-rework-floating-action-menu-toolbar-rework
plan: "01"
subsystem: ui-components
tags: [toolbar, floating-ui, tool-palette, phase-74]
dependency_graph:
  requires: []
  provides: [FloatingToolbar]
  affects: [App.tsx, Toolbar.WallCutoutsDropdown.tsx]
tech_stack:
  added: []
  patterns: [zustand-subscription, radix-tooltip, lucide-icons, glass-pill]
key_files:
  created:
    - src/components/FloatingToolbar.tsx
  modified:
    - src/components/Toolbar.WallCutoutsDropdown.tsx
decisions:
  - "viewMode accepted as prop (not from uiStore) since App.tsx owns viewMode state"
  - "TooltipProvider wrapped at FloatingToolbar root (not App root) for self-contained component"
  - "WallCutoutsDropdown direction=up uses rect.top-4 + translateY(-100%) to anchor at top of button and grow upward"
metrics:
  duration: "12m"
  completed: "2026-05-07"
  tasks_completed: 2
  files_changed: 2
---

# Phase 74 Plan 01: FloatingToolbar Glass Pill Summary

Glass pill toolbar component fixed at canvas bottom-center with two rows of tool buttons, using Radix Tooltip and lucide-react icons throughout.

## What Was Built

**FloatingToolbar** (`src/components/FloatingToolbar.tsx`) — a new component that:
- Is fixed at `bottom-6 left-1/2 -translate-x-1/2 z-50` with glass-morphism styling (`bg-background/90 backdrop-blur-md shadow-2xl`)
- Top row: Wall, Door, Window, Ceiling, Stair, Wall Cutouts trigger, Measure, Label, Product — size={22} icons
- Bottom row: Select, ZoomIn/Out/Fit, Undo, Redo, Grid toggle, Display Mode group, View Mode group
- Active state: `active` prop + `ring-1 ring-accent/40` class (no legacy `shadow-[0_0_15px_rgba(124,91,240,0.3)]`)
- Stair button calls `setPendingStair({rotation:0, widthFt:3, stepCount:12, riseIn:7, runIn:11})` before `setTool("stair")`
- All 20 data-testid attrs present; `view-mode-2d`, `view-mode-3d`, `view-mode-split` on individual `<Button>` elements
- `viewMode` + `onViewChange` accepted as props (App.tsx owns viewMode state)
- Zoom percentage display below bottom row

**WallCutoutsDropdown** (`src/components/Toolbar.WallCutoutsDropdown.tsx`) — direction prop added:
- `direction?: "up" | "down"` with default `"down"` for backward compat
- `"up"`: positions at `rect.top - 4` + `transform: translateY(-100%)` so dropdown grows upward from anchor
- FloatingToolbar passes `direction="up"` so dropdown doesn't go off-screen

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — FloatingToolbar is a complete implementation. It is not yet wired into App.tsx (that is the next plan in the phase).

## Self-Check: PASSED
