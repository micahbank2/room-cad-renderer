---
phase: 01-2d-canvas-polish
plan: 04
subsystem: canvas-editing
tags: [EDIT-06, canvas, dimensions, walls]
requires: [vitest, fabric.js v6]
provides: [editable-wall-dimensions, corner-propagation]
affects: [src/canvas/FabricCanvas.tsx, src/stores/cadStore.ts, src/lib/geometry.ts]
tech-stack:
  added: []
  patterns: [absolute-positioned-HTML-overlay-on-canvas, epsilon-based-endpoint-matching]
key-files:
  created:
    - src/canvas/dimensionEditor.ts
  modified:
    - src/lib/geometry.ts
    - src/stores/cadStore.ts
    - src/canvas/FabricCanvas.tsx
    - tests/geometry.test.ts
    - tests/cadStore.test.ts
    - tests/dimensionEditor.test.ts
decisions:
  - "0.01ft epsilon for shared-endpoint corner matching"
  - "Plain feet input (no feet+inches parsing) per D-10"
  - "Input overlay rendered as absolutely-positioned HTML sibling of canvas"
metrics:
  duration: "3m"
  completed: "2026-04-05"
  tasks: 4
  files: 6
---

# Phase 01 Plan 04: Editable Wall Dimension Labels Summary

Double-clickable wall dimension labels with inline feet input; resize keeps wall start fixed, moves end along unit vector, and propagates corner moves to walls sharing the endpoint within 0.01ft epsilon.

## What Was Built

**EDIT-06 closed.** Four tasks delivered:

1. **`resizeWall(wall, newLengthFt)`** in `src/lib/geometry.ts` — pure geometry helper. Moves wall end along unit vector; guards zero-length and `newLengthFt <= 0`.
2. **`resizeWallByLabel(id, lengthFt)`** in `src/stores/cadStore.ts` — Zustand action. Resizes target wall and scans all other walls for shared endpoints (EPS=0.01ft) to preserve corners. History-tracked for undo.
3. **`src/canvas/dimensionEditor.ts`** — new module with `computeLabelPx` (mirrors `drawWallDimension` positioning math), `hitTestDimLabel` (24px hit radius), and `validateInput` (parseFloat, rejects <=0/non-numeric).
4. **`FabricCanvas.tsx` overlay** — `mouse:dblclick` handler hit-tests walls by their dim label position; opens an absolutely-positioned `<input>` styled with `bg-obsidian-high text-accent-light border-accent`. Enter commits via `resizeWallByLabel`, Escape cancels, blur commits.

## Verification

- `bun x vitest run` — 26 passed, 9 todo (rest of phase tasks), 2 skipped
- New tests: 9 geometry, 1 cadStore corner-propagation, 3 dimensionEditor — all green
- Grep acceptance criteria all met (mouse:dblclick, hitTestDimLabel, resizeWallByLabel, editingWallId, data-testid)
- Manual verify (browser): pending user test — draw two perpendicular walls meeting at corner, double-click dim label, type new length, press Enter → expect wall resizes AND connected wall's endpoint moves with corner

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing test runner binary**
- **Found during:** Task 1 verification
- **Issue:** `npx` and `bunx` not on PATH — `which npm node bun` all failed initially.
- **Fix:** Used `$HOME/.bun/bin/bun x vitest` directly (bun 1.3.11 found at `~/.bun/bin/bun`).
- **Files modified:** none (runtime-only)
- **Commit:** n/a

**2. [Rule 3 - Blocking] Parallel executor modified cadStore.ts mid-task**
- **Found during:** Task 2 write-phase
- **Issue:** Another parallel wave-2 executor (Plan 03 rotation) added `rotateProductNoHistory` to `cadStore.ts` and tests between my Read and Write calls.
- **Fix:** Re-read file, re-applied additions as targeted Edits on top of existing state. Test file similarly had new tests added — my `it()` replaced the right `it.todo` line.
- **Files modified:** src/stores/cadStore.ts, tests/cadStore.test.ts
- **Commit:** e8f6f5e

**3. [Rule 2 - Correctness] Added `relative` class to wrapper div**
- **Found during:** Task 4 overlay JSX
- **Issue:** Overlay input uses `position: absolute` but wrapper had no positioning context, which would break label-relative placement.
- **Fix:** Added `relative` to wrapper's className.
- **Files modified:** src/canvas/FabricCanvas.tsx
- **Commit:** f6df273

### Out of Scope (Deferred)

Pre-existing TypeScript errors remain in `src/canvas/dimensions.ts`, `src/canvas/fabricSync.ts`, `src/main.tsx` — not introduced by this plan, not caused by our changes. Out of scope per CLAUDE.md / execute-plan scope boundary.

## Commits

- 2bb5df0 — feat(01-04): add resizeWall geometry helper
- e8f6f5e — feat(01-04): add resizeWallByLabel store action with corner propagation
- 008405e — feat(01-04): add dimensionEditor hit-test + label position helpers
- f6df273 — feat(01-04): wire inline dim-label edit overlay in FabricCanvas

## Self-Check: PASSED

- src/canvas/dimensionEditor.ts — FOUND
- src/lib/geometry.ts (resizeWall) — FOUND
- src/stores/cadStore.ts (resizeWallByLabel) — FOUND
- src/canvas/FabricCanvas.tsx (overlay) — FOUND
- Commits 2bb5df0, e8f6f5e, 008405e, f6df273 — all FOUND in git log
