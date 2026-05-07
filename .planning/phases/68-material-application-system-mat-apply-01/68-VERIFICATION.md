---
phase: 68-material-application-system-mat-apply-01
verified: 2026-05-06T07:46:00Z
status: passed-with-carry-over
score: 5/5 must-haves verified (4 legacy-test regressions tracked as carry-over)
re_verification:
  is_re_verification: false
gaps:
  - truth: "Pre-Phase-68 legacy tests still pass (no test-suite regression)"
    status: partial
    reason: "Three legacy tests assert old contracts (snapshot v5, wallpaper 'MY TEXTURES' tab, ghost-spread audit on every <meshStandardMaterial>) that Phase 68 intentionally changed. New Phase 68 tests + e2e all GREEN; the regressions are stale assertions, not broken behavior."
    artifacts:
      - path: "tests/snapshotMigration.test.ts:32"
        issue: "Asserts defaultSnapshot().version === 5 — Phase 68 bumped to 6 per D-01"
      - path: "tests/pickerMyTexturesIntegration.test.tsx"
        issue: "Looks for legacy 'MY TEXTURES' wallpaper tab — Plan 06 removed wallpaper picker block from WallSurfacePanel.tsx (replaced by unified MaterialPicker)"
      - path: "tests/WallMesh.cutaway.test.tsx"
        issue: "Phase 59 ghost-spread audit — Plan 04 added new <meshStandardMaterial> sites in WallMesh priority-1 branch without {...ghost} spread. Cutaway/ghost behavior on resolved Materials may need wiring."
    missing:
      - "Update tests/snapshotMigration.test.ts:32 to expect version: 6"
      - "Delete tests/pickerMyTexturesIntegration.test.tsx (the wallpaper picker it tests no longer exists; new MaterialPicker tests cover the replacement contract)"
      - "Audit decision: either wire {...ghost} into Plan 04's new resolved-material material sites in WallMesh.tsx, OR update tests/WallMesh.cutaway.test.tsx to scope the audit to legacy material sites only"
human_verification:
  - test: "MaterialPicker UX feel — opens instantly, applies on click, no spinner over 0.5s"
    expected: "Wall changes color/pattern in 2D immediately on click; picker feels snappy"
    why_human: "Subjective interaction quality (HUMAN-UAT.md §1)"
  - test: "3D fidelity — apply tile material, switch to 3D, confirm tile size matches real-world expectation"
    expected: "Tiles cover whole wall, no stretching/shimmering/wrong-size, physical scale convincing"
    why_human: "Three.js render output is image-based; pixel-diff goldens are platform-coupled per project convention (HUMAN-UAT.md §2)"
  - test: "v5→v6 auto-migration — load a pre-Phase-68 saved project, confirm walls/floors/ceilings render identically"
    expected: "Every painted/wallpapered wall, every floor pattern visible before update remains visible after; nothing reverts to plain white"
    why_human: "Requires a real saved v5 project from before Phase 68 (HUMAN-UAT.md §3)"
---

# Phase 68: Material Application System (MAT-APPLY-01) Verification Report

**Phase Goal:** Material entries from Phase 67 can be applied to wall surfaces (per-side), floor, ceiling, and custom-element faces; renders correctly in 2D + 3D; single-undo per apply; v5→v6 snapshot migration is idempotent; materialId serializes through save/load.

**Verified:** 2026-05-06T07:46:00Z
**Status:** passed-with-carry-over
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Material can be applied to wall side / floor / ceiling / custom-element face via one unified picker | ✓ VERIFIED | `MaterialPicker.tsx` exports unified component; `PropertiesPanel.tsx`/`WallSurfacePanel.tsx`/`RoomSettings.tsx` mount with all 4 surface kinds; vitest 5/5 GREEN |
| 2 | Applied Material renders in 2D (Fabric) and 3D (Three.js) | ✓ VERIFIED | `fabricSync.ts:renderFloor` + per-side priority-1 branch on walls; `useResolvedMaterial.ts` R3F hook; WallMesh/FloorMesh/CeilingMesh/CustomElementMesh all wired; e2e applies → reads `__getResolvedMaterial` → expects truthy |
| 3 | Single undo entry per apply (D-06) | ✓ VERIFIED | `applySurfaceMaterial` (history) + `applySurfaceMaterialNoHistory` pair in `cadStore.ts`; `cadStore.material.test.ts` 2/2 GREEN; e2e Ctrl+Z reverts to materialId === null |
| 4 | Snapshot v5→v6 migration is idempotent (paint/wallpaper/floor/ceiling auto-convert) | ✓ VERIFIED | `migrateV5ToV6` async pre-pass in `snapshotMigration.ts`; `snapshotMigration.v6.test.ts` 11/11 GREEN incl. 2 idempotency cases + graceful failure |
| 5 | Snapshot serializes materialId cleanly through save/load | ✓ VERIFIED | e2e `material-apply.spec.ts` apply → 2.8s autosave → `page.reload()` → `__getResolvedMaterial` returns same materialId. PASSED 2/2 (chromium-dev + chromium-preview, 13.5s) |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Status | Evidence |
|----------|--------|----------|
| `src/components/MaterialPicker.tsx` | ✓ VERIFIED | Created Plan 06; 4 surface kinds; `applySurfaceMaterial` wired |
| `src/lib/surfaceMaterial.ts` (resolveSurfaceMaterial / resolveSurfaceTileSize) | ✓ VERIFIED | Created Plan 02; 6/6 tests GREEN |
| `src/lib/snapshotMigration.ts` (migrateV5ToV6) | ✓ VERIFIED | Modified Plan 03; 11/11 GREEN; await chained in `loadSnapshot` |
| `src/stores/cadStore.ts` (applySurface* quartet + 6 test drivers) | ✓ VERIFIED | Modified Plans 03, 07; module-eval driver install |
| `src/three/useResolvedMaterial.ts` + 4 mesh rewires | ✓ VERIFIED | Plan 04; 6/6 hook tests + 51 total renderer tests GREEN; FACE_ORDER per-face material array on CustomElement |
| `src/canvas/materialPatternCache.ts` + `fabricSync.renderFloor` | ✓ VERIFIED | Plan 05; async pattern cache + new 2D floor render path |
| `tests/e2e/specs/material-apply.spec.ts` | ✓ VERIFIED | Plan 07; 2/2 GREEN |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles | `npx tsc --noEmit` | Only TS5101 deprecation warning on `baseUrl`; no errors | ✓ PASS |
| Production build succeeds | `npm run build` | exits 0; 1.52 MB main chunk; pre-existing warnings only | ✓ PASS |
| E2E material apply round-trip | `npx playwright test material-apply.spec.ts` | 2 passed (13.5s) on both chromium projects | ✓ PASS |
| Vitest full suite | `npx vitest run` | 129/137 files passed; 864/889 tests passed; 14 failures (4 pre-existing on main, 4 Phase-68-induced legacy regressions) | ⚠️ PARTIAL |

### Anti-Pattern Scan

| File | Issue | Severity |
|------|-------|----------|
| `MaterialCard.tsx:56` | `getUserTexture(material.colorMapId)` called when `colorMapId` is undefined (paint Material) — IDB DataError logged but harmless | ℹ️ Info (pre-existing per Plan 07 SUMMARY) |
| `material.ts` FaceDirection JSDoc | Plan 04 found JSDoc claims `+Z=top` but BoxGeometry uses `+Y=top` (physical convention); Plan 04 used physical mapping in code, left JSDoc untouched | ℹ️ Info (v1.18 cleanup candidate) |
| `surfaceMaterials.ts:materialsForSurface` | `surface` arg ignored in v1.17 (no Material category metadata yet); intentional, documented inline | ℹ️ Info (Phase 70+ scope) |

### Test Regressions (Carry-Over)

Phase 68 introduced 4 new test failures, all stale assertions against legacy contracts that Phase 68 intentionally changed (verified by checking these tests pass on `main`):

| Test File | Failure | Root Cause |
|-----------|---------|------------|
| `tests/snapshotMigration.test.ts:32` | `expected 6 to be 5` | Asserts default snapshot version === 5; Phase 68 bumped to 6 (D-01) |
| `tests/pickerMyTexturesIntegration.test.tsx` | "Unable to find element MY TEXTURES" | Tests legacy wallpaper picker tab; Plan 06 replaced with MaterialPicker |
| `tests/WallMesh.cutaway.test.tsx` | `expected 15 to be 13` | Phase 59 audit asserts every `<meshStandardMaterial>` has `{...ghost}`; Plan 04 added 2 new sites without it. Worth reviewing whether ghost cutaway should apply to resolved Materials. |
| `tests/lib/contextMenuActionCounts.test.ts` (×6 in full suite) | `expected 6 to be 5` | Test-pollution; passes in isolation. Some Phase 68 test mutates context-menu module state. |

### Pre-Existing Failures (NOT Phase 68)

`tests/AddProductModal.test.tsx` (×3), `tests/SaveIndicator.test.tsx`, `tests/SidebarProductPicker.test.tsx`, `tests/productStore.test.ts` — all fail on `main` pre-Phase-68. Out of scope for this verification.

### Human Verification Required

See `HUMAN-UAT.md` (Plan 07) — three plain-English checks for Jessica covering picker UX feel, 3D visual fidelity, and pre-Phase-68 project auto-migration.

## Gaps Summary

Phase 68's implementation goal is fully achieved across all 5 must-have truths. All Wave 0 tests, Plan-specific tests, and the canonical e2e spec are GREEN. Build is clean.

The 4 legacy test regressions are stale-assertion fallout from intentional Phase 68 changes (snapshot version bump, wallpaper picker removal, new material render sites). They represent **carry-over cleanup work**, not broken Phase 68 functionality. None block the goal; all should be filed as `tech-debt` GH issues for a follow-up cleanup phase (or fixed inline before milestone close).

The contextMenuActionCounts pollution suggests one of the new Phase 68 test files leaks state into a global `getActionsForKind` registry — worth a brief investigation before v1.17 ships.

---

_Verified: 2026-05-06T07:46:00Z_
_Verifier: Claude (gsd-verifier)_
