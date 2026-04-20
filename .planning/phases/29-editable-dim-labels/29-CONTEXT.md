# Phase 29: Editable Dimension Labels — Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Jessica sets an exact wall length by typing into an in-place input on the canvas:
- Double-click any wall's dimension label → inline input appears at the label's position
- Accepts feet+inches notation (plus decimal fallback) — the format she reads off the label
- Enter commits the resize; Escape cancels; click-away also commits
- Wall resizes from its start point along its existing angle
- Each edit is one undo/redo step

Core plumbing already exists in code (labeled `EDIT-06` — pre-dates the current REQ-ID numbering). Phase 29 hardens it: add the feet+inches parser, tighten tests, polish pre-fill + sizing + consistency. Not a rewrite.

Explicit non-goals: multi-label tab navigation, tooltip/hover affordances, editing dimensions via anything other than the label (PropertiesPanel gets the parser but not new UI), drag-to-resize (that's Phase 31).
</domain>

<decisions>
## Implementation Decisions

### Scope framing
- **D-01:** Harden the existing implementation. Do NOT rewrite. Keep the `mouse:dblclick` handler in `FabricCanvas.tsx`, the input overlay, `hitTestDimLabel` (24px radius), `computeLabelPx`, `resizeWallByLabel` store action (single `pushHistory`), and `resizeWall` geometry helper. Phase 29 work = extend `validateInput` + tests + small UX polish.

### Input grammar (liberal parser)
- **D-02:** `validateInput` accepts ALL of the following notations and returns decimal feet (`number`):
  - `12'6"` / `12' 6"` / `12'-6"` (feet-inches with inch marker)
  - `12'` (whole feet with foot marker)
  - `6"` (inches-only)
  - `12.5` / `12.5ft` / `12` (decimal-feet back-compat — current behavior preserved)
  - `12ft 6in` / `12 ft 6 in` (spelled-out units)
- **D-02a:** Reject ambiguous formats that don't have a clear feet/inches marker. Specifically reject `12 6` (two bare numbers with no unit). Whitespace inside valid forms is fine.
- **D-02b:** Reject non-positive results (≤ 0). Normalize to decimal feet before calling `resizeWallByLabel`. `validateInput` returns `null` on reject; existing callers already handle `null` by silent cancel.
- **D-02c:** Parser is a pure function exported from `src/canvas/dimensionEditor.ts` (or a new sibling `src/lib/feetInches.ts` — planner picks). Must be unit-testable without DOM.

### Pre-fill format
- **D-03:** When the overlay opens, seed the input with `formatFeet(currentLen)` — the same notation the label shows, e.g. `12'-6"`. This makes round-trip obvious: what Jessica sees is what she's editing. Replaces current `currentLen.toFixed(2)` seed.
- **D-03a:** Select-all on focus so she can replace with a single keystroke.

### Input overlay sizing
- **D-04:** Widen the overlay from the current 64px to **96px** to accommodate strings like `12'-11"` without wrap. Fixed width (not auto-grow) — simpler, predictable layout.
- **D-04a:** Vertical sizing and styling unchanged. Still `text-accent-light` on `bg-obsidian-high` with the accent border; font-mono 11px.

### PropertiesPanel consistency
- **D-05:** The LENGTH row in `PropertiesPanel.tsx` (and wherever `EditableRow` is used for wall/product dimensions in ft/in) accepts the same feet+inches grammar from D-02. Share the parser — one source of truth.
- **D-05a:** `EditableRow` itself gets an optional `parser?: (raw: string) => number | null` prop so non-dimension rows (e.g. numeric counts) are unaffected. Default parser stays `parseFloat`.
- **D-05b:** `EditableRow` display (the non-editing state) continues to use its existing formatter. Only the input parse path changes.

### Outside-click behavior
- **D-06:** Commit on blur (current behavior). Matches the wainscot popover pattern and Jessica's typical "click-away = accept" expectation. Escape explicitly cancels; blur explicitly commits.
- **D-06a:** Invalid input on commit is silently cancelled (no toast, no shake) — current behavior. If telemetry ever shows confusion, revisit.

### Claude's Discretion
- File location for the feet+inches parser: inline in `dimensionEditor.ts` vs. a new `src/lib/feetInches.ts`. Planner picks based on whether the parser needs to be shared beyond dim labels + PropertiesPanel.
- Exact regex(es) used — as long as the grammar in D-02/D-02a is covered and each case is unit-tested.
- Whether `EditableRow` gets the optional `parser` prop or a separate `EditableDimensionRow` wrapper — implementation detail.
- Visual polish for the 96px overlay (padding tweak, focus ring) — stay within the existing token palette.

### Folded Todos
(none)
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source files (current dim-label machinery — target of hardening)
- `src/canvas/dimensionEditor.ts` — `computeLabelPx`, `hitTestDimLabel`, `validateInput` (primary extension target)
- `src/canvas/FabricCanvas.tsx` §`mouse:dblclick` handler (~lines 260–307) — the dblclick wiring + overlay `editingWallId` / `pendingValue` state (~lines 84, 278–279, 433–488)
- `src/canvas/FabricCanvas.tsx` §`overlayStyle` + `<input>` render (~lines 433–508) — where D-04 sizing lives
- `src/stores/cadStore.ts` §`resizeWallByLabel` (~lines 258–282) — single `pushHistory`, propagates to connected walls (EDIT-21 already satisfied by design)
- `src/lib/geometry.ts` §`resizeWall`, `formatFeet`, `wallLength` — pivot-from-start helper (EDIT-20 pivot requirement already satisfied) + the display formatter D-03 seeds from
- `src/components/PropertiesPanel.tsx` §LENGTH `EditableRow` (~line 113) — the second site touched by D-05
- Wherever `EditableRow` is defined — D-05a adds an optional `parser` prop (planner to locate)
- `tests/dimensionEditor.test.ts` — existing 3 tests (position, hit-test, decimal `validateInput`); will extend with feet+inches cases

### Prior-phase specs & context
- `.planning/REQUIREMENTS.md` §Editable Dimension Labels — EDIT-20, EDIT-21
- `.planning/PROJECT.md` — "Jessica never loses work" principle; real-world feet units throughout
- `.planning/phases/06-2d-canvas-navigation/` / wainscot inline-edit (v1.4 POLISH-02) — pattern precedent for dblclick + overlay + commit-on-blur

### External
- GitHub Issue [#46](https://github.com/micahbank2/room-cad-renderer/issues/46) — user-reported source for EDIT-20 / EDIT-21

No external ADRs — requirements fully captured in local planning docs and the decisions above.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `hitTestDimLabel(24px)` and `computeLabelPx` — no change needed.
- `resizeWallByLabel` store action — already calls `pushHistory` once inside `produce`; satisfies EDIT-21.
- `resizeWall` geometry helper — already pivots from start along current unit vector; satisfies "resize from start point along existing angle" in EDIT-20.
- `formatFeet(feet)` — display formatter (`12.5 → "12'-6\""`). Reused as D-03 seed value.
- `validateInput` — already returns `number | null`; callers handle `null` by silent-cancel. Keep the signature; extend the body.
- Existing overlay input styling pattern (`font-mono text-[11px] bg-obsidian-high text-accent-light border border-accent`) — keep, just widen.

### Established Patterns
- Zustand stores are the source of truth. Mutations via `produce` + `pushHistory` = one undo entry. Preserve this.
- Dblclick handlers in `FabricCanvas.tsx` dispatch to feature-specific logic inline (dim edit, wainscot edit). Keep the same structure.
- "Pure functions in `@/lib` or `@/canvas`, React state + effects in components" — the parser stays pure and unit-testable.
- Obsidian CAD UI: font-mono, accent palette, no new tokens.

### Integration Points
- **Parser call sites after D-02:**
  1. `FabricCanvas.tsx` `commitEdit()` → `validateInput(pendingValue)` (current)
  2. `PropertiesPanel.tsx` LENGTH `EditableRow` (and other dimension rows) via the new optional `parser` prop (D-05a)
- **Pre-fill site:** `setPendingValue(currentLen.toFixed(2))` → `setPendingValue(formatFeet(currentLen))` (D-03)
- **Overlay width:** `width: 64` → `width: 96` in the `overlayStyle` object (D-04)
- **Input focus:** existing `autoFocus`; add `onFocus={e => e.currentTarget.select()}` for D-03a

</code_context>

<specifics>
## Specific Ideas

- User framing: Jessica reads `"12'-6\""` off the label, should be able to type `12'7"` to bump it an inch. Parser must feel forgiving — `12' 6"`, `12'-6"`, and `12'6"` should all work.
- Single-undo is non-negotiable: `Ctrl+Z` once must fully revert a dim-label edit. Existing `resizeWallByLabel` already meets this; tests need to lock it in.
- Liberal parser, strict rejection: accept lots of spellings but reject truly ambiguous/bad inputs silently (`validateInput → null` → commit is a no-op).

</specifics>

<deferred>
## Deferred Ideas

- **Tab/arrow navigation between multiple dim labels** — out of scope; no user request, would need a different discovery pattern for "next label."
- **Hover tooltip "double-click to edit"** — out of scope; discoverability improvement, not behavior.
- **Toast / shake on invalid input** — deliberately rejected (D-06a); silent cancel matches current UX until telemetry argues otherwise.
- **Drag-to-resize (EDIT-22 / EDIT-23)** — belongs to Phase 31.
- **Editing height/thickness via labels** — only length is labeled on the canvas; not in scope.
- **Unit toggles (metric)** — out of scope; feet-only stays the app-wide convention per PROJECT.md.
- **Auto-mitre regeneration** — `resizeWallByLabel` already propagates the moved endpoint to connected walls; if mitres need to recompute more elaborately, that's a separate wall-geometry phase.

### Reviewed Todos (not folded)
(none)

</deferred>

---

*Phase: 29-editable-dim-labels*
*Context gathered: 2026-04-20*
