---
phase: 85-parametric-controls-v1-20
plan: 01
subsystem: cad-schema-and-test-scaffolding
tags: [schema, migration, store-actions, test-driver, red-tests, param-01, param-02, param-03]
requires:
  - PlacedProduct (src/types/cad.ts)
  - PlacedCustomElement (src/types/cad.ts)
  - CADSnapshot (src/types/cad.ts)
  - migrateV7ToV8 (src/lib/snapshotMigration.ts)
  - resizeProductAxis (src/stores/cadStore.ts)
  - resizeCustomElementAxis (src/stores/cadStore.ts)
  - ProductInspector (src/components/inspectors/ProductInspector.tsx)
  - CustomElementInspector (src/components/inspectors/CustomElementInspector.tsx)
provides:
  - PlacedProduct.heightFtOverride field
  - PlacedCustomElement.heightFtOverride field
  - CADSnapshot.version = 9
  - migrateV8ToV9 passthrough migration
  - resizeProductHeight + resizeProductHeightNoHistory store actions
  - resizeCustomElementHeight + resizeCustomElementHeightNoHistory store actions
  - clearProductOverrides + clearCustomElementOverrides extended to clear heightFtOverride
  - resolveEffectiveDims + resolveEffectiveCustomDims honor heightFtOverride
  - installNumericInputDrivers() + window.__driveNumericInput test driver
  - RED unit tests for ProductInspector numeric inputs (11 cases)
  - RED unit tests for CustomElementInspector numeric inputs (11 cases)
  - RED e2e spec for parametric controls (3 cases)
affects:
  - loadSnapshot pipeline (appended migrateV8ToV9 step)
  - existing tests/snapshotMigration.test.ts (version assertion bumped 8 → 9)
tech-stack:
  added: []
  patterns:
    - Snapshot version-bump passthrough migration (Phase 81 v7→v8 template)
    - Store action *NoHistory pair (Phase 31 drag-during-edit precedent)
    - StrictMode-safe identity-check cleanup (CLAUDE.md §7)
    - Native input value setter (avoids React stale tracker bug in jsdom)
key-files:
  created:
    - src/lib/__tests__/snapshotMigration.v8tov9.test.ts
    - src/test-utils/numericInputDrivers.ts
    - tests/ProductInspector.numeric.test.tsx
    - tests/CustomElementInspector.numeric.test.tsx
    - tests/e2e/specs/parametric-controls.spec.ts
  modified:
    - src/types/cad.ts
    - src/types/product.ts
    - src/lib/snapshotMigration.ts
    - src/stores/cadStore.ts
    - tests/snapshotMigration.test.ts
decisions:
  - "Snapshot v8 → v9 migration is a pure passthrough (heightFtOverride is optional)"
  - "Store-layer clamp stays at [0.25, 50] so existing Phase 31 drag-resize handles aren't broken; inspector layer (Plan 85-02/03) will tighten to [0.5, 50] per D-04"
  - "Height has its own resize action (resizeProductHeight) rather than extending resizeProductAxis to take 'height' — keeps the existing axis: 'width'|'depth' union intact across all consumers"
  - "Test driver uses native HTMLInputElement.prototype.value setter so React's onChange fires reliably; pure el.value = ... is silently swallowed by React's tracker in jsdom"
  - "RED tests live alongside existing inspector tests in tests/*.test.tsx (matches project convention, not the plan's tests/unit/inspectors/* path)"
metrics:
  duration: ~25min
  completed: 2026-05-14
  tasks: 6
  files_created: 5
  files_modified: 5
---

# Phase 85 Plan 01: Wave 0 RED Tests + Schema Bump Summary

Schema scaffolding for Phase 85 parametric controls: snapshot v8 → v9 with new optional `heightFtOverride` field on `PlacedProduct` and `PlacedCustomElement`, height-specific store action pairs, StrictMode-safe `__driveNumericInput` test driver, and 25 RED tests pinning the PARAM-01/02/03 contract before Plans 85-02 and 85-03 ship the inspector UI.

## Tasks Completed

| Task | Name | Status | Commit | Files |
|------|------|--------|--------|-------|
| 1 | Extend types + resolvers for heightFtOverride (D-05) | Complete | 25dc8bb | src/types/cad.ts, src/types/product.ts |
| 2 | Add migrateV8ToV9 + bump defaultSnapshot to v9 | Complete | 25dc8bb | src/lib/snapshotMigration.ts, src/lib/__tests__/snapshotMigration.v8tov9.test.ts, src/stores/cadStore.ts, tests/snapshotMigration.test.ts |
| 3 | Add height store actions + extend clearOverrides (D-05) | Complete | 25dc8bb | src/stores/cadStore.ts |
| 4 | Install __driveNumericInput test driver (StrictMode-safe) | Complete | 1dca148 | src/test-utils/numericInputDrivers.ts |
| 5 | Write RED unit tests for ProductInspector numeric inputs | Complete | 4c00087 | tests/ProductInspector.numeric.test.tsx |
| 6 | Write RED unit tests for CustomElementInspector + e2e | Complete | 4c00087 | tests/CustomElementInspector.numeric.test.tsx, tests/e2e/specs/parametric-controls.spec.ts |

## Commits

| Hash | Message |
|------|---------|
| 25dc8bb | feat(85-01): schema v8->v9 + heightFtOverride + height store actions |
| 1dca148 | feat(85-01): add __driveNumericInput test driver (StrictMode-safe) |
| 4c00087 | test(85-01): add RED tests for parametric W/D/H/X/Y inspector inputs |

## Test Results

- **Schema/migration tests (must pass):** 17/17 existing migration tests pass + 11/11 new `migrateV8ToV9` tests pass. Zero regressions.
- **RED inspector tests (must fail today):** 22/22 fail with the exact expected signal — `__driveNumericInput: no element with data-testid="product-..." ` and `... "custom-element-..."`. Failure is by design: the inspector inputs don't exist yet (Plan 85-02/03 ships them).
- **Full vitest suite:** 1054 passing + 22 RED failing + 11 todo = 1087 total. Baseline pre-Phase 85 was ~1043; we're 11 cases above baseline (likely v1.20 Phase 78–84 additions).
- **E2E RED:** 3 e2e cases fail on input-locator timeouts — expected; Plan 85-02 turns the 2 product cases GREEN, Plan 85-03 untouched until then.

## Decisions Made

1. **Snapshot v8 → v9 is a pure passthrough.** `heightFtOverride` is optional on both Placed types; legacy v8 snapshots without it render at catalog height — which is the correct legacy behavior. Mirrors Phase 81 v7→v8 + Phase 69 v6→v7 template verbatim.

2. **Height gets its own action, not an axis extension.** `resizeProductAxis(id, axis, v)` is typed `axis: "width" | "depth"` across all consumers. Extending the union would force every caller to handle a third case. New action pair: `resizeProductHeight` / `resizeProductHeightNoHistory` mirrors the existing pair shape exactly.

3. **Store-layer clamp stays at [0.25, 50], inspector layer tightens to [0.5, 50].** Phase 31 drag-resize handles relied on the 0.25 floor; changing it would break the existing drag UX. The inspector input commit handlers (Plan 85-02/03) apply the tighter D-04 floor of 0.5 before invoking the store action, so the value the store sees is already clamped by the inspector.

4. **Test driver uses native HTMLInputElement value setter.** `el.value = "..."` followed by `dispatchEvent(new Event("input"))` is silently swallowed by React in jsdom because React tracks the value via a property descriptor and skips re-render when the underlying tracker disagrees. Using `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, "...")` fires React's onChange reliably.

5. **Test files live flat in `tests/`, not in `tests/unit/inspectors/`.** Plan suggested `tests/unit/inspectors/productInspector.numeric.test.ts` but the project's actual convention is flat under `tests/` (e.g., `tests/RightInspector.tabs.test.tsx`, `tests/OpeningInspector.preset.test.tsx`). Followed project convention for consistency and vitest config compatibility.

## Deviations from Plan

### Auto-fixed (Rule 1/3)

**1. [Rule 3 - Blocker] Test file paths followed project convention, not plan paths.**
- **Found during:** Task 5
- **Issue:** Plan called for `tests/unit/inspectors/productInspector.numeric.test.ts` but no `tests/unit/` directory exists; existing inspector tests live flat under `tests/` (e.g. `tests/RightInspector.tabs.test.tsx`).
- **Fix:** Wrote `tests/ProductInspector.numeric.test.tsx` and `tests/CustomElementInspector.numeric.test.tsx` to match project convention. Also wrote `src/lib/__tests__/snapshotMigration.v8tov9.test.ts` to mirror the existing `src/lib/__tests__/snapshotMigration.v6tov7.test.ts`.
- **Files modified:** N/A — placement-only deviation.
- **Commit:** 25dc8bb, 4c00087

**2. [Rule 2 - Critical functionality] Test driver uses native value setter.**
- **Found during:** Task 4 design
- **Issue:** A plain `el.value = ...` + `dispatchEvent(new Event("input"))` would not reliably fire React's onChange in jsdom because of React's internal value-tracker. Tests would have failed with "no event fired" rather than the expected "no element" signal.
- **Fix:** Used `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, String(value))` so React's tracker sees a foreign-origin mutation and re-renders. Standard React-testing-library trick.
- **Commit:** 1dca148

**3. [Rule 1 - Bug] Wired migrateV8ToV9 into loadSnapshot pipeline.**
- **Found during:** Task 2
- **Issue:** Plan listed migration creation but didn't explicitly require importing it in cadStore.loadSnapshot. Without that step, calling `loadSnapshot()` on a v8 snapshot would not bump it to v9.
- **Fix:** Imported `migrateV8ToV9` and appended `const migratedV9 = migrateV8ToV9(migratedV8);` to the loadSnapshot chain.
- **Commit:** 25dc8bb

### Auth gates
None.

### Architectural changes (Rule 4)
None.

## Stub tracking

No stubs introduced. The plan intentionally ships RED tests pointing at inputs that don't yet exist — this is Wave 0 RED-first, not a stub. Plan 85-02 and 85-03 land the inputs.

## Key Files

### Created
- `src/lib/__tests__/snapshotMigration.v8tov9.test.ts` — 11 cases covering migrateV8ToV9 passthrough, idempotency, JSON round-trip, migrateSnapshot routing, defaultSnapshot version
- `src/test-utils/numericInputDrivers.ts` — installNumericInputDrivers() + window.__driveNumericInput driver
- `tests/ProductInspector.numeric.test.tsx` — 11 RED cases (width/depth/height/X/Y inputs, clamps, single-undo, reset)
- `tests/CustomElementInspector.numeric.test.tsx` — 11 RED cases (parallel to ProductInspector)
- `tests/e2e/specs/parametric-controls.spec.ts` — 3 RED Playwright cases (product width, height, X)

### Modified
- `src/types/cad.ts` — heightFtOverride on PlacedProduct + PlacedCustomElement; CADSnapshot.version 8 → 9
- `src/types/product.ts` — resolveEffectiveDims + resolveEffectiveCustomDims honor heightFtOverride
- `src/lib/snapshotMigration.ts` — migrateV8ToV9 + defaultSnapshot v9 + migrateSnapshot v9 passthrough + v8 → v9 routing
- `src/stores/cadStore.ts` — resizeProductHeight + resizeCustomElementHeight (+ NoHistory pairs); clearProductOverrides + clearCustomElementOverrides extended; migrateV8ToV9 import + loadSnapshot step
- `tests/snapshotMigration.test.ts` — defaultSnapshot version expectation bumped 8 → 9

## Self-Check: PASSED

- `src/types/cad.ts`: FOUND (heightFtOverride on PlacedProduct line 124, PlacedCustomElement line 215; version: 9 at line 369)
- `src/types/product.ts`: FOUND (resolver Pick<> widened, height: placed.heightFtOverride ?? baseH)
- `src/lib/snapshotMigration.ts`: FOUND (migrateV8ToV9 exported, defaultSnapshot returns version 9, v9 passthrough + v8 → v9 routing)
- `src/stores/cadStore.ts`: FOUND (resizeProductHeight, resizeProductHeightNoHistory, resizeCustomElementHeight, resizeCustomElementHeightNoHistory all defined; clearOverrides extended)
- `src/test-utils/numericInputDrivers.ts`: FOUND (installNumericInputDrivers + window.__driveNumericInput)
- `src/lib/__tests__/snapshotMigration.v8tov9.test.ts`: FOUND (11 cases, all pass)
- `tests/ProductInspector.numeric.test.tsx`: FOUND (11 cases, all fail with expected RED signal)
- `tests/CustomElementInspector.numeric.test.tsx`: FOUND (11 cases, all fail with expected RED signal)
- `tests/e2e/specs/parametric-controls.spec.ts`: FOUND (3 cases)
- Commit 25dc8bb: FOUND
- Commit 1dca148: FOUND
- Commit 4c00087: FOUND

## Next Step

Plan 85-02 (ProductInspector numeric inputs) — replace read-only Width/Depth/Height/Position Rows with `<Input>` fields carrying the `product-{width,depth,height,x,y}-input` testids, wire onBlur/onEnter to `resizeProductAxis` / `resizeProductHeight` / `moveProduct` with silent clamp at `[0.5, 50]`, call `installNumericInputDrivers()` in a useEffect. Turns 11 + 2 RED tests GREEN.
