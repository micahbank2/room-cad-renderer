# Phase 36-01 Deferred Items

Items discovered during execution but outside the scope of the current plan.

## Pre-existing vitest failures (observed 2026-04-24 at start of Plan 36-01)

These 6 unit tests were already failing before Plan 36-01 instrumentation was added (verified via `git stash && npm test`). Instrumentation is neutral.

- tests/AddProductModal.test.tsx
  - renders SKIP_DIMENSIONS checkbox
  - submit with skipDims=true calls onAdd with null dims
  - submit with skipDims=false calls onAdd with numeric dims
- tests/SidebarProductPicker.test.tsx
  - typing 'eames' filters to Eames product (case-insensitive)
  - dragstart sets effectAllowed to copy
- tests/productStore.test.ts
  - before load() resolves, mutating products does NOT trigger set() (guards empty-state overwrite)

Plus 1 unhandled error in tests/App.restore.test.tsx (WainscotLibrary items.length read on undefined — appears to be a missing IDB mock after a refactor).

**Not fixed in 36-01** because:
1. They are unrelated to VIZ-10 (no texture/3D paths).
2. 36-01 scope is strictly instrumentation + ROOT-CAUSE.md (R-01).
3. Fixing them requires debugging other subsystems, which risks leaking scope.

**Recommend:** File separate GH issues under `bug` + `backlog` labels OR address in Phase 37 tech-debt sweep.
