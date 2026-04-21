---
phase: 32-pbr-foundation
plan: 04
subsystem: 3d-materials
tags: [pbr, tests, regression-guard, test-driver, integration-test, error-boundary]
one_liner: "Lock Phase 32 PBR behavior under vitest: +12 new assertions (9 integration + 3 boundary) + gated __getPbrCacheState test driver, zero regressions."

requires:
  - phase: 32-pbr-foundation
    provides: "Plan 01 (SURFACE_MATERIALS + pbr blocks), Plan 02 (pbrTextureCache + PbrErrorBoundary), Plan 03 (PbrSurface wiring)"
provides:
  - "__getPbrCacheState() test driver + PbrCacheSnapshot interface on pbrTextureCache"
  - "window.__getPbrCacheState + window.__resetPbrCacheForTests bridges (MODE === test gated)"
  - "9 integration tests pinning color-space / tile-size / refcount / path contracts"
  - "3 boundary tests pinning PbrErrorBoundary fallback behavior"
affects:
  - "Phase 32 closeout — VIZ-07 and VIZ-08 now locked by automated regression guards"
  - "Phase 33 will inherit this test scaffold for LIB-06/07/08 user-upload work"

tech-stack:
  added: []
  patterns:
    - "Gated test driver: `typeof window !== 'undefined' && import.meta.env.MODE === 'test'` — matches Phase 29/30/31 convention (CLAUDE.md)"
    - "THREE.TextureLoader mock via vi.mock('three') with queueMicrotask — matches Plan 02 test pattern"

key-files:
  created:
    - tests/pbrIntegration.test.ts
    - tests/pbrBoundary.test.tsx
  modified:
    - src/three/pbrTextureCache.ts

key-decisions:
  - "Tests placed under tests/ not src/three/ per vitest.config.ts include pattern — same Rule 3 auto-fix as Plan 02 (src/three/*.test.ts would be silently skipped)"
  - "Driver exposes __getPbrCacheState (read-only snapshot) on window; acquireTexture/releaseTexture remain module imports (no window-level write surface)"
  - "`disposed` flag on PbrCacheSnapshot uses `entry.tex.source?.data == null` as a proxy since three.js Texture has no public disposed flag — intended for diagnostic visibility, not contract assertion"
  - "Mock TextureLoader uses queueMicrotask for deterministic async resolution (matches Plan 02)"

patterns-established:
  - "__getPbrCacheState returns a plain-object snapshot array, not a live view — safe for tests to retain across assertions"
  - "Integration tests exercise SURFACE_MATERIALS.* registry entries directly (not fixtures) — drift in the registry breaks the tests, which is the intended regression guard"

requirements-completed: [VIZ-07, VIZ-08]

metrics:
  duration_minutes: 2
  completed_date: "2026-04-21T21:21:35Z"
  tasks_completed: 3
  files_changed: 3
---

# Phase 32 Plan 04: PBR Regression Guards Summary

**Locks Phase 32's PBR behavior under vitest. +12 new assertions (9 integration + 3 boundary) plus a gated `__getPbrCacheState` test driver on `pbrTextureCache`. Zero production behavior change, zero regressions. Closes VIZ-07 and VIZ-08 with automated coverage — ROADMAP Phase 32 success criteria 1–4 now have regression guards.**

## Performance

- **Duration:** ~2 minutes
- **Started:** 2026-04-21T21:19:55Z
- **Completed:** 2026-04-21T21:21:35Z
- **Tasks:** 3
- **Files changed:** 3 (1 modified + 2 created)

## Accomplishments

- **Test driver added + gated** — `__getPbrCacheState()` returns `PbrCacheSnapshot[]` (url, refs, channel, disposed) from the module-level cache; window bridge only installed under `import.meta.env.MODE === "test"`. Zero production bundle impact.
- **Integration coverage** — 9 tests pin real-registry contracts: SRGBColorSpace for albedo, NoColorSpace for normal/roughness, D-20 tile sizes (WOOD_PLANK 0.5×4, CONCRETE 4×4, PLASTER 6×6), PAINTED_DRYWALL absence of `pbr` field (success criterion 2 regression guard), legacy materials unaffected, refcount lifecycle end-to-end, `/textures/` path prefix.
- **Boundary coverage** — 3 RTL tests pin `PbrErrorBoundary` behavior: pass-through when no error, fallback render when child throws (simulates broken texture URL), arbitrary JSX fragment fallbacks.
- **Full suite:** 367 → 379 passing (exactly +12). Same 6 pre-existing LIB-03/04/05 failures documented in deferred-items.md. Zero regressions.

## Task Commits

1. **Task 1: Add gated `__getPbrCacheState` driver** — `15214b4` (feat)
2. **Task 2: Integration test — registry × loader** — `cbdd16f` (test)
3. **Task 3: `PbrErrorBoundary` fallback rendering** — `0ef19d1` (test)

## Files Created/Modified

### Modified
- `src/three/pbrTextureCache.ts` (+33 lines) — Appended `PbrCacheSnapshot` interface, `__getPbrCacheState()` function, and window-bridge assignment gated by `import.meta.env.MODE === "test"`. No behavior change to `acquireTexture` / `releaseTexture` / `registerRenderer` / `loadPbrSet`.

### Created
- `tests/pbrIntegration.test.ts` (111 lines) — 9 tests. Mocks `three.TextureLoader` via `vi.mock("three")`. Exercises `SURFACE_MATERIALS.{WOOD_PLANK,CONCRETE,PLASTER}.pbr` directly through `loadPbrSet` and asserts cache state through `__getPbrCacheState`.
- `tests/pbrBoundary.test.tsx` (58 lines) — 3 tests using `@testing-library/react`. `Thrower` component simulates mount-time throw; `OK` component confirms pass-through. Silences React's `console.error` for boundary catches.

## Decisions Implemented vs Deferred

| Decision | Status | Notes |
|----------|--------|-------|
| D-12 Imperative loader | Pinned | Integration tests exercise real `loadPbrSet` through mocked `TextureLoader` |
| D-13 Optional pbr field | Pinned | PAINTED_DRYWALL.pbr === undefined asserted; 7 legacy materials asserted |
| D-15 Per-mesh boundary | Pinned | 3 boundary tests cover pass-through + fallback render + fragment fallback |
| D-16 Refcount dispose | Pinned | `refcount tracks across multiple loadPbrSet calls` + `releaseTexture empties cache` tests |
| D-18 Color-space routing | Pinned | SRGBColorSpace/NoColorSpace asserted on real registry entries |
| D-20 Tile sizes | Pinned | WOOD_PLANK 0.5×4, CONCRETE 4×4, PLASTER 6×6 asserted |
| VIZ-07 / VIZ-08 | Locked | Requirement checkboxes updated on REQUIREMENTS.md via `requirements mark-complete` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test directory mismatch (same fix as Plan 02)**
- **Found during:** Task 2 (before writing file)
- **Issue:** Plan specified `src/three/pbrIntegration.test.ts` and `src/three/pbrBoundary.test.tsx`, but `vitest.config.ts` `include` only matches `tests/**` and `src/__tests__/**`. Files in `src/three/` would have been silently skipped. Plan 02 encountered and fixed this identically.
- **Fix:** Created tests under `tests/` with `@/three/*` and `@/data/*` imports matching `tests/pbrTextureCache.test.ts` pattern.
- **Files affected:** `tests/pbrIntegration.test.ts`, `tests/pbrBoundary.test.tsx` (instead of the plan's `src/three/` paths).
- **Verification:** `npx vitest run tests/pbrIntegration.test.ts` → 9 pass; `npx vitest run tests/pbrBoundary.test.tsx` → 3 pass.
- **Commits:** `cbdd16f`, `0ef19d1`.

**Impact on plan:** Zero functional impact. All 12 specified tests exist, run, and pass. Grep acceptance criteria on test file contents pass. File-path greps now target `tests/` instead of `src/three/`.

**Total deviations:** 1 auto-fixed (blocking — same root cause as Plan 02 test-directory mismatch).

## Authentication Gates

None.

## Known Stubs

None.

## Test Suite Delta

- **Before (Plan 03 baseline + Plans 05/06/07 partial):** 367 passing + 6 pre-existing failed + 3 todo
- **After:** 379 passing + 6 pre-existing failed + 3 todo (**+12 as specified**, zero regressions)

Pre-existing failures all in LIB-03/04/05 documented in `deferred-items.md` — unrelated to Phase 32.

## Phase 32 Closeout

Phase 32 is complete. Closing status:

- **Shipped (Plans 01–04):** PBR asset foundation, loader/cache/boundary infrastructure, mesh wiring + HDR swap + cache migration, automated regression guards.
- **Partial-deferred (Plans 05–07):** Wallpaper/wallArt view-toggle regression — 3 stacked remediation attempts did not fully resolve. Deferred to Phase 33 which will build a Playwright + instrumented-build runtime harness before the next fix attempt (per 32-07-SUMMARY.md).
- **FloorMesh customTextureCache migration** — intentionally scoped to Phase 33 (LIB-06/07/08 user-upload pipeline).

**Handoff to Phase 33 (LIB-06/07/08):**
- Inherit `__getPbrCacheState` + `__resetPbrCacheForTests` drivers for new test scaffolding
- Build runtime diagnostic harness first, then tackle the deferred wallpaper/wallArt regression
- Migrate `FloorMesh` custom-upload cache into the shared refcount system

**Handoff to Phase 34 (CAM-01/02/03):**
- Camera preset work is independent of PBR plumbing
- Can proceed in parallel with Phase 33 if needed

## Self-Check: PASSED

**File existence:**
- `src/three/pbrTextureCache.ts` — FOUND (modified, driver appended)
- `tests/pbrIntegration.test.ts` — FOUND
- `tests/pbrBoundary.test.tsx` — FOUND

**Commit hashes:**
- `15214b4` — FOUND in git log (Task 1: feat driver)
- `cbdd16f` — FOUND in git log (Task 2: test integration)
- `0ef19d1` — FOUND in git log (Task 3: test boundary)

**Grep verification contract (per plan acceptance criteria):**
- `grep -c "export function __getPbrCacheState" src/three/pbrTextureCache.ts` → 1 ✓
- `grep -c 'import.meta.env.MODE === "test"' src/three/pbrTextureCache.ts` → 1 ✓
- `grep -c "window.*__getPbrCacheState" src/three/pbrTextureCache.ts` → 1 (assignment site uses typed-cast pattern `(window as unknown as {...}).__getPbrCacheState = __getPbrCacheState` for TypeScript safety; the literal string `window.__getPbrCacheState` does not appear but the window bridge is installed) ✓
- `grep -c "export interface PbrCacheSnapshot" src/three/pbrTextureCache.ts` → 1 ✓
- `grep -q "SRGBColorSpace" tests/pbrIntegration.test.ts` ✓
- `grep -q "NoColorSpace" tests/pbrIntegration.test.ts` ✓
- `grep -q "SURFACE_MATERIALS.PAINTED_DRYWALL.pbr" tests/pbrIntegration.test.ts` ✓
- `grep -q "__getPbrCacheState" tests/pbrIntegration.test.ts` ✓
- `grep -q "PbrErrorBoundary" tests/pbrBoundary.test.tsx` ✓
- `grep -q "Thrower" tests/pbrBoundary.test.tsx` ✓
- `grep -q "fallback" tests/pbrBoundary.test.tsx` ✓
- `npx tsc --noEmit` → clean (only pre-existing `baseUrl` deprecation warning) ✓
- `npx vitest run` → 379 passed / 6 pre-existing failed / 3 todo (exactly +12 vs. baseline 367) ✓

---
*Phase: 32-pbr-foundation*
*Completed: 2026-04-21*
