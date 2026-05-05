---
phase: 58-gltf-integration-verification-gltf-integration-01
plan: 01
type: validation
created: 2026-05-04
requirements: [GLTF-INTEGRATION-01]
---

# Phase 58 — Test Path Map

**Plan:** 58-01-PLAN.md
**Total cases:** 10 named tests across 4 files (4 unit + 3 component + 3 e2e)

## Test → Requirement → Source File Map

| ID | Type | Test File | Test Name (vitest -t / playwright -g) | Source Under Test | Requirement | Decision(s) |
|----|------|-----------|----------------------------------------|-------------------|-------------|-------------|
| U1 | unit | `tests/three/gltfThumbnailGenerator.test.ts` | "computeGltfThumbnail returns PNG dataURL for synthetic Box scene" | `src/three/gltfThumbnailGenerator.ts` → `computeGltfThumbnail` | GLTF-INTEGRATION-01 | D-04, D-05, D-11, research Q2 |
| U2 | unit | `tests/three/gltfThumbnailGenerator.test.ts` | "getCachedGltfThumbnail synchronous cache hit returns cached dataURL" | `src/three/gltfThumbnailGenerator.ts` → `getCachedGltfThumbnail` (warm-cache path) | GLTF-INTEGRATION-01 | D-08 |
| U3 | unit | `tests/three/gltfThumbnailGenerator.test.ts` | "getCachedGltfThumbnail cache miss → undefined; onReady fires async; second call returns dataURL" | `src/three/gltfThumbnailGenerator.ts` → `getCachedGltfThumbnail` (cold-cache + in-flight) | GLTF-INTEGRATION-01 | D-03, D-08, FIX-01 pattern |
| U4 | unit | `tests/three/gltfThumbnailGenerator.test.ts` | "getCachedGltfThumbnail returns 'fallback' sentinel for invalid gltfId / parse failure" | `src/three/gltfThumbnailGenerator.ts` → catch path | GLTF-INTEGRATION-01 | D-08 (sentinel) |
| U5 | unit | `tests/components/LibraryCard.badge.test.tsx` | "LibraryCard badge slot — renders when provided, no DOM when omitted, coexists with onRemove" (3 assertions) | `src/components/library/LibraryCard.tsx` → grid + list variants | GLTF-INTEGRATION-01 | D-01 (top-LEFT, revised), research Q5 |
| C1 | component | `tests/components/ProductLibrary.gltf.test.tsx` | "ProductLibrary — Box badge visibility per gltfId" (C1a present, C1b absent) | `src/components/ProductLibrary.tsx` → LibraryCard `badge` prop wiring | GLTF-INTEGRATION-01 | D-01, D-02 |
| C2 | component | `tests/components/ProductLibrary.gltf.test.tsx` | "ProductLibrary — thumbnail-source priority" (C2a imageUrl wins, C2b gltfId fallback, C2c neither = undefined) | `src/components/ProductLibrary.tsx` → `resolveThumbnail` helper | GLTF-INTEGRATION-01 | D-09 |
| E1 | e2e | `e2e/gltf-integration.spec.ts` | "saved camera survives navigate-away + double-click restore on GLTF product" | Phase 48 saved-camera × Phase 56 GltfProduct wiring | GLTF-INTEGRATION-01 (acceptance) | D-12 |
| E2 | e2e | `e2e/gltf-integration.spec.ts` | "GLTF product card shows Box badge in library" | `src/components/ProductLibrary.tsx` + `LibraryCard.tsx` (DOM rendered output) | GLTF-INTEGRATION-01 (verifiable) | D-01, D-02 |
| E3 | e2e | `e2e/gltf-integration.spec.ts` | "GLTF-only product gets auto-thumbnail after compute" | `src/three/gltfThumbnailGenerator.ts` end-to-end through ProductLibrary | GLTF-INTEGRATION-01 (acceptance: auto-thumbnail) | D-03, D-09, D-11 |

## Files Created in Wave 0 (RED)

- [x] `tests/three/gltfThumbnailGenerator.test.ts` — Task 1, RED before Task 1 GREEN
- [x] `tests/components/LibraryCard.badge.test.tsx` — Task 2, RED before Task 2 GREEN
- [x] `tests/components/ProductLibrary.gltf.test.tsx` — Task 3, RED before Task 3 GREEN
- [x] `e2e/gltf-integration.spec.ts` — Task 4 (no TDD; Playwright spec written + run together)

Fixture: `tests/e2e/fixtures/box.glb` already exists from Phase 56 — no new fixture needed.

## Sampling Cadence

| When | Command | Expected |
|------|---------|----------|
| Per task commit | `npx vitest run tests/three/gltfThumbnailGenerator.test.ts tests/components/LibraryCard.badge.test.tsx tests/components/ProductLibrary.gltf.test.tsx` | All new tests pass; 4 pre-existing vitest failures unchanged |
| Per task commit (Task 4) | `npx playwright test e2e/gltf-integration.spec.ts` | E1, E2, E3 all pass |
| Phase merge gate | `npx vitest run && npx playwright test e2e/gltf-integration.spec.ts e2e/gltf-render-3d.spec.ts e2e/gltf-render-2d.spec.ts` | Full suite green except 4 pre-existing vitest failures |
| Phase verify-work gate | Above + `npx tsc --noEmit` | Zero TypeScript errors |

## Regression Surface (must remain green)

| Phase | Test File | Why It Must Not Break |
|-------|-----------|------------------------|
| 31 | (size-override drivers) | Phase 31 size-override on GLTF products is acceptance criteria but already covered by Phase 56 E3 + Phase 57 E3; this phase doesn't touch resize logic |
| 32 | LIB-* tests (image-only products) | D-16: image-only products' library cards must remain unchanged |
| 33 | LibraryCard existing tests | D-16: badge slot is additive, must not break thumbnail / label / selected / onRemove paths |
| 45 | swatchThumbnailGenerator tests | D-10: separate renderer instance, should not interfere |
| 48 | `e2e/saved-camera-cycle.spec.ts` | E1 introduces GLTF × saved-camera; existing image-product saved-camera scenarios must still pass |
| 53 | right-click context menu tests | D-16: untouched |
| 54 | click-to-select tests | D-16: untouched |
| 55 | gltfStore tests | D-16: untouched (read-only consumer here) |
| 56 | `e2e/gltf-render-3d.spec.ts` | D-16: 3D rendering untouched |
| 57 | `e2e/gltf-render-2d.spec.ts` | D-16: 2D silhouette untouched |
| Pre-existing | 4 known vitest failures | Failure count must remain exactly 4 |

## Decision Coverage (D-01 through D-16)

| Decision | Tested By | Notes |
|----------|-----------|-------|
| D-01 (Box badge top-LEFT, revised from top-right) | U5, C1, E2 | Research Q5 surfaced collision with X button → top-LEFT |
| D-02 (badge whenever gltfId truthy, regardless of imageUrl) | C1a, C1b | C2a additionally covers "imageUrl + gltfId" combo (badge still shows) |
| D-03 (lazy compute on first library render) | U3, E3 | Cache miss + onReady pattern |
| D-04 (3/4 perspective, FOV=35°) | U1 | Implementation detail; output dataURL non-empty is sufficient signal at unit level |
| D-05 (256×256 PNG dataURL) | U1, E3 | E3 string-matches `^data:image/png;base64,` |
| D-06 (studio lighting, NOT scene-matching) | U1 | Lighting baked into ensureRenderer; visual only |
| D-07 (transparent background) | U1 | `setClearColor(0x000000, 0)` baked in |
| D-08 (in-memory Map cache + "fallback" sentinel) | U2, U3, U4 | U4 specifically tests sentinel |
| D-09 (imageUrl > gltfId > undefined) | C2a, C2b, C2c | All three priority levels |
| D-10 (dedicated renderer, NOT registerRenderer) | (visual inspection of source) | Header comment + research Q3 confirm 3 contexts safe |
| D-11 (compute pseudocode) | U1 + research Q2 | NOTE: implementation deviates from CONTEXT D-11 to use FOV formula B per research Q2 |
| D-12 (Phase 48 × GLTF e2e) | E1 | Single focused scenario |
| D-13 (test coverage 5 unit + 2 component + 3 e2e) | All tests | Phase 58 ships exactly: 4 unit (U1-U4) + 1 unit on LibraryCard (U5, 3 assertions) + 2 component (C1, C2 — 5 assertions) + 3 e2e (E1-E3) = 10 named cases. Matches CONTEXT D-13 framing. |
| D-14 (reuse box.glb) | E1, E2, E3 | No new fixture |
| D-15 (atomic commits per task) | (git log inspection) | One commit per task |
| D-16 (zero regressions) | Regression surface table above | Verify-work gate enforces |

## Research Integration Coverage

| Research Item | Confidence | Implemented In | Verified By |
|---------------|------------|----------------|-------------|
| Q1 — No scene.clone needed | HIGH | Task 1 (parse fresh per call) | U1 (mock returns fresh scene per call) |
| Q2 — FOV-based camera framing (Formula B, not D-11 diagonal) | HIGH | Task 1 `computeGltfThumbnail` | U1 + manual smoke |
| Q3 — 3 WebGL contexts safe | HIGH | Task 1 (separate renderer, no pool) | Module-level header comment + manual DevTools check |
| Q4 — Disposal traverse (10 PBR maps + geometry + material) | HIGH | Task 1 `disposeGltfScene` private helper | Manual long-session GPU memory check; no automated test for GPU memory |
| Q5 — Always-visible badge, no background, text-text-dim | HIGH | Task 2 (LibraryCard slot) + Task 3 (Box icon styling) | U5, C1, E2 |

## Risks + Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `HTMLCanvasElement.toDataURL` mock leaks across tests | LOW | `beforeEach` resets cache via `__resetGltfThumbnailCache()` |
| Phase 48 driver names differ from assumptions in E1 | MEDIUM | Task 4 instructs executor to read `src/test-utils/savedCameraDrivers.ts` first; augment if needed |
| `data-testid="library-card-badge"` collides with future tests | LOW | Naming is specific to this slot; documented in LibraryCard JSDoc |
| Real WebGL not available in vitest jsdom env | HIGH (expected) | U1 mocks toDataURL on prototype; does NOT exercise actual renderer.render |
| Box badge `data-testid` lost in lucide-react SVG | LOW | lucide-react forwards `...rest` props to the underlying svg; verified in Phase 33 usage |

## Phase Gate Checklist

- [ ] All 10 named tests pass
- [ ] 4 pre-existing vitest failures unchanged (count, identity)
- [ ] Phase 56 + 57 + 48 e2e specs all green
- [ ] `npx tsc --noEmit` clean
- [ ] Manual: GLTF product card shows Box badge top-LEFT in browser
- [ ] Manual: GLTF-only product card shows rendered thumbnail (not blank)
- [ ] Manual: image-only product card unchanged
- [ ] Manual: Phase 48 saved-camera × GLTF round-trip works in browser
- [ ] 4 atomic commits exist (one per task)
