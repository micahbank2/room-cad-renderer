---
phase: 09-wall-rendering-polish
plan: 01
subsystem: wall-rendering
tags: [wall-01, wall-02, wall-03]
requirements_closed: [WALL-01, WALL-02, WALL-03]
affects:
  - src/canvas/fabricSync.ts
metrics:
  completed: 2026-04-05
  duration: ~15m
---

# Phase 9 Summary

Closes the three wall-rendering edge cases from PR #2:

- **WALL-01 — X-junctions**: when 3+ walls meet at a single endpoint,
  we compute the convex hull of all wall-end corners + the shared
  point and fill it with wall color. Covers T-junctions, 4-way
  crosses, and arbitrary star patterns.

- **WALL-02 — Dead ends**: walls with no neighbor at an endpoint now
  get a square cap that extends halfT beyond the endpoint in the
  wall's outward direction. Subtle but closes the wall visually.

- **WALL-03 — Mid-segment crossings**: when two walls cross through
  each other without sharing endpoints, the 4 strip-edge
  intersection points define a small convex quad that's filled with
  wall color.

## Dispatch logic

The single endpoint-processing loop in renderWalls now branches on
shared-count:

```
count === 1 → dead-end cap (computeDeadEndCap)
count === 2 → precise outer-edge cap (computeCornerCap, from PR #2)
count >= 3 → convex-hull cap
```

Mid-segment crossings are a separate O(n²) pass over all wall pairs.
midSegmentCrossing uses parametric line-segment intersection with a
0.02–0.98 margin to exclude endpoint-sharing walls (which are
handled by the endpoint caps).

## Notes

- The convex-hull approach for 3+ junctions doesn't produce a
  "pixel-perfect" mitre at every angle, but it reliably fills the
  overlap zone with no gaps or rectangle-stubs visible.
- Dead-end caps extend the wall's rendered length by halfT past its
  stored endpoint — the wall data is unchanged, just the visual.
- All three cap types share `addCapPolygon` helper, which emits a
  stroke-less fabric.Polygon tagged with `data.type="wall-corner-cap"`.
