---
phase: 71-token-foundation-token-foundation
plan: "05"
subsystem: chrome-labels
tags: [label-sweep, D-09, D-10, casing]
dependency_graph:
  requires: ["71-02", "71-03"]
  provides: ["mixed-case-chrome-labels"]
  affects: ["src/components/**", "tests/"]
tech_stack:
  added: []
  patterns: ["Title Case chrome labels", "D-09 casing sweep"]
key_files:
  created: []
  modified:
    - src/components/Toolbar.tsx
    - src/components/Toolbar.WallCutoutsDropdown.tsx
    - src/components/WelcomeScreen.tsx
    - src/components/Sidebar.tsx
    - src/components/PropertiesPanel.tsx
    - src/components/PropertiesPanel.OpeningSection.tsx
    - src/components/PropertiesPanel.StairSection.tsx
    - src/components/RoomSettings.tsx
    - src/components/WallSurfacePanel.tsx
    - src/components/WainscotLibrary.tsx
    - src/components/WainscotPopover.tsx
    - src/components/MyTexturesList.tsx
    - src/components/AddRoomDialog.tsx
    - src/components/AddProductModal.tsx
    - src/components/help/helpContent.tsx
    - src/components/__tests__/Toolbar.displayMode.test.tsx
    - tests/PropertiesPanel.length.test.tsx
    - tests/AddProductModal.test.tsx
    - tests/App.restore.test.tsx
decisions:
  - "D-10 data-site preservation: fabricSync.ts WALL_SEGMENT_${id} and .toUpperCase() product/element names left unchanged; StatusBar dynamic values (SAVING/SAVED/SAVE_FAILED) left unchanged"
  - "Unit string suffix FT in Row value props preserved (data context, not chrome label)"
  - "SaveIndicator.test.tsx and SidebarProductPicker.test.tsx failures confirmed pre-existing before this plan — out of scope"
  - "Toolbar.displayMode active-class test pre-existing failure — not caused by label sweep"
  - "e2e specs use data-testid exclusively — no text selector updates needed"
metrics:
  duration: "11 minutes"
  completed_date: "2026-05-07T19:57:29Z"
  tasks: 2
  files: 19
---

# Phase 71 Plan 05: Label Casing Sweep Summary

Swept all UPPERCASE_SNAKE chrome labels in `src/components/` to mixed case per D-09, preserving dynamic CAD identifiers per D-10.

## What Was Built

- **19 files** modified (17 source, 3 test files updated to match)
- **~100+ label instances** converted across Toolbar, Sidebar, PropertiesPanel, RoomSettings, WallSurfacePanel, WainscotLibrary, AddProductModal, WelcomeScreen, helpContent, and sub-panels
- Brand name `OBSIDIAN CAD` → `Room CAD Renderer` in both Toolbar and WelcomeScreen
- Hero heading `DESIGN YOUR SPACE` → `Design Your Space`

## Label Mapping Applied

| Old | New |
|-----|-----|
| `SELECT` | `Select` |
| `WALL` | `Wall` |
| `DOOR` | `Door` |
| `WINDOW` | `Window` |
| `CEILING` | `Ceiling` |
| `STAIRS` | `Stairs` |
| `CUTAWAY` | `Cutaway` |
| `NORMAL` / `SOLO` / `EXPLODE` | `Normal` / `Solo` / `Explode` |
| `ARCHWAY` / `PASSTHROUGH` / `NICHE` | `Archway` / `Passthrough` / `Niche` |
| `ROOM_CONFIG` | `Room config` |
| `SYSTEM_STATS` | `System stats` |
| `LAYERS` | `Layers` |
| `SNAP` | `Snap` |
| `LENGTH` / `WIDTH` / `HEIGHT` / `DEPTH` | `Length` / `Width` / `Height` / `Depth` |
| `THICKNESS` | `Thickness` |
| `AREA` | `Area` |
| `WALLS` / `PRODUCTS` / `GRID` | `Walls` / `Products` / `Grid` |
| `OFF` / `3 INCH` / `6 INCH` / `1 FOOT` | `Off` / `3 inch` / `6 inch` / `1 foot` |
| `WAINSCOTING` | `Wainscoting` |
| `INTERIOR` | `Interior` |
| `SKIP DIMENSIONS` | `Skip dimensions` |
| `ADD TO REGISTRY` | `Add to registry` |
| `TEMPLATE` | `Template` |
| `UPLOAD` | `Upload` |
| `OBSIDIAN CAD` | `Room CAD Renderer` |
| `DESIGN YOUR SPACE` | `Design Your Space` |

## Data Preservation (D-10 Honored)

- `src/canvas/fabricSync.ts`: `WALL_SEGMENT_${id}` template strings untouched
- `src/canvas/fabricSync.ts`: `.toUpperCase()` calls on product/element name labels untouched
- `src/components/StatusBar.tsx`: dynamic values `READY`, `SAVED`, `SAVING`, `SAVE_FAILED`, `BUILDING_SCENE...` — NOT swept (Phase 28 contract preserved)
- `ToolbarSaveStatus`: `SAVING` / `SAVED` / `SAVE_FAILED` strings untouched (dynamic status, not chrome)
- Unit suffix `FT` in Row value strings (e.g. `${value} FT`) — preserved (data values, not labels)

## e2e Selector Audit (Task 2)

- **toHaveScreenshot**: 0 found — no OS-coupled goldens exist
- **Uppercase text selectors** in e2e specs: 0 found — all e2e specs use `data-testid` exclusively
- No selector updates were required

## Tests Fixed

3 unit test files updated to use new label strings:
- `Toolbar.displayMode.test.tsx`: aria-label assertions updated (NORMAL→Normal, etc.)
- `PropertiesPanel.length.test.tsx`: `openEditForLabel("LENGTH")` → `"Length"`, `"THICKNESS"` → `"Thickness"`
- `AddProductModal.test.tsx`: `"SKIP_DIMENSIONS"` → `"Skip dimensions"`, `"ADD_TO_REGISTRY"` → `"Add to registry"`
- `App.restore.test.tsx`: `"DESIGN YOUR SPACE"` → `"Design Your Space"`

## Pre-existing Failures (Not Caused by This Plan)

- `tests/SaveIndicator.test.tsx`: imports non-existent `@/components/SaveIndicator` — pre-existing
- `tests/SidebarProductPicker.test.tsx`: idb-keyval mock missing `createStore` — pre-existing
- `src/components/__tests__/Toolbar.displayMode.test.tsx` active-class test: expects `text-accent` but component uses `text-foreground` — pre-existing from prior phase

## Deviations from Plan

None — plan executed exactly as written. The e2e selector update pass (Task 2) found zero instances to update, which is the expected outcome per RESEARCH §Risk #5.

## Self-Check: PASSED

- SUMMARY.md: FOUND
- Task 1 commit 3e3a241: FOUND
- Build: passes (✓ built in 486ms)
- 19 modified files all present in repo
