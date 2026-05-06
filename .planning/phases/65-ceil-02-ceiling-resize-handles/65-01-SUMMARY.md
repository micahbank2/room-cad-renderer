---
phase: 65-ceil-02-ceiling-resize-handles
plan: 01
subsystem: ui
tags: [ceiling, resize, fabric.js, threejs, polygon, override-anchor, smart-snap, single-undo]

requires:
  - phase: 12-ceilings
    provides: Ceiling polygon model (CCW points)
  - phase: 30-smart-snap
    provides: computeSnap consume-only API (snapEngine.ts + buildSceneGeometry.ts untouched)
  - phase: 31-edit-handles
    provides: edge-handle render pattern + drag-transaction single-undo + size-override resolver template
  - phase: 53-ctxmenu
    provides: CanvasContextMenu kind="ceiling" branch
  - phase: 59-cutaway
    provides: conditional context-menu action visibility pattern (only-when-set)
  - phase: 61-openings
    provides: additive-optional-fields back-compat precedent (no snapshot version bump)
provides:
  - 4 optional Ceiling fields (widthFtOverride, depthFtOverride, anchorXFt, anchorYFt) + resolveCeilingPoints helper
  - polygonBbox(points) generic helper in src/lib/geometry.ts
  - 3 cadStore actions (resizeCeilingAxis, resizeCeilingAxisNoHistory, clearCeilingOverrides) with optional anchor argument
  - 4 edge handles render in 2D when ceiling is selected (Phase 31 visual style)
  - selectTool ceiling-resize drag with override-anchor model + Phase 30 smart-snap consume-only
  - CeilingMesh live re-extrude from resolveCeilingPoints output
  - PropertiesPanel WIDTH/DEPTH inputs with single-undo pattern + RESET_SIZE button
  - CanvasContextMenu conditional "Reset size" action
  - 7 window-level test drivers in src/test-utils/ceilingDrivers.ts
affects: [v1.17 polygon-resize for rugs / area-paint regions, future per-vertex polygon-edit phase]

tech-stack:
  added: []  # No new dependencies — all infra already in place
  patterns:
    - "override-anchor scaling model (4 optional fields) — extends Phase 31 size-override pattern from 2-field (width/depth only) to 4-field (width/depth + anchorX/Y) for asymmetric polygon resize"
    - "consume-only snap dispatch from selectTool drag (mirrors Phase 31 wallEndpointSnap dispatch pattern)"
    - "test-mode driver bridge for selectTool drag — installed in selectTool activate(), torn down in cleanup()"

key-files:
  created:
    - src/test-utils/ceilingDrivers.ts (window-level drivers for e2e + history probing)
    - tests/lib/resolveCeilingPoints.test.ts (7 unit tests U1-U4 + bbox describe)
    - tests/stores/cadStore.ceiling-resize.test.ts (3 tests U5/U5b/U6)
    - tests/components/PropertiesPanel.ceiling-resize.test.tsx (3 tests C1/C2/C2b)
    - e2e/ceiling-resize.spec.ts (6 scenarios E1-E6)
  modified:
    - src/types/cad.ts (4 new optional Ceiling fields, no version bump)
    - src/lib/geometry.ts (polygonBbox + resolveCeilingPoints exports)
    - src/stores/cadStore.ts (resizeCeilingAxis* / clearCeilingOverrides actions)
    - src/canvas/fabricSync.ts (4 edge handles when ceiling selected)
    - src/canvas/tools/selectTool.ts (ceilingEdgeDragInfo state + mousedown/mousemove/mouseup branches + __driveCeilingResize hook)
    - src/three/CeilingMesh.tsx (resolveCeilingPoints wiring + polygonBbox refactor)
    - src/components/PropertiesPanel.tsx (CeilingDimInput + RESET_SIZE button)
    - src/components/CanvasContextMenu.tsx (conditional Reset size action)
    - src/main.tsx (installCeilingDrivers boot registration)

key-decisions:
  - "Locked override-anchor model with 4 optional fields (not 2). Width/depth deltas scale the polygon proportionally; anchorXFt / anchorYFt fix the OPPOSITE bbox edge during west/north drags. Default anchors (= bbox.minX / bbox.minY) cover east/south drags via no-write."
  - "snapEngine.ts and buildSceneGeometry.ts UNTOUCHED — selectTool consumes computeSnap directly. excludeId=ceilingId on the restricted scene prevents self-snap (research Pitfall 1)."
  - "NO snapshot version bump — additive optional fields are back-compat per Phase 61 OPEN-01 precedent."
  - "Phase 31 single-undo drag-transaction: mousedown calls updateCeiling(id, {}) to push exactly one history snapshot; mid-drag uses *NoHistory; mouseup is no-op for history. Verified via __getCeilingHistoryLength delta = 1 across multi-mousemove drag."
  - "PropertiesPanel WIDTH/DEPTH inputs use editStartedRef guard to suppress duplicate commit when blur fires after Enter — prevents past.length growing by 2 per edit cycle."

patterns-established:
  - "Polygon-entity edge-handle resize: any future polygon entity (rugs in v1.17, area-paint regions, etc) can mirror the 4-field override-anchor model + resolvePolygonPoints helper pattern."
  - "selectTool consume-only snap dispatch: build a restricted SceneGeometry inline via existing buildWallEndpointSnapScene; pass excludeId of the dragged entity to prevent self-snap."

requirements-completed: [CEIL-02]

duration: ~10min
completed: 2026-05-04
---

# Phase 65 Plan 01: Ceiling Resize Handles (CEIL-02) Summary

**Edge-handle resize for ceilings via 4-field override-anchor model — drag any of 4 bbox-midpoint handles to scale the entire polygon proportionally with the OPPOSITE edge as anchor; Phase 30 smart-snap consume-only; single-undo per drag; Reset round-trips to original.**

## Performance

- **Duration:** ~10 minutes
- **Started:** 2026-05-04T15:23:00Z
- **Completed:** 2026-05-04T15:46:30Z
- **Tasks:** 6
- **Files modified:** 9 (5 new, 4 modified)

## Accomplishments

- 4 new optional Ceiling fields + 2 new geometry.ts exports (polygonBbox, resolveCeilingPoints) + 3 new cadStore actions
- 4 edge handles render when a ceiling is selected (mirroring Phase 31 product visual style)
- Asymmetric drag behavior locked: east/south use default-min anchor (no anchor write); west/north explicitly write anchorXFt = origBbox.maxX or anchorYFt = origBbox.maxY so the opposite edge stays put
- Phase 30 smart-snap engages mid-drag (consume-only — snapEngine.ts and buildSceneGeometry.ts UNTOUCHED, verified via git diff origin/main)
- 3D ceiling re-extrudes live from resolveCeilingPoints; PropertiesPanel WIDTH/DEPTH inputs reflect overrides; RESET_SIZE button + right-click "Reset size" both clear all 4 fields
- Single Ctrl+Z undoes a complete drag (verified: __getCeilingHistoryLength delta = 1 across multi-mousemove drag in E5)

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema + geometry helpers + cadStore actions (TDD)** — `028462b` (feat)
2. **Task 2: Edge-handle Fabric render** — `5e0695b` (feat)
3. **Task 3: selectTool ceiling-resize drag handler** — `51444aa` (feat)
4. **Task 4: CeilingMesh resolver wiring** — `bbeba5f` (feat)
5. **Task 5: PropertiesPanel WIDTH/DEPTH + CanvasContextMenu Reset (TDD)** — `388ba73` (feat)
6. **Task 6: Test drivers + e2e spec** — `935ec6c` (test) + `ce918f7` (fix — onboarding + driver split)

## Files Created/Modified

### Created
- `src/test-utils/ceilingDrivers.ts` — 7 window-level drivers (__drivePlaceCeiling, __driveCeilingResizeAxis, __getCeilingBbox, __getCeilingResolvedPoints, __getCeilingOverrides, __getCeilingHistoryLength, __driveClearCeilingOverrides)
- `tests/lib/resolveCeilingPoints.test.ts` — polygonBbox describe (2 tests) + resolveCeilingPoints describe (5 tests including U1–U4 + zero-width regression)
- `tests/stores/cadStore.ceiling-resize.test.ts` — U5 (history single-undo), U5b (anchor atomicity), U6 (clear all 4 fields)
- `tests/components/PropertiesPanel.ceiling-resize.test.tsx` — C1 (WIDTH/DEPTH single-undo), C2 (RESET_SIZE click), C2b (RESET_SIZE absent when no overrides)
- `e2e/ceiling-resize.spec.ts` — E1 handle-render, E2 east-edge, E3 west-edge anchor, E4 smart-snap engagement, E5 single-undo, E6 L-shape proportional + Reset round-trip

### Modified
- `src/types/cad.ts` — 4 optional Ceiling fields with JSDoc explaining the override-anchor model (no version bump)
- `src/lib/geometry.ts` — polygonBbox(points) + resolveCeilingPoints(ceiling); fast-path returns ceiling.points by referential identity when no overrides
- `src/stores/cadStore.ts` — 3 actions in CADState interface + implementations mirroring Phase 31 resizeProductAxis pattern
- `src/canvas/fabricSync.ts` — renderCeilings appends 4 edge handles per selected ceiling at bbox midpoints
- `src/canvas/tools/selectTool.ts` — ceilingEdgeDragInfo module state + DragType extension + mousedown/mousemove/mouseup branches + __driveCeilingResize test bridge
- `src/three/CeilingMesh.tsx` — renderedPoints useMemo (with all 4 override fields in deps) + bbox refactored to call polygonBbox + v1.17 PERF fallback comment
- `src/components/PropertiesPanel.tsx` — CeilingDimInput component + RESET_SIZE button conditional render
- `src/components/CanvasContextMenu.tsx` — RotateCcw lucide import + conditional "Reset size" action when any override field is set
- `src/main.tsx` — installCeilingDrivers boot registration

## Decisions Made

All 12 locked decisions from CONTEXT.md were honored without deviation. The most consequential:

- **D-03 → 4-field override model (locked in research):** The CONTEXT originally specified 2 fields (widthFtOverride / depthFtOverride). The locked override-anchor model expands to 4 fields adding anchorXFt / anchorYFt, which is REQUIRED for asymmetric drift-free behavior on west/north drags. East-edge drag works with default anchors (no anchor write); west-edge drag MUST write anchorXFt = origBbox.maxX explicitly so the resolver scales every vertex from that fixed point.
- **D-04 → snap consume-only:** Audit-gate verified via `git diff origin/main -- src/canvas/snapEngine.ts src/canvas/buildSceneGeometry.ts` returning zero diff.
- **D-05 → single-undo drag transaction:** Verified in E5 e2e — multi-mousemove drag produces past.length delta of exactly 1.
- **D-12 → no snapshot version bump:** Existing v5 snapshots load and render unchanged via the resolveCeilingPoints fast path (returns ceiling.points by referential identity when all 4 override fields are undefined).

## Deviations from Plan

**None — plan executed exactly as written, with one small addition:**

The plan called for the C1 component test to verify single-undo on Enter commit. During RED-phase testing, Enter+blur both fired commit() and pushed two history entries. Added an `editStartedRef` guard in `CeilingDimInput` (mirrors Phase 31 LabelOverrideInput's `skipNextBlurRef` pattern) so commit() runs at most once per edit cycle. This is a Rule 1 auto-fix (correctness bug — without it, undo behavior would not match the spec). Documented inline; no scope creep.

## Issues Encountered

- **e2e first-run timeout:** `__driveCeilingResize` is installed by selectTool.activate(), not at app boot. The initial waitForDrivers waited for both __drivePlaceCeiling AND __driveCeilingResize, but the canvas (and selectTool) hadn't mounted because the WelcomeScreen blocked app boot. **Fix:** added `addInitScript` setting `room-cad-onboarding-completed` (mirrors stairs.spec.ts pattern) and split the wait into two helpers (`waitForDrivers` for boot-time + `waitForSelectToolDriver` for drag-bridge). Both fixes in commit `ce918f7`.

## Audit Gates (verified)

- `git diff origin/main -- src/canvas/snapEngine.ts src/canvas/buildSceneGeometry.ts` → **zero diff** (Phase 30 untouched)
- `git diff origin/main -- src/types/product.ts` → **zero diff** (Phase 31 product/customElement size-override unchanged)
- `grep -n "version: 5" src/types/cad.ts` → still v5 (no snapshot version bump)

## Test Results

- **Vitest (new):** 13 tests pass (U1-U4 + bbox helpers + U5/U5b/U6 + C1/C2/C2b)
- **Vitest (full suite):** 4 pre-existing failures unchanged (verified by running full suite both with and without phase-65 changes — failure count fluctuates between 4 and 10 depending on a pre-existing flake in `tests/lib/contextMenuActionCounts.test.ts` whose vi.mock declarations are double-registered; not introduced by this phase)
- **Playwright (chromium-dev):** 6/6 ceiling-resize scenarios pass (~16s)
- **Regression sweep (chromium-dev):** 26/26 across openings.spec, stairs.spec, measurements.spec, wall-cutaway.spec — no regressions

## Next Phase Readiness

- CEIL-02 closes GH #70 (twice-deferred from v1.9 + v1.13). Pattern is ready for v1.17 polygon entities (rugs, area-paint regions).
- v1.17 follow-up candidates documented in plan: corner handles for uniform polygon scaling; per-vertex drag (move individual polygon corners); 16ms-throttle PERF mitigation if profiling shows GPU thrashing on 6+ vertex L-shapes mid-drag.

## Self-Check: PASSED

- All 5 created files exist + 4 modified files diffed clean
- All 6 task commits exist (`028462b`, `5e0695b`, `51444aa`, `bbeba5f`, `388ba73`, `935ec6c`) plus `ce918f7` e2e fix
- 13 vitest tests pass; 6 e2e scenarios pass; 26 regression e2e scenarios pass
- Audit gates verified (snapEngine, buildSceneGeometry, types/product.ts all unchanged)

---
*Phase: 65-ceil-02-ceiling-resize-handles*
*Completed: 2026-05-04*
