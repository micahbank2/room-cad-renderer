---
phase: 74-toolbar-rework-floating-action-menu-toolbar-rework
plan: "03"
subsystem: App shell
tags: [toolbar, integration, cleanup]
dependency_graph:
  requires: [74-01, 74-02]
  provides: [App shell wired to FloatingToolbar + TopBar]
  affects: [src/App.tsx, src/components/Toolbar.tsx (deleted)]
tech_stack:
  added: []
  patterns: [component-swap, test-update]
key_files:
  created: []
  modified:
    - src/App.tsx
    - src/components/__tests__/Toolbar.displayMode.test.tsx
  deleted:
    - src/components/Toolbar.tsx
decisions:
  - "FloatingToolbar receives viewMode+onViewChange props (matching its actual Props interface)"
  - "pt-10 added to content div to offset fixed TopBar height"
  - "Toolbar.displayMode.test.tsx updated to import FloatingToolbar (display-mode buttons moved there)"
metrics:
  duration: "~5 minutes"
  completed: "2026-05-07"
  tasks_completed: 2
  files_changed: 3
---

# Phase 74 Plan 03: App.tsx Swap — FloatingToolbar + TopBar Summary

**One-liner:** App shell wired to FloatingToolbar glass pill + TopBar top bar, old Toolbar.tsx deleted with zero TypeScript errors.

## What Was Built

Swapped `src/App.tsx` to use the new Phase 74 toolbar components:
- Removed `Toolbar` and `ToolPalette` imports; added `TopBar` and `FloatingToolbar`
- Replaced `<Toolbar>` JSX with `<TopBar viewMode onViewChange onHome onFloorPlanClick>`
- Replaced `<ToolPalette />` with `<FloatingToolbar viewMode={viewMode} onViewChange={setViewMode} />`
- Added `pt-10` to the main content `div` so the fixed TopBar does not overlap the canvas
- Deleted `src/components/Toolbar.tsx` (586 lines removed)

## Tasks

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Update App.tsx imports and JSX | 9658b9c | src/App.tsx |
| 2 | Delete Toolbar.tsx and verify no remaining references | 9658b9c | src/components/Toolbar.tsx (deleted), src/components/__tests__/Toolbar.displayMode.test.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated Toolbar.displayMode.test.tsx to import FloatingToolbar**
- **Found during:** Task 2 (checking remaining Toolbar imports before deletion)
- **Issue:** `src/components/__tests__/Toolbar.displayMode.test.tsx` imported `{ Toolbar }` from the soon-to-be-deleted Toolbar.tsx. The display-mode segmented control buttons (display-mode-normal, display-mode-solo, display-mode-explode) have moved to FloatingToolbar in Plan 74-01.
- **Fix:** Updated import to `{ FloatingToolbar }` from `@/components/FloatingToolbar`, removed `onHome`/`onFloorPlanClick` from baseProps (not part of FloatingToolbar's Props interface), updated render helper to use FloatingToolbar.
- **Files modified:** `src/components/__tests__/Toolbar.displayMode.test.tsx`
- **Commit:** 9658b9c

## Known Stubs

None.

## Verification Results

- TypeScript errors: 0
- `src/components/Toolbar.tsx`: deleted (confirmed)
- `src/components/Toolbar.WallCutoutsDropdown.tsx`: still exists (untouched)
- No remaining `from "@/components/Toolbar"` imports outside WallCutoutsDropdown
- `src/App.tsx` contains: TopBar import, FloatingToolbar import, `<TopBar ...>` JSX, `<FloatingToolbar ...>` JSX, `pt-10` class

## Self-Check: PASSED

- src/App.tsx exists and contains correct imports + JSX
- src/components/Toolbar.tsx does not exist
- src/components/__tests__/Toolbar.displayMode.test.tsx updated
- Commit 9658b9c verified in git log
