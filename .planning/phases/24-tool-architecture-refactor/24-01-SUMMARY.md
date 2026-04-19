---
phase: 24-tool-architecture-refactor
plan: 01
subsystem: testing
tags: [vitest, fabric, refactor-scaffolding, typescript]

# Dependency graph
requires:
  - phase: 24-tool-architecture-refactor
    provides: "Context gathering (24-CONTEXT.md) and research (24-RESEARCH.md, 24-VALIDATION.md)"
provides:
  - "src/canvas/tools/toolUtils.ts — shared pxToFeet + findClosestWall helpers (zero consumers yet)"
  - "tests/toolCleanup.test.ts — 6 skipped listener-leak regression tests (Wave 2 un-skips)"
  - "Pre-existing test-failure baseline captured in VALIDATION.md by full test name"
affects: [24-02-wave1-consolidate-helpers, 24-03-wave2-cleanup-pattern, 24-04-wave3-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared tool-scoped helpers under src/canvas/tools/ (not src/lib/) when they depend on getActiveRoomDoc"
    - "Required (non-optional) parameters on shared helpers to surface size-contract mismatches at compile time (Pitfall #6)"
    - "Scaffolded-but-skipped regression tests land ahead of the refactor that flips them to active"

key-files:
  created:
    - src/canvas/tools/toolUtils.ts
    - tests/toolCleanup.test.ts
  modified:
    - .planning/phases/24-tool-architecture-refactor/24-VALIDATION.md

key-decisions:
  - "findClosestWall(feetPos, minWallLength) takes minWallLength as a REQUIRED parameter, not optional/defaulted — forces door (3ft) vs. window (3ft) vs. future elements to state their width explicitly at each call site"
  - "toolUtils.ts walls access uses getActiveRoomDoc()?.walls ?? {} with Object.values() iteration — matches existing doorTool/windowTool pattern (Record<string, WallSegment> shape confirmed)"
  - "Leak-regression test scaffold uses describe.skip in Wave 0 because activate*Tool currently returns void, not a cleanup fn — Wave 2 flips it to active describe in a single keystroke"
  - "Listener-count inspection uses Fabric v6 runtime field fc.__eventListeners (cast through unknown) per RESEARCH.md §7 Approach C — single-file dependency, no wrapper module needed"

patterns-established:
  - "Wave 0 scaffolding: land the shared module + its regression test + the baseline capture BEFORE consumer-facing commits, so later waves have a stable reference"
  - "Baseline-then-diff test strategy: capture full failing test names upfront, use equality-with-baseline as the pass criterion"

requirements-completed: [TOOL-03]

# Metrics
duration: 2min
completed: 2026-04-17
---

# Phase 24 Plan 01: Wave 0 Scaffolding Summary

**Shared toolUtils.ts module + skipped listener-leak regression test + captured 6-test failure baseline — all three artifacts landed with zero consumer-code changes.**

## Performance

- **Duration:** 1m 48s
- **Started:** 2026-04-18T02:59:56Z
- **Completed:** 2026-04-18T03:01:44Z
- **Tasks:** 3
- **Files modified:** 3 (1 doc, 1 source, 1 test)

## Accomplishments

- Captured the exact 6 pre-existing failing test names in VALIDATION.md (all in LIB-03/04/05 product-library code, zero in tool code — confirmed via grep)
- Created `src/canvas/tools/toolUtils.ts` exporting `pxToFeet(px, origin, scale)`, `findClosestWall(feetPos, minWallLength)`, and `WALL_SNAP_THRESHOLD_FT = 0.5` — compiles clean with zero consumers
- Created `tests/toolCleanup.test.ts` with 6 `describe.skip` cases (door/window/product/ceiling/wall/select), shared `expectLeakFree` helper using Fabric v6's `__eventListeners` runtime field
- Preserved test baseline exactly: 6 failed | 162 passed | 3 todo pre-change → 6 failed | 162 passed | 6 skipped | 3 todo post-change (the 6 skipped are the new Wave 0 scaffold, baseline failures unchanged)

## Task Commits

Each task was committed atomically:

1. **Task 1: Capture pre-existing test-failure baseline** — `3fa5919` (docs)
2. **Task 2: Create src/canvas/tools/toolUtils.ts** — `a1ca5ee` (feat)
3. **Task 3: Create tests/toolCleanup.test.ts (6 skipped cases)** — `cbca2d5` (test)

## Files Created/Modified

- `src/canvas/tools/toolUtils.ts` — NEW. Exports shared `pxToFeet`, `findClosestWall(feetPos, minWallLength)`, and `WALL_SNAP_THRESHOLD_FT` constant. Uses `closestPointOnWall`/`distance`/`wallLength` from `@/lib/geometry` and `getActiveRoomDoc` from `@/stores/cadStore`. 43 lines.
- `tests/toolCleanup.test.ts` — NEW. 6 skipped test cases wired to all 6 tool activators. Shared `expectLeakFree(activator)` helper runs 10 activate/cleanup cycles asserting listener count returns to baseline. 79 lines.
- `.planning/phases/24-tool-architecture-refactor/24-VALIDATION.md` — UPDATED. Replaced the "Wave 0 task" placeholder checkboxes (lines 28–34) with the 6 recorded test names, capture date, and grep confirmation.

## Decisions Made

- **Required `minWallLength` parameter on `findClosestWall`**: per RESEARCH.md Pitfall #6, making it required (not `minWallLength?: number` or `= 0.5`) forces door/window/future callers to explicitly state their element width. Prevents silent "oh, we forgot to pass the width" bugs from slipping through.
- **`WALL_SNAP_THRESHOLD_FT = 0.5` as named export**: replaces the magic literal 0.5 scattered across 6 tool files. Named constant makes it discoverable in IDE autocomplete and grep-able.
- **`describe.skip` over `test.todo`**: skipping the whole describe block keeps the scaffold compilable while signalling "Wave 2 will enable". Avoids the false-green of `test.todo` (which doesn't even instantiate the activator and wouldn't catch a broken import).
- **Landed Wave 0 as pure scaffolding**: zero tool files touched. Future diff reviews will see Wave 1 changes against a stable `toolUtils.ts` baseline rather than a simultaneously-moving target.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0
**Impact on plan:** Plan's artifact list, signatures, and verification gates all matched actual output byte-for-byte.

## Issues Encountered

None. Type-check and test suite both clean at each commit. The only `tsc --noEmit` output was a pre-existing `tsconfig.json` deprecation warning for `baseUrl` (unrelated to this plan, tracked as deferred tech debt).

## User Setup Required

None - no external service configuration required.

## Handoff Note for Wave 1 (24-02)

- `toolUtils.ts` exports exactly: `pxToFeet(px, origin, scale)` and `findClosestWall(feetPos, minWallLength)`.
- Import from `./toolUtils` (sibling import inside `src/canvas/tools/`).
- **Do not add optional params or defaults** — `minWallLength` is required by design.
- All 6 tool files still contain their local `pxToFeet` copies and (in door/window) local `findClosestWall` copies; Wave 1's job is to delete those and import from `./toolUtils` instead.
- `WALL_SNAP_THRESHOLD_FT` is available if Wave 1 wants to also replace the inline `0.5` literals in door/window, though the primary deduplication goal is `pxToFeet` + `findClosestWall`.

## Next Phase Readiness

- Wave 1 (24-02) can start immediately — toolUtils.ts is importable and type-checks clean.
- Wave 2 (24-03) can't run its leak test until it does two things: (1) change activate*Tool return types from `void` to `() => void`, and (2) flip `describe.skip` → `describe` in `tests/toolCleanup.test.ts`. Both are explicitly scoped to Wave 2.
- Baseline capture in VALIDATION.md is the reference any wave cites when distinguishing "new regression" vs. "pre-existing failure".

---

## Self-Check: PASSED

- `src/canvas/tools/toolUtils.ts` exists and contains `pxToFeet`, `findClosestWall`, `WALL_SNAP_THRESHOLD_FT` exports (verified via grep).
- `tests/toolCleanup.test.ts` exists with 6 test cases wrapped in `describe.skip` (verified — `grep -c "test(\""` returned 6).
- All 3 commits exist on branch `claude/friendly-merkle-8005fb`: `3fa5919`, `a1ca5ee`, `cbca2d5`.
- Zero consumer tool files modified: `git diff --name-only HEAD~3 HEAD -- src/canvas/tools/ | grep -v toolUtils.ts` returned empty.
- `npx tsc --noEmit` exits 0 (only pre-existing tsconfig baseUrl deprecation warning, unrelated).
- `npm test` baseline unchanged: same 6 LIB-03/04/05 failures; 6 new toolCleanup tests correctly skipped.

---
*Phase: 24-tool-architecture-refactor*
*Completed: 2026-04-17*
