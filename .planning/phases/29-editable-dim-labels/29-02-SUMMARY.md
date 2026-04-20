---
phase: 29
plan: 02
subsystem: canvas
tags: [parser, overlay, feet-inches, d-02, d-03, d-04, edit-20, wave-1]
requirements: [EDIT-20]
requires:
  - 29-01 (red stubs for parser + overlay)
provides:
  - validateInput accepts full D-02 feet+inches grammar
  - Overlay pre-fills with formatFeet, 96px wide, select-all on focus
  - window.__openDimensionEditor(wallId) test driver
affects:
  - src/canvas/dimensionEditor.ts
  - src/canvas/FabricCanvas.tsx
  - tests/dimensionOverlay.test.tsx
tech_stack:
  added: []
  patterns: [three-branch-ordered-regex, window-level-test-driver]
key_files:
  created: []
  modified:
    - src/canvas/dimensionEditor.ts
    - src/canvas/FabricCanvas.tsx
    - tests/dimensionOverlay.test.tsx
decisions:
  - Three-branch ordered regex (INCHES_ONLY → FEET_INCHES → DECIMAL_ONLY) as designed in 29-RESEARCH; first match wins; "12 6" rejected because it matches none.
  - Added a minimal `window.__openDimensionEditor(wallId)` test driver inside a useEffect. Plan 01 explicitly sanctioned this (fabric dblclick depends on getBoundingClientRect which is 0 in jsdom — overlay never opens without a bypass). Non-invasive: driver does exactly what the dblclick handler does post-hit-test.
  - Updated the `openOverlayForWall` helper in tests/dimensionOverlay.test.tsx to call the driver instead of the best-effort dblclick; assertions unchanged.
metrics:
  duration: fast
  tasks: 2
  files: 3
  commits: 2
  completed_date: "2026-04-20"
---

# Phase 29 Plan 02: Parser + Overlay Polish Summary

Rewrote `validateInput` as a three-branch regex parser covering the D-02 feet+inches grammar, and polished the overlay to pre-fill with `formatFeet(currentLen)`, widen to 96px, and select all on focus. Added a minimal `window.__openDimensionEditor` test driver so the Wave 0 overlay tests can actually open the overlay under jsdom (fabric's native dblclick path depends on `getBoundingClientRect` which is 0 in jsdom). All 16 Plan 01 red stubs targeted by this plan flipped to green.

## Tasks Completed

| Task | Name | Files | Commit |
| ---- | ---- | ----- | ------ |
| 1 | Rewrite validateInput with three-branch regex (D-02/D-02a/D-02b) | `src/canvas/dimensionEditor.ts` | `6b6b635` |
| 2 | FabricCanvas overlay polish — formatFeet prefill, 96px, select-all + test driver | `src/canvas/FabricCanvas.tsx`, `tests/dimensionOverlay.test.tsx` | `7c771b8` |

## Exact Changes

### `src/canvas/dimensionEditor.ts` (Task 1)
- Replaced lines 42–49 (the 8-line strict-decimal `validateInput`) with a 38-line three-branch parser:
  - Three module-level `const` regexes: `INCHES_ONLY`, `FEET_INCHES`, `DECIMAL_ONLY`.
  - `validateInput(raw)` trims, bails on empty, then tries each branch. First match wins; returns decimal feet or `null` if the result is non-finite or `≤ 0`.
- Unchanged: imports, `DIM_LABEL_HIT_RADIUS_PX`, `computeLabelPx`, `hitTestDimLabel`.

### `src/canvas/FabricCanvas.tsx` (Task 2)
- **Edit A (line 33):** Appended `formatFeet` to the existing `@/lib/geometry` import.
- **Edit B (line 278):** `setPendingValue(currentLen.toFixed(2))` → `setPendingValue(formatFeet(currentLen))`.
- **Edit C (lines 446, 448):** `left: label.x - 32` → `left: label.x - 48`; `width: 64` → `width: 96`.
- **Edit D (line 497):** Added `onFocus={(e) => e.currentTarget.select()}` to the overlay `<input>`, adjacent to `autoFocus`.
- **Driver (lines 309–325):** Added a new `useEffect` that exposes `window.__openDimensionEditor(wallId)` for tests; the driver does the same `formatFeet(currentLen) + setEditingWallId(wallId)` the dblclick handler does after a successful hit-test. Cleanup deletes the property.
- Unchanged: dblclick hit-test, `commitEdit`, `cancelEdit`, `resizeWallByLabel` call, `editingWallId` state, wainscot overlay, drag fast-path.

### `tests/dimensionOverlay.test.tsx` (Task 2)
- Rewrote `openOverlayForWall` helper from a fragile `fireEvent.dblClick` on the `<canvas>` to a one-line `window.__openDimensionEditor(WALL_ID)` call. No assertion changes.

## Test Results — Red Stubs Flipped to Green

| File | Before (Plan 01) | After (this plan) | Delta |
| ---- | ---------------- | ----------------- | ----- |
| `tests/dimensionEditor.test.ts` | 14 pass / 11 fail (parser grammar red) | **25 pass / 0 fail** | +11 green |
| `tests/dimensionOverlay.test.tsx` | 0 pass / 5 fail (overlay never renders in jsdom) | **5 pass / 0 fail** | +5 green |
| `tests/cadStore.resizeWallByLabel.test.ts` | 3 pass / 0 fail (regression guard, already green) | 3 pass / 0 fail | — |

Commands used:

- `npx vitest run tests/dimensionEditor.test.ts` → 25 pass.
- `npx vitest run tests/dimensionOverlay.test.tsx` → 5 pass.
- `npx vitest run tests/dimensionEditor.test.ts tests/dimensionOverlay.test.tsx tests/cadStore.resizeWallByLabel.test.ts` → **33 pass, 0 fail**.

## Deviations from Plan

**[Rule 3 – Blocker] Added `window.__openDimensionEditor` test driver (sanctioned by Plan 01 handoff).**
- **Found during:** Task 2 verify step — `npx vitest run tests/dimensionOverlay.test.tsx` failed all 5 tests with `expected null not to be null` because `queryByTestId("dimension-edit-input")` returned nothing.
- **Root cause:** jsdom returns `{width: 0, height: 0}` from `getBoundingClientRect` on the wrapper `<div>`, so `getViewTransform` computes `scale: 0`, `computeLabelPx` produces NaN, and `hitTestDimLabel` can never return true. The overlay never opens, so the input is never rendered.
- **Sanction:** Plan 01's SUMMARY handoff explicitly permits "a thin test driver (ref, window hook, or setter) without rewriting these tests — the assertions on `.value`, `.selectionStart/End`, and `.style.width` will continue to apply." Plan 02's own task description also anticipates this: "If the fabric-dblclick driver is too fragile, expose a minimal test hook."
- **Fix:** 18 LOC `useEffect` in `FabricCanvas.tsx` that attaches `window.__openDimensionEditor(wallId)` and mirrors exactly what the dblclick handler does after a successful hit-test (look up wall, compute length, `setPendingValue(formatFeet(len))`, `setEditingWallId(id)`). Cleanup deletes the property. Updated `openOverlayForWall` in the test file to call it.
- **Commit:** included in `7c771b8`.

No other deviations.

## Deferred Issues (out of scope — pre-existing)

`npx tsc --noEmit` reports 8 pre-existing errors in files not touched by this plan:
- `src/components/help/helpContent.tsx:295` — JSX prop typing issue
- `src/components/WallSurfacePanel.tsx:396` — index type narrowing
- `src/main.tsx:5` — missing `./index.css` module declaration
- `src/stores/cadStore.ts` (4 errors) — `ImportMeta.env` typing, produce return shape

None are caused by or related to Phase 29 work. Logged for future cleanup.

## Acceptance Criteria — Audit

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| `dimensionEditor.ts` contains `INCHES_ONLY`, `FEET_INCHES`, `DECIMAL_ONLY` | ✅ | `grep -E "INCHES_ONLY\|FEET_INCHES\|DECIMAL_ONLY" src/canvas/dimensionEditor.ts` → 6 matches |
| `computeLabelPx`, `hitTestDimLabel` still exported | ✅ | unchanged |
| `tests/dimensionEditor.test.ts` green | ✅ | 25/25 pass |
| `FabricCanvas.tsx` contains `formatFeet(currentLen)` | ✅ | line 278 |
| `FabricCanvas.tsx` contains `width: 96` and `left: label.x - 48` | ✅ | lines 446, 448 |
| `FabricCanvas.tsx` contains `onFocus={(e) => e.currentTarget.select()}` | ✅ | line 497 |
| Still contains `resizeWallByLabel` + `hitTestDimLabel` | ✅ | unchanged |
| Does NOT contain `currentLen.toFixed(2)` or `width: 64` | ✅ | replaced |
| `tests/dimensionOverlay.test.tsx` green | ✅ | 5/5 pass |

## Handoffs

- **Plan 03 (PropertiesPanel parser prop):** `validateInput` is the exported parser. Signature unchanged (`(raw: string) => number | null`). Import as-is from `@/canvas/dimensionEditor`, pass as the `parser` prop on the LENGTH `EditableRow` only. THICKNESS/HEIGHT keep default `parseFloat`.
- **Plan 04 (verification):** Manual smoke — dblclick a label in-browser, confirm `"12'-6\""` prefill, 96px width, single-keystroke replace on focus, Enter commits, Escape cancels, Ctrl+Z is one step. `window.__openDimensionEditor` is a test hook only; it's a no-op in production because nothing calls it.

## Self-Check: PASSED

- `src/canvas/dimensionEditor.ts` — FOUND (modified)
- `src/canvas/FabricCanvas.tsx` — FOUND (modified)
- `tests/dimensionOverlay.test.tsx` — FOUND (modified)
- Commit `6b6b635` — FOUND in `git log`
- Commit `7c771b8` — FOUND in `git log`
- `npx vitest run tests/dimensionEditor.test.ts tests/dimensionOverlay.test.tsx tests/cadStore.resizeWallByLabel.test.ts` → 33 pass / 0 fail
