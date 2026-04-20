# Phase 29: Editable Dimension Labels — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `29-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 29-editable-dim-labels
**Areas discussed:** Scope framing, Input grammar, Pre-fill format, Overlay sizing, PropertiesPanel consistency, Outside-click behavior

---

## Scope framing — hardening vs rewrite

| Option | Description | Selected |
|--------|-------------|----------|
| Harden existing (dblclick + overlay + resizeWallByLabel) | Add feet+inches parser, extend tests, polish | ✓ |
| Rewrite | Redesign from scratch | |
| Other | | |

**User's choice:** Harden existing (1a)
**Notes:** Mirrors Phase 28 pattern — existing code already labeled `EDIT-06` works for the core flow. EDIT-21 single-undo already met by `resizeWallByLabel` design.

---

## Input grammar

| Option | Description | Selected |
|--------|-------------|----------|
| Liberal parser | `12'6"`, `12' 6"`, `12'-6"`, `12'`, `6"`, `12.5`, `12`, `12ft 6in`. Reject `12 6`. | ✓ |
| Strict | Only `12'-6"` and decimal `12.5` | |
| Decimal + one feet-inches form | `12.5` and `12'6"` only | |
| Other | | |

**User's choice:** Liberal (2a)
**Notes:** Jessica shouldn't have to remember one format. Ambiguous bare-number pairs still rejected.

---

## Pre-fill format

| Option | Description | Selected |
|--------|-------------|----------|
| `formatFeet()` output (e.g. `12'-6"`) | Matches label | ✓ |
| Decimal `12.50` (current) | Back-compat | |
| Empty | Force retype | |
| Other | | |

**User's choice:** `formatFeet()` (3a)
**Notes:** Added D-03a — select-all on focus so single-keystroke replace works.

---

## Input overlay sizing

| Option | Description | Selected |
|--------|-------------|----------|
| Fix wider (~96px) | Fits `12'-11"` | ✓ |
| Auto-grow to content | Dynamic width | |
| Keep 64px, accept wrap | Current | |
| Other | | |

**User's choice:** Fix wider 96px (4a)
**Notes:** Simpler and predictable; auto-grow not worth the complexity.

---

## PropertiesPanel consistency

| Option | Description | Selected |
|--------|-------------|----------|
| Also accept feet+inches in LENGTH row + similar rows | Share parser | ✓ |
| Keep PropertiesPanel numeric-only | Canvas-label only feet+inches | |
| Defer to future phase | Separate later | |
| Other | | |

**User's choice:** Also accept (5a)
**Notes:** Add optional `parser` prop to `EditableRow` so non-dimension rows are unaffected.

---

## Outside-click behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Commit on blur (current) | Matches wainscot popover pattern | ✓ |
| Cancel on blur (only Enter commits) | Safer on accidental click-away | |
| Other | | |

**User's choice:** Commit on blur (6a)
**Notes:** Silent cancel on invalid input preserved (D-06a); no toast/shake until telemetry justifies it.

---

## Claude's Discretion

- Parser file location: inline in `dimensionEditor.ts` vs. new `src/lib/feetInches.ts`
- Exact regex shape (grammar is spec'd, form is flexible)
- `EditableRow` `parser` prop vs. `EditableDimensionRow` wrapper
- Overlay padding/focus-ring tweaks within existing token palette

## Deferred Ideas

- Tab/arrow nav between dim labels
- Hover tooltip "double-click to edit"
- Toast/shake on invalid input
- Drag-to-resize (Phase 31)
- Editing height/thickness via labels
- Metric unit toggle
- More elaborate mitre regeneration
