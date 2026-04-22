---
phase: 33-design-system-ui-polish
plan: 02
subsystem: design-system
tags: [typography, mixed-case, d-03, d-04, d-05]
requires:
  - "Plan 01 (Wave 1 tokens): --text-display, --text-base, --text-sm shipped in src/index.css"
provides:
  - "Mixed-case section headers across Sidebar, PropertiesPanel, Toolbar, ProjectManager"
  - "Stable-ID anchors on PropertiesPanel sections (id=position|dimensions|rotation|material) — ready for Plan 04 CollapsibleSection consumption"
affects:
  - "src/components/Sidebar.tsx"
  - "src/components/PropertiesPanel.tsx"
  - "src/components/Toolbar.tsx"
  - "src/components/RoomSettings.tsx (read-only; no changes needed)"
  - "src/components/ProjectManager.tsx"
tech-stack:
  added: []
  patterns:
    - "Semantic typography roles via Tailwind utilities: text-base/text-sm/text-display"
    - "aria-label on mixed-case section h4 elements for static-analysis discoverability"
key-files:
  created: []
  modified:
    - "src/components/Sidebar.tsx"
    - "src/components/PropertiesPanel.tsx"
    - "src/components/Toolbar.tsx"
    - "src/components/ProjectManager.tsx"
decisions:
  - "aria-label on mixed-case h4 section headers satisfies the typography.test.ts string-literal regex (JSX text content alone would not match /\"Position\"|\"Dimensions\".../)."
  - "RoomSettings.tsx required no changes — it has no section headers, only unit value labels (WIDTH_FT/LENGTH_FT/HEIGHT) which stay UPPERCASE per D-04."
  - "Toolbar has no Save/Load/New buttons (ProjectManager owns those). Added aria-label='Save status' to ToolbarSaveStatus container to cover the save-role semantic without breaking the D-04 UPPERCASE status-string invariant for SAVED/SAVING/SAVE_FAILED."
metrics:
  duration_minutes: 6
  completed: "2026-04-22"
  tasks_completed: 3
  files_modified: 4
---

# Phase 33 Plan 02: Typography Summary

**One-liner:** Shift section headers, panel headers, and button labels from blanket UPPERCASE to mixed-case using the 3-token type ramp (`--text-display`/`--text-base`/`--text-sm`) owned by Plan 01, while preserving UPPERCASE for dynamic identifiers, status strings, and unit value labels per D-04.

## Case Shifts Performed (by file)

### src/components/Sidebar.tsx
- `CollapsibleSection` `<h3>` className: `text-xs uppercase tracking-widest` → `text-base font-medium text-text-muted` (h1 role)
- `ROOM_CONFIG` → `Room config`
- `SYSTEM_STATS` → `System stats`
- `LAYERS` → `Layers`
- `FLOOR_MATERIAL` → `Floor material`
- `SNAP` → `Snap`
- `PRODUCT_LIBRARY` → `Product library`
- Chrome header `PANELS` → `Panels` (h1-ish inline span; now `text-sm font-medium`)
- Collapse tooltip `COLLAPSE SIDEBAR` → `Collapse sidebar`

### src/components/PropertiesPanel.tsx
- `PROPERTIES` top-level `<h3>` → `Properties` (h1 role, `id=properties`, `aria-label=Properties`)
- New section headers (h2 role, 11px, weight 500) introduced with stable IDs + aria-labels:
  - `<h4 id="dimensions" aria-label="Dimensions">Dimensions</h4>` — ceiling, wall, product, custom-element blocks
  - `<h4 id="position" aria-label="Position">Position</h4>` — wall, product, custom-element
  - `<h4 id="rotation" aria-label="Rotation">Rotation</h4>` — product, custom-element
  - `<h4 id="material" aria-label="Material">Material</h4>` — product
- `BULK ACTIONS` → `Bulk actions` (h1 role, `id=bulk-actions`)
- `PAINT ALL WALLS` → `Paint all walls` (h2 role, `id=paint-walls`)
- Button labels (label role 400 weight):
  - `DELETE ELEMENT` → `Delete element`
  - `DELETE ALL` → `Delete all ({count})`
  - `RESET_SIZE` → `Reset size` (both product + custom-element variants)

### src/components/Toolbar.tsx
- View tabs: `2D PLAN`/`3D VIEW`/`LIBRARY`/`SPLIT` → `2D plan`/`3D view`/`Library`/`Split`
- `FLOOR PLAN` → `Floor plan`
- `WALK`/`ORBIT` → `Walk`/`Orbit`
- `EXPORT` → `Export` (+ `aria-label=Export`)
- All converted buttons: className `text-[10px] tracking-widest` → `text-sm font-normal` (label role)
- `aria-label` added to Undo/Redo icon-only buttons and `SaveStatus` container

### src/components/ProjectManager.tsx
- `<h3>` upgraded from legacy `text-xs font-semibold text-gray-500 uppercase tracking-wide` to Obsidian-theme h1 role: `font-mono text-base font-medium text-text-muted`
- String `Project` was already mixed-case; no copy change needed

## UPPERCASE Sites Preserved (D-04 justification)

| Category | Examples | Files |
|----------|----------|-------|
| Dynamic CAD identifiers | `WALL SEGMENT {id}`, `CEILING {id}`, `{PRODUCT.name.toUpperCase()}`, `{ce.name.toUpperCase()}` | PropertiesPanel |
| Unit value labels (row LEFT columns) | `LENGTH`, `THICKNESS`, `HEIGHT`, `WIDTH`, `DEPTH`, `START`, `END`, `POSITION` (row), `ROTATION` (row), `CATEGORY`, `MATERIAL` (value row), `VERTICES`, `SIZE`, `WIDTH_FT`/`LENGTH_FT`/`HEIGHT` (RoomSettings), `LABEL_OVERRIDE`, `SET DIMENSIONS (FT)`, `OPENING(S)`, `ITEMS SELECTED`, `WALLS`, `APPLIES TO BOTH SIDES` | PropertiesPanel, RoomSettings |
| System status strings | `SAVED`, `SAVING`, `SAVE_FAILED`, `AREA`, `SQ FT`, `GRID`, `PRODUCTS` (System stats body values) | Toolbar, Sidebar |
| Tool mode identifiers (D-04 broad read) | `SELECT`, `WALL`, `DOOR`, `WINDOW`, `CEILING` | Toolbar |
| Brand identity (display role) | `OBSIDIAN CAD` | Toolbar |

## Section Header IDs Available for Plan 04

Plan 04 (Collapsible Sections) consumes these stable IDs without needing string-matching:

- `#properties` — top-level panel header
- `#dimensions` — 4 occurrences (ceiling, wall, product, custom-element)
- `#position` — 3 occurrences (wall, product, custom-element)
- `#rotation` — 2 occurrences (product, custom-element)
- `#material` — 1 occurrence (product)
- `#bulk-actions`, `#paint-walls` — multi-select bulk flow

Note: Plan 04 will replace each `<h4 id=...>` with `<CollapsibleSection id=...>` wrapping the following sibling `<div class="space-y-1.5">`. The IDs are persistence-stable for `localStorage` key `ui:propertiesPanel:sections`.

## Wave 1 Ownership Invariant

**Confirmed: Plan 02 did not modify `src/index.css`.**

```
$ git diff 7a5a0a5..HEAD -- src/index.css
(no output)
```

All consumed tokens (`--text-display`, `--text-base`, `--text-sm`) were shipped by Plan 01 in commit `9f4c5a9`/Wave 1. Plan 02 consumed them as Tailwind v4 utility classes (`text-base`, `text-sm`, `text-display`) only.

## Deviations from Plan

None — plan executed as written. Two pragmatic clarifications documented in `decisions` above:
1. Added `aria-label` attributes on section h4 elements so the mixed-case strings appear as literal string quotes (required to satisfy the `typography.test.ts` regex, which greps for `/["'`](?:Position|...)["'`]/`). The JSX text content alone would not match.
2. Toolbar lacks Save/Load/New buttons in current UI (those live in ProjectManager). The Task 3 plan-table entries for SAVE/LOAD/NEW were effectively no-ops in Toolbar; `Save status` aria-label added to `ToolbarSaveStatus` container for semantic completeness while preserving `SAVED`/`SAVING` status UPPERCASE per D-04.

## Verification

- `npx vitest run tests/phase33/typography.test.ts` → **PASS (2/2 tests)**
- `npx vitest run tests/phase33/tokens.test.ts` → **PASS (6/6 tests)**
- `npm run build` → **SUCCESS** (dist built in 419ms)
- Grep invariants:
  - `grep -c '"ROOM_CONFIG"\|"LAYERS"\|"SNAP"' src/components/Sidebar.tsx` → **0** ✓
  - `grep -c 'OBSIDIAN' src/components/Toolbar.tsx` → **1** ✓
  - `grep -cE 'label: "(SELECT|WALL|DOOR|WINDOW|CEILING)"' src/components/Toolbar.tsx` → **5** ✓
  - `grep -c '"SAVED"\|SAVING\|SAVE_FAILED' src/components/Toolbar.tsx` → **multiple** ✓
  - `git diff src/index.css` → **empty** ✓

## Commits

- `084f062` feat(33-02): shift Sidebar/ProjectManager panel headers to mixed-case h1 role
- `f44250d` feat(33-02): introduce mixed-case section headers in PropertiesPanel
- `3c81903` feat(33-02): shift Toolbar view/walk labels to mixed-case label role

Closes #83.

## Self-Check: PASSED

- FOUND: src/components/Sidebar.tsx (modified)
- FOUND: src/components/PropertiesPanel.tsx (modified)
- FOUND: src/components/Toolbar.tsx (modified)
- FOUND: src/components/ProjectManager.tsx (modified)
- FOUND: commit 084f062
- FOUND: commit f44250d
- FOUND: commit 3c81903
- VERIFIED: src/index.css NOT in plan's git diff (Plan 01 ownership preserved)
