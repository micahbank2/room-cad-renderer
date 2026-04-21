# Phase 31: Drag-to-Resize + Label Override - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden existing drag-resize handles (product + wall endpoint) to meet EDIT-22/23/24 guarantees, integrate Phase 30 smart-snap engine on wall endpoints (closes D-08b), and add per-placement label override for custom elements (CUSTOM-06).

**Important: this is largely a hardening/enhancement phase, not greenfield.** The codebase already has:
- `product-resize` drag handles (EDIT-14, `src/canvas/resizeHandles.ts`) — currently uniform `sizeScale` only
- `wall-endpoint` drag handles (EDIT-15, `src/canvas/wallEditHandles.ts`) — no smart-snap, no Shift-orthogonal
- Custom element rotate+resize handles (POLISH-01)
- D-03 single-undo fast-path (`pushHistory` at drag start, `NoHistory` mid-drag)

**What's new in Phase 31:**
- Per-axis product resize (edge handles break aspect ratio via per-axis override fields)
- Smart-snap + Shift-orthogonal on wall endpoints (closes D-08b)
- `labelOverride` field on `PlacedCustomElement` + PropertiesPanel input
- Single-undo regression tests

**Out of scope:** Extending label override to catalog `PlacedProduct` (deferred — see Deferred Ideas).

</domain>

<decisions>
## Implementation Decisions

### Product Resize Semantics (EDIT-22)
- **D-01:** Use lazy per-axis override. Keep uniform `sizeScale` as the default (preserves aspect ratio — Jessica's couch doesn't distort). Add optional `widthFtOverride?: number` and `depthFtOverride?: number` on `PlacedProduct` (and `PlacedCustomElement`). These are set ONLY when an edge handle is dragged; corner handles continue to update `sizeScale`.
- **D-02:** When any override is present, the effective dimension resolver returns `override ?? (libraryDim × sizeScale)`. Clearing an override (e.g., via PropertiesPanel reset) reverts to `sizeScale`-driven uniform behavior.
- **D-03:** Corner handles → uniform (`sizeScale`). Edge handles (4 new hit-test regions on N/S/E/W midpoints) → one-axis override. Grid-snap to `uiStore.gridSnap` applies to the resulting widthFt/depthFt value.
- **D-04:** No migration required — existing saved projects have no overrides; new fields are optional.

### Wall Endpoint Smart-Snap (EDIT-23, closes D-08b)
- **D-05:** Wall-endpoint drag invokes `snapEngine.computeSnap()` with snap targets = **other wall endpoints + wall midpoints only**. Product bboxes are excluded (walls snapping to couches is wrong direction of precedence).
- **D-06:** Shift-orthogonal constraint takes precedence over smart-snap. When Shift is held, the endpoint is locked to the axis (horizontal/vertical from the opposite endpoint), and smart-snap applies ONLY along that locked axis (i.e., snap to targets whose projection onto the locked axis is within tolerance).
- **D-07:** Alt/Option disables smart-snap on endpoint drag (keeps grid-snap). Same convention as Phase 30.
- **D-08:** Snap guides from Phase 30 (`snapGuides.ts`, accent-purple line + tick) are reused as-is during endpoint drag.

### Label Override UX (CUSTOM-06)
- **D-09:** Input field lives in `PropertiesPanel` when a `PlacedCustomElement` is selected. Live preview on canvas as user types (no debounce for visual feedback).
- **D-10:** History entry (undo) commits on Enter OR blur — one entry per edit session, not per keystroke. Same pattern as EDIT-20/21 dimension-label editor.
- **D-11:** Input placeholder shows the catalog name (from `CustomElement.name`) as ghost text. Clearing the field (empty string) reverts to catalog name — persisted as `labelOverride: undefined` or empty.
- **D-12:** Max length 40 characters (fits the existing 9pt IBM Plex Mono label render at typical zoom).
- **D-13:** Field: `PlacedCustomElement.labelOverride?: string`. Persisted in the project snapshot (part of CAD state, round-trips through save/load + undo/redo).
- **D-14:** 2D canvas render: `labelOverride?.toUpperCase() ?? customElement.name.toUpperCase()` at the existing label position (`fabricSync.ts:85`).

### Label Override Scope
- **D-15:** Applies strictly to `PlacedCustomElement` per CUSTOM-06 literal wording. Catalog `PlacedProduct` label override is deferred to a future phase.

### Single-Undo Hardening (EDIT-24)
- **D-16:** Keep existing D-03 drag-transaction pattern (`pushHistory` at drag start via empty `update*(id, {})`, then `*NoHistory` variants mid-drag, final commit at mouseup with no extra history push). No new store API.
- **D-17:** Add red regression tests asserting `past.length` increases by exactly 1 after a complete drag-resize for: (a) product corner resize, (b) product edge resize, (c) wall endpoint drag. Tests use `window.__xToolCleanup`-style driver hooks (Phase 29/30 pattern) to simulate drag programmatically in jsdom/happy-dom.

### Claude's Discretion
- Exact pixel size/color of new edge handles (match existing corner handle style from `resizeHandles.ts`)
- Where exactly the label-override input lives within PropertiesPanel section hierarchy
- Test driver naming (`window.__driveResize`, `window.__driveWallEndpoint`, etc.)
- Whether to add a small "RESET" affordance next to the label input or rely on empty-field-reverts semantics

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap / Requirements
- `.planning/ROADMAP.md` §Phase 31 — Goal, success criteria, dependencies
- `.planning/REQUIREMENTS.md` §EDIT-22, §EDIT-23, §EDIT-24, §CUSTOM-06 — Acceptance criteria
- `.planning/PROJECT.md` §Current State — Phase 30 smart-snap delivery summary

### Phase 30 Deliverables (reused / extended)
- `src/canvas/snapEngine.ts` — `computeSnap(SnapInput): SnapResult` pure module, `SNAP_TOLERANCE_PX = 8`
- `src/canvas/snapGuides.ts` — Fabric guide renderer, tagged `data.type === "snap-guide"`
- `.planning/phases/30-smart-snapping/30-CONTEXT.md` §D-08b — Wall-endpoint deferral to Phase 31
- `src/canvas/tools/selectTool.ts` L740–789 — Wall-endpoint drag path (currently untouched by Phase 30)

### Phase 25 Performance Contract
- `.planning/phases/25-*/25-CONTEXT.md` — `shouldSkipRedrawDuringDrag`, `renderOnAddRemove: false` fast-path
- `src/stores/cadStore.ts` — `*NoHistory` action variants, `pushHistory()` semantics

### Existing handle infrastructure (to extend, not replace)
- `src/canvas/resizeHandles.ts` — Product corner resize hit-test
- `src/canvas/wallEditHandles.ts` — Wall endpoint hit-test
- `src/canvas/tools/selectTool.ts` L560–716 — `dragType` dispatch (`"product-resize"`, `"wall-endpoint"`)

### Type + store surface
- `src/types/cad.ts` §PlacedProduct, §PlacedCustomElement, §CADSnapshot — Schema additions land here
- `src/stores/cadStore.ts` — `resizeProduct` / `resizeProductNoHistory`, `updateWall` / `updateWallNoHistory`, `updateCustomElement`

### UI
- `src/components/PropertiesPanel.tsx` — Label-override input location
- `src/canvas/fabricSync.ts` L84–93 (custom element label), L842–852 (product label) — Label render sites

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`snapEngine.computeSnap()`** — Pure function, zero Fabric/store deps. Feed it wall-endpoint candidate + scene geometry; get back snapped point + guide instructions.
- **`snapGuides.ts`** — Drop-in guide renderer. Already tagged for cleanup; endpoint drag can reuse without changes.
- **D-03 drag-transaction pattern** — `updateWall(id, {})` at drag start pushes exactly one history entry; mid-drag `updateWallNoHistory` commits state without history. Already battle-tested on wall-move, product-move, ceiling-move.
- **`hitTestResizeHandle`** (`src/canvas/resizeHandles.ts`) — Extend to detect edge midpoints in addition to corners.
- **Dimension editor pattern (Phase 29)** — Live preview + commit-on-Enter/blur with one undo entry. Mirror this exactly for label-override input.

### Established Patterns
- **`*NoHistory` action variants** for mid-drag mutation. New per-axis resize actions should follow the same split.
- **Test driver bridges** (`window.__driveSnap`, `window.__getSnapGuides`) under `import.meta.env.MODE === "test"` guard. Phase 31 needs analogous bridges for drag-resize + label override.
- **Alt/Option convention** documented in `CLAUDE.md` — disables smart-snap, keeps grid-snap.

### Integration Points
- **selectTool dragType dispatch** (L560–716) — Add `"product-resize-edge"` (new axis-constrained variant) and wire smart-snap into the existing `"wall-endpoint"` branch at L875.
- **PropertiesPanel single-selection block** — Label override input sits alongside existing product/wall property editors.
- **fabricSync label render** — Two sites (custom element L85, product L844). Only the custom element site gets the override lookup.

</code_context>

<specifics>
## Specific Ideas

- **EDIT-24 test strategy:** Drive `window.__startDragResize("product", id, "corner-ne")` → `__dragTo(x, y)` → `__endDrag()`, then assert `useCADStore.getState().past.length === 1`. Mirror for wall endpoints.
- **Edge handle visual:** Match existing corner-handle style (same fill, stroke, radius) — 4 squares at N/S/E/W midpoints of the product bbox. Render only when single product selected (no bulk).
- **Shift-orthogonal + smart-snap interaction (D-06):** Compute orthogonal-constrained candidate FIRST; pass only that 1-axis candidate into `computeSnap()` with axis-restricted targets.
- **Label override max length (40):** Enforce client-side via `input maxLength={40}`. No truncation in snapshot — if a stored value exceeds 40 (edge case from a future migration), render as-is.

</specifics>

<deferred>
## Deferred Ideas

- **Label override on catalog `PlacedProduct`** (gray area 4B) — Natural extension once CUSTOM-06 ships. Separate phase; add `PlacedProduct.labelOverride?: string` + same PropertiesPanel pattern.
- **Non-aspect-locked custom element resize** — Custom elements (`PlacedCustomElement`) share the product resize model. Per-axis overrides apply automatically, but if Jessica wants more exotic shape editing (e.g., taper, skew), that's a far-future phase.
- **Multi-select drag-resize** — Current handles only appear on single selection. Bulk resize (e.g., scale 3 products together) is a potential future capability.
- **Rotated-product per-axis resize math** — When a product is rotated 45°, edge handles' "width" direction is visually diagonal. v1 operates in object-local axes (edge drag changes `width` regardless of screen orientation). Future polish: handle orientation-aware labels.
- **Wall endpoint snap to product bbox edges** — Excluded in D-05 (walls snapping to furniture is wrong precedence). Revisit only if a real workflow need surfaces.

</deferred>

---

*Phase: 31-drag-resize-label-override*
*Context gathered: 2026-04-20*
