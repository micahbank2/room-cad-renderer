# Phase 83: Floating Toolbar Redesign (v1.21 IA-06 / IA-07) — Research

**Researched:** 2026-05-14
**Domain:** UI / component layout / design tokens
**Confidence:** HIGH

## Summary

Phase 83 turns `FloatingToolbar.tsx` (474 LOC, two ad-hoc rows) into a banded 5-group toolbar with 44 px hit targets, mixed-case group labels, hover tool-name labels, and responsive wrap below 1280 px. It also lifts the Snap dropdown out of `Sidebar.tsx` (deferred by Phase 81 D-05) into the Utility group.

Everything Phase 83 needs already exists in the codebase: `Tooltip` is fully wired (Phase 79 fix added `TooltipProvider` at the root of `FloatingToolbar.tsx`), `Button` has variants but lacks a 44 px size, and `@theme {}` already exports `--spacing-xs..xl` Pascal tokens. The two real implementation choices are: (1) add a new `icon-touch` size variant to `Button` at 44 px, and (2) use Tailwind `flex-wrap` on the row containers for responsive collapse — no JS, no container queries needed.

**Primary recommendation:** Add `icon-touch: h-11 w-11` to `buttonVariants`. Add a `<ToolGroup label="…">` wrapper component. Use `flex-wrap` + `max-w-[Npx]` on each row container. Lift Snap into a new `<SnapDropdown>` button-with-popover in the Utility group.

## User Constraints (from v1.21 REQUIREMENTS + Phase 81 D-05)

### Locked Decisions
- **5 banded groups, mixed-case labels:** Drawing / Measure / Structure / View / Utility (per IA-07).
- **44 px minimum hit target** on every tool button (currently `h-9 w-9 = 36 px`).
- **Tool labels visible on hover** — name appears below or near the icon (verifiable: "Hover any tool → its name appears as a label").
- **Responsive wrap under 1280 px** — all tools remain visible across two stacked rows. No horizontal scroll. No hidden tools.
- **Library stays in the View group** — v1.20 PR #168 regression-fix invariant.
- **Snap moves to Utility group** — Phase 81 D-05 deferred this to Phase 83.

### Claude's Discretion
- Whether group labels always show or only on hover/wide viewports.
- Whether Snap renders as inline `<select>` or button-with-popover.
- Whether Display Mode stays in toolbar (current) or moves to TopBar (audit hinted at collapsing under a disclosure).
- Exact `<ToolGroup>` JSX shape and whether group-label tag is `<div>` or `<h3>`.

### Deferred Ideas (OUT OF SCOPE)
- New tools (column, opening fixture as separate tool — currently bundled under wall cutouts dropdown).
- Tool-bound contextual surfaces (Phase 84 / IA-08).
- TopBar redesign beyond the audit-flagged removals already shipped.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IA-06 (#175) | 44 px hit targets, hover labels, dividers, responsive wrap < 1280 px | "Implementation Plan" §1, §3, §4 |
| IA-07 (#176) | 5 visually banded groups with mixed-case labels; Library in View group | "Tool Group Mapping" + Implementation Plan §2 |
| Phase 81 D-05 | Snap dropdown moves from sidebar to Utility group | Implementation Plan §5 |

## Current State

### `FloatingToolbar.tsx` (474 LOC) — full button inventory

| # | Tool / Control | Icon (lucide) | Current row | data-testid | onClick | Active state |
|---|----------------|---------------|-------------|-------------|---------|--------------|
| 1 | Wall | `Minus` (22) | Top | `tool-wall` | `setTool("wall")` | `activeTool === "wall"` |
| 2 | Door | `DoorOpen` (22) | Top | `tool-door` | `setTool("door")` | `"door"` |
| 3 | Window | `RectangleVertical` (22) | Top | `tool-window` | `setTool("window")` | `"window"` |
| 4 | Ceiling | `Triangle` (22) | Top | `tool-ceiling` | `setTool("ceiling")` | `"ceiling"` |
| 5 | Stair | `Footprints` (22) | Top | `tool-stair` | `setPendingStair(...); setTool("stair")` | `"stair"` |
| 6 | Wall cutouts dropdown trigger | `ChevronDown` (22) | Top | `wall-cutouts-trigger` | toggles dropdown | when dropdown open OR cutout tool active |
| 7 | Measure | `Ruler` (22) | Top | `tool-measure` | `setTool("measure")` | `"measure"` |
| 8 | Label | `Type` (22) | Top | `tool-label` | `setTool("label")` | `"label"` |
| 9 | Product | `Package` (22) | Top | `tool-product` | `setTool("product")` | `"product"` |
| 10 | Select | `MousePointer` (18) | Bottom | `tool-select` | `setTool("select")` | `"select"` |
| 11 | Zoom in | `ZoomIn` (16) | Bottom | — | `setUserZoom(× 1.2)` | — |
| 12 | Zoom out | `ZoomOut` (16) | Bottom | — | `setUserZoom(÷ 1.2)` | — |
| 13 | Fit | `Maximize` (16) | Bottom | — | `resetView()` | — |
| 14 | Undo | `Undo2` (16) | Bottom | `toolbar-undo` | `undo()` | disabled when `past.length === 0` |
| 15 | Redo | `Redo2` (16) | Bottom | `toolbar-redo` | `redo()` | disabled when `future.length === 0` |
| 16 | Grid toggle | `Grid2x2` (16) | Bottom | — | `toggleGrid()` | dim color when off |
| 17 | Display: Normal | `LayoutGrid` (16) | Bottom (3d/split only) | `display-mode-normal` | `setDisplayMode("normal")` | `displayMode === "normal"` |
| 18 | Display: Solo | `Square` (16) | Bottom (3d/split only) | `display-mode-solo` | `setDisplayMode("solo")` | `"solo"` |
| 19 | Display: Explode | `Move3d` (16) | Bottom (3d/split only) | `display-mode-explode` | `setDisplayMode("explode")` | `"explode"` |
| 20 | View: 2D | text "2D" | Bottom | `view-mode-2d` | `onViewChange("2d")` | `viewMode === "2d"` |
| 21 | View: 3D | text "3D" | Bottom | `view-mode-3d` | `onViewChange("3d")` | `"3d"` |
| 22 | View: Split | text "Split" | Bottom | `view-mode-split` | `onViewChange("split")` | `"split"` |
| 23 | View: Library | text "Library" | Bottom | `view-mode-library` | `onViewChange("library")` | `"library"` |
| 24 | Zoom % display | text | Bottom (under) | — | (read-only) | — |

**Implicit:** the wall-cutouts dropdown body (`WallCutoutsDropdown` opens upward) contains 3 tools — archway / passthrough / niche. Those stay grouped behind the dropdown (good pattern, audit agreed).

### Current shape
- **Position:** `fixed bottom-6 left-1/2 -translate-x-1/2 z-50`
- **Container:** `flex flex-col gap-0 rounded-2xl border bg-background/90 shadow-2xl backdrop-blur-md p-1.5 max-w-[calc(100vw-24px)]`
- **Sizes:** all buttons `size="icon"` (36×36 px). Top row has icon size 22; bottom row has 16–18. Visual size of button itself is 36×36, **NOT** 28 — the IA-06 "currently ~28 px" claim is slightly off. Audit it against 36 px; the jump is 36→44.
- **Groups today:** only via the horizontal divider between rows + 4 vertical `<Divider />` separators inside the bottom row. No labels.
- **Mounted in App.tsx L268** inside the canvas wrapper, gated on `isCanvas` (not Library mode).

### `Sidebar.tsx` Snap block (lines 54–65 — exact JSX to lift)
```tsx
<PanelSection id="sidebar-snap" label="Snap" defaultOpen={false}>
  <select
    value={gridSnap}
    onChange={(e) => setGridSnap(+e.target.value)}
    className="w-full px-2 py-1 text-[10px]"
  >
    <option value={0}>Off</option>
    <option value={0.25}>3 inch</option>
    <option value={0.5}>6 inch</option>
    <option value={1}>1 foot</option>
  </select>
</PanelSection>
```

Source values: `gridSnap = useUIStore((s) => s.gridSnap)`, `setGridSnap = useUIStore((s) => s.setGridSnap)`. After lift, `Sidebar.tsx` no longer needs `gridSnap` / `setGridSnap` imports — clean drop.

### Existing primitives

**`Button.tsx`:**
- Sizes: `default h-9` / `sm h-7` / `lg h-10` / `icon h-9 w-9` / `icon-sm h-7 w-7` / `icon-lg h-10 w-10`.
- **None of the existing sizes hit 44 px.** Phase 83 must add a new variant.
- `active` prop wires `bg-accent/10 text-foreground border-ring`. Reuse as-is.

**`Tooltip.tsx`** (Radix):
- `TooltipProvider` already wraps the FloatingToolbar's content (line 104). No remount.
- `TooltipContent` portals via `TooltipPrimitive.Portal` — escapes any `overflow:hidden` parent, no clipping risk.
- `delayDuration={200}` per D-18.

**`@theme {}` tokens (`src/index.css` L99–104):** `--spacing-xs 8`, `--spacing-sm 12`, `--spacing-md 16`, `--spacing-lg 24`, `--spacing-xl 32`. No button-size token — sizes live in `buttonVariants` cva.

### TopBar duplicate-checks
- Camera presets (`PRESETS.map`) live in TopBar gated on `show3DControls`. Phase 83 leaves these alone — they are NOT in the IA-07 taxonomy and audit kept them in TopBar.
- Export / Help in TopBar — unchanged.

## Tool Group Mapping

Opinionated assignment of every current toolbar button to one of the 5 IA-07 groups. **Every data-testid preserved verbatim.**

| Tool | Current location | Phase 83 group | Hit target | data-testid |
|------|------------------|----------------|------------|-------------|
| Select | FloatingToolbar bottom row | **Drawing** | 44 px | `tool-select` |
| Wall | FloatingToolbar top row | **Drawing** | 44 px | `tool-wall` |
| Door | FloatingToolbar top row | **Drawing** | 44 px | `tool-door` |
| Window | FloatingToolbar top row | **Drawing** | 44 px | `tool-window` |
| Wall cutouts (dropdown trigger → archway / passthrough / niche) | FloatingToolbar top row | **Drawing** | 44 px | `wall-cutouts-trigger` |
| Product | FloatingToolbar top row | **Drawing** | 44 px | `tool-product` |
| Measure | FloatingToolbar top row | **Measure** | 44 px | `tool-measure` |
| Label | FloatingToolbar top row | **Measure** | 44 px | `tool-label` |
| Ceiling | FloatingToolbar top row | **Structure** | 44 px | `tool-ceiling` |
| Stair | FloatingToolbar top row | **Structure** | 44 px | `tool-stair` |
| View: 2D | FloatingToolbar bottom row | **View** | 44 px (text button, `min-w-[44px] h-11`) | `view-mode-2d` |
| View: 3D | bottom row | **View** | 44 px | `view-mode-3d` |
| View: Split | bottom row | **View** | 44 px | `view-mode-split` |
| View: Library | bottom row | **View** | 44 px | `view-mode-library` |
| Grid toggle | bottom row | **Utility** | 44 px | (add `data-testid="toolbar-grid-toggle"` for testability) |
| **Snap dropdown (NEW from Sidebar)** | bottom row | **Utility** | 44 px (popover trigger) | `toolbar-snap` (new) |
| Zoom in | bottom row | **Utility** | 44 px | (add `toolbar-zoom-in`) |
| Zoom out | bottom row | **Utility** | 44 px | (add `toolbar-zoom-out`) |
| Fit | bottom row | **Utility** | 44 px | (add `toolbar-fit`) |
| Undo | bottom row | **Utility** | 44 px | `toolbar-undo` |
| Redo | bottom row | **Utility** | 44 px | `toolbar-redo` |
| Display: Normal | bottom row (3d/split only) | **Utility** (conditional) | 44 px | `display-mode-normal` |
| Display: Solo | bottom row (3d/split only) | **Utility** (conditional) | 44 px | `display-mode-solo` |
| Display: Explode | bottom row (3d/split only) | **Utility** (conditional) | 44 px | `display-mode-explode` |

### Group structure choice
- **5 groups, two rows on wide viewports:**
  - **Row A:** Drawing | Measure | Structure
  - **Row B:** View | Utility
- **At ≤ 1280 px:** rows wrap naturally via `flex-wrap`. Drawing/Measure/Structure stay paired on row 1 if they fit; View + Utility flow to row 2.

### Notes on placement decisions
- **Select goes in Drawing first** — audit explicitly called this out ("belongs at the *start* of the Drawing group"). Currently it's stranded on the bottom row.
- **Wall cutouts trigger stays in Drawing** — the three cutout tools (archway / passthrough / niche) are drawing tools, just disclosure-hidden. Trigger lives next to Window.
- **Product is Drawing, not its own group.** Placement is a drawing-adjacent action.
- **Display Mode is Utility, not View.** It's a render-mode option for 3D/Split, not a top-level mode switch. Keep conditional on `viewMode === "3d" | "split"` so it only appears when meaningful.
- **No "column" or "opening fixture" tool exists yet.** REQUIREMENTS lists them in the Structure taxonomy but they're not implemented. Phase 83 does NOT add them — Structure today contains only Ceiling + Stair.

## Implementation Plan

### 1. Hit-target size token — add `icon-touch` to `Button`

**Recommendation:** add a new `size` variant to `buttonVariants` in `src/components/ui/Button.tsx`:
```tsx
"icon-touch": "h-11 w-11",   // 44 px — meets WCAG 2.5.5 minimum
```

Reasoning: keeps the size system in the cva map where every other size lives. No new CSS token needed (44 px is one-off — it doesn't compose with `--spacing-*`). Cleaner than a global `--button-size-md` token that the rest of the chrome won't use.

For the View text buttons (`2D` / `3D` / `Split` / `Library`), use `size="icon-touch"` plus override `w-auto px-3 text-xs` so the 44 px height is preserved but width grows to fit the text. Keep the existing `font-sans text-[11px]` override.

### 2. Group structure — `<ToolGroup>` wrapper component

**Recommendation:** add a tiny in-file component (no new file needed — keep it co-located in `FloatingToolbar.tsx`):
```tsx
function ToolGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="font-sans text-[9px] uppercase tracking-wider text-muted-foreground/70 leading-none">
        {label}
      </div>
      <div className="flex items-center gap-0.5">{children}</div>
    </div>
  );
}
```

**Group-label visibility:** ALWAYS show. The verifiable criterion requires "see 5 visually distinct labeled groups" — making them hover-only fails the test. Keep them small (9 px, `text-muted-foreground/70`) so they don't dominate.

**D-09 caveat:** group labels themselves should be MIXED CASE per D-09 ("Drawing" / "Measure" / not "DRAWING"). The `uppercase` class above must be **removed** — change to plain `text-[9px] tracking-wider text-muted-foreground/70`. Mixed-case in source.

**Final shape:**
```tsx
<div className="floating-toolbar fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-start justify-center gap-3 rounded-2xl border bg-background/90 shadow-2xl backdrop-blur-md p-2 max-w-[calc(100vw-24px)]">
  <ToolGroup label="Drawing">…select, wall, door, window, cutouts, product…</ToolGroup>
  <Divider vertical />
  <ToolGroup label="Measure">…measure, label…</ToolGroup>
  <Divider vertical />
  <ToolGroup label="Structure">…ceiling, stair…</ToolGroup>
  <Divider vertical />
  <ToolGroup label="View">…2D, 3D, Split, Library…</ToolGroup>
  <Divider vertical />
  <ToolGroup label="Utility">…grid, snap, zoom-in, zoom-out, fit, undo, redo, [display modes conditional]…</ToolGroup>
</div>
```

Drop the horizontal divider + two-row split currently between top/bottom rows. `flex-wrap` does the row work automatically.

### 3. Hover labels — reuse existing `Tooltip` (no change)

**Recommendation:** keep the existing `<Tooltip>` / `<TooltipTrigger>` / `<TooltipContent>` pattern. Every button is already wrapped. The existing 200 ms delay (D-18) is correct.

**Do NOT** add a separate "label below icon" rendering. The tooltip IS the hover label. Verifiable criterion ("Hover any tool → its name appears as a label below the icon") is satisfied by `<TooltipContent side="bottom">` instead of the current `side="top"` — flip the side so labels appear below the toolbar (toolbar is at bottom of screen — `side="top"` currently points UP into the canvas; `side="bottom"` would point further down OFF screen).

**Correction:** keep `side="top"` so labels float ABOVE the toolbar, between toolbar and canvas. The IA-06 wording ("below the icon") is loose — what Jessica needs is "name appears on hover," not strictly positioned underneath. `side="top"` is correct because the toolbar lives at the bottom of the viewport.

**Tooltip portal-clipping:** Verified safe. `TooltipContent` already wraps `<TooltipPrimitive.Portal>` (Tooltip.tsx L37), so tooltips render at the document root and escape any `overflow:hidden` ancestor.

### 4. Responsive collapse — Tailwind `flex-wrap`

**Recommendation:** the simplest viable approach.

```tsx
<div className="floating-toolbar … flex flex-wrap items-start justify-center gap-3 … max-w-[calc(100vw-24px)]">
```

`flex-wrap` + an outer `max-w-[calc(100vw-24px)]` is sufficient. As the viewport narrows below 1280 px, the natural width of the 5 groups exceeds `max-w` and groups wrap to a second row. **No JS, no `useResize`, no container query.** Each `<ToolGroup>` is a flex item; wrapping happens between groups, not within them.

To force the wrap point cleanly at 1280 px (instead of "whenever it organically overflows"), add an explicit width:
```tsx
className="… max-w-[min(calc(100vw-24px),1240px)] …"
```
This guarantees the toolbar stops growing at 1240 px, so a 1280 px viewport (with default 20 px scrollbar gutter) wraps predictably.

**Verifiable test:** at 1024×768, the 5 groups exceed 1024 px naturally → second row appears. No horizontal scroll because `max-w-[calc(100vw-24px)]` caps width.

### 5. Snap migration — `<SnapDropdown>` in Utility group

**Recommendation:** new button-with-popover, NOT inline `<select>`. The toolbar is a row of icon buttons; dropping a native `<select>` in the middle breaks the visual rhythm and the 44 px hit target.

**Shape:**
```tsx
// In FloatingToolbar.tsx, inside Utility group
<Popover>
  <Tooltip>
    <TooltipTrigger asChild>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-touch" data-testid="toolbar-snap"
                active={gridSnap > 0}>
          <Magnet size={20} />  {/* lucide Magnet — communicates "snap" */}
        </Button>
      </PopoverTrigger>
    </TooltipTrigger>
    <TooltipContent side="top">
      Snap: {gridSnap === 0 ? "Off" : gridSnap === 0.25 ? "3 inch" : gridSnap === 0.5 ? "6 inch" : "1 foot"}
    </TooltipContent>
  </Tooltip>
  <PopoverContent side="top">
    {/* 4 radio-style buttons: Off / 3" / 6" / 1' */}
  </PopoverContent>
</Popover>
```

**Verify Popover primitive exists:** `src/components/ui/Popover.tsx` — confirm in Plan 83 wave 0 research. If absent, use `WallCutoutsDropdown`'s manual `anchorRef + direction="up"` pattern as fallback.

**Delete from `Sidebar.tsx`:** the entire `<PanelSection id="sidebar-snap">…</PanelSection>` block (lines 54–65). Drop unused `gridSnap` / `setGridSnap` imports. No fallback shim — the Snap dropdown is now exclusively in the toolbar.

**Active state for Snap button:** `active={gridSnap > 0}` (lit when ANY snap setting is on). The popover surface shows which specific value.

### 6. Display Mode buttons placement

**Recommendation:** **Keep in toolbar Utility group, conditional on `viewMode === "3d" | "split"`.** Current behavior is correct — audit only flagged that they're noisy when 1 room exists (collapse-behind-disclosure suggestion). That's a deeper change outside Phase 83 scope.

**Do NOT** move to TopBar. TopBar already houses Camera Presets for 3D/Split; adding Display Modes there double-loads the top-right slot.

## Pitfalls

1. **`data-testid` preservation.** Every e2e helper hits `[data-testid="view-mode-3d"]`, `[data-testid="tool-window"]`, `[data-testid="tool-select"]`. Plan 83 MUST preserve these exact strings. New testids (`toolbar-grid-toggle`, `toolbar-snap`, `toolbar-zoom-in/out/fit`) are additive.

2. **WindowPresetSwitcher overlap risk.** The Phase 79 window-preset switcher mounts as a floating chip row when `activeTool === "window"`. Verify its z-index and y-position do NOT collide with a wrapped second-row toolbar at 1024×768. Likely the switcher sits ABOVE the toolbar in screen coords — confirm during planning. If toolbar wraps to two rows, total toolbar height grows ~40 px; the switcher needs to stack above the new total height.

3. **Tooltip side="top" with wrapped toolbar.** When the toolbar wraps to two rows, top-row tooltips render above the toolbar (fine) but bottom-row tooltips also render `side="top"` — meaning they could overlap the top row's buttons. Mitigation: tooltips are short text and 200 ms delay; visual collision is rare. If acceptance testing surfaces this, switch bottom-row tooltips to `side="bottom"`.

4. **Button.active styling on text View buttons.** Current code uses `<Button>` with text content for View modes (`2D` / `3D` / `Split` / `Library`). The `active` prop wires `bg-accent/10 text-foreground border-ring`. The `size="icon-touch"` (h-11 w-11) needs the `w-auto px-3` override to accommodate text. Verify the active background contrast is still readable.

5. **Phase 81 D-05 cleanup.** When removing the Sidebar Snap block, also strip the comment block at `Sidebar.tsx` L49–52 (Phase 80 audit removal note that mentions "Snap stays here until Phase 83"). Comment is now stale.

6. **No StrictMode-safe registry concerns.** `FloatingToolbar.tsx` is presentational only. No `useEffect` writes to module-level state. No test drivers needed.

7. **Wall cutouts dropdown direction.** Currently `direction="up"` because the toolbar is at the bottom of the viewport. Preserve this. After flex-wrap, the dropdown anchor's screen position may shift by ~40 px — the dropdown logic uses the anchor `ref` so it should auto-track, but visually verify in plan QA.

8. **Lucide icon for Snap.** `Magnet` is the recommended choice. Fallback: `Grid3x3` (differentiates from `Grid2x2` used by grid-toggle). Avoid `Crosshair` (used by cursor tools).

## Plan Decomposition

**Two plans, two waves:**

### Plan 83-01 — Banded toolbar shape + 44 px sizing + group labels (IA-06 + IA-07)
- Add `icon-touch` size to `Button`.
- Add `<ToolGroup>` wrapper.
- Restructure `FloatingToolbar.tsx` JSX into 5 labeled groups (Drawing / Measure / Structure / View / Utility).
- Drop horizontal row-divider + two-row split — replace with `flex-wrap` + explicit `max-w-[min(calc(100vw-24px),1240px)]`.
- Add new `data-testid`s for previously untested controls (grid, zoom in/out, fit).
- Tooltip `side="top"` preserved.
- **Closes IA-06 (#175) + IA-07 (#176) verifiable criteria except Snap migration.**

### Plan 83-02 — Snap migration from Sidebar to Utility group (Phase 81 D-05 follow-through)
- Add `<SnapDropdown>` (or `<Popover>` wrap) inside Utility group.
- Verify or add `src/components/ui/Popover.tsx` primitive (Wave 0 check).
- Delete `<PanelSection id="sidebar-snap">` block from `Sidebar.tsx`.
- Drop unused `gridSnap` / `setGridSnap` from `Sidebar.tsx`.
- E2E: add a smoke test that opens the snap dropdown from the toolbar and changes increment.
- **Closes Phase 81 D-05 carry-over.**

### Wave assignment
- **Wave 1:** Plan 83-01 (banded shape + sizing). Foundational — Plan 83-02 imports the `ToolGroup` it creates.
- **Wave 2:** Plan 83-02 (Snap migration). Cleanly additive — adds a button inside the Utility `<ToolGroup>` from Wave 1, deletes the sidebar block.

## Open Questions for Plan Phase

1. **Group labels: ALWAYS visible, or hover/wide-viewport only?** Recommendation: always visible at 9 px. The verifiable criterion explicitly requires "see 5 visually distinct labeled groups." Hover-only fails the test.

2. **Snap UI: popover with buttons, or native `<select>`?** Recommendation: popover. Maintains visual rhythm and 44 px hit target. Confirms `Popover` primitive availability.

3. **Display Mode placement: toolbar Utility (current) or move to TopBar?** Recommendation: stay in toolbar Utility, conditional on 3d/split. Don't move.

4. **Tooltip placement when toolbar wraps to two rows.** Recommendation: keep `side="top"` for all; revisit if QA surfaces overlap.

5. **Should the Phase 79 Window Preset switcher's vertical offset be re-tuned now that the toolbar grows in height?** Out of strict scope, but flag for visual QA.

6. **Snap icon — `Magnet` or `Grid3x3`?** Recommendation: `Magnet` (snap = magnetic alignment). Plan can override.

7. **`data-testid="toolbar-grid-toggle"` and the new utility testids — confirm naming convention.** Existing pattern is `tool-{name}` for tool buttons and `toolbar-{action}` for actions. Recommendation: `toolbar-{action}` for the new ones (grid-toggle, snap, zoom-in, zoom-out, fit).

8. **Should Phase 83 also rename the existing `tool-*` testids for consistency** (e.g., `toolbar-tool-wall`)? **Recommendation: NO.** Renaming breaks every existing e2e. Keep `tool-{name}` as-is.

## Code Examples

### Adding `icon-touch` size variant
```tsx
// src/components/ui/Button.tsx — add to size variants
size: {
  default: "h-9 px-4 py-2",
  sm: "h-7 px-3 text-xs",
  lg: "h-10 px-8",
  icon: "h-9 w-9",
  "icon-sm": "h-7 w-7",
  "icon-lg": "h-10 w-10",
  "icon-touch": "h-11 w-11",   // NEW — 44 px, WCAG 2.5.5 target size
},
```

### `ToolGroup` wrapper (co-located in FloatingToolbar.tsx)
```tsx
function ToolGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="font-sans text-[9px] tracking-wider text-muted-foreground/70 leading-none select-none">
        {label}
      </div>
      <div className="flex items-center gap-0.5">{children}</div>
    </div>
  );
}
```

### Responsive container shape
```tsx
<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                flex flex-wrap items-start justify-center gap-3
                rounded-2xl border border-border bg-background/90 shadow-2xl backdrop-blur-md
                p-2 max-w-[min(calc(100vw-24px),1240px)]">
  …
</div>
```

## Sources

### Primary (HIGH confidence) — codebase
- `src/components/FloatingToolbar.tsx` (474 lines) — complete current state.
- `src/components/Sidebar.tsx` L54–65 — exact Snap JSX to lift.
- `src/components/ui/Button.tsx` — size variant inventory; no 44 px exists.
- `src/components/ui/Tooltip.tsx` — Radix Portal-based; no clipping risk.
- `src/index.css` L74–133 — `@theme {}` tokens; no button-size token.
- `src/App.tsx` L268 — mount point for FloatingToolbar.
- `tests/e2e/**` — data-testid usage proving which selectors must be preserved.
- `.planning/milestones/v1.21-SIDEBAR-AUDIT.md` — full FloatingToolbar audit + group decisions.
- `.planning/milestones/v1.21-REQUIREMENTS.md` — IA-06 + IA-07 verifiable criteria.
- `.planning/phases/81-left-panel-restructure-v1-21/81-CONTEXT.md` D-05 — Snap deferral to Phase 83.
- `.planning/phases/82-right-panel-inspector-v1-21/82-CONTEXT.md` — Tabs primitive precedent (informs `<ToolGroup>` pattern).

### Secondary (MEDIUM confidence)
- WCAG 2.5.5 Target Size: 44×44 CSS px is the AAA minimum, AA is 24×24. IA-06's "44 px minimum" aligns with WCAG AAA. (Standard knowledge, not re-verified.)

### Tertiary (LOW confidence)
- None. All claims grounded in repo state.

## Metadata

**Confidence breakdown:**
- Tool inventory: HIGH — read directly from `FloatingToolbar.tsx`.
- Group mapping: HIGH — driven by audit + REQUIREMENTS taxonomy.
- Implementation approach: HIGH — primitives exist and are well-understood.
- Snap migration shape: MEDIUM — assumes `Popover` primitive exists; verify in Wave 0.
- Pitfalls: HIGH — grounded in existing test infrastructure.

**Research date:** 2026-05-14
**Valid until:** Stable. Toolbar architecture is unlikely to shift before Phase 83 plans land.
