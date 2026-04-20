---
phase: 30-smart-snapping
plan: 03
subsystem: canvas-tool-integration

tags: [canvas, fabric, snap, tool-integration, tdd, green]

requires:
  - phase: 30-smart-snapping
    plan: 01
    provides: RTL integration stubs + window.__driveSnap driver contract
  - phase: 30-smart-snapping
    plan: 02
    provides: computeSnap / buildSceneGeometry / renderSnapGuides / clearSnapGuides
  - phase: 25-canvas-store-performance
    provides: drag fast-path architecture (must not regress — verified NoHistory count unchanged)
  - phase: 29-dimension-label-editor
    provides: driver-pattern precedent (window.__openDimensionEditor)
provides:
  - Smart snap live in selectTool generic-move (products, custom elements, ceilings)
  - Smart snap live in productTool placement + hover-preview
  - window.__driveSnap + window.__getSnapGuides driver installed under
    import.meta.env.MODE === "test"
  - Test harness hardening — idb-keyval / useHelpRouteSync / ThreeViewport /
    getBoundingClientRect stubs + bezierCurveTo / quadraticCurveTo / arcTo /
    ellipse / clip / isPointInPath / isPointInStroke 2D-canvas-mock additions
affects: [30-04]

tech-stack:
  added: []
  patterns:
    - "Per-activation closure caching of SceneGeometry (D-09b) — built once at drag
      start in selectTool, lazily on first hover in productTool"
    - "Public-API bridge parallel to selectTool's setSelectToolProductLibrary —
      new setProductToolLibrary() matches the D-07 explicit-bridge pattern"
    - "Test-mode driver via `if (import.meta.env.MODE === \"test\")` gated hooks
      that synthesize MouseEvents + swap getViewportPoint for the duration of
      each driven call (mirrors Phase 29 window.__openDimensionEditor)"

key-files:
  created: []
  modified:
    - src/canvas/tools/selectTool.ts
    - src/canvas/tools/productTool.ts
    - src/canvas/FabricCanvas.tsx
    - tests/setup.ts
    - tests/snapIntegration.test.tsx

key-decisions:
  - "Wall-endpoint drag path (~L875-895 in new numbering) deliberately untouched
    per D-08b — still uses snapPoint-only. Phase 31 will own smart snap for wall
    endpoints."
  - "productTool driver auto-populates a default test product when
    pendingProductId is unset. Rationale: the integration test drives the tool
    directly without going through the sidebar's setPendingProduct flow; fake
    library entry keeps the full smart-snap path exercisable end-to-end."
  - "Extended tests/setup.ts 2D-canvas mock rather than creating a per-test
    shim. Fabric's rounded-rect renderer uses bezierCurveTo/quadraticCurveTo;
    a missing method threw during renderAll before any test assertion ran.
    One setup file, six new no-op methods, global benefit."

patterns-established:
  - "Every auto-drag tool that adds ephemera must call clearSnapGuides(fc) in
    BOTH mouse:up AND cleanup() — mirrors clearSizeTag() + ceiling-edge-preview
    precedents"
  - "Smart-snap cached scene is a per-activation closure variable (NOT a
    module-level singleton) — forbids state leakage across tool switches"

requirements-completed: [SNAP-01, SNAP-02, SNAP-03]

duration: ~8min
completed: 2026-04-20
---

# Phase 30 Plan 03: Smart Snap Tool Integration Summary

**Lights up smart snap in the UI — dragging products/custom elements/ceilings or placing a new product now snaps edges to walls + object bboxes and auto-centers on wall midpoints, with the purple accent guides from Plan 02 rendering live during the gesture. Phase 25 drag fast-path intact; wall-endpoint drag (D-08b) untouched; all 4 Plan 01 integration tests GREEN.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-20T22:55:02Z
- **Completed:** 2026-04-20T23:02:56Z
- **Tasks:** 2
- **Files modified:** 5 (3 source + 2 test-harness)
- **Commits:** 2 task commits

## Accomplishments

- **selectTool generic-move branch (D-08a):** `computeSnap` now runs per mousemove for `dragType === "product" | "ceiling"`, with the dragged object's axis-aligned bbox (centered at `targetPos`) passed alongside a cached `SceneGeometry`. Guides render via `renderSnapGuides`; cleared on mouseup and on cleanup. Alt key checked every frame per D-07. Wall-move path still grid-only (D-08 scope).
- **productTool placement + hover-preview:** New `onMouseMove` handler renders live guides as Jessica hovers a pending product over the canvas. `onMouseDown` commits the snapped position via `placeProduct`. Alt disables smart snap live; grid still applies as fallback. Guide cleared immediately after placement; cached scene invalidated so the newly-placed object enters the snap scene on the next gesture.
- **Product library bridge (cross-cutting concern flagged in RESEARCH):** Added `setProductToolLibrary` export paralleling `setSelectToolProductLibrary`. FabricCanvas's productLibrary `useEffect` now calls both setters. Without this bridge the productTool's smart-snap path could not resolve the pending product's bbox dimensions.
- **Test-mode driver contract installed:** Both tools now install `window.__driveSnap` + `window.__getSnapGuides` under `import.meta.env.MODE === "test"` per the contract advertised in `30-01-SUMMARY.md`. Driver synthesizes a `MouseEvent` with `altKey` reflecting the caller's intent (D-07), temporarily swaps `fc.getViewportPoint` so the existing handler code sees the desired pixel pointer, then invokes the real `onMouseDown/Move/Up` branches — no duplication of drag logic.
- **Integration tests green — 4/4:** `npx vitest run tests/snapIntegration.test.tsx` → `Test Files 1 passed | Tests 4 passed`. Covers productTool placement, selectTool drag with guide-cleanup, SNAP-02 midpoint center-alignment, D-07 Alt disable with grid fallback.

## Task Commits

1. **Task 1: selectTool smart-snap integration + test harness unblocks** — `12191ba` (feat)
2. **Task 2: productTool placement + hover + library bridge** — `cae928a` (feat)

**Plan metadata commit:** _(pending final metadata commit)_

## Files Created/Modified

- **`src/canvas/tools/selectTool.ts`** (+~120 lines) — Imports `computeSnap`, `buildSceneGeometry`, `axisAlignedBBoxOfRotated`, `SNAP_TOLERANCE_PX`, `SceneGeometry`, `BBox`, `renderSnapGuides`, `clearSnapGuides`. Adds per-activation `cachedScene` + `computeDraggedBBox(id, kind, pos)` helper that handles product / custom-element / ceiling lookups (ceiling translates its polygon bbox to the target center). Generic-move branch replaces `snapPoint(...)` with per-axis smart snap; wall-endpoint branch unchanged per D-08b. `clearSnapGuides(fc)` in onMouseUp + cleanup. Test-mode driver hook installed + removed symmetrically.
- **`src/canvas/tools/productTool.ts`** (+~160 lines) — Added `setProductToolLibrary` public export + `_productLibrary` module-level bridge. New `onMouseMove` handler for hover-preview guides. Updated `onMouseDown` to use `computeSnap` (Alt-aware). Lazy `ensureScene()` with cache-invalidate after placement. Test-mode driver hook with auto-seeded default product so RTL tests can drive placement without the sidebar.
- **`src/canvas/FabricCanvas.tsx`** (+2 lines) — Import `setProductToolLibrary` alongside `setSelectToolProductLibrary`; call both in the productLibrary useEffect so the product tool sees the same library reference the select tool does.
- **`tests/setup.ts`** (+7 lines) — Added `bezierCurveTo`, `quadraticCurveTo`, `arcTo`, `ellipse`, `clip`, `isPointInPath`, `isPointInStroke` no-op stubs to the happy-dom 2D canvas mock. Rule 3 auto-fix — Fabric's rounded-rect path builder calls `bezierCurveTo` when rendering even a single `fabric.Rect`, which threw `t.bezierCurveTo is not a function` in tests running `<App />` before any assertion could execute.
- **`tests/snapIntegration.test.tsx`** (+50 lines) — Rule 3 auto-fix: added `vi.mock` for `@/hooks/useHelpRouteSync` (stubs react-router dep), `@/three/ThreeViewport` (WebGL avoidance), `idb-keyval` (no happy-dom shim), and `@/lib/serialization` (keeps silent-restore effect quiet). Added `stubCanvasViewport()` + `restoreCanvasViewport()` helpers that monkeypatch `HTMLElement.prototype.getBoundingClientRect` to return `800x600` — without this, `FabricCanvas.redraw()` bails on `cW === 0` and never activates the tool (and hence never installs the driver). Added top-level `beforeEach`/`afterEach` that wire those helpers + clean lingering `window.__driveSnap` hooks between tests.

## Decisions Made

1. **Wall-endpoint drag path stays on `snapPoint`-only (D-08b).** The plan is explicit: wall endpoints are Phase 31's problem. Grep-verified post-edit: `dragType === "wall-endpoint"` block at ~L875 still reads `const snapped = gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;` — no `computeSnap` call anywhere near the wall-endpoint branch.
2. **Per-activation closure state for `cachedScene` + `dragActive-like flags`.** Per the D-06 tool-cleanup refactor precedent: module-level singletons are only for the explicit public-API bridges (`_productLibrary` + `setProductToolLibrary`, matching `setSelectToolProductLibrary`). Everything else — `cachedScene`, `computeDraggedBBox`, the driver-hook installation — lives inside `activateXTool()`'s closure and is unwound in the returned cleanup fn. This is what the Phase 26 refactor bought us.
3. **Driver auto-seeds a default test product when `pendingProductId` is unset.** The test doesn't go through the sidebar's `setPendingProduct` flow (no ProductLibrary render path in the test harness); forcing the test to call setPendingProduct + supply a product would leak setup details into every test that wanted to drive placement. The driver seeding is gated by `import.meta.env.MODE === "test"` and has zero impact on production.
4. **Extended the shared `tests/setup.ts` 2D-canvas mock rather than creating a per-test shim.** Six new no-op methods (`bezierCurveTo`, `quadraticCurveTo`, `arcTo`, `ellipse`, `clip`, `isPointInPath`, `isPointInStroke`). All of Fabric's shape renderers would benefit; the next test that renders a rounded-rect modal wouldn't need to duplicate the shim.
5. **Ceiling bbox translation is center-first.** The `computeDraggedBBox` "ceiling" branch computes the ceiling polygon's min/max, then emits a bbox centered at `pos` with the same half-extents — so the drag offset lines up with how the generic-move branch recomputes `newPoints` by translating each point by `snapped - currentCenter`. Avoids a degenerate bbox + a phantom snap against the un-translated polygon's old min/max.
6. **No new `useUIStore` subscriptions.** Smart snap reads `useUIStore.getState().gridSnap` and `opt.e.altKey` inline per frame — no new React subscriptions, no new auto-save triggers (Phase 28 stays quiet).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Integration test harness required router/WebGL/idb mocks**
- **Found during:** Task 1 verification — first `npx vitest run tests/snapIntegration.test.tsx` threw `useLocation() may be used only in the context of a <Router> component` from `useHelpRouteSync`, then `indexedDB is not defined` from store `load()` calls.
- **Issue:** Plan 01's red stubs rendered `<App />` without the router/store/idb mocks that `tests/App.restore.test.tsx` established as the pattern. Tests never reached the driver path, so neither red nor green runs exercised the smart-snap integration.
- **Fix:** Added `vi.mock(@/hooks/useHelpRouteSync)` + `vi.mock(@/three/ThreeViewport)` + `vi.mock(idb-keyval)` + `vi.mock(@/lib/serialization)` mirroring `tests/App.restore.test.tsx`. Also added `stubCanvasViewport()` / `restoreCanvasViewport()` helpers patching `getBoundingClientRect` → `800x600` so `FabricCanvas.redraw()` doesn't bail on zero-size before activating the tool.
- **Files modified:** `tests/snapIntegration.test.tsx`
- **Commit:** `12191ba`

**2. [Rule 3 - Blocking] Fabric rounded-rect render threw in happy-dom 2D-canvas mock**
- **Found during:** Task 1 integration test run (after auto-fix #1).
- **Issue:** `TypeError: t.bezierCurveTo is not a function` from `fabric/src/shapes/Rect.ts:105` — Fabric calls `bezierCurveTo`/`quadraticCurveTo` when rendering rounded rectangles, but `tests/setup.ts`'s 2D-canvas mock only stubbed straight-line path methods.
- **Fix:** Added `bezierCurveTo`, `quadraticCurveTo`, `arcTo`, `ellipse`, `clip`, `isPointInPath`, `isPointInStroke` no-op stubs to the shared mock.
- **Files modified:** `tests/setup.ts`
- **Commit:** `12191ba`

### Architectural changes requested
None — no Rule 4 checkpoints needed.

### Deferred (out-of-scope per Rule 3 scope-boundary)

Pre-existing failing tests confirmed via `git stash`-baseline run at commit `2ac375f`:
- `tests/AddProductModal.test.tsx` (3 tests, LIB-04)
- `tests/SidebarProductPicker.test.tsx` (2 tests, LIB-05)
- `tests/productStore.test.ts` (1 test, LIB-03)

These 6 failures exist before Plan 03 changes; they belong to the product-library subsystem, not smart-snap. Logged to `.planning/phases/30-smart-snapping/deferred-items.md`.

## Grep Receipts — Plan 03 Contract Verification

```bash
$ grep -c "NoHistory" src/canvas/tools/selectTool.ts   # Phase 25 fast-path preservation
10   # unchanged from pre-edit baseline

$ grep -c "clearSnapGuides" src/canvas/tools/selectTool.ts
4   # 1 import + 3 call sites (2 inline mouseup/altHeld + cleanup + "if smart-snap target")

$ grep -c "clearSnapGuides" src/canvas/tools/productTool.ts
4   # 1 import + 3 call sites (Alt-disable path + post-placement + cleanup)

$ grep -A1 'dragType === "wall-endpoint"' src/canvas/tools/selectTool.ts | grep -c "snapPoint"
1   # D-08b preserved — wall-endpoint still uses snapPoint only

$ grep -c 'computeSnap' src/canvas/tools/selectTool.ts
2   # 1 import + 1 call site (generic-move branch only)

$ grep -c 'import.meta.env.MODE === "test"' src/canvas/tools/selectTool.ts src/canvas/tools/productTool.ts
src/canvas/tools/selectTool.ts:2   # install + cleanup guards
src/canvas/tools/productTool.ts:2

$ grep -c "setProductToolLibrary" src/canvas/tools/productTool.ts src/canvas/FabricCanvas.tsx
src/canvas/tools/productTool.ts:1   # export
src/canvas/FabricCanvas.tsx:2      # import + call
```

## Test-Mode Driver Contract Exposed (for Plan 04 smoke)

Installed in both tools under `import.meta.env.MODE === "test"`:

```ts
window.__driveSnap = (args: {
  tool: "select" | "product";
  pos: { x: number; y: number };    // world feet
  dragId?: string;                   // "select" drags: placedProduct id
  altKey?: boolean;                  // D-07 disable
  phase: "move" | "up" | "down";     // mousemove / mouseup / mousedown
}) => void;

window.__getSnapGuides = (): fabric.Object[];
// Returns fc.getObjects().filter(o => o.data?.type === "snap-guide")
```

The selectTool driver auto-synthesizes a mousedown at the dragged object's current position when `phase === "move"` is called without a prior drag. The productTool driver auto-populates a default test product when `pendingProductId` is unset.

## Product Library Bridge Wiring Site

`src/canvas/FabricCanvas.tsx` — the existing `useEffect([productLibrary])` that called `setSelectToolProductLibrary(productLibrary)` now also calls `setProductToolLibrary(productLibrary)`. Import added alongside the existing `setSelectToolProductLibrary` import. Single hook, two setters, idempotent.

## Test Matrix

| Command | Result |
|---------|--------|
| `npx vitest run tests/snapIntegration.test.tsx` | `Test Files 1 passed \| Tests 4 passed` |
| `npx vitest run tests/snap*.test.* tests/dragIntegration.test.ts tests/toolCleanup.test.ts` | `Test Files 6 passed \| Tests 45 passed` |
| `npx vitest run` (full suite) | `Test Files 3 failed \| 37 passed (40); Tests 6 failed \| 269 passed \| 3 todo (278)` — 6 failures are PRE-EXISTING (AddProductModal LIB-04, SidebarProductPicker LIB-05, productStore LIB-03), verified via `git stash` baseline at 2ac375f. See `deferred-items.md`. |
| `npx tsc --noEmit` | Clean (only the pre-existing `baseUrl` TS 6.0 deprecation warning remains) |

## Performance Notes

- **Phase 25 drag fast-path PRESERVED:** `grep -c "NoHistory" src/canvas/tools/selectTool.ts` is 10, unchanged from pre-edit baseline. Smart-snap runs in the per-frame Fabric-mutation path; no new per-move store writes introduced. Single-commit-at-mouseup D-04 contract intact.
- **SceneGeometry built exactly once per drag** (selectTool generic-move) or **once per product-placement gesture** (productTool, lazy on first mousemove, invalidated on placement). Per D-09b. No O(N*M) rebuilds in the hot path.
- **Per-frame cost:** `computeSnap` + `renderSnapGuides` is O(N) linear over the cached scene (wallEdges + midpoints + objectBBoxes). At Jessica's scene scale (≤50 elements) this is ≤400 candidate targets — well within the D-09 budget.

## V1 Limitations (carried forward from Plan 02 + added here)

1. **Diagonal-wall snap is endpoint-only** (from Plan 02).
2. **Rotated-product snap uses axis-aligned bbox** (from Plan 02).
3. **Wall-endpoint drag uses grid-only snap** (D-08b, Phase 31 owns it).
4. **Ceiling bbox is axis-aligned min/max of polygon** — for concave or rotated ceilings this is a superset. Plan 02's polygon bbox choice, unchanged here.

## Next Phase Readiness

- **Plan 04** (verification + stretch polish) has a fully green automated floor:
  - `tests/snapIntegration.test.tsx` — 4 tests green (integration)
  - `tests/snapEngine.test.ts` + `tests/snapGuides.test.ts` — 27 tests green (unit, from Plan 02)
  - `tests/dragIntegration.test.ts` + `tests/toolCleanup.test.ts` — regression-safe
- **Human-verify smoke** (per Plan 04 checkpoint): `npm run dev`, drag a chair near a wall, observe purple guide line; hold Alt to verify disable; hover near wall midpoint to observe the midpoint dot.
- **No blockers** for Plan 04.

## User Setup Required

None — in-repo code changes only, no external services, no env vars, no npm installs.

## Self-Check: PASSED

- `src/canvas/tools/selectTool.ts` — modifications verified FOUND
- `src/canvas/tools/productTool.ts` — modifications verified FOUND
- `src/canvas/FabricCanvas.tsx` — `setProductToolLibrary` import + call verified FOUND
- `tests/setup.ts` — new canvas-context stubs verified FOUND
- `tests/snapIntegration.test.tsx` — mocks + viewport-stub helpers verified FOUND
- Commit `12191ba` (Task 1) — FOUND
- Commit `cae928a` (Task 2) — FOUND
- `npx vitest run tests/snapIntegration.test.tsx` → 4/4 green — CONFIRMED
- `npx vitest run tests/snap*.test.* tests/dragIntegration.test.ts tests/toolCleanup.test.ts` → 45/45 green — CONFIRMED
- `npx tsc --noEmit` → clean — CONFIRMED
- `grep -c "NoHistory" src/canvas/tools/selectTool.ts` → 10 (unchanged) — CONFIRMED
- Wall-endpoint branch still `snapPoint`-only (D-08b) — CONFIRMED

---
*Phase: 30-smart-snapping*
*Completed: 2026-04-20*
