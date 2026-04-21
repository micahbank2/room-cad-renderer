---
phase: 31-drag-resize-label-override
plan: 02
subsystem: canvas
tags: [drag-resize, label-override, per-axis-override, snap, zustand, immer, vitest, tdd, wave-1]

requires:
  - phase: 31-01
    provides: "Red unit + integration tests locking Wave 1 contracts (resizeHandles, resolveEffectiveDims, wallEndpointSnap, updatePlacedCustomElement)"
  - phase: 30-smart-snapping
    provides: "SceneGeometry + BBox + computeSnap engine; classifyAxis pattern"
  - phase: 29-fabric-edits
    provides: "updateWall / updateWallNoHistory drag-transaction pattern; corner resize handles"

provides:
  - "PlacedProduct.widthFtOverride / depthFtOverride (optional, D-04 no migration)"
  - "PlacedCustomElement.widthFtOverride / depthFtOverride / labelOverride (D-13)"
  - "resolveEffectiveDims + resolveEffectiveCustomDims — D-02 override ?? libraryDim × sizeScale"
  - "EDGE_HANDLE_HIT_RADIUS_FT, getEdgeHandles, hitTestEdgeHandle, hitTestAnyResizeHandle (corner-priority Pitfall 1), edgeDragToAxisValue (rotation-aware Pitfall 2)"
  - "buildWallEndpointSnapScene — restricted scene for wall-endpoint drag (D-05: zero-size endpoint BBoxes + midpoints, no wallEdges, no product bboxes)"
  - "updatePlacedCustomElement / NoHistory store actions (Pitfall 4: targets PLACEMENT, not catalog)"
  - "resizeProductAxis / NoHistory + resizeCustomElementAxis / NoHistory store actions (writes per-axis override, clamped [0.25, 50] ft)"
  - "clearProductOverrides + clearCustomElementOverrides store actions (D-02 reset; sizeScale untouched)"

affects:
  - 31-03-integration (Wave 2 wires these into selectTool + PropertiesPanel + fabricSync)
  - 31-04-verification

tech-stack:
  added: []
  patterns:
    - "Per-axis override schema: optional fields, no migration (D-04)"
    - "Resolver wrapper preserves legacy effectiveDimensions signature (anti-pattern guard)"
    - "Restricted snap scene (D-05): function signature structurally excludes product bboxes"
    - "Pitfall 4 separation: catalog mutator (updateCustomElement) vs placement mutator (updatePlacedCustomElement) live side-by-side with clear naming"

key-files:
  created:
    - src/canvas/wallEndpointSnap.ts
  modified:
    - src/types/cad.ts
    - src/types/product.ts
    - src/canvas/resizeHandles.ts
    - src/stores/cadStore.ts
    - tests/resolveEffectiveDims.test.ts (Rule 1 fixture bug fix)

key-decisions:
  - "Kept legacy effectiveDimensions byte-identical; new resolver is a separate wrapper (RESEARCH anti-pattern guard)"
  - "Edge-handle hit radius locked at 0.5 ft to match corner radius for visual parity"
  - "Pitfall 1: hitTestAnyResizeHandle calls corner hit-test first, edge as fallthrough — corners always win ties"
  - "Pitfall 2: edgeDragToAxisValue inverts rotation to compute object-local lx/ly — drag intent stays rotation-invariant"
  - "Pitfall 4: updatePlacedCustomElement writes to rooms[active].placedCustomElements[id]; updateCustomElement (catalog mutator) is left UNTOUCHED"
  - "D-05: wall-endpoint snap scene built with empty wallEdges + zero-size endpoint BBoxes; computeSnap then naturally treats them as object-edge targets (priority 2) without engine changes"
  - "Axis-value clamping is duplicated at both pure-module (edgeDragToAxisValue) and store action (resizeProductAxis/Custom) layers — defensive double-clamp prevents driver bugs from writing extreme values"

patterns-established:
  - "Pure-module first, integration second: pure modules from Wave 0 red tests turn green here; drivers + render path follow in Wave 2 (31-03)"
  - "8-action expansion pattern for per-axis overrides: {Product|CustomElement} × {Axis | NoHistory | Clear}"
  - "Restricted snap scene builder: signature excludes product/ceiling bboxes structurally — no runtime check needed"

requirements-completed: []

# Metrics
duration: ~10 min
completed: 2026-04-20
---

# Phase 31 Plan 02: Pure Modules Summary

**Per-axis resize override schema + edge-handle hit-test + restricted wall-endpoint snap scene + 8 placement-mutation store actions, all locked behind Wave 0 red tests turned green.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-21T00:03:00Z
- **Completed:** 2026-04-21T00:13:31Z
- **Tasks:** 4
- **Files modified:** 5 (1 created, 4 modified) + 1 test fixture fix

## Accomplishments

- All 4 Wave 0 unit test files flipped from RED to GREEN (43 it() blocks total: 11 + 15 + 7 + 10)
- Schema additions are byte-minimal: 3 optional fields each on PlacedProduct + PlacedCustomElement (5 new optional fields total)
- `effectiveDimensions` (legacy non-placed signature) preserved byte-identical — RESEARCH anti-pattern guard satisfied
- `updateCustomElement` (catalog mutator) preserved byte-identical — Pitfall 4 guard satisfied
- Zero regression in cadStore.test.ts / cadStore.multiRoom.test.ts / cadStore.resizeWallByLabel.test.ts (36/36 still green)

## Task Commits

1. **Task 1: Schema + resolver additions (cad.ts + product.ts)** — `dbba376` (feat)
2. **Task 2: Edge-handle hit-test + axis math (resizeHandles.ts)** — `0a58c5f` (feat)
3. **Task 3: Wall-endpoint snap scene builder (wallEndpointSnap.ts)** — `06b5ecc` (feat)
4. **Task 4: Store actions for placement + axis-resize + override clearing (cadStore.ts)** — `1fbeaa4` (feat)

## Files Created/Modified

| File | Lines Δ | What |
|------|--------:|------|
| `src/types/cad.ts` | +11 | 3 optional fields on PlacedProduct, 3 on PlacedCustomElement (incl. labelOverride) |
| `src/types/product.ts` | +59 | New `resolveEffectiveDims` + `resolveEffectiveCustomDims`; legacy `effectiveDimensions` UNCHANGED |
| `src/canvas/resizeHandles.ts` | +99 | New `EDGE_HANDLE_HIT_RADIUS_FT`, `getEdgeHandles`, `hitTestEdgeHandle`, `hitTestAnyResizeHandle` (corner-priority), `edgeDragToAxisValue` (rotation-aware, clamped) |
| `src/canvas/wallEndpointSnap.ts` | +61 (NEW) | `buildWallEndpointSnapScene(walls, draggedWallId)` — D-05 restricted scene |
| `src/stores/cadStore.ts` | +107 | 8 new actions: updatePlacedCustomElement/NoHistory, resizeProductAxis/NoHistory, resizeCustomElementAxis/NoHistory, clearProductOverrides, clearCustomElementOverrides |
| `tests/resolveEffectiveDims.test.ts` | -6/+8 | Rule 1 deviation: fixture bug fix (`width: null` was coerced to 4 via `??`) |

**Total:** 6 files, +342/-4 lines.

## Test State Transition

| Test File | Before | After | Note |
|-----------|-------:|------:|------|
| `tests/resolveEffectiveDims.test.ts` | 0/11 | **11/11** | Wave 0 unit |
| `tests/resizeHandles.test.ts` | 0/15 | **15/15** | Wave 0 unit |
| `tests/wallEndpointSnap.test.ts` | 0/7 | **7/7** | Wave 0 unit |
| `tests/updatePlacedCustomElement.test.ts` | 0/10 | **10/10** | Wave 0 unit |
| **Wave 0 unit total** | **0/43** | **43/43** | ✓ |
| `tests/phase31Resize.test.tsx` | 0/6 | 0/6 | RED — awaits Wave 2 `window.__driveResize` driver |
| `tests/phase31WallEndpoint.test.tsx` | 0/6 | 0/6 | RED — awaits Wave 2 `window.__driveWallEndpoint` driver |
| `tests/phase31Undo.test.tsx` | 0/7 | 0/7 | RED — awaits Wave 2 drivers (5 paths) |
| `tests/phase31LabelOverride.test.tsx` | 1/9 | 1/9 | RED — awaits Wave 2 PropertiesPanel input + fabricSync render |

Wave 0 integration tests staying red is **expected and required** by the plan — they need driver hooks that Wave 2 (Plan 31-03) installs.

## New Function/Action Signatures

```typescript
// src/types/product.ts
export function resolveEffectiveDims(
  product: Product | undefined | null,
  placed: Pick<PlacedProduct, "sizeScale" | "widthFtOverride" | "depthFtOverride">,
): { width: number; depth: number; height: number; isPlaceholder: boolean };

export function resolveEffectiveCustomDims(
  el: CustomElement | undefined,
  placed: Pick<PlacedCustomElement, "sizeScale" | "widthFtOverride" | "depthFtOverride">,
): { width: number; depth: number; height: number };

// src/canvas/resizeHandles.ts
export const EDGE_HANDLE_HIT_RADIUS_FT = 0.5;
export type CornerHandle = "ne" | "nw" | "sw" | "se";
export type EdgeHandle   = "n" | "s" | "e" | "w";
export function getEdgeHandles(pp, w, d): { n; s; e; w };
export function hitTestEdgeHandle(pointerFt, pp, w, d): EdgeHandle | null;
export function hitTestAnyResizeHandle(pointerFt, pp, w, d):
  | { kind: "corner"; which: CornerHandle }
  | { kind: "edge";   which: EdgeHandle }
  | null;
export function edgeDragToAxisValue(edge, pointerFt, pp): { axis: "width"|"depth"; valueFt: number };

// src/canvas/wallEndpointSnap.ts
export function buildWallEndpointSnapScene(
  walls: Record<string, WallSegment>,
  draggedWallId: string,
): SceneGeometry;

// src/stores/cadStore.ts (8 new actions)
updatePlacedCustomElement: (id, Partial<PlacedCustomElement>) => void;
updatePlacedCustomElementNoHistory: (id, Partial<PlacedCustomElement>) => void;
resizeProductAxis: (id, "width"|"depth", valueFt) => void;
resizeProductAxisNoHistory: (id, "width"|"depth", valueFt) => void;
resizeCustomElementAxis: (id, "width"|"depth", valueFt) => void;
resizeCustomElementAxisNoHistory: (id, "width"|"depth", valueFt) => void;
clearProductOverrides: (id) => void;
clearCustomElementOverrides: (id) => void;
```

## Anti-Pattern / Pitfall Guards Verified

| Guard | Verification |
|-------|--------------|
| `effectiveDimensions(p, scale)` legacy signature byte-identical | `git diff dbba376~1..dbba376 -- src/types/product.ts` shows only additions below the existing function |
| `updateCustomElement` (catalog) targets `root.customElements[id]`, NOT `placedCustomElements` | Test asserts `customElements[CE_ID].name === "Fridge"` after `updatePlacedCustomElement` writes labelOverride |
| Corner wins tie over edge for tiny products | `hitTestAnyResizeHandle({x:0.2,y:-0.25}, …, 0.5, 0.5)` returns `{kind:"corner",which:"ne"}` (Pitfall 1) |
| Edge drag math is rotation-invariant | `edgeDragToAxisValue("e", {x:0,y:3}, pp@rotation=90)` returns `width=6` (Pitfall 2) |
| Wall-endpoint snap excludes product bboxes structurally | `buildWallEndpointSnapScene` signature only takes walls; every objectBBox.id ∈ {`<wallId>-start`, `<wallId>-end`} |

## Decisions Made

- **Wave 0 fixture-bug fix (Rule 1):** `tests/resolveEffectiveDims.test.ts` `makeProduct` helper used `overrides.width ?? 4` which coerced `null` to `4`, breaking the "null width takes placeholder path" test by intent. Switched to `"width" in overrides ? overrides.width : 4` so explicit `null` propagates. This was the minimal fix that preserves the test's stated intent. The test file's purpose (locking the resolver contract) is unchanged.
- **Defensive double-clamp:** Both `edgeDragToAxisValue` (pure module) and `resizeProductAxis` / `resizeCustomElementAxis` (store actions) clamp valueFt to `[0.25, 50]`. The pure-module clamp protects callers; the store-action clamp protects against driver bugs that bypass the pure module.
- **Restricted snap scene via signature, not runtime check:** `buildWallEndpointSnapScene` only accepts walls + draggedWallId. There is no parameter for products or ceilings — they are structurally impossible to inject. This makes D-05 unviolatable by future callers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Wave 0 test-fixture coerced explicit `null` to default value**
- **Found during:** Task 1 (resolver tests)
- **Issue:** `tests/resolveEffectiveDims.test.ts` `makeProduct({ width: null })` returned a product with `width: 4` because the fixture used `overrides.width ?? 4`. The test "product with null width takes placeholder path" failed even though the resolver behavior was correct.
- **Fix:** Changed fixture to use `"width" in overrides ? overrides.width : 4` (and same for depth/height). Explicit `null` now propagates as intended.
- **Files modified:** `tests/resolveEffectiveDims.test.ts`
- **Verification:** All 11/11 tests green after the fixture fix.
- **Committed in:** `dbba376` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Single-line fixture fix; preserved the test's stated intent (the test was always meant to exercise the placeholder path with a null width). No production behavior change. No scope creep.

## Issues Encountered

- TypeScript reports a pre-existing warning about deprecated `baseUrl` option in `tsconfig.json` (TS5101). Not Phase 31 scope. Logged in `deferred-items.md`.

## Out-of-Scope Failures (logged to deferred-items.md)

Verified pre-existing via `git stash` re-run. NOT caused by Plan 31-02 changes:

- `tests/AddProductModal.test.tsx` — 3 failures (LIB-04 SKIP_DIMENSIONS rendering)
- `tests/SidebarProductPicker.test.tsx` — 2 failures (LIB-05 filter, dragstart effectAllowed)
- `tests/productStore.test.ts` — 1 failure (LIB-03 pre-load set() guard)

## Full Suite Pass Counts

| Run | Files | Tests passed | Tests failed |
|-----|------:|-------------:|-------------:|
| Before Plan 31-02 (post-31-01 baseline) | 48 | ~270 | ~70 |
| After Plan 31-02 | 48 | 313 | 33 |
| **Δ** | 0 | **+43** | **−37** |

Net +43 unit assertions green. Remaining 33 failures = 28 expected-red Phase 31 integration tests + 6 pre-existing out-of-scope (see above).

## Next Phase Readiness

**Wave 2 (Plan 31-03 integration) is unblocked.** Wave 2 needs to:

1. Wire `hitTestAnyResizeHandle` into `selectTool` mousedown branch; dispatch corner→`resizeProduct(NoHistory)` vs edge→`resizeProductAxis(NoHistory)` with `edgeDragToAxisValue`.
2. Install `window.__driveResize` test bridge (start/to/end shape advertised in `tests/phase31Resize.test.tsx`).
3. Wire `buildWallEndpointSnapScene` + `computeSnap` into selectTool's wall-endpoint mousemove with Shift-ortho composition + Alt-disable.
4. Install `window.__driveWallEndpoint` (start/to/end/getGuides) bridge.
5. Migrate `fabricSync.ts` (and `WallMesh`/`ProductMesh` 3D paths) from `effectiveDimensions(prod, sizeScale)` to `resolveEffectiveDims(prod, placed)` so overrides actually render.
6. Add label-override input to `PropertiesPanel.tsx` (live-preview via NoHistory, commit on Enter/blur via history-pushing) + install `window.__driveLabelOverride` bridge.
7. Render `labelOverride?.toUpperCase() ?? catalogName.toUpperCase()` at the fabricSync custom-element label site.

**No blockers.** All pure-module contracts are now executable specs.

## Self-Check

- [x] `src/canvas/wallEndpointSnap.ts` created
- [x] `src/types/cad.ts` modified (5 new optional fields)
- [x] `src/types/product.ts` modified (+2 functions, legacy unchanged)
- [x] `src/canvas/resizeHandles.ts` modified (+1 const, +4 functions)
- [x] `src/stores/cadStore.ts` modified (+8 actions)
- [x] Commit `dbba376` exists (Task 1)
- [x] Commit `0a58c5f` exists (Task 2)
- [x] Commit `06b5ecc` exists (Task 3)
- [x] Commit `1fbeaa4` exists (Task 4)
- [x] All 43 Wave 0 unit assertions green
- [x] Existing cadStore regression suite still 36/36 green
- [x] Phase 31 integration tests still red (expected — Wave 2 closes them)

## Self-Check: PASSED

All 5 files modified/created exist on disk. All 4 task commits exist in git log. Wave 0 unit tests 43/43 green. No regression in pre-existing cadStore suite. Anti-pattern + Pitfall 4 guards verified by inspection.

---
*Phase: 31-drag-resize-label-override*
*Plan: 02 (Wave 1 — pure modules)*
*Completed: 2026-04-20*
