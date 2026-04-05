---
phase: 04-3d-walkthrough
plan: 00
subsystem: testing
tags: [vitest, stubs, wave-0, viz-05, walk-mode]
dependency_graph:
  requires: []
  provides:
    - stub-test-file:tests/walkCollision.test.ts
    - stub-test-file:tests/uiStore.test.ts
  affects: []
tech_stack:
  added: []
  patterns:
    - it.todo stubs for downstream TDD population
key_files:
  created:
    - tests/walkCollision.test.ts
    - tests/uiStore.test.ts
  modified: []
decisions:
  - Stubs use it.todo (not it.skip) so vitest collects and reports without failing (Phase 02/03 precedent)
  - Contract pinned via exact describe strings so Wave 1 imports resolve against stable test names
metrics:
  duration: 1m
  completed: 2026-04-05
requirements: [VIZ-05]
---

# Phase 4 Plan 00: Wave 0 Test Stubs Summary

Created two Phase 4 Wave 0 stub test files using `it.todo` entries so downstream Wave 1 plans (04-01, 04-02) can populate walk-mode collision and camera-mode state tests against a fixed contract.

## What Was Built

Two vitest stub test files anchoring the VIZ-05 walk-mode contract from `04-VALIDATION.md`:

1. **tests/walkCollision.test.ts** (VIZ-05) — 9 `it.todo` entries across 2 describe blocks:
   - `walkCollision canMoveTo` (6 stubs): no-wall pass-through, AABB blocking with 1ft padding, angled sliding, room bounds clamp, walls-only ignoring products/openings, custom padding override
   - `walkCollision room bounds clamp` (3 stubs): x-axis clamp, z-axis clamp, in-bounds pass-through

2. **tests/uiStore.test.ts** (VIZ-05) — 5 `it.todo` entries for cameraMode state machine:
   - default is 'orbit'
   - setCameraMode('walk') / setCameraMode('orbit')
   - toggleCameraMode flips orbit -> walk and walk -> orbit

## Verification

`npm test -- --run` completed successfully:
- 17 test files passed, 2 skipped (19 total)
- 80 tests passed, 17 todos (97 total)
- 14 new stubs collected cleanly (no collection errors)

## Deviations from Plan

None — plan executed exactly as written.

## Commits

- `1894a68` test(04-00): add Wave 0 stubs for walkCollision and uiStore cameraMode

## Self-Check: PASSED

- tests/walkCollision.test.ts: FOUND
- tests/uiStore.test.ts: FOUND
- commit 1894a68: FOUND
