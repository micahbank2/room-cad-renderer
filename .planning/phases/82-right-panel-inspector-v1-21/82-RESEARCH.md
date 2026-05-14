# Phase 82: Right Panel Inspector (v1.21 IA-04 / IA-05) — Research

**Researched:** 2026-05-14
**Domain:** React component IA / Zustand-driven contextual UI
**Confidence:** HIGH (codebase patterns are well established; all referenced primitives exist; Phase 79 + Phase 81 set the precedent)

## Summary

Phase 82 converts `PropertiesPanel.tsx` (1010-line vertical scroll grab-bag) into a tabbed **contextual inspector** mounted only when something is selected, with per-entity-type tab sets. The biggest surface to move is the Phase 79 Window Preset chip row out of `OpeningsSection`'s expanded-row body and into the first slot of a new `Preset` tab when a window opening is selected.

Two structural facts make this cheaper than it looks:
1. `App.tsx` (L272–286 / L304–317) **already** gates `PropertiesPanel` behind `selectedIds.length > 0` and already wraps it in `AnimatePresence` + slide-in. The "thin rail when nothing is selected" is currently implemented as "no panel at all". Phase 82 must decide whether to keep that (empty = nothing) or render an actual rail.
2. A fully-functional `<Tabs>` primitive already exists at `src/components/ui/Tabs.tsx` (Phase 72) with `Tabs / TabsList / TabsTrigger / TabsContent`, motion-react sliding pill, reduced-motion aware. **Do not build a new one.**

**Primary recommendation:** Reuse `<Tabs>`. Build one new shell component `RightInspector.tsx` that owns selection-type dispatch and tab state. Extract each existing inspector block (wall, product, ceiling, custom element, stair, opening) into its own `*Inspector.tsx` file so `PropertiesPanel.tsx` shrinks from 1010 → ~200 lines (just shared subcomponents: `Row`, `EditableRow`, `RotationPresetChips`, `SavedCameraButtons`).

---

## User Constraints (from CONTEXT.md)

> No CONTEXT.md exists for Phase 82 yet (will be authored by `/gsd:discuss-phase`). Requirements pulled from `v1.21-REQUIREMENTS.md` IA-04 + IA-05.

### Locked Decisions (from requirements doc)
- Right panel **must not mount inspector body** when selection is empty (IA-04 "thin rail")
- Selection → tabbed inspector by object type (IA-04)
- Window Preset switcher = **first control** in a `Preset` tab (IA-05)
- **Phase 79 single-undo invariant for preset switching MUST be preserved** (IA-05)

### Claude's Discretion
- Tab set per entity type (recommendations below)
- Empty-rail visual treatment (recommend: no rail — keep current "panel not mounted" behavior; surface room properties via left-panel `RoomSettings` per audit)
- Tab persistence behavior (recommend: reset to default tab on every new selection)
- New file structure (recommend: extract per-entity inspectors)

### Deferred Ideas (OUT OF SCOPE)
- Settings button wire-up (audit finding; Phase 76)
- TopBar undo/redo removal (audit finding; not IA-04/05 scope)
- Wainscot / framed art library contextual mount (IA-08 → Phase 84)

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IA-04 | Right panel = contextual inspector, mounts on selection, tabs per object type | Existing mount gate in `App.tsx`; existing `<Tabs>` primitive (Phase 72); per-entity blocks already discriminated in `PropertiesPanel.tsx` L311–651 |
| IA-05 | Window Preset switcher lives in `Preset` tab as first control; single-undo invariant preserved | Phase 79 D-09 derive-on-read pattern in `derivePreset()`; chip click already does a single `updateOpening(...)` call (L110–116 of `OpeningSection.tsx`) — moving the JSX preserves invariant for free |

---

## Current State

### PropertiesPanel files inventory

| File | Lines | Renders | Selection types handled |
|------|-------|---------|-------------------------|
| `src/components/PropertiesPanel.tsx` | 1010 | Root dispatcher + Multi-select branch + No-selection Room block + Ceiling / Wall / Product / Custom Element inspector blocks (inline JSX) + 5 shared subcomponents (`RotationPresetChips`, `SavedCameraButtons`, `LabelOverrideInput`, `CeilingDimInput`, `Row` / `EditableRow`) + `__driveRotationPreset` test driver | All — multi (L220–267), none (L272–303), ceiling (L311–363), wall (L365–421), product (L423–528), custom element (L530–624), product overrides (L626–636), stair dispatch (L638–651) |
| `src/components/PropertiesPanel.OpeningSection.tsx` | 291 | Per-wall openings list (`OpeningsSection`), per-opening collapsible row (`OpeningRow`), per-opening editor (`OpeningEditor`), **Phase 79 `WindowPresetRow`** (window-only, L78–163), shared `NumericRow` | Walls (children of wall inspector) |
| `src/components/PropertiesPanel.StairSection.tsx` | 337 | Width / Rise / Run / Step count / Rotation / Label inputs for selected stair | Stairs |
| `src/components/WallSurfacePanel.tsx` | 354 | Wainscoting style picker + crown molding toggle (wall-finish editor; called from wall block at L411) | Walls |

**Shared subcomponents inside `PropertiesPanel.tsx` that must survive the refactor** (move to a new `PropertiesPanel.shared.tsx`):
- `RotationPresetChips` (L44–79) — used by product + custom-element inspectors
- `SavedCameraButtons` (L87–171) — used by every entity inspector
- `Row` (L891–898) — read-only label/value row
- `EditableRow` (L900–976) — click-to-edit numeric row
- `LabelOverrideInput` (L676–799) — custom-element only
- `CeilingDimInput` (L811–889) — ceiling only

### How the right panel mounts today (`src/App.tsx`)

```
L264: 2D / Split branch wraps the canvas + a slide-in panel
L272–286:   <AnimatePresence>
              {selectedIds.length > 0 && <motion.div w-72>
                <PropertiesPanel productLibrary viewMode />
              </motion.div>}
            </AnimatePresence>
L291–319: 3D / Split branch repeats the same pattern with a separate
          AnimatePresence (key="properties-panel-3d")
```

**Important:** `PropertiesPanel.tsx` L272–303 (the no-selection "Properties (room)" block) **is dead code** — `App.tsx` never mounts the panel when `selectedIds.length === 0`. The audit confirms this (right-panel audit note).

### Existing UI primitives (`src/components/ui/`)

| File | Status for Phase 82 |
|------|---------------------|
| `Tabs.tsx` | **Reuse.** Motion-react sliding-pill, role=tablist/tab/tabpanel, reduced-motion aware. Imperative API: `<Tabs value onValueChange>` + `<TabsList><TabsTrigger value="...">` + `<TabsContent value="...">` |
| `PanelSection.tsx` | Keep using for *within-tab* grouping where it makes sense. Persists open/closed state under `ui:propertiesPanel:sections` localStorage key. |
| `SegmentedControl.tsx` | Alternative to `<Tabs>` — not recommended for inspector top-level; consider for the custom-element face selector (currently hand-rolled at L578–605 of `PropertiesPanel.tsx`) if cleaning that up in passing |
| `Button`, `Input`, `Tooltip`, `Popover`, `Switch`, `Slider`, `InlineEditableText`, `GestureChip`, `FloatingSelectionToolbar`, `Dialog` | Available, mostly unchanged by this phase |

### Phase 79 Window Preset switcher — current location

File: `src/components/PropertiesPanel.OpeningSection.tsx`
- `WindowPresetRow` (L87–163): renders derived label + 5 chips + Custom chip, **inside the expanded body of an `OpeningRow`** (L165–224), which itself is inside `OpeningsSection` (L35–53), which is rendered from `PropertiesPanel.tsx` L410 inside the wall block.
- Three nested levels deep from the wall inspector root: `Wall → OpeningsSection → OpeningRow (collapsed by default) → OpeningEditor → WindowPresetRow`. Jessica has to: select wall → scroll to Openings → expand the right opening → see chips.
- Single-undo mechanism: each chip's `onClick` calls `applyPreset(p)` → `update(wall.id, opening.id, { width, height, sillHeight })` — exactly one history push per click (L110–116, L173 wires `update` = `useCADStore(s => s.updateOpening)`).
- Derive-on-read pattern: `derivedId = derivePreset({ width, height, sillHeight })` is recomputed on every render from the canonical `Opening` fields — no `presetId` is persisted (D-09 invariant from Phase 79).
- Test hooks: `data-testid="opening-preset-label"`, `data-testid="opening-preset-chip-{openingId}-{presetId}"`, `data-testid="opening-preset-chip-{openingId}-custom"`. These are read by `tests/windowTool.preset.test.tsx` and `tests/e2e/specs/window-presets.spec.ts` (L195).

### `__driveWindowPreset` — what it actually is

`__driveWindowPreset` lives in `src/canvas/tools/windowTool.ts` L183–197 and **drives the floating placement chips** (Phase 81 `WindowPresetSwitcher.tsx`), not the PropertiesPanel chip row. The PropertiesPanel chips are exercised in tests via direct `getByTestId("opening-preset-chip-...")` clicks, not a driver. **Phase 82 does NOT need to rename or move `__driveWindowPreset`.** The PropertiesPanel-side e2e (`window-presets.spec.ts:195`) reads chips by data-testid; the data-testids must be preserved verbatim when the row moves into the `Preset` tab.

### Selection state plumbing (`src/stores/uiStore.ts`)

`selectedIds: string[]` — array, supports multi-select. Phase 82 needs to read:
- `selectedIds.length === 0` → no inspector (handled by `App.tsx` mount gate)
- `selectedIds.length > 1` → multi-select branch (already exists, keep mostly as-is, optionally move into the tab system as a single "Bulk" tab)
- `selectedIds.length === 1` → discriminate by entity type. Existing pattern in `PropertiesPanel.tsx` L205–212 does sequential lookups across `walls / placedProducts / ceilings / placedCustoms / stairs`. Phase 82 should keep the same discriminator — it's correct and cheap.

**Edge case for opening selection:** Today, selecting an *opening* is not a first-class selection — Jessica selects the wall, then expands the opening row. IA-04 + IA-05 require window/door openings to have their own inspector tab set (`Preset / Dimensions / Position`). Either:
- (a) elevate openings to selectable entities by introducing a synthetic selection ID format (e.g. `"opening:wallId:openingId"`) — large change, risky
- (b) keep "select wall → see Openings tab in wall inspector → select an opening row inside that tab to reveal Preset / Dimensions / Position sub-controls" — much smaller change
- (c) when a wall has exactly one opening and the user clicks the opening's 2D glyph, auto-select that opening as a sub-selection that the inspector recognizes — middle ground

Recommend **(b)** — it preserves the current selection model and the Phase 81 conditional-mount precedent. The audit also describes the wall inspector as having an "Openings" tab, not separate opening selection.

---

## Inspector Tab Spec (opinionated)

| Selection type | Tab order | Source for each tab |
|----------------|-----------|---------------------|
| **Wall** | `Geometry` / `Material` / `Openings` / `Camera` (collapsed) | Geometry: EditableRow length/thickness/height (current L370–396); Position read-only collapsed inside Geometry. Material: `WallSurfacePanel` (wainscot + crown molding). Openings: `OpeningsSection` — but the **window** preset row moves up into the **Window** opening's own `Preset` tab (see below). Camera: `SavedCameraButtons` |
| **Window opening** | `Preset` / `Dimensions` / `Position` | Preset: the Phase 79 chip row, lifted out of `OpeningEditor` and rendered as the first control here. Dimensions: width / height / sill `NumericRow`s (already in `OpeningEditor`). Position: offset `NumericRow` |
| **Door opening** | `Dimensions` / `Position` | Door has no preset story. Use the existing `OpeningEditor` numeric rows |
| **Archway / Passthrough / Niche** | `Dimensions` / `Position` | Same — the niche depth-in-inches input stays on the Dimensions tab |
| **Product** | `Dimensions` / `Finish` / `Rotation` / `Camera` (collapsed) | Dimensions: current product dimensions block + the conditional "Set dimensions" inputs for catalog-without-dims products + `Reset size` button. Finish: `MaterialPicker` (current L455–471) + the read-only Material/Category rows (currently L446–453 in their own section — fold into Finish). Rotation: rotation display + `RotationPresetChips`. Camera: `SavedCameraButtons` |
| **Custom element** | `Dimensions` / `Label` / `Material` / `Rotation` / `Camera` (collapsed) | Dimensions: current width/depth/height + `Reset size`. Label: `LabelOverrideInput`. Material: face selector (L578–605, candidate for `<SegmentedControl>` cleanup but optional) + `MaterialPicker`. Rotation: `RotationPresetChips`. Camera: `SavedCameraButtons` |
| **Ceiling** | `Geometry` / `Material` / `Camera` (collapsed) | Geometry: `CeilingDimInput` (width, depth) + read-only height + vertices + `Reset size`. Material: `MaterialPicker`. Camera: `SavedCameraButtons` |
| **Stair** | `Geometry` / `Steps` / `Position` / `Camera` (collapsed) | Geometry: Width + Rotation + Label from `StairSection`. Steps: Rise / Run / Step count from `StairSection`. Position: future. Camera: `SavedCameraButtons`. (Easiest for v1.21 to keep `StairSection` whole and put it under a single `Properties` tab; tab-splitting it can wait — flag as discretion.) |
| **Multi-select (2+)** | Single `Bulk` "tab" or skip tabs entirely | The bulk-actions branch is short (~50 lines) and only has 2 controls (paint all walls, delete all). Recommend rendering WITHOUT `<Tabs>` — the inspector shell shows a `Bulk actions` header and the existing controls. Simpler and matches the existing UX. |

**Bottom action `Delete element` button** stays anchored at the bottom of the inspector regardless of active tab — outside the `<Tabs>` component, inside the inspector shell.

---

## Implementation Plan

### 1. Tab primitive — REUSE

Use `src/components/ui/Tabs.tsx` as-is. No new primitive needed.

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";

<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="geometry">Geometry</TabsTrigger>
    <TabsTrigger value="material">Material</TabsTrigger>
    <TabsTrigger value="openings">Openings</TabsTrigger>
  </TabsList>
  <TabsContent value="geometry">…</TabsContent>
  ...
</Tabs>
```

### 2. Inspector shell — new file

Create `src/components/RightInspector.tsx`. Responsibilities:
1. Read `selectedIds` from `uiStore`.
2. If `selectedIds.length === 0` → render `null` (mount gate stays in `App.tsx` for slide animation — no change).
3. If `selectedIds.length > 1` → render the current bulk-actions JSX inline (no tabs).
4. If `selectedIds.length === 1` → discriminator (mirror existing `PropertiesPanel.tsx` L205–212), then render the matching `*Inspector` component which is its own file (`WallInspector.tsx`, `ProductInspector.tsx`, `CeilingInspector.tsx`, `CustomElementInspector.tsx`, `StairInspector.tsx`, `OpeningInspector.tsx`).
5. Own the per-entity-type `activeTab` state (recommend `useState` reset on entity-id change via `useEffect`).
6. Anchor the bottom `Delete element` button outside `<Tabs>`.

Mount point in `App.tsx`: **replace the two `<PropertiesPanel>` mounts** at L282 and L314 with `<RightInspector productLibrary viewMode />`. The `AnimatePresence` slide-in stays. The `selectedIds.length > 0` gate stays.

### 3. Empty rail

**Recommend: keep the current behavior — no rail when nothing is selected.** The audit's "thin rail" framing in IA-04 reads as "the panel collapses to nothing", which is what `App.tsx` already does. Adding a literal thin strip means dead chrome competing for canvas attention. If Jessica needs room properties when nothing is selected, those go in the left panel's `RoomSettings` (which already exists, per Phase 81 + audit row L17). Flag as Open Question for user confirmation.

### 4. OpeningSection → Window inspector migration

The trickiest piece, but mechanically simple once selection is sorted (see edge case (b) above):

**If pursuing approach (b) — opening becomes a sub-selection inside the wall inspector:**
1. Add a `selectedOpeningId: string | null` to `uiStore` (or transient state inside `RightInspector`).
2. The wall inspector's `Openings` tab renders the current `OpeningsSection` list but **without** the `WindowPresetRow` inside each window's `OpeningEditor`.
3. Clicking an opening row promotes that opening to "active" — the wall inspector swaps from the Wall tabs (`Geometry / Material / Openings`) to the Opening tabs (`Preset / Dimensions / Position`) with a "← Back to wall" breadcrumb at the top.
4. The `Preset` tab body is the existing `WindowPresetRow` JSX, lifted intact from `OpeningSection.tsx`. **The `update(wall.id, opening.id, {width, height, sillHeight})` call inside `applyPreset` is unchanged → single-undo invariant preserved automatically.**
5. The `Dimensions` tab is the existing `NumericRow`s for width / height / sill.
6. The `Position` tab is the existing `offset` `NumericRow` (and the niche depth-inches input for `niche` openings).
7. Preserve all `data-testid` values (`opening-preset-label`, `opening-preset-chip-{id}-{preset}`, `opening-preset-chip-{id}-custom`) verbatim so existing tests/e2e pass without modification.

**Files touched:**
- `OpeningSection.tsx`: split `WindowPresetRow` into its own file `WindowPresetTab.tsx` (or keep inline in `OpeningInspector.tsx`). Remove the `{opening.type === "window" && <WindowPresetRow>}` block from `OpeningEditor`.
- New: `OpeningInspector.tsx` — receives `wall`, `opening`; renders `<Tabs>` with `Preset / Dimensions / Position`; the `Preset` tab is the lifted JSX.
- `WallInspector.tsx` — receives `wall`; renders `<Tabs>` with `Geometry / Material / Openings / Camera`; clicking an opening row inside the `Openings` tab sets the "active opening" state in the parent shell, which then renders `<OpeningInspector>` in place of `<WallInspector>`.

### 5. Backward compat — room properties when nothing is selected

Per audit recommendation: the no-selection room properties block (`PropertiesPanel.tsx` L272–303) is dead code in current `App.tsx`. Leave it dead — **don't migrate it.** Room dimensions are already in `RoomSettings.tsx` on the left panel (per Phase 81 IA-02). Flag as Open Question to confirm Jessica doesn't want a fallback in the right rail.

---

## Pitfalls

### 1. Single-undo invariant for preset switching (HIGH risk if mishandled)
**What goes wrong:** Refactoring `WindowPresetRow` and accidentally adding a debounce, an intermediate `setState`, or splitting `width/height/sillHeight` into three separate `update*` calls would multiply history entries.
**Why it happens:** Phase 79 chose a single `updateOpening({ width, height, sillHeight })` write specifically because that's one snapshot push. A naive "let me clean this up" refactor could split it.
**Prevention:** Lift the `WindowPresetRow` JSX verbatim into the `Preset` tab. Do not touch the `applyPreset` body. Add a regression test that clicks a preset chip and asserts `useCADStore.getState().past.length` increments by exactly 1 (mirror the existing test in `tests/windowTool.preset.test.tsx`).

### 2. StrictMode-safe cleanup for tab state per selection
**What goes wrong:** If tab state lives in a `useEffect` that writes to a module-level Map keyed by entity id (e.g. "remember last tab per wall"), StrictMode's double-mount will write twice and the cleanup must use identity-check (CLAUDE.md §7).
**Prevention:** Keep `activeTab` in plain `useState` inside `RightInspector`, reset to default on entity-id change via a `useEffect` that compares `prevId` to current. No module-level state.

### 3. Tab state on entity swap
**What goes wrong:** Jessica selects Wall A, clicks the `Openings` tab, then selects Wall B — does it stay on `Openings` or reset to `Geometry`?
**Recommendation (Open Question):** Reset to the default first tab on every new entity id. Per-entity tab persistence is enterprise-app cruft for a single-user tool — Jessica's mental model is fresh selection = fresh inspector. Confirm with user.

### 4. E2E driver compatibility
**What goes wrong:** `tests/e2e/specs/window-presets.spec.ts` L195 reads `[data-testid="opening-preset-chip-{openingId}-picture"]` directly. If the preset chip is inside a tab that's not the active one, Playwright's locator either fails (because the chip isn't rendered — `<TabsContent>` returns `null` when inactive, see `Tabs.tsx` L112–113) or, depending on selection model, fails entirely if openings aren't a first-class selection.
**Prevention:** Choose approach (b) cleanly. In the e2e, after selecting a wall and reaching the Openings tab, click the opening row → assert the Preset tab is rendered → click the preset chip. The e2e file will need a 3-line update (click into the opening row before clicking the chip). Document this in the plan.

### 5. `WindowPresetSwitcher` (floating) is NOT affected
Phase 81's floating chrome (mounts when `activeTool === "window"`) is unchanged by Phase 82. Reviewers will see two preset surfaces and may confuse them. Add a docblock on `WindowPresetSwitcher.tsx` and `OpeningInspector.tsx`'s `Preset` tab cross-referencing each other.

### 6. AnimatePresence key uniqueness across 2D/3D mounts
`App.tsx` uses `key="properties-panel"` (L275) and `key="properties-panel-3d"` (L307). When `RightInspector` replaces `PropertiesPanel`, preserve those distinct keys so the slide-in animation runs in both viewmodes.

---

## Plan Decomposition

Recommend **3 plans**, each in its own wave for clean dependency order:

### Plan 82-01 — Inspector shell + per-entity inspector extraction (RED → GREEN)
Mostly mechanical refactor. No new IA. Risk = test churn.
- Extract shared subcomponents from `PropertiesPanel.tsx` into `PropertiesPanel.shared.tsx` (`Row`, `EditableRow`, `RotationPresetChips`, `SavedCameraButtons`, `LabelOverrideInput`, `CeilingDimInput`)
- Create `RightInspector.tsx` shell with selection discriminator + bulk-select branch
- Create `WallInspector.tsx`, `ProductInspector.tsx`, `CeilingInspector.tsx`, `CustomElementInspector.tsx`, `StairInspector.tsx` — each a pass-through with the existing JSX, NO tabs yet (just a single content block)
- Replace `PropertiesPanel` mounts in `App.tsx` with `RightInspector`
- Keep `PropertiesPanel.tsx` as a thin re-export shim for one wave (test-driver continuity) or delete in same wave if test driver `__driveRotationPreset` moves to `PropertiesPanel.shared.tsx`
- **Gate:** all existing PropertiesPanel tests pass unchanged; no visual diff

### Plan 82-02 — Tab system per entity (IA-04 surface)
Adds `<Tabs>` to each `*Inspector.tsx` with the tab sets above. Bulk-select stays untabbed.
- Wall: `Geometry / Material / Openings / Camera`
- Product: `Dimensions / Finish / Rotation / Camera`
- Ceiling: `Geometry / Material / Camera`
- Custom element: `Dimensions / Label / Material / Rotation / Camera`
- Stair: `Properties / Camera` (defer fine-grained tab split — flag as Open Question)
- Add `useState<string>` for `activeTab` inside each inspector; reset on entity-id change via `useEffect`
- Audit which `PanelSection` collapsibles are now redundant inside tabs (Position rows under Geometry, etc.) and either remove or keep nested
- **Gate:** clicking each entity surfaces tabs in the documented order; default tab is the first; tab persists during interaction but resets on new selection

### Plan 82-03 — Window opening sub-selection + Preset tab (IA-05 surface)
The semantically biggest plan.
- Decide sub-selection model (recommend approach (b) above)
- New `OpeningInspector.tsx` with `Preset / Dimensions / Position` tabs
- Lift `WindowPresetRow` verbatim into the `Preset` tab (preserve all `data-testid`s)
- Update `OpeningsSection` so clicking an opening row sets the "active opening" state (instead of toggling the expanded body)
- Add "← Back to wall" breadcrumb in `OpeningInspector`
- Regression tests:
  - History-length test: click preset chip → `past.length` increments by exactly 1
  - Phase 79 derive-on-read still passes: no `presetId` field on `Opening`
  - E2E (`window-presets.spec.ts`): update the 3 affected tests to click into opening row first
- **Gate:** Phase 79 single-undo invariant verified; IA-05 acceptance criteria met (select window → Preset tab → 5 chips + Custom are first visible control)

---

## Open Questions for Plan Phase

1. **Empty-state inspector:** Confirm "no rail when nothing selected" is acceptable. Alternative: render a 32px-wide collapsed strip with a hint icon. Recommend **no rail** — matches current behavior, simpler.

2. **Opening sub-selection model:** Approve approach (b) — opening is a sub-selection of the wall inspector with a back-breadcrumb, not a first-class `selectedIds` entry. Alternative: extend `selectedIds` to support `"opening:wallId:openingId"` strings (bigger blast radius across selectTool, fabricSync, all entity discriminators). Recommend **(b)**.

3. **Tab persistence on entity swap:** Reset to the first tab on every new selection vs. remember-last-tab-per-entity-type vs. remember-last-tab-globally. Recommend **reset to first tab on every new selection** — single-user app, fresh mental model per click.

4. **Stair tab decomposition:** Split into `Geometry / Steps / Position / Camera` or keep flat as `Properties / Camera`? `StairSection` is already a clean unit; splitting feels like over-engineering for Jessica's frequency-of-use. Recommend **flat for now**, revisit if she asks.

5. **Bulk multi-select inside tabs?** Recommend **no tabs** — the bulk-select branch is two controls; a single-tab UI is noise. Render the existing JSX verbatim inside `RightInspector`.

6. **Animation when switching tabs:** `<Tabs>` already ships a motion-react sliding-pill that respects `useReducedMotion`. No additional animation needed.

7. **Inspector width:** Current `w-72` (288px) in `App.tsx` L276. Tabs add `~32px` of top chrome (the TabsList row). Recommend **keep w-72** — content already fits.

8. **Default tab per entity:** Recommend `Wall → Geometry`, `Window → Preset`, `Door → Dimensions`, `Product → Dimensions`, `Ceiling → Geometry`, `Custom Element → Dimensions`, `Stair → Properties`. Per IA-05 spec, window default MUST be `Preset` — Jessica's first visible control on window select.

9. **Camera tab visibility:** Today every entity has Save Camera / Clear buttons inline. Should the Camera tab be hidden when there's no `savedCameraPos` and the viewMode is 2D (the buttons disable)? Recommend **always render the tab**; the disabled state is sufficient feedback.

10. **What about saved camera angles for Walls / Custom Elements / Stairs?** Audit recommends collapsing these "by default" — under a tab system "collapse" maps to "place in last tab". The current recommendation puts Camera as the rightmost tab on every entity that has it; if Jessica never opens that tab, it costs her nothing. Confirm acceptable.

---

## Validation Architecture

> `workflow.nyquist_validation` not explicitly disabled in `.planning/config.json` (file not opened in this research; assume enabled per default).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library (unit/integration); Playwright (e2e) |
| Config files | `vitest.config.ts`, `playwright.config.ts` (verify; standard for this repo) |
| Quick run command | `npm run test -- tests/PropertiesPanel.*.test.tsx` (per-file) |
| Full suite command | `npm run test && npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IA-04 | Click empty canvas → no inspector body | unit (RTL) | `npm run test -- tests/RightInspector.empty.test.tsx -x` | ❌ Wave 0 |
| IA-04 | Click wall → tabs `Geometry / Material / Openings / Camera` visible in that order | unit (RTL) | `npm run test -- tests/RightInspector.wall.test.tsx -x` | ❌ Wave 0 |
| IA-04 | Click product → tabs `Dimensions / Finish / Rotation / Camera` visible in order | unit (RTL) | `npm run test -- tests/RightInspector.product.test.tsx -x` | ❌ Wave 0 |
| IA-04 | Click ceiling → tabs `Geometry / Material / Camera` | unit (RTL) | `npm run test -- tests/RightInspector.ceiling.test.tsx -x` | ❌ Wave 0 |
| IA-04 | Click custom element → tabs `Dimensions / Label / Material / Rotation / Camera` | unit (RTL) | `npm run test -- tests/RightInspector.customElement.test.tsx -x` | ❌ Wave 0 |
| IA-04 | Click stair → stair inspector renders | unit (RTL) | `npm run test -- tests/RightInspector.stair.test.tsx -x` | ❌ Wave 0 |
| IA-04 | Multi-select → bulk-actions branch, no tabs | unit (RTL) | `npm run test -- tests/RightInspector.bulk.test.tsx -x` | ❌ Wave 0 |
| IA-04 | New entity selection resets `activeTab` to default | unit (RTL) | `npm run test -- tests/RightInspector.tabReset.test.tsx -x` | ❌ Wave 0 |
| IA-05 | Window selection → `Preset` is the active default tab; 5 preset chips + Custom render | unit (RTL) | `npm run test -- tests/OpeningInspector.preset.test.tsx -x` | ❌ Wave 0 |
| IA-05 | Preset chip click → `past.length` increments by exactly 1 (single-undo invariant) | unit (Zustand history) | `npm run test -- tests/OpeningInspector.singleUndo.test.tsx -x` | ❌ Wave 0 |
| IA-05 | Ctrl+Z after preset switch reverts dims to prior state | unit (Zustand history) | (same as above, additional case) | ❌ Wave 0 |
| IA-05 | E2E: place window → click it → Preset chips are first visible inspector control | e2e (Playwright) | `npx playwright test tests/e2e/specs/inspector-window-preset.spec.ts` | ❌ Wave 0 |
| IA-04 + IA-05 | Phase 79 derive-on-read invariant preserved: no `presetId` field on `Opening` | unit (type / behavior) | `npm run test -- tests/windowPreset.deriveOnRead.test.ts` | ✅ may already exist; verify (`tests/windowTool.preset.test.tsx` has related coverage) |
| IA-04 | Existing tests in `PropertiesPanel.*` continue to pass against `RightInspector` shim | unit (regression) | `npm run test -- tests/` | ✅ existing |

### Sampling Rate
- **Per task commit:** `npm run test -- tests/RightInspector.*.test.tsx tests/OpeningInspector.*.test.tsx`
- **Per wave merge:** `npm run test` (full Vitest suite — covers PropertiesPanel regression)
- **Phase gate:** `npm run test && npm run test:e2e` green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/RightInspector.empty.test.tsx` — IA-04 empty-state behavior
- [ ] `tests/RightInspector.wall.test.tsx` — IA-04 wall tabs
- [ ] `tests/RightInspector.product.test.tsx` — IA-04 product tabs
- [ ] `tests/RightInspector.ceiling.test.tsx` — IA-04 ceiling tabs
- [ ] `tests/RightInspector.customElement.test.tsx` — IA-04 custom-element tabs
- [ ] `tests/RightInspector.stair.test.tsx` — IA-04 stair inspector
- [ ] `tests/RightInspector.bulk.test.tsx` — IA-04 multi-select
- [ ] `tests/RightInspector.tabReset.test.tsx` — IA-04 tab reset on swap
- [ ] `tests/OpeningInspector.preset.test.tsx` — IA-05 default Preset tab + chip rendering
- [ ] `tests/OpeningInspector.singleUndo.test.tsx` — IA-05 history-length invariant
- [ ] `tests/e2e/specs/inspector-window-preset.spec.ts` — IA-05 e2e flow
- [ ] Update `tests/e2e/specs/window-presets.spec.ts` to click opening row before chip (existing tests may break otherwise)

---

## Project Constraints (from CLAUDE.md)

- **StrictMode-safe cleanup pattern (CLAUDE.md §7):** No module-level state for inspector tab persistence. Use `useState` + `useEffect` with identity-check cleanup if any registry/global is touched. The `__driveRotationPreset` test-mode driver in `PropertiesPanel.tsx` L982 already follows this pattern — preserve.
- **D-09 UI labels:** Tab labels are mixed case (`Geometry`, `Material`, `Openings`, `Preset`, `Dimensions`, `Position`, `Camera`, `Finish`, `Rotation`, `Label`, `Steps`, `Properties`). UPPERCASE preserved only for dynamic CAD identifiers inside tab bodies (`WALL_SEGMENT_{id}`, `{PRODUCT_NAME_UPPERCASED}`).
- **D-10 dynamic identifiers preserved:** All `data-testid` values stay verbatim.
- **D-13 squircle radii:** Use `rounded-smooth-md` on the inspector shell (already in `PropertiesPanel.tsx` L306).
- **D-34 spacing:** Use canonical `--spacing-*` tokens via Tailwind utilities (`p-3 / p-4 / gap-3` etc.). No arbitrary values.
- **D-15 icons:** Lucide only. No Material Symbols.
- **Single-undo invariant (Phase 31 + Phase 79):** Every commit path inside an inspector field must push exactly one history entry. Preview writes use `*NoHistory` variants; commits use the history-pushing variants.
- **GSD workflow:** All edits go through `/gsd:execute-phase`.

---

## Code Examples

### Reference: existing `<Tabs>` usage shape

```tsx
// src/components/RightInspector.tsx (new)
import { useState, useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";

export function RightInspector({ productLibrary, viewMode }) {
  const selectedIds = useUIStore((s) => s.selectedIds);
  // … existing discriminator from PropertiesPanel.tsx L205–212 …

  if (selectedIds.length === 0) return null;
  if (selectedIds.length > 1) return <BulkActions />;

  if (wall) return <WallInspector wall={wall} viewMode={viewMode} />;
  if (pp)   return <ProductInspector pp={pp} productLibrary={productLibrary} viewMode={viewMode} />;
  // …
}

// src/components/WallInspector.tsx (new)
export function WallInspector({ wall, viewMode }) {
  const [activeTab, setActiveTab] = useState("geometry");
  useEffect(() => setActiveTab("geometry"), [wall.id]); // reset on entity swap

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="geometry">Geometry</TabsTrigger>
        <TabsTrigger value="material">Material</TabsTrigger>
        <TabsTrigger value="openings">Openings</TabsTrigger>
        <TabsTrigger value="camera">Camera</TabsTrigger>
      </TabsList>
      <TabsContent value="geometry">{/* EditableRow length/thickness/height */}</TabsContent>
      <TabsContent value="material"><WallSurfacePanel /></TabsContent>
      <TabsContent value="openings"><OpeningsSection wall={wall} /></TabsContent>
      <TabsContent value="camera"><SavedCameraButtons … /></TabsContent>
    </Tabs>
  );
}
```

### Reference: Phase 79 single-undo invariant — DO NOT CHANGE

```tsx
// Current in OpeningSection.tsx L110–116 — single store call, single history push
function applyPreset(p: { width: number; height: number; sillHeight: number }) {
  update(wall.id, opening.id, {
    width: p.width,
    height: p.height,
    sillHeight: p.sillHeight,
  });
}
// In Phase 82, this body MOVES into the Preset tab content — body itself is unchanged
```

---

## Sources

### Primary (HIGH confidence — read directly from worktree)
- `src/components/PropertiesPanel.tsx` (1010 lines)
- `src/components/PropertiesPanel.OpeningSection.tsx` (291 lines)
- `src/components/PropertiesPanel.StairSection.tsx` (337 lines)
- `src/components/ui/Tabs.tsx` (Phase 72 — full Tabs primitive)
- `src/components/ui/PanelSection.tsx` (Phase 72 collapsible)
- `src/components/ui/` directory listing (Button, Dialog, FloatingSelectionToolbar, GestureChip, InlineEditableText, Input, PanelSection, Popover, SegmentedControl, Slider, Switch, Tabs, Tooltip)
- `src/App.tsx` L260–340 (mount points)
- `.planning/milestones/v1.21-REQUIREMENTS.md` (IA-04, IA-05)
- `.planning/milestones/v1.21-SIDEBAR-AUDIT.md` (right-panel audit table)
- `tests/e2e/specs/window-presets.spec.ts` (existing e2e contract)
- `tests/windowTool.preset.test.tsx` (existing single-undo test pattern)
- `src/canvas/tools/windowTool.ts` L183–197 (`__driveWindowPreset` floating chrome driver — not affected by Phase 82)
- `./CLAUDE.md` (§7 StrictMode pattern; D-09 / D-10 / D-13 / D-15 / D-34 design tokens)

### Secondary (MEDIUM confidence)
None — all decisions are codebase-verified.

### Tertiary (LOW confidence)
None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `<Tabs>` exists, `<PanelSection>` exists, motion-react in use, Zustand stores stable
- Architecture: HIGH — pattern matches Phase 81 conditional-mount precedent and Phase 79 single-undo invariant
- Pitfalls: HIGH — single-undo, StrictMode, and selection-edge-case all directly observed in code

**Research date:** 2026-05-14
**Valid until:** 2026-06-14 (30 days — stable codebase, no fast-moving external deps in scope)
