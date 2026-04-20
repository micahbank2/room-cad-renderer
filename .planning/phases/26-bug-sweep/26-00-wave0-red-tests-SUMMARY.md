---
phase: 26-bug-sweep
plan: 00
subsystem: testing
tags: [vitest, fabric, structuredClone, red-test, tdd]

# Dependency graph
requires:
  - phase: 25-canvas-store-performance
    provides: Wave 0 RED-test pattern, MockImage / productImageCache contract, structuredClone snapshot path
provides:
  - tests/fabricSync.image.test.ts — RED contract test for FIX-01 (Group rebuild on image load)
  - tests/ceilingMaterial.persistence.test.ts — baseline/RED contract test for FIX-02 (preset distinctness + round-trip)
  - Empirical confirmation of root causes for both bugs before any fix is written
affects: [26-01-fix01-product-image-rebuild, 26-02-fix02-ceiling-preset-material, 26-03-wave3-verification-and-closeout]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 RED-test-first pattern carried over from Phase 25 (D-09)"
    - "MockImage global override for happy-dom async image tests (reused verbatim per D-02)"

key-files:
  created:
    - tests/fabricSync.image.test.ts
    - tests/ceilingMaterial.persistence.test.ts
  modified: []

key-decisions:
  - "FIX-01 RED confirmed: renderProducts does not rebuild Group on cache onReady → Pitfall 1 is the real root cause. Plan 26-01 must fix (not close as stale)."
  - "FIX-02 Pitfall 4 (snapshot drop) RULED OUT: all 7 baseline tests pass. Plan 26-02 must target UI wiring, tier-resolution timing, or visual perception (Pitfall 3) — not serialization."

patterns-established:
  - "Pattern: happy-dom Fabric.Canvas null-canvas + MockImage — enables testing async image rendering without real DOM image decode."
  - "Pattern: structuredClone round-trip assertions as contract guards for D-07 fields (surfaceMaterialId / paintId / legacy material)."

requirements-completed: [FIX-01, FIX-02]

# Metrics
duration: 6min
completed: 2026-04-20
---

# Phase 26 Plan 00: Wave 0 RED Tests Summary

**Two Vitest contract tests landed that deterministically isolate FIX-01's root cause (Group rebuild missing on cache onReady) and rule out Pitfall 4 for FIX-02 (structuredClone preserves surfaceMaterialId cleanly), redirecting Plan 26-02 to UI wiring / visual perception.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-20T16:49:57Z
- **Completed:** 2026-04-20T16:52:00Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments

- **FIX-01 RED test confirms Pitfall 1 (from 26-RESEARCH.md).** The first render builds a product Group without a FabricImage child (cache miss). MockImage fires onload → cache triggers `fc.renderAll()` → renderAll does NOT re-execute `renderProducts()` → Group remains childless. Assertion `expect(hasImage).toBe(true)` fails as hypothesized. Plan 26-01 must trigger a Group rebuild (e.g., Option A in research: tick state dependency on `FabricCanvas` useEffect).
- **FIX-02 baseline test PASSES 7/7.** Pitfall 4 (snapshot drop) is ruled out: `surfaceMaterialId` survives `structuredClone`, `JSON.parse(JSON.stringify(...))`, and the paintId/limeWash-clearing setter contract. PLASTER/WOOD_PLANK/PAINTED_DRYWALL/CONCRETE hex values are distinct. This redirects Plan 26-02 investigation to UI wiring (does click call `setCeilingSurfaceMaterial`?), tier-resolution timing (does `CeilingMesh` useMemo refire?), or visual perception (Pitfall 3 — PLASTER vs PAINTED_DRYWALL differ by only 3 L* points).
- **Full suite still at same pre-existing failure footprint.** 186 passing, 7 failing (6 pre-existing + 1 intentional new RED). No regression introduced.

## Task Commits

1. **Task 0-01: RED test for FIX-01 product image Group rebuild** — `1329d40` (test)
2. **Task 0-02: Baseline/RED test for FIX-02 preset distinctness + round-trip** — `909eba1` (test)

_Metadata commit follows this summary._

## Files Created/Modified

- `tests/fabricSync.image.test.ts` — 96 lines. Asserts product Group contains `fabric.FabricImage` child after MockImage onload → onReady → renderAll cycle completes. RED against current main.
- `tests/ceilingMaterial.persistence.test.ts` — 110 lines. Two describe blocks: (1) Ceiling preset distinctness (color + roughness); (2) `surfaceMaterialId` round-trip via structuredClone, JSON, and the setter's paintId/limeWash-clearing contract. All 7 tests pass.

## Test Outcomes Against Current Main

| Test | Expected (per research) | Actual | Interpretation |
|------|-------------------------|--------|----------------|
| `renderProducts ... rebuilds Group to include FabricImage after onload` | FAIL (Pitfall 1) | **FAIL** | Confirms Pitfall 1 — renderAll alone insufficient. Plan 26-01 must rebuild Group. |
| `ceiling presets have distinct colors` | PASS | PASS | PLASTER ≠ PAINTED_DRYWALL (hex differs). Pitfall 3 is a UI-perception issue at most. |
| `surfaceMaterialId survives structuredClone` | PASS | PASS | Pitfall 4 ruled out. |
| `setting surfaceMaterialId clears paintId and limeWash` (contract sim) | PASS | PASS | Setter shape round-trips cleanly. |
| `JSON round-trip preserves surfaceMaterialId` | PASS | PASS | IDB save path preserves field. |
| `structuredClone preserves all three overlapping ceiling fields` | PASS | PASS | D-07 contract honored. |
| `WOOD_PLANK roughness 0.75, PLASTER 0.9` | PASS | PASS | Catalog consistent. |
| `CONCRETE shared both-surface, roughness 0.85` | PASS | PASS | Catalog consistent. |

## Decisions Made

- **D-04 not triggered for FIX-01.** Issue #42 stays open — RED failure is deterministic proof that the bug exists against current code. No stale-close.
- **FIX-02 hypothesis pivot.** Plan 26-02 pre-work (already scoped in the phase) must re-target UI wiring + tier-resolution timing + visual perception, not persistence. Specifically: (a) verify `CeilingPaintSection` calls `setCeilingSurfaceMaterial` with the clicked id; (b) verify `CeilingMesh` useMemo actually recomputes on the store change; (c) manual smoke must cycle through CONCRETE and WOOD_PLANK (visually distinct) before concluding anything about the near-white presets.

## Deviations from Plan

None — plan executed exactly as written. Both tasks used the verbatim action snippets in the PLAN.md. One minor typing adjustment: used typed `fabric.Object` predicate instead of `any` in the FIX-01 test's `.find()` callback to satisfy strict TS, with a local cast for the `data` shape; no semantic change.

## Issues Encountered

None. Test infrastructure (Vitest + happy-dom + MockImage pattern) was fully in place. Both new files compile and execute cleanly.

## User Setup Required

None — unit tests only, no external service configuration.

## Next Phase Readiness

- **Plan 26-01 (FIX-01):** Green-light to proceed. RED is confirmed. Fix target is narrow: trigger `renderProducts()` re-execution when cache onReady fires. Option A (tick state in FabricCanvas useEffect dependency array) is idiomatic React — recommend this path; Option B (fabric event) couples cache to fabric.
- **Plan 26-02 (FIX-02):** Proceed, but with a narrowed hypothesis set. Persistence is proven correct. Look at:
  1. `CeilingPaintSection.tsx:42` — confirm `onSelect` wires through to `setCeilingSurfaceMaterial`.
  2. `CeilingMesh.tsx:30-48` — confirm `ceiling` prop arrives as a fresh reference on store change (Zustand subscription in `ThreeViewport` scene).
  3. Manual smoke path MUST include CONCRETE ↔ WOOD_PLANK cycle (amber brown ↔ gray) before any visual-perception claim.
- **Plan 26-03 (Verify & closeout):** Both new tests flip-expectations are now encoded — Plan 26-01 completion flips `tests/fabricSync.image.test.ts` from RED → GREEN; Plan 26-02 completion keeps `tests/ceilingMaterial.persistence.test.ts` GREEN while extending it if a new contract surface emerges.

## Self-Check: PASSED

Verified:
- `tests/fabricSync.image.test.ts` exists (96 lines, contains `class MockImage`, `fabric.FabricImage`, `renderProducts`, `__resetCache`).
- `tests/ceilingMaterial.persistence.test.ts` exists (110 lines, contains `structuredClone` x4, `surfaceMaterialId` x8, all four preset ids, concrete `#a0794f` hex).
- Commit `1329d40` exists in `git log` (task 0-01).
- Commit `909eba1` exists in `git log` (task 0-02).
- `npm run test -- --run tests/fabricSync.image.test.ts` → 1 failed (expected RED).
- `npm run test -- --run tests/ceilingMaterial.persistence.test.ts` → 7 passed (expected baseline).
- Full suite: 186 passed + 7 failed (1 new intentional RED + 6 pre-existing unrelated). No regression.

---
*Phase: 26-bug-sweep*
*Completed: 2026-04-20*
