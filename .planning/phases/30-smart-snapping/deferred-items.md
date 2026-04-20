# Phase 30 — Deferred Items

## Out-of-scope failing tests (pre-existing, unrelated to smart snap)

Verified via `git stash` baseline: these 6 failures exist on commit `2ac375f` BEFORE Plan 03 changes. Not caused by this plan; not addressed.

- `tests/AddProductModal.test.tsx` — "renders SKIP_DIMENSIONS checkbox" + 2 sibling tests (LIB-04)
- `tests/SidebarProductPicker.test.tsx` — "typing 'eames' filters" + 1 sibling test (LIB-05)
- `tests/productStore.test.ts` — "before load() resolves, mutating products does NOT trigger set()" (LIB-03)

Scope owner: product-library phase (not smart-snap). These tests predate Phase 30.
