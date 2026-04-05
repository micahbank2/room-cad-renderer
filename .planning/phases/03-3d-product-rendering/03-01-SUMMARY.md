---
phase: 03-3d-product-rendering
plan: 01
subsystem: three
tags: [viz-04, texture-cache, product-rendering, r3f]
requires:
  - "src/types/product.ts (effectiveDimensions, Product interface)"
  - "src/types/cad.ts (PlacedProduct interface)"
  - "THREE.TextureLoader.loadAsync"
provides:
  - "src/three/productTextureCache.ts: getTexture(url), useProductTexture(url), __clearTextureCache()"
  - "Async-cached texture pipeline for 3D product meshes"
affects:
  - "src/three/ProductMesh.tsx (rewired to hook; D-10 materials; shadows enabled)"
tech-stack:
  added: []
  patterns:
    - "Module-level Promise cache keyed by url (prevents double-fetch)"
    - "Cancellation-safe useEffect for async resource resolution"
    - "Error-to-null fallback pattern (no throw at consumer site)"
key-files:
  created:
    - "src/three/productTextureCache.ts"
  modified:
    - "src/three/ProductMesh.tsx"
    - "tests/productTextureCache.test.ts"
decisions:
  - "D-02: Promise-valued cache (not Texture-valued) — dedups concurrent in-flight loads naturally"
  - "D-03: isPlaceholder short-circuits texture loading — orphans stay semi-transparent purple"
  - "D-10: real products use roughness 0.55 / metalness 0.05; placeholders preserve 0.6 / 0.1"
  - "White base color (#ffffff) when texture is applied, so texture is not tinted"
  - "castShadow + receiveShadow enabled on product mesh as VIZ-06 prep"
metrics:
  duration: "~6m"
  completed: "2026-04-04"
requirements: [VIZ-04]
---

# Phase 03 Plan 01: Async Product Texture Cache + ProductMesh Rewire Summary

One-liner: Module-level `Map<string, Promise<THREE.Texture|null>>` texture cache with `useProductTexture` hook; ProductMesh now loads textures asynchronously, skips placeholders per D-03, and applies D-10 PBR material values.

## What Was Built

### `src/three/productTextureCache.ts` (new)
- `getTexture(url)`: On first call, invokes `THREE.TextureLoader.prototype.loadAsync(url)`, assigns `SRGBColorSpace` on resolve, catches rejections to `null`, and caches the Promise. Repeat calls return the same cached Promise (identity-equal).
- `useProductTexture(url | null)`: React hook. Returns `null` immediately for null/undefined urls. Otherwise subscribes via `useEffect` with cancellation guard; sets local state when Promise resolves.
- `__clearTextureCache()`: Test-only Map reset.

### `src/three/ProductMesh.tsx` (rewired)
- Removed `useMemo` + synchronous `TextureLoader.load()` path entirely.
- Texture URL derived as `!isPlaceholder && product?.imageUrl ? product.imageUrl : null` — honors D-03.
- Added `castShadow` + `receiveShadow` on the mesh (prep for VIZ-06 soft shadows in plan 02).
- Material color is `#ffffff` when texture is present (no tinting), `#7c5bf0` for placeholders, `#93c5fd` for selected.
- D-10 roughness/metalness: 0.55/0.05 for real, 0.6/0.1 for placeholders.

## Tasks Executed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1a (RED) | Add failing tests | 06bdd78 | tests/productTextureCache.test.ts |
| 1b (GREEN) | Implement productTextureCache | 9738294 | src/three/productTextureCache.ts |
| 2 | Wire hook into ProductMesh | ada5d2c | src/three/ProductMesh.tsx |

## Verification

- `npx vitest run productTextureCache`: **4/4 passing**
  - cache hit returns same Promise instance
  - cache miss calls loadAsync
  - rejected loadAsync resolves to null
  - resolved texture has SRGBColorSpace set
- `npm run build`: **exits 0**, no type errors, ThreeViewport chunk compiled.

## Deviations from Plan

None — plan executed exactly as written.

## Success Criteria

- VIZ-04 (textures on 3D products): infrastructure in place. A Product with `imageUrl` flows through `useProductTexture` → `meshStandardMaterial.map`. Placeholders bypass via D-03 gate. Failed loads resolve to `null`, leaving the solid-color fallback without scene crash.

## Self-Check: PASSED

- FOUND: src/three/productTextureCache.ts
- FOUND: tests/productTextureCache.test.ts (4 `it(` blocks)
- FOUND: commit 06bdd78
- FOUND: commit 9738294
- FOUND: commit ada5d2c
- Build exit 0; 4/4 tests pass
