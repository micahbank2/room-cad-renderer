---
phase: 02-product-library
plan: 03
subsystem: product-library
tags: [productStore, sidebar, drag-drop, search, LIB-03, LIB-05]
requires:
  - 02-01 (productStore exists + searchProducts helper)
  - 01 (DRAG_MIME contract from Phase 1)
provides:
  - single-load site for productStore (App.tsx)
  - SidebarProductPicker component with name search + draggable rows
affects:
  - src/App.tsx
  - src/components/Sidebar.tsx
tech-stack:
  added: []
  patterns:
    - Zustand store subscription from leaf components (SidebarProductPicker reads useProductStore directly)
    - HTML5 drag contract via DRAG_MIME (reused from Phase 1)
key-files:
  created:
    - src/components/SidebarProductPicker.tsx
  modified:
    - src/App.tsx
    - src/components/Sidebar.tsx
    - tests/SidebarProductPicker.test.tsx
decisions:
  - Kept Sidebar's productLibrary prop (unused internally) to preserve App.tsx's current prop-drilling shape without touching FabricCanvas/ThreeViewport/PropertiesPanel signatures
  - SidebarProductPicker subscribes directly to useProductStore (no prop drilling) per research Pattern 5
  - Mocked idb-keyval in SidebarProductPicker.test.tsx because productStore.subscribe calls set() on any products mutation, and jsdom does not provide indexedDB
metrics:
  duration: ~5m
  completed: 2026-04-04
  tasks: 2
  files: 4
---

# Phase 02 Plan 03: Sidebar Product Picker Summary

One-liner: Consolidated product state onto useProductStore (single load site in App.tsx) and shipped an in-canvas searchable draggable SidebarProductPicker that emits DRAG_MIME for the existing canvas drop handler.

## What Shipped

### Task 1 — productStore consolidation (LIB-03)
- Removed duplicate `get<Product[]>(PRODUCTS_KEY)` loader from App.tsx and Sidebar.tsx (dual-loader race bug fixed)
- App.tsx now pulls productLibrary/addProduct/removeProduct via `useProductStore` selectors
- Single load on mount: `useEffect(() => useProductStore.getState().load(), [])`
- Sidebar Props interface dropped `setProductLibrary` — mutations flow through the store
- Phase 1 `useAutoSave()` wiring preserved

### Task 2 — SidebarProductPicker component (LIB-05, D-09)
- New component at src/components/SidebarProductPicker.tsx
- PRODUCT_LIBRARY section header + SEARCH... input
- Case-insensitive substring filter via `searchProducts` helper
- Thumbnail (32px) + uppercased/underscored name rows
- `draggable` rows set `DRAG_MIME` + `effectAllowed=copy` on dragstart (matches Phase 1 canvas drop contract)
- Empty state shows NO_PRODUCTS_YET or NO_MATCHES depending on library size
- Mounted in Sidebar below SNAP section

## Verification

- `bun run build` exits 0
- `bun run test -- --run` — 13 files, 64 passing / 3 todo, all green
- 5 new SidebarProductPicker tests cover: render, filter, empty, DRAG_MIME dragstart, effectAllowed=copy

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Mocked idb-keyval in SidebarProductPicker test**
- **Found during:** Task 2 (test run)
- **Issue:** productStore's subscribe-to-persist calls `idb-keyval.set()` on any products mutation. Test's `useProductStore.setState({ products: [...] })` triggered the subscribe which threw `ReferenceError: indexedDB is not defined` in jsdom.
- **Fix:** Added `vi.mock("idb-keyval", ...)` at top of test file, stubbing get/set with resolved promises. This aligns with the research doc's testing rules ("Mock idb-keyval when testing the store").
- **Files modified:** tests/SidebarProductPicker.test.tsx
- **Commit:** 32fab82

**2. [Rule 1 - Bug] Removed unused Product import from App.tsx**
- **Found during:** Task 1
- **Issue:** Plan step 11 said "Keep the Product type import at the top" but after removing the `useState<Product[]>` and the `setProductLibrary` prop passing, `Product` had zero references in App.tsx. TypeScript strict mode with `noUnusedLocals` would fail the build.
- **Fix:** Removed the `import type { Product }` line. `Product` is still imported by Sidebar and other consumers.
- **Files modified:** src/App.tsx
- **Commit:** f1e1ed3

## Acceptance Criteria Results

Task 1:
- grep useState<Product[]> in App.tsx → 0 ✓
- grep handleAddProduct in App.tsx → 3 (≥2 ✓ — used in ProductLibrary + AddProductModal props)
- grep useProductStore in App.tsx → 5 matches (≥4 ✓)
- grep PRODUCTS_KEY in App.tsx → 0 ✓
- grep PRODUCTS_KEY in Sidebar.tsx → 0 ✓
- grep get<Product in Sidebar.tsx → 0 ✓
- grep idb-keyval in App.tsx → 0 ✓
- grep idb-keyval in Sidebar.tsx → 0 ✓
- grep setProductLibrary in Sidebar.tsx → 0 ✓
- grep useAutoSave in App.tsx → 1 ✓ (Phase 1 preserved)
- build exits 0 ✓

Task 2:
- src/components/SidebarProductPicker.tsx exists ✓
- Contains DRAG_MIME, searchProducts, useProductStore, PRODUCT_LIBRARY, SEARCH... ✓
- Sidebar.tsx imports SidebarProductPicker ✓
- Test file has 5 `it(` calls, no `it.todo` ✓
- First line starts with vitest import (vi.mock after, no bottom imports) ✓
- All 5 tests pass ✓
- build exits 0 ✓

## Known Stubs

None.

## Self-Check: PASSED

- src/components/SidebarProductPicker.tsx → FOUND
- tests/SidebarProductPicker.test.tsx → FOUND (5 tests)
- commit f1e1ed3 → FOUND (Task 1)
- commit 32fab82 → FOUND (Task 2)
- build passes, all 67 tests pass/todo
