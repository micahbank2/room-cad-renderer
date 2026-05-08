# Phase 74: Toolbar Rework — Floating Action Menu — Research

**Researched:** 2026-05-07
**Domain:** React component extraction + layout refactor (no new dependencies)
**Confidence:** HIGH — all findings verified directly from source files

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Pill container: `fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-0 rounded-2xl border border-border bg-background/90 shadow-2xl backdrop-blur-md p-1.5`
- **D-02:** Two rows inside pill: TopRow and BottomRow separated by `w-full h-px bg-border/30 my-1`
- **D-03:** `max-w-[calc(100vw-24px)]` overflow guard; single-row fallback acceptable
- **D-04:** Top row: Wall (Minus), Door (DoorOpen), Window (RectangleVertical), Ceiling (Triangle), Stairs (Footprints), Wall Cutouts (ChevronDown), Measure (Ruler), Label (Type), Product (Package) — all `Button variant="ghost" size="icon"` with icon `size={22}`
- **D-05:** Stair button must call `setPendingStair({...})` before `setTool("stair")` (Phase 60 pattern verbatim)
- **D-06:** Bottom row: Select (MousePointer size=18) | divider | ZoomIn | ZoomOut | Fit (Maximize) | divider | Undo (toolbar-undo) | Redo (toolbar-redo) | divider | Grid toggle (Grid2x2) | divider | DisplayMode SegmentedControl | divider | ViewMode SegmentedControl
- **D-07:** Active tool: `active` prop on Button → `bg-accent/10`; add `ring-1 ring-accent/40`; REMOVE legacy `shadow-[0_0_15px_rgba(124,91,240,0.3)]` glow
- **D-08:** TopBar shell: `fixed top-0 left-0 right-0 z-40 h-10 flex items-center justify-between px-3 bg-background/80 backdrop-blur-sm border-b border-border/30`
- **D-09:** TopBar left: `InlineEditableText` (same behavior + data-testid `inline-doc-title`)
- **D-10:** TopBar right: ToolbarSaveStatus | divider | Undo | Redo | divider | camera-preset buttons | divider | Export | divider | Library (BookOpen) | Help (HelpCircle) | Settings
- **D-11:** Undo/Redo in BOTH TopBar and floating pill (intentional duplication)
- **D-12:** `ToolbarSaveStatus` extracted as named export inside `src/components/TopBar.tsx`
- **D-13:** `library` viewMode moves to TopBar BookOpen icon button; NOT in pill ViewMode SegmentedControl
- **D-14:** Camera preset buttons (`data-testid="preset-{id}"`) move to TopBar; `bg-accent/10` active state preserved
- **D-15:** `src/components/Toolbar.tsx` — DELETED
- **D-16:** `src/components/Toolbar.WallCutoutsDropdown.tsx` — kept
- **D-17:** App.tsx imports: remove `Toolbar` / `ToolPalette`; add `FloatingToolbar` + `TopBar`
- **D-18:** App.tsx outer layout: verify no layout shift after Toolbar (h-14 flex-col sibling) is removed
- **D-19:** No Material Symbols sweep needed (already done Phase 71)
- **D-20:** All tool buttons get `Tooltip` with `content="{Label} tool"`, `shortcut="{key}"`, `placement="top"`
- **D-21:** All existing `data-testid` attrs preserved verbatim

### Claude's Discretion

- Exact gap/padding inside each row (try `gap-0.5` first, `gap-1` if cramped)
- Whether dividers are `<div>` spacers or CSS margins
- Whether undo/redo in TopBar are removed if they feel redundant during UAT
- Exact WallCutoutsDropdown anchor positioning (currently uses `anchorRef`; may need adjustment for bottom pill vs. left panel)

### Deferred Ideas (OUT OF SCOPE)

- Floor / Wall Art / Wainscoting / Crown placement tool buttons — Phase 75
- Pan tool — not a current ToolType
- Resize handle / compact toggle on floating pill — v1.19
- Animated tool-switch (motion.div layout) — Phase 76
- Camera preset popover (instead of flat buttons in TopBar) — Phase 75
</user_constraints>

---

## Summary

Phase 74 is a pure React refactor — no new npm packages, no new store actions, no new tool types. All behavior already exists in the two exports of `src/components/Toolbar.tsx` (the `Toolbar` header and the `ToolPalette` palette). The work is:

1. Extract and recompose into two new files: `src/components/FloatingToolbar.tsx` (the bottom pill) and `src/components/TopBar.tsx` (the h-10 fixed header).
2. Delete `src/components/Toolbar.tsx`.
3. Swap `<Toolbar>` + `<ToolPalette>` in `App.tsx` for `<TopBar>` + `<FloatingToolbar>`.

The biggest risks are (a) E2E testid regressions if any `data-testid` is mis-typed or omitted, and (b) `WallCutoutsDropdown` anchor positioning — the dropdown uses `getBoundingClientRect()` to position `fixed` above the anchor; when the anchor moves from a left-panel button to a bottom-of-screen pill button, the dropdown will naturally open upward (top: rect.bottom + 4), which places it OFF-SCREEN. This needs an explicit fix.

**Primary recommendation:** Three plans — Plan 01 creates FloatingToolbar, Plan 02 creates TopBar, Plan 03 swaps App.tsx and deletes Toolbar.tsx. Each plan is independently testable.

---

## App.tsx Surgery — Exact Lines and Blocks

### Imports to change (App.tsx lines 23–24)

```typescript
// REMOVE:
import Toolbar from "@/components/Toolbar";
import { ToolPalette } from "@/components/Toolbar";

// ADD:
import { TopBar } from "@/components/TopBar";
import { FloatingToolbar } from "@/components/FloatingToolbar";
```

### JSX block 1 — `<Toolbar>` (App.tsx lines 186–191)

```tsx
// REMOVE this entire element:
<Toolbar
  viewMode={viewMode}
  onViewChange={setViewMode}
  onHome={() => setHasStarted(false)}
  onFloorPlanClick={() => setShowTemplatePicker(true)}
/>

// REPLACE WITH:
<TopBar
  viewMode={viewMode}
  onViewChange={setViewMode}
  onHome={() => setHasStarted(false)}
  onFloorPlanClick={() => setShowTemplatePicker(true)}
/>
```

### JSX block 2 — `<ToolPalette>` (App.tsx line 263)

```tsx
// REMOVE:
<ToolPalette />

// REPLACE WITH:
<FloatingToolbar />
```

`FloatingToolbar` is `fixed`-positioned so its location in the tree doesn't matter for layout. Keep it inside the canvas div for logical grouping.

### Outer layout change (App.tsx line 185)

```tsx
// CURRENT:
<div className="h-full flex flex-col bg-background">
  <Toolbar ... />        {/* h-14 flex-col sibling */}
  <div className="flex flex-1 overflow-hidden"> ...
```

After removing `<Toolbar>`, the `flex-col` container no longer needs to accommodate a flex sibling. The content area becomes the full height. `<TopBar>` is `fixed top-0`, so content must add top padding to avoid being hidden behind it:

```tsx
// The inner content div needs pt-10 (TopBar is h-10):
<div className="flex flex-1 overflow-hidden pt-10">
```

This is the primary layout risk. Verify no content is clipped.

---

## Primitive APIs

### Button (`src/components/ui/Button.tsx`)

```typescript
export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  active?: boolean;  // → adds "bg-accent/10 text-foreground border-ring" when true
}

// Sizes:
// "icon"    → h-9 w-9
// "icon-sm" → h-7 w-7
// "icon-lg" → h-10 w-10
// "sm"      → h-7 px-3 text-xs
// "default" → h-9 px-4 py-2

// Active state: data-active={active || undefined} on the DOM element
```

Active indicator for pill context per D-07:
```tsx
<Button
  active={isActive}
  className={isActive ? "ring-1 ring-accent/40" : ""}
  // NOTE: do NOT add the legacy shadow glow (D-07 drops it)
/>
```

### SegmentedControl (`src/components/ui/SegmentedControl.tsx`)

```typescript
export interface SegmentedControlOption {
  value: string;
  label: string;
  // NOTE: no Icon prop — options are text-only
  // For icon-only pills, caller must put an Icon in label or wrap differently
}

interface SegmentedControlProps {
  value: string;
  onValueChange: (v: string) => void;
  options: SegmentedControlOption[];
  className?: string;
}
```

**Critical finding:** `SegmentedControl.option.label` is a `string`, NOT a React node. It cannot accept a JSX icon. To render icon-only segments (D-06 Display Mode uses icons), the implementer must either:

Option A — Embed a Unicode/text label and hide it visually (not clean).
Option B — Render individual `Button` elements with `active` prop instead of `SegmentedControl` (matches the existing `DISPLAY_MODES` pattern in `Toolbar.tsx` lines 226–248).
Option C — Extend `SegmentedControlOption` to accept `ReactNode` label (touches a Phase 72 primitive).

**Recommendation (Claude's discretion):** Use individual `Button` elements for Display Mode (matching exact current pattern) and use `SegmentedControl` for View Mode (text labels "2D" / "3D" / "Split" work fine). The `data-testid="display-mode-segmented"` and `data-testid="view-mode-segmented"` E2E contracts must be honored — apply the testids to the wrapping `<div role="group">` container for display mode buttons, and to the `<SegmentedControl>` element for view mode. NOTE: the current `Toolbar.tsx` uses individual buttons with `data-testid="display-mode-{id}"` (per button), NOT a `data-testid="display-mode-segmented"` container. The CONTEXT.md D-06 specifies `data-testid="display-mode-segmented"` on the whole SegmentedControl — this is a NEW testid, not a preservation. No E2E test currently asserts it (no display-mode-cycle.spec.ts exists in the specs directory).

### Tooltip (`src/components/ui/Tooltip.tsx`)

The Phase 72 `Tooltip.tsx` is a Radix re-export — NOT the same as the legacy `src/components/Tooltip.tsx` imported in Toolbar.tsx.

```typescript
// Current Toolbar.tsx imports:
import Tooltip from "@/components/Tooltip";  // ← LEGACY component

// Phase 72 primitive is at:
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/Tooltip";
```

**Finding:** `FloatingToolbar` and `TopBar` should use the **legacy** `@/components/Tooltip` (same as current ToolPalette) OR migrate to the Phase 72 Radix primitive. The legacy Tooltip has `content`, `shortcut`, `placement` props. The Phase 72 Tooltip is a Radix compound (Tooltip + TooltipTrigger + TooltipContent). CONTEXT.md D-20 says "Tooltip (Phase 72 primitive from @/components/ui)" — so use the Phase 72 compound API:

```tsx
// Phase 72 Radix pattern:
<Tooltip>
  <TooltipTrigger asChild>
    <Button .../>
  </TooltipTrigger>
  <TooltipContent side="top">
    Wall tool <kbd>W</kbd>
  </TooltipContent>
</Tooltip>
```

Requires `TooltipProvider` at app root. Check whether it is already present in `App.tsx` before adding.

---

## WallCutoutsDropdown Anchor Analysis

**Current behavior (left panel):** Anchor button is in `ToolPalette`, positioned at `absolute left-3 top-3`. The dropdown uses:
```typescript
const rect = el.getBoundingClientRect();
setPos({ top: rect.bottom + 4, left: rect.left });
```
This positions the dropdown BELOW the anchor, which works because the panel is near the top of the screen.

**New behavior (bottom pill):** The anchor button will be near `bottom: 24px` of the viewport. `rect.bottom + 4` will place the dropdown OFF-SCREEN below the viewport.

**Required fix:** In `FloatingToolbar.tsx`, when opening `WallCutoutsDropdown`, the positioning logic must open UPWARD instead. Two options:

Option A — Pass a custom `side` prop to `WallCutoutsDropdown` to flip positioning:
```typescript
// In WallCutoutsDropdown, compute upward:
setPos({ top: rect.top - dropdownHeight - 4, left: rect.left });
```
This requires knowing dropdown height before render (use `ref` + `useLayoutEffect`).

Option B — Use `rect.top` and `translateY(-100%)` CSS trick — simpler:
```typescript
// FloatingToolbar renders dropdown with position:
// top: rect.top - 4, transform: translateY(-100%)
```

Option C — Add a `direction?: "up" | "down"` prop to `WallCutoutsDropdown` and branch the position logic.

**Recommendation:** Option C — add `direction="up"` prop to `WallCutoutsDropdown`. This is a minimal, clean change that doesn't require height measurement. The component already uses `position: fixed` so transform won't conflict.

---

## ToolbarSaveStatus Extraction

Lives at `Toolbar.tsx` lines 382–429. It reads:
```typescript
const status = useProjectStore((s) => s.saveStatus);
const reducedMotion = useReducedMotion();
```

States: `"failed"` → AlertCircle + "SAVE_FAILED"; `"saving"` → Loader2 + "SAVING"; `"saved" | "idle"` → CloudCheck + "SAVED".

Extract as named export `ToolbarSaveStatus` in `src/components/TopBar.tsx`. No props needed — all state from stores.

---

## InlineEditableText Props

```typescript
export interface InlineEditableTextProps {
  value: string;
  onLivePreview: (v: string) => void;
  onCommit: (v: string) => void;
  maxLength?: number;      // default 60
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}
```

Current usage in `Toolbar.tsx` (lines 276–291):
```tsx
<InlineEditableText
  value={displayValue}
  onLivePreview={(v) => setDraftName(v)}
  onCommit={(v) => {
    setDraftName(v);
    commitDraftName();
  }}
  maxLength={60}
  data-testid="inline-doc-title"
  placeholder="Untitled Room"
  className="font-sans text-sm text-foreground text-center min-w-0 max-w-[320px] truncate"
/>
```

Copy this VERBATIM into TopBar.tsx. The `data-testid="inline-doc-title"` must be preserved — `__driveInlineTitleEdit` test driver hard-codes this testid.

---

## Camera Preset Buttons — E2E Contract

From `preset-toolbar-and-hotkeys.spec.ts`:
- Asserts `[data-testid="preset-{id}"]` is clickable
- Asserts `toHaveClass(/bg-accent\/10/)` when that preset is active

The Button `active` prop already adds `bg-accent/10`. The current JSX pattern (Toolbar.tsx lines 188–216) must be preserved verbatim in TopBar.tsx, including:
- `aria-pressed={isActive}`
- `disabled={isWalkMode}`
- `data-testid={`preset-${id}`}`

The preset buttons ONLY render in 3D or split view. TopBar must conditionally render them:
```tsx
{(viewMode === "3d" || viewMode === "split") && (
  // PRESET_ICONS map + PRESETS.map(...)
)}
```

The view mode prop flows from App.tsx into TopBar.

---

## E2E Data-testid Inventory

### Testids that MUST be preserved verbatim

| testid | Current location | New location |
|---|---|---|
| `tool-select` | ToolPalette (via `tools` array) | FloatingToolbar bottom row |
| `tool-wall` | ToolPalette (via `tools` array) | FloatingToolbar top row |
| `tool-door` | ToolPalette (via `tools` array) | FloatingToolbar top row |
| `tool-window` | ToolPalette (via `tools` array) | FloatingToolbar top row |
| `tool-ceiling` | ToolPalette (via `tools` array) | FloatingToolbar top row |
| `tool-stair` | ToolPalette (via `tools` array) | FloatingToolbar top row |
| `tool-measure` | ToolPalette (explicit) | FloatingToolbar top row |
| `tool-label` | ToolPalette (explicit) | FloatingToolbar top row |
| `wall-cutouts-trigger` | ToolPalette (explicit) | FloatingToolbar top row |
| `wall-cutouts-dropdown` | WallCutoutsDropdown | WallCutoutsDropdown (unchanged) |
| `wall-cutout-archway` | WallCutoutsDropdown | WallCutoutsDropdown (unchanged) |
| `wall-cutout-passthrough` | WallCutoutsDropdown | WallCutoutsDropdown (unchanged) |
| `wall-cutout-niche` | WallCutoutsDropdown | WallCutoutsDropdown (unchanged) |
| `toolbar-undo` | ToolPalette (D-06) | FloatingToolbar bottom row |
| `toolbar-redo` | ToolPalette (D-06) | FloatingToolbar bottom row |
| `preset-eye-level` | Toolbar header | TopBar |
| `preset-top-down` | Toolbar header | TopBar |
| `preset-three-quarter` | Toolbar header | TopBar |
| `preset-corner` | Toolbar header | TopBar |
| `inline-doc-title` | Toolbar header | TopBar |
| `display-mode-segmented` | NEW (no current testid) | FloatingToolbar bottom row container |
| `view-mode-segmented` | NEW (no current testid) | FloatingToolbar bottom row container |

### Testids referenced by E2E tests (must survive)

| testid | Test file |
|---|---|
| `preset-{id}` (4 variants) | `preset-toolbar-and-hotkeys.spec.ts`, `preset-active-element-guard.spec.ts`, `preset-mid-tween-cancel.spec.ts`, `preset-no-history-no-autosave.spec.ts`, `preset-view-mode-cleanup.spec.ts` |
| `view-mode-3d` | `ceiling-user-texture-toggle.spec.ts`, `material-apply.spec.ts`, `wallpaper-2d-3d-toggle.spec.ts`, `floor-user-texture-toggle.spec.ts`, `wallart-2d-3d-toggle.spec.ts`, `seedRoom.ts` helper |
| `inline-doc-title` | `__driveInlineTitleEdit` test driver (hard-coded) |

**Critical finding:** `view-mode-3d` testid is used by many E2E tests via `waitForSelector('[data-testid="view-mode-3d"]')`. The current Toolbar renders individual `Button` elements with `data-testid={`view-mode-${mode}`}` (lines 136–154). If Phase 74 replaces these with a SegmentedControl that puts the testid on the container only, these tests will break.

**Required:** The `data-testid="view-mode-3d"` (and `view-mode-2d`, `view-mode-split`) must remain on each individual segment button, NOT only on the container. The `data-testid="view-mode-segmented"` from D-21 goes on the wrapping container as an additional testid.

The `toggleViewMode` playwright helper does: `await page.click('[data-testid="view-mode-${mode}"]')` — this MUST continue to work.

**Note:** `tool-product` is in D-21 list but NOT in the current ToolPalette's `tools` array (product tool is not in the 6-item `tools` array; it's handled differently). CONTEXT D-04 adds `Package` icon button with `data-testid="tool-product"`. This is a NEW button being added.

---

## Architecture Patterns

### New file structure

```
src/components/
  FloatingToolbar.tsx    ← NEW: bottom pill (ToolPalette replacement)
  TopBar.tsx             ← NEW: h-10 fixed header (Toolbar replacement) + ToolbarSaveStatus named export
  Toolbar.tsx            ← DELETED
  Toolbar.WallCutoutsDropdown.tsx  ← KEPT (unchanged)
```

### Component interfaces

```typescript
// FloatingToolbar — no props needed (all state from stores, viewMode handled internally)
export function FloatingToolbar(): JSX.Element

// TopBar — same props as current Toolbar
interface TopBarProps {
  viewMode: "2d" | "3d" | "split" | "library";
  onViewChange: (mode: "2d" | "3d" | "split" | "library") => void;
  onHome?: () => void;
  onFloorPlanClick?: () => void;
}
export function TopBar(props: TopBarProps): JSX.Element

// ToolbarSaveStatus — named export from TopBar.tsx
export function ToolbarSaveStatus(): JSX.Element
```

### Code to copy verbatim from Toolbar.tsx

| Code | Source lines | Destination |
|---|---|---|
| `PRESET_ICONS` map | 48–53 | TopBar.tsx |
| Camera preset JSX | 179–217 | TopBar.tsx |
| `ToolbarSaveStatus` function | 382–429 | TopBar.tsx (named export) |
| `InlineEditableText` usage block | 276–291 | TopBar.tsx |
| `DISPLAY_MODES` config | 56–60 | FloatingToolbar.tsx |
| `TOOL_SHORTCUTS` record | 362–379 | FloatingToolbar.tsx |
| Stair `onSelectTool` pattern | 437–448 | FloatingToolbar.tsx |
| `WallCutoutsDropdown` trigger logic | 455–506 | FloatingToolbar.tsx |

---

## Common Pitfalls

### Pitfall 1: WallCutoutsDropdown opens off-screen
**What goes wrong:** `rect.bottom + 4` with anchor at bottom of screen places dropdown below viewport.
**Prevention:** Add `direction="up"` prop to WallCutoutsDropdown; use `top: rect.top - 4, transform: translateY(-100%)`.

### Pitfall 2: view-mode-{mode} testids broken
**What goes wrong:** Replacing per-button testids with a container testid breaks 6+ E2E tests.
**Prevention:** Keep `data-testid="view-mode-{mode}"` on each button. Add `data-testid="view-mode-segmented"` on the wrapping container only as an ADDITIONAL attribute.

### Pitfall 3: TopBar overlaps content (no pt-10)
**What goes wrong:** Removing h-14 Toolbar from the flex-col layout and adding a fixed TopBar without offsetting the content area causes the top of the canvas to be hidden behind the bar.
**Prevention:** Add `pt-10` to the `flex flex-1 overflow-hidden` content div in App.tsx.

### Pitfall 4: Tooltip import mismatch
**What goes wrong:** Legacy `import Tooltip from "@/components/Tooltip"` has `content`/`shortcut`/`placement` props; Phase 72 `@/components/ui/Tooltip` is a Radix compound. Mixing them causes type errors.
**Prevention:** Pick one and use consistently. Per D-20, use Phase 72 primitive. Wrap each button with `<Tooltip><TooltipTrigger asChild><Button/></TooltipTrigger><TooltipContent side="top">...</TooltipContent></Tooltip>`.

### Pitfall 5: Display mode buttons lose testids
**What goes wrong:** If display mode is implemented as a SegmentedControl with string labels, individual `data-testid="display-mode-{id}"` per button is lost.
**Prevention:** Use individual Buttons with `active` prop (same as current Toolbar.tsx pattern lines 226–248). Each keeps its `data-testid`.

### Pitfall 6: `tool-product` is new — not in current ToolPalette
**What goes wrong:** Assuming `tool-product` testid already exists and just needs moving.
**Prevention:** This is a NEW button in Phase 74. Add `Package` icon button (`data-testid="tool-product"`) in the top row. It calls `setTool("product")`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts` |
| Full suite command | `npx playwright test` |

### Phase Requirements → Test Map

| Behavior | Test Type | Command | File Exists? |
|---|---|---|---|
| Camera preset buttons clickable + bg-accent/10 active | e2e | `npx playwright test tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts` | Yes |
| View mode toggle (view-mode-3d testid) | e2e (indirect) | `npx playwright test tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts` | Yes |
| Undo/Redo buttons functional | manual / new spec | — | No |
| FloatingToolbar renders all tool buttons | manual | — | No |
| WallCutoutsDropdown opens upward | manual | — | No |

### Wave 0 Gaps
- [ ] No automated test for FloatingToolbar pill render or tool button clicks
- [ ] No automated test for TopBar project title or save status
- [ ] `data-testid="tool-product"` is new — no E2E coverage yet

---

## Recommended Plan Structure

**Plan 01 — FloatingToolbar** (`74-01-PLAN.md`)
- Create `src/components/FloatingToolbar.tsx`
- Move `DISPLAY_MODES`, `TOOL_SHORTCUTS`, stair pattern, WallCutoutsDropdown trigger from Toolbar.tsx
- Add `direction="up"` prop to WallCutoutsDropdown
- All top-row + bottom-row buttons with correct testids
- Active ring styling (D-07)

**Plan 02 — TopBar** (`74-02-PLAN.md`)
- Create `src/components/TopBar.tsx`
- Move `PRESET_ICONS`, camera preset JSX, InlineEditableText, undo/redo, ToolbarSaveStatus, export, library/help/settings buttons
- Add `pt-10` offset analysis

**Plan 03 — App.tsx swap + Toolbar.tsx deletion** (`74-03-PLAN.md`)
- Update App.tsx imports
- Replace `<Toolbar>` with `<TopBar>`
- Replace `<ToolPalette>` with `<FloatingToolbar>`
- Add `pt-10` to content div
- Delete `src/components/Toolbar.tsx`
- Run full E2E suite to verify testid contract

---

## Sources

### Primary (HIGH confidence)
- `src/components/Toolbar.tsx` — source of all components to be split/moved
- `src/App.tsx` — exact integration lines
- `src/components/ui/Button.tsx` — Button API + active prop behavior
- `src/components/ui/SegmentedControl.tsx` — SegmentedControl API + label: string constraint
- `src/components/ui/Tooltip.tsx` — Phase 72 Radix compound API
- `src/components/ui/InlineEditableText.tsx` — props + test driver pattern
- `src/components/Toolbar.WallCutoutsDropdown.tsx` — anchor positioning logic
- `src/stores/uiStore.ts` — all store state consumed by both new components
- `tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts` — testid + class assertions
- `tests/e2e/playwright-helpers/toggleViewMode.ts` — `view-mode-{mode}` testid dependency
- `tests/e2e/playwright-helpers/seedRoom.ts` — `view-mode-3d` dependency

## Metadata

**Confidence breakdown:**
- App.tsx surgery: HIGH — exact line numbers read from source
- Primitive APIs: HIGH — read from source files
- WallCutoutsDropdown risk: HIGH — positioning logic verified in source
- E2E testid inventory: HIGH — grepped all spec files
- Plan structure: HIGH — based on locked decisions + direct source analysis

**Research date:** 2026-05-07
**Valid until:** Phase 74 implementation complete (all findings are from local source, no external deps)
