---
phase: 90-canvas-polish
plan: 02
subsystem: ui
tags: [fabric, pan, cursor, selectTool, e2e, strictmode]

# Dependency graph
requires:
  - phase: 90-canvas-polish-01
    provides: MutationObserver-driven canvas-bg flip + 208px viewport reservation
  - phase: 6-cad-nav
    provides: useUIStore.setPanOffset + middle-mouse + Space+left pan handler in FabricCanvas.tsx
provides:
  - left-click pan on empty 2D canvas with Select tool active (#203)
  - hover-cursor 'grab' + drag-cursor 'grabbing' wiring on the Select tool wrapper
  - _panActive module flag + ORed gating in shouldSkipRedrawDuringDrag — same
    pattern as _dragActive for entity drag; needed because setPanOffset triggers
    a redraw that would otherwise re-activate the tool mid-pan
affects: [Phase 91+ if any new tool wants pan-on-empty parity]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Closure-scoped per-activation state for pan-drag (panStart, onPanMove, onPanUp)"
    - "_panActive flag mirroring _dragActive to suppress redraw-during-pan tool re-activation"
    - "Window-level mousemove/mouseup listeners installed on mousedown, removed in onPanUp + cleanup"

key-files:
  modified:
    - src/canvas/tools/selectTool.ts
    - tests/e2e/specs/90-canvas-polish.spec.ts
    - .planning/phases/90-canvas-polish/deferred-items.md

key-decisions:
  - "Pan-start lives in selectTool's no-hit mousedown branch — NOT in FabricCanvas. Co-located with Select tool behavior; FabricCanvas pan handler (middle-mouse + Space+left) keeps power-user paths untouched (early-returns for plain left-click)."
  - "_panActive flag mirrors _dragActive. Without it, setPanOffset → store change → FabricCanvas redraw → toolCleanupRef.current?.() → re-activate would discard panStart on the FIRST pan-move. With it, shouldSkipRedrawDuringDrag returns true while pan is live."
  - "No new test bridge added. Existing window.__uiStore (Phase 62 MEASURE-01) suffices for reading panOffset + calling setTool from e2e."
  - "Hit-clash guard test computes wall midpoint pixel using padding=50 (matches FabricCanvas.getBaseFitScale), NOT padding=40. Initial RED spec had this wrong; corrected during GREEN."

patterns-established:
  - "Per-tool pan extension pattern: closure-scoped pan state + module-level activity flag + same redraw-gating as drag. Future tools wanting empty-canvas pan can replicate."

requirements-completed: ["#203"]

# Metrics
duration: 35min
completed: 2026-05-15
---

# Phase 90 Plan 02: Left-Click Pan on Empty Canvas (#203) + Fit-to-Screen Pan Reset (D-06) Summary

**Left-click + drag on empty 2D canvas pans the view when Select tool is active; cursor flips grab → grabbing → cleared; Fit-to-screen continues to reset pan to {0,0}.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2 (RED + GREEN, verification rolled into GREEN)
- **Files modified:** 1 source (selectTool.ts), 1 spec (90-canvas-polish.spec.ts), 1 deferred-items doc
- **Lines added/removed:** +110 / -7

## Accomplishments

- **#203 closed.** Left-click + drag on empty 2D canvas with the Select tool active now pans the view by mutating `useUIStore.setPanOffset`. Mirrors the existing FabricCanvas middle-mouse + Space+left pan handler (which remains untouched for power users).
- **D-06 verified.** Fit-to-screen button in FloatingToolbar resets `panOffset` to `{0, 0}` and `userZoom` to `1`. No code change required — the existing wiring at `uiStore.ts:360` (`resetView: () => set({ userZoom: 1, panOffset: { x: 0, y: 0 } })`) and `FloatingToolbar.tsx:538-539` (`onClick={() => resetView()}`) was confirmed correct by Spec 5.
- **Cursor wiring shipped.** Hover on empty canvas with Select tool active shows `cursor: grab`. During pan-drag, `cursor: grabbing`. Both restored on mouseup or tool teardown.

## Task Commits

1. **Task 1 RED — Failing e2e specs (Specs 3/4/5)** — `84a2f9d` (test)
2. **Task 1 GREEN + Task 2 verification combined** — `c1285a6` (fix)

(Task 2 — verification of Spec 5 — happened in-line with Task 1 GREEN because Spec 5 needs Spec 3's pan to fire to induce non-zero offset. Separate "verify D-06" commit would have been a no-op since wiring was already correct.)

## Files Created/Modified

- **`src/canvas/tools/selectTool.ts`** (+78 lines):
  - L207-216 (new): `_panActive` module-level flag + `isSelectToolPanActive()` exporter (mirrors `_dragActive` pattern from Phase 25).
  - L233-238 (modified): `shouldSkipRedrawDuringDrag` ORs `_panActive` with `_dragActive` — both gates skip redraws during their respective live gestures.
  - L356-389 (new): closure-scoped `panStart`, `getWrapperEl()`, `onPanMove`, `onPanUp` — all per-activation, no module-level closure leak.
  - L1057-1077 (new in onMouseMove): hover-cursor branch — sets `grab` on empty hover, `''` on entity hit. Guarded by `!dragging && !panStart` so it doesn't override active drag/pan cursors.
  - L1043-1063 (new in onMouseDown no-hit branch): pan-start logic — captures clientX/Y + origin pan offset, sets `_panActive=true`, sets wrapper cursor to `grabbing`, installs window-level mousemove/mouseup. Defensive: only fires on `button===0` with no modifier keys.
  - L1957-1973 (modified in activate() cleanup): clears in-flight pan listeners + cursor; also clears any lingering hover `grab` cursor.

- **`tests/e2e/specs/90-canvas-polish.spec.ts`** (+200 lines, 3 new specs):
  - Spec 3 (`#203 — left-click drag on empty canvas pans the view`): synthesizes mouse down/move/up on empty canvas, asserts panOffset shifts by cursor delta AND cursor was 'grabbing' during the drag AND not 'grabbing' after.
  - Spec 4 (`#203 — left-click on a wall does NOT pan (hit-clash guard)`): computes wall midpoint pixel coords using padding=50 (matches FabricCanvas.getBaseFitScale), clicks on wall, asserts panOffset unchanged.
  - Spec 5 (`#203 / D-06 — Fit-to-screen resets pan to {0,0}`): induces non-zero pan via Spec 3 mechanic, clicks `[data-testid="toolbar-fit"]`, asserts panOffset reset to `{0,0}` and userZoom to `1`.

- **`.planning/phases/90-canvas-polish/deferred-items.md`** (+18 lines): logged 3 pre-existing baseline e2e failures (`inspector-tabs.spec.ts:24`, `window-presets.spec.ts:119`, `window-presets.spec.ts:159`) that reproduce on `git stash` without Plan 90-02 changes — out of scope per CLAUDE.md SCOPE BOUNDARY.

## Decisions Made

- **D-05 mechanism executed as planned.** Pan-start lives in `selectTool.ts` no-hit branch (L1013+), NOT in FabricCanvas. FabricCanvas's pan handler is unchanged.
- **D-06 verification path: no code change.** Both `uiStore.resetView` (L360) and `FloatingToolbar.tsx` Fit button (L538-539) wiring confirmed correct by Spec 5 on first GREEN run. No fix needed.
- **Test bridge: reuse window.__uiStore.** Plan suggested adding `__driveGetPanOffset`. Decided against — `window.__uiStore.getState().panOffset` is just as readable and avoids new bridge surface area. Same for `setTool` (the actual setter name; the plan suggested `setActiveTool` which doesn't exist).
- **Hit-clash guard padding correction.** RED spec used padding=40 in its viewport→feet conversion; FabricCanvas actually uses padding=50 (per side). Corrected during GREEN — the spec now mirrors `getBaseFitScale` exactly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tool re-activation discards panStart on first pan-move**
- **Found during:** Task 1 GREEN (debugging cursor not setting to 'grabbing')
- **Issue:** The plan's design called for closure-scoped panStart + window listeners. But `useUIStore.setPanOffset` triggers a store subscription → `FabricCanvas.redraw()` → `toolCleanupRef.current?.()` → `activateCurrentTool()`. The cleanup runs DURING the first pan-move setPanOffset, blowing away the closure's panStart AND removing the window listeners.
- **Fix:** Added `_panActive` module-level flag mirroring `_dragActive` (Phase 25 pattern). Wired into `shouldSkipRedrawDuringDrag` so non-tool redraws short-circuit while pan is live. The redraw still fires when the pan ends (mouseup clears `_panActive` first).
- **Files modified:** `src/canvas/tools/selectTool.ts`
- **Verification:** Spec 3 passes — `panOffset` shifts by exactly the cursor delta, cursor stays `grabbing` for the entire drag.
- **Committed in:** `c1285a6`

**2. [Rule 1 - Bug] Plan said setActiveTool, store API is setTool**
- **Found during:** Task 1 RED (initial spec run threw `setActiveTool is not a function`).
- **Issue:** The plan's `<interfaces>` block and Task 1 sub-step A referenced `setActiveTool`. The actual uiStore action is `setTool` (L296).
- **Fix:** Updated spec helper to call `setTool`.
- **Files modified:** `tests/e2e/specs/90-canvas-polish.spec.ts`
- **Verification:** Spec helper runs without throwing.
- **Committed in:** `84a2f9d` (RED) — corrected before GREEN was tested.

**3. [Rule 1 - Bug] Hit-clash spec used wrong padding constant**
- **Found during:** Task 1 GREEN regression sweep (Spec 4 failed with panOffset=30 expected 0).
- **Issue:** Spec 4 computes wall midpoint pixel coordinates from room dims + scale + origin. RED spec used `padding=40`; FabricCanvas's `getBaseFitScale` actually uses `pad=50` on each side.
- **Fix:** Updated spec to use `pad=50` matching `getBaseFitScale`.
- **Files modified:** `tests/e2e/specs/90-canvas-polish.spec.ts`
- **Verification:** Spec 4 passes — click lands on wall, panOffset unchanged.
- **Committed in:** `c1285a6` (rolled into GREEN commit; spec-only correction).

---

**Total deviations:** 3 auto-fixed (all Rule 1 — root cause was the toolCleanupRef re-activation cycle, not a plan-design flaw; plus 2 small spec-correctness fixes).

## Issues Encountered

- **MutationObserver microtask masking.** While debugging the cursor issue, the MutationObserver fired with only the LAST cursor value per microtask. So the sequence `hover→grab → mousedown→grabbing → cleanup→""` showed only the final two values, hiding the intermediate `grabbing`. Resolved by adding an inline `Promise.resolve().then(() => console.log(cursor))` to read the cursor inside the same microtask the mousedown ran in.
- **3 pre-existing e2e baseline failures.** Logged to `deferred-items.md`. All reproduce on `git stash` (no Plan 90-02 changes) and are unrelated to pan logic. Out of scope per SCOPE BOUNDARY.

## Verification

- ✅ 7/7 specs in `tests/e2e/specs/90-canvas-polish.spec.ts` pass on chromium-dev (4 from Plan 90-01 + 3 from Plan 90-02)
- ✅ 1120/1120 vitest unit tests pass — same baseline as Plan 90-01, no regressions
- ✅ TypeScript clean (only pre-existing tsconfig 'baseUrl' deprecation warning)
- ✅ e2e regression sweep `--grep "select|pan|zoom|fit"`: 25 passed, 3 baseline-failures unrelated to pan
- ✅ Middle-mouse pan + Space+left pan paths verified untouched (FabricCanvas.tsx:528-531 early-returns for plain left-click — no double-trigger possible)

## Test Bridge Changes

None — reused existing `window.__uiStore` (Phase 62 MEASURE-01) for panOffset reads and setTool calls.

## Stub Tracking

No stubs introduced — `_panActive` is a real flag, all listeners are real handlers, all cursor writes are real DOM mutations.

## Next Phase Readiness

- **Phase 90 is COMPLETE.** PR body must include `Closes #201` (Plan 90-01), `Closes #202` (Plan 90-01), `Closes #203` (Plan 90-02).
- Three deferred items logged for future phases — none block Phase 90.
- v1.20+ canvas-polish backlog (3D split-view pan, touch gestures, pan inertia) per 90-CONTEXT.md scope boundaries remains deferred.

## Self-Check: PASSED

- `src/canvas/tools/selectTool.ts` contains `_panActive` flag (L213) and pan-start logic in no-hit branch — VERIFIED via Read.
- `src/canvas/tools/selectTool.ts` `shouldSkipRedrawDuringDrag` ORs `_dragActive || _panActive` — VERIFIED via Read.
- `tests/e2e/specs/90-canvas-polish.spec.ts` contains 3 new specs (#203 pan, #203 hit-clash, #203/D-06 fit-resets) — VERIFIED via Read.
- Task commits `84a2f9d` (RED) and `c1285a6` (GREEN) exist in `git log` — VERIFIED.
- All 7 Phase 90 specs pass on chromium-dev — VERIFIED in this session.
- 1120/1120 vitest unit tests pass — VERIFIED.

---
*Phase: 90-canvas-polish*
*Completed: 2026-05-15*
