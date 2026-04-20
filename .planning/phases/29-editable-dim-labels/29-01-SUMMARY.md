---
phase: 29
plan: 01
subsystem: tests
tags: [tdd, wave-0, red-stubs, dim-labels, parser, overlay, edit-21]
requirements: [EDIT-20, EDIT-21]
requires: []
provides:
  - Executable parser spec (D-02 accept forms, D-02a rejects, round-trip)
  - Overlay RTL spec (D-03 prefill, D-03a select-all, D-04 96px, D-06 Escape)
  - PropertiesPanel parser-prop spec (D-05 LENGTH only, D-05a THICKNESS unchanged)
  - EDIT-21 single-undo regression guard (green immediately)
affects:
  - tests/dimensionEditor.test.ts
  - tests/dimensionOverlay.test.tsx (new)
  - tests/PropertiesPanel.length.test.tsx (new)
  - tests/cadStore.resizeWallByLabel.test.ts (new)
tech_stack:
  added: []
  patterns: [RTL + zustand reset, it.each parser tables, data-testid overlay driver]
key_files:
  created:
    - tests/dimensionOverlay.test.tsx
    - tests/PropertiesPanel.length.test.tsx
    - tests/cadStore.resizeWallByLabel.test.ts
  modified:
    - tests/dimensionEditor.test.ts
decisions:
  - Driver pattern for overlay test uses existing data-testid="dimension-edit-input" (already in place). Fabric dblclick via jsdom fireEvent is best-effort — red stubs still catch red state.
  - THICKNESS regression-lock uses "0'9\"" which parseFloat returns 0 for (below min=0.1), so default-parser commit silently cancels — locks D-05a scope boundary.
metrics:
  duration: fast
  tasks: 4
  files: 4
  commits: 4
  completed_date: "2026-04-20"
---

# Phase 29 Plan 01: Wave 0 Test Stubs Summary

Wave 0 TDD red stubs for Phase 29 editable-dim-labels: 4 test files (1 extended + 3 new) lock in the D-02 parser grammar, overlay UX behavior (prefill/select-all/96px/Escape), PropertiesPanel LENGTH parser prop, and EDIT-21 single-undo guard. No production code touched.

## Tasks Completed

| Task | Name | Files | Commit |
| ---- | ---- | ----- | ------ |
| 1 | Extend `tests/dimensionEditor.test.ts` with D-02 accept + D-02a reject + round-trip stubs | `tests/dimensionEditor.test.ts` | `9ca0083` |
| 2 | Create `tests/dimensionOverlay.test.tsx` — RTL overlay prefill/commit/width/select-all | `tests/dimensionOverlay.test.tsx` | `ed3a2c3` |
| 3 | Create `tests/PropertiesPanel.length.test.tsx` — parser-prop integration | `tests/PropertiesPanel.length.test.tsx` | `c633ea7` |
| 4 | Create `tests/cadStore.resizeWallByLabel.test.ts` — EDIT-21 single-undo regression guard | `tests/cadStore.resizeWallByLabel.test.ts` | `c6085ef` |

## Test Block Counts & Red/Green State

| File | `it` blocks | Red (fail) | Green (pass) | Blocked by |
| ---- | ----------- | ---------- | ------------ | ---------- |
| `tests/dimensionEditor.test.ts` | 25 total (3 pre-existing + 22 new it.each rows across 3 describe entries) | 11 new | 14 (3 pre-existing + 11 accepts/rejects that already match current parser behavior) | Plan 02 (parser rewrite) |
| `tests/dimensionOverlay.test.tsx` | 5 | 5 | 0 | Plan 02 (overlay prefill/width/select-all) |
| `tests/PropertiesPanel.length.test.tsx` | 4 | 4 | 0 | Plan 03 (EditableRow parser prop) |
| `tests/cadStore.resizeWallByLabel.test.ts` | 3 | 0 | 3 | — (regression guard, green immediately) |

**Verification runs:**

- `npx vitest run tests/cadStore.resizeWallByLabel.test.ts` — **3 passed** (EDIT-21 locked in).
- `npx vitest run tests/dimensionEditor.test.ts` — 11 failed / 14 passed (red for D-02 grammar, green for pre-existing decimal cases).
- `npx vitest run tests/dimensionOverlay.test.tsx` — 5 failed (cannot find `dimension-edit-input` until overlay renders with Plan 02 wiring or a refined driver).
- `npx vitest run tests/PropertiesPanel.length.test.tsx` — 4 failed (LENGTH row cannot accept feet+inches until Plan 03 wires `parser` prop).

## Deviations from Plan

None — plan executed exactly as written.

The overlay test uses the already-present `data-testid="dimension-edit-input"` and a best-effort `fireEvent.dblClick` on the fabric-hosted `<canvas>`. If Plan 02 finds that fabric in jsdom prevents the overlay from opening via native dblclick, Plan 02 can add a thin test driver (ref, window hook, or setter) without rewriting these tests — the assertions on `.value`, `.selectionStart/End`, and `.style.width` will continue to apply.

## Handoffs

- **Plan 02 (parser + overlay polish):** Drive green
  - `tests/dimensionEditor.test.ts` 11 failing cases → rewrite `validateInput` body per D-02/D-02a grammar.
  - `tests/dimensionOverlay.test.tsx` 5 failing cases → switch prefill to `formatFeet(currentLen)`, widen overlay to 96px, add `onFocus={e => e.currentTarget.select()}`, wire Escape cancel (already present, verify).
  - If the fabric-dblclick driver is too fragile, expose a minimal test hook (data-attr or window-level setter) — assertions stay unchanged.

- **Plan 03 (PropertiesPanel):** Drive green
  - `tests/PropertiesPanel.length.test.tsx` 4 failing cases → add optional `parser?: (raw: string) => number | null` prop to `EditableRow`, pass `validateInput` as the parser to the LENGTH row only. Preserve default `parseFloat` for THICKNESS/HEIGHT so D-05a regression test stays green.

## Self-Check: PASSED

- `tests/dimensionEditor.test.ts` — FOUND (modified)
- `tests/dimensionOverlay.test.tsx` — FOUND (new)
- `tests/PropertiesPanel.length.test.tsx` — FOUND (new)
- `tests/cadStore.resizeWallByLabel.test.ts` — FOUND (new)
- Commits `9ca0083`, `ed3a2c3`, `c633ea7`, `c6085ef` — FOUND in `git log`
- EDIT-21 guard: GREEN confirmed via `npx vitest run tests/cadStore.resizeWallByLabel.test.ts` → 3 passed
- Red stubs in 3 other files confirmed via targeted vitest runs
