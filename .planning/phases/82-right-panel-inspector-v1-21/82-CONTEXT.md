# Phase 82: Right Panel Inspector (v1.21 IA-04 / IA-05) — Context

**Gathered:** 2026-05-14
**Status:** Ready for planning
**Branch:** `gsd/phase-82-inspector`
**Closes:** #173 (IA-04), #174 (IA-05)

<domain>
## Phase Boundary

Convert `PropertiesPanel.tsx` (1010-line vertical scroll grab-bag) into a tabbed contextual inspector mounted only when something is selected, with per-entity-type tab sets. The biggest surface to move is the Phase 79 Window Preset chip row out of `OpeningsSection`'s expanded-row body and into the first slot of a new `Preset` tab when a window opening is selected.

**In scope (IA-04, IA-05):**
- Replace `PropertiesPanel` with a new `RightInspector` shell that dispatches by selected entity type.
- Per-entity inspector files: `WallInspector`, `ProductInspector`, `CustomElementInspector`, `CeilingInspector`, `StairInspector`, `OpeningInspector`.
- Reuse the Phase 72 `<Tabs>` primitive — no new tab UI.
- Window opening surfaces a `Preset / Dimensions / Position` tab set; the Phase 79 chip row is lifted verbatim into the `Preset` tab.
- Sub-selection model: opening becomes a sub-selection of the parent wall (no change to the `selectedIds` plumbing).

**Out of scope (separate phases / out of v1.21 IA-04+IA-05):**
- Settings button wire-up (Phase 76).
- TopBar undo/redo removal (audit finding; not IA-04 scope).
- Wainscot / framed art library contextual mounts (IA-08 → Phase 84).
- Stair tab decomposition — stairs stay flat for v1.21.
- Empty-state thin rail — keep current behavior (panel does not mount when `selectedIds.length === 0`).

</domain>

<decisions>
## Implementation Decisions

### D-01 — Empty selection = no right panel
Current `App.tsx` behavior is preserved. When `selectedIds.length === 0`, the right side of the screen renders nothing. No thin rail, no placeholder hint, no "select something" copy. The 2D/3D canvas takes the full width minus the left sidebar. `<AnimatePresence>` slide-in stays gated on `selectedIds.length > 0` — `RightInspector` itself returns `null` for the empty case as a defense-in-depth duplicate of the mount gate. The dead "no-selection Room properties" code in `PropertiesPanel.tsx` L272–303 is NOT migrated; room dimensions live in the left sidebar's `RoomSettings` (Phase 81 IA-02).

### D-02 — Window/door opening selection is a sub-selection of its parent wall
Click on a window in the 2D canvas → `selectedIds` is `[wallId]` (the parent wall — same as today). A separate `uiStore.selectedOpeningId: string | null` tracks the sub-selected opening. The inspector shows the WALL tabs by default; when `selectedOpeningId` is set AND it matches an opening on the currently-selected wall, the wall inspector swaps into an OPENING sub-state with a "← Back to wall" breadcrumb. Clearing `selectedOpeningId` (via the breadcrumb, or via the wall changing, or via Escape) restores the wall view.

No change to `selectTool` / `fabricSync` `selectedIds` plumbing. No synthetic `"opening:wallId:openingId"` selection IDs. No first-class opening selection.

### D-03 — Tab resets to the first tab on every new selection
No persistence. No memory per-entity-type. No memory per-session. Each new selection starts at tab index 0. Implementation: each non-stair inspector keys its `<Tabs>` local state on the entity id (either via `key={entityId}` on the Tabs root, or `useState` + `useEffect(() => setActiveTab(default), [entityId])`). Clean, predictable, matches Figma. (Audit Open Question 3 resolved.)

### D-04 — Stairs stay flat (single pane, no tabs)
The `StairInspector` renders all properties in one unified scrolling section — width, rise, run, step count, rotation, label override, saved camera buttons. No tab list at the top. Tabs can be added in a future phase when the stair feature gains more properties. (Audit Open Question 4 resolved.)

### D-05 — Tab list per entity type (final)
- **Wall:** `Geometry` / `Material` / `Openings`
- **Window opening (sub-selection):** `Preset` / `Dimensions` / `Position`
- **Door opening (sub-selection):** `Type` / `Dimensions` / `Position`
  - The `Type` tab is a passive "Door" label + (future) hinge-side toggle. For Phase 82 it can render just the type label and a TODO note; the existing door has no other type-level controls. Acceptable to keep it minimal so the tab list stays consistent with the window flow.
- **Archway / Passthrough / Niche openings (sub-selection):** treat as door — `Type` / `Dimensions` / `Position`. The niche depth-inches input lives on the `Dimensions` tab.
- **Product:** `Dimensions` / `Material` / `Rotation`
  - The current Phase 69 per-placement `Finish` MaterialPicker folds into the `Material` tab. The read-only category / library-material rows also live on `Material`.
  - The "set dimensions" inputs (for catalog products without dimensions) live on the `Dimensions` tab.
  - The `Reset size` button is rendered inline on `Dimensions` when overrides are set.
- **Custom element:** `Dimensions` / `Label` / `Material`
  - Per-face selector + MaterialPicker live on `Material`.
  - Rotation chips live on `Dimensions` (rotation is geometric, not material).
  - `LabelOverrideInput` lives on `Label`.
  - `Reset size` inline on `Dimensions` when overrides are set.
- **Ceiling:** `Geometry` / `Material`
  - Width / Depth / Height / Vertices on `Geometry`. `Reset size` inline.
  - `MaterialPicker` on `Material`.
- **Stair:** (flat single-pane per D-04)

Camera buttons (Save / Clear) drop off the tab list entirely — they render below the tab body as a single trailing row, alongside the existing "Delete element" button. (This is a simplification of the research recommendation; Camera was originally proposed as its own tab. Reasoning: it's a power-user action used rarely, and Jessica never asked for a tab home for it. Render it as a trailing row regardless of active tab so it's always reachable.)

### D-06 — Existing data-testids preserved
The Phase 79 PropertiesPanel preset chips use `data-testid="opening-preset-chip-{id}-{presetId}"`, `data-testid="opening-preset-chip-{id}-custom"`, `data-testid="opening-preset-label"`. These selectors MUST keep working after the IA-05 migration into the `Preset` tab — same selectors, just inside a tab. The Phase 79 e2e (`tests/e2e/specs/window-presets.spec.ts`) and unit tests (`tests/windowTool.preset.test.tsx`) MUST pass after Plan 82-03 with at most a 3-line update to drive the new "click opening row to surface Preset tab" pre-step.

Likewise preserved: `data-testid="opening-row-{openingId}"`, `data-testid="opening-depth-{openingId}"`, `data-testid="save-camera-btn"`, `data-testid="clear-camera-btn"`, `data-rotation-preset={deg}`.

### D-07 — Phase 79 single-undo invariant preserved mechanically
`WindowPresetRow` JSX (PropertiesPanel.OpeningSection.tsx L87–163) moves into the Preset tab content **verbatim**. The single `update(wall.id, opening.id, { width, height, sillHeight })` call inside `applyPreset` (L110–116) is unchanged — moving the JSX doesn't touch that logic. `past.length` MUST increment by exactly 1 per chip click.

No new `*NoHistory` helpers. No new store actions. No debounce. No splitting width/height/sillHeight into separate writes. A regression test in Plan 82-03 asserts `past.length` delta = 1 after a single chip click.

### D-08 — Phase 79 derive-on-read preserved
No new `presetId` field on `Opening` type. The Preset tab continues to call `derivePreset(opening)` to compute the active chip from current dimensions. Phase 79 D-09 invariant intact — verified by reading `src/types/cad.ts` L95–108 confirming `Opening` has no `presetId`. No snapshot migration. No data model change.

### Claude's Discretion
- Whether each inspector's `Tabs` state lives in the parent `RightInspector` (lifted) or inside each `*Inspector` component (local). Recommend **local** — simpler, no prop drilling, each inspector owns its own tab default.
- Exact `<Tabs>` value strings (`"geometry"` vs `"Geometry"`). Recommend lowercase kebab so they're URL-safe if we ever route to them.
- Whether `RightInspector` lives in `src/components/` or `src/components/inspectors/` and whether the per-entity files are flat or nested. Recommend `src/components/inspectors/` for the per-entity files; `RightInspector` stays at `src/components/RightInspector.tsx` because it's mounted directly from `App.tsx`.
- Whether the bulk-actions branch (selectedIds.length > 1) moves into `RightInspector` verbatim (untabbed) or gets a `<Tabs>` shell with one tab. Recommend **verbatim untabbed** — two controls is not a tab story.

</decisions>

<canonical_refs>
## Canonical References

Downstream agents MUST read these before planning or implementing.

### Existing inspector source
- `src/components/PropertiesPanel.tsx` (1010 lines) — root dispatcher + per-entity inspector blocks + shared subcomponents (`RotationPresetChips`, `SavedCameraButtons`, `LabelOverrideInput`, `CeilingDimInput`, `Row`, `EditableRow`) + `__driveRotationPreset` test driver.
- `src/components/PropertiesPanel.OpeningSection.tsx` (291 lines) — per-wall openings list + per-opening row + per-opening editor + **Phase 79 `WindowPresetRow` (L87–163)** + shared `NumericRow`.
- `src/components/PropertiesPanel.StairSection.tsx` (337 lines) — stair inputs.
- `src/components/WallSurfacePanel.tsx` (354 lines) — wainscoting + crown molding picker for the selected wall.

### UI primitives to reuse
- `src/components/ui/Tabs.tsx` — Phase 72 `<Tabs>` primitive. Imperative API: `<Tabs value onValueChange><TabsList><TabsTrigger value="..."><TabsContent value="...">`. Motion-react sliding pill, reduced-motion aware. **Reuse, do not rebuild.**
- `src/components/ui/PanelSection.tsx` — collapsible section primitive. Acceptable inside tab content for grouping, not for top-level tab list.
- `src/components/MaterialPicker.tsx` — material picker, used by ceiling / product / custom element / wall surface.

### Mount points
- `src/App.tsx` L272–286 (2D / split branch) and L304–317 (3D branch) — currently mount `<PropertiesPanel>` inside `<AnimatePresence>` gated on `selectedIds.length > 0`. Phase 82 replaces those mounts with `<RightInspector>` and preserves both `key="properties-panel"` and `key="properties-panel-3d"` for the slide-in animation.

### State plumbing
- `src/stores/uiStore.ts` — Phase 82 adds `selectedOpeningId: string | null` + `setSelectedOpeningId(id: string | null)` action. Selection-clear (`clearSelection`) and tool-switch (`setTool`) MUST also clear `selectedOpeningId`. New selection via `select(ids)` resets `selectedOpeningId` to null (any opening sub-selection is tied to the previously-selected wall and becomes stale).
- `src/types/cad.ts` L95–108 — `Opening` interface. Phase 82 does NOT modify this type. No `presetId`. No new fields.

### Phase 79 references (window preset story)
- `.planning/phases/79-window-presets-win-presets-01-v1-20-active/79-CONTEXT.md` — D-07/D-08/D-09 single-undo + derive-on-read invariants. MUST hold after Phase 82.
- `src/lib/windowPresets.ts` — `WINDOW_PRESETS` catalog + `derivePreset(opening)` function.
- `tests/windowTool.preset.test.tsx` — Phase 79 unit test for `past.length` delta = 1.
- `tests/e2e/specs/window-presets.spec.ts` L195 — Phase 79 e2e that clicks `[data-testid="opening-preset-chip-{openingId}-picture"]` directly. Plan 82-03 updates this to first click the opening row.

### Roadmap + requirements
- `.planning/milestones/v1.21-REQUIREMENTS.md` IA-04 + IA-05.
- `.planning/milestones/v1.21-SIDEBAR-AUDIT.md` — right-panel rows (the audit that drove this phase).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The Phase 72 `<Tabs>` primitive is production-ready and StrictMode-safe. Use it as-is. Sliding pill animates between `<TabsTrigger>`s; `<TabsContent>` returns `null` when inactive (no DOM cost for inactive tabs).
- The Phase 79 `WindowPresetRow` JSX is self-contained and trivially liftable — it takes `wall`, `opening`, `update` as props and renders chips + label. The `applyPreset` body is the single store call that drives the invariant.
- Existing per-entity discrimination in `PropertiesPanel.tsx` L205–212 is correct: sequential `if (wall)`, `if (pp)`, `if (ceiling)`, `if (pce)`, `if (stair)` based on which collection contains `selectedIds[0]`. Replicate this in `RightInspector`.
- Shared subcomponents (`Row`, `EditableRow`, `RotationPresetChips`, `SavedCameraButtons`, `LabelOverrideInput`, `CeilingDimInput`) extract cleanly into a `PropertiesPanel.shared.tsx` (or `inspectors/shared.tsx`) module. They have no entity-coupling.

### Established Patterns
- **StrictMode-safe cleanup** (CLAUDE.md §7): Phase 82 inspector state is plain `useState`. The only module-level registry touched is `__driveRotationPreset` (Phase 33), which already follows the cleanup pattern — preserve verbatim in the new shared module.
- **Single-undo invariant** (Phase 31, Phase 79): every commit path inside an inspector field pushes exactly one history entry. Phase 82 doesn't change any commit paths; it only relocates JSX. Verified mechanically by lifting JSX without editing handlers.
- **Test driver convention** (Phase 31): `__drive*` registries are gated by `import.meta.env.MODE === "test"`. No new drivers needed for Phase 82 — the existing `__driveRotationPreset` is sufficient; the new opening-sub-selection flow is exercisable via standard RTL `getByTestId("opening-row-{id}")` clicks.

### Integration Points
- **App.tsx mount points:** L282 and L314 — swap `<PropertiesPanel>` for `<RightInspector>`. Keep `<AnimatePresence>` keys distinct (`"properties-panel"`, `"properties-panel-3d"`).
- **uiStore:** add `selectedOpeningId` slice. Make sure `clearSelection`, `select`, `setTool` all clear it.
- **PropertiesPanel.tsx fate:** after Plan 82-01 extracts per-entity inspectors into their own files, `PropertiesPanel.tsx` shrinks to either a thin re-export shim (for backward compat during transition) or is deleted outright in 82-01 once `App.tsx` no longer imports it. Recommend **delete outright in 82-01** — keeps the file count clean and avoids dead shim code.

</code_context>

<specifics>
## Specific Ideas

- The user chose "no rail when nothing selected" (D-01) over a 32px collapsed strip. Reasoning: the 32px strip is dead chrome that competes with the canvas; selection model is the only thing that should trigger the panel.
- The user chose opening = sub-selection (D-02) over elevating openings to first-class `selectedIds` entries. Reasoning: smaller blast radius across selectTool / fabricSync / discriminators; preserves the Phase 81 conditional-mount precedent; the "← Back to wall" affordance gives a clean way out.
- The user chose tab reset on new selection (D-03) over per-entity-type tab memory. Reasoning: single-user app, fresh mental model per selection. Persistence is enterprise-app cruft.
- The user chose flat stairs (D-04) over `Geometry / Steps / Position` tabs. Reasoning: stair section is small and clean; splitting feels like over-engineering.
- Camera buttons drop OFF the tab list (D-05) and render as a trailing row instead. Reasoning: power-user feature used rarely; giving it a tab slot is real estate it doesn't earn. Always-visible trailing row is the right compromise.

</specifics>

<deferred>
## Deferred Ideas

- **Empty-state thin rail** — A 32px collapsed strip showing project name / hint copy when nothing is selected. Rejected per D-01. If Jessica asks for this later, it's a small phase.
- **Per-entity-type tab memory** — Remember last-active tab per entity type. Rejected per D-03. Single-user fresh-selection-fresh-tab is the simpler mental model.
- **First-class opening selection** — Synthetic `"opening:wallId:openingId"` `selectedIds` entries. Rejected per D-02. The sub-selection model is cleaner.
- **Stair tab decomposition** — `Geometry / Steps / Position / Camera`. Deferred per D-04. Revisit when stair feature gains more properties.
- **Camera as its own tab** — Reasonable, but Camera is rarely used and gets a trailing row instead per D-05.
- **Settings button wire-up** — Phase 76 owns this. Out of scope here.
- **TopBar undo/redo removal** — Audit finding, not IA-04/05 scope.
- **Wainscot / framed art library contextual mounts** — IA-08 → Phase 84.

</deferred>

---

*Phase: 82-right-panel-inspector-v1-21*
*Context gathered: 2026-05-14*
*Closes: GH #173 (IA-04), GH #174 (IA-05)*
