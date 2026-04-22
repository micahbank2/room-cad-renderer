---
phase: 33-design-system-ui-polish
plan: 05
subsystem: design-system
tags: [ui, library, primitive, migration, gh-89]
requires: [33-00, 33-01, 33-02, 33-03]
provides:
  - "src/components/library/LibraryCard.tsx"
  - "src/components/library/CategoryTabs.tsx"
  - "src/components/library/index.ts"
  - "Count-regression contract: document.querySelectorAll('[data-testid=\"library-card\"]').length === filtered data length"
affects:
  - "src/components/ProductLibrary.tsx (migrated)"
  - "src/components/CustomElementsPanel.tsx (migrated)"
tech-stack:
  added: []
  patterns:
    - "Shared primitive + barrel pattern for library surfaces (src/components/library/)"
    - "data-testid hook for count-regression tests"
key-files:
  created:
    - "src/components/library/LibraryCard.tsx"
    - "src/components/library/CategoryTabs.tsx"
    - "src/components/library/index.ts"
  modified:
    - "src/components/ProductLibrary.tsx"
    - "src/components/CustomElementsPanel.tsx"
    - "tests/phase33/phase33LibraryMigration.test.tsx"
decisions:
  - "LibraryCard is shape-agnostic (D-29) — no variant=\"product\"/\"wainscot\"; per-library logic stays in consumers"
  - "ProductLibrary named export added alongside default export to satisfy test import shape"
  - "CustomElementsPanel uses list variant + inline SVG color-swatch thumbnail"
  - "WainscotLibrary / Paint+Material picker / FramedArt migration deferred per D-31 (follow-up PRs on GH #89)"
metrics:
  duration-minutes: 4
  completed-at: "2026-04-22"
  tasks: 3
  commits: 3
  files-changed: 6
---

# Phase 33 Plan 05: Unified Library Migration — Summary

Extracted `<LibraryCard>` + `<CategoryTabs>` shared primitives to `src/components/library/`, migrated ProductLibrary and CustomElementsPanel to consume them, and locked the count-regression contract (checker blocker 2 fix) with an RTL test asserting rendered-card count equals filtered data length.

## What Shipped

- **Primitives (3 files):** `LibraryCard.tsx` (thumbnail/label/selected/onClick/onRemove/variant grid|list), `CategoryTabs.tsx` (tabs/activeId/onChange with optional count badges), and barrel `index.ts`.
- **LibraryCard root element carries `data-testid="library-card"`** on both grid and list variants — this is the selector the count-regression test uses.
- **ProductLibrary migration:** replaced per-product card JSX with `<LibraryCard variant="grid" />` mapping; replaced pill category filter with `<CategoryTabs />`; kept search + header intact.
- **CustomElementsPanel migration:** replaced `<li>` rows with `<LibraryCard variant="list" />`; color swatch rendered as inline SVG data URL thumbnail; label composites name + shape + dims.

## Count-Regression Test (checker blocker 2 fix)

`tests/phase33/phase33LibraryMigration.test.tsx` now has three real assertions (no `.todo` / `expect(true).toBe(false)` placeholders):

1. `ProductLibrary` with 5 seed products → 5 cards (all-filter default).
2. `ProductLibrary` with 0 products → 0 cards (empty state shown instead).
3. `CustomElementsPanel` with 3 elements seeded into `cadStore.customElements` → 3 cards.

Invariant: `document.querySelectorAll('[data-testid="library-card"]').length === filtered data length`.

## Deferred (per D-31)

Three library surfaces NOT migrated in this plan; follow-up PRs will reference GH #89:

- **WainscotLibrary** — different shape (materials + PBR previews), deferred.
- **Paint / Material picker** — color/material swatches with picker UX, deferred.
- **FramedArt library** — image + frame metadata, deferred.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added named export `ProductLibrary` alongside default export**
- **Found during:** Task 2
- **Issue:** The scaffold test at `tests/phase33/phase33LibraryMigration.test.tsx` imports `{ ProductLibrary }` (named). The original file used `export default`.
- **Fix:** Added `export function ProductLibrary(...)` AND preserved `export default ProductLibrary` so `src/App.tsx`'s default import keeps working.
- **Files modified:** `src/components/ProductLibrary.tsx`
- **Commit:** `a9e6145`

**2. [Rule 3 - Blocking] Dropped unused `onAdd` destructure to avoid TS noUnusedParameters**
- **Found during:** Task 2
- **Issue:** `onAdd` prop was declared but only used at the App layer (modal submit), not inside ProductLibrary.
- **Fix:** Kept `onAdd` in `Props` interface (App still passes it) but omitted from destructure to avoid unused-var warning.
- **Files modified:** `src/components/ProductLibrary.tsx`
- **Commit:** `a9e6145`

### Out-of-scope (logged, not fixed)

None.

## Verification

```bash
npm test -- --run tests/phase33/libraryCard.test.ts tests/phase33/phase33LibraryMigration.test.tsx
# Test Files  2 passed (2)  |  Tests  8 passed (8)

npm run build
# vite build — chunk-size warning only (pre-existing), no errors
```

- `libraryCard.test.ts` 5/5 GREEN.
- `phase33LibraryMigration.test.tsx` 3/3 GREEN.
- `npm run build` succeeds (pre-existing chunk-size warning only).

Other Phase 33 tests (collapsibleSections/floatingToolbar/gestureChip/inlineTitleEdit/rotationPresets) remain RED by design — those are Wave 2/3 RED stubs owned by Plans 04/06/07/08/09.

## Closes

Partially closes GH #89 (Unified Library Primitive). Follow-up PRs for WainscotLibrary / Paint & Material / FramedArt will reference the same issue until all 5 surfaces are migrated.

## Self-Check

Files created:
- `src/components/library/LibraryCard.tsx` — FOUND
- `src/components/library/CategoryTabs.tsx` — FOUND
- `src/components/library/index.ts` — FOUND

Files modified:
- `src/components/ProductLibrary.tsx` — FOUND (uses `LibraryCard` + `CategoryTabs`)
- `src/components/CustomElementsPanel.tsx` — FOUND (uses `LibraryCard`)
- `tests/phase33/phase33LibraryMigration.test.tsx` — FOUND (3 assertions, no placeholders)

Commits:
- `47e5b8d` — primitives added
- `a9e6145` — ProductLibrary migrated + test finalized
- `316bc49` — CustomElementsPanel migrated

## Self-Check: PASSED
