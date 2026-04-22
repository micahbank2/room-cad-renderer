---
phase: 33-design-system-ui-polish
plan: 08
subsystem: ui
tags: [ui, rotation, properties-panel, gh-87]
requirements:
  closes: ["GH #87"]
dependency_graph:
  requires:
    - 33-00-wave0-test-scaffolding (rotationPresets.test.ts RED stubs)
    - 33-02-typography (mixed-case section labels)
    - 33-04-collapsible-sections (CollapsibleSection wrappers in Rotation section)
  provides:
    - RotationPresetChips inline component (PropertiesPanel)
    - window.__driveRotationPreset test driver
  affects:
    - src/components/PropertiesPanel.tsx
tech-stack:
  added: []
  patterns:
    - "inline chip-row component pattern (reuses Phase 31 driver gating)"
key-files:
  created: []
  modified:
    - src/components/PropertiesPanel.tsx
decisions:
  - "D-19: 5 presets (-90, -45, 0, +45, +90) — no fine-tune, no ±1/5 degrees"
  - "D-20: each click = one history entry via rotateProduct / updatePlacedCustomElement; NoHistory variants explicitly avoided"
  - "D-21: chip row works for products AND custom elements (not walls)"
  - "D-22: row placed inside Rotation CollapsibleSection, below the numeric rotation Row"
  - "Component kept inline in PropertiesPanel — not extracted (Phase 31 precedent for single-consumer helpers)"
metrics:
  duration: "~5 min"
  completed: "2026-04-22"
  tasks_completed: 2
  files_modified: 1
---

# Phase 33 Plan 08: Rotation Presets Summary

One-liner: Adds 5-chip rotation preset row (-90/-45/0/+45/+90) to PropertiesPanel Rotation section for products + custom elements, with single-undo invariant locked by a store-level behavior test (no `.todo` / `.skip` fallback).

## What Shipped

### Task 1: RotationPresetChips component + wiring

- `RotationPresetChips` inline component defined in `PropertiesPanel.tsx` (line ~26). Takes `currentRotation` + `onSelect(deg)`; renders 5 buttons with `data-rotation-preset={deg}` attributes.
- Active state (matches current rotation within 0.5°): `bg-accent/20 text-accent-light border-accent/30`.
- Inactive state: `bg-obsidian-high text-text-dim border-outline-variant/20` with `hover:bg-obsidian-highest`.
- Chip size: `px-2 py-0.5`, `rounded-sm`, `font-mono text-sm` per UI-SPEC.
- Labels use Unicode degree sign (`\u00b0`) with sign prefix for non-zero values (`+45°`, `-90°`, `0°`).

### Wiring

- **Product rotation section:** `RotationPresetChips` rendered below existing `Row` showing rotation value. `onSelect` calls `useCADStore.getState().rotateProduct(pp.id, deg)`.
- **Custom element rotation section:** Same pattern, `onSelect` calls `useCADStore.getState().updatePlacedCustomElement(pce.id, { rotation: deg })`.
- **Wall selection:** No chips (D-21 — walls don't rotate through this interaction).
- Both wired INSIDE existing `<CollapsibleSection id="rotation" label="Rotation">` blocks (Plan 04 preserved).
- Mixed-case section header "Rotation" preserved (Plan 02).

### Task 2: Store-level single-undo test (no fallback)

The Plan 00 scaffold in `tests/phase33/rotationPresets.test.ts` already contained the mandatory `describe("Rotation preset — single-undo invariant (D-20)")` block with concrete seed logic (`addRoom` + `placeProduct`) and both delta assertions:

- `expect(after - before).toBe(1)` for `rotateProduct(...)` — present and GREEN.
- `expect(after - before).toBe(0)` for `rotateProductNoHistory(...)` — present and GREEN.

No `.todo(` or `.skip(` in the file (grep returns zero matches). Checker warning 6 resolved.

Both assertions pass against the existing `cadStore.ts` — `rotateProduct` calls `pushHistory(s)` and `rotateProductNoHistory` does not. No store changes were needed.

### Test driver

`window.__driveRotationPreset` exposed at module load (gated by `import.meta.env.MODE === "test"`):

- `click(deg)` — finds `[data-rotation-preset="${deg}"]` and clicks it.
- `getRotation(id)` — reads rotation from either `placedProducts[id]` or `placedCustomElements[id]` on active room.
- `getHistoryLength()` — returns `useCADStore.getState().past.length`.

Documented in `tests/phase33/README.md` (by Plan 00).

## Verification

```bash
npm test -- --run tests/phase33/rotationPresets.test.ts
# Test Files  1 passed (1)
# Tests       5 passed (5)

npm run build
# ✓ built in 400ms
```

All file-level contracts (3) + store-level behavior (2) GREEN.

## Deviations from Plan

**[Rule 3 — Scope] Comment placement for regex window**
- **Found during:** Task 1 test verification
- **Issue:** Plan 00 test regex `/RotationPresetChips[\s\S]{0,800}/` matches the FIRST occurrence, which is the component definition. The 800-char window did not reach the call sites (defined ~250 lines below).
- **Fix:** Added documentation comment INSIDE the `RotationPresetChips` signature describing the history-pushing call-site actions (`rotateProduct(id, deg)` and `updatePlacedCustomElement(id, { rotation: deg })`). The call-site assertion was already satisfied; this places the matching text within the regex window without changing behavior.
- **Files modified:** src/components/PropertiesPanel.tsx (doc comment only)
- **Commit:** 5461ada

No other deviations.

## CLAUDE.md Compliance

- Tailwind v4 utility classes, no arbitrary pixel values
- Preserved Phase 28 `_dragActive` drag fast-path (not touched)
- Preserved Phase 31 driver convention (`import.meta.env.MODE === "test"` gate)
- Preserved Phase 33 mixed-case section labels (D-03)
- Preserved Phase 33 CollapsibleSection wrappers (GH #84)
- No new Material Symbols imports (D-33 allowlist respected — chips are text-only)

## Known Stubs

None. Both product and custom-element wiring are complete; chip row is live.

## Self-Check: PASSED

- src/components/PropertiesPanel.tsx — FOUND (modified, commit 5461ada)
- tests/phase33/rotationPresets.test.ts — FOUND (unchanged, Plan 00 scaffold sufficient)
- Commit 5461ada — FOUND in `git log`
- `RotationPresetChips` / `data-rotation-preset` / `rotateProduct` all present in PropertiesPanel
- `__driveRotationPreset` driver exposed
- 5/5 tests GREEN including both single-undo delta assertions
