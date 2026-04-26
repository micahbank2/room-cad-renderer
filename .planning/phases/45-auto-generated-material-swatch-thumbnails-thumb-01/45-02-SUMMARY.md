---
phase: 45-auto-generated-material-swatch-thumbnails-thumb-01
plan: 02
subsystem: ui
tags: [react, swatch-picker, pbr-thumbnails, reduced-motion, vitest]

requires:
  - phase: 45-01
    provides: src/three/swatchThumbnailGenerator.ts (generateThumbnail / generateBatch / getThumbnail + "fallback" sentinel)
provides:
  - "MaterialThumbnail React component — host for the cached PBR thumbnail with placeholder + crossfade"
  - "SurfaceMaterialPicker swatches now render the actual material from the live PBR pipeline (closes THUMB-01)"
  - "Cache warm-up via generateBatch() on picker mount / surface change"
affects: [SurfaceMaterialPicker, FloorMaterialPicker (transitive), ceiling material picker (transitive)]

tech-stack:
  added: []
  patterns:
    - "Layered placeholder + crossfade: persistent solid-color <div> never unmounts; <img> overlay opacity-toggles in once dataURL is ready"
    - "Sentinel-driven UX: literal 'fallback' string from generator → component renders NO <img>, leaves the solid hex tile as the visible swatch (D-07)"
    - "Reduced-motion-aware Tailwind transition: duration-0 vs duration-150 swap via useReducedMotion() hook (D-39 / Phase 33)"
    - "Fire-and-forget cache warming: useEffect dispatches generateBatch(materials) per surface change; per-tile components own their own re-render lifecycle"

key-files:
  created:
    - src/components/MaterialThumbnail.tsx
    - tests/MaterialThumbnail.test.tsx
  modified:
    - src/components/SurfaceMaterialPicker.tsx

key-decisions:
  - "[Rule 1 fix] MaterialThumbnail uses Record-keyed lookup on SURFACE_MATERIALS (the production export shape) with array-fallback for the test mock — original PLAN.md action block assumed array-shape (would have thrown 'find is not a function' in production)"
  - "Picker useEffect adds .catch() on generateBatch — tests run in happy-dom (no WebGL); the cache simply stays empty and persistent placeholder tiles remain visible per D-06/D-07 design"
  - "Sentinel literal 'fallback' string-equality check honored verbatim from Plan 01 — defined as FALLBACK_SENTINEL constant in component for readability, value byte-identical to generator"

requirements-completed: [THUMB-01]

duration: ~9min
completed: 2026-04-25
---

# Phase 45 Plan 02: Wire MaterialThumbnail into SurfaceMaterialPicker (THUMB-01) Summary

**MaterialThumbnail React component reads from the Plan 01 cache, renders <img> with a reduced-motion-gated crossfade over a persistent hex-color placeholder, and SurfaceMaterialPicker warms the cache on mount — closes THUMB-01.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-04-25T20:32:00Z
- **Completed:** 2026-04-25T20:38:00Z
- **Tasks:** 3 (RED test, GREEN component, picker wiring)
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- 6/6 vitest cases GREEN for MaterialThumbnail (cached-dataURL render, fallback sentinel skip, cache-miss → generateThumbnail, reduced-motion ON/OFF duration class, persistent placeholder)
- Legacy `<div className="w-full aspect-square rounded-sm" style={{ backgroundColor: m.color }}>` swatch tile fully removed from SurfaceMaterialPicker
- `<MaterialThumbnail materialId={m.id} fallbackColor={m.color} />` renders inside the existing button/ring/active-state markup — selected-state ring + click handler untouched
- `generateBatch(materials)` fires from a `useEffect([materials])` to warm the cache for every visible swatch on mount + surface change
- Reduced-motion guard verified — `duration-150` ↔ `duration-0` swap on the same `<img>` via `useReducedMotion()` (D-39)
- Full vitest baseline preserved: 6 pre-existing failures (same 6 listed in `deferred-items.md`, all in `SaveIndicator` / `AddProductModal` / `SidebarProductPicker` / `productStore`), zero new failures introduced
- `npx tsc --noEmit` clean for new code (only the pre-existing tsconfig `baseUrl` deprecation warning persists)

## Task Commits

1. **Task 1: Failing vitest (RED)** — `f085c59` (test) — 6 cases stubbed, file fails to resolve `MaterialThumbnail` import
2. **Task 2: Build MaterialThumbnail component (GREEN)** — `74c5692` (feat) — 75-line component, all 6 tests pass
3. **Task 3: Wire SurfaceMaterialPicker → MaterialThumbnail (closes THUMB-01)** — `2e590f8` (feat) — picker imports + useEffect + JSX swap, includes Rule 1 auto-fix on MaterialThumbnail (Record lookup)

**Plan metadata commit:** [pending — final docs commit]

## MaterialThumbnail Public Prop Surface (as built)

```typescript
interface Props {
  materialId: string;     // cache key — looked up in SURFACE_MATERIALS by id
  fallbackColor: string;  // hex string — shown as persistent placeholder + on "fallback" sentinel
}
```

Render shape (D-06 / D-07 / D-09 / D-39):

```
<div className="relative w-full aspect-square rounded-sm overflow-hidden">
  <div className="absolute inset-0 rounded-sm"
       style={{ backgroundColor: fallbackColor }} />     ← always present
  {dataURL && (
    <img src={dataURL} alt=""
         className="absolute inset-0 w-full h-full object-cover rounded-sm
                    transition-opacity {duration-0|duration-150} opacity-100" />
  )}
</div>
```

## Exact Edits to SurfaceMaterialPicker.tsx

| Edit | Location | Change |
|------|----------|--------|
| 1 | Line 1 | `import { useState }` → `import { useEffect, useState }` |
| 2 | Lines 6-7 (added) | `import { generateBatch } from "@/three/swatchThumbnailGenerator";` and `import { MaterialThumbnail } from "@/components/MaterialThumbnail";` |
| 3 | After line 30 (added useEffect) | `useEffect(() => { generateBatch(materials).catch(() => {}); }, [materials]);` — fires the cache warm-up + swallow guard for WebGL-less envs |
| 4 | Lines 47-50 (replaced) | Removed `<div className="w-full aspect-square rounded-sm" style={{ backgroundColor: m.color }} />` → replaced with `<MaterialThumbnail materialId={m.id} fallbackColor={m.color} />` |

The surrounding `<button>` (with `p-1 rounded-sm border` + active ring class) and the `<span>` label below the swatch are unchanged.

## Decisions Made

- **Record lookup not array find.** PLAN.md action block sketched `SURFACE_MATERIALS.find((m) => m.id === materialId)` but the production export is `Record<string, SurfaceMaterial>` keyed by id. Component uses a runtime `Array.isArray(catalog)` branch so production hits the O(1) record lookup and the test mock (array-shaped) still resolves. See Deviations.
- **`.catch()` on `generateBatch`** in the picker. Without a guard, happy-dom test runs that mount any picker-containing component (App.restore, phase31*, snap*) emit unhandled rejections from THREE.WebGLRenderer construction failure. The catch is purely defensive — the cache stays empty and `MaterialThumbnail` already renders its persistent solid-color placeholder per D-06.
- **Sentinel as named constant** (`FALLBACK_SENTINEL = "fallback"`) inside the component. Plan 01 defines the same literal in the generator; component-side constant improves readability without coupling — string-equality is the contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SURFACE_MATERIALS is a Record, not an array**
- **Found during:** Task 3 verification (`npx vitest run` against the post-wiring picker — App-rendering suites broke with `TypeError: SURFACE_MATERIALS.find is not a function` + 39 test failures all chaining "Should not already be working")
- **Issue:** PLAN.md action block sketch assumed `SURFACE_MATERIALS` was a `SurfaceMaterial[]` and called `.find()`. Production `src/data/surfaceMaterials.ts` line 31 declares `export const SURFACE_MATERIALS: Record<string, SurfaceMaterial> = { ... }` — Records have no `.find` method.
- **Fix:** Component reads `SURFACE_MATERIALS as unknown` then branches on `Array.isArray(catalog)` — production path uses `(catalog as Record<...>)[materialId]`, test mock path uses array `.find`. Both paths typed back to `SurfaceMaterial | undefined`.
- **Files modified:** `src/components/MaterialThumbnail.tsx` (lines 4 + 42-49)
- **Verification:** Full `npx vitest run` test failure count returns to baseline (6 fails — exactly the 6 pre-existing failures listed in `deferred-items.md`); the previously-broken App-rendering suites (`phase31Resize`, `phase31LabelOverride`, `phase31Undo`, `pickerMyTexturesIntegration`, `snapIntegration`, `App.restore`) all back to GREEN.
- **Committed in:** `2e590f8` (bundled with Task 3 — same root cause discovered and fixed in the same commit cycle)

**2. [Rule 2 - Critical] generateBatch unhandled rejection in WebGL-less envs**
- **Found during:** Task 3 verification (after fix #1 above; tests passed but ~280 unhandled errors of `THREE.WebGLRenderer: Error creating WebGL context.` still polluted output)
- **Issue:** `generateBatch(materials)` in the picker's useEffect is fire-and-forget; without `.catch`, async rejection from inside `generateThumbnail` (when `ensureRenderer()` throws on no-WebGL) bubbles as unhandledrejection in test logs.
- **Fix:** Single `.catch(() => {})` on the `generateBatch(...)` call in the picker useEffect. Production behavior unchanged (real browsers have WebGL); test logs cleaner; placeholder tiles already cover the "no thumbnails generated" UX per D-06/D-07.
- **Files modified:** `src/components/SurfaceMaterialPicker.tsx` (lines 32-39)
- **Verification:** Same full-suite test count (6 baseline failures); unhandled rejection log noise reduced.
- **Committed in:** `2e590f8`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 defensive-hardening). Both rooted in PLAN.md action-block sketches that didn't perfectly match the production code surface — neither changed scope or signatures.
**Impact on plan:** Zero scope creep. Component prop signature, picker call site, and acceptance criteria all land verbatim. Both fixes are localized and aligned with Phase 45's stated D-06/D-07 fallback contracts.

## Issues Encountered

- **Pre-existing test failures (out of scope, baseline):** 4 files / 6 tests in `SaveIndicator`, `AddProductModal`, `SidebarProductPicker`, `productStore`. Identical to Plan 01 baseline — verified by stash-revert before Rule 1 fix that the same 6 failures persist.
- **Pre-existing tsconfig deprecation:** `tsconfig.json(17,5): error TS5101 Option 'baseUrl' is deprecated`. Same as Plan 01. New code is type-clean.
- **happy-dom WebGL noise:** ~280 console.error logs from THREE during App-rendering tests. Suppressed at test-call-site via `.catch()`. No test failures.

## Deferred Issues

None new. The 6 pre-existing baseline failures remain in `deferred-items.md`.

## Known Stubs

None. Every swatch in every picker that uses `SurfaceMaterialPicker` (FloorMaterialPicker for floors, ceiling material picker via Properties panel) now renders through the live cache + generator pipeline. No mock data, no placeholder text, no "coming soon".

## Manual Dev-Server Verification (D-12)

The visual-correctness arbiter per VALIDATION.md "Manual-Only Verifications". To run:

1. `npm run dev`
2. Open the floor material picker (Properties panel → floor surface)
3. **Expected first-mount:** hex placeholder tiles flash for <200ms, then crossfade to rendered PBR thumbnails (per RESEARCH.md target)
4. Switch the active surface (floor → ceiling) and back to floor:
   - **Expected:** ceiling thumbnails appear nearly-instant (cache populated by ceiling picker mount), floor reload is also instant from cache
5. Check `CONCRETE` / `PLASTER` / `WOOD_PLANK` (the 3 materials with PBR maps): tiles show actual texture detail under studio light
6. Check the 8 flat-color materials (WOOD_OAK, WOOD_WALNUT, TILE_WHITE, TILE_BLACK, CARPET, MARBLE, STONE, PAINTED_DRYWALL): tiles show lit color planes from the same studio rig (not flat hex paint chips)
7. macOS System Settings → Accessibility → Reduce Motion = ON → reload picker → thumbnails appear with NO crossfade (snap-in)

## HUMAN-UAT Prompt for Jessica

> "Open the floor picker — do all 11 swatches look like the materials they apply (e.g., concrete looks gray-grainy, oak looks brown-wood, marble looks white-veiny), or do any look mismatched / blurry / wrong?"

If any swatch looks wrong, capture which material id + what was expected, then file a follow-up issue against `src/three/swatchThumbnailGenerator.ts` (renderer config) — not against this plan, which only wires the host UI.

## Next Phase Readiness

- THUMB-01 closed. No follow-up plans expected for this requirement.
- Phase 46 (TREE-01: Rooms hierarchy sidebar tree) is the next v1.11 phase per STATE.md.
- No blockers. No external service config needed.

## Self-Check: PASSED

- `src/components/MaterialThumbnail.tsx` — FOUND
- `tests/MaterialThumbnail.test.tsx` — FOUND
- `src/components/SurfaceMaterialPicker.tsx` — modified (legacy `<div style={{backgroundColor: m.color}}>` removed; `<MaterialThumbnail/>` + `generateBatch` useEffect present)
- Commit `f085c59` (Task 1 RED) — FOUND
- Commit `74c5692` (Task 2 GREEN) — FOUND
- Commit `2e590f8` (Task 3 wire + Rule 1+2 fixes) — FOUND
- Vitest 12/12 GREEN on the new + Plan 01 test files
- Full suite at 6 baseline failures — zero new regressions
- All grep acceptance checks satisfied (imports, JSX call site, useEffect, sentinel literal, duration classes, no off-scale spacing)

---
*Phase: 45-auto-generated-material-swatch-thumbnails-thumb-01*
*Plan: 02*
*Completed: 2026-04-25*
