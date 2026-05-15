---
phase: 85-parametric-controls-v1-20
plan: 02
subsystem: product-inspector-numeric-inputs
tags: [inspector, numeric-input, parametric, param-01, param-02, param-03, pitfall-4]
requires:
  - PlacedProduct (src/types/cad.ts)
  - resolveEffectiveDims (src/types/product.ts)
  - resizeProductAxis (src/stores/cadStore.ts)
  - resizeProductHeight (src/stores/cadStore.ts — Plan 85-01)
  - moveProduct (src/stores/cadStore.ts)
  - clearProductOverrides (src/stores/cadStore.ts — Plan 85-01 extended)
  - installNumericInputDrivers (src/test-utils/numericInputDrivers.ts — Plan 85-01)
  - ProductInspector (src/components/inspectors/ProductInspector.tsx — Phase 82)
  - PropertiesPanel.shared (src/components/inspectors/PropertiesPanel.shared.tsx — Phase 82)
  - selectTool onMouseDown (src/canvas/tools/selectTool.ts — Phase 25)
provides:
  - NumericInputRow shared component (uncontrolled commit-on-blur input row)
  - clampInspectorValue(v, min=0.5, max=50) D-04 silent-clamp helper
  - ProductInspector Dimensions tab now has 5 editable inputs (W/D/H/X/Y)
  - __driveNumericInput driver mounted in ProductInspector via useEffect
  - selectTool drag-start blurs focused inspector inputs (Pitfall 4 fix)
affects:
  - numericInputDrivers.ts (bug fix: dedup el.blur() + focusout dispatch)
tech-stack:
  added: []
  patterns:
    - Uncontrolled <input> + key-on-value re-mount (Phase 31 Pitfall 3 pattern)
    - Commit-on-blur with silent clamp (matches Phase 65 CeilingDimInput shape)
    - StrictMode-safe useEffect registry cleanup (CLAUDE.md §7)
    - selectTool drag-start defocus (Phase 85 RESEARCH Pitfall 4)
key-files:
  created: []
  modified:
    - src/components/inspectors/PropertiesPanel.shared.tsx
    - src/components/inspectors/ProductInspector.tsx
    - src/canvas/tools/selectTool.ts
    - src/test-utils/numericInputDrivers.ts
decisions:
  - "Drop the {product && ...} guard on the Dimensions PanelSection so W/D/H inputs render even when the catalog product is missing — resolveEffectiveDims already returns PLACEHOLDER_DIM_FT for missing products. Required for e2e (which seeds placedProducts without seeding the matching product library entry)."
  - "Open Position section by default. Previously defaultOpen={false} kept X/Y inputs out of the DOM. The new design contract is that all 5 numeric inputs are visible without an extra click — matching Jessica's 'I want to type exact values' workflow."
  - "Test driver bug fix: numericInputDrivers.ts was firing BOTH el.blur() (when actually focused) and a synthetic focusout event, leading to double-commit + double-history-push. Now picks one path based on document.activeElement === el, restoring the single-undo invariant."
  - "Pitfall 4 mitigation lives at the top of onMouseDown only — all drag-start paths (products, custom elements, walls, ceilings) flow through this single handler, so one defocus call covers every entry point."
metrics:
  duration: ~10min
  completed: 2026-05-15
  tasks: 3
  files_created: 0
  files_modified: 4
---

# Phase 85 Plan 02: ProductInspector Numeric Inputs Summary

ProductInspector Dimensions tab now ships 5 commit-on-blur numeric inputs — Width / Depth / Height / X / Y — wired to `resizeProductAxis`, `resizeProductHeight`, and `moveProduct`. Silent clamp at `[0.5, 50]` per D-04. Single-undo invariant preserved. All 11 Plan 85-01 ProductInspector RED unit tests + all 3 product e2e parametric-controls cases turn GREEN.

## Tasks Completed

| Task | Name | Status | Commit | Files |
|------|------|--------|--------|-------|
| 1 | Add NumericInputRow + clampInspectorValue helpers | Complete | 3636e94 | src/components/inspectors/PropertiesPanel.shared.tsx |
| 2 | Wire numeric W/D/H/X/Y inputs in ProductInspector | Complete | edb7a88 | src/components/inspectors/ProductInspector.tsx, src/test-utils/numericInputDrivers.ts |
| 3 | Blur focused inspector input on selectTool drag-start (Pitfall 4) | Complete | a5b3307 | src/canvas/tools/selectTool.ts |
| 2b | (deviation) Render dimension inputs without catalog product | Complete | 2e9dabb | src/components/inspectors/ProductInspector.tsx |

## Commits

| Hash | Message |
|------|---------|
| 3636e94 | feat(85-02): add NumericInputRow + clampInspectorValue helpers |
| edb7a88 | feat(85-02): wire numeric W/D/H/X/Y inputs in ProductInspector |
| a5b3307 | fix(85-02): blur focused inspector input on selectTool drag-start |
| 2e9dabb | fix(85-02): render W/D/H inputs even when catalog product is missing |

## Test Results

- **ProductInspector unit (must turn GREEN):** 11/11 pass (was 11/11 RED in Wave 1).
- **Product e2e (parametric-controls.spec.ts):** 3/3 pass on chromium-dev. Plan called for 2 of 3 minimum; height test (test 2) also passes since schema v9 from Plan 85-01 was already in place.
- **CustomElementInspector unit (Wave 3 RED):** 11/11 still RED — Plan 85-03 will turn them GREEN. Intentional.
- **Full vitest suite:** 1065 pass + 11 RED + 11 todo = 1087 total. Identical to Wave 1 baseline. Zero regressions.
- **selectTool/drag tests:** 22/22 pass (dragIntegration, phase31Resize, phase31WallEndpoint, toolCleanup) — Pitfall 4 fix is a no-op when nothing is focused.
- **TypeScript:** `npx tsc --noEmit` clean (only pre-existing TS6.0 baseUrl deprecation warning, unrelated).

## Decisions Made

1. **Drop `{product && ...}` guard on Dimensions PanelSection.** The e2e harness seeds `placedProducts` whose `productId` is not in the productLibrary. The previous guard hid the entire dimensions section in that case and the e2e timed out waiting for the W/H input testids. `resolveEffectiveDims(undefined, pp)` already returns `isPlaceholder: true` with `PLACEHOLDER_DIM_FT` values, so the inputs are still functional. Catalog products explicitly declaring `width/depth/height === null` still render the "Size: Unset" affordance.

2. **Position section opens by default.** Plan said "defaultOpen={false}" was fine; in practice the unit + e2e tests can't find inputs that aren't mounted (AnimatePresence unmounts children). The product design clearly wants both Dimensions AND Position visible — Jessica's workflow is "type all 5 numbers at once". Defaulting open also matches the Width/Depth/Height treatment.

3. **Test driver dedup fix.** Wave 1's `numericInputDrivers.ts` shipped firing both a synthetic `FocusEvent("blur")` (non-bubbling, ignored by React) AND no path that actually committed. My initial fix added `el.blur() + dispatchEvent("focusout")` belt-and-suspenders, which double-fired the React onBlur → 2 history entries. Final implementation checks `document.activeElement === el` — uses native `el.blur()` when truly focused, falls back to synthetic `focusout` otherwise. Single-undo invariant preserved.

4. **Pitfall 4 fix at single drag-start site.** The plan suggested adding the defocus to both the product drag-start branch AND the wall-endpoint drag-start branch. In practice, all drag-start logic flows through one `onMouseDown(opt: fabric.TEvent)` handler at line 613 — products, custom elements, walls, ceilings all branch within that single handler. A single `activeElement?.blur()` call at the very top covers every entry path. Cleaner and easier to maintain.

## Deviations from Plan

### Auto-fixed (Rule 1 - Bug)

**1. [Rule 1 - Bug] Test driver `numericInputDrivers.ts` double-commit.**
- **Found during:** Task 2 (unit test failure on single-undo invariant — `past.length` incremented by 2 instead of 1).
- **Issue:** The Wave 1 driver dispatched `new FocusEvent("blur", { bubbles: true })`, which React ignores (synthetic onBlur listens for `focusout`). When I added `el.blur()` as the working trigger and kept the dispatch as belt-and-suspenders, BOTH commit paths fired, doubling history entries.
- **Fix:** Conditional — if `document.activeElement === el`, use native `el.blur()` (which also fires `focusout` naturally); otherwise dispatch synthetic `focusout`. Exactly one path runs per call.
- **Files modified:** `src/test-utils/numericInputDrivers.ts`
- **Commit:** edb7a88

**2. [Rule 1 - Bug] Dimensions inputs hidden when catalog product is missing.**
- **Found during:** e2e run after Task 3 — `product-width-input` not visible despite ProductInspector mounting.
- **Issue:** ProductInspector wrapped the Dimensions PanelSection in `{product && ...}`. The e2e snapshot seeds a placedProduct without a corresponding productLibrary entry, so `product` is undefined and no inputs render.
- **Fix:** Render the PanelSection unconditionally. Use `(product ? hasDimensions(product) : true)` to gate W/D/H inputs vs. the "Size: Unset" affordance. `resolveEffectiveDims` already handles `undefined` product by returning placeholder dims.
- **Commit:** 2e9dabb

**3. [Rule 2 - Critical functionality] Position section default-open.**
- **Found during:** Task 2 unit test failure — `__driveNumericInput: no element with data-testid="product-x-input"`.
- **Issue:** PanelSection with `defaultOpen={false}` doesn't mount children (AnimatePresence). Tests + e2e can't drive inputs that aren't in the DOM.
- **Fix:** Removed the `defaultOpen={false}` prop, defaults to open. Aligns with the user workflow (type all 5 values at once).
- **Commit:** edb7a88

### Auth gates

None.

### Architectural changes (Rule 4)

None.

## Stub tracking

No stubs introduced. The 11 CustomElementInspector unit tests remain RED — these are not stubs, they're the Wave 3 contract; Plan 85-03 lands the matching inputs in CustomElementInspector and turns them GREEN.

## Key Files

### Modified
- `src/components/inspectors/PropertiesPanel.shared.tsx` — adds `clampInspectorValue(v, min, max)` (D-04 silent clamp) and `NumericInputRow` (uncontrolled input row with commit-on-blur, Escape-rewinds, key-on-value re-mount per Pitfall 3).
- `src/components/inspectors/ProductInspector.tsx` — Dimensions tab now ships 5 `NumericInputRow` instances (W/D/H/X/Y) wired to `resizeProductAxis`, `resizeProductHeight`, `moveProduct`. `useEffect(() => installNumericInputDrivers(), [])`. `hasOverrides` extended to include `heightFtOverride`. Position section defaults open. Width/Depth/Height render even when catalog product is missing.
- `src/canvas/tools/selectTool.ts` — `onMouseDown` prologue calls `document.activeElement?.blur()` when an HTMLElement is focused (Pitfall 4: prevents stale inspector input commit from overwriting drag-end position).
- `src/test-utils/numericInputDrivers.ts` — driver dedup fix (one of `el.blur()` or synthetic `focusout`, never both).

## Self-Check: PASSED

- `src/components/inspectors/PropertiesPanel.shared.tsx`: FOUND (`clampInspectorValue` export, `NumericInputRow` export with key-on-value re-mount + commit-on-blur)
- `src/components/inspectors/ProductInspector.tsx`: FOUND (5 NumericInputRow instances, 3 store-action selectors, installNumericInputDrivers useEffect, heightFtOverride in hasOverrides)
- `src/canvas/tools/selectTool.ts`: FOUND (`Phase 85 Pitfall 4` comment at line 614, activeElement.blur() in onMouseDown prologue)
- `src/test-utils/numericInputDrivers.ts`: FOUND (conditional el.blur() vs focusout dispatch)
- Commit 3636e94: FOUND
- Commit edb7a88: FOUND
- Commit a5b3307: FOUND
- Commit 2e9dabb: FOUND
- Tests: 11/11 ProductInspector unit GREEN; 3/3 product e2e GREEN on chromium-dev; 22/22 drag/selection tests pass; 1065/1076 full suite (11 RED are intentional Wave 3 CustomElementInspector).

## Next Step

Plan 85-03 (Wave 3) — CustomElementInspector numeric inputs. Mirror this plan's structure with `custom-element-{width,depth,height,x,y}-input` testids, wired to `resizeCustomElementAxis`, `resizeCustomElementHeight`, `updatePlacedCustomElement`. Turns the remaining 11 RED unit tests GREEN.
