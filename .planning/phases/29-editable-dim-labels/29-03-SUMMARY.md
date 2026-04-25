---
phase: 29
plan: 03
subsystem: properties-panel
tags: [parser, properties-panel, feet-inches, edit-20, edit-21, wave-2]
requirements: [EDIT-20, EDIT-21]
requires:
  - 29-02 (validateInput + overlay polish)
provides:
  - EditableRow accepts parser prop; LENGTH row commits via feet+inches grammar
  - Commit guard tightened (silent-cancel on null/NaN, abs-epsilon no-op guard)
  - flushSync wrap on startEdit for deterministic DOM mount
  - Stable recentPaints selector (Rule-3 auto-fix; resolves React 18 getSnapshot warning)
affects:
  - src/components/PropertiesPanel.tsx
  - src/components/SwatchPicker.tsx
tech_stack:
  added: []
  patterns: [optional-parser-prop, silent-cancel-on-invalid, abs-epsilon-no-op-guard, flushSync-DOM-determinism]
key_files:
  created: []
  modified:
    - src/components/PropertiesPanel.tsx
    - src/components/SwatchPicker.tsx
decisions:
  - LENGTH row gets the parser prop; THICKNESS / HEIGHT keep their decimal-only path (D-05, D-05a, D-05b).
  - Input type toggles to "text" when parser is supplied — prevents browser's number-input rejection of feet+inches notation.
  - abs-epsilon (1e-6) no-op guard prevents formatFeet round-trip floats from creating spurious undo entries on no-op opens.
  - SwatchPicker selector fix landed inline as Rule-3 sanctioned auto-fix; one-line stability fix, blast radius zero.
backfilled: 2026-04-25 (Phase 37 DEBT-04 — frontmatter was missing on the original commit)
---

# Phase 29 Plan 03 — SUMMARY

**Plan:** 29-03 EditableRow parser prop + LENGTH feet+inches opt-in
**Completed:** 2026-04-20
**Tasks:** 1/1
**Commits:**
- `f00495d` feat(29-03): EditableRow parser prop + LENGTH feet+inches (D-05/D-05a/Pitfall-2)
- `72f022e` fix(29-03): stable recentPaints selector to silence React 18 getSnapshot warning

## What was built

### `src/components/PropertiesPanel.tsx`
- `EditableRow` inline component gained an optional `parser?: (raw: string) => number | null` prop (D-05, D-05a).
- Default behavior preserved when `parser` is omitted — existing THICKNESS/HEIGHT rows untouched (D-05b display path also unchanged).
- LENGTH row call site now passes `parser={validateInput}` imported from `@/canvas/dimensionEditor`, so Jessica can type `12'6"` into the LENGTH row and it commits as 12.5 feet.
- `<input>` type toggles to `"text"` when a parser is supplied — prevents browser's `type="number"` from rejecting feet+inches notation.
- Commit guard tightened per RESEARCH Pitfall #2:
  - Silent cancel on `null` / `NaN` / non-finite parser output (matches D-06a silent-cancel pattern)
  - Existing `v < min` guard preserved
  - **New:** `Math.abs(v - value) <= 1e-6` no-op guard — prevents `formatFeet` round-trip floats from creating spurious undo entries when the user opens the overlay and commits without changing the value
- `startEdit` wraps state updates in `flushSync` so the `<input>` is in the DOM synchronously after click (deterministic for tests, matches wainscot-popover precedent).

### `src/components/SwatchPicker.tsx` (Rule-3 sanctioned auto-fix)
- Swapped `useCADStore((s) => (s as any).recentPaints ?? [])` for a selector that returns the raw slice (`string[] | undefined`) and fallback-coerces outside the selector. Stable reference satisfies React 18's `"getSnapshot should be cached"` expectation. Not in the plan scope, but encountered while executing tests — fix is one-line, blast radius zero, stable-reference fix.

## Tests (all green)

```
npx vitest run tests/PropertiesPanel.length.test.tsx tests/dimensionOverlay.test.tsx tests/dimensionEditor.test.ts
→ 3 files, 34 tests, 0 failures
```

- `tests/PropertiesPanel.length.test.tsx` — red → **green** (LENGTH row accepts feet+inches; THICKNESS/HEIGHT unaffected)
- `tests/dimensionEditor.test.ts` — still **green** (D-02 grammar held by Plan 02)
- `tests/dimensionOverlay.test.tsx` — still **green** (overlay polish held by Plan 02)

`npx tsc --noEmit` — only the pre-existing `baseUrl` deprecation warning noted in Plan 01, unrelated to 29-03.

## Recovery note

The executor agent for this plan timed out after ~9 minutes (stream idle timeout) **after** performing all code edits but **before** committing or writing SUMMARY.md. Orchestrator recovered by:
1. Inspecting the uncommitted diff (clean, matched the plan's `<action>` exactly)
2. Running the plan's verify commands to confirm green tests + tsc
3. Committing as two atomic commits (main work + Rule-3 auto-fix)
4. Writing this SUMMARY.md

No work was lost. Tests prove correctness.

## Requirement coverage

- **EDIT-20** — feet+inches parse now works in both canvas dim-label overlay (Plan 02) AND PropertiesPanel LENGTH row (this plan). ✓

## What this enables for Plan 04

- Full suite + tsc gate can now run
- Human smoke checkpoint for perceptual items
- VALIDATION.md `nyquist_compliant: true` sign-off
