---
phase: 53-ctxmenu-01-right-click-context-menus
plan: 01
subsystem: canvas-interaction
tags: [context-menu, right-click, 2d-canvas, 3d-canvas, fabric, r3f, clipboard, uiStore]
dependency_graph:
  requires: [Phase 31 copy-paste, Phase 46 hiddenIds+focusDispatch, Phase 48 saved-camera bridge, Phase 33 design tokens]
  provides: [CTXMENU-01 right-click menus, clipboardActions shared module, uiStore.contextMenu slice]
  affects: [src/lib/shortcuts.ts, src/stores/uiStore.ts, src/canvas/FabricCanvas.tsx, src/three/WallMesh.tsx, src/three/ProductMesh.tsx, src/three/CeilingMesh.tsx, src/three/ThreeViewport.tsx, src/App.tsx, src/components/PropertiesPanel.tsx]
tech_stack:
  added: [CanvasContextMenu component, clipboardActions.ts shared module]
  patterns: [getActionsForKind registry, auto-flip useLayoutEffect, 5-close-path pattern, button=2 guard in native mousedown, R3F onContextMenu stopPropagation pattern]
key_files:
  created:
    - src/lib/clipboardActions.ts
    - src/components/CanvasContextMenu.tsx
    - tests/lib/contextMenuActions.test.ts
    - tests/lib/contextMenuActionCounts.test.ts
    - e2e/canvas-context-menu.spec.ts
  modified:
    - src/lib/shortcuts.ts
    - src/stores/uiStore.ts
    - src/components/PropertiesPanel.tsx
    - src/canvas/FabricCanvas.tsx
    - src/three/WallMesh.tsx
    - src/three/ProductMesh.tsx
    - src/three/CeilingMesh.tsx
    - src/three/ThreeViewport.tsx
    - src/App.tsx
decisions:
  - "clipboardActions.ts extracted from shortcuts.ts to avoid coupling context menu to the keyboard registry (D-01)"
  - "getActionsForKind exported from CanvasContextMenu for unit testing (post-Task 2 D-02 contract)"
  - "2D uses getObjects()+containsPoint() not findTarget() because evented:false objects (PERF-01) are skipped by findTarget"
  - "Window resize test uses dispatchEvent(new Event('resize')) not setViewportSize — more reliable in Playwright headless"
  - "Phase 52 regression check uses [role=dialog] not getByText('SHORTCUTS') — strict mode violation with 4 text matches"
metrics:
  duration_minutes: 11
  completed_date: "2026-04-27"
  tasks_completed: 5
  tasks_total: 5
  files_created: 5
  files_modified: 9
---

# Phase 53 Plan 01: Right-Click Context Menus (CTXMENU-01) Summary

**One-liner:** Right-click context menus on 2D+3D canvas objects using extracted clipboardActions module, uiStore.contextMenu slice, single CanvasContextMenu component with getActionsForKind registry, and native button=2 + R3F onContextMenu wiring across both canvases.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Extract clipboardActions.ts + add uiStore contextMenu/pendingLabelFocus slices | 9e618ab |
| 2 | CanvasContextMenu component + PropertiesPanel pendingLabelFocus + App.tsx mount | 81af1f5 |
| 3 | 2D wiring — FabricCanvas native mousedown button=2 handler | f26b26a |
| 4 | 3D wiring — WallMesh, ProductMesh, CeilingMesh onContextMenu + ThreeViewport Canvas empty | d480e39 |
| 5 | E2E spec — 8 Playwright scenarios for CTXMENU-01 | a7665e2 |

## Verification Results

- `npx tsc --noEmit` — exits 0 (only pre-existing TS5101 deprecation warning)
- `npx vitest run tests/lib/contextMenuActions.test.ts` — 5 pass (1 clipboard + 4 auto-flip math)
- `npx vitest run tests/lib/contextMenuActionCounts.test.ts` — 5 pass (D-02 action count contract)
- `npx vitest run tests/lib/shortcuts.registry.test.ts` — 3 pass (Phase 52 registry unchanged)
- `npx vitest run` — 4 failed (pre-existing), 658 passed (no new failures)
- `npx playwright test e2e/canvas-context-menu.spec.ts --project=chromium-dev` — 8 pass
- `npx playwright test e2e/ --project=chromium-dev` — 37 pass (no regressions)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] focusDispatch takes full objects, not just IDs**
- **Found during:** Task 2
- **Issue:** Plan template showed `focusOnWall(wallId)` but actual Phase 46 exports take `focusOnWall(wall: WallSegment)`. CanvasContextMenu must look up full objects from store.
- **Fix:** Added `doc = getActiveRoomDoc()` lookup in getActionsForKind; for product and custom element, used dynamic imports to avoid circular dependencies at module level.
- **Files modified:** src/components/CanvasContextMenu.tsx

**2. [Rule 1 - Bug] Empty describe() block caused vitest "No test found in suite" failure**
- **Found during:** Task 1
- **Issue:** The commented-out action count tests inside `describe("action set lengths")` caused vitest to error on the empty suite.
- **Fix:** Moved action count tests to separate file `tests/lib/contextMenuActionCounts.test.ts` (created in Task 2).

**3. [Rule 1 - Bug] E2E scenario 7 (resize) failed with setViewportSize**
- **Found during:** Task 5
- **Issue:** `page.setViewportSize()` in Playwright does not reliably dispatch a DOM `resize` event to the page's window object. The menu stayed open.
- **Fix:** Used `page.evaluate(() => window.dispatchEvent(new Event("resize")))` instead.

**4. [Rule 1 - Bug] E2E scenario 8 (Phase 52 regression) failed with strict-mode violation**
- **Found during:** Task 5
- **Issue:** `getByText("SHORTCUTS")` matched 4 elements (tab button, h2, prose text, description). Playwright strict mode rejects ambiguous locators.
- **Fix:** Used `page.locator('[role="dialog"]').first()` to target the help modal dialog.

## Known Stubs

None — all actions wire to existing store functions. The `focusCamera` action in CanvasContextMenu uses dynamic imports for product/custom-element lookups; these resolve correctly at runtime since productStore and cadStore are loaded before any canvas interaction.

## Self-Check: PASSED

- FOUND: src/lib/clipboardActions.ts
- FOUND: src/components/CanvasContextMenu.tsx
- FOUND: tests/lib/contextMenuActions.test.ts
- FOUND: tests/lib/contextMenuActionCounts.test.ts
- FOUND: e2e/canvas-context-menu.spec.ts
- FOUND commit 9e618ab (task 1)
- FOUND commit 81af1f5 (task 2)
- FOUND commit f26b26a (task 3)
- FOUND commit d480e39 (task 4)
- FOUND commit a7665e2 (task 5)
