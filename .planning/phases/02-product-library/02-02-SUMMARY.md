---
phase: 02-product-library
plan: 02
subsystem: ui
tags: [react, zustand, forms, nullable-dims, product-library]

requires:
  - phase: 02-product-library
    provides: "nullable Product.width/depth/height schema + hasDimensions helper + productStore.updateProduct (from 02-01)"
provides:
  - "SKIP_DIMENSIONS checkbox in AddProductModal and ProductForm"
  - "Null-dim emission: skipDims=true → onAdd called with width/depth/height=null"
  - "'SIZE: UNSET' rendering on ProductLibrary cards for null-dim products"
  - "Editable W/D/H inputs in PropertiesPanel for selected placed products whose library record has null dims"
  - "Filled-in AddProductModal component test suite (4 tests)"
affects: [02-03, 02-04, future product-editing UX]

tech-stack:
  added: []
  patterns:
    - "skipDims-gated grey-out (opacity-40 pointer-events-none) for conditional form fields"
    - "defaultValue + onBlur commits for dim editors (uncontrolled, commit-on-blur)"
    - "useProductStore subscription IN ADDITION to existing prop drilling (migration runway for plan 03)"

key-files:
  created:
    - src/components/PropertiesPanel.tsx
  modified:
    - src/components/AddProductModal.tsx
    - src/components/ProductForm.tsx
    - src/components/ProductLibrary.tsx
    - tests/AddProductModal.test.tsx

key-decisions:
  - "skipDims is local component state (useState) — not lifted to productStore, since it only governs submission payload"
  - "PropertiesPanel reads libProduct from productStore (fresh) but keeps productLibrary prop for backward compat — plan 03 removes prop"
  - "Editable dim inputs use defaultValue + onBlur (uncontrolled) so Jessica can type freely without re-render thrash"
  - "Filter inputs to >0 on blur commit prevents clearing a field from nuking a saved dim"

patterns-established:
  - "Skip-toggle pattern: checkbox sibling + opacity-40 pointer-events-none on sibling grid"
  - "Null-safe dim row rendering: hasDimensions(p) ? 'W × D × H FT' : 'SIZE: UNSET'"

requirements-completed: [LIB-04]

duration: 3min
completed: 2026-04-05
---

# Phase 02 Plan 02: Skip Dimensions UI Wiring Summary

**SKIP_DIMENSIONS toggle wired through AddProductModal + ProductForm (null-dim emission), SIZE:UNSET cards in ProductLibrary, and editable W/D/H grid in PropertiesPanel — closing LIB-04 at the UI layer.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-05T03:01:28Z
- **Completed:** 2026-04-05T03:04:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Jessica can now drop an image with only a name — W/D/H are skippable via checkbox and emit `null`
- Null-dim products show `SIZE: UNSET` on library cards and in the PropertiesPanel dim rows
- Any placed product whose library record has null dims exposes a 3-cell editable grid in PropertiesPanel (commit-on-blur)
- AddProductModal test suite filled in — 4 passing tests covering render, grey-out, null submit, numeric submit

## Task Commits

Each task was committed atomically (TDD for Task 1):

1. **Task 1 RED+GREEN: Skip Dimensions toggle + tests** — `642f5c9` (feat)
2. **Task 2: ProductLibrary SIZE:UNSET + PropertiesPanel editable dims** — `f95c3ce` (feat)

## Files Created/Modified

- `src/components/AddProductModal.tsx` — Added skipDims state, checkbox above dim grid, grey-out wrapper, null emission on submit
- `src/components/ProductForm.tsx` — Same skipDims pattern applied to secondary add form
- `src/components/ProductLibrary.tsx` — Imported hasDimensions, switched dim row to conditional "SIZE: UNSET" label
- `src/components/PropertiesPanel.tsx` — Imported useProductStore + hasDimensions, added conditional SIZE:UNSET row and editable W/D/H grid for null-dim library products
- `tests/AddProductModal.test.tsx` — Replaced 4 it.todo stubs with real tests (render, toggle grey-out, null submit, numeric submit with explicit W/D/H)

## Decisions Made

- **skipDims is local to each form** — not a store flag, since it only shapes the submission payload
- **PropertiesPanel dual-reads** — reads libProduct from productStore (for fresh dims after edit) while retaining the legacy `productLibrary` prop; plan 03 migrates fully to the store
- **Uncontrolled dim inputs** — `defaultValue` + `onBlur` commit pattern avoids controlled re-render churn while Jessica types

## Deviations from Plan

None — plan executed exactly as written. All acceptance-criteria greps pass on first attempt, TDD RED→GREEN clean.

## Issues Encountered

**1. Parallel-scope test noise in full-suite run**
- `tests/SidebarProductPicker.test.tsx` fails with `ReferenceError: indexedDB is not defined` in jsdom
- Root cause: the test imports `SidebarProductPicker` which triggers `productStore.subscribe → idb-keyval.set` during module init; jsdom has no IndexedDB
- **Out of scope for plan 02-02** — this test file and the SidebarProductPicker component belong to plan 02-03 (in-flight parallel execution per git log)
- Verified scope isolation: running `vitest run AddProductModal productHelpers productSearch productStore` → 27/27 pass
- Deferred: plan 02-03 must add fake-indexeddb or guard the subscribe-persist so tests can mount store-dependent components
- Logged to: `.planning/phases/02-product-library/deferred-items.md` (to be created by plan 02-03 executor)

## Known Stubs

None. All UI paths emit and consume real values from store/props.

## Next Phase Readiness

- LIB-04 fully delivered at UI layer (store schema from 02-01 + UI wiring from 02-02)
- Plan 02-03 can safely drop the `productLibrary` prop from PropertiesPanel in favor of the already-wired `useProductStore` subscription
- Plan 02-03 must fix the jsdom IndexedDB issue before SidebarProductPicker tests can run

## Self-Check: PASSED

- src/components/AddProductModal.tsx: FOUND
- src/components/ProductForm.tsx: FOUND
- src/components/ProductLibrary.tsx: FOUND
- src/components/PropertiesPanel.tsx: FOUND
- tests/AddProductModal.test.tsx: FOUND
- Commit 642f5c9: FOUND
- Commit f95c3ce: FOUND

---
*Phase: 02-product-library*
*Completed: 2026-04-05*
