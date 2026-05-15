# Phase 85 — Context

**Captured:** 2026-05-14
**Phase:** 85 — Parametric Controls (numeric Width/Depth/Height/X/Y inputs)
**Milestone:** v1.20 — Surface Depth & Architectural Expansion
**Issue closed:** [#28](https://github.com/micahbank2/room-cad-renderer/issues/28) (narrowed — see D-02/D-03)
**Branch:** `gsd/phase-85-parametric`
**Research:** `85-RESEARCH.md`

---

## What This Phase Does

Replaces the read-only Width/Depth/Height + Position rows in the right-panel inspector (Phase 82) with editable numeric inputs for placed Products and placed CustomElements. Adds a per-placement `heightFtOverride` field to both types (snapshot v8 → v9). Users get an exact-value alternative to the Phase 31 drag-resize handles without changing any existing drag UX or Phase 69/82 material-finish behavior.

This narrows issue #28's six-bullet feature list to one shippable commit-shaped phase — numeric inputs only. The remaining bullets either already ship (drag resize, material swap, center-on-wall snap) or get deferred to follow-on phases (see D-02, D-03).

---

## Locked Decisions

### D-01 — Scope narrowed to numeric inputs only

Phase 85 ships numeric Width / Depth / Height / X position / Y position inputs in the right-panel inspector for placed Products and placed CustomElements. Drag-resize handles (Phase 31) and Material tab finish swapping (Phase 69 + 82) remain unchanged.

Implication for plans: No changes to `src/canvas/resizeHandles.ts`, `src/canvas/selectTool.ts` drag handlers, or `MaterialPicker` integration. Inspector files are the only UI surface touched. Store actions reused — except for new height-override mutations (D-05).

### D-02 — Out of Phase 85 scope (deferred to Phase 85.1)

The following from issue #28 are **deferred** to a follow-on phase (placeholder: Phase 85.1):

- **Object-to-object center alignment.** Phase 30 currently snaps to wall edges/midpoints and object bbox edges, but NOT object centers. Adding center-to-center alignment is a `snapEngine.ts` enhancement (add `objectCenters: Point[]` to `SceneGeometry`, axis-match check in `computeSnap`).
- **Collision detection / prevent overlap.** No object-vs-object collision exists today. Adding it needs a UX decision (refuse drop vs. warn vs. auto-nudge) that wasn't taken tonight.

Both items get their own GH issues + phases when prioritized. Filing as `enhancement` + `planned`.

Implication for plans: No `snapEngine.ts` changes in Phase 85. No collision-related store/UI work. Numeric inputs do not check for overlap on commit — they just write the value.

### D-03 — Out of Phase 85 scope (deferred indefinitely)

The following from issue #28 are **dropped** from v1.20 and removed from issue #28's parametric requirements list:

- **Configuration flipping** (left/right hand cabinets, single/double doors) — depends on a cabinet entity that does not exist in the codebase. No `handedness` or `configuration` field anywhere in `Product` or `PlacedProduct`.
- **Tile auto-spacing** — depends on tile-as-placed-object, which does not exist. Tiles are 2D textures on walls/floors/ceilings (`Material.tileSizeFt`, `Wallpaper.scaleFt`), not discrete placements that can be auto-spaced.

If either becomes needed later, file a new GH issue + phase. Do not bring them back into Phase 85 scope.

### D-04 — Out-of-range UX: silent clamp

When a user types a value outside the valid range for any axis (Width / Depth / Height / X position / Y position):

- **Min:** `0.5` ft for all axes (smaller than the 6-inch grid increment; below this products are visually unusable).
- **Max:** `50` ft for all axes (reasonable upper bound; products bigger than 50 ft would not fit in any realistic room).

On commit (Enter or blur), the value is clamped to `[0.5, 50]`. The input updates to display the clamped value. No error message, no shake animation, no toast. Matches the existing `resizeProductAxis` clamp at `cadStore.ts:629` (which currently clamps to `[0.25, 50]` — Phase 85 tightens the floor to `0.5` for inspector inputs, but the store action keeps `0.25` as the absolute floor so existing drag-handle behavior is preserved).

Implication for plans: A shared `clamp(value, 0.5, 50)` helper at the inspector layer. Inspector input commit handlers call it before invoking store actions. Store-layer clamp remains at `0.25` floor (don't change — would break Phase 31 drag).

### D-05 — Height is editable, same pattern as Width and Depth

Products and custom elements gain `heightFtOverride?: number` on `PlacedProduct` and `PlacedCustomElement` types in `src/types/cad.ts`. The resolvers `resolveEffectiveDims` and `resolveEffectiveCustomDims` in `src/types/product.ts` extend to honor the new field:

```ts
height: placed.heightFtOverride ?? baseH,  // no sizeScale (matches existing contract)
```

Same RESET_SIZE affordance applies: `clearProductOverrides` and `clearCustomElementOverrides` clear the new field alongside width/depth. New store actions: `resizeProductHeight(id, valueFt)` / `resizeProductHeightNoHistory` and `resizeCustomElementHeight(id, valueFt)` / `resizeCustomElementHeightNoHistory` — thin wrappers that set `heightFtOverride` (no axis param needed; height has its own action because the existing `resizeProductAxis(id, "width" | "depth", v)` signature can't take "height" without breaking type unions across consumers).

Snapshot version bumps **v8 → v9**. Migration is a trivial passthrough (`migrateV8ToV9`): the field is optional, so legacy v8 placements with no `heightFtOverride` render at catalog height — correct legacy behavior. Mirrors the Phase 81 v7→v8 + Phase 69 v6→v7 template line-for-line.

Implication for plans: Plan 85-01 owns the schema change + migration. Plans 85-02 and 85-03 consume it.

---

## Phasing Boundaries

| Stays in Phase 85 | Defers to later phase |
|-------------------|----------------------|
| Numeric W/D/H inputs in ProductInspector | Object-to-object center alignment (Phase 85.1) |
| Numeric X/Y inputs in ProductInspector | Collision detection / prevent overlap (Phase 85.1) |
| Same for CustomElementInspector | Configuration flipping (dropped — D-03) |
| `heightFtOverride` field + snapshot v8→v9 | Tile auto-spacing (dropped — D-03) |
| Silent clamp at `[0.5, 50]` | Numeric inputs for stairs, ceilings, openings (not in issue #28) |
| `resizeProductHeight` + `resizeCustomElementHeight` store actions | GLTF product height handling (orthogonal — already deferred) |
| RESET_SIZE clears new height override | |
| Single-undo invariant per Phase 31 pattern | |

---

## Plan Decomposition

Three commit-shaped plans, sequenced 1 → 2 → 3 (Plan 85-02 depends on 85-01's schema; Plan 85-03 mirrors 85-02's UX precedent for consistency).

| Plan | Wave | Objective | Issue |
|------|------|-----------|-------|
| 85-01 | 1 | Wave 0 RED tests + schema bump for `heightFtOverride` (snapshot v8→v9, type fields, resolver extensions, RED unit + e2e tests). | #28 (PARAM-01/02/03) |
| 85-02 | 2 | ProductInspector numeric inputs — replace read-only Dimensions/Position rows with `<Input>` fields wired to `resizeProductAxis` / `resizeProductHeight` / `moveProduct`. | #28 (PARAM-01/02/03) |
| 85-03 | 3 | CustomElementInspector numeric inputs — mirror Plan 85-02 for `PlacedCustomElement`, wired to `resizeCustomElementAxis` / `resizeCustomElementHeight` / `updatePlacedCustomElement`. | #28 (PARAM-01/02/03) |

---

## Out of Scope (Explicit)

- **Object-to-object center alignment** — defer to Phase 85.1 per D-02.
- **Collision detection** — defer to Phase 85.1 per D-02.
- **Configuration flipping** — dropped per D-03.
- **Tile auto-spacing** — dropped per D-03.
- **Numeric inputs for stairs / ceilings / openings** — not in issue #28; out of scope.
- **GLTF product height handling** — orthogonal; already-deferred tech debt.
- **Center-on-wall snap audit** — already shipped via Phase 30 wall midpoints; no work needed.
- **Visual styling refinement** — Phase 82 already shipped the inspector chrome; Phase 85 reuses it.

---

## Constraints from CLAUDE.md

- **D-09 (UI labels):** All inspector input labels mixed-case ("Width (ft)", "X position", "Height (ft)"). No UPPERCASE in the chrome. UPPERCASE preserved only for dynamic CAD identifiers in the 2D overlay (which Phase 85 doesn't touch).
- **§7 (StrictMode-safe cleanup):** If Plan 85-01 or 85-02 installs a test driver (`window.__driveNumericInput`), it MUST use the identity-check cleanup pattern. Phase 58 + 64 traps documented in CLAUDE.md.
- **Drag-during-edit race (RESEARCH Pitfall 4):** On drag-start in `selectTool`, defocus the active text input via `document.activeElement?.blur()` so the inspector commits before drag proceeds. Plan 85-02 includes this two-line addition to `selectTool.ts`.
- **PR-on-push:** Every push to `gsd/phase-85-parametric` MUST be followed by `gh pr create` if no open PR exists. PR body MUST include `Refs #28` (NOT `Closes #28` — issue #28 covers six bullets and Phase 85 only ships one of them; the remaining five are tracked separately per D-02/D-03).
- **Snapshot version invariant:** Plan 85-01 bumps `CADSnapshot.version` literal to `9` AND adds `migrateV8ToV9` to the migration pipeline. The `defaultSnapshot()` factory MUST be updated to emit `version: 9`. Failing to update either breaks the load-pipeline.
