---
phase: 79-window-presets-win-presets-01-v1-20-active
plan: 01
subsystem: testing
tags: [phase-79, win-presets-01, red-tests, window-presets, wave-0]
dependency_graph:
  requires:
    - "Phase 31 single-undo update/updateNoHistory pair"
    - "Phase 35 e2e setupPage + seedRoom helpers"
    - "Existing cadStore.updateOpening + cadStore.addOpening actions"
  provides:
    - "Machine-readable WIN-01 + WIN-02 contract (3 RED test files)"
    - "Test surface for Wave 1 catalog + bridge implementation"
  affects:
    - "tests/ — adds 3 new files; no production code change"
tech_stack:
  added: []
  patterns:
    - "RED-tests-only Wave 0 (Phase 17 + Phase 31 precedent)"
    - "vitest + happy-dom + <App /> harness mirror"
    - "Playwright e2e mirror of preset-toolbar-and-hotkeys.spec.ts"
key_files:
  created:
    - "tests/windowPresets.test.ts"
    - "tests/windowTool.preset.test.tsx"
    - "tests/e2e/specs/window-presets.spec.ts"
  modified: []
decisions:
  - "RED-tests committed importing yet-to-exist modules (@/lib/windowPresets, setCurrentWindowPreset). Wave 1 will make the imports resolve and turn tests GREEN."
  - "Used Phase 31 phase31Resize.test.tsx as the integration-test harness template (App + TooltipProvider mount; idb-keyval + serialization + ThreeViewport stubbed)."
  - "E2E driver pattern mirrors Phase 35: chip selection is driven via window.__driveWindowPreset rather than DOM clicks, to avoid Fabric mouse-event races during placement."
metrics:
  duration_seconds: 164
  completed_date: "2026-05-13"
requirements_addressed: [WIN-01, WIN-02]
---

# Phase 79 Plan 01: Wave 0 RED Tests for Window Presets — Summary

Failing tests committed that pin the WIN-01 + WIN-02 contract — catalog shape, derivePreset semantics, toolbar→tool bridge, PropertiesPanel preset row, and full E2E placement flow — across 3 new test files (26 total assertions). Wave 1 implementation will turn each test GREEN, with deviations from this contract surfacing as test failures rather than silent regressions.

## What Shipped

Three RED test files, all expected to fail until Wave 1+ lands:

| File | Lines | Assertions | Failure mode (RED-proven) |
|------|-------|------------|---------------------------|
| `tests/windowPresets.test.ts` | 95 | 12 `it(` | Module-not-found for `@/lib/windowPresets` |
| `tests/windowTool.preset.test.tsx` | 256 | 7 `it(` | `setCurrentWindowPreset is not a function` + `__driveWindowPreset` undefined |
| `tests/e2e/specs/window-presets.spec.ts` | 285 | 7 `test(` (×2 projects = 14 listed) | `data-testid` selectors not yet rendered |

Total: 26 assertions covering catalog dimensions, derivePreset id-vs-custom return, bridge round-trip, custom-shape input, PropertiesPanel label derivation, single-undo preset switch, and switcher mount/unmount lifecycle.

## Deviations from Plan

### Auto-fixed Issues

None — all auto-fix rules dormant. The plan was a pure RED-tests-only deliverable; nothing required Rule 1/2/3 intervention.

### Plan adherence notes

- Plan asked for "exactly 12 `it(` blocks" in `windowPresets.test.ts` — delivered exactly 12 (7 catalog + 5 derivePreset). The plan's described breakdown listed 13 conceptual assertions but the acceptance criterion was 12, which matches the final file.
- Plan asked for "exactly 7 `it(` blocks" in `windowTool.preset.test.tsx` — delivered exactly 7 (3 bridge + 4 PropertiesPanel).
- Plan asked for "exactly 7 `test(` blocks" in the E2E spec — delivered exactly 7.
- All test files use the `@/` path alias as required, no `it.skip` / `test.skip` / `it.todo` placeholders.

## RED Verification

Confirmed RED at commit time. Selected output from `npm run test -- windowPresets windowTool.preset`:

```
FAIL  tests/windowPresets.test.ts
Error: Failed to resolve import "@/lib/windowPresets" from "tests/windowPresets.test.ts"

FAIL  tests/windowTool.preset.test.tsx (7 tests | 7 failed)
TypeError: setCurrentWindowPreset is not a function
AssertionError: expected undefined to be defined  (window.__driveWindowPreset)
```

Confirmed E2E spec is discoverable by Playwright:

```
$ npx playwright test window-presets --list
Total: 14 tests in 1 file
```

(14 = 7 tests × 2 projects [`chromium-dev` + `chromium-preview`])

## Wave 1+ Roadmap (what these tests gate)

1. **Wave 1 (Plan 79-02):** Create `src/lib/windowPresets.ts` with `WINDOW_PRESETS` + `derivePreset()` → turns `windowPresets.test.ts` GREEN. Add `setCurrentWindowPreset` / `getCurrentWindowPreset` + `__driveWindowPreset` driver in `windowTool.ts` → turns 3 of 7 bridge tests in `windowTool.preset.test.tsx` GREEN.
2. **Wave 2 (Plan 79-03 — UI):** Build `WindowPresetSwitcher.tsx` with the chip data-testids the E2E spec expects (`window-preset-switcher`, `window-preset-chip-{id}`, `window-preset-custom-{width|height|sill}`) → turns 4 of 7 E2E tests GREEN. Add the PropertiesPanel preset row (`opening-preset-chip-{opId}-{id}` + label text) → turns the remaining 4 of 7 integration tests + 3 of 7 E2E tests GREEN.

## Commits

| Hash | Message |
|------|---------|
| `2d21d4f` | test(79-01): add RED unit + integration tests for window-preset catalog and bridge |
| `703ee31` | test(79-01): add RED E2E spec for window-preset switcher + PropertiesPanel |

## Self-Check: PASSED

- [x] `tests/windowPresets.test.ts` exists (verified at path)
- [x] `tests/windowTool.preset.test.tsx` exists (verified at path)
- [x] `tests/e2e/specs/window-presets.spec.ts` exists (verified at path)
- [x] Commit `2d21d4f` exists in `git log`
- [x] Commit `703ee31` exists in `git log`
- [x] `npm run test -- windowPresets windowTool.preset` reports failures with expected module-not-found / driver-undefined errors
- [x] `npx playwright test window-presets --list` reports 14 (7 × 2 projects)
- [x] `grep -c "^\s*it("` on `windowPresets.test.ts` = 12 (matches acceptance criterion exactly)
- [x] `grep -c "^\s*it("` on `windowTool.preset.test.tsx` = 7 (matches exactly)
- [x] `grep -c "^\s*test("` on `window-presets.spec.ts` = 7 (matches exactly)
- [x] Zero `it.skip` / `test.skip` / `it.todo` placeholders across all 3 files

## Known Stubs

None. This plan is intentionally test-only and the test files reference future modules (Wave 1+ implementation surface). The "failing imports" are the entire point of RED tests — they are not stubs, they are the contract.
