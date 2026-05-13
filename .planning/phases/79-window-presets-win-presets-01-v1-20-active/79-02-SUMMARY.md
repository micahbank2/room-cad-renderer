---
phase: 79-window-presets-win-presets-01-v1-20-active
plan: 02
subsystem: cad-tools
tags: [phase-79, win-presets-01, wave-1, green-core, bridge, catalog]
dependency_graph:
  requires:
    - "Wave 0 RED tests (79-01) — tests/windowPresets.test.ts + tests/windowTool.preset.test.tsx"
    - "productTool.pendingProductId bridge precedent (Phase 30 PROD-08)"
    - "CLAUDE.md Pattern 7 StrictMode-safe cleanup"
  provides:
    - "WINDOW_PRESETS canonical catalog + derivePreset() lookup (single source of truth per D-09)"
    - "windowTool setCurrentWindowPreset / getCurrentWindowPreset bridge — stable contract for Wave 3 UI"
    - "window.__driveWindowPreset test driver — Wave 3 e2e + integration harness ready"
  affects:
    - "src/canvas/tools/windowTool.ts — hardcoded WINDOW_WIDTH constant fully removed"
tech_stack:
  added: []
  patterns:
    - "D-07 module-level toolbar→tool bridge (mirror of productTool.pendingProductId)"
    - "Pattern 7 identity-check driver cleanup; bridge value persists across StrictMode remounts (Pitfall 1)"
    - "1e-3 EPS float-tolerance for catalog derivation (D-09 derive-on-read)"
key_files:
  created:
    - "src/lib/windowPresets.ts"
  modified:
    - "src/canvas/tools/windowTool.ts"
decisions:
  - "Bridge default { width: 3, height: 4, sillHeight: 3 } preserved at module load — historical placement behavior unchanged when no switcher has written"
  - "Driver accepts EITHER catalog id string OR raw {W,H,Sill} object — supports both chip-driven and custom-input test paths in Wave 3"
  - "Pre-existing tsc warning about baseUrl deprecation is out of scope (logged as deferred — not introduced by this plan)"
metrics:
  duration_seconds: 480
  completed_date: "2026-05-13"
requirements_addressed: [WIN-01]
---

# Phase 79 Plan 02: GREEN core — Catalog + windowTool bridge — Summary

WIN-01 data layer landed: canonical 5-preset catalog, derivePreset() with float-tolerant matching, and a module-level switcher→tool bridge in windowTool — unblocking Wave 3's UI work with a stable, tested contract.

## What Shipped

| File | Type | What |
|------|------|------|
| `src/lib/windowPresets.ts` | NEW (67 lines) | WindowPresetId type, WindowPreset interface, WINDOW_PRESETS readonly array (5 entries per D-01), derivePreset(opening) with 1e-3 epsilon |
| `src/canvas/tools/windowTool.ts` | MODIFY | Removed `const WINDOW_WIDTH = 3`. Added `currentWindowPreset` bridge + `setCurrentWindowPreset` + `getCurrentWindowPreset` exports. All 5 hardcoded dimension sites (preview ghost, mousemove snap radius, mousedown placement) now read bridge. `window.__driveWindowPreset` test driver installed when MODE === "test", with Pattern 7 identity-check cleanup. Bridge itself persists past tool cleanup (Pitfall 1). |

## Test Status

| Test file | Before | After this plan | Owner of remaining RED |
|-----------|--------|-----------------|------------------------|
| `tests/windowPresets.test.ts` | 0/12 (module not found) | **12/12 GREEN** | — |
| `tests/windowTool.preset.test.tsx` (bridge half — Tests 1–3 WIN-01) | 0/3 | **3/3 GREEN** | — |
| `tests/windowTool.preset.test.tsx` (PropertiesPanel half — Tests 4–7 WIN-02) | 0/4 | 0/4 RED | **Plan 79-03 (Wave 3)** |
| `tests/e2e/specs/window-presets.spec.ts` | 0/7 | unchanged (UI not yet built) | **Plan 79-03 (Wave 3)** |

Bridge-layer integration: `npm run test -- windowPresets windowTool.preset --run` reports `15 passed | 4 failed` — every WIN-01 contract is green; the 4 reds are the WIN-02 PropertiesPanel tests that Wave 3 will satisfy by adding the preset row + chips.

## Deviations from Plan

### Auto-fixed Issues

None — Rules 1/2/3 dormant. The plan was a tight additive change with clear contracts; no bug-fix, missing-functionality, or blocking-issue intervention required.

### Plan adherence notes

- Acceptance criterion `grep -c "WINDOW_WIDTH" src/canvas/tools/windowTool.ts` returns 0 — the docstring comment that mentioned the historical constant was rewritten to use the numeric form (`3/4/3`) to satisfy the strict criterion.
- All 8 must-have truths from the plan frontmatter verified: catalog shape, derivePreset semantics + tolerance, bridge exports, driver gating, bridge-read placement (no hardcoded values reach `addOpening`).

## Deferred Issues

- Pre-existing tsconfig.json `baseUrl deprecated` warning (TS 6→7 migration). Unrelated to this plan — verified by running `tsc` against pre-plan HEAD via git stash. Tracked as a future cleanup, not blocking. No GH issue filed in this turn; if Jessica wants it cleaned up, a one-line tsconfig edit (`"ignoreDeprecations": "6.0"`) fixes it.

## Self-Check: PASSED

- [x] `src/lib/windowPresets.ts` exists (67 lines, exports WindowPresetId, WindowPreset, WINDOW_PRESETS, derivePreset)
- [x] `src/canvas/tools/windowTool.ts` exports `setCurrentWindowPreset` and `getCurrentWindowPreset` (grep verified both)
- [x] `grep -c "WINDOW_WIDTH" src/canvas/tools/windowTool.ts` = 0 (constant fully removed)
- [x] `grep -c "currentWindowPreset" src/canvas/tools/windowTool.ts` = 10 (well above the >=5 requirement)
- [x] `grep "__driveWindowPreset" src/canvas/tools/windowTool.ts` matches (driver installed)
- [x] `grep "import.meta.env.MODE" src/canvas/tools/windowTool.ts` matches twice (install + cleanup)
- [x] `npm run test -- windowPresets.test --run` → 12/12 passing
- [x] `npm run test -- windowTool.preset --run` → 3/3 bridge tests passing (4 PropertiesPanel tests RED — Wave 3 work, per plan)
- [x] Commit `de8e7be` exists: feat(79-02) catalog
- [x] Commit `de67dc0` exists: feat(79-02) bridge

## Known Stubs

None. The 4 RED PropertiesPanel tests are an intentional Wave 3 hand-off — they pin the WIN-02 contract that Plan 79-03 will satisfy. They are not stubs in this plan's surface area; the catalog + bridge are fully functional and self-contained.

## Commits

| Hash | Message |
|------|---------|
| `de8e7be` | feat(79-02): add WINDOW_PRESETS catalog + derivePreset (D-09 derive-on-read) |
| `de67dc0` | feat(79-02): wire windowTool preset bridge + __driveWindowPreset driver |
