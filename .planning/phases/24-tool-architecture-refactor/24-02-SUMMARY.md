---
phase: 24-tool-architecture-refactor
plan: 02
subsystem: canvas-tools
tags: [refactor, dry, typescript, fabric, tool-consolidation]

# Dependency graph
requires:
  - phase: 24-tool-architecture-refactor
    provides: "Wave 0 scaffolding — toolUtils.ts module with pxToFeet, findClosestWall(feetPos, minWallLength), WALL_SNAP_THRESHOLD_FT"
provides:
  - "6 tool files consuming ./toolUtils — zero local pxToFeet or findClosestWall copies under src/canvas/tools/"
  - "findClosestWall call sites now pass DOOR_WIDTH / WINDOW_WIDTH explicitly (compile-time contract)"
affects: [24-03-wave2-cleanup-pattern, 24-04-wave3-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tool-local constants kept at module scope (DOOR_WIDTH, WINDOW_WIDTH) when they're per-tool identity, not snap/threshold logic"
    - "Pure delete-and-import refactor as an isolated commit — cleanup-pattern changes deferred to Wave 2 so Wave 1 stays bisectable"

key-files:
  created: []
  modified:
    - src/canvas/tools/doorTool.ts
    - src/canvas/tools/windowTool.ts
    - src/canvas/tools/productTool.ts
    - src/canvas/tools/ceilingTool.ts
    - src/canvas/tools/wallTool.ts
    - src/canvas/tools/selectTool.ts

key-decisions:
  - "Removed local SNAP_THRESHOLD=0.5 consts from doorTool + windowTool — they had zero remaining callers after findClosestWall was consolidated (grep-confirmed). WALL_SNAP_THRESHOLD_FT from toolUtils now owns that literal."
  - "Kept DOOR_WIDTH=3 and WINDOW_WIDTH=3 at module scope per the plan's explicit guidance — they are per-tool element widths, not snap/threshold logic, and they're now passed to findClosestWall as required parameters."
  - "Dropped the local 'WallSegment' import from ceilingTool and productTool (never used) but preserved it in doorTool + windowTool where the updatePreview function still types its 'hit' parameter."
  - "Dropped 'getActiveRoomDoc' + 'closestPointOnWall' + 'distance' imports from doorTool + windowTool — they were only used by the deleted local findClosestWall."

requirements-completed: [TOOL-03]

# Metrics
duration: 2min 37s
completed: 2026-04-17
---

# Phase 24 Plan 02: Wave 1 Consolidate Helpers Summary

**All 6 canvas tool files now consume pxToFeet (and findClosestWall where relevant) from the shared ./toolUtils module — zero local duplicates remain, test baseline preserved byte-for-byte, cleanup pattern intentionally untouched for Wave 2.**

## Performance

- **Duration:** 2m 37s
- **Started:** 2026-04-18T03:04:27Z
- **Completed:** 2026-04-18T03:07:04Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Deleted 6 byte-identical `pxToFeet` function bodies (one each in doorTool, windowTool, productTool, ceilingTool, wallTool, selectTool) — replaced with a single sibling import from `./toolUtils`
- Deleted 2 near-identical `findClosestWall` function bodies (doorTool, windowTool) — replaced with sibling import; call sites updated to pass `DOOR_WIDTH` / `WINDOW_WIDTH` as the required `minWallLength` argument
- Net 107 lines deleted across 6 files (16 insertions, 123 deletions)
- Baseline test suite unchanged: 6 failed | 162 passed | 6 skipped | 3 todo — identical to Wave 0 capture
- `npx tsc --noEmit` exits 0 (only the pre-existing `tsconfig.baseUrl` deprecation warning, tracked as deferred debt)

## Task Commits

Each task was committed atomically:

1. **Task 1: Consolidate helpers in 4 simple tools (door, window, product, ceiling)** — `ce8d8ca` (refactor)
2. **Task 2: Consolidate pxToFeet in wallTool + selectTool** — `9208523` (refactor)

## Files Modified

| File | Change | Net lines |
|------|--------|-----------|
| `src/canvas/tools/doorTool.ts` | Deleted local `pxToFeet`, `findClosestWall`, `SNAP_THRESHOLD`; added import; updated 2 call sites to pass `DOOR_WIDTH` | −38 |
| `src/canvas/tools/windowTool.ts` | Deleted local `pxToFeet`, `findClosestWall`, `SNAP_THRESHOLD`; added import; updated 2 call sites to pass `WINDOW_WIDTH` | −38 |
| `src/canvas/tools/productTool.ts` | Deleted local `pxToFeet`; added import | −11 |
| `src/canvas/tools/ceilingTool.ts` | Deleted local `pxToFeet`; added import | −10 |
| `src/canvas/tools/wallTool.ts` | Deleted local `pxToFeet`; added import | −10 |
| `src/canvas/tools/selectTool.ts` | Deleted local `pxToFeet`; added import | −10 |

## Decisions Made

- **Removed `SNAP_THRESHOLD` consts from doorTool + windowTool**: After local `findClosestWall` was deleted, grep confirmed zero remaining references to `SNAP_THRESHOLD` in either file. Leaving the const would be dead code. `WALL_SNAP_THRESHOLD_FT` in toolUtils.ts is now the single source of truth for the 0.5ft snap radius.
- **Kept `DOOR_WIDTH` / `WINDOW_WIDTH` at module scope**: Plan explicitly called this out. They're not threshold/snap semantics — they're per-tool element sizes that flow through to `addOpening` + `updatePreview` in addition to being passed to `findClosestWall`.
- **Pruned now-unused imports**: With local `findClosestWall` gone, doorTool + windowTool no longer needed `getActiveRoomDoc`, `closestPointOnWall`, or `distance`. Removed to keep the diff clean and avoid tsc `unused import` warnings on future noUnusedLocals flips.
- **Preserved `findNearestEndpoint` in wallTool**: Per D-08 and RESEARCH.md §6 — only wallTool uses it, so it doesn't warrant promotion to toolUtils.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed now-unused imports in doorTool + windowTool**
- **Found during:** Task 1
- **Issue:** After deleting local `findClosestWall`, the imports for `getActiveRoomDoc`, `closestPointOnWall`, `distance`, and the bare `Point` type were orphaned.
- **Fix:** Dropped the orphaned imports. `wallLength` and `angle as wallAngle` stayed (still used by `updatePreview`). `WallSegment` type stayed (still used by `updatePreview` parameter type).
- **Files modified:** `src/canvas/tools/doorTool.ts`, `src/canvas/tools/windowTool.ts`
- **Commit:** `ce8d8ca`

**Total deviations:** 1 (minor import hygiene — a strict reading of the plan's "delete duplicate + add import" scope)
**Impact on plan:** Neutral. Prevents dead-import warnings if TypeScript strictness increases in a future phase.

## Issues Encountered

None. Type-check clean at each commit. Test suite baseline held byte-for-byte across both tasks.

## Scope Discipline — What Was NOT Touched

Per plan's explicit scope guards:
- All 18 `(fc as any).__xToolCleanup` casts across the 6 files — INTACT (Wave 2's job)
- Module-level `state` objects in `wallTool.ts`, `selectTool.ts`, `ceilingTool.ts` — INTACT (Wave 2's job)
- `pendingProductId` module-level binding in `productTool.ts` — INTACT (D-07: intentional public API)
- `WallToolState` / `SelectState` / `CeilingToolState` interface definitions — INTACT
- `deactivate<Tool>Tool` exported functions — INTACT (Wave 2 removes them with cleanup-fn return pattern)
- 4 `as any` casts in selectTool for custom-elements catalog access — INTACT (D-10: deferred)
- `FabricCanvas.tsx` — untouched

## User Setup Required

None — pure internal refactor, zero user-visible behavior change.

## Handoff Note for Wave 2 (24-03)

Helpers consolidated. `./toolUtils` is the single source of truth for `pxToFeet` + `findClosestWall`. Next: apply cleanup-fn return pattern and closure-state migration.

Recommended order per plan:
1. Start with the 4 simple tools (door, window, product, ceiling) — smallest surface area, easiest to verify
2. Then `wallTool` — has module-level `state` + `findNearestEndpoint` helper that will need closure access
3. Then `selectTool` — 750+ lines with deeply nested handlers; closure migration is the biggest risk here
4. Update `FabricCanvas.tsx` tool-dispatch useEffect to track the returned cleanup fn in a ref (or Map), drop the `deactivate*Tool(fc)` calls
5. Flip `describe.skip` → `describe` in `tests/toolCleanup.test.ts` — the 6 leak-regression tests instantiated in Wave 0 now have a contract to verify

Watch-items flagged by 24-RESEARCH.md §6:
- Any helpers that were module-scoped and read `state` directly must either move into the closure or take state as a parameter
- `setSelectToolProductLibrary` + `_productLibrary` module-scope binding stays (toolbar → tool bridge, same pattern as `pendingProductId`)

## Next Phase Readiness

- Wave 2 (24-03) can start immediately. The helpers it depends on are now fully consolidated.
- The `requirements-completed: [TOOL-03]` frontmatter will let `requirements mark-complete TOOL-03` update the traceability table.
- Wave 3 (24-04) verification is unblocked as soon as Wave 2 finishes the cleanup-pattern work.

---

## Self-Check: PASSED

- All 6 tool files modified and committed: `ce8d8ca` (4 files) + `9208523` (2 files) — verified on branch `claude/friendly-merkle-8005fb`.
- `grep -rE "^function pxToFeet" src/canvas/tools/` returns zero matches.
- `grep -rE "^function findClosestWall" src/canvas/tools/` returns zero matches (toolUtils uses `export function` prefix).
- All 6 tool files contain `from "./toolUtils"`.
- `findClosestWall(feet, DOOR_WIDTH)` call sites verified (2 in doorTool).
- `findClosestWall(feet, WINDOW_WIDTH)` call sites verified (2 in windowTool).
- `(fc as any)` cast count preserved: 3 each in wallTool, selectTool, doorTool, windowTool, productTool, ceilingTool = 18 total, Wave 2's job to remove.
- Module-level `state` objects still present in wallTool (`const state: WallToolState`) and selectTool (`const state: SelectState`).
- `npx tsc --noEmit` exits 0.
- `npm test` baseline unchanged: 6 failed | 162 passed | 6 skipped | 3 todo.

---
*Phase: 24-tool-architecture-refactor*
*Completed: 2026-04-17*
