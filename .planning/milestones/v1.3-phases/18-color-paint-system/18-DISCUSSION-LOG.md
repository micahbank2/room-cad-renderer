# Phase 18: Color & Paint System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 18-color-paint-system
**Areas discussed:** Paint picker UX, Apply-paint workflow, Custom color creation, Lime wash rendering

---

## Paint Picker UX

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar section | A new "PAINT" section in the existing WallSurfacePanel sidebar, below wallpaper. Always visible when a wall is selected. | ✓ |
| Popover panel | Click a paint icon on the toolbar or wall panel, and a floating popover appears near the click point. | |
| Full modal | A centered modal with the full F&B catalog, search, filters, and custom colors. | |

**User's choice:** Sidebar section
**Notes:** Consistent with existing wallpaper/wainscot/crown pattern.

| Option | Description | Selected |
|--------|-------------|----------|
| Grid with hover name | Dense grid of small color squares. Hovering shows F&B name in tooltip. Clicking applies immediately. | ✓ |
| Grid with name labels | Slightly larger swatches with color name printed below each. | |
| Scrollable list rows | Each color as a row: swatch circle + name + hex. | |

**User's choice:** Grid with hover name
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Filter chips | Row of small colored chips above the grid (Whites, Neutrals, Blues, Greens, Pinks, Yellows, Blacks). | ✓ |
| Dropdown select | Select dropdown with hue family names. | |

**User's choice:** Filter chips
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Top of paint section | Row of last 8 applied colors pinned above F&B catalog grid. Always visible. | ✓ |
| Separate tab | "RECENT" tab alongside main catalog. | |

**User's choice:** Top of paint section
**Notes:** None

---

## Apply-Paint Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Select wall, then pick color | Click wall to select → paint section appears → click swatch to apply. Matches existing flow. | ✓ |
| Pick color first, then click walls | Select color from library, enter "paint mode", click walls to apply. | |

**User's choice:** Select wall, then pick color
**Notes:** Matches wallpaper/wainscot flow.

| Option | Description | Selected |
|--------|-------------|----------|
| Active side from UI toggle | Uses existing SIDE_A/SIDE_B toggle in wall panel. | ✓ |
| Always SIDE_A unless switched | Defaults to SIDE_A. | |
| Both sides at once | Applies to both sides simultaneously. | |

**User's choice:** Active side from UI toggle
**Notes:** Consistent with existing side toggle.

| Option | Description | Selected |
|--------|-------------|----------|
| Button in paint section | "APPLY_TO_ALL_WALLS" button, one click, no confirmation. | ✓ |
| Button with confirmation | Same button but confirm dialog first. | |
| You decide | Claude picks. | |

**User's choice:** Button in paint section (no confirmation)
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Separate action | Ceiling painting is its own section/flow. Independent from walls. | ✓ |
| Checkbox toggle | "ALSO_APPLY_TO_CEILING" checkbox in wall paint section. | |

**User's choice:** Separate action
**Notes:** Keep wall and ceiling paint independent.

---

## Custom Color Creation

| Option | Description | Selected |
|--------|-------------|----------|
| Hex input + native color picker | Text field + browser built-in picker. No extra dependency. | |
| react-colorful wheel | Install react-colorful (~3KB) for HSL wheel + hex input. | ✓ |
| You decide | Claude picks. | |

**User's choice:** react-colorful wheel
**Notes:** Better for visual picking.

| Option | Description | Selected |
|--------|-------------|----------|
| Above F&B catalog | "MY_COLORS" section between recents and F&B. | |
| Below F&B catalog | Custom colors at the bottom, after F&B. | ✓ |
| Mixed into F&B grid | Custom colors alongside F&B with badge. | |

**User's choice:** Below F&B catalog
**Notes:** Deviated from recommended. F&B stays the primary collection.

| Option | Description | Selected |
|--------|-------------|----------|
| Inline form | "+ ADD_COLOR" button expands inline row in sidebar. | ✓ |
| Small modal | Compact modal with name, hex, notes. | |

**User's choice:** Inline form
**Notes:** Stays in sidebar flow.

| Option | Description | Selected |
|--------|-------------|----------|
| Right-click to delete | Right-click custom swatch shows "DELETE" option. | ✓ |
| Edit mode toggle | "EDIT" button puts custom colors into delete mode. | |

**User's choice:** Right-click to delete
**Notes:** Clean, no visual clutter.

---

## Lime Wash Rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle pattern overlay | Faint cloudy/stippled pattern at ~20% opacity over wall color. | ✓ |
| Badge or icon indicator | Solid color with "LW" badge. | |
| You decide | Claude picks. | |

**User's choice:** Subtle pattern overlay
**Notes:** Visually distinguishes lime wash from flat paint.

| Option | Description | Selected |
|--------|-------------|----------|
| Per-swatch toggle | "LIME_WASH" toggle per wall/ceiling placement. Not per catalog entry. | ✓ |
| Per-catalog-entry toggle | Lime wash property on library entry. All walls using it get lime wash. | |
| Both options | Library default + per-placement override. | |

**User's choice:** Per-swatch toggle (per-placement)
**Notes:** Same color can be lime wash on one wall, flat on another.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes | Lime wash on walls and ceilings. | ✓ |
| Walls only | Keep simple for v1.3. | |

**User's choice:** Yes — walls and ceilings
**Notes:** Lime wash ceilings are a real thing.

---

## Claude's Discretion

- Exact swatch grid dimensions (px per swatch, grid gap)
- Lime wash 2D pattern generation approach
- Recently-used palette persistence approach
- "APPLY_TO_ALL_WALLS" exact side logic

## Deferred Ideas

None — discussion stayed within phase scope
