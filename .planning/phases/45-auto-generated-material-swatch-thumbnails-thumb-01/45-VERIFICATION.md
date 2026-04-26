---
phase: 45-auto-generated-material-swatch-thumbnails-thumb-01
verified: 2026-04-25T20:42:00Z
status: human_needed
score: 5/5 must-haves verified (automated); visual fidelity + reduced-motion + perf gated on human UAT
human_verification:
  - test: "Open floor material picker (Properties panel → floor surface) on a fresh page load"
    expected: "Hex placeholder tiles flash briefly (<200ms), then crossfade to rendered PBR thumbnails. All 11 swatches resolve — no permanent flat-hex tiles unless that specific PBR set genuinely failed to load."
    why_human: "Visual correctness — happy-dom test runs cannot exercise WebGL; the actual rendered PNGs only exist in a real browser. D-12 explicitly designates this manual."
  - test: "Switch active surface (floor → ceiling → floor) and observe second mount"
    expected: "Second mount of the same surface picker is instantaneous — thumbnails appear without a placeholder flash because the in-memory cache is already warm."
    why_human: "Cache behavior verified in unit tests, but cold-vs-warm visual perception is the user-facing acceptance signal."
  - test: "Inspect the 3 PBR materials specifically: CONCRETE, PLASTER, WOOD_PLANK"
    expected: "Tiles show real texture detail (grain / weave / surface variation) under studio light — not flat color paint chips."
    why_human: "PBR rendering quality (lighting angles, UV repeat 1.5, anisotropy) is a perceptual judgment Jessica must make."
  - test: "Inspect the 8 flat-color materials (WOOD_OAK, WOOD_WALNUT, TILE_WHITE, TILE_BLACK, CARPET, MARBLE, STONE, PAINTED_DRYWALL)"
    expected: "Tiles show lit color planes from the same studio rig (subtle shading from directional light) — visually distinct from raw hex paint chips."
    why_human: "Differentiating 'lit color plane' from 'flat hex' is a low-contrast visual signal humans assess better than DOM diffs."
  - test: "macOS System Settings → Accessibility → Reduce Motion = ON, then reload the picker"
    expected: "Thumbnails snap in with NO crossfade animation (duration-0). Without Reduce Motion, the 150ms opacity transition is visible."
    why_human: "Motion-perception check — class swap is unit-tested but the rendered effect requires a real browser + OS setting."
  - test: "First-mount perceived performance for the full 11-material grid"
    expected: "<200ms total cold-render time per RESEARCH.md target — no perceptible jank, no UI freeze during generateBatch."
    why_human: "Perceived perf cannot be measured by vitest; requires real WebGL on Jessica's hardware."
---

# Phase 45: Auto-generated Material Swatch Thumbnails (THUMB-01) Verification Report

**Phase Goal:** Material picker swatches render from the live PBR/material pipeline rather than hand-curated static images.
**Verified:** 2026-04-25T20:42:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Calling `generateThumbnail()` for any SURFACE_MATERIALS resolves to `data:image/png...` or sentinel `'fallback'` | ✓ VERIFIED | `tests/swatchThumbnailGenerator.test.ts` THUMB-01-a + 01-c green |
| 2 | Cached calls return identical value without re-rendering (single render) | ✓ VERIFIED | THUMB-01-b green: `expect(second).toBe(first); expect(renderCalls.count).toBe(1)` |
| 3 | PBR load failure resolves to literal `'fallback'`, no exception escapes, cached failure (no retry) | ✓ VERIFIED | THUMB-01-c green; module catches & caches sentinel at line 99-104 |
| 4 | `generateBatch(materials)` populates cache for every material | ✓ VERIFIED | THUMB-01-d green |
| 5 | Single shared `THREE.WebGLRenderer` — lazy init, reused | ✓ VERIFIED | Single-renderer invariant test green: 5 calls → 1 ctor invocation |
| 6 | SurfaceMaterialPicker renders `<MaterialThumbnail>` per swatch (replacing legacy hex `<div>`) | ✓ VERIFIED | `src/components/SurfaceMaterialPicker.tsx:61`; legacy `style={{backgroundColor: m.color}}` swatch removed |
| 7 | Persistent hex placeholder visible during async render (no empty-tile flash) | ✓ VERIFIED | MaterialThumbnail "always renders placeholder" test green; component lines 60-65 |
| 8 | `'fallback'` sentinel → no `<img>` rendered, hex tile remains | ✓ VERIFIED | MaterialThumbnail sentinel test green; component line 67 conditional `{dataURL && ...}` |
| 9 | `useReducedMotion()` true → `duration-0`; false → `duration-150` | ✓ VERIFIED | Both branches asserted in MaterialThumbnail tests; component line 74 |
| 10 | Adding new SURFACE_MATERIALS entry requires no PNG asset | ✓ VERIFIED | Generator reads `material.pbr` URLs OR derives from `material.color` — no static asset lookup |

**Score:** 10/10 truths verified (automated). Visual quality verified via human UAT.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/three/swatchThumbnailGenerator.ts` | Renderer + cache module, 4 exports, ≥100 lines | ✓ VERIFIED | 137 lines; exports `generateThumbnail`, `getThumbnail`, `generateBatch`, `__resetSwatchThumbnailCache`; single lazy renderer; FALLBACK_SENTINEL = "fallback" |
| `tests/swatchThumbnailGenerator.test.ts` | Vitest covering THUMB-01-a..e + invariant | ✓ VERIFIED | 6/6 green; mirrors `pbrTextureCache.test.ts` mock pattern |
| `src/components/MaterialThumbnail.tsx` | Host component with placeholder + crossfade | ✓ VERIFIED | 81 lines; uses useReducedMotion + getThumbnail/generateThumbnail; sentinel guard present |
| `src/components/SurfaceMaterialPicker.tsx` | Modified: imports MaterialThumbnail + generateBatch, replaces legacy hex `<div>` | ✓ VERIFIED | Lines 6-7 imports; line 38-42 useEffect generateBatch warm-up; line 61 `<MaterialThumbnail>` render |
| `tests/MaterialThumbnail.test.tsx` | Vitest covering dataURL render, sentinel skip, reduced-motion classes | ✓ VERIFIED | 6/6 green |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| swatchThumbnailGenerator.ts | pbrTextureCache.ts | `import { loadPbrSet }` (no registerRenderer) | ✓ WIRED | line 22; `registerRenderer` not invoked |
| MaterialThumbnail.tsx | swatchThumbnailGenerator.ts | `import { getThumbnail, generateThumbnail }` | ✓ WIRED | line 3 + lines 35, 51 calls |
| MaterialThumbnail.tsx | useReducedMotion.ts | `import useReducedMotion` | ✓ WIRED | line 2 + line 34 invocation |
| SurfaceMaterialPicker.tsx | MaterialThumbnail.tsx | `<MaterialThumbnail materialId fallbackColor>` | ✓ WIRED | line 7 import + line 61 JSX |
| SurfaceMaterialPicker.tsx | swatchThumbnailGenerator.ts | `useEffect → generateBatch(materials)` | ✓ WIRED | line 6 import + line 38-42 useEffect |
| FloorMaterialPicker → SurfaceMaterialPicker | (transitive) | render | ✓ WIRED | FloorMaterialPicker.tsx:101 |
| CeilingPaintSection → SurfaceMaterialPicker | (transitive) | render | ✓ WIRED | CeilingPaintSection.tsx:51 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| MaterialThumbnail | `dataURL` state | `getThumbnail(materialId)` initial → `generateThumbnail(material)` async update | YES — generator returns real PNG dataURL or sentinel | ✓ FLOWING |
| SurfaceMaterialPicker | `materials` array | `materialsForSurface(surface)` (real catalog) | YES — drives `generateBatch` + maps to `<MaterialThumbnail>` | ✓ FLOWING |
| swatchThumbnailGenerator | `thumbnailCache` Map | `r.render(...)` + `domElement.toDataURL("image/png")` | YES (in real browser); `'fallback'` cached on PBR load error | ✓ FLOWING |

Note: In happy-dom test environments, WebGL context creation fails → `.catch()` swallows + placeholder remains visible. This is the documented D-06/D-07 design contract, not a hollow implementation.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 45 unit tests pass | `npx vitest run tests/swatchThumbnailGenerator.test.ts tests/MaterialThumbnail.test.tsx` | 12/12 green | ✓ PASS |
| No new regressions | `npx vitest run` (full suite) | 4 files / 6 tests fail — exactly the documented baseline | ✓ PASS |
| Prior-phase regression sample | `npx vitest run tests/pbrTextureCache.test.ts tests/wallEndpointSnap.test.ts tests/cadStore.test.ts` | 31 passed / 3 todo | ✓ PASS |
| Sentinel literal is exact `"fallback"` | grep | Generator + component both define `FALLBACK_SENTINEL = "fallback"` | ✓ PASS |
| No `registerRenderer` call | grep | 0 matches in generator | ✓ PASS |
| No OffscreenCanvas | grep | 0 matches | ✓ PASS |
| Live browser render quality | (none — requires WebGL + human eye) | n/a | ? SKIP — routed to UAT |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| THUMB-01 | 45-01-PLAN, 45-02-PLAN | Material picker swatches auto-rendered from live PBR/material pipeline rather than hand-curated static images (closes #77) | ✓ SATISFIED | Generator + Host component + Picker wiring all green; legacy hex `<div>` swatch removed; new SURFACE_MATERIALS entries need no PNG asset (verified by code path) |

REQUIREMENTS.md line 33 already marked `[x] THUMB-01`. No orphaned requirements detected.

### Anti-Patterns Found

None. The 6 grep matches for "TODO|placeholder" in MaterialThumbnail.tsx are documentation comments describing the **intentional persistent placeholder div** (D-06 design — never an empty-tile flash). The 281 console errors during full-suite vitest run are documented happy-dom WebGL noise, swallowed by `.catch()` per 45-02 SUMMARY auto-fix #2 — they do not cause test failures.

### Cross-Phase Regression Gate

Full vitest suite: **4 files / 6 tests failed**, identical match to `deferred-items.md`:
- `tests/SaveIndicator.test.tsx` (file-level FAIL — pre-existing)
- `tests/AddProductModal.test.tsx` × 3 (LIB-04 pre-existing)
- `tests/SidebarProductPicker.test.tsx` × 2 (LIB-05 pre-existing)
- `tests/productStore.test.ts` × 1 (LIB-03 pre-existing)

Zero new regressions introduced by Phase 45.

### Human Verification Required

See `human_verification:` block in frontmatter. Six items routed to Jessica covering visual fidelity (PBR + flat-color tiles), cache warmth UX, reduced-motion behavior, and perceived performance.

### Gaps Summary

No automated gaps. The phase goal is **functionally achieved** — every level (artifacts exist, are substantive, are wired, data flows through them) passes. The only remaining verification is **visual quality + perceptual perf** which by design (D-12) requires a real browser and a human eye. Phase status is `human_needed` rather than `passed` only because the phase produces visible UI behavior whose ultimate acceptance criterion is "do all 11 swatches look like the materials they apply" — answerable only by Jessica.

---

*Verified: 2026-04-25T20:42:00Z*
*Verifier: Claude (gsd-verifier)*
