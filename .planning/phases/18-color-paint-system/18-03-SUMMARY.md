---
phase: 18-color-paint-system
plan: "03"
subsystem: paint-ui-components
tags: [paint, ui, swatchpicker, farrow-and-ball, react-colorful, wall-surface-panel, properties-panel]
dependency_graph:
  requires:
    - PaintColor type (src/types/paint.ts) — from Plan 01
    - FB_COLORS + HUE_FAMILIES catalog (src/data/farrowAndBall.ts) — from Plan 01
    - paintStore derived view (src/stores/paintStore.ts) — from Plan 01
    - cadStore paint actions: addCustomPaint, removeCustomPaint, applyPaintToAllWalls (src/stores/cadStore.ts) — from Plan 01
    - resolvePaintHex utility (src/lib/colorUtils.ts) — from Plan 01
    - Wallpaper.kind="paint" + Ceiling.paintId types (src/types/cad.ts) — from Plan 01
    - react-colorful package (installed in Plan 01)
  provides:
    - SwatchPicker shared component (src/components/SwatchPicker.tsx)
    - PaintSection wall-specific component (src/components/PaintSection.tsx)
    - CeilingPaintSection component (src/components/CeilingPaintSection.tsx)
    - Ceiling selection via point-in-polygon hit test in selectTool
  affects:
    - src/components/WallSurfacePanel.tsx (PaintSection mounted below WALLPAPER)
    - src/components/PropertiesPanel.tsx (CeilingPaintSection when ceiling selected)
    - src/canvas/tools/selectTool.ts (ceiling hit-testing added to hitTestStore)
tech_stack:
  added: []
  patterns:
    - SwatchPicker as shared composition root for both wall + ceiling paint UI
    - react-colorful HexColorPicker inline expand for custom color creation
    - setTimeout/clearTimeout tooltip with 300ms delay on swatch hover
    - Context menu via onContextMenu + fixed-position div + outside-click useEffect
    - Point-in-polygon ray casting (selectTool) for ceiling selection
    - useActiveCeilings hook in PropertiesPanel to detect ceiling selection
key_files:
  created:
    - src/components/SwatchPicker.tsx
    - src/components/PaintSection.tsx
    - src/components/CeilingPaintSection.tsx
  modified:
    - src/components/WallSurfacePanel.tsx
    - src/components/PropertiesPanel.tsx
    - src/canvas/tools/selectTool.ts
decisions:
  - Ceiling selection implemented via point-in-polygon in selectTool (not Fabric hit-test) — consistent with wall/product hit-testing pattern; ceilings set dragging=false so they're select-only
  - PropertiesPanel detects ceiling by checking useActiveCeilings()[selectedId] — zero new store state needed
  - PaintSection position: below WALLPAPER, above WAINSCOTING per D-01 in UI-SPEC
  - CeilingPaintSection has no APPLY_TO_ALL_WALLS button — that's wall-only per plan spec
  - Tooltip uses clientX/Y + fixed positioning to avoid scroll offset issues in sidebar
metrics:
  duration: ~25 minutes
  completed: 2026-04-06
  tasks: 2 of 2
  files_created: 3
  files_modified: 3
  tests_added: 0
  tests_passing: 140
---

# Phase 18 Plan 03: Paint Picker UI Components Summary

**One-liner:** Full paint picker UI wired end-to-end — SwatchPicker shared component with F&B 132-swatch grid, hue filter, search, recently-used row, and custom color creation; PaintSection for walls; CeilingPaintSection for ceilings; ceiling selection via point-in-polygon.

## What Was Built

### Task 1: SwatchPicker + PaintSection

**src/components/SwatchPicker.tsx:**
- Reads `recentPaints` from cadStore (via `(s as any).recentPaints`) — last 8 applied colors
- Reads `customColors` from paintStore (derived view of cadStore.customPaints)
- **RECENTLY_USED row:** 18×18px swatch buttons per recent paintId, resolved via `resolvePaintHex`
- **HUE_FILTER chips:** 7 × 14×14px chips (WHITES, NEUTRALS, BLUES, GREENS, PINKS, YELLOWS, BLACKS); click toggles; same chip click clears filter
- **SEARCH_BY_NAME input:** real-time case-insensitive contains filter against F&B name
- **F&B_CATALOG grid:** `grid-cols-8 gap-1 max-h-40 overflow-y-auto` — 20×20px swatches; applied swatch gets `ring-2 ring-accent ring-offset-1`; hover tooltip after 300ms delay
- **MY_COLORS section:** custom swatches in flex row; right-click opens context menu with DELETE (calls `removeCustomPaint`)
- **+ ADD_COLOR / inline form:** `HexColorPicker` at 160×120px + name input + SAVE_COLOR button (disabled when name empty); Enter key saves
- State: `activeHue`, `search`, `showAddForm`, `newName`, `newHex`, `deleteMenuId`, `tooltipId`

**src/components/PaintSection.tsx:**
- Props: `wallId: string`, `side: WallSide`, `currentWallpaper?: Wallpaper`
- Renders `<SwatchPicker>` with `activePaintId={currentWallpaper?.paintId}`
- `onSelectPaint` → calls `setWallpaper(wallId, side, { kind: "paint", paintId, limeWash })`
- **LIME_WASH_FINISH checkbox:** disabled when `kind !== "paint"`; calls `setWallpaper` with toggled limeWash
- **APPLY_TO_ALL_WALLS button:** disabled when no paint applied; calls `applyPaintToAllWalls(paintId, side)`

### Task 2: CeilingPaintSection + Panel Mounting

**src/components/CeilingPaintSection.tsx:**
- Props: `ceilingId: string`, `ceiling: Ceiling`
- Renders `<SwatchPicker>` with `activePaintId={ceiling.paintId}`
- `onSelectPaint` → calls `updateCeiling(ceilingId, { paintId })`
- **LIME_WASH_FINISH checkbox:** disabled when no paintId; calls `updateCeiling(ceilingId, { limeWash })`
- No APPLY_TO_ALL_WALLS button (wall-only feature)

**WallSurfacePanel.tsx:**
- Added `import PaintSection from "./PaintSection"`
- Mounted `<PaintSection wallId={wall.id} side={activeSide} currentWallpaper={wp} />` between WALLPAPER and WAINSCOTING sections

**PropertiesPanel.tsx:**
- Added `import { useActiveCeilings } from "@/stores/cadStore"` + `import CeilingPaintSection`
- `const ceilings = useActiveCeilings()` + `const ceiling = id ? ceilings[id] : undefined`
- Guard condition: `if (!wall && !pp && !ceiling) return null`
- Ceiling display block: shows CEILING_id, height, vertex count, then `<CeilingPaintSection>`

**selectTool.ts:**
- Added `pointInPolygon(pt, polygon)` — ray-casting implementation for ceiling selection
- `hitTestStore` return type extended to include `"ceiling"`
- Ceiling hit-testing loop added before wall hit-test: iterates `doc.ceilings`, checks `pointInPolygon`
- `onMouseDown`: when `hit.type === "ceiling"`, selects the ceiling id but sets `dragging=false` (ceilings are select-only, not draggable)

## Verification

TypeScript: Clean (`tsc --noEmit` exits 0, only pre-existing baseUrl deprecation warning).

Tests: 140 pass, 1 pre-existing failure (SidebarProductPicker drag test — documented in Plan 01 as happy-dom behavioral difference, out of scope).

Build: `vite build` succeeds, 673 modules transformed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Ceiling selection required for CeilingPaintSection to appear**

- **Found during:** Task 2
- **Issue:** The plan specified "CeilingPaintSection appears in PropertiesPanel when ceiling is selected" but ceilings were not selectable — `hitTestStore` in selectTool only tested walls and products. Without ceiling selection, the CeilingPaintSection would never render.
- **Fix:** Added `pointInPolygon()` ray-casting to `hitTestStore` in selectTool; ceilings now appear in `selectedIds`; PropertiesPanel uses `useActiveCeilings()[id]` to detect and display ceiling properties.
- **Files modified:** `src/canvas/tools/selectTool.ts`, `src/components/PropertiesPanel.tsx`
- **Commits:** b55b658

## Known Stubs

None. All paint UI flows are wired end-to-end:
- Swatch click → `setWallpaper` or `updateCeiling` → cadStore mutation → 2D+3D re-render (from Plan 02)
- Recently-used row reads real `cadStore.recentPaints` (updated by setWallpaper/updateCeiling in Plan 01)
- Custom color add/delete → `addCustomPaint`/`removeCustomPaint` → cadStore with undo history
- Apply-to-all → `applyPaintToAllWalls` → all wall sides painted in one undo-safe step

## Self-Check: PASSED
