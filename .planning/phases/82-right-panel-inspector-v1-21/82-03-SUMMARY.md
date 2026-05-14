---
phase: 82-right-panel-inspector-v1-21
plan: "03"
subsystem: ui
tags: [react, inspector, ia-05, opening-sub-selection, window-presets, refactor]

# Dependency graph
requires:
  - phase: 82-02
    provides: "WallInspector with Geometry/Material/Openings tabs (D-05)"
  - phase: 82-01
    provides: "uiStore.selectedOpeningId slice + clear semantics; OpeningRow data-testid contract"
  - phase: 79
    provides: "WindowPresetRow JSX, WINDOW_PRESETS catalog, derivePreset() — lifted verbatim"
  - phase: 72
    provides: "<Tabs> primitive — reused inside OpeningInspector"
provides:
  - "New OpeningInspector surfaces Preset/Dimensions/Position tabs for windows (Type/Dimensions/Position for doors / archways / passthroughs / niches)"
  - "Phase 79 chip row mounted in the Preset tab — applyPreset body byte-identical; single-undo invariant intact"
  - "Wall inspector dispatches to OpeningInspector when uiStore.selectedOpeningId matches an opening on the current wall"
  - "PropertiesPanel.OpeningSection.OpeningRow navigates via setSelectedOpeningId (no inline expand/accordion)"
  - "PropertiesPanel.OpeningSection.NumericRow exported for OpeningInspector reuse"
  - "Phase 79 e2e (window-presets.spec.ts) navigates the new Openings-tab + opening-row prelude"
affects: []

tech-stack:
  added: []
  patterns:
    - "Sub-selection inspector pattern: WallInspector early-returns OpeningInspector when uiStore.selectedOpeningId matches an opening on the current wall"
    - "Verbatim JSX-lift to preserve single-undo invariant (Phase 79 D-07): function body byte-identical, store action untouched, history-push delta = 1 per chip click"
    - "Derive-on-read preserved (Phase 79 D-08): derivePreset(opening) lives on the render path; no presetId field on Opening type"
    - "key={opening.id} on OpeningInspector outer wrapper for D-03 tab reset on opening swap"

key-files:
  created:
    - src/components/inspectors/OpeningInspector.tsx
    - tests/OpeningInspector.preset.test.tsx
    - tests/OpeningInspector.singleUndo.test.tsx
    - .planning/phases/82-right-panel-inspector-v1-21/deferred-items.md
  modified:
    - src/components/inspectors/WallInspector.tsx
    - src/components/PropertiesPanel.OpeningSection.tsx
    - tests/components/PropertiesPanel.opening.test.tsx
    - tests/e2e/specs/window-presets.spec.ts

key-decisions:
  - "OpeningInspector handles Type tab for non-window openings (D-05) — minimal in v1.21 (just the type label + TODO comment); door hinge / swing controls are future work"
  - "WindowPresetBody is a NESTED helper inside OpeningInspector.tsx (not a sibling module) — the body is verbatim from the Phase 79 WindowPresetRow function; co-locating keeps the D-07 invariant chain visible at the call site"
  - "OpeningRow click handler swaps the old expand/collapse useState for a single setSelectedOpeningId(opening.id) call — the +/− indicator becomes →, the inline OpeningEditor body is gone"
  - "OpeningEditor function deleted outright (not retained behind an underscore prefix) — TypeScript unused-locals would flag it; no test file imports it directly (verified via grep)"
  - "tests/components/PropertiesPanel.opening.test.tsx migrated to render OpeningInspector directly for C1/C2 — the original tests asserted on an inline-expand body that the IA-05 flow eliminates; data-testid + label contracts preserved verbatim"
  - "Phase 79 e2e nav-update was the ≤3-line prelude per D-06: getByRole('tab', {name:'Openings'}).click() + getByTestId('opening-row-{id}').click()"

patterns-established:
  - "Inspector sub-selection: WallInspector reads uiStore.selectedOpeningId and conditionally early-returns a different inspector instead of its normal tabbed body. The same pattern generalizes to any future inspector that wants sub-entities (Product → per-face material, etc.)"
  - "Verbatim lift = byte-identical body + same data-testids = invariants travel with the JSX. We don't need a separate regression test if the function body is unchanged; existing Phase 79 D-07 + D-08 tests cover the invariant from the new mount site"

requirements-completed: [IA-05]

# Metrics
duration: 18min
completed: 2026-05-14
---

# Phase 82 Plan 03: Opening sub-selection + OpeningInspector with Preset tab Summary

**The Phase 79 window-preset chip row is now the first visible control after a window is sub-selected — Wall tabs swap into a Preset/Dimensions/Position OpeningInspector when uiStore.selectedOpeningId matches an opening; verbatim JSX-lift preserves the single-undo invariant.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-05-14T23:23Z
- **Completed:** 2026-05-14T23:41Z
- **Tasks:** 4
- **Files modified:** 8 (4 created, 4 modified)

## Accomplishments

- New `OpeningInspector.tsx` renders `<Tabs>` with Preset/Dimensions/Position for window openings (Preset default) and Type/Dimensions/Position for other opening kinds (Type default). The "← Back to wall" breadcrumb is `data-testid="opening-back-to-wall"` and clears `uiStore.selectedOpeningId`.
- `WindowPresetBody` (nested helper inside OpeningInspector.tsx) is a verbatim lift of Phase 79's `WindowPresetRow`. The `applyPreset(p)` body is byte-identical: one `update(wall.id, opening.id, { width, height, sillHeight })` call → exactly one `past[]` entry per chip click. `derivePreset(opening)` is called on every render — no `presetId` field on `Opening`.
- `WallInspector` now reads `uiStore.selectedOpeningId` and early-returns `<OpeningInspector>` when the id matches an opening on the current wall. `<SavedCameraButtons>` deliberately do NOT render in sub-selection — they're a wall-view affordance.
- `OpeningRow` in `PropertiesPanel.OpeningSection.tsx` now navigates via `setSelectedOpeningId(opening.id)`; the inline expand/collapse + `OpeningEditor` body are gone. `data-testid="opening-row-{id}"` preserved verbatim (D-06).
- `NumericRow` exported from `PropertiesPanel.OpeningSection.tsx` for reuse inside `OpeningInspector`'s Dimensions / Position tabs.
- Phase 79 e2e (`tests/e2e/specs/window-presets.spec.ts`) updated with the ≤3-line nav prelude per D-06: `getByRole("tab", {name: "Openings"}).click()` then `getByTestId("opening-row-{id}").click()`. Chip selectors unchanged.
- 1012/1012 vitest tests pass (+9 over Plan 82-02's 1003 baseline). Production build clean. TypeScript clean for all touched files.

## Task Commits

Each task committed atomically:

1. **Task 1: RED IA-05 preset + single-undo tests** — `03c4079` (test)
2. **Task 2 + 3: OpeningInspector + WallInspector wiring** — `7f24e9c` (feat) — combined per the plan's explicit allowance ("Task 2 + Task 3 may land together; acceptable to combine into one commit if review prefers"). The two tasks share the same files (`WallInspector.tsx`, `PropertiesPanel.OpeningSection.tsx`) and would have been logically split across the same boundary as the commit anyway.
3. **Task 4: Update Phase 79 e2e nav prelude** — `e0add9b` (test)

## Files Created/Modified

**Created**
- `src/components/inspectors/OpeningInspector.tsx` — Sub-inspector mounted by WallInspector when uiStore.selectedOpeningId matches. Tabs vary by opening kind. Verbatim Phase 79 chip row inside Preset tab. NumericRow re-used inside Dimensions / Position tabs. clampNicheDepth still applies on niche Depth commit.
- `tests/OpeningInspector.preset.test.tsx` — 6 RTL specs (window): default Preset tab, tab order, 6 chips with verbatim Phase 79 testids, `opening-preset-label` text, "← Back to wall" clears selectedOpeningId. 1 spec (door): Type/Dimensions/Position with no Preset.
- `tests/OpeningInspector.singleUndo.test.tsx` — 3 specs: Picture chip click increments past.length by 1 and applies 6/4/1; undo() reverts to 3/4/3; Wide chip click increments past.length by 1 and applies 4/5/3.
- `.planning/phases/82-right-panel-inspector-v1-21/deferred-items.md` — Documents 3 pre-existing Phase 79 e2e failures (placement-via-canvas-click broken) that fail both before AND after this plan. Out of scope per scope-boundary clause.

**Modified**
- `src/components/inspectors/WallInspector.tsx` — Added `useUIStore` import + `OpeningInspector` import. Reads `selectedOpeningId`, computes `subOpening` from `(wall.openings ?? []).find(...)`, and early-returns `<OpeningInspector>` when matched. Trailing `<SavedCameraButtons>` row + Wall tabs body unchanged for the non-sub-selection path.
- `src/components/PropertiesPanel.OpeningSection.tsx` — Removed `WindowPresetRow` (lifted to OpeningInspector) + `OpeningEditor` (lifted) + now-unused imports (`clampNicheDepth`, `useCADStore`, `WINDOW_PRESETS`, `derivePreset`, `WindowPresetId`, `cn`). `OpeningRow` rewritten as a single button that calls `useUIStore.setSelectedOpeningId(opening.id)`. `NumericRow` got the `export` keyword. Header doc-comment updated to describe the new flow + bookmark the chip-row lift.
- `tests/components/PropertiesPanel.opening.test.tsx` — C1/C2/C3 migrated to render `<OpeningInspector>` directly (with kind-specific tab clicks: Dimensions for W/H/Sill, Position for Depth). Data-testid + label-text contracts preserved verbatim.
- `tests/e2e/specs/window-presets.spec.ts` — Inserted the 3-line nav prelude in 3 affected specs (test #4 "Preset: Wide", test #5 "Picture chip", test #6 "manually editing"). Chip selectors unchanged (D-06).

## Decisions Made

See `key-decisions` in frontmatter. The most consequential one: `OpeningEditor` was DELETED (not retained behind an underscore prefix). Initial draft retained it as `_OpeningEditor_UNUSED` to avoid surprise breakage, but TypeScript's unused-locals check would flag it and a grep across the test suite confirmed no test file imports `OpeningEditor` directly — every test that depended on its body either renders `OpeningsSection`, `PropertiesPanel`, or has been migrated to render `OpeningInspector`. Deleting it outright kept the codebase clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migrated tests/components/PropertiesPanel.opening.test.tsx C1/C2 to OpeningInspector**
- **Found during:** Task 2 + 3 verification (full vitest run after wiring WallInspector → OpeningInspector)
- **Issue:** C1 (`niche row shows Depth input when expanded`) and C2 (`passthrough row shows wall-height placeholder on the Height input`) clicked the opening-row data-testid and expected the inline `<OpeningEditor>` body to appear with W/H/Sill/Offset/Depth NumericRows. The IA-05 flow removes the inline expand — clicking the row now sets `uiStore.selectedOpeningId` and the editor surface moves to `<OpeningInspector>`. With OpeningsSection alone the assertions could never pass.
- **Fix:** Migrated the 3 specs to render `<OpeningInspector wall={wall} opening={op} />` directly, then `clickTab("Dimensions")` for the W/H/Sill assertions and `clickTab("Position")` for the Depth/Offset assertions. Data-testid (`opening-depth-{id}`) + label text (`Width`, `Height`, `Sill`, `Offset`, `Depth`) contracts preserved verbatim. Test count unchanged (3).
- **Files modified:** `tests/components/PropertiesPanel.opening.test.tsx`
- **Verification:** 3/3 specs pass; full PropertiesPanel.opening + OpeningInspector suites GREEN (12/12).
- **Committed in:** `7f24e9c` (Task 2 + 3 combined commit)

**2. [Rule 3 - Blocking] Deleted OpeningEditor function + unused imports instead of retaining as `_OpeningEditor_UNUSED`**
- **Found during:** Task 2 typecheck after the initial retain-as-underscore draft
- **Issue:** Retaining `_OpeningEditor_UNUSED` to "avoid surprise breakage" tripped TypeScript's noUnusedLocals warning, and a grep across the test suite confirmed no test imports `OpeningEditor` directly — every test that depended on its body either renders `OpeningsSection`, `PropertiesPanel`, or the new `OpeningInspector`. Keeping dead code blocked clean typecheck.
- **Fix:** Removed `OpeningEditor` outright + dropped unused imports (`clampNicheDepth`, `useCADStore`, `WINDOW_PRESETS`, `derivePreset`, `WindowPresetId`, `cn`). The replacement is a single-paragraph header comment bookmarking the lift.
- **Files modified:** `src/components/PropertiesPanel.OpeningSection.tsx`
- **Verification:** No `OpeningEditor` references remain in the codebase; TypeScript clean for all touched files.
- **Committed in:** `7f24e9c`

---

**Total deviations:** 2 auto-fixed (1 Rule 1 — bug introduced by my own wiring, 1 Rule 3 — blocking lint cleanup). No architectural changes. No store actions changed. No Phase 79 invariants touched.

## Issues Encountered

- 3 Phase 79 e2e tests fail at the upstream placement-via-canvas-click step (`page.mouse.click(box.x + box.width/2, box.y + box.height/2)` doesn't produce an opening on `wall_1`). Verified pre-existing via `git stash` + e2e re-run — same 3 failures on this commit AND on HEAD before this plan, same upstream error, same lines. Documented in `.planning/phases/82-right-panel-inspector-v1-21/deferred-items.md`. Tests #6 ("manually editing") + #7 ("switcher disappears") both pass and verify the new nav prelude end-to-end.
- Pre-existing failures in `tests/SaveIndicator.test.tsx` + `tests/SidebarProductPicker.test.tsx` (documented in Plan 82-01 SUMMARY) persist. Verified pre-existing via stash round-trip during prior plans; out of scope.

## Phase 79 invariants (verified mechanically)

- **D-07 single-undo:** `OpeningInspector.singleUndo.test.tsx` — chip click increments `past.length` by exactly 1; undo() reverts dims. Verified for Picture (6/4/1) and Wide (4/5/3) presets.
- **D-08 derive-on-read:** No `presetId` field added to `Opening`. `grep "presetId" src/types/cad.ts` returns nothing. `derivePreset(opening)` is called on every render inside `WindowPresetBody`.
- **D-09 (Phase 79):** No snapshot migration. No new opening field. Existing windows continue working.
- **D-06 (Phase 82):** All `data-testid` values verbatim: `opening-preset-label`, `opening-preset-chip-{id}-{small|standard|wide|picture|bathroom|custom}`, `opening-row-{id}`, `opening-depth-{id}`.

## User Setup Required

None — pure UI refactor + verbatim JSX lift.

## Next Phase Readiness

- Phase 82 closes here. Both IA-04 (tab system, Plan 82-02) and IA-05 (opening sub-selection, this plan) are landed.
- Future inspector phases that want sub-entities (Product → per-face material picker, etc.) can follow the WallInspector → OpeningInspector pattern: store a sub-selection id in uiStore, watch it from the parent inspector, early-return a different inspector when matched.
- StairInspector still flat per D-04 — if stair tabs are ever wanted, the pattern from Plan 82-02 (`<Tabs>` + key={entityId} at the mount site) is well-trodden.

---

*Phase: 82-right-panel-inspector-v1-21*
*Plan: 82-03*
*Completed: 2026-05-14*

## Self-Check: PASSED

**Files verified to exist:**
- src/components/inspectors/OpeningInspector.tsx — FOUND
- tests/OpeningInspector.preset.test.tsx — FOUND
- tests/OpeningInspector.singleUndo.test.tsx — FOUND
- src/components/inspectors/WallInspector.tsx — FOUND (modified)
- src/components/PropertiesPanel.OpeningSection.tsx — FOUND (modified)
- tests/components/PropertiesPanel.opening.test.tsx — FOUND (modified)
- tests/e2e/specs/window-presets.spec.ts — FOUND (modified)
- .planning/phases/82-right-panel-inspector-v1-21/82-03-SUMMARY.md — FOUND
- .planning/phases/82-right-panel-inspector-v1-21/deferred-items.md — FOUND

**Commits verified in git log:**
- 03c4079 — FOUND (test: RED IA-05 specs)
- 7f24e9c — FOUND (feat: OpeningInspector wiring)
- e0add9b — FOUND (test: e2e nav prelude)
