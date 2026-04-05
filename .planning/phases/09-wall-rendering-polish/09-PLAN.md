---
phase: 09-wall-rendering-polish
plan: 01
subsystem: wall-rendering
tags: [wall-01, wall-02, wall-03, corner-caps, x-junction, dead-end]
requires: [fabricSync wall renderer, existing 2-wall corner-cap logic]
provides: [N-wall junction cap, dead-end cap, mid-segment crossing cap]
affects:
  - src/canvas/fabricSync.ts
decisions:
  - "WALL-01: X-junctions (count>=3) use convex-hull fill of all wall-end corners + shared point. Fills whatever polygon that set of points implies, which covers the overlap zone for 3-way, 4-way, and arbitrary junctions uniformly."
  - "WALL-02: Dead-end walls (count===1 at endpoint) get a square cap that extends halfT beyond the wall in the outward direction. Subtle but visually closes the wall."
  - "WALL-03: Mid-segment crossings detected via parametric line intersection (0.02–0.98 range on both walls to exclude endpoints). Cap is the convex hull of the 4 strip-edge intersection points."
  - "2-wall junctions keep the existing precise outer-edge cap (from PR #2) — that logic works well for clean L/T mitres."
metrics:
  requirements_closed: [WALL-01, WALL-02, WALL-03]
---

# Phase 9 Plan: Wall Rendering Polish

## Goal

Finish the wall-rendering edge cases left from PR #2's clean-L work: X-junctions, dead ends, and mid-segment crossings all render cleanly.

## Tasks

- [x] Refactor endpoint loop to handle count === 1 (dead-end) and count >= 3 (X-junction)
- [x] computeDeadEndCap: rectangle extending halfT beyond endpoint in outward direction
- [x] Convex-hull cap for 3+ wall junctions (all wall-end corners + shared point)
- [x] midSegmentCrossing: parametric line-segment intersection, interior only
- [x] computeCrossingCap: 4-edge strip intersection → convex hull
- [x] Keep existing 2-wall outer-edge cap intact

## Verification

- [x] 3 walls meeting at one point (e.g. T-shape): no visible rectangle pile-up
- [x] 4 walls meeting at one point (e.g. cross-shape): clean hull
- [x] Dead-end wall with no neighbors: square cap extends halfT beyond endpoint
- [x] Two walls crossing through each other mid-segment: overlap zone filled
- [x] Existing 2-wall L-joints from PR #2 still work
