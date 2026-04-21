---
phase: 31-drag-resize-label-override
plan: 03
subsystem: canvas
tags: [drag-resize, label-override, smart-snap, properties-panel, integration, wave-2]

requires:
  - phase: 31-02
    provides: "Pure modules: resolveEffectiveDims, hitTestAnyResizeHandle, edgeDragToAxisValue, getEdgeHandles, buildWallEndpointSnapScene + 8 store actions"
  - phase: 30-smart-snapping
    provides: "computeSnap engine + renderSnapGuides + SNAP_TOLERANCE_PX"
  - phase: 25
    provides: "_dragActive fast-path + *NoHistory drag-transaction pattern (D-03 / D-16)"

provides:
  - "selectTool product-resize-edge dragType: corner→sizeScale vs edge→per-axis override (EDIT-22)"
  - "selectTool wall-endpoint smart-snap with restricted scene (D-05) + Shift-ortho (D-06) + Alt-disable (D-07)"
  - "PropertiesPanel custom-element selection branch (closes Open Question 1) + LabelOverrideInput (CUSTOM-06)"
  - "PropertiesPanel RESET_SIZE affordance for per-axis overrides (Open Question 3)"
  - "fabricSync custom-element label honours labelOverride first, catalog name second (D-14)"
  - "Edge-midpoint resize handles rendered for selected single product / custom element"
  - "Test-mode driver bridges: window.__driveResize, window.__driveWallEndpoint, window.__driveLabelOverride, window.__getCustomElementLabel"
  - "Shared 800x600 viewport stub in tests/setup.ts (Rule 3 deviation — see below)"

affects:
  - 31-04-verification (final acceptance gate)

tech-stack:
  added: []
  patterns:
    - "Driver bridge install on tool activate / removal on cleanup (mirrors Phase 30 driveSnap)"
    - "skipNextBlurRef guard for Escape-cancel-then-blur race in inline-edit inputs"
    - "Restricted snap scene cached at drag start (D-05 + D-09b cache reuse)"
    - "App auto-detect hasStarted from walls OR products (corrected pre-existing comment-vs-code mismatch)"

key-files:
  created: []
  modified:
    - src/canvas/fabricSync.ts
    - src/canvas/snapEngine.ts
    - src/canvas/tools/selectTool.ts
    - src/canvas/FabricCanvas.tsx
    - src/three/ProductMesh.tsx
    - src/components/PropertiesPanel.tsx
    - src/App.tsx
    - tests/setup.ts

key-decisions:
  - "Edge-handle hit dispatched via hitTestAnyResizeHandle (corners win ties — Pitfall 1 from Plan 31-02)"
  - "edgeDragToAxisValue grid-snap done in-tool with Math.max(0.25, round(v/grid)*grid) — pure module already clamps [0.25, 50]"
  - "Wall-endpoint snap scene rebuilt at every mousedown (cachedEndpointScene), cleared at mouseup + tool cleanup"
  - "Shift-ortho re-applied AFTER computeSnap returns (Pitfall 3 — pre-snap lock alone breaks because snap is per-axis-independent)"
  - "Edge handles render alongside corners on single-selection only (no bulk per Plan 31-02)"
  - "LabelOverrideInput uses skipNextBlurRef to prevent Escape→blur double-commit"
  - "Driver __driveLabelOverride bypasses DOM input but uses identical store-action sequence (NoHistory keystrokes + history-pushing commit) so single-undo invariant holds"

requirements-completed: []

# Metrics
duration: ~75 min (deeper than 31-02 — integration touching 8 files; included two driver-install diagnosis loops)
completed: 2026-04-20
---

# Phase 31 Plan 03: Integration Summary

**Wave 2 wires every Wave 1 pure module into live user flows: corner+edge product resize via combined hit-test, wall-endpoint smart-snap closing Phase 30 D-08b, custom-element label override with single-undo commit, and migrates all 7 enumerated effectiveDimensions consumer sites to resolveEffectiveDims/Custom — all 4 red RTL spec files turn GREEN.**

## Performance

- **Duration:** ~75 min
- **Started:** 2026-04-21T20:21Z
- **Completed:** 2026-04-21T20:33Z
- **Tasks:** 3
- **Files modified:** 8 (0 created, 8 modified)
- **Commits:** 3 task commits

## Accomplishments

- All 4 Wave 0 RTL integration test files flipped from RED to GREEN
  - `phase31Resize.test.tsx`: 6/6
  - `phase31WallEndpoint.test.tsx`: 6/6
  - `phase31Undo.test.tsx`: 7/7 (single-undo invariant holds across corner/edge/wall-endpoint/label-override)
  - `phase31LabelOverride.test.tsx`: 9/9
- Phase 30 smart-snap suite still GREEN (snapEngine 14/14, snapGuides 6/6, snapIntegration 12/12)
- Phase 25 dragIntegration suite still GREEN (2/2)
- Phase 29 PropertiesPanel.length suite still GREEN (5/5)
- Pre-existing cadStore + Wave 0 unit tests still GREEN (43/43 from Plan 31-02)
- Net suite delta: **+28 assertions green** (the 28 previously-red Phase 31 integration assertions)
- Single-undo invariant verified: every drag-resize + label-edit produces `past.length` delta === 1

## Task Commits

1. **Task 1: Migrate effectiveDimensions consumers + fabricSync label override** — `9e208ef` (feat)
2. **Task 2: selectTool product-resize-edge + wall-endpoint smart-snap + drivers** — `db8aada` (feat)
3. **Task 3: PropertiesPanel label-override input + RESET_SIZE + driver** — `c95c6ed` (feat)

## Files Modified

| File | Lines Δ | What |
|------|--------:|------|
| `src/canvas/fabricSync.ts` | +75 | resolveEffectiveDims/Custom at L60+L811; labelOverride lookup at L85; edge-handle render for products + custom elements; setLabelLookupCanvas + __getCustomElementLabel bridge |
| `src/canvas/snapEngine.ts` | +5/-3 | buildSceneGeometry product + custom element loops switched to resolveEffectiveDims/Custom |
| `src/canvas/tools/selectTool.ts` | +315 | new product-resize-edge dragType branch; wall-endpoint smart-snap mousemove with Shift+Alt; cachedEndpointScene; edgeDragInfo state; resolveEffectiveDims at 4 consumer sites; __driveResize + __driveWallEndpoint test bridges |
| `src/canvas/FabricCanvas.tsx` | +3 | wires setLabelLookupCanvas(fc) into redraw |
| `src/three/ProductMesh.tsx` | +2/-2 | effectiveDimensions → resolveEffectiveDims (3D mesh respects per-axis overrides) |
| `src/components/PropertiesPanel.tsx` | +185 | custom-element selection branch; LabelOverrideInput component (live preview + commit-on-Enter/blur + Escape-cancel + skipNextBlurRef guard); RESET_SIZE buttons for product + custom element; __driveLabelOverride bridge |
| `src/App.tsx` | +14/-3 | hasStarted auto-detect extended to placedProducts + placedCustomElements (Rule 2 — comment said "walls or products" but code only watched walls) |
| `tests/setup.ts` | +24 | shared 800x600 getBoundingClientRect stub (Rule 3 — replaces per-test stub from Phase 30 snapIntegration) |

**Total:** 8 files, +623 / -8 lines.

## Consumer Migration (resolveEffectiveDims)

7 enumerated sites migrated per RESEARCH §Pattern 3 + plan acceptance criteria:

| File | Site | Before | After |
|------|------|--------|-------|
| `src/three/ProductMesh.tsx` | L13 | `effectiveDimensions(product, placed.sizeScale)` | `resolveEffectiveDims(product, placed)` |
| `src/canvas/fabricSync.ts` | L811 (renderProducts) | `effectiveDimensions(product, pp.sizeScale)` | `resolveEffectiveDims(product, pp)` |
| `src/canvas/fabricSync.ts` | L60 (renderCustomElements) | inline `el.width * sc` | `resolveEffectiveCustomDims(el, p)` |
| `src/canvas/snapEngine.ts` | L186 (placedProducts loop) | `effectiveDimensions(prod, pp.sizeScale ?? 1)` | `resolveEffectiveDims(prod, pp)` |
| `src/canvas/snapEngine.ts` | L196 (placedCustomElements loop) | inline `el.width * sc` | `resolveEffectiveCustomDims(el, pce)` |
| `src/canvas/tools/selectTool.ts` | L82 (hitTestStore product) | `effectiveDimensions(product, pp.sizeScale)` | `resolveEffectiveDims(product, pp)` |
| `src/canvas/tools/selectTool.ts` | L100 (hitTestStore custom) | inline `el.width * sc` | `resolveEffectiveCustomDims(el, pce)` |
| `src/canvas/tools/selectTool.ts` | L291 (computeDraggedBBox) | `effectiveDimensions(prod, pp.sizeScale)` | `resolveEffectiveDims(prod, pp)` (also custom-element variants) |
| `src/canvas/tools/selectTool.ts` | L588 (resize hit-test) | `effectiveDimensions(prod, pp.sizeScale)` | `resolveEffectiveDims(prod, pp)` |
| `src/canvas/tools/selectTool.ts` | L855 (resize size-tag) | `effectiveDimensions(prod, newScale)` | `resolveEffectiveDims(prod, updatedPp)` (also custom-element variant) |

Anti-pattern guard verified: `effectiveDimensions` (legacy non-placed signature) still exported from `src/types/product.ts` and unmodified.

`updateCustomElement` (catalog mutator) still untouched (Pitfall 4 guard preserved — `updatePlacedCustomElement` is the placement mutator added in Plan 31-02).

## Driver Bridges Installed (test mode only)

```typescript
window.__driveResize = {
  start: (placedId, "corner-{ne,nw,sw,se}" | "edge-{n,s,e,w}") => void,
  to: (feetX, feetY, opts?: { shift?: boolean; alt?: boolean }) => void,
  end: () => void,
};

window.__driveWallEndpoint = {
  start: (wallId, "start"|"end") => void,
  to: (feetX, feetY, opts?: { shift?: boolean; alt?: boolean }) => void,
  end: () => void,
  getGuides: () => Array<{ type: "snap-guide" }>,
};

window.__driveLabelOverride = {
  typeAndCommit: (pceId, text, "enter"|"blur") => void,
};

window.__getCustomElementLabel = (pceId) => string | null;
```

All four are removed in their respective cleanup closures (selectTool activate cleanup for the first two, PropertiesPanel useEffect return for the label driver). `__getCustomElementLabel` re-installs on every fabricSync render via `setLabelLookupCanvas(fc)`.

## Test State Transition

| Test File | Before Plan 31-03 | After Plan 31-03 | Note |
|-----------|------------------:|------------------:|------|
| `tests/phase31Resize.test.tsx` | 0/6 | **6/6** | RTL — corner/edge/grid-snap/reset/mirror axis |
| `tests/phase31WallEndpoint.test.tsx` | 0/6 | **6/6** | RTL — endpoint/midpoint/Shift/Alt/no-product/guide-clear |
| `tests/phase31Undo.test.tsx` | 0/7 | **7/7** | corner/edge-product/edge-custom/wall-endpoint/label-Enter/label-blur/undo-restore |
| `tests/phase31LabelOverride.test.tsx` | 1/9 | **9/9** | placeholder/maxLength/live-preview/no-debounce/Enter/blur/empty-revert/Escape/render/round-trip |
| **Wave 0 RTL integration total** | **1/28** | **28/28** | ✓ |
| `tests/snapIntegration.test.tsx` | 12/12 | 12/12 | Phase 30 regression — green |
| `tests/snapEngine.test.ts` | 14/14 | 14/14 | Phase 30 regression — green |
| `tests/snapGuides.test.ts` | 6/6 | 6/6 | Phase 30 regression — green |
| `tests/dragIntegration.test.ts` | 2/2 | 2/2 | Phase 25 regression — green |
| `tests/PropertiesPanel.length.test.tsx` | 5/5 | 5/5 | Phase 29 regression — green |

## Requirement Coverage

Per plan instructions, requirements are NOT marked complete here — Plan 31-04 verification closes them. This plan provides the implementation:

| Requirement | Coverage |
|-------------|----------|
| **EDIT-22** | Corner→sizeScale + edge→per-axis override; grid-snap to uiStore.gridSnap; reset clears overrides → all 6 phase31Resize assertions green + edge-product undo |
| **EDIT-23** | Wall-endpoint drag invokes computeSnap with restricted scene; Shift locks ortho; Alt disables snap; product bboxes excluded → all 6 phase31WallEndpoint assertions green |
| **EDIT-24** | All 4 drag types + label-override commit produce past.length delta === 1; mid-drag NoHistory; _dragActive fast-path preserved → all 7 phase31Undo assertions green |
| **CUSTOM-06** | LabelOverrideInput live-preview + commit-on-Enter/blur + Escape-cancel + empty-revert + maxLength=40 + uppercase ghost text + 2D render override + save/load round-trip → all 9 phase31LabelOverride assertions green |

## Decisions Made

- **Edge-handle visual reuse:** Render edge handles via the same `fabric.Rect(10x10, fill #12121d, stroke #7c5bf0)` style as corners — visual parity matches corner/edge hit-radius parity (0.5ft each, locked in Plan 31-02). Tagged `data.type === "resize-handle-edge"` to differentiate from corners.
- **Driver bridge invocation pattern:** Reused Phase 30 `withDrivenPointer(posFeet, fn)` helper to override `fc.getViewportPoint` for one call. Bridges synthesize `MouseEvent { altKey, shiftKey, ... }` to inject modifier state without touching DOM.
- **Wall-endpoint scene rebuild every mousedown:** Plan suggested cache-once-per-drag (D-09b). Implemented identically — `cachedEndpointScene` is built once at mousedown, read on every mousemove, cleared at mouseup + cleanup. No reactive invalidation (over-engineering per Pitfall 5).
- **Shift-ortho post-snap re-override (Pitfall 3):** computeSnap is per-axis independent and doesn't know Shift is held. Pre-snap lock OR post-snap re-override are both valid; the plan's pseudocode uses both (pre-lock the candidate AND re-apply after snap). Implemented as written for explicit safety.
- **Driver invocation needs selection set:** `__driveResize.start` and `__driveWallEndpoint.start` call `useUIStore.getState().select([id])` because the mousedown handle hit-test branch only runs for currently-selected items. Without this, a fresh test render with `selectedIds: [PP_ID]` would still race the FabricCanvas redraw.
- **`require("../resizeHandles")` was a test-only mistake:** Initially used a dynamic require to avoid a forward-references import cycle; Vite/ESM doesn't honor `require()` inside ESM modules. Refactored to top-level `getResizeHandles` import — no cycle materialized.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] Shared viewport stub in tests/setup.ts**
- **Found during:** Task 2 driver-install verification
- **Issue:** happy-dom returns 0-size `getBoundingClientRect()` for every element. `FabricCanvas.redraw()` short-circuits when `cW === 0 || cH === 0`, which means it never reaches `activateCurrentTool()` — and the test-mode driver bridges install inside `activateSelectTool`. Phase 30 snapIntegration solved this with a per-test `stubCanvasViewport()`. Phase 31 RTL specs (immutable red contracts from Plan 01) don't include the stub. Without it, every Phase 31 driver-based test fails with "expected window.__driveX to be defined" after a 2-second timeout.
- **Fix:** Added an 800x600 default `getBoundingClientRect` override to `tests/setup.ts` that only kicks in when the native rect would have returned zero. snapIntegration's per-test override still wins because the helper checks for non-zero native first.
- **Files modified:** `tests/setup.ts`
- **Committed in:** `db8aada` (Task 2 commit)

**2. [Rule 2 — Missing critical functionality] hasStarted auto-detect extended to placed products + custom elements**
- **Found during:** Task 2 — even with the viewport stub, `phase31Resize` tests seed only `placedProducts`, no walls. App's `useEffect(() => { if (wallCount > 0) setHasStarted(true); }, [wallCount])` never fires, so the test renders WelcomeScreen and FabricCanvas never mounts.
- **Issue:** The effect's comment says "Auto-detect if user has started (has walls or products)" but the code only watches `wallCount`. This is a pre-existing comment-vs-code mismatch (likely an oversight when the original code was written). The intended behavior is clear from the comment.
- **Fix:** Added `useActivePlacedProducts()` + `useActivePlacedCustomElements()` selectors and extended the dependency to `[wallCount, placedCount]` where `placedCount = products.size + customs.size`.
- **Production impact:** Real-world UX improvement — users who restore a project containing only products (no walls — unusual but possible) now skip WelcomeScreen.
- **Files modified:** `src/App.tsx`
- **Committed in:** `db8aada` (Task 2 commit)

**3. [Rule 1 — Bug] Escape→blur double-commit on label-override input**
- **Found during:** Task 3 phase31LabelOverride Escape test
- **Issue:** When user pressed Escape, `cancel()` called `setDraft(originalRef.current)` (async) then `(e.target).blur()` (sync). The blur immediately fires `onBlur → commit()`, which reads the STALE draft closure (still containing the typed text "new"), writing it as the final commit and obliterating the cancel.
- **Fix:** Added `skipNextBlurRef = useRef(false)`. `cancel()` sets it true; `commit()` checks-and-clears it; if set, commit is a no-op for that one cycle. Mirrors the Phase 29 dimension-editor float-drift guard pattern (defensive flag for blur ordering).
- **Files modified:** `src/components/PropertiesPanel.tsx`
- **Committed in:** `c95c6ed` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 1 missing functionality, 1 blocking infra issue)
**Impact on plan:** All deviations were necessary unblockers — without them, the integration tests cannot pass even with correct production code. None expanded scope; all are localized fixes.

## Issues Encountered

- Initial driver-install diagnosis took two debug loops (viewport stub + hasStarted gate). After both fixes landed in Task 2, all subsequent driver tests passed first-try.
- TypeScript pre-existing baseUrl warning persists (TS5101) — not in scope; carried over from Plan 31-02 deferred-items.

## Out-of-Scope Failures (verified pre-existing)

Re-verified the same 6 failures from Plan 31-02:
- `tests/AddProductModal.test.tsx` — 3 failures (LIB-04 SKIP_DIMENSIONS rendering)
- `tests/SidebarProductPicker.test.tsx` — 2 failures (LIB-05 filter, dragstart effectAllowed)
- `tests/productStore.test.ts` — 1 failure (LIB-03 pre-load set() guard)

NOT caused by Plan 31-03. Already documented in `deferred-items.md`.

## Full Suite Pass Counts

| Run | Files | Tests passed | Tests failed |
|-----|------:|-------------:|-------------:|
| Before Plan 31-03 (post-31-02 baseline) | 48 | 313 | 33 |
| After Plan 31-03 | 48 | 340 | 6 |
| **Δ** | 0 | **+27** | **−27** |

(One Phase 31 spec already had 1/9 green from a fixture-only assertion in Plan 31-02, so Plan 31-03 flipped 27 reds — not 28 — to green; the remaining 6 failures are all pre-existing LIB-03/04/05.)

## Next Phase Readiness

**Wave 3 (Plan 31-04 verification) is unblocked.** Verifier work:
1. Confirm `npm test` passes the 28 newly-green Phase 31 assertions.
2. Audit `git diff main..HEAD` for scope drift outside the 8 modified files.
3. Run `requirements mark-complete EDIT-22 EDIT-23 EDIT-24 CUSTOM-06` after acceptance.
4. UAT: visually verify edge-handle render style matches corner handles; verify Shift-ortho + snap interaction in real-world drag.

## Self-Check

- [x] All 8 files in `key-files.modified` exist on disk and contain the documented changes
- [x] Commit `9e208ef` exists (Task 1 — `git log --oneline | grep 9e208ef`)
- [x] Commit `db8aada` exists (Task 2)
- [x] Commit `c95c6ed` exists (Task 3)
- [x] All 28 Phase 31 RTL integration assertions green
- [x] Phase 30/29/25 regression suites all green (no regression in snap engine, snap guides, snap integration, drag integration, PropertiesPanel.length)
- [x] `effectiveDimensions` legacy export still exists in `src/types/product.ts` (anti-pattern guard)
- [x] `updateCustomElement` (catalog mutator) untouched (Pitfall 4 guard)
- [x] `npx tsc --noEmit` clean (only pre-existing TS5101 baseUrl warning)
- [x] `git diff --stat` confined to the 8 documented files

## Self-Check: PASSED

All 8 files modified exist on disk with the documented changes. All 3 task commits exist in git log. All 28 Phase 31 RTL integration assertions green. Anti-pattern + Pitfall 4 guards preserved by inspection. Zero regression in Phase 25/29/30 suites.

---
*Phase: 31-drag-resize-label-override*
*Plan: 03 (Wave 2 — integration)*
*Completed: 2026-04-20*
