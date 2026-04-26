---
phase: 45-auto-generated-material-swatch-thumbnails-thumb-01
plan: 01
subsystem: ui
tags: [three.js, webgl, pbr, thumbnail-cache, vitest]

requires:
  - phase: prior
    provides: src/three/pbrTextureCache.ts (loadPbrSet for shared PBR texture loading + caching)
provides:
  - "Offscreen WebGL thumbnail generation engine for material swatches"
  - "Single shared lazy WebGLRenderer + studio-lit scene + plane mesh"
  - "In-memory thumbnail cache keyed by material.id with literal 'fallback' sentinel on PBR load failure"
  - "Public API: generateThumbnail / generateBatch / getThumbnail / __resetSwatchThumbnailCache"
affects: [45-02, SurfaceMaterialPicker, plan-02-ui-wiring]

tech-stack:
  added: []
  patterns:
    - "Lazy module-level renderer singleton (single WebGLRenderer reused across all material renders)"
    - "Sentinel-string failure mode (literal 'fallback') instead of throwing — UI consumer detects via string equality"
    - "Sequential generateBatch (for...of await) to avoid concurrent WebGL render contention"

key-files:
  created:
    - src/three/swatchThumbnailGenerator.ts
    - tests/swatchThumbnailGenerator.test.ts
  modified: []

key-decisions:
  - "Test-only vi.resetModules() scoped to single-renderer-invariant case (planner-hinted in PLAN action block) — production __resetSwatchThumbnailCache stays cache-only; renderer singleton intentionally persists across cache resets"
  - "Honored RESEARCH.md design tokens verbatim: directional 1.5 + ambient 0.4 + rim 0.3, camera (0.6, 0.6, 1.2), UV repeat 1.5, 128px thumbnail size"

patterns-established:
  - "Sentinel-string failure: domain modules return literal '<sentinel>' string instead of throwing when consumer behavior is to render an alternative tile rather than catch+log"
  - "TDD vi.mock('three', async () => { const actual = await vi.importActual<typeof import('three')>('three'); ... }) pattern (mirrors tests/pbrTextureCache.test.ts)"

requirements-completed: [THUMB-01]

duration: ~10min
completed: 2026-04-25
---

# Phase 45 Plan 01: Auto-generated Material Swatch Thumbnails (THUMB-01) Summary

**Offscreen Three.js renderer + in-memory cache that generates per-material PBR thumbnails (lazy single WebGLRenderer, studio lighting, literal 'fallback' sentinel on texture load failure)**

## Performance

- **Duration:** ~10 min (Task 1 already committed b53d7fc as RED step; Task 2 implementation on disk uncommitted at handoff)
- **Started:** 2026-04-26T00:24:00Z (resumed)
- **Completed:** 2026-04-26T00:30:00Z
- **Tasks:** 2 (Task 1 RED test, Task 2 GREEN implementation)
- **Files modified:** 2 (1 created, 1 created — both new to repo)

## Accomplishments

- Built offscreen WebGL thumbnail generator with single lazy `THREE.WebGLRenderer` singleton
- Studio-lit scene (directional 1.5 + ambient 0.4 + rim 0.3) on plane mesh, camera at (0.6, 0.6, 1.2)
- In-memory cache keyed by `material.id` with cached failure sentinel (`"fallback"`) — no retries on broken PBR URLs
- Sequential `generateBatch()` to avoid 11-way concurrent GPU contention
- 6/6 vitest cases GREEN covering THUMB-01-a..e plus single-renderer invariant

## Task Commits

1. **Task 1: Failing vitest (RED)** — `b53d7fc` (test) — landed in prior session
2. **Task 2: Implement swatchThumbnailGenerator (GREEN)** — `d05c272` (feat) — includes a 1-line test fix (vi.resetModules + ctor counter reset) inside the single-renderer-invariant test, per PLAN action block hint

**Plan metadata:** [pending] (docs: complete plan)

## Public API Surface (as built)

Plan 02 must import these exact signatures from `@/three/swatchThumbnailGenerator`:

```typescript
export async function generateThumbnail(material: SurfaceMaterial): Promise<string>;
export function getThumbnail(materialId: string): string | undefined;
export async function generateBatch(materials: SurfaceMaterial[]): Promise<void>;
export function __resetSwatchThumbnailCache(): void; // test-only
```

Sentinel constant value (literal — Plan 02 component does string equality):
```typescript
const FALLBACK_SENTINEL = "fallback";
```

Test-mode window globals (gated by `import.meta.env.MODE === "test"`):
- `window.__resetSwatchThumbnailCache()`
- `window.__getMaterialThumbnail(id: string): string | undefined`

## Renderer Config Values Landed

| Token | Value | Source |
|-------|-------|--------|
| `THUMB_SIZE` | 128 px | RESEARCH.md |
| `UV_REPEAT` | 1.5 | RESEARCH.md (1–2 tile repeats visible at swatch size) |
| Directional light | intensity 1.5, position (2, 2, 1.5) | D-05 |
| Ambient light | intensity 0.4, white | D-05 |
| Rim light | intensity 0.3, position (-1, 0.5, -1) | D-05 |
| Camera | PerspectiveCamera fov=45, position (0.6, 0.6, 1.2), lookAt origin | D-05 |
| Background | transparent (`setClearColor(0x000000, 0)`) | D-05 |
| `outputColorSpace` | `THREE.SRGBColorSpace` | matches main viewport |
| Material metalness | 0 | flat + PBR paths |

## Files Created/Modified

- `src/three/swatchThumbnailGenerator.ts` — offscreen renderer + cache + 4 public exports + 1 test helper (137 lines)
- `tests/swatchThumbnailGenerator.test.ts` — 6 vitest cases (THUMB-01-a..e + single-renderer invariant), `vi.mock("three", …)` mirroring `tests/pbrTextureCache.test.ts`

## Decisions Made

- **Production `__resetSwatchThumbnailCache` is cache-only.** It does NOT reset the renderer singleton. The single-renderer invariant test uses `vi.resetModules()` + manual ctor counter reset (planner hint in PLAN.md action block). This keeps production scope minimal — Plan 02 / app code never needs to recreate the renderer.
- **All design tokens (lighting, camera, UV repeat) taken verbatim from RESEARCH.md / PLAN.md action block.** Zero deviation — these are locked design values.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Single-renderer-invariant test required vi.resetModules() in test 6**
- **Found during:** Task 2 GREEN verification (initial 5/6 pass, test 6 failed with `expected +0 to be 1`)
- **Issue:** `rendererCtorCalls.count` reset in `beforeEach` is 0 by the time test 6 runs because the renderer module-level singleton was created during a prior test. `ensureRenderer()` short-circuits and the mock ctor is never called again, so the assertion `rendererCtorCalls.count === 1` always fails.
- **Fix:** Added 4 lines at the top of test 6 — `vi.resetModules()`, reset both counters, re-import the module, re-call `__resetSwatchThumbnailCache()`. PLAN.md action block explicitly anticipated this: "Use `vi.resetModules()` if needed between cases that test renderer-init invariants."
- **Files modified:** `tests/swatchThumbnailGenerator.test.ts` (lines 144-152 of the updated file)
- **Verification:** `npx vitest run tests/swatchThumbnailGenerator.test.ts` → 6/6 GREEN
- **Committed in:** `d05c272` (Task 2 commit, bundled with the feature commit since the planner-hinted fix is test-side scaffolding for the new module)

---

**Total deviations:** 1 auto-fixed (1 blocking — test scaffolding gap)
**Impact on plan:** Zero scope creep. Production module signatures + behavior land exactly as specified. Fix lives in test code only.

## Issues Encountered

- **Pre-existing test failures (out of scope):** Full vitest run shows 4 failed files / 6 failed tests in `SaveIndicator`, `AddProductModal`, `SidebarProductPicker`, `productStore`, `App.restore`. Verified by stashing 45-01 work and re-running — failures persist on the unmodified base. Tracked at `.planning/phases/45-auto-generated-material-swatch-thumbnails-thumb-01/deferred-items.md`. None of these test files import `swatchThumbnailGenerator` or `pbrTextureCache`.
- **Pre-existing tsc deprecation:** `tsconfig.json(17,5): error TS5101: Option 'baseUrl' is deprecated`. Unrelated to this plan; the new module is type-clean.

## Deferred Issues

See `.planning/phases/45-auto-generated-material-swatch-thumbnails-thumb-01/deferred-items.md` for the 6 pre-existing vitest failures verified to be base-state (not caused by 45-01).

## Known Stubs

None. The module is fully wired — `generateThumbnail` produces real data URLs (or the documented `"fallback"` sentinel), `generateBatch` populates the cache for all inputs, `getThumbnail` reads from the live cache.

The wider feature (visible swatch tiles in the picker UI) is intentionally deferred to Plan 02 — that's the planned scope split, not a stub. Plan 02 imports this module's public API.

## Next Phase Readiness

- Plan 02 (`45-02`) can now import the four public exports and wire them into `SurfaceMaterialPicker`. The literal `"fallback"` string equality check is the contract.
- No blockers. No external service config needed.

## Self-Check: PASSED

- `src/three/swatchThumbnailGenerator.ts` — FOUND
- `tests/swatchThumbnailGenerator.test.ts` — FOUND
- Commit `b53d7fc` (Task 1 RED) — FOUND
- Commit `d05c272` (Task 2 GREEN) — FOUND
- Vitest 6/6 GREEN on the new test file
- All 14 acceptance grep checks from PLAN.md Task 2 satisfied (verified via implementation match to action-block code)

---
*Phase: 45-auto-generated-material-swatch-thumbnails-thumb-01*
*Plan: 01*
*Completed: 2026-04-25*
