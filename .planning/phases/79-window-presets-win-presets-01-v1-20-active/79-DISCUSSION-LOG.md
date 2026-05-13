# Phase 79: Window Presets (WIN-PRESETS-01) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 79-window-presets-win-presets-01-v1-20-active
**Areas discussed:** Preset list contents, Picker UX, Custom flow, Data model

---

## 1. Preset List Contents

| Option | Description | Selected |
|--------|-------------|----------|
| A. Minimal (roadmap example) | 2×3, 3×4, 4×5, Custom — all sill 3 ft | |
| **B. Residential set** | Small 2×3 @ 3ft, Standard 3×4 @ 3ft, Wide 4×5 @ 3ft, Picture 6×4 @ 1ft, Bathroom 2×4 @ 4.5ft, Custom | ✓ |
| C. Comprehensive | 8+ presets across all room types | |
| D. Something else | Free-form user definition | |

**User's choice:** B — Residential set with varied sill heights
**Notes:** Recommendation was B. User picked it without additional clarification. Sill heights vary per preset to capture functional intent (Picture = low for living room views, Bathroom = high for privacy).

---

## 2. Picker UX — Where & When

| Option | Description | Selected |
|--------|-------------|----------|
| **A. Always-visible switcher** | 5 preset chips in a floating bar near canvas. Sticky while tool is active. Live ghost-preview updates on chip change. | ✓ |
| B. One-click dropdown | Dropdown opens from toolbar, closes after pick. Re-open to switch. (Matches Phase 61 Wall Cutouts pattern.) | |
| C. Modal first | Full modal with preset cards + custom field. Heaviest interruption. | |
| D. Keyboard-cycle | Ghost at cursor, press 1/2/3/4/5 to cycle. Power-user, hidden. | |
| E. Something else | Free-form user definition | |

**User's choice:** A — Always-visible switcher
**Notes:** Recommendation was A. Justification: Jessica places windows in succession across many rooms; re-opening a menu each time is friction.

---

## 3. Custom Flow

| Option | Description | Selected |
|--------|-------------|----------|
| **1. Inline numeric inputs** | Custom chip expands the switcher to show W/H/Sill number boxes; ghost updates live. No popup. | ✓ |
| 2. Mini-dialog before placement | Small popup asks W/H/Sill, then ghost activates. | |
| 3. Place first, edit after | Places a default-sized window; user edits in PropertiesPanel afterward. | |
| 4. Drag-to-size on canvas | Click-and-drag on wall to size width; height/sill stay at last-used values. | |
| 5. Something else | Free-form user definition | |

**User's choice:** 1 — Inline numeric inputs in the expanding switcher
**Notes:** Recommendation was 1. Default values pre-fill from last-used preset to reduce typing.

---

## 4. Data Model for "Active Preset"

| Option | Description | Selected |
|--------|-------------|----------|
| A. Store `presetId` on each Opening | New optional field, written when preset chosen. Requires migration or back-compat optional handling. | |
| **B. Derive from dimensions on read** | No new field. Match current widthFt/heightFt/sillHeight against catalog. Exact match → preset name; else "Custom". | ✓ |
| C. Something else | Free-form user definition | |

**User's choice:** B — Derive from dimensions on read
**Notes:** Recommendation was B. Zero data migration. User accepts the minor semantic quirk ("Custom 3/4/3 labeled as Standard") as good UX.

---

## Claude's Discretion

- Exact visual placement of the floating switcher (canvas-bottom-center, sidebar slot, etc.)
- Switcher visual treatment (chips vs SegmentedControl vs Button row)
- First-time default preset (Small vs last-used)
- How the Custom chip visually expands to reveal inputs (inline, popover, accordion)
- Whether to export the preset catalog as a const array or typed Record

## Deferred Ideas

- User-defined preset catalog (save-as-preset) — out of scope for WIN-PRESETS-01
- Door / archway / passthrough / niche presets — same pattern is reusable but not in this phase
- Drag-to-size custom flow — rejected in question 3, may reappear alongside Phase 80 PARAM-01
