# Deferred items — Phase 45

Pre-existing test failures observed during 45-01 execution (NOT introduced by THUMB-01). Confirmed by stashing all 45-01 work and re-running the same suite — failures persist on the unmodified base.

## Pre-existing failing tests (verified out of scope)

| File | Test | Status |
|------|------|--------|
| tests/SaveIndicator.test.tsx | (file-level FAIL) | Pre-existing |
| tests/AddProductModal.test.tsx | renders SKIP_DIMENSIONS checkbox | Pre-existing (LIB-04) |
| tests/AddProductModal.test.tsx | submit with skipDims=true calls onAdd with null dims | Pre-existing (LIB-04) |
| tests/AddProductModal.test.tsx | submit with skipDims=false calls onAdd with numeric dims | Pre-existing (LIB-04) |
| tests/SidebarProductPicker.test.tsx | typing 'eames' filters to Eames product | Pre-existing (LIB-05) |
| tests/SidebarProductPicker.test.tsx | dragstart sets effectAllowed to copy | Pre-existing (LIB-05) |
| tests/productStore.test.ts | before load() resolves, mutating products does NOT trigger set() | Pre-existing (LIB-03) |
| tests/App.restore.test.tsx | (1 error during run) | Pre-existing |

These failures are tracked separately and outside the scope of plan 45-01. THUMB-01 does not import any of the modules under test, and stash-revert of 45-01 work reproduces the identical failure list.

## Pre-existing tsc warning

`tsconfig.json(17,5): error TS5101: Option 'baseUrl' is deprecated`. Pre-existing tsconfig issue. No errors in `src/three/swatchThumbnailGenerator.ts`.
