---
phase: 30-smart-snapping
plan: 01
subsystem: testing

tags: [vitest, rtl, fabricjs, snap, tdd, red-stubs]

requires:
  - phase: 25-canvas-store-performance
    provides: drag fast-path architecture + tagged Fabric-object cleanup pattern
  - phase: 29-dimension-label-editor
    provides: window.__driveX RTL driver-pattern precedent
provides:
  - Red test stubs for computeSnap + buildSceneGeometry (SNAP-01/02/03 math)
  - Red test stubs for renderSnapGuides + clearSnapGuides (D-06 guide contract)
  - Red RTL stubs driving window.__driveSnap + window.__getSnapGuides (Plan 03 contract)
affects: [30-02, 30-03, 30-04]

tech-stack:
  added: []
  patterns:
    - Driver-pattern (window.__driveSnap) for integration tests that cannot rely on jsdom Fabric pointer events
    - Tagged Fabric ephemera (data.type === "snap-guide") mirrors type:"dim" / "ceiling-edge-preview" precedents

key-files:
  created:
    - tests/snapEngine.test.ts
    - tests/snapGuides.test.ts
    - tests/snapIntegration.test.tsx
  modified: []

key-decisions:
  - "Red stubs reference the forthcoming @/canvas/snapEngine and @/canvas/snapGuides modules — module-resolution errors ARE the desired Wave 0 failure mode"
  - "Integration test uses driver hooks (window.__driveSnap / window.__getSnapGuides) to avoid jsdom Fabric pointer-event fragility — Plan 03 installs these under import.meta.env.MODE === 'test'"
  - "Per-axis independence (D-05) and midpoint tiebreak (D-05a priority 3>2>1) encoded in explicit test cases so Plan 02 can't silently skip them"

patterns-established:
  - "Wave 0 red stubs: executable assertions (not it.todo) that fail today with module-not-found + identifier-undefined, turning green in later waves"
  - "RTL driver-pattern contract advertised in test-file header comment for the plan that implements the hooks"

requirements-completed: []

duration: ~15min
completed: 2026-04-20
---

# Phase 30 Plan 01: Snap Red Test Stubs Summary

**Locks the SNAP-01/02/03 contract in executable form — 29 red assertions across unit + Fabric + RTL layers define what Plans 02 and 03 must deliver.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-20T22:43:00Z
- **Completed:** 2026-04-20T22:45:34Z
- **Tasks:** 3
- **Files modified:** 3 (all new)

## Accomplishments

- 15 `it()` blocks in `tests/snapEngine.test.ts` covering `buildSceneGeometry` (exclude-self, wall-edge count, midpoint shape), `computeSnap` SNAP-01 edges (wall-face, object-edge, per-axis independence, zoom-aware tolerance, alt-disable contract), SNAP-02 midpoints (center→midpoint snap, priority tiebreak, edge-center skip), SNAP-03 guides (crosshair, no-snap empties), plus `SNAP_TOLERANCE_PX === 8`.
- 10 `it()` blocks in `tests/snapGuides.test.ts` covering `renderSnapGuides` (x/y axis lines, midpoint dot, visual contract `#7c5bf0` @ 60% opacity / 1px / non-interactive, crosshair, idempotency) and `clearSnapGuides` (tag filter, non-destruction of other tagged objects, empty-canvas safety).
- 4 `it()` blocks in `tests/snapIntegration.test.tsx` driving the full stack via `window.__driveSnap` across 4 describe groups: productTool placement snap, selectTool drag snap + guide-cleanup-on-mouseup, SNAP-02 midpoint center-alignment, D-07 Alt disables smart-snap and falls back to grid.

## Task Commits

1. **Task 1: snapEngine unit test stubs** — `50ea40c` (test)
2. **Task 2: snapGuides Fabric render/clear test stubs** — `922680f` (test)
3. **Task 3: RTL integration test stubs** — `72d9fba` (test)

**Plan metadata:** _(pending final metadata commit)_

## Files Created/Modified

- `tests/snapEngine.test.ts` — 15 `it()` blocks / 5 `describe()` groups. Asserts `SNAP_TOLERANCE_PX`, `buildSceneGeometry` exclude-self + wall-edge + midpoint shapes, and the full per-axis + midpoint + guide-emission contract of `computeSnap`.
- `tests/snapGuides.test.ts` — 10 `it()` blocks / 2 `describe()` groups. Headless `fabric.StaticCanvas` exercises the render / clear contract including tag isolation.
- `tests/snapIntegration.test.tsx` — 4 `it()` blocks / 4 `describe()` groups. Mounts `<App />` via RTL, seeds a known room via `useCADStore.setState`, drives the tool via the `window.__driveSnap` driver contract, and asserts both store-commit state and tagged Fabric guide presence.

## Decisions Made

- **Driver contract advertised in-file, not in a separate doc.** Each test file has a header comment that spells out the exact `window.__driveSnap` / `window.__getSnapGuides` signatures Plan 03 must implement under `import.meta.env.MODE === "test"`. This keeps the contract co-located with its consumer and removes any risk of drift between research prose and Plan 03 implementation.
- **`as any` state shapes for `buildSceneGeometry` tests.** The Zustand store type surface is wide; the filter + shape contract is the only thing under test. Casting the seed state to `any` isolates the test from unrelated store-shape churn.
- **Priority tiebreak test uses explicit equal-distance construction.** `sceneOneVerticalWall()` + custom object bbox positions line up a midpoint snap and an object-edge snap at identical `dx`, making the `midpoint > edge-edge` (D-05a) tiebreak the deciding factor.

## Deviations from Plan

None — plan executed exactly as written. All three test files match the file paths, describe-group structure, and minimum `it()` counts specified in the plan's acceptance criteria.

## Issues Encountered

None. Red verification ran cleanly on all three files:

```
$ npx vitest run tests/snapEngine.test.ts tests/snapGuides.test.ts tests/snapIntegration.test.tsx
Test Files  3 failed (3)
     Tests  4 failed (4)   # 2 Engine + Guides files fail at transform (module not found) so individual it() counts aren't tallied; Integration fails 4/4 assertions
```

Transform-time failure for snapEngine + snapGuides (`Cannot find module '@/canvas/snapEngine'`, `Cannot find module '@/canvas/snapGuides'`) is the desired Wave 0 red state — it proves the import line references the exact path Plan 02 must create, and that the test file cannot silently pass if Plan 02 forgets to create the module.

## Driver Contract Advertised to Plan 03

Plan 03 (`src/canvas/tools/productTool.ts`, `src/canvas/tools/selectTool.ts`) must install — and remove on cleanup — these two `window` hooks when `import.meta.env.MODE === "test"`:

```ts
window.__driveSnap = (args: {
  tool: "product" | "select";
  pos: { x: number; y: number };        // world feet
  dragId?: string;                      // for "select" drags: placedProduct id
  altKey?: boolean;                     // D-07 smart-snap disable
  phase: "move" | "up";                 // mousemove vs mouseup path
}) => void;

window.__getSnapGuides = (): fabric.Object[];
// Returns fc.getObjects().filter(o => o.data?.type === "snap-guide")
```

## User Setup Required

None — test-only plan, no external services, no env vars.

## Next Phase Readiness

- **Plan 02** (pure snap engine) has a fully executable spec to implement against. Unit + render coverage goes green when `src/canvas/snapEngine.ts` and `src/canvas/snapGuides.ts` exist with the locked type shapes.
- **Plan 03** (tool integration) has the driver-hook contract encoded in `tests/snapIntegration.test.tsx`. Integration suite goes green only when productTool + selectTool install the hooks AND the engine/guides modules from Plan 02 are in place.
- **Plan 04** (verification / stretch polish) can rely on `tests/snap*.test.*` as the authoritative regression gate.

## Self-Check: PASSED

- `tests/snapEngine.test.ts` — FOUND
- `tests/snapGuides.test.ts` — FOUND
- `tests/snapIntegration.test.tsx` — FOUND
- Commit `50ea40c` — FOUND
- Commit `922680f` — FOUND
- Commit `72d9fba` — FOUND
- Combined `npx vitest run tests/snap*.test.*` exits non-zero (red) — CONFIRMED

---
*Phase: 30-smart-snapping*
*Completed: 2026-04-20*
