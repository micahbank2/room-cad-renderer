---
phase: 70-library-rebuild-lib-rebuild-01-v1-19-active
plan: "01"
subsystem: library-ui
tags: [library, materials, products, assemblies, tabs, ui]
dependency_graph:
  requires: [Phase 67 materialStore, Phase 68 UploadMaterialModal, Phase 72 Tabs primitive]
  provides: [3-tab library shell, Material.category field, MATERIAL_CATEGORIES constant, category sub-tabs in MaterialsSection]
  affects: [ProductLibrary, MaterialsSection, UploadMaterialModal, materialStore, useMaterials]
tech_stack:
  added: []
  patterns: [Tabs primitive for 3-level navigation, category filter state in component, Rule 1 test fixes]
key_files:
  created: []
  modified:
    - src/types/material.ts
    - src/lib/materialStore.ts
    - src/hooks/useMaterials.ts
    - src/components/UploadMaterialModal.tsx
    - src/components/MaterialsSection.tsx
    - src/components/ProductLibrary.tsx
    - tests/components/ProductLibrary.gltf.test.tsx
    - tests/phase33/phase33LibraryMigration.test.tsx
decisions:
  - "Default tab is Materials (not Products) — puts the newest feature front and center"
  - "MaterialsSection owns its upload button; ProductLibrary does not duplicate it"
  - "Uncategorized tab added to Products tab to handle products without a PRODUCT_CATEGORIES match"
  - "SaveMaterialInput.category flows through materialStore to persist in IDB"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-08"
  tasks_completed: 3
  files_modified: 8
---

# Phase 70 Plan 01: Library 3-Tab Rebuild Summary

**One-liner:** 3-way Materials/Products/Assemblies Tabs toggle replacing the single-panel PRODUCT REGISTRY, with MATERIAL_CATEGORIES sub-tab filtering and category persistence in UploadMaterialModal.

## What Was Built

The sidebar library now has a top-level 3-tab toggle: **Materials**, **Products**, **Assemblies**.

- **Materials tab** (default): renders `MaterialsSection` with its own 5 sub-tab row (All + Flooring, Wall coverings, Countertops, Paint). Clicking a category tab filters the `MaterialCard` grid. The Upload Material button and `UploadMaterialModal` remain owned by `MaterialsSection`.
- **Products tab**: search input + existing category `Tabs` (with a new Uncategorized tab for products outside `PRODUCT_CATEGORIES`) + `LibraryCard` product grid + Add Product button. All existing `onAdd`/`onRemove`/`onOpenAddModal` props unchanged. GLTF place flow (`setPendingProduct` + `setTool("product")`) preserved.
- **Assemblies tab**: readable placeholder with `Layers` (lucide-react) icon and coming-soon copy. No errors, no blank state.

**Data model additions:**
- `Material.category?: string` added to the interface
- `MATERIAL_CATEGORIES` constant + `MaterialCategory` type exported from `src/types/material.ts`
- `SaveMaterialInput.category?` added to materialStore; written to IDB in `saveMaterialWithDedup`
- `updateMaterialMetadata` and `useMaterials.update()` type extended to include `category`
- `UploadMaterialModal` renders a `<select>` for category (optional, between Name and Tile Size)

## Commits

| Hash | Description |
|------|-------------|
| `69e2d1a` | feat(70-01): add Material.category field and MATERIAL_CATEGORIES constant |
| `5f27345` | feat(70-01): add category sub-tab filtering to MaterialsSection |
| `1bb2b0c` | feat(70-01): refactor ProductLibrary into 3-tab Materials/Products/Assemblies shell |
| `a7d5ae2` | fix(70-01): update ProductLibrary tests to navigate to Products tab first |

## Verification

- `npm run build` exits 0 — no TypeScript errors
- Test suite: 2 pre-existing failures only (SaveIndicator, SidebarProductPicker); all other 944 tests pass
- PR: https://github.com/micahbank2/room-cad-renderer/pull/167 (Closes #24)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing field] Add category to materialStore write path**
- **Found during:** Task 1
- **Issue:** `SaveMaterialInput` and `updateMaterialMetadata` did not include a `category` field — passing `category` from the modal would have caused a TypeScript error and the field would not be persisted.
- **Fix:** Added `category?` to `SaveMaterialInput`, included it in the `Material` record created by `saveMaterialWithDedup`, and added it to the `Pick<>` type in both `updateMaterialMetadata` and `useMaterials.update()`.
- **Files modified:** `src/lib/materialStore.ts`, `src/hooks/useMaterials.ts`
- **Commit:** `69e2d1a`

**2. [Rule 1 - Bug] ProductLibrary tests broke when default tab changed to Materials**
- **Found during:** Task 3 (post-build test run)
- **Issue:** 7 tests rendered `ProductLibrary` and queried `[data-testid="library-card"]` directly. With the default tab now "materials", the products panel is not mounted, so no cards are found.
- **Fix:** Added `fireEvent.click(screen.getByRole("tab", { name: "Products" }))` before each card query in `ProductLibrary.gltf.test.tsx` (6 tests) and `phase33LibraryMigration.test.tsx` (1 test).
- **Files modified:** `tests/components/ProductLibrary.gltf.test.tsx`, `tests/phase33/phase33LibraryMigration.test.tsx`
- **Commit:** `a7d5ae2`

## Known Stubs

None — the Assemblies tab placeholder is intentional per the plan ("Assemblies tab shows a readable placeholder — not empty, not broken") and is not blocking the plan's goal.

## Self-Check: PASSED

- `src/types/material.ts` — FOUND (MATERIAL_CATEGORIES exported)
- `src/components/ProductLibrary.tsx` — FOUND (activeLibraryTab, assemblies, Coming soon, Layers)
- `src/components/MaterialsSection.tsx` — FOUND (activeMaterialCategory)
- `src/components/UploadMaterialModal.tsx` — FOUND (category state + select)
- Commits `69e2d1a`, `5f27345`, `1bb2b0c`, `a7d5ae2` — all present in git log
- `npm run build` — exits 0
- Test suite — 2 pre-existing failures only
