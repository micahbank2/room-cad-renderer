---
phase: 02-product-library
plan: 04
subsystem: canvas-rendering
tags: [orphan-handling, null-dim, placeholder, hit-testing, 3d-opacity]
requires:
  - 02-01 (effectiveDimensions + hasDimensions helpers in types/product.ts)
  - 02-03 (productStore + orphan notification infra)
provides:
  - orphan placedProduct rendering (MISSING_PRODUCT label, dashed accent border)
  - null-dim placeholder rendering (2x2x2 ft, SIZE: UNSET)
  - 3D opacity=0.8 transparent material for placeholders
  - orphan-clickable hit-testing via effectiveDimensions AABB
affects:
  - src/canvas/fabricSync.ts
  - src/three/ProductMesh.tsx
  - src/three/ThreeViewport.tsx
  - src/canvas/tools/selectTool.ts
tech-stack:
  added: []
  patterns:
    - effectiveDimensions() as single contract for render + hit-test dimensions
    - showPlaceholder = orphan || isPlaceholder unified branch
key-files:
  created:
    - tests/fabricSync.test.ts
  modified:
    - src/canvas/fabricSync.ts
    - src/three/ProductMesh.tsx
    - src/three/ThreeViewport.tsx
    - src/canvas/tools/selectTool.ts
decisions:
  - Placeholder dash [6,4] always applied regardless of selection; selection differentiated by strokeWidth only
  - ThreeViewport passes undefined products through to ProductMesh (no .filter gate) so orphans render
  - Rotation handle gated on hasDimensions + prod.depth != null — placeholders cannot be rotated
metrics:
  duration: 1m
  completed: 2026-04-04
  tasks: 2
  files: 5
requirements: [LIB-03, LIB-04]
---

# Phase 02 Plan 04: Placeholder Rendering Summary

**One-liner:** Orphan + null-dim placed products render as 2×2×2 ft dashed-accent placeholders across 2D (fabricSync) and 3D (ProductMesh at 0.8 opacity), with matching AABB hit-testing so they remain clickable and deletable.

## What Was Built

### Task 1: fabricSync null-dim + orphan rendering branch
- Imported `effectiveDimensions` and `hasDimensions` from `@/types/product`.
- Added `PLACEHOLDER_DASH = [6, 4]` and `REAL_DASH = [4, 3]` constants.
- Replaced `renderProducts` body with a unified `showPlaceholder = orphan || isPlaceholder` branch:
  - Border: accent stroke `#7c5bf0` with `[6,4]` dash for placeholders regardless of selection
  - Name label: `MISSING_PRODUCT` (accent-colored) for orphans, product name otherwise
  - Dim label: `SIZE: UNSET` for placeholders, `W' x D'` for real products
  - Image loading skipped entirely for placeholders
  - Rotation handle gated on `!showPlaceholder && product && hasDimensions(product)`
- Added `tests/fabricSync.test.ts` with 5 `effectiveDimensions` scenarios (orphan, real, null-width, null-depth, null-height).

### Task 2: 3D opacity + orphan-safe hit-testing
- `ProductMesh.tsx`: Props accept `product: Product | undefined`; derives dims via `effectiveDimensions`; placeholder material is `#7c5bf0`, `transparent=true`, `opacity=0.8`; texture loading skipped when `isPlaceholder`.
- `ThreeViewport.tsx`: Removed the `if (!product) return null` filter — orphans now pass through to `ProductMesh` which renders the placeholder box.
- `selectTool.ts::hitTestStore`: Removed `if (!product) continue` guard; uses `effectiveDimensions(product)` so 2×2 ft AABB clicks hit orphan + null-dim products.
- Rotation handle hit-test on mousedown guarded with `prod.depth != null` to prevent calling `hitTestHandle` with null depth.

## Verification

- `npx vitest run tests/fabricSync.test.ts` — 5/5 passing
- `npm run build` — exits 0, clean TypeScript strict build
- `npx vitest run` — 14 files / 69 passing / 3 todo (all suites green)

## Deviations from Plan

None — plan executed exactly as written.

## Key Decisions

1. **Placeholder dash always-on:** `[6, 4]` applied regardless of selection state. Selection on a placeholder is signaled through `strokeWidth` (2 vs 1) only. Prevents visual collision where a selected placeholder would look identical to a selected real product (per RESEARCH Pitfall 6).
2. **ThreeViewport orphan pass-through:** Removed the `.find → null` filter so `ProductMesh` receives `undefined` and renders the placeholder — single rendering contract instead of two code paths.
3. **Rotation handle disabled for placeholders:** Guarding on both `hasDimensions(product)` in fabricSync and `prod.depth != null` in selectTool mousedown prevents any null-depth handle math.

## Commits

- `729354e` feat(02-04): fabricSync orphan + null-dim placeholder rendering
- `5064196` feat(02-04): 3D null-dim opacity + orphan-safe hit-testing

## Self-Check: PASSED

- FOUND: src/canvas/fabricSync.ts (effectiveDimensions, MISSING_PRODUCT, SIZE: UNSET, showPlaceholder, PLACEHOLDER_DASH)
- FOUND: src/three/ProductMesh.tsx (effectiveDimensions, transparent={isPlaceholder}, opacity={isPlaceholder ? 0.8 : 1}, Product | undefined)
- FOUND: src/canvas/tools/selectTool.ts (effectiveDimensions, prod.depth != null)
- FOUND: tests/fabricSync.test.ts (5 `it(` calls)
- FOUND: commit 729354e
- FOUND: commit 5064196
