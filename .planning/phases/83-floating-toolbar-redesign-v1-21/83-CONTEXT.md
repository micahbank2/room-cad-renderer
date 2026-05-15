# Phase 83 — Context

**Captured:** 2026-05-14
**Phase:** 83 — Floating Toolbar Redesign
**Milestone:** v1.21 — Sidebar IA & Contextual Surfaces
**Issues closed:** #175 (IA-06), #176 (IA-07)
**Branch:** `gsd/phase-83-toolbar`
**Research:** `.planning/phases/83-floating-toolbar-redesign-v1-21/83-RESEARCH.md` (HIGH confidence)

---

## What This Phase Does

Rebuilds `FloatingToolbar.tsx` from a two-row ad-hoc layout into a banded 5-group toolbar with WCAG-AAA 44 px hit targets, always-on group labels, hover tooltips, and responsive wrap below 1280 px. Lifts the Snap dropdown out of `Sidebar.tsx` (deferred by Phase 81 D-05) into the Utility group as a Popover-backed button. Lifts the Phase 79 WindowPresetSwitcher anchor to keep clear of the now-taller wrapped toolbar.

This is phase 4 of 5 in v1.21. Phase 80 audited; 81 restructured the left panel; 82 shipped the inspector; 84 will handle contextual visibility rules (IA-08).

---

## Locked Decisions

### D-01 — 44 px hit targets via new `icon-touch` Button variant

Add `"icon-touch": "h-11 w-11"` to the `size` variants in `src/components/ui/Button.tsx` cva map. Every tool button in `FloatingToolbar.tsx` migrates from `size="icon"` (36 px) to `size="icon-touch"` (44 px). View-mode buttons (text labels "2D" / "3D" / "Split" / "Library") use `size="icon-touch"` plus a `className="w-auto px-3"` override so the 44 px height is preserved while width grows to fit text.

WCAG 2.5.5 AAA target size = 44 × 44 CSS px. No new CSS token needed — 44 px is one-off and doesn't compose with `--spacing-*`.

### D-02 — 5 visually banded groups with always-on 9 px labels

Group order, left to right (or top to bottom after wrap):

| Group | Tools (in order) |
|-------|------------------|
| **Drawing** | select, wall, door, window, wall-cutouts trigger, product |
| **Measure** | measure, label |
| **Structure** | ceiling, stair |
| **View** | 2D, 3D, Split, Library |
| **Utility** | grid toggle, snap (NEW per D-04), zoom-in, zoom-out, fit, undo, redo, [display modes conditional] |

Group labels are mixed-case per D-09 ("Drawing", "Measure", "Structure", "View", "Utility") — NOT uppercase. Rendered at `text-[9px] tracking-wider text-muted-foreground/70 leading-none select-none` above each group's button row.

Labels are always visible (not hover-only) because the IA-07 verifiable criterion requires "see 5 visually distinct labeled groups" — hover-only fails the test.

### D-03 — Responsive collapse via Tailwind `flex-wrap`

Container becomes a single `flex flex-wrap items-start justify-center gap-3` row instead of the current `flex-col` two-row stack. Width capped at `max-w-[min(calc(100vw-24px),1240px)]`. At 1024 × 768 viewport the 5 groups naturally exceed 1024 px and wrap to a second row. No JS, no `useResize`, no container query.

Drop the horizontal divider that currently separates the top and bottom rows. Drop the explicit `<Divider />` between buttons inside the old bottom row; vertical dividers stay between *groups* only.

### D-04 — Snap moves from Sidebar to Utility group as Popover button

Snap migrates per the Phase 81 D-05 deferral. Implementation:

- New button in Utility group, `data-testid="toolbar-snap"`, icon `Magnet` from lucide.
- Click opens a Radix `<Popover>` (`src/components/ui/Popover.tsx` confirmed present) anchored above the button (`side="top"`).
- Popover content: 4 vertical options as buttons — Off / 3 inch / 6 inch / 1 foot. Active option marked with a check icon and `active` styling. Clicking writes `useUIStore.setGridSnap(value)` and closes the popover.
- Button `active` prop wires to `gridSnap > 0` so the button lights up whenever any snap is on.
- Tooltip on the trigger shows current value: `Snap: Off | 3 inch | 6 inch | 1 foot`.

The `<PanelSection id="sidebar-snap">…</PanelSection>` block in `Sidebar.tsx` (lines 54–65) is **REMOVED in Plan 83-02**. The stale Phase 80 comment at L49–52 mentioning "Snap stays here until Phase 83" is also removed. `gridSnap` / `setGridSnap` imports drop from `Sidebar.tsx`.

### D-05 — Display Mode buttons stay in TopBar Utility group (toolbar)

The Normal / Solo / Explode buttons remain in `FloatingToolbar.tsx` (NOT moved to TopBar) under the Utility group, conditionally rendered when `viewMode === "3d" || viewMode === "split"`. Audit hinted at collapsing them behind a disclosure when only 1 room exists; that is deeper restructuring out of Phase 83 scope.

Camera presets (in TopBar) and Export / Help (in TopBar) are unchanged.

### D-06 — Hover labels via existing Radix `<Tooltip>` (Portal-based)

No new label-below-icon rendering. The existing `<Tooltip>` primitive already wraps every button. Keep `side="top"` so labels float above the toolbar (toolbar sits at bottom of viewport — `side="top"` points up into the canvas, which is the only available screen real estate).

`TooltipContent` already uses `<TooltipPrimitive.Portal>` (Tooltip.tsx L37) — escapes any `overflow:hidden` parent. No clipping risk. `TooltipProvider` mounts at the FloatingToolbar root with `delayDuration={200}` per D-18.

Add `collisionPadding={8}` on `<TooltipContent>` so when the toolbar wraps to two rows, tooltips on row 2 don't overlap row 1 buttons — Radix repositions automatically.

### D-07 — Phase 79 WindowPresetSwitcher anchor lifts to clear wrapped toolbar

WindowPresetSwitcher currently mounts at `bottom-32` (`src/components/WindowPresetSwitcher.tsx` L95). After D-03 `flex-wrap` lands at narrow viewports the toolbar grows to 2 rows of ~52 px each (~104 px tall). The switcher chip row must clear the toolbar at 1024 × 768.

Plan 83-01 measures the wrapped toolbar height visually at 1024 × 768 and updates the switcher anchor to `bottom-44` (~176 px from bottom). If 1024 × 768 inspection shows clearance still tight, escalate to `bottom-48` (192 px). Custom-panel below the chip row uses `gap-2` (existing) — stacks naturally above the chip row.

### D-08 — All existing `data-testid` selectors preserved verbatim

Phase 79 + 82 e2e tests rely on:
- `view-mode-2d`, `view-mode-3d`, `view-mode-split`, `view-mode-library`
- `tool-wall`, `tool-door`, `tool-window`, `tool-ceiling`, `tool-stair`, `tool-measure`, `tool-label`, `tool-product`, `tool-select`
- `wall-cutouts-trigger`, `toolbar-undo`, `toolbar-redo`
- `display-mode-normal`, `display-mode-solo`, `display-mode-explode`, `display-mode-segmented`
- `view-mode-segmented`
- `window-preset-switcher`, `window-preset-chip-*` (Phase 79 — unchanged)

NEW additive testids in Phase 83 (no rename of existing): `toolbar-grid-toggle`, `toolbar-snap`, `toolbar-zoom-in`, `toolbar-zoom-out`, `toolbar-fit`. Plan 83-01 Wave 0 grep-validates that every existing testid above is still present in the final JSX before commit.

---

## Phasing Boundaries

| Stays in Phase 83 | Defers to later phase |
|-------------------|-----------------------|
| 44 px hit targets on every tool button (D-01) | Tool-bound contextual surfaces — Phase 84 (IA-08) |
| 5 banded groups with mixed-case labels (D-02) | Display Mode collapse-when-single-room disclosure |
| Responsive `flex-wrap` collapse < 1280 px (D-03) | TopBar redesign beyond current state |
| Snap migration to Utility Popover (D-04, Phase 81 D-05 carry-over) | New tools (column, opening fixture) |
| Hover tooltips with `collisionPadding={8}` (D-06) | Renaming existing `tool-*` testids for consistency |
| WindowPresetSwitcher anchor lift (D-07) | Camera preset move to toolbar |
| Additive `toolbar-*` testids (D-08) | |

---

## Plan Decomposition

Two commit-shaped plans, executed sequentially (wave 1 → wave 2). Plan 02 imports the `ToolGroup` wrapper that Plan 01 introduces and adds a button inside the Utility group it created.

| Plan | Wave | Objective | Issue |
|------|------|-----------|-------|
| 83-01 | 1 | Banded toolbar shape — 44 px sizing + `ToolGroup` wrapper + 5 group layout + responsive `flex-wrap` + WindowPresetSwitcher anchor lift. | #175 (IA-06), #176 (IA-07) |
| 83-02 | 2 | Snap migration — add `<Popover>`-backed Snap button to Utility group; delete sidebar Snap PanelSection. | Phase 81 D-05 carry-over |

---

## Out of Scope (Explicit)

- **New testid renames** — keep `tool-{name}` and `view-mode-{id}` as-is per D-08; only additive new testids.
- **3D-side toolbar changes** — TopBar untouched except no new content.
- **TopBar redesign** — Camera Presets / Export / Help stay where they are.
- **New tools** — column, opening fixture, separate cutout tools all explicitly deferred.
- **Display Mode disclosure** — audit suggestion to collapse Normal/Solo/Explode behind a single button when only 1 room exists is OUT OF SCOPE.
- **3D hover wiring** — already deferred to Phase 82 (shipped).
- **Tool-specific contextual surfaces (Wainscot Library, Custom Elements catalog)** — Phase 84.

---

## Constraints from CLAUDE.md

- **D-09 (UI labels):** Group labels mixed-case ("Drawing", "Measure", "Structure", "View", "Utility") — NOT `.toUpperCase()`. Tooltip text uses mixed-case ("Wall tool", "Snap: 6 inch"). UPPERCASE preserved only for dynamic CAD identifiers in 2D overlay (Phase 83 does not touch overlay).
- **D-15 (icon policy):** lucide-react only. `Magnet` for Snap (recommended) or `Grid3x3` (fallback). No `material-symbols-outlined` imports.
- **D-13 (squircle utilities):** Toolbar container keeps `rounded-2xl` (Tailwind built-in, fine here). New Popover content reuses `rounded-smooth-lg` via `<PopoverContent>` default class.
- **D-39 (reduced motion):** No new animations in Phase 83 — Popover already respects motion preferences via Radix defaults. WindowPresetSwitcher custom-expand animation already guarded.
- **StrictMode-safe cleanup (§7):** `FloatingToolbar.tsx` is purely presentational; no `useEffect` writes to module-level registries. No new test drivers required.
- **PR-on-push:** Every push to `gsd/phase-83-toolbar` MUST be followed by `gh pr create` if no open PR exists. PR body MUST include `Closes #175` + `Closes #176`. PR not opened until both plans verified locally.
