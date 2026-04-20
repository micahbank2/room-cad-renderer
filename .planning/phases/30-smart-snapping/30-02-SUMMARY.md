---
phase: 30-smart-snapping
plan: 02
subsystem: canvas-snap-core

tags: [canvas, fabric, snap, pure-module, tdd, green]

requires:
  - phase: 30-smart-snapping
    plan: 01
    provides: Red test stubs (tests/snapEngine.test.ts, tests/snapGuides.test.ts) that lock SNAP-01/02/03 contract
  - from: src/lib/geometry.ts
    provides: mitredWallCorners, snapPoint, (distance, closestPointOnWall) building blocks
provides:
  - Pure snap algorithm module src/canvas/snapEngine.ts (no Fabric, no store, no DOM)
  - Fabric-side guide renderer src/canvas/snapGuides.ts (tagged-cleanup ephemera)
  - Public exports SNAP_TOLERANCE_PX, BBox, Segment, SceneGeometry, SnapGuide, SnapInput, SnapResult,
    axisAlignedBBoxOfRotated, buildSceneGeometry, computeSnap, renderSnapGuides, clearSnapGuides
affects: [30-03, 30-04]

tech-stack:
  added: []
  patterns:
    - "Pure math module consumed by tools (no side effects, feet-in / feet-out)"
    - "Tagged Fabric ephemera (data.type === \"snap-guide\") mirrors existing type:\"dim\" / \"ceiling-edge-preview\""
    - "Per-axis independent scan with priority tiebreak (midpoint > object-edge > wall-face)"
    - "Coupled 2D tolerance check for midpoint targets — semantically \"centered on this wall\""

key-files:
  created:
    - src/canvas/snapEngine.ts
    - src/canvas/snapGuides.ts
  modified: []

key-decisions:
  - "Midpoint targets require BOTH center.x and center.y within tolerance of midpoint — ensures the midpoint-dot guide stays semantically meaningful (no stray dot when a far-away drag merely aligns Y with a wall midpoint)"
  - "axisAlignedBBoxOfRotated uses the standard |cos|/|sin| envelope of the rotated rectangle per RESEARCH Pattern 3 (v1); a true oriented-bbox snap is deferred"
  - "Diagonal walls contribute endpoint X/Y values only as snap targets (RESEARCH Pattern 4 v1 simplification); perpendicular-projection snap is deferred"
  - "tolFt capped at Math.min(tolerancePx/scale, 2) per Pitfall 7 so extreme zoom-out never makes snap engage across the whole scene"

patterns-established:
  - "Pure-module + tagged-Fabric-render split — snapEngine.ts has zero UI deps (grep-verified); snapGuides.ts has zero store deps"
  - "Data-attribute cleanup contract: any module creating ephemeral Fabric objects should tag them via data.type and provide an idempotent clear fn"

requirements-completed: [SNAP-01, SNAP-02]

duration: ~4min
completed: 2026-04-20
---

# Phase 30 Plan 02: Pure Snap Engine + Fabric Guides Summary

**Turns Plan 01's 25 red unit assertions green by delivering one pure-math module (`snapEngine.ts`, 427 lines) and one Fabric-side renderer (`snapGuides.ts`, 110 lines) — SNAP-01 edge math and SNAP-02 midpoint math are now implemented; Plan 03 will wire them into the drag tools.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-20T22:48:08Z
- **Completed:** 2026-04-20T22:51:34Z
- **Tasks:** 2
- **Files created:** 2
- **Tests green:** 27 (17 snapEngine + 10 snapGuides)

## Accomplishments

- **`src/canvas/snapEngine.ts` (427 lines, pure module):**
  - Public exports: `SNAP_TOLERANCE_PX = 8`, `BBox`, `Segment`, `SceneGeometry`, `SnapGuide`, `SnapInput`, `SnapResult`, `axisAlignedBBoxOfRotated`, `buildSceneGeometry`, `computeSnap`.
  - Imports restricted to `@/lib/geometry` + `@/types/cad` + `@/types/product` — zero Fabric, zero store, zero DOM (grep-verified).
  - `buildSceneGeometry` materializes wall outer-face segments via `mitredWallCorners`, wall midpoints with `x`/`y`/`diag` axis classification, and AABBs of all non-excluded products/custom elements/ceilings (D-02b exclude-self).
  - `computeSnap` runs per-axis independent scans with the locked priority tiebreak (midpoint=3 > object-edge=2 > wall-face=1 per D-05a), falls back to per-axis `snapPoint(pos, gridSnap)` when no winner (D-05b), and caps `tolFt = Math.min(tolerancePx/scale, 2)` (Pitfall 7).
- **`src/canvas/snapGuides.ts` (110 lines, Fabric-side only):**
  - Public exports: `renderSnapGuides`, `clearSnapGuides`.
  - Every generated object tagged `data: { type: "snap-guide" }` for idempotent cleanup mirroring the existing `type: "dim"` precedent.
  - Accent purple `#7c5bf0` at `opacity = 0.6`, `strokeWidth = 1` for axis lines (D-06a); midpoint dots rendered as `fabric.Circle` at `radius = 4` (D-06d). No new CSS tokens.
  - Axis lines span the full canvas width/height (D-06); all objects are `selectable: false` + `evented: false` (non-interactive).
- **Green test verification:**
  - `npx vitest run tests/snapEngine.test.ts tests/snapGuides.test.ts` → `Test Files 2 passed | Tests 27 passed`.
  - Plan 01 had advertised 25 minimum assertions; actual count is 27 (17 + 10 — the two extra `describe` blocks in snapEngine split "out-of-tolerance with grid" and "out-of-tolerance without grid" into separate cases).
  - `npx tsc --noEmit` exits 0 apart from the pre-existing `baseUrl` TS 6.0 deprecation warning.

## Task Commits

1. **Task 1: `src/canvas/snapEngine.ts` pure module** — `50b8d7d` (feat)
2. **Task 2: `src/canvas/snapGuides.ts` Fabric renderer** — `185eae9` (feat)

**Plan metadata commit:** _(pending final metadata commit)_

## Files Created/Modified

- **`src/canvas/snapEngine.ts`** (NEW, 427 lines) — Pure module per D-01. Exports the snap algorithm, scene-geometry builder, bbox helper, and all public types. Imports: `mitredWallCorners`, `snapPoint` from `@/lib/geometry`; `Point`, `WallSegment`, `CustomElement` from `@/types/cad`; `Product`, `effectiveDimensions` from `@/types/product`. No other imports.
- **`src/canvas/snapGuides.ts`** (NEW, 110 lines) — Fabric-side renderer. Imports: `* as fabric` from `fabric`; `SnapGuide` type from `@/canvas/snapEngine`. No store imports.

## Decisions Made

1. **Midpoint targets require both center.x AND center.y within tolerance of the midpoint point.** Without this coupled 2D check, a drag far away from a wall that happened to share a single coordinate with a wall midpoint would emit a midpoint-dot guide — misleading Jessica that the object is "centered on this wall" when it's not. The coupled check keeps the guide semantically honest while preserving full per-axis independence for all other target kinds (wall-face, object-edge). This is consistent with how the SNAP-02 tests are constructed: the basic midpoint-snap test already has both axes within tolerance; the "edge-to-midpoint pairs are skipped" test has the center far on X, and the coupled check correctly suppresses the midpoint guide there.
2. **Axis classification uses strict equality thresholds (1e-6).** Near-axis-aligned walls are treated as exactly axis-aligned for snap purposes; diagonals are the default. This avoids floating-point classification flicker when a wall's endpoints differ by sub-micrometer amounts.
3. **Grid fallback is per-axis, not whole-position.** When X wins smart-snap but Y doesn't, Y uses `snapPoint({x:pos.x, y:pos.y}, gridSnap).y` — preserves the existing grid experience on axes where smart-snap finds nothing (D-05b). A whole-position fallback would clobber the X smart-snap.
4. **Diagonal walls contribute endpoint-only X/Y targets** (v1). Per RESEARCH Pattern 4, a 45° wall from (0,0) to (10,10) contributes x∈{0,10} and y∈{0,10} as candidate targets. Point-to-segment perpendicular projection is deferred; callable out as a v2 limitation in the module header.

## Deviations from Plan

None — plan executed exactly as written. The only judgment call the plan explicitly left to Claude's discretion (D-06d midpoint-dot dedup when both X and Y winners are midpoints of the same wall) is implemented as spec'd: emit one dot per unique midpoint point via an epsilon-coordinate compare.

## Auto-fixed Issues

None. Task 1's first test run showed 16/17 passing; the single failing test ("midpoint snap ONLY applies when source is center — edge-to-midpoint pairs are skipped") surfaced the midpoint-semantics ambiguity flagged in decision 1 above. Resolved inline by adding the coupled 2D tolerance check before midpoint candidates enter the per-axis target list — this is a **specification clarification** the test pins down, not a bug.

## Issues Encountered

- Initial test run had 1/17 red on snapEngine due to single-axis midpoint match emitting a dot when the center was outside tolerance on the other axis. Analysis of the test name ("ONLY applies when source is center — edge-to-midpoint pairs are skipped") combined with semantic reading of D-06d ("Jessica sees 'this is centered on this wall' rather than just 'it snapped to X=5.00'") led to the coupled 2D tolerance decision above.

## Grep Receipts — snapEngine Purity

```bash
$ grep -c "from.*fabric" src/canvas/snapEngine.ts
0
$ grep -c "from.*stores" src/canvas/snapEngine.ts
0
```

Zero Fabric imports. Zero store imports. The module depends only on `@/lib/geometry`, `@/types/cad`, and `@/types/product` — unit-testable in a pure JS VM without DOM, without Fabric, without Zustand.

## V1 Limitations (flagged for Plan 03 + Plan 04)

1. **Diagonal-wall snap is endpoint-only.** A 45° wall contributes only its start.x/end.x and start.y/end.y as snap targets, not the full perpendicular projection onto the segment. Plan 04 may choose to verify this against a real diagonal-wall scene or defer to a future phase.
2. **Rotated-product snap uses axis-aligned bbox.** A 45°-rotated desk snaps by its rotated AABB (wider footprint), not the true oriented edge. Per D-03 v1.
3. **No spatial index.** O(N) linear scan per `computeSnap`. Fine at Jessica's scene scale (≤50 elements ≤ ~400 candidate targets). Revisit only if profiling shows per-frame `computeSnap` > 1ms per D-09a.

## Performance Notes

- Phase 25 drag fast-path **not touched**: `snapEngine` has zero side effects, `snapGuides` only mutates Fabric canvas objects (ephemera). No per-frame store writes introduced.
- `buildSceneGeometry` is intended to be called **once at drag start** (Plan 03 will cache in the drag closure per D-09b), not per mousemove.

## Next Phase Readiness

- **Plan 03** (tool integration) can now:
  - Import `{ SNAP_TOLERANCE_PX, buildSceneGeometry, computeSnap, axisAlignedBBoxOfRotated } from "@/canvas/snapEngine"`.
  - Import `{ renderSnapGuides, clearSnapGuides } from "@/canvas/snapGuides"`.
  - Install `window.__driveSnap` + `window.__getSnapGuides` driver hooks under `import.meta.env.MODE === "test"` in `productTool.ts` and `selectTool.ts` to turn `tests/snapIntegration.test.tsx` green.
  - Add the `_productLibrary` module-level bridge in `productTool.ts` (parallel to `setSelectToolProductLibrary` — the RESEARCH doc flags this cross-cutting concern).
  - Wire `clearSnapGuides` into each tool's `cleanup()` return per Pitfalls 2 + 3.
- **Plan 04** (verification) has a fully green unit-test floor to build on; remaining work is the RTL integration tier + full-suite smoke.

## User Setup Required

None. No external services, no env vars, no npm installs. Pure in-repo code change.

## Self-Check: PASSED

- `src/canvas/snapEngine.ts` — FOUND
- `src/canvas/snapGuides.ts` — FOUND
- Commit `50b8d7d` (Task 1) — FOUND
- Commit `185eae9` (Task 2) — FOUND
- `npx vitest run tests/snapEngine.test.ts tests/snapGuides.test.ts` — 27/27 green — CONFIRMED
- `npx tsc --noEmit` — clean apart from pre-existing baseUrl deprecation — CONFIRMED
- `grep -c "from.*fabric" src/canvas/snapEngine.ts` → 0 — CONFIRMED
- `grep -c "from.*stores" src/canvas/snapEngine.ts` → 0 — CONFIRMED

---
*Phase: 30-smart-snapping*
*Completed: 2026-04-20*
