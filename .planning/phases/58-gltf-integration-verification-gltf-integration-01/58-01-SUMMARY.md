---
phase: 58-gltf-integration-verification-gltf-integration-01
plan: 01
subsystem: ui
tags: [gltf, three.js, library, thumbnail, lucide, react, playwright, vitest, webgl, phase-48-saved-camera]

requires:
  - phase: 55-gltf-upload-01
    provides: gltfStore.getGltf, IDB-backed GLTF blob persistence
  - phase: 56-gltf-render-3d-01
    provides: __driveAddGltfProduct, ProductMesh GLTF rendering
  - phase: 57-gltf-render-2d-01
    provides: getCachedSilhouette FIX-01 async-cache pattern (mirrored here)
  - phase: 48-camera-04
    provides: __driveSaveCamera, __driveFocusNode, __getSavedCamera, __setTestCamera, __getCameraPose
  - phase: 45-thumb-01
    provides: swatchThumbnailGenerator structure (mirrored here for GLTF)
  - phase: 33-design-system
    provides: lucide-react icon system, design tokens

provides:
  - "src/three/gltfThumbnailGenerator.ts: 256×256 PNG GLTF thumbnail engine with FOV-based framing + studio lighting + full PBR-map disposal"
  - "computeGltfThumbnail(gltfId), getCachedGltfThumbnail(gltfId, onReady), __resetGltfThumbnailCache exports"
  - "LibraryCard.badge?: ReactNode prop — top-LEFT capability indicator slot, both grid + list variants"
  - "ProductLibrary thumbnail-source priority: imageUrl > gltfId thumbnail > undefined (D-09)"
  - "lucide Box badge surfaced on every product with gltfId — always-visible, no background, text-text-dim"
  - "data-testid='library-card-badge' on badge wrapper for downstream test introspection"
  - "Phase 48 × GLTF e2e coverage (E1) — saved-camera round-trip on GLTF placedProduct"

affects: [v1.15+, future product-library polish, future GLTF UX]

tech-stack:
  added: []
  patterns:
    - "Async sync-with-onReady cache pattern mirrors Phase 57 getCachedSilhouette (FIX-01)"
    - "Module-level Map cache + Set in-flight guard, sentinel-string for permanent failures"
    - "Three offscreen WebGL contexts coexist safely: main viewport + Phase 45 swatch + Phase 58 GLTF thumbnail"
    - "Generic top-LEFT badge slot on shared LibraryCard primitive — composable capability indicators"

key-files:
  created:
    - "src/three/gltfThumbnailGenerator.ts"
    - "tests/three/gltfThumbnailGenerator.test.ts"
    - "tests/components/LibraryCard.badge.test.tsx"
    - "tests/components/ProductLibrary.gltf.test.tsx"
    - "e2e/gltf-integration.spec.ts"
  modified:
    - "src/components/library/LibraryCard.tsx"
    - "src/components/ProductLibrary.tsx"

key-decisions:
  - "D-01 (revised) — Box badge at TOP-LEFT corner (was top-right; revised in CONTEXT to avoid X-button collision)"
  - "Research Q2 — FOV-based framing: distance = (maxDim/2) / tan(fov/2) * 1.4 (overrides CONTEXT D-11 diagonal formula)"
  - "Research Q4 — disposal traverses scene + 10 PBR texture maps (.map, .normalMap, .roughnessMap, .metalnessMap, .aoMap, .emissiveMap, .bumpMap, .displacementMap, .alphaMap, .envMap) + materials, on success AND catch paths"
  - "Research Q1 — no scene.clone(); each parseAsync returns fresh scene per call"
  - "D-08 — FALLBACK_SENTINEL = literal 'fallback' string; ProductLibrary string-checks and renders no thumbnail"
  - "D-09 — thumbnail-source priority: imageUrl > gltfId > undefined; gltfId-thumbnail NOT written back to Product.imageUrl"
  - "D-10 — separate WebGLRenderer from Phase 45 (3 total contexts: main + swatch + gltf-thumbnail) — no registerRenderer() call"
  - "Mock pattern for vitest GLTFLoader: vi.mock with class returning fresh THREE.Group each parseAsync (avoids hoisting issues)"

patterns-established:
  - "Generic LibraryCard.badge slot — accepts any ReactNode, positioned absolute top-LEFT, pointer-events-none, z-10. Future capability indicators (e.g. material-PBR badge, animated badge) can reuse this slot without modifying LibraryCard."
  - "FOV-based bbox-aware camera framing — replaces fixed-distance + scale-based rendering for variable-size GLTF assets"
  - "Comprehensive PBR-map disposal — 10-map iteration on every disposeGltfScene call prevents GPU memory leak even on parse-failed paths"

requirements-completed: [GLTF-INTEGRATION-01]

duration: 26min
completed: 2026-05-05
---

# Phase 58 Plan 01: GLTF-INTEGRATION-01 Summary

**lucide Box badge + 256×256 auto-thumbnail engine + Phase 48 × GLTF e2e — the v1.14 closer**

## Performance

- **Duration:** ~26 min
- **Started:** 2026-05-04T22:59:46Z (vitest baseline run)
- **Completed:** 2026-05-05T03:25:50Z
- **Tasks:** 4
- **Files modified:** 7 (4 new, 3 extended — counting plan-modified files)

## Accomplishments

- New `src/three/gltfThumbnailGenerator.ts` (~150 lines): lazy-init WebGLRenderer + studio-lit scene + 35° FOV camera, 256×256 PNG output, sentinel-cached failures, full PBR-map disposal on success and catch paths.
- Extended `LibraryCard` with optional generic `badge?: ReactNode` slot at top-LEFT — both grid and list variants. X-button at top-right unaffected.
- `ProductLibrary` now branches thumbnail source: imageUrl wins, falls back to GLTF auto-thumbnail, then undefined. Box icon badge passed for any product with a `gltfId`.
- 14 new vitest assertions (4 unit U1–U4 + 4 LibraryCard U5 + 6 ProductLibrary C1/C2) all green.
- 3 new Playwright e2e scenarios (E1 Phase 48 × GLTF saved-camera round-trip, E2 badge DOM, E3 thumbnail dataURL) — all 3 pass on chromium-preview.
- Phase 56 (3D) + Phase 57 (2D silhouette) + Phase 48 (saved-camera) e2e specs all remain green — zero regressions.

## Task Commits

1. **Task 1: gltfThumbnailGenerator + 4 unit tests (TDD)** — `8a3e9a4` (feat)
2. **Task 2: LibraryCard badge slot + U5** — `aeed166` (feat)
3. **Task 3: ProductLibrary GLTF badge + thumbnail-source branch + C1/C2** — `70f310a` (feat)
4. **Task 4: e2e/gltf-integration.spec.ts E1–E3** — `16332f7` (test)

## Files Created/Modified

- `src/three/gltfThumbnailGenerator.ts` — 256×256 PNG GLTF thumbnail engine
- `src/components/library/LibraryCard.tsx` — added `badge?: ReactNode` prop, rendered top-LEFT in both variants
- `src/components/ProductLibrary.tsx` — added `resolveThumbnail()` helper, useState tick for async resolves, Box badge wiring
- `tests/three/gltfThumbnailGenerator.test.ts` — 4 unit tests U1–U4
- `tests/components/LibraryCard.badge.test.tsx` — 4 assertions covering U5a (grid + list) + U5b + U5c
- `tests/components/ProductLibrary.gltf.test.tsx` — 6 assertions covering C1 + C2 (4 cases) + fallback sentinel
- `e2e/gltf-integration.spec.ts` — 3 Playwright scenarios E1–E3

## Decisions Made

- **D-01 (revised) implemented as TOP-LEFT** badge corner. CONTEXT.md was revised pre-execution to place badge opposite the X-button (top-right) and avoid hover collision.
- **FOV-based camera framing** chosen over CONTEXT D-11's diagonal formula per RESEARCH.md Q2 — produces tighter framing for variable-size GLTF assets and is a textbook three.js pattern.
- **Mock pattern for GLTFLoader in vitest:** `vi.mock(...)` factory uses async + `vi.importActual<typeof three>` to get a fresh `THREE.Group` per `parseAsync()` call. Initial `require("three")` attempt failed because the test environment is ESM-only.
- **Test-only `__resetGltfThumbnailCache` window binding** mirrors the Phase 45 swatchThumbnailGenerator pattern — gated by `import.meta.env.MODE === "test"` so production never sees it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Vitest mock factory hoisting in tests/three/gltfThumbnailGenerator.test.ts**

- **Found during:** Task 1 (RED → GREEN transition)
- **Issue:** Initial mock used a top-level `makeBoxScene` helper referenced inside the `vi.mock(...)` factory; vitest hoists `vi.mock` above imports so the helper was undefined when the factory ran. Tests fell through to the catch path returning `"fallback"` instead of a dataURL.
- **Fix:** Inlined the box-scene construction inside the mock factory using `vi.importActual<typeof import("three")>("three")` to get a fresh `THREE.Group + Mesh + BoxGeometry + MeshStandardMaterial` per `parseAsync()` call. Avoids hoisting hazard entirely.
- **Files modified:** `tests/three/gltfThumbnailGenerator.test.ts` (mock factory rewrite)
- **Verification:** All 4 unit tests U1–U4 pass after fix.
- **Committed in:** `8a3e9a4` (Task 1 commit)

**2. [Rule 2 — Missing Critical] Added C2d "fallback sentinel → no img" component test**

- **Found during:** Task 3 (writing C1/C2 tests)
- **Issue:** Plan called for C1×2 + C2×3 = 5 ProductLibrary tests but did not explicitly cover the case where `getCachedGltfThumbnail` returns the literal `"fallback"` sentinel — a critical correctness path (renders no img, never crashes, never shows the literal string "fallback" to the user).
- **Fix:** Added a 6th component test, C2d, asserting that when the mock returns `"fallback"`, no `<img>` is rendered on the card. Reinforces D-08 contract end-to-end through both modules.
- **Files modified:** `tests/components/ProductLibrary.gltf.test.tsx` (one extra `it(...)` block)
- **Verification:** Test passes; total ProductLibrary GLTF assertions = 6.
- **Committed in:** `70f310a` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both auto-fixes are TDD-quality improvements with no scope expansion. The test-mock fix was a vitest mechanic; the extra fallback test strengthens coverage of an existing contract.

## Issues Encountered

- **Pre-existing chromium-dev driver-install timing failure:** When running `e2e/gltf-integration.spec.ts` against the `chromium-dev` Playwright project (port 5173, dev-mode Vite), `__driveAddGltfProduct` is not installed in time — same baseline issue Phase 57 documents for `gltf-render-2d.spec.ts`. The canonical pass criterion is **chromium-preview** (port 4173, production-built bundle in `--mode test`), where all 3 new + 4 Phase 57 + 4 Phase 56 + 1 Phase 48 = 12/12 e2e scenarios pass. No regression introduced — same baseline.

## User Setup Required

None — no external service configuration. All persistence remains browser-side (IndexedDB).

## Next Phase Readiness

- **v1.14 milestone CLOSED.** GLTF-INTEGRATION-01 (GH #28) — Library Box badge + auto-thumbnail + Phase 48 × GLTF e2e — all three workstreams shipped.
- Real 3D models are now first-class citizens in the library: Jessica sees a Box icon on every model-backed product and a rendered thumbnail of the actual model on cards she hasn't uploaded an image for.
- Saved cameras work on GLTF products end-to-end (Phase 48 × Phase 56).
- 3 WebGL contexts (main + swatch + gltf-thumbnail) — well under all browser caps.
- Vitest baseline unchanged: 4 pre-existing failures in unrelated files; 14 new tests added all green.

## Self-Check: PASSED

- src/three/gltfThumbnailGenerator.ts: FOUND
- tests/three/gltfThumbnailGenerator.test.ts: FOUND
- tests/components/LibraryCard.badge.test.tsx: FOUND
- tests/components/ProductLibrary.gltf.test.tsx: FOUND
- e2e/gltf-integration.spec.ts: FOUND
- src/components/library/LibraryCard.tsx (modified): FOUND
- src/components/ProductLibrary.tsx (modified): FOUND
- Commits 8a3e9a4, aeed166, 70f310a, 16332f7: FOUND in git log

---
*Phase: 58-gltf-integration-verification-gltf-integration-01*
*Completed: 2026-05-05*
