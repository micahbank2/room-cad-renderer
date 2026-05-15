# Phase 85: Parametric Controls (issue #28) — Research

**Researched:** 2026-05-14
**Domain:** Inspector panel UX + smart-snap + collision detection over existing Phase 31 / Phase 82 infrastructure
**Confidence:** HIGH

## Summary

Issue #28 lists 6 features under "parametric object controls." The honest read of the codebase is that **two of the six are already shipped** (drag-to-resize handles, swap finishes), **one is partially shipped** (snap-to-wall / center-on-wall already works via Phase 30 smart-snap; "align to other objects" works for edges but not centers), and **three are net-new** (numeric dimension inputs, collision detection, configuration flips). The v1.20 ROADMAP's claim — "zero schema changes, pure PropertiesPanel UI over Phase 31 fields" — is **accurate for the numeric-input piece only**. Collision detection and configuration flipping would each be their own data-model surface.

**Primary recommendation:** Narrow Phase 85 to **numeric Width/Depth/X/Y inputs in the Product + CustomElement inspectors** (the originally-scoped Phase 80 PARAM-01/02/03 work) plus **a center-on-wall snap audit** (verify the existing Phase 30 midpoint behavior covers Jessica's expectation; surface a guide label if not). Defer collision detection to a separate phase. Drop configuration flipping and tile auto-spacing entirely from v1.20 — neither is meaningful for Jessica's current home-planning use case.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PARAM-01 | Type exact width/depth (ft) for a placed product in PropertiesPanel | `resizeProductAxis(id, axis, valueFt)` already exists in cadStore (line 622); inspector currently shows dims as read-only `<Row>` (ProductInspector.tsx:80-82) — wire `<Input>` to that action |
| PARAM-02 | Type exact X / Y position (ft) for a placed product | `moveProduct(id, position)` exists in cadStore (line 545); inspector currently shows position as read-only `<Row>` (ProductInspector.tsx:93-94) — wire two `<Input>` to that action |
| PARAM-03 | Each parametric edit is a single undo entry | Phase 31 transaction pattern documented in `resizeProductAxis` vs `resizeProductAxisNoHistory` — commit-on-blur/Enter uses the history-pushing variant, no NoHistory needed because we don't have drag mid-state |

## Current State Inventory

| Feature from issue #28 | Shipped? | Where | Gap |
|------------------------|----------|-------|-----|
| **1. Edit dimensions after placing** | **Partial** — drag handles SHIPPED Phase 31; numeric inputs NOT SHIPPED | Drag handles: `src/canvas/resizeHandles.ts` + `selectTool.ts`. Inspector: `src/components/inspectors/ProductInspector.tsx:80-82` shows `Width / Depth / Height` as read-only `<Row>`; "Set dimensions" inputs (lines 98-121) only fire for catalog products lacking dims (calls `updateProduct` on the catalog, NOT `resizeProductAxis` on the placement). | **Net-new work:** Replace read-only dim Rows in ProductInspector + CustomElementInspector with `<Input>` fields wired to the existing Phase 31 `resizeProductAxis` / `resizeCustomElementAxis` actions. Add X/Y position inputs wired to `moveProduct`. Single-undo via commit-on-blur/Enter (Phase 31 pattern). |
| **2. Swap finishes** | **Full** (for products + custom elements) | `src/components/inspectors/ProductInspector.tsx:152-170` (Material tab → MaterialPicker → `applyProductFinish`). `CustomElementInspector.tsx:118-159` (per-face MaterialPicker). Wall + ceiling material swapping via WallInspector + CeilingInspector (Phase 68). GLTF products explicitly noted as no-op (line 156-159). | **None.** This feature is already done across all entity types except GLTF products (which is acknowledged tech debt, not Phase 85 scope). |
| **3. Change configuration** (left/right hand, single/double cabinets) | **Not started** | No `handedness` / `configuration` field anywhere in `PlacedProduct` or `Product` types. Rotation exists (`PlacedProduct.rotation`) but is continuous angle, not discrete config. No cabinet entity. | **Net-new work AND new schema field.** Out of scope for v1.20 — Jessica doesn't have cabinets in any placed product. Defer to v1.22+ if cabinet primitives ever ship. |
| **4. Snap to wall / center on wall / align to other objects** | **Mostly shipped** via Phase 30 | `src/canvas/snapEngine.ts` — wall outer edges (`wallEdges`), wall midpoints with axis classification (`wallMidpoints` — includes 2D midpoint snap per D-03a), object bbox edges (`objectBBoxes`). `selectTool.ts` calls `computeSnap()` during drag. Wall midpoint = "center on wall" already works. | **Partial gap:** Phase 30 aligns object **edges** to other object bbox **edges**, but does NOT align object **centers** to other object **centers** (e.g., two chairs aligned by their middle). Also no visible label/affordance that tells Jessica "centered on wall" vs "edge-aligned." **Recommend tiny audit + optional center-to-center snap addition** as a stretch task, not a primary plan. |
| **5. Auto-spacing for tile layouts and cabinet runs** | **Not started** | Tiles are 2D textures on walls/floors/ceilings, not placed objects (`Material.tileSizeFt`, `Wallpaper.scaleFt`, `Wall.scaleFtA/B`). Cabinets are not a distinct entity. There is no "row of placed products with even spacing" concept anywhere. | **Net-new work AND requires a new concept.** Out of scope for v1.20. The requirement is dead until tile-as-placed-object or cabinet-as-entity ships — neither is on any roadmap. Drop. |
| **6. Collision detection** | **Not started** (for object-vs-object placement) | Only collision logic in the codebase is `src/three/walkCollision.ts` — wall-vs-camera in 3D walk mode. Nothing prevents products from being dropped on top of each other in 2D. `selectTool.ts` drag does not check overlap with siblings. | **Net-new work.** Worth doing eventually, but UX question is open (refuse drop? red tint warning? snap-aside?). Defer to a follow-on phase; the bare numeric-input phase doesn't need it. |

## Recommended Phase 85 Scope (Narrowed)

**Phase 85 = original PARAM-01/02/03 only** (matches ROADMAP Phase 80 plan, just renumbered):

1. **Numeric dimension inputs** for placed products + placed custom elements in the right-panel inspector (Phase 82 surface)
2. **Numeric X / Y position inputs** for both entity types
3. **Single-undo invariant** preserved — commit on Enter / blur, not on every keystroke

**Out of Phase 85 (defer or drop):**
- **Configuration flipping (issue #28 bullet 3):** Drop. No cabinet entity, no use case.
- **Auto-spacing (issue #28 bullet 5):** Drop. No tile-as-placed-object concept; the requirement assumes a feature that doesn't exist.
- **Collision detection (issue #28 bullet 6):** Defer to Phase 87+. Open UX question (refuse vs warn vs snap-aside) needs Jessica's input — not a same-phase decision.
- **Center-on-wall snap (issue #28 bullet 4):** Already shipped via Phase 30 wall midpoint. **No work needed.**
- **Center-to-center object alignment (issue #28 bullet 4, partial):** Stretch — add as Plan 03 if time permits, otherwise file as a v1.22 enhancement.

This narrows a 6-feature blob into a tight commit-shaped phase: 2 inspector files edited, 4 numeric inputs added per file, ~150 lines total. Matches the "commit-sized, 2-3 plans, 1-2 days" target.

## Implementation Plan

### Files to edit

| Path | Change |
|------|--------|
| `src/components/inspectors/ProductInspector.tsx` | Replace lines 76-97 (`PanelSection id="dimensions"` + `PanelSection id="position"`) with 5 `<Input>` fields: Width, Depth, Height (read-only display only — no override exists for height), X, Y. Width + Depth call `resizeProductAxis(pp.id, "width" \| "depth", v)`. X + Y call `moveProduct(pp.id, { x, y })`. |
| `src/components/inspectors/CustomElementInspector.tsx` | Same pattern, lines 73-87. Width + Depth call `resizeCustomElementAxis(pce.id, "width" \| "depth", v)`. X + Y call `updatePlacedCustomElement(pce.id, { position: {x, y} })`. |
| `src/components/inspectors/PropertiesPanel.shared.tsx` | Optionally add a `NumericInputRow` helper if the same input pattern repeats — `OpeningInspector` already imports a `NumericRow` from `PropertiesPanel.OpeningSection.tsx` (line 36); reuse or factor up. |

### Existing actions to wire (no new store actions needed)

| Action | Signature | Source |
|--------|-----------|--------|
| `resizeProductAxis(id, axis, valueFt)` | `(string, "width" \| "depth", number) => void` | `src/stores/cadStore.ts:622` |
| `resizeCustomElementAxis(id, axis, valueFt)` | same | `src/stores/cadStore.ts` (mirrors product pair) |
| `moveProduct(id, position)` | `(string, Point) => void` | `src/stores/cadStore.ts:545` |
| `updatePlacedCustomElement(id, partial)` | `(string, Partial<PlacedCustomElement>) => void` | `src/stores/cadStore.ts` (Phase 31) |

### Input commit pattern (single-undo)

Following the `windowTool.ts` / `LabelOverrideInput` convention:

```tsx
<Input
  type="number"
  step={0.25}
  min={0.25}
  max={50}
  defaultValue={effectiveWidth.toFixed(2)}
  key={`${pp.id}-${pp.widthFtOverride ?? 'scale'}`} // re-mount on external change
  onBlur={(e) => {
    const v = parseFloat(e.target.value);
    if (Number.isFinite(v) && v > 0) resizeProductAxis(pp.id, "width", v);
  }}
  onKeyDown={(e) => {
    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
    if (e.key === "Escape") {
      (e.target as HTMLInputElement).value = effectiveWidth.toFixed(2);
      (e.target as HTMLInputElement).blur();
    }
  }}
/>
```

- `defaultValue` (not `value`) — uncontrolled so keystrokes don't flood history
- Commit on blur → single `pushHistory` per edit → PARAM-03 satisfied
- `key` forces re-mount when an external mutation (drag handle, undo) changes the field, so the input reflects current store state
- Escape rewinds the input to the pre-edit value without committing

### Display value resolution

The input must show the **effective** dimension (override OR `library × sizeScale`), not the raw `widthFtOverride` field — otherwise an unmodified product shows blank. Compute via the existing resolver:

```ts
const dims = resolveEffectiveDims(product, pp);
// dims.width = pp.widthFtOverride ?? (product.width * (pp.sizeScale ?? 1))
```

`resolveEffectiveDims` is already exported from `src/types/product.ts:100` and already handles placeholder products gracefully.

## Pitfalls

### Pitfall 1: Single-undo invariant for typing

**What goes wrong:** A naive `onChange` handler calling `resizeProductAxis` per keystroke produces 5 history entries for typing "8.5\n" (one per character + blur). Jessica hits Ctrl+Z once, expects to revert the whole edit, gets stuck partway.

**How to avoid:** Use `defaultValue` + `onBlur` commit (uncontrolled input). Phase 31 + Phase 79 LabelOverride established this pattern; do not deviate.

**Warning sign:** If the test driver writes `__driveResize` and immediately checks `past.length`, count should increment by exactly 1 per blur, not per character.

### Pitfall 2: Effective-value vs override-field display

**What goes wrong:** Showing `pp.widthFtOverride` directly leaves the input empty for unmodified products (override is `undefined`). Worse, after a `sizeScale` drag, the input STILL shows empty because no override was written.

**How to avoid:** Always render `resolveEffectiveDims(product, pp).width` as `defaultValue`. The first numeric edit will write the override.

### Pitfall 3: Input re-mount on store change

**What goes wrong:** User types `8.5` in Width, then drags the corner handle to scale the product. The input still shows `8.5` because uncontrolled inputs don't observe store changes.

**How to avoid:** Pass `key={pp.id + ':' + effectiveWidth.toFixed(2)}` (or similar) so the input re-mounts on external change. The existing `key={pp.id}` on the inspector root (ProductInspector.tsx:60) is too coarse — that only re-mounts on selection change, not on size change to the same selection.

### Pitfall 4: Position input + drag-during-edit race

**What goes wrong:** User focuses the X input, types `5`, then drags the product before blur. Drag fires `moveProductNoHistory` (mid-drag) which writes `position.x`. On blur, the stale input value `5` overwrites the drag-end position.

**How to avoid:** On drag-start (in `selectTool`), defocus the active text input via `document.activeElement?.blur()`. The inspector input commits, then drag proceeds cleanly.

### Pitfall 5 (out of scope but worth noting for Open Q): Collision detection performance

**If collision detection ships later:** Naive O(n²) overlap check per mousemove on 100+ products is ~10k checks/frame. Use AABB broadphase via the existing `objectBBoxes` array (already built once per drag in `snapEngine.ts`). Filter to candidates whose AABB overlaps the dragged AABB before doing precise checks. Early-exit on first overlap.

## Plan Decomposition

Three plans, all commit-sized:

### Plan 85-01 — Wave 0 RED tests
- Add e2e + unit RED tests that pin PARAM-01/02/03 contract before any production code lands
- Test driver: `window.__driveNumericInput(targetId, field, value)` gated by `import.meta.env.MODE === "test"` (mirrors `__driveResize`)
- Cases: blur commits, Escape reverts, Enter commits, single-undo per edit, drag handle and numeric input agree on effective width post-edit
- Files: `tests/unit/inspectors/productInspector.numeric.test.ts` (new), `tests/e2e/parametric-controls.spec.ts` (new)

### Plan 85-02 — ProductInspector numeric inputs
- Replace read-only Width/Depth/Height Rows + Position Row with `<Input>` fields
- Height stays read-only (no `heightFtOverride` field exists per Phase 31 `resolveEffectiveDims` contract — height ignores sizeScale)
- Wire `resizeProductAxis` + `moveProduct`
- Install `__driveNumericInput` driver
- Files: `src/components/inspectors/ProductInspector.tsx`, optionally a new shared `NumericInputRow` in `PropertiesPanel.shared.tsx`, `src/test-utils/numericInputDrivers.ts` (new)

### Plan 85-03 — CustomElementInspector numeric inputs
- Mirror Plan 85-02 for placed custom elements
- Wire `resizeCustomElementAxis` + `updatePlacedCustomElement` for position
- Files: `src/components/inspectors/CustomElementInspector.tsx`

**Stretch (not a separate plan, but a follow-on issue):**
- Center-to-center object alignment in `snapEngine.ts` — add `objectCenters: Point[]` to `SceneGeometry` and a center-vs-center axis-match check in `computeSnap`. File as new GH issue tagged `enhancement` + `planned`.

## Open Questions for Plan Phase

1. **Confirm narrowed scope.** Recommend dropping configuration flipping (#3) and tile auto-spacing (#5) from issue #28 entirely. Defer collision detection (#6) to a follow-on phase. Phase 85 = PARAM-01/02/03 only. **OK to proceed on that basis?**

2. **Numeric input behavior on out-of-range values.** `resizeProductAxis` clamps to `[0.25, 50]` (cadStore.ts:629). If Jessica types `0.1` or `100`, do we (a) silently clamp and show the clamped value on blur, (b) show a red border + tooltip and refuse the edit, or (c) accept and clamp silently with no feedback? Recommend (a) — silent clamp matches existing drag-handle behavior and avoids modal interruption for a non-destructive correction.

3. **Height field UX.** `PlacedProduct` has no `heightFtOverride` — Phase 31 explicitly excluded height per the existing contract that `sizeScale` doesn't apply to height. Three options for the Height input: (a) read-only display (clearest, matches current behavior), (b) editable input that calls `updateProduct` on the catalog (changes height for ALL placements of this product — surprising), (c) introduce `heightFtOverride` as a Phase 85 schema bump (scope creep). **Recommend (a) — read-only Height, edit catalog elsewhere.** This is consistent with PARAM-01's literal text ("width and depth").

4. **Center-to-center object alignment** — ship as Plan 85-04 or defer to a new GH issue? Vote: **defer**. Phase 85 stays tight at 3 plans; alignment is a snap-system enhancement, not a parametric-control feature.

## Sources

### Primary (HIGH confidence)
- `src/stores/cadStore.ts:545,600-660` — `moveProduct`, `resizeProduct`, `resizeProductAxis`, `resizeProductAxisNoHistory`, `clearProductOverrides`, all live and correctly history-paired
- `src/types/product.ts:100-119` — `resolveEffectiveDims(product, placed)` resolver — already exported, already handles overrides + scale + placeholder
- `src/types/cad.ts:110-133` — `PlacedProduct` interface — `widthFtOverride`, `depthFtOverride`, `sizeScale`, `position`, `finishMaterialId` all confirmed present
- `src/components/inspectors/ProductInspector.tsx:73-132` — Dimensions tab currently uses read-only `<Row>` for dims + position; numeric inputs only exist for catalog-product `set-dimensions` flow (lines 98-121), NOT for parametric editing of placements
- `src/components/inspectors/CustomElementInspector.tsx:71-114` — Same read-only pattern for placed custom elements
- `src/canvas/snapEngine.ts:1-100` — Phase 30 smart-snap with wall midpoints, wall edges, object bbox edges. "Center on wall" already works via `wallMidpoints` 2D coupled check (lines 350-369)
- `src/three/walkCollision.ts` — only collision system in the codebase, scoped to 3D walk mode (wall-vs-camera); no object-vs-object collision exists
- `.planning/milestones/v1.20-REQUIREMENTS.md` — PARAM-01/02/03 spec
- `.planning/phases/79-window-presets-win-presets-01-v1-20-active/79-CONTEXT.md` — closest-recent v1.20 phase pattern (bridge + single-undo + test driver convention)
- `.planning/ROADMAP.md:424-435` — Phase 80 (PARAM) details — this is what Phase 85 IS, just renumbered to follow Phase 84

### Secondary (MEDIUM confidence)
- Issue #28 body (6-bullet framing) — verified via roadmap + requirements docs; the broader 4 of 6 bullets are either shipped or never made it into a requirement spec

### Tertiary (LOW confidence)
- None — every claim above is verified against source.

## Metadata

**Confidence breakdown:**
- Inventory accuracy: HIGH — every claim cross-checked against source files at the cited line numbers
- Scope narrowing recommendation: HIGH — derived from inventory; no speculation
- Plan decomposition: HIGH — mirrors the established Phase 79 + Phase 31 patterns line-for-line

**Research date:** 2026-05-14
**Valid until:** 2026-06-14 (30 days — stable codebase, no upstream library churn expected)
