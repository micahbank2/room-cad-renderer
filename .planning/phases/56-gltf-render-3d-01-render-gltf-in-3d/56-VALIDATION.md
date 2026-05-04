---
phase: 56-gltf-render-3d-01-render-gltf-in-3d
type: validation
requirement: GLTF-RENDER-3D-01
created: 2026-05-04
---

# Phase 56 — Validation Map

## Requirement: GLTF-RENDER-3D-01

> Products with `gltfId` render as the actual GLTF model in 3D, not a textured box. Loading state shows textured-box fallback; failure falls back to bbox box. Position/rotation/Phase-31 sizeScale apply. Phase 53 right-click + Phase 54 click-to-select work via wrapping group.

---

## Test Paths

### Unit Tests — `tests/hooks/useGltfBlobUrl.test.ts`

| # | Behavior Under Test | Assertion | GLTF-RENDER-3D-01 Coverage |
|---|---------------------|-----------|----------------------------|
| U1 | Initial state when gltfId provided | `{ url: null, loading: true }` returned synchronously | IDB→ObjectURL load path (D-01) |
| U2 | Resolved state after IDB fetch | `{ url: "blob:...", loading: false }` after `waitFor` | ObjectURL created from blob (D-01) |
| U3 | IDB fetch failure | `{ url: null, error: Error, loading: false }` | Error propagation to ProductMesh (D-05) |
| U4 | Multiple consumers, same gltfId | `URL.createObjectURL` spy called exactly once | Ref-counted cache — no blob leak (D-01) |
| U5 | Cleanup order on last unmount | `useGLTF.clear` spy called BEFORE `revokeObjectURL` spy | Stale-cache prevention (56-RESEARCH §1, §2) |

Run: `npx vitest run tests/hooks/useGltfBlobUrl.test.ts`

---

### Component Tests — `tests/components/ProductMesh.gltf.test.tsx`

| # | Behavior Under Test | Mock Setup | Assertion | GLTF-RENDER-3D-01 Coverage |
|---|---------------------|------------|-----------|----------------------------|
| C1 | No gltfId → box path | `product.gltfId = undefined` | `<boxGeometry>` present in output | D-08 image-only regression (D-12) |
| C2 | gltfId present + URL loading | `useGltfBlobUrl → { url: null, loading: true }` | ProductBox rendered (not GltfProduct) | Loading fallback (D-04) |
| C3 | ErrorBoundary catches GLTF parse error | `useGLTF` mock throws `Error("parse failed")` | ProductBox rendered (not crash) | Error fallback (D-05) |

Run: `npx vitest run tests/components/ProductMesh`

---

### E2E Tests — `e2e/gltf-render-3d.spec.ts`

Fixture: `tests/e2e/fixtures/box.glb` (Khronos Box.glb, ~3KB)
Driver: `window.__driveUploadGltf` (Phase 55, installed in `src/main.tsx`)

| # | Scenario | Steps | Assertion | GLTF-RENDER-3D-01 Coverage |
|---|----------|-------|-----------|----------------------------|
| E1 | GLTF model renders in 3D | Upload box.glb → place product → switch to 3D | Canvas rendered (non-blank screenshot or store mesh count > 0) | Core render path (D-07, D-08) |
| E2 | Phase 31 resize on GLTF product | Upload + place → switch 3D → `__driveResize(id, "E", 3)` | `resolveEffectiveDims` returns `widthFtOverride = original + 3` via store | Phase 31 compat (D-12) |
| E3 | Phase 53 right-click opens context menu | Upload + place → switch 3D → right-click at product canvas coords | Context menu DOM element visible | Phase 53 compat (D-07, D-12) |
| E4 | Phase 54 click-to-select | Upload + place → switch 3D → left-click product | `useUIStore.getState().selectedIds` contains placed id | Phase 54 compat (D-07, D-12) |

Run: `npx playwright test e2e/gltf-render-3d.spec.ts --reporter=line`

---

## Regression Assertions

Every e2e scenario includes a pre-check that existing image-only products still render:

```typescript
// Inline regression guard in each e2e test
const existingProducts = await page.evaluate(() =>
  (window as any).__cadStore?.getState().placedProducts ?? []
);
// If any products without gltfId exist, confirm they show boxGeometry (not GLTF path)
```

Vitest regression: `npm run test:quick` baseline = 6 pre-existing failures. Any new failures are a regression.

---

## Acceptance Criteria Cross-Reference

| Acceptance Criterion (REQUIREMENTS.md) | Covered By |
|----------------------------------------|-----------|
| ProductMesh.tsx branches on product.gltfId | C1 (no gltfId), C2+E1 (has gltfId) |
| GLTF path: drei useGLTF(blobUrl) → render `<primitive object={scene}>` | E1 (smoke), U2 (url resolves) |
| Image path: existing textured box unchanged | C1, regression check in all E1–E4 |
| Position / rotation / Phase 31 sizeScale applied to GLTF root group | E2 (resize), G2 (auto-scale in GltfProduct.tsx useMemo) |
| Suspense boundary for async load | C2 (loading fallback) |
| ErrorBoundary fallback to bbox box on failure | C3 |
| Phase 53 right-click handlers on wrapping group | E3 |
| Phase 54 left-click handlers on wrapping group | E4 |
| useGLTF.clear before URL.revokeObjectURL on unmount | U5 |
| Multiple products sharing gltfId → one ObjectURL | U4 |

---

## Manual Smoke Test (post-automation)

1. `npm run dev` → open app
2. Open AddProductModal → upload `tests/e2e/fixtures/box.glb` → submit
3. Switch to Product tool → click canvas to place the Box product
4. Switch to 3D view → confirm a cube-ish shape renders (not a rounded box)
5. Click the product → confirm accent-purple wireframe bbox outline appears
6. Right-click the product → confirm context menu opens
7. Drag the east resize handle (Phase 31) → confirm model scales
8. Switch to 2D → place an image-only product → switch to 3D → confirm it still renders as a textured box

---

## Phase Gate

All of the following must be green before `/gsd:verify-work`:

- [ ] `npx vitest run tests/hooks/useGltfBlobUrl.test.ts` → 5/5
- [ ] `npx vitest run tests/components/ProductMesh` → all pass
- [ ] `npx playwright test e2e/gltf-render-3d.spec.ts` → 4/4
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npm run test:quick` → same pre-existing failure count (6)
- [ ] Manual smoke test steps 1–8 above → all pass
