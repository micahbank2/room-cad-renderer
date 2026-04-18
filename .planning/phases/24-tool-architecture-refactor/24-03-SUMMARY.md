---
phase: 24-tool-architecture-refactor
plan: 03
subsystem: canvas-tools
tags: [refactor, cleanup-pattern, closure-state, typescript, fabric, leak-regression]

# Dependency graph
requires:
  - phase: 24-tool-architecture-refactor
    provides: "Wave 1 consolidated helpers (pxToFeet, findClosestWall) in ./toolUtils; test scaffold with describe.skip"
provides:
  - "All 6 tool files return () => void cleanup fn from activateXTool — zero (fc as any).__xToolCleanup casts remain in src/canvas/tools/"
  - "Tool-internal mutable state lives in activate() closures (per D-06); WallToolState / SelectState / CeilingToolState wrapper interfaces deleted"
  - "FabricCanvas.tsx owns tool lifecycle via toolCleanupRef: useRef<(() => void) | null>"
  - "tests/toolCleanup.test.ts active with 6 passing leak-regression cases"
affects: [24-04-wave3-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useEffect-idiomatic cleanup: activate() returns () => void, caller stores in useRef, invokes on switch + unmount"
    - "Closure state over module-level state objects — parallel tool activations cannot bleed state"
    - "Public-API bridges (pendingProductId, _productLibrary) intentionally kept module-scoped per D-07"
    - "Pure helpers with no state access (findNearestEndpoint) stay at module scope per D-08"

key-files:
  created: []
  modified:
    - src/canvas/tools/productTool.ts
    - src/canvas/tools/doorTool.ts
    - src/canvas/tools/windowTool.ts
    - src/canvas/tools/ceilingTool.ts
    - src/canvas/tools/wallTool.ts
    - src/canvas/tools/selectTool.ts
    - src/canvas/FabricCanvas.tsx
    - tests/toolCleanup.test.ts

key-decisions:
  - "Committed Tasks 1+2+3a as a single refactor commit (85c21ae) — individual per-tool commits would have broken the build mid-bisect because FabricCanvas imports all 6 tools simultaneously. Task 3b (test un-skip, f8f26aa) is a separate test-only commit."
  - "Deleted dead-code `getPendingProduct` export from productTool.ts per RESEARCH.md §9 Q1 — zero call sites anywhere in the tree."
  - "In selectTool, dropped the `WallSegment` type-only import that had become unused after interface deletion (was only used by SelectState type fields that no longer exist)."
  - "Preserved the `void hw;` no-op in updateSizeTag — same dead-code marker as before, kept for diff hygiene."
  - "Replaced `deactivateAllTools(fc)` + `activateCurrentTool(fc, ...)` pair with single `toolCleanupRef.current?.(); toolCleanupRef.current = activateCurrentTool(...)` line at both call sites (redraw and unmount)."
  - "Added `default: return null` to `activateCurrentTool` switch per Pitfall #4 — unknown tool names no longer silently install no listeners while previous cleanup stays stale."

requirements-completed: [TOOL-01, TOOL-02]

# Metrics
duration: 6m 9s
completed: 2026-04-17
---

# Phase 24 Plan 03: Wave 2 Cleanup-Fn Pattern Summary

**All 6 canvas tools now return `() => void` from `activateXTool` and hold per-activation state in closures; all 18 `(fc as any).__xToolCleanup` casts eliminated; FabricCanvas.tsx owns tool lifecycle via `toolCleanupRef`; 6 new listener-leak regression tests pass.**

## Performance

- **Duration:** 6m 9s
- **Started:** 2026-04-18T03:09:56Z
- **Completed:** 2026-04-18T03:16:05Z
- **Tasks:** 3
- **Files modified:** 8
- **Net diff:** +550 insertions / −672 deletions across the two commits

## Accomplishments

- **Cleanup pattern (TOOL-01):** 18 of 18 `(fc as any).__xToolCleanup` casts eliminated (3 per tool × 6 tools). Every `activateXTool` now returns an explicit `() => void` cleanup fn.
- **Closure state (TOOL-02):** Every module-level `const state: XToolState = {...}` declaration dissolved into `let`-bindings inside the `activate()` closure. `WallToolState`, `SelectState`, and `CeilingToolState` interfaces deleted. Module-level mutable helpers that read those state objects (`commitCeiling`, `cleanup` in ceilingTool; `cleanup` in wallTool; `sizeTag` + `updateSizeTag` + `clearSizeTag` + `updateTextTag` in selectTool) inlined into the closures.
- **Public-API bridges preserved per D-07:** `pendingProductId` + `setPendingProduct` remain module-scoped in productTool. `_productLibrary` + `setSelectToolProductLibrary` remain module-scoped in selectTool. Both are intentional component → tool bridges, not per-activation state.
- **Consumer update:** FabricCanvas.tsx dropped all 6 `deactivateXTool` imports. `deactivateAllTools` helper deleted. `activateCurrentTool` now returns `(() => void) | null` with a `default: return null` branch for unknown tools. Added `toolCleanupRef = useRef<(() => void) | null>(null)` invoked on tool switch (redraw useCallback) and unmount (with order preserved: cleanup → null out → `fc.dispose()`).
- **Dead code deleted:** `getPendingProduct` export removed from productTool.ts (zero call sites).
- **Test suite active:** `tests/toolCleanup.test.ts` flipped from `describe.skip` to `describe`. All 6 listener-leak regression tests pass, locking in the no-listener-leak contract across 10 activate/cleanup cycles per tool.
- **Test delta:** 162 passing → 168 passing (+6 from toolCleanup suite). 6 failing preserved (same pre-existing names). 6 skipped → 0 skipped. 3 todo preserved.

## Task Commits

1. **Task 1 (4 simple tools) + Task 2 (wallTool + selectTool) + Task 3a (FabricCanvas + activateCurrentTool)** — `85c21ae` (refactor). Committed as a single unit because FabricCanvas imports all 6 tools in one statement set; splitting would have broken the build mid-bisect.
2. **Task 3b (un-skip toolCleanup tests)** — `f8f26aa` (test). Flipped `describe.skip` → `describe`; the 6 leak-regression cases now run and pass.

## Files Modified

| File | Change | Before | After | Δ |
|------|--------|--------|-------|---|
| `src/canvas/tools/productTool.ts` | Deleted `getPendingProduct` dead-code export + `deactivateProductTool` + `(fc as any).__productToolCleanup` cast; converted to cleanup-fn return; kept `pendingProductId` module-scoped per D-07 | 62 | 49 | −13 |
| `src/canvas/tools/doorTool.ts` | Moved `previewPolygon` + `updatePreview` + `clearPreview` into closure; deleted `deactivateDoorTool` + self-call; added explicit `(): () => void` return type | 139 | 128 | −11 |
| `src/canvas/tools/windowTool.ts` | Same transformation as doorTool (previewPolygon into closure, cleanup helpers inlined, deactivate deleted) | 135 | 124 | −11 |
| `src/canvas/tools/ceilingTool.ts` | Deleted `CeilingToolState` interface + `const state` object; inlined module-level `commitCeiling` + `cleanup` helpers into closure; cleanup-fn return; deleted `deactivateCeilingTool` | 197 | 177 | −20 |
| `src/canvas/tools/wallTool.ts` | Deleted `WallToolState` interface + `const state`; inlined module-level `cleanup` helper as `clearPreview`; kept `findNearestEndpoint` at module scope per D-08; deleted `deactivateWallTool` | 253 | 232 | −21 |
| `src/canvas/tools/selectTool.ts` | Deleted `SelectState` interface + 15-field `const state`; moved `sizeTag` + `updateSizeTag` + `clearSizeTag` + `updateTextTag` into closure (dropped `viewScale`/`viewOrigin` params since now captured); dropped unused `WallSegment` type import; preserved 4 deferred `as any` casts on `useCADStore.getState()` / `doc` per D-10 | 739 | 706 | −33 |
| `src/canvas/FabricCanvas.tsx` | Dropped 6 `deactivateXTool` imports; deleted `deactivateAllTools` helper; added `toolCleanupRef = useRef<(() => void) \| null>(null)`; invoked on redraw + unmount; `activateCurrentTool` now returns `(() => void) \| null` with `default: return null`; 3 deferred `as any` casts on fabric events preserved per D-11 | 501 | 482 | −19 |
| `tests/toolCleanup.test.ts` | Flipped `describe.skip("... (Wave 2 enables)", ...)` → `describe("tool cleanup — no listener leaks", ...)`; removed the "Wave 2 enables" parenthetical from the suite name | 80 | 79 | −1 |
| **Total** | | **2106** | **1977** | **−129** |

## Cast Elimination Audit

All 18 `(fc as any).__xToolCleanup` patterns eliminated (3 per tool × 6 tools: assign site, retrieve site, `delete` site):

| File | (fc as any) cast count before | after |
|------|-------------------------------|-------|
| `productTool.ts` | 3 | 0 |
| `doorTool.ts` | 3 | 0 |
| `windowTool.ts` | 3 | 0 |
| `ceilingTool.ts` | 3 | 0 |
| `wallTool.ts` | 3 | 0 |
| `selectTool.ts` | 3 | 0 |
| **Total in src/canvas/tools/** | **18** | **0** |

Verified: `grep -rE "\(fc as any\)" src/canvas/tools/` returns zero matches.

## Module-Scope Bindings INTENTIONALLY Preserved

Per D-07 and D-08:

| Binding | File | Reason |
|---------|------|--------|
| `let pendingProductId: string \| null` | productTool.ts | Toolbar → tool bridge (public API via `setPendingProduct`) — not per-activation state |
| `export function setPendingProduct(...)` | productTool.ts | Public API consumed by ProductLibrary component |
| `let _productLibrary: Product[]` | selectTool.ts | Component → tool bridge for hit-testing (consumed inside `hitTestStore`) |
| `export function setSelectToolProductLibrary(...)` | selectTool.ts | Public API consumed by FabricCanvas.tsx useEffect |
| `function findNearestEndpoint(...)` | wallTool.ts | Pure helper — no state access — per D-08 |
| `function pointInPolygon(...)` | selectTool.ts | Pure math helper |
| `function hitTestStore(...)` | selectTool.ts | Pure helper (receives `productLibrary` + reads `getActiveRoomDoc()` but no closure state) |
| `const ENDPOINT_SNAP_THRESHOLD_FT` | wallTool.ts | Compile-time constant |
| `const DOOR_WIDTH`, `const WINDOW_WIDTH` | doorTool.ts, windowTool.ts | Per-tool element widths (kept per Wave 1 decision) |

## Deferred Casts UNTOUCHED (per D-10 / D-11)

**selectTool.ts — 4 `as any` casts on catalog access (D-10):**
- Line 85: `(doc as any).placedCustomElements` — reading placed custom elements off RoomDoc (requires RoomDoc type extension)
- Line 86: `(useCADStore.getState() as any).customElements` — reading catalog off root CAD store
- Line 304: same catalog cast inside mouse-down handler
- Line 467: same catalog cast inside mouse-move handler

Verified: `grep -c "as any" src/canvas/tools/selectTool.ts` returns **4** (all on `useCADStore.getState()` or `doc`, none on `fc`).

**FabricCanvas.tsx — 3 `as any` casts on fabric event types (D-11):**
- Line 210: `opt.e as any` (fabric.js v6 `TEvent.e` union-type gap for `getViewportPoint`)
- Line 250: `onDblClick as any` (fabric.js v6 handler type mismatch on `mouse:dblclick`)
- Line 251: `onDblClick as any` (same, on `fc.off`)

Verified: `grep -c "as any" src/canvas/FabricCanvas.tsx` returns **3**.

## Test Suite Delta

| Metric | Wave 1 baseline | Wave 2 after | Δ |
|--------|-----------------|--------------|---|
| Passing | 162 | 168 | **+6** |
| Failing | 6 | 6 | 0 (same names) |
| Skipped | 6 | 0 | **−6** (toolCleanup suite activated) |
| Todo | 3 | 3 | 0 |
| **Total** | **177** | **177** | 0 |

The 6 new passing tests in `tests/toolCleanup.test.ts` verify:
- `doorTool activate/cleanup cycle stays leak-free`
- `windowTool activate/cleanup cycle stays leak-free`
- `productTool activate/cleanup cycle stays leak-free`
- `ceilingTool activate/cleanup cycle stays leak-free`
- `wallTool activate/cleanup cycle stays leak-free`
- `selectTool activate/cleanup cycle stays leak-free`

Each test confirms `fc.__eventListeners` count returns to baseline after 10 activate/cleanup cycles.

## Decisions Made

- **Single-commit refactor over per-tool commits.** FabricCanvas.tsx imports all 6 tools in adjacent lines. Committing tool-by-tool would have left the build red between commits because FabricCanvas's `deactivateAllTools` helper calls every `deactivateXTool` import simultaneously. One atomic refactor commit (85c21ae) + a separate test-only commit (f8f26aa) preserves clean bisect and clean `git log`.
- **Deleted `getPendingProduct` dead-code export.** Plan called this out in RESEARCH.md §9 Q1 — grep confirmed zero call sites before deletion.
- **Dropped `viewScale` / `viewOrigin` parameters from selectTool's tag-update helpers.** Once `updateSizeTag` / `updateTextTag` moved into the closure, they capture `scale` + `origin` directly — passing them as arguments would have been redundant boilerplate.
- **Dropped unused `WallSegment` type-only import** from selectTool.ts. It was only referenced by the deleted `SelectState` interface fields.
- **Preserved `rotateInitialAngle` let-binding.** It's assigned but never read — same as the original `state.rotateInitialAngle` field. Kept for drop-in behavioral equivalence; removal is deferred as it's outside the refactor's zero-behavior-change contract.
- **Preserved `void hw;` no-op in `updateSizeTag`.** Dead-code marker that existed in the original; kept for diff hygiene. Could be removed in a future cleanup sweep.
- **Retained `sizeTag` sharing between `updateSizeTag` and `updateTextTag` inside the closure.** The original design intentionally reused one group so only one floating tag is visible at a time (documented in the file's JSDoc). Preserved that semantic by keeping `sizeTag` as a single closure-scoped variable that both helpers manipulate.

## Deviations from Plan

None. Every task executed as specified in the plan. The "note: build will be red between Task 2 and Task 3" guidance was addressed by committing both atomically.

## Issues Encountered

- **`tsc --noEmit` exits with code 2 (not 0) due to a pre-existing `tsconfig.baseUrl` deprecation warning.** This was present in Wave 1 and is tracked as deferred debt per Wave 1 SUMMARY. The warning is structural (deprecated `baseUrl` option), not a type error caused by Wave 2 changes. No type errors from our refactor — verified by diffing `tsc` output before and after the commits.

## Scope Discipline — What Was NOT Touched

Per D-10 / D-11 scope guards:
- 4 `as any` casts in `selectTool.ts` on `doc`/`useCADStore.getState()` — INTACT (D-10: deferred — requires `cadStore.customElements` type extension)
- 3 `as any` casts in `FabricCanvas.tsx` on fabric event types (lines 210, 250, 251) — INTACT (D-11: deferred — fabric.js v6 type-def gaps)
- Module-level public-API bindings (`pendingProductId`, `setPendingProduct`, `_productLibrary`, `setSelectToolProductLibrary`) — INTACT (D-07)
- Pure module-level helpers (`findNearestEndpoint`, `pointInPolygon`, `hitTestStore`) — INTACT (D-08)

## User Setup Required

None — pure internal refactor with zero user-visible behavior change.

## Handoff Note for Wave 3 (24-04)

All three TOOL requirements are now implementation-complete:

- **TOOL-01** (cleanup-fn return pattern) ✅ — delivered in Wave 2
- **TOOL-02** (tool state in closures) ✅ — delivered in Wave 2
- **TOOL-03** (extract pxToFeet + findClosestWall) ✅ — delivered in Wave 1

Remaining Wave 3 work per plan:
1. **Phase-level automated verification** — full `npm test` (expect 168 passing + 6 pre-existing failing + 3 todo) + `npx tsc --noEmit` clean (sans pre-existing baseUrl warning)
2. **Manual smoke test per D-13** — draw 3 walls, place door, place window, place product, draw ceiling, rapid tool switch ×10 with Chrome DevTools Event Listener count monitor. Automated leak regression (Wave 2) locks in the contract, but the manual smoke confirms no user-visible regressions in drawing/placement/selection/dragging/undo-redo.
3. **CLAUDE.md update** — the "Tool System" section documents the pre-refactor `(fc as any).__xToolCleanup` pattern (listed as gotcha #5). Update to document the new cleanup-fn + `toolCleanupRef` pattern.
4. **PR prep** — summarize the 4-wave phase in a single PR description; the three refactor commits (ce8d8ca, 9208523, 85c21ae) plus the test commit (f8f26aa) plus doc commits tell a clean bisect story.

Watch-items for Wave 3:
- Confirm by manual smoke that no tool leaves stale preview objects on switch (productTool → wallTool mid-preview, ceilingTool → selectTool mid-polygon, doorTool → productTool mid-hover).
- Verify `toolCleanupRef` interaction with `fc.dispose()` order (cleanup FIRST, then dispose) — Pitfall #3 in RESEARCH.md. The unmount effect now does this correctly.
- Verify the leak-regression test mirrors production listener patterns. If future tools add more listener types (mouse:over, wheel, etc.), the test helper's `countListeners` still works — it counts all event types in `__eventListeners`.

## Next Phase Readiness

- Wave 3 (24-04) can start immediately. All implementation requirements are delivered.
- The `requirements-completed: [TOOL-01, TOOL-02]` frontmatter lets `requirements mark-complete` update REQUIREMENTS.md traceability.
- Phase closure pending Wave 3 verification + manual smoke + PR.

---

## Self-Check: PASSED

- Both Wave 2 commits verified on branch `claude/friendly-merkle-8005fb`:
  - `85c21ae` — refactor(24-03): convert tools to cleanup-fn return pattern + closure state
  - `f8f26aa` — test(24-03): un-skip tool cleanup leak-regression suite
- `grep -rE "\(fc as any\)" src/canvas/tools/` returns **zero** matches (all 18 casts eliminated).
- `grep -E "^const state" src/canvas/tools/*.ts` returns **zero** matches.
- `grep -rE "^export function deactivate" src/canvas/tools/` returns **zero** matches.
- `grep -lE "\): \(\) => void \{" src/canvas/tools/*Tool.ts | wc -l` returns **6** (all activate fns have explicit cleanup-fn return type).
- `grep -c "toolCleanupRef.current" src/canvas/FabricCanvas.tsx` returns **5** (1 declaration + 2 invocations + 2 assignments).
- `grep -q "default: return null" src/canvas/FabricCanvas.tsx` confirmed.
- `grep -q "describe.skip" tests/toolCleanup.test.ts` returns NO matches (suite un-skipped).
- `npm test -- --run tests/toolCleanup.test.ts` — all **6 tests pass** in 232ms.
- `npm test` full suite: **168 passing + 6 failing + 3 todo = 177 total** (baseline 162 passing + 6 new toolCleanup = 168; 6 failing names unchanged).
- D-07 bindings preserved: `grep -q "^let pendingProductId" src/canvas/tools/productTool.ts` confirmed. `grep -q "^let _productLibrary" src/canvas/tools/selectTool.ts` confirmed.
- D-10 casts preserved: `grep -c "as any" src/canvas/tools/selectTool.ts` returns **4** (all on `useCADStore.getState()` or `doc`, not `fc`).
- D-11 casts preserved: `grep -c "as any" src/canvas/FabricCanvas.tsx` returns **3** (on fabric event types at lines 210/250/251).
- `findNearestEndpoint` preserved at module scope per D-08: `grep -q "function findNearestEndpoint" src/canvas/tools/wallTool.ts` confirmed.
- `npx tsc --noEmit` returns only the pre-existing `tsconfig.baseUrl` deprecation warning — no new type errors from Wave 2 changes (verified by identical warning in pre-refactor stash check).

---
*Phase: 24-tool-architecture-refactor*
*Completed: 2026-04-17*
