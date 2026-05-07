---
phase: 72-primitives-shelf
plan: "01"
subsystem: design-system
tags: [primitives, cn, motion, tailwind-merge, radix-ui, dependencies]
dependency_graph:
  requires: []
  provides: [cn, SPRING_SNAPPY, SPRING_NONE, springTransition, ui-barrel]
  affects: [72-02, 72-03, 72-04, 72-05]
tech_stack:
  added: [clsx, tailwind-merge, class-variance-authority, motion, "@radix-ui/react-dialog", "@radix-ui/react-popover", "@radix-ui/react-tooltip", "@radix-ui/react-slot"]
  patterns: [twMerge(clsx()), spring-presets, reduced-motion-helper]
key_files:
  created:
    - src/lib/cn.ts
    - src/lib/motion.ts
    - src/components/ui/index.ts
    - tests/primitives/cn.test.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - "Import type Transition from motion/react to avoid runtime import side-effects"
  - "Barrel export starts as empty placeholder (export {}) — populated by Plans 02-05"
metrics:
  duration: "~5 min"
  completed: "2026-05-07"
  tasks: 2
  files: 6
---

# Phase 72 Plan 01: Primitives Foundation — Summary

Installed all 8 Phase 72 npm dependencies and created the foundation utility files that every subsequent plan depends on.

## What Was Built

**cn() className merge utility** (`src/lib/cn.ts`): wraps `twMerge(clsx())` to merge classNames and resolve Tailwind conflicts. Last class wins on conflicts (e.g. `cn("p-4","p-2")` → `"p-2"`).

**Spring motion presets** (`src/lib/motion.ts`): exports `SPRING_SNAPPY` (stiffness 400, damping 30), `SPRING_NONE` (duration 0), and `springTransition(reduced)` which returns the instant preset when reduced-motion is active.

**UI barrel skeleton** (`src/components/ui/index.ts`): empty placeholder export that Plans 02-05 will populate as each primitive ships.

**cn() test suite** (`tests/primitives/cn.test.ts`): 5 tests locking the contract — basic merge, background color conflict, falsy filtering, padding conflict, text color conflict. All pass.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 1a98dcf | feat: install deps + cn.ts, motion.ts, ui barrel |
| 2 | b78f166 | test: 5 cn() unit tests passing |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `src/components/ui/index.ts` is an intentional placeholder (`export {}`). Plans 02-05 add real exports. Not a functional stub — design intent per plan.

## Self-Check: PASSED
