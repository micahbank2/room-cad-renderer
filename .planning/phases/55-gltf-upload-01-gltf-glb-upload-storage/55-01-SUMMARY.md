---
phase: 55
plan: "01"
subsystem: gltf-upload
tags: [idb, gltf, glb, upload, dedup, sha256, product-modal, tdd, e2e]
dependency_graph:
  requires: []
  provides: [gltfStore-IDB, gltfId-on-Product, gltfDrivers, AddProductModal-GLTF-input]
  affects: [Phase-56-GLTF-render]
tech_stack:
  added: [src/lib/gltfStore.ts]
  patterns: [IDB-keystore-mirror, TDD-red-green, SHA256-dedup, async-handleSubmit, window-driver]
key_files:
  created:
    - src/lib/gltfStore.ts
    - tests/lib/gltfStore.test.ts
    - src/test-utils/gltfDrivers.ts
    - tests/components/AddProductModal.gltf.test.tsx
    - e2e/gltf-upload.spec.ts
  modified:
    - src/types/product.ts
    - src/components/AddProductModal.tsx
    - src/main.tsx
decisions:
  - computeSHA256 imported from userTextureStore — not duplicated (single source of truth)
  - MIME type validation skipped — extension-only check per research (browser MIME inconsistency)
  - Blob.size not asserted in unit tests — happy-dom strips Blob prototype on IDB round-trip; sizeBytes field (plain number) used instead
  - E2E modal test uses seedScene with wall to bypass WelcomeScreen hasStarted gate
  - driveUploadGltf returns gltfId only (no product store insertion); product store insertion tested via modal UI path
metrics:
  duration: "14 minutes"
  completed_date: "2026-04-29"
  tasks: 4
  files: 8
---

# Phase 55 Plan 01: GLTF/GLB Upload + IDB Storage Summary

GLTF/GLB upload, validation, SHA-256 dedup, and IDB persistence layer with AddProductModal extension and full test coverage (unit + component + e2e).

## What Was Built

**src/lib/gltfStore.ts** — IDB keystore mirroring Phase 32 userTextureStore.ts exactly. Uses isolated named store `"room-cad-gltf-models"/"models"`. Exports 9 symbols: `gltfIdbStore`, `GltfModel`, `saveGltf`, `getGltf`, `deleteGltf`, `listGltfs`, `findGltfBySha256`, `saveGltfWithDedup`, `clearAllGltfs`. `computeSHA256` imported from userTextureStore — not duplicated.

**src/types/product.ts** — `gltfId?: string` field added after `@deprecated modelUrl`. Plain string survives snapshot round-trip without version bump.

**src/test-utils/gltfDrivers.ts + src/main.tsx** — `__driveUploadGltf` window driver (MODE=test gated). Installed via `installGltfDrivers()` in main.tsx after `installUserTextureDrivers()`.

**src/components/AddProductModal.tsx** — Second file input (`.gltf`/`.glb`, `data-testid="gltf-file-input"`). `validateGltf()` checks extension only + 25MB cap (no `file.type`). `handleSubmit` made async; calls `saveGltfWithDedup` when `gltfFile` present; spreads `gltfId` onto product. Image-only products unaffected.

## Test Results

| Suite | Tests | Result |
|-------|-------|--------|
| tests/lib/gltfStore.test.ts | 6 | PASS |
| tests/components/AddProductModal.gltf.test.tsx | 3 | PASS |
| tests/userTextureStore.test.ts (Phase 32 regression) | 9 | PASS |
| e2e/gltf-upload.spec.ts (chromium-dev) | 2 | PASS |
| Full e2e suite (chromium-dev) | 48 | PASS |
| vitest run (full) | 672 passed / 4 failed | UNCHANGED baseline |

## Decisions Made

1. **computeSHA256 not duplicated** — imported from `userTextureStore.ts`. Single source of truth for SHA-256 utility across IDB stores.
2. **Extension-only MIME validation** — `file.type` intentionally not checked (browsers report `.gltf` as `text/plain` and `.glb` as `application/octet-stream` inconsistently).
3. **happy-dom Blob round-trip** — `blob.size` cannot be asserted in unit tests (happy-dom / fake-indexeddb strips Blob prototype). Test asserts `sizeBytes` (plain number field) instead — consistent with existing `userTextureStore.test.ts` precedent.
4. **E2E WelcomeScreen bypass** — snapshot requires at least 1 wall so `App.tsx`'s `hasStarted` gate (`wallCount > 0`) activates and shows the main app.
5. **Driver returns gltfId only** — no product store coupling needed in driver; e2e asserts IDB presence via gltfId prefix pattern; modal UI path tests the full submission flow.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] happy-dom Blob.size undefined on IDB round-trip**
- **Found during:** Task 1 GREEN phase
- **Issue:** `retrieved!.blob.size` returned `undefined` in vitest (happy-dom strips Blob prototype on structured-clone round-trip through fake-indexeddb)
- **Fix:** Assert `retrieved!.sizeBytes` (plain number stored on GltfModel) instead of `blob.size`. Consistent with userTextureStore.test.ts which also avoids blob.size assertion.
- **Files modified:** tests/lib/gltfStore.test.ts
- **Commit:** e6ac7dc

**2. [Rule 1 - Bug] WelcomeScreen blocked e2e modal test**
- **Found during:** Task 4 e2e execution
- **Issue:** Empty-room snapshot (0 walls, 0 products) did not trigger `hasStarted` in App.tsx, so WelcomeScreen rendered instead of main app
- **Fix:** Added one wall to SNAPSHOT fixture so `wallCount > 0` fires `setHasStarted(true)`. Consistent with canvas-context-menu.spec.ts fixture pattern.
- **Files modified:** e2e/gltf-upload.spec.ts
- **Commit:** d5950c0

**3. [Rule 1 - Bug] AddProductModal has no role="dialog"**
- **Found during:** Task 4 e2e — `page.locator('[role="dialog"]')` did not match
- **Fix:** Changed selector to `h2:has-text("ADD PRODUCT")` for modal presence detection, and `button:has-text("ADD TO REGISTRY")` for submit. No modal markup change needed.
- **Files modified:** e2e/gltf-upload.spec.ts
- **Commit:** d5950c0

## Known Stubs

None — all plan objectives fully wired. gltfId is set on Product and stored in IDB. Phase 56 reads `getGltf(gltfId)` to render the blob via drei `useGLTF`.

## Self-Check: PASSED

Files created:
- [x] src/lib/gltfStore.ts
- [x] tests/lib/gltfStore.test.ts
- [x] src/test-utils/gltfDrivers.ts
- [x] tests/components/AddProductModal.gltf.test.tsx
- [x] e2e/gltf-upload.spec.ts

Files modified:
- [x] src/types/product.ts (gltfId field present)
- [x] src/components/AddProductModal.tsx (gltf-file-input, validateGltf, async handleSubmit)
- [x] src/main.tsx (installGltfDrivers called)

Commits (all verified in git log):
- [x] e6ac7dc — feat(55-01): gltfStore.ts IDB layer + 6 unit tests (TDD)
- [x] 915543b — feat(55-01): Product.gltfId field + gltfDrivers.ts + main.tsx wire
- [x] b1f3395 — feat(55-01): AddProductModal GLTF extension + 3 component tests (TDD)
- [x] d5950c0 — test(55-01): e2e/gltf-upload.spec.ts — 2 scenarios (driver + modal UI)
