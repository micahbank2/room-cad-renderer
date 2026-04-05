---
phase: 11-ceilings
plan: 01
subsystem: elements
tags: [ceil-01, ceil-02, ceil-03, ceil-04, polygon, overhead]
requires: [cadStore, FabricCanvas, ThreeViewport]
provides: [Ceiling type, ceiling tool, 2D polygon rendering, 3D ShapeGeometry rendering]
affects:
  - src/types/cad.ts
  - src/stores/cadStore.ts
  - src/canvas/tools/ceilingTool.ts (new)
  - src/canvas/fabricSync.ts
  - src/canvas/FabricCanvas.tsx
  - src/three/CeilingMesh.tsx (new)
  - src/three/ThreeViewport.tsx
  - src/components/Toolbar.tsx
  - src/components/StatusBar.tsx
  - src/App.tsx
decisions:
  - "Ceilings stored per-room on RoomDoc.ceilings (optional Record<string, Ceiling>)"
  - "Ceiling = polygon (array of Points) + height + material. Height defaults to room.wallHeight."
  - "Drawing: click-click polygon tool (similar to wall tool). Close by clicking first vertex, double-clicking, or pressing Enter. Escape cancels."
  - "Auto-revert to Select after closing the polygon."
  - "2D render: translucent dashed polygon with wall-color fill."
  - "3D render: THREE.ShapeGeometry + mesh at height with DoubleSide material."
  - "Material is string — hex color or catalog id (stubbed for now; full catalog comes in Phase 12/13)."
  - "Tool palette gets new CEILING button (roofing icon) with C keyboard shortcut."
metrics:
  requirements_closed: [CEIL-01, CEIL-02, CEIL-03, CEIL-04]
---

# Phase 11 Plan: Ceilings

## Goal

Jessica can draw ceilings as independent polygon surfaces with editable height + material, and see them overhead in 3D.

## Tasks

- [x] Add `Ceiling` interface to src/types/cad.ts
- [x] Add `ceilings?: Record<string, Ceiling>` to RoomDoc
- [x] Add `ceiling` to ToolType union
- [x] Add addCeiling/updateCeiling/removeCeiling actions to cadStore
- [x] Add useActiveCeilings selector with stable empty-object default (avoid infinite render loop)
- [x] Create src/canvas/tools/ceilingTool.ts (click to add vertices, close via first-click/dblclick/Enter)
- [x] Wire ceilingTool into FabricCanvas activateCurrentTool + deactivateAllTools
- [x] renderCeilings(fc, ceilings, scale, origin, selectedIds) in fabricSync
- [x] Call renderCeilings in FabricCanvas redraw
- [x] Create src/three/CeilingMesh.tsx (ShapeGeometry + horizontal mesh)
- [x] Render ceilings in ThreeViewport
- [x] Add CEILING button to ToolPalette + TOOL_SHORTCUTS
- [x] Wire `c` key in App.tsx keyboard handler
- [x] Add ceiling status message to StatusBar

## Verification

- [x] Click CEILING tool → cursor changes to crosshair, status bar shows instructions
- [x] Click points on canvas → vertices appear as purple circles, solid edges between them, dashed closing edge back to first vertex
- [x] Click near first vertex → polygon closes, ceiling created, tool reverts to Select
- [x] Double-click or Enter → closes polygon too
- [x] Escape → cancels, no ceiling created
- [x] Ceiling renders in 2D as translucent dashed polygon
- [x] Ceiling renders in 3D as horizontal surface at stored height
- [x] Ceiling height defaults to room.wallHeight when created
