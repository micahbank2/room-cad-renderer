# Phase 74: Toolbar Rework — Floating Action Menu — Context

**Gathered:** 2026-05-08
**Status:** Ready for planning
**Mode:** --auto (all decisions made from recommended defaults + roadmap spec)

<domain>
## Phase Boundary

Replace the top-left vertical `Toolbar.tsx` with two new components:

1. **FloatingToolbar** — a glass-pill floating at `fixed bottom-6 left-1/2 -translate-x-1/2 z-50` with two rows: top row (building-block / placement tools, chunky icons) and bottom row (manipulation tools, compact icons + SegmentedControls).
2. **TopBar** — a minimal `fixed top-0 left-0 right-0 z-40 h-10` bar carrying: project name (InlineEditableText), save status, camera presets, undo/redo, export, and library/help/settings buttons.

Old `Toolbar.tsx` is deleted. `Toolbar.WallCutoutsDropdown.tsx` is kept and imported by FloatingToolbar.

**In scope:**
- `src/components/FloatingToolbar.tsx` — new floating pill (new file)
- `src/components/TopBar.tsx` — new minimal header (new file)
- `src/components/Toolbar.tsx` — DELETED
- `src/App.tsx` — swap `<Toolbar>` + `<ToolPalette>` for `<TopBar>` + `<FloatingToolbar>`
- All `data-testid` attributes preserved verbatim (E2E regression prevention)

**Out of scope:**
- New tool types (Floor / Wall Art / Wainscoting / Crown as placement tools → Phase 75)
- Sidebar restructure (Phase 75)
- Modal primitives (Phase 76)
- Pan tool — not a ToolType; omit from Phase 74

</domain>

<decisions>
## Implementation Decisions

### Floating Pill Shell

- **D-01:** Pill container: `fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-0 rounded-2xl border border-border bg-background/90 shadow-2xl backdrop-blur-md p-1.5`
- **D-02:** Two rows inside the pill: `<TopRow>` and `<BottomRow>` separated by a `w-full h-px bg-border/30 my-1` divider
- **D-03:** Pill must not overflow on narrow screens — use `max-w-[calc(100vw-24px)]` and let it wrap if needed (single-row fallback is acceptable)

### Top Row — Building-Block Tools

- **D-04:** Top row tools in order (left→right), each as `Button variant="ghost" size="icon"` with icon `size={22}` (~1.5× the default 18):
  1. **Wall** — `Minus` icon, `data-testid="tool-wall"`, shortcut W
  2. **Door** — `DoorOpen` icon, `data-testid="tool-door"`, shortcut D
  3. **Window** — `RectangleVertical` icon (D-15 substitute), `data-testid="tool-window"`, shortcut N
  4. **Ceiling** — `Triangle` icon (D-15 substitute), `data-testid="tool-ceiling"`, shortcut C
  5. **Stairs** — `Footprints` icon (D-15 substitute), `data-testid="tool-stair"`, shortcut (existing)
  6. **Wall Cutouts** — `ChevronDown` button triggers `WallCutoutsDropdown` (existing component); `data-testid="wall-cutouts-trigger"`; active when `activeTool ∈ {archway, passthrough, niche}`
  7. **Measure** — `Ruler` icon, `data-testid="tool-measure"`, shortcut M
  8. **Label** — `Type` icon, `data-testid="tool-label"`, shortcut T
  9. **Product** — `Package` icon, `data-testid="tool-product"` — activates product placement tool

- **D-05:** Stair tool click must also call `setPendingStair({...})` exactly as in the current `ToolPalette` (preserve Phase 60 pattern verbatim)

### Bottom Row — Manipulation Tools

- **D-06:** Bottom row layout (left→right):
  1. **Select** — `MousePointer` icon `size={18}`, `data-testid="tool-select"`, shortcut V — this is the only ToolType from bottom row that calls `setTool`
  2. Thin divider `w-px h-5 bg-border/40`
  3. **Zoom In** — `ZoomIn size={16}` — calls `setUserZoom(userZoom * 1.2)`
  4. **Zoom Out** — `ZoomOut size={16}` — calls `setUserZoom(userZoom / 1.2)`
  5. **Fit** — `Maximize size={16}` — calls `resetView()`, shortcut 0
  6. Thin divider
  7. **Undo** — `Undo2 size={16}` — disabled when `pastLen === 0`, `data-testid="toolbar-undo"`
  8. **Redo** — `Redo2 size={16}` — disabled when `futureLen === 0`, `data-testid="toolbar-redo"`
  9. Thin divider
  10. **Grid toggle** — `Grid2x2 size={16}` — toggle; active state uses `text-foreground`, inactive `text-muted-foreground/60`
  11. Thin divider
  12. **Display Mode** — `SegmentedControl` (Phase 72 primitive), icon-only, 3 options: `LayoutGrid` (normal), `Square` (solo), `Move3d` (explode); `data-testid="display-mode-segmented"`
  13. Thin divider
  14. **View Mode** — `SegmentedControl`, text labels: "2D" | "3D" | "Split"; `data-testid="view-mode-segmented"`

### Active Tool Indicator

- **D-07:** Active tool gets `active` prop on Button primitive (→ `bg-accent/10` per Button variant). Additionally add `ring-1 ring-accent/40` class when active for stronger visibility on the glass background. Remove the legacy `shadow-[0_0_15px_rgba(124,91,240,0.3)]` glow — this is a Phase 71-era artifact.

### TopBar (project name + utilities)

- **D-08:** TopBar shell: `fixed top-0 left-0 right-0 z-40 h-10 flex items-center justify-between px-3 bg-background/80 backdrop-blur-sm border-b border-border/30`
- **D-09:** Left slot: project name `InlineEditableText` (same component and behavior as current Toolbar center slot — Phase 33 GH #88 contract preserved verbatim)
- **D-10:** Right slot (left→right): `ToolbarSaveStatus` (existing sub-component extracted from Toolbar.tsx) | divider | **Undo** (`Undo2 size={16}`) | **Redo** (`Redo2 size={16}`) | divider | Camera-preset buttons (Phase 35 CAM-01) using existing `PRESET_ICONS` map | divider | **Export** button (`ZoomIn`-like, calls `exportRenderedImage()`) | divider | **Library** icon button (`BookOpen size={16}`, switches to `library` viewMode) | **Help** (`HelpCircle size={16}`, calls `openHelp()`) | **Settings** (`Settings size={16}`) — all `Button variant="ghost" size="icon-sm"`
- **D-11:** Undo/Redo appear in BOTH the TopBar (right slot) and the floating pill bottom row — this duplication is intentional; TopBar provides quick access without moving cursor to bottom; floating pill has it for muscle-memory consistency with Pascal. If duplication feels odd during UAT, remove from TopBar and keep in pill.
- **D-12:** Save status `ToolbarSaveStatus` is extracted from Toolbar.tsx into a standalone named export in `src/components/TopBar.tsx`

### Library View Mode

- **D-13:** The `library` view mode (currently a tab in Toolbar) moves to the TopBar right slot as a `BookOpen` icon button. It is NOT part of the floating pill View Mode SegmentedControl (which shows only 2D/3D/Split — the three canvas-rendering modes).

### Camera Presets (Phase 35 CAM-01)

- **D-14:** Camera preset buttons (PersonStanding / MapIcon / Box / CornerDownRight, `data-testid="preset-{id}"`) move to the TopBar right slot. The `active` state ring (`bg-accent/10`) and Phase 35 E2E test contract (`data-testid="preset-{id}"`) are preserved exactly.

### Old Toolbar Deletion

- **D-15:** `src/components/Toolbar.tsx` — DELETED after FloatingToolbar + TopBar ship
- **D-16:** `src/components/Toolbar.WallCutoutsDropdown.tsx` — kept; imported by FloatingToolbar
- **D-17:** App.tsx: remove `import Toolbar, { ToolPalette } from "@/components/Toolbar"`; add `import { FloatingToolbar } from "@/components/FloatingToolbar"` and `import { TopBar } from "@/components/TopBar"`. Remove `<Toolbar>` JSX and `<ToolPalette>` JSX. Add `<TopBar>` at the top level and `<FloatingToolbar>` inside the canvas flex container (it is `fixed` so position in tree doesn't matter, but keep it near canvas for logical grouping).
- **D-18:** App.tsx outer container: remove `flex-col` if `<Toolbar>` was the flex-col sibling; the main content area should now be `flex-1 overflow-hidden` with the TopBar floating above. Verify no layout shift after removal.

### Material Symbols

- **D-19:** Already removed in Phase 71 (D-15 substitutes in place throughout Toolbar.tsx). No additional sweep needed. The `// D-15: substitute for material-symbols '...'` comments may be retained for documentation.

### Tooltip

- **D-20:** All tool buttons get `Tooltip` (Phase 72 primitive from `@/components/ui`) with `content="{Label} tool"` and `shortcut="{key}"` where applicable. Placement: `"top"` for all buttons in the floating pill (tooltip appears above the pill, not overlapping it). Exception: WallCutoutsDropdown — tooltip says "Wall cutouts".

### Data-testid Preservation

- **D-21:** All existing `data-testid` attrs from ToolPalette must appear verbatim on the corresponding button in FloatingToolbar:
  - `tool-select`, `tool-wall`, `tool-door`, `tool-window`, `tool-ceiling`, `tool-stair`, `tool-measure`, `tool-label`, `wall-cutouts-trigger`, `toolbar-undo`, `toolbar-redo`
  - Camera preset tests: `preset-eye-level`, `preset-top-down`, `preset-three-quarter`, `preset-corner`
  - Display mode: `display-mode-segmented` (whole SegmentedControl)
  - View mode: `view-mode-segmented` (whole SegmentedControl)

### Claude's Discretion

- Exact gap/padding values inside each row (try `gap-0.5` first, `gap-1` if cramped)
- Whether dividers are `<div>` spacers or CSS margins
- Whether undo/redo in TopBar are removed if they feel redundant (decide during UAT)
- Exact WallCutoutsDropdown anchor positioning (currently uses `anchorRef`; may need adjustment for bottom pill vs. left panel)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Toolbar (to be replaced)
- `src/components/Toolbar.tsx` — current ToolPalette + Toolbar implementation; read before deleting
- `src/components/Toolbar.WallCutoutsDropdown.tsx` — kept; read before referencing

### Phase 72 Primitives (used throughout)
- `src/components/ui/Button.tsx` — `variant`, `size`, `active` prop contract
- `src/components/ui/SegmentedControl.tsx` — used for Display Mode + View Mode
- `src/components/ui/Tooltip.tsx` — wraps every tool button
- `src/components/ui/index.ts` — barrel exports

### Phase 35 Camera Presets (behavior to preserve)
- `src/three/cameraPresets.ts` — `PRESETS` array + `PresetId` type
- `tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts` — `data-testid="preset-{id}"` contract + `bg-accent/10` active class assertion

### Phase 47 Display Modes (to fold into bottom row)
- `src/stores/uiStore.ts` — `displayMode`, `setDisplayMode`, `viewMode`, view mode state

### Phase 52 Keyboard Shortcuts (must not change)
- `src/lib/shortcuts.ts` — all shortcut keys; FloatingToolbar reads but does NOT modify

### Phase 60 Stair Tool (pattern to preserve)
- `src/canvas/tools/stairTool.ts` — `setPendingStair()` must be called before `setTool("stair")` (D-05)

### Phase 33 Project Title (behavior to preserve)
- `src/components/ui/InlineEditableText.tsx` — editable project title; Phase 33 GH #88 contract

### App Integration
- `src/App.tsx` — where Toolbar + ToolPalette are currently mounted; the swap point

### Design Tokens
- `src/index.css` — `bg-background/90`, `backdrop-blur-md`, `bg-border/30` tokens

### Roadmap spec
- `.planning/ROADMAP.md` §Phase 74 — Success Criteria SC-1 through SC-5 are the acceptance contract

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable from Current Toolbar.tsx
- `ToolbarSaveStatus` component (lines ~382–430) — extract to TopBar.tsx as named export
- `PRESET_ICONS` map (lines ~37–44) — copy to TopBar.tsx
- `DISPLAY_MODES` config array (lines ~47–53) — move to FloatingToolbar.tsx
- `TOOL_SHORTCUTS` record — move to FloatingToolbar.tsx

### Established Patterns
- `Button variant="ghost" size="icon"` — standard for all tool buttons
- `Tooltip` wrapping buttons — Phase 72 pattern
- `active` prop on Button — gives `bg-accent/10`; augment with `ring-1 ring-accent/40` for pill context

### Integration Points
- `src/App.tsx` lines ~186–195 — current `<Toolbar>` mount; replace with `<TopBar>`
- `src/App.tsx` `<ToolPalette>` absolute-positioned inside canvas div — replace with `<FloatingToolbar>` (fixed-positioned, render anywhere)
- `useUIStore` — `activeTool`, `setTool`, `showGrid`, `toggleGrid`, `userZoom`, `setUserZoom`, `resetView`, `displayMode`, `setDisplayMode`, `cameraMode`, `activePreset`, `requestPreset`, `openHelp`
- `useCADStore` — `undo`, `redo`, `past.length`, `future.length`
- `useProjectStore` — `activeName`, `draftName`, `setDraftName`, `setActiveName`

### E2E Tests That Touch Toolbar
- `tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts` — camera preset buttons + display mode
- `tests/e2e/specs/display-mode-cycle.spec.ts` — `data-testid` on display mode control

</code_context>

<deferred>
## Deferred Ideas

- Floor / Wall Art / Wainscoting / Crown as placement tool buttons in top row — Phase 75 (these require new ToolType entries or sidebar-focus patterns)
- Pan tool — not a current ToolType; skip Phase 74
- Resize handle on floating pill — v1.19
- Compact/expanded pill toggle — v1.19
- Animated tool-switch (motion.div layout) inside pill — Phase 76 if needed
- Camera preset popover (instead of flat buttons in TopBar) — Phase 75

</deferred>

---

*Phase: 74-toolbar-rework*
*Context gathered: 2026-05-08*
