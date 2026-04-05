---
phase: 02-product-library
plan: 01
subsystem: product-library
tags: [zustand, idb-keyval, schema, tdd]
dependency_graph:
  requires: [02-00]
  provides: [productStore, nullable-product-dims, searchProducts helper]
  affects: [App.tsx, Sidebar.tsx, fabricSync.ts, ProductMesh.tsx, PropertiesPanel.tsx, AddProductModal.tsx]
tech_stack:
  added: []
  patterns: [zustand subscribe-persist gate, immer produce(), idb-keyval mocking via vi.hoisted]
key_files:
  created:
    - src/stores/productStore.ts
  modified:
    - src/types/product.ts
    - tests/productHelpers.test.ts
    - tests/productSearch.test.ts
    - tests/productStore.test.ts
decisions:
  - "Product.width/depth/height are number|null; renderers must go through effectiveDimensions() — never read dims directly"
  - "productStore.subscribe persist is gated on state.loaded to prevent initial empty-state overwrite (Pitfall 3)"
  - "load() coerces legacy non-number dims to null at read time so mixed-shape IndexedDB data self-heals"
  - "searchProducts is centralized in types/product.ts so sidebar picker + full library reuse identical filter"
metrics:
  duration: ~10 min
  completed: 2026-04-04
  tasks: 2
  files_created: 1
  files_modified: 3
  tests_added: 23
---

# Phase 02 Plan 01: Product Store + Nullable Dimensions Summary

**One-liner:** Introduced the global `useProductStore` Zustand store (IndexedDB-backed, with subscribe-persist gated on `loaded=true` and legacy-dim migration) plus nullable `Product.width/depth/height` and the `effectiveDimensions`/`hasDimensions`/`searchProducts` helpers that unlock LIB-03/04/05.

## Objective

Consolidate product state out of `App.tsx` / `Sidebar.tsx` duplicate IndexedDB loaders into a single Zustand store (LIB-03), unlock image-only uploads via nullable W/D/H (LIB-04), and centralize the case-insensitive name substring filter (LIB-05). This plan lays down the pure-logic layer only; wiring App/Sidebar/renderers is deferred to plan 02-03.

## Tasks Completed

| # | Name | Commits | Key Files |
|---|------|---------|-----------|
| 1 | Nullable Product dims + helpers (TDD) | b4c9383 (RED), 77c5816 (GREEN) | src/types/product.ts, tests/productHelpers.test.ts, tests/productSearch.test.ts |
| 2 | productStore with IndexedDB persistence (TDD) | d385968 (RED), cc81ea0 (GREEN) | src/stores/productStore.ts, tests/productStore.test.ts |

## What Was Built

### src/types/product.ts
- `Product.width/depth/height` → `number | null`
- `PLACEHOLDER_DIM_FT = 2` constant
- `effectiveDimensions(p)` — returns `{width, depth, height, isPlaceholder}` with 2×2×2 fallback when any dim is null or product is missing/undefined
- `hasDimensions(p)` — predicate, true only when all three dims are numbers
- `searchProducts(query, list)` — case-insensitive trimmed substring name filter; empty/whitespace returns full list

### src/stores/productStore.ts
- Zustand store mirroring `cadStore` conventions (immer `produce()` for mutations)
- State: `products: Product[]`, `loaded: boolean`
- Actions: `load()`, `addProduct(p)`, `removeProduct(id)`, `updateProduct(id, changes)`
- `load()` reads `room-cad-products` from idb-keyval and normalizes legacy records (coerces non-number W/D/H to null, ensures `textureUrls` is an array)
- Module-level `subscribe` persists to idb-keyval on every products-reference change, **guarded by `state.loaded`** — before `load()` resolves, no writes occur

## Deviations from Plan

**None** — plan executed exactly as written, with one small test-side adjustment:

- **Test mock hoisting fix:** The planned pattern `const getMock = vi.fn(); vi.mock("idb-keyval", () => ({...}))` tripped vitest's hoisting rule (`vi.mock` is hoisted above the top-level `const`). Used `vi.hoisted(() => ({ getMock, setMock }))` to satisfy the hoisting requirement. Behavior is identical. Not a deviation rule — just honoring how vitest hoists mocks.
- **Test mock promise:** Added `setMock.mockResolvedValue(undefined)` in `beforeEach` because the store's `.catch(() => {})` chain requires `set()` to return a promise.

## Tests Added

**tests/productHelpers.test.ts (8 tests):**
- effectiveDimensions returns product dims when all numeric
- effectiveDimensions returns 2/2/2 + isPlaceholder:true when width/depth/height is null (3 cases)
- effectiveDimensions returns 2/2/2 + isPlaceholder:true when product is undefined (orphan)
- effectiveDimensions returns 2/2/2 + isPlaceholder:true when product is null
- hasDimensions true when all three dims are numbers
- hasDimensions false when any dim is null

**tests/productSearch.test.ts (6 tests):**
- Case-insensitive match 'EAMES' → 'Eames Lounge Chair'
- Case-insensitive match 'lounge' → 'Eames Lounge Chair'
- Empty search returns full list
- Whitespace-only search returns full list
- No-match returns empty array
- Shared substring matches multiple products

**tests/productStore.test.ts (9 tests):**
- load() reads `room-cad-products` key
- load() pass-through on legacy numeric dims
- load() coerces missing width to null
- load() with no stored data sets `loaded=true`, `products=[]`
- addProduct appends
- removeProduct filters by id
- updateProduct merges partial changes
- After load(), addProduct triggers `set()` with new array
- Before load(), mutations do NOT trigger `set()` (persist gate works)

Full suite: **55 passing / 12 todo / 0 failing**.

## Must-Haves Verified

- ✓ `Product.width/depth/height` accept null; legacy numeric records still load (via `load()` migration)
- ✓ `effectiveDimensions` returns 2/2/2 + isPlaceholder:true for any null dim or missing product
- ✓ productStore is single source of truth; loads from `room-cad-products` key
- ✓ subscribe-persist gated on `state.loaded` — initial empty state never overwrites IndexedDB
- ✓ `searchProducts` is a reusable exported helper (case-insensitive, whitespace-trimmed)

## Self-Check: PASSED

- ✓ `src/types/product.ts` exists with all 4 exported symbols (effectiveDimensions, hasDimensions, searchProducts, PLACEHOLDER_DIM_FT)
- ✓ `src/stores/productStore.ts` exists; exports `useProductStore`, uses `room-cad-products` key, gated on `state.loaded`
- ✓ Commits b4c9383, 77c5816, d385968, cc81ea0 all present in git log
- ✓ Full test suite (`vitest run`) exits 0 with 55/55 passing + 12 preexisting todos
