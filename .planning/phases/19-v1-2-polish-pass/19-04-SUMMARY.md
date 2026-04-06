---
phase: 19-v1-2-polish-pass
plan: "04"
subsystem: canvas/selectTool + components/PropertiesPanel
tags: [multi-select, bulk-paint, POLISH-05]
dependency_graph:
  requires: [19-01]
  provides: [cmd-click-multi-select, bulk-wall-paint]
  affects: [selectTool, PropertiesPanel]
tech_stack:
  added: []
  patterns: [isMetaClick-toggle, bulk-action-panel, setWallpaper-loop]
key_files:
  created: []
  modified:
    - src/canvas/tools/selectTool.ts
    - src/components/PropertiesPanel.tsx
decisions:
  - isMetaClick variable defined once at top of onMouseDown combining metaKey and ctrlKey — reused in both guard and toggle block
  - Meta-click does not initiate drag; returns early after adjusting selection
  - Bulk paint applies to both wall sides (A and B) in one onChange call for consistency
metrics:
  duration_seconds: 72
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
  completed_date: "2026-04-06"
---

# Phase 19 Plan 04: Cmd+click Multi-Select Summary

Cmd+click (Mac) / Ctrl+click (Win) multi-select in the 2D canvas with bulk paint and delete actions in the properties panel.

## What Was Built

**selectTool.ts** — multi-select toggle support:
- `isMetaClick` flag computed at top of `onMouseDown` using `metaKey || ctrlKey`
- Single-selection handle checks (rotate, resize, wall endpoint, wall thickness, opening handles) guarded with `!isMetaClick` so meta-click never accidentally starts a drag
- When `isMetaClick` and `hit` exists: toggle item — deselect if already in selection (via `select(filtered)`), add if not (via `addToSelection`)
- Meta-click returns early without setting `dragging = true`
- Normal click replaces selection as before; clicking empty space still clears

**PropertiesPanel.tsx** — bulk actions panel:
- When `selectedIds.length > 1`: render `BULK_ACTIONS` panel instead of single-item panel
- Count display: `N ITEMS_SELECTED (M WALLS)` — counts wall subset separately
- `PAINT_ALL_WALLS` section (shown only when at least one wall is selected): color picker that calls `setWallpaper(id, "A", ...)` and `setWallpaper(id, "B", ...)` for every selected wall on each `onChange`
- `DELETE_ALL (N)` button — removes all selected items via `removeSelected`
- Single-item panel behavior is unchanged

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | d2b4df2 | Add Cmd+click multi-select to selectTool |
| 2 | c0741e3 | Bulk actions panel in PropertiesPanel for multi-selected walls |

## Deviations from Plan

None — plan executed exactly as written.

The `isMetaClick` check is defined once at the top of `onMouseDown` and reused in both the handle-check guard (`!isMetaClick`) and the hit toggle block (`if (isMetaClick)`). This is cleaner than duplicating the expression and satisfies the behavioral requirements.

## Known Stubs

None — multi-select and bulk paint are fully wired.

## Self-Check: PASSED

- `src/canvas/tools/selectTool.ts` — modified (grep: isMetaClick line 305, addToSelection call line 433)
- `src/components/PropertiesPanel.tsx` — modified (grep: BULK_ACTIONS, PAINT_ALL_WALLS, ITEMS_SELECTED, selectedIds.length > 1 — all 1 match each)
- Build passes: `bun run build` — no type errors
- Commits d2b4df2, c0741e3 present in git log
