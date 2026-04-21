# Deferred Items — Phase 31

Out-of-scope failures discovered during Plan 31-02 execution. NOT caused by Phase 31 changes.

## Pre-existing test failures (verified via `git stash` re-run on 2026-04-20)

- `tests/AddProductModal.test.tsx` — 3 failures (LIB-04 SKIP_DIMENSIONS rendering)
- `tests/SidebarProductPicker.test.tsx` — 2 failures (LIB-05 filter, dragstart effectAllowed)
- `tests/productStore.test.ts` — 1 failure (LIB-03 pre-load set() guard)

These failures predate Phase 31 (verified by stashing all Plan 31-02 changes and re-running — same 6 fail). They belong to LIB-03/04/05 product-library work, not the drag-resize/label-override scope.

**Action:** None taken in Phase 31. File new issues against the Product Library milestone if/when LIB-03/04/05 are revisited.
