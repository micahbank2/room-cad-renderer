---
phase: 73-sidebar-restyle-sidebar-restyle
plan: "01"
subsystem: sidebar
tags: [ui, design-system, tree, sidebar]
dependency_graph:
  requires: []
  provides: [spine-branch-tree-geometry, panel-section-sidebar]
  affects: [src/components/RoomsTreePanel/TreeRow.tsx, src/components/Sidebar.tsx]
tech_stack:
  added: []
  patterns: [Pascal spine-and-branches geometry, PanelSection primitive]
key_files:
  created: []
  modified:
    - src/components/RoomsTreePanel/TreeRow.tsx
    - src/components/Sidebar.tsx
decisions:
  - Remove INDENT depth map in favor of uniform pl-8 on all tree rows
  - Active room state pushes after selected state so it overrides when both apply
metrics:
  duration: ~5m
  completed: 2026-05-07
  tasks_completed: 2
  files_modified: 2
---

# Phase 73 Plan 01: Tree Spine Geometry + Sidebar PanelSection Migration Summary

Pascal spine-and-branches tree geometry applied to TreeRow with revised hover/active states; Sidebar CollapsibleSection replaced with PanelSection primitive across all 5 sections.

## Files Modified

### src/components/RoomsTreePanel/TreeRow.tsx
- Deleted `INDENT` constant (depth-to-padding map)
- Row container: changed from `INDENT[depth]` to `pl-8` (uniform 32px left pad); added `relative`
- Hover: `hover:bg-accent` → `hover:bg-accent/30`
- Selected: `bg-secondary border-l-2 border-accent` → `bg-accent/20 text-accent-foreground`
- Active room: new push `bg-accent text-accent-foreground` (after selected push, so it wins when both apply)
- Added spine div: `absolute top-0 bottom-0 left-[21px] w-px bg-border/50 pointer-events-none`
- Added branch div: `absolute top-1/2 left-[21px] h-px w-[11px] bg-border/50 pointer-events-none`
- Phase 46/47/48 handlers (onClick, onDoubleClick, eye-icon, savedCamera) untouched

### src/components/Sidebar.tsx
- Removed local `CollapsibleSection` function and its props interface
- Removed unused `useState` import (was only used by CollapsibleSection)
- Added `import { PanelSection } from "@/components/ui"`
- Replaced all 5 section usages:
  - `<CollapsibleSection label="Room config">` → `<PanelSection id="sidebar-room-config" label="Room config">`
  - `<CollapsibleSection label="System stats" defaultOpen={false}>` → `<PanelSection id="sidebar-system-stats" label="System stats" defaultOpen={false}>`
  - `<CollapsibleSection label="Layers" defaultOpen={false}>` → `<PanelSection id="sidebar-layers" label="Layers" defaultOpen={false}>`
  - `<CollapsibleSection label="Snap" defaultOpen={false}>` → `<PanelSection id="sidebar-snap" label="Snap" defaultOpen={false}>`
  - `<CollapsibleSection label="Product library">` → `<PanelSection id="sidebar-product-library" label="Product library">`

## Test Results

All 44 tests passed (11 test files):
- tests/phase33/ — 44 tests passed (includes typography + spacing audit for Sidebar.tsx)
- tests/phase46/ — included in the run, all passed

TypeScript: no errors (only baseline TS5101 baseUrl deprecation warning, pre-existing).

## Deviations from Plan

None — plan executed exactly as written.

## Commit

b0f8238: feat(73-01): tree spine geometry + Sidebar PanelSection migration

## Self-Check: PASSED

- [x] TreeRow.tsx contains `left-[21px]` and `bg-border/50`
- [x] TreeRow.tsx contains `bg-accent/20 text-accent-foreground` (selected)
- [x] TreeRow.tsx contains `bg-accent text-accent-foreground` (active room)
- [x] TreeRow.tsx contains `hover:bg-accent/30`
- [x] TreeRow.tsx: INDENT constant removed
- [x] TreeRow.tsx: row container has `relative pl-8`
- [x] Sidebar.tsx: 0 occurrences of CollapsibleSection
- [x] Sidebar.tsx: PanelSection imported from @/components/ui
- [x] All 5 sections have correct id props
- [x] All phase33 + phase46 tests pass
