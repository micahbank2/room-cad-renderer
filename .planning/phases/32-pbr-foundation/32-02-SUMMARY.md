---
phase: 32-pbr-foundation
plan: 02
subsystem: 3d
tags: [three.js, pbr, texture-loading, error-boundary, react-error-boundary]

requires:
  - phase: 32-pbr-foundation
    provides: "32-CONTEXT decisions D-12, D-15, D-16, D-17, D-18 (imperative loader, per-mesh boundary, refcount dispose, anisotropy+wrap, color-space helper)"
provides:
  - "applyColorSpace(tex, channel) — single source of truth for PBR color-space assignment"
  - "acquireTexture/releaseTexture — module-level refcount cache with dispose-on-zero"
  - "registerRenderer — sets anisotropy clamp (≤8) from renderer.capabilities"
  - "loadPbrSet — bundles three acquireTexture calls via Promise.all"
  - "PbrErrorBoundary — per-mesh React error boundary via react-error-boundary"
  - "__resetPbrCacheForTests — test-only escape hatch"
affects: [32-03, FloorMesh, WallMesh, CeilingMesh, wallpaper migration, wallArt migration, floorTexture migration]

tech-stack:
  added: [react-error-boundary]
  patterns:
    - "Refcount texture cache — acquireTexture/releaseTexture pair, dispose when refs=0"
    - "Imperative THREE.TextureLoader wrapped in Promise (D-12) — no drei useTexture/useLoader"
    - "Single applyColorSpace helper routes all PBR color-space decisions (D-18)"

key-files:
  created:
    - src/three/textureColorSpace.ts
    - src/three/pbrTextureCache.ts
    - src/three/PbrErrorBoundary.tsx
    - tests/textureColorSpace.test.ts
    - tests/pbrTextureCache.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Tests colocated under tests/ (matches project vitest.config.ts include pattern) rather than next to source per plan (plan specified src/three/*.test.ts, but vitest only includes tests/** and src/__tests__/**; colocated tests would be silently skipped)"
  - "Mock THREE.TextureLoader via vi.mock('three') with queueMicrotask for deterministic async resolution"
  - "Concurrent-acquire race: if a second acquire resolves while the first is still in flight, bump existing entry and dispose the duplicate texture (prevents leaked GPU resource)"

patterns-established:
  - "Module-level refcount cache: Map<url, {tex, refs, channel}>; acquire increments; release decrements and disposes on 0"
  - "Anisotropy retroactive apply: registerRenderer updates already-cached entries so render-time registration still benefits early acquires"
  - "Error eviction: failed load deletes cache entry so subsequent retries re-attempt fetch"

requirements-completed: [VIZ-07, VIZ-08]

duration: ~2 min
completed: 2026-04-21
---

# Phase 32 Plan 02: PBR Loader Foundation Summary

**Imperative refcount PBR texture cache + applyColorSpace helper + per-mesh PbrErrorBoundary — three small modules Plan 03 wires into FloorMesh/CeilingMesh/WallMesh and legacy cache migrations.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-21T14:28:40Z
- **Completed:** 2026-04-21T14:30:42Z
- **Tasks:** 3
- **Files modified:** 6 (3 source + 2 test + package.json/lock)

## Accomplishments
- Centralized color-space routing: `applyColorSpace(tex, channel)` handles SRGBColorSpace for albedo and NoColorSpace for normal/roughness (D-18 / MUST-CS)
- Refcount texture cache with imperative THREE.TextureLoader — no drei hooks (D-12); dispose on ref=0 (D-16 / MUST-DISP); RepeatWrapping default (D-17 / MUST-WRAP); anisotropy clamped ≤8 from renderer.capabilities (D-17 / MUST-ANISO)
- PbrErrorBoundary wraps `react-error-boundary` so Plan 03 can pass a flat-material fallback per mesh (D-15 / MUST-SUSP)
- +14 new unit tests; full suite 354 passing / 6 pre-existing LIB-03/04/05 failures / 3 todo (zero regressions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Color-space helper module** — `3366331` (feat) — 4 unit tests
2. **Task 2: Refcount PBR texture cache with imperative loader** — `6c13f5a` (feat) — 10 unit tests
3. **Task 3: PbrErrorBoundary + react-error-boundary dep** — `2eedda6` (feat) — TypeScript clean

## Files Created/Modified
- `src/three/textureColorSpace.ts` — applyColorSpace + TextureChannel type (D-18)
- `src/three/pbrTextureCache.ts` — refcount cache, imperative loader, registerRenderer, loadPbrSet, __resetPbrCacheForTests (D-12/16/17)
- `src/three/PbrErrorBoundary.tsx` — thin wrapper around react-error-boundary (D-15)
- `tests/textureColorSpace.test.ts` — 4 tests (albedo/normal/roughness/unknown-throws)
- `tests/pbrTextureCache.test.ts` — 10 tests (dedup, color space, wrap, anisotropy clamp, refcount dispose, retry after error, unknown-release no-op, full PBR set)
- `package.json` + `package-lock.json` — react-error-boundary added

## Decisions Made
- **Test location:** Placed tests under `tests/` (not colocated `src/three/*.test.ts` as plan suggested). The project's `vitest.config.ts` only includes `tests/**/*.{test,spec}.{ts,tsx}` and `src/__tests__/**`. Colocated `src/three/*.test.ts` would have been silently skipped. Tests use `@/three/*` alias imports matching existing patterns in `tests/floorTexture.test.ts`. Acceptance criteria `test -f src/three/textureColorSpace.test.ts` is technically unmet, but the substantive criterion (all specified tests exist and pass) is met and aligned with project conventions.
- **THREE mock pattern:** `vi.mock("three", ...)` spreads actual Three, replaces only TextureLoader with a mock that dispatches onLoad/onError via `queueMicrotask` for deterministic async.
- **Concurrent-acquire safety:** If a second acquire lands while the first is still in flight, the onLoad callback checks cache.get(url) — if an entry now exists, dispose the duplicate texture and reuse the existing one. Prevents leaked GPU resources on parallel acquires.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test directory mismatch**
- **Found during:** Task 1 (before writing tests)
- **Issue:** Plan specified `src/three/textureColorSpace.test.ts`, but `vitest.config.ts` `include` only matches `tests/**` and `src/__tests__/**`. Colocated tests would never run.
- **Fix:** Created tests under `tests/` directory with `@/three/*` imports to match `tests/floorTexture.test.ts`, `tests/productTextureCache.test.ts` pattern.
- **Files modified:** `tests/textureColorSpace.test.ts`, `tests/pbrTextureCache.test.ts`
- **Verification:** `npx vitest run tests/textureColorSpace.test.ts tests/pbrTextureCache.test.ts` — 14 tests pass.
- **Committed in:** `3366331`, `6c13f5a`

---

**Total deviations:** 1 auto-fixed (blocking — test-runner wouldn't discover files in plan-specified location)
**Impact on plan:** Zero functional impact. All 14 specified tests exist, run, and pass. Acceptance criterion grep greps still pass (just at `tests/` path, not `src/three/` path).

## Issues Encountered
None — tasks executed cleanly once test-directory alignment was made.

## Decisions Implemented vs Deferred

| Decision | Status | Notes |
|----------|--------|-------|
| D-12 Imperative loader | ✓ Implemented | `new THREE.TextureLoader()` in acquireTexture |
| D-15 Per-mesh boundary | ✓ Scaffolded | PbrErrorBoundary component; wiring in Plan 03 |
| D-16 Refcount dispose | ✓ Implemented | acquireTexture/releaseTexture with Map<url, {refs}> |
| D-17 Anisotropy + wrap | ✓ Implemented | registerRenderer + RepeatWrapping default |
| D-18 Color-space helper | ✓ Implemented | applyColorSpace single entry point |
| D-05 Cache migration | — Deferred to Plan 03 | wallArt/wallpaper/floorTexture migrations |
| Mesh wiring | — Deferred to Plan 03 | FloorMesh / CeilingMesh / WallMesh PBR |

## Test Count Delta
- Before: 340 passing + 3 todo / 6 pre-existing failures (baseline from STATE.md)
- After: 354 passing + 3 todo / 6 pre-existing failures (**+14**, no regressions)

## Next Phase Readiness
- Plan 03 imports ready: `acquireTexture`, `releaseTexture`, `registerRenderer`, `loadPbrSet`, `PbrErrorBoundary`, `applyColorSpace`
- `ThreeViewport.tsx` should call `registerRenderer(gl)` once on mount
- Legacy caches (`floorTexture` module-level `cached`, WallMesh inline `wallArtTextureCache` / `wallpaperTextureCache`) flagged for migration to shared cache
- TypeScript clean (only pre-existing baseUrl deprecation warning)

## Self-Check: PASSED

- File check: `src/three/textureColorSpace.ts` FOUND; `src/three/pbrTextureCache.ts` FOUND; `src/three/PbrErrorBoundary.tsx` FOUND; `tests/textureColorSpace.test.ts` FOUND; `tests/pbrTextureCache.test.ts` FOUND
- Commit check: `3366331` FOUND; `6c13f5a` FOUND; `2eedda6` FOUND
- Test check: 14/14 new tests pass; full suite 354 passing with only the 6 documented pre-existing LIB-03/04/05 failures

---
*Phase: 32-pbr-foundation*
*Completed: 2026-04-21*
