# Phase 90 — Canvas Polish

**Captured:** 2026-05-15
**Branch:** `gsd/phase-90-canvas-polish`
**Closes:** #201, #202, #203

## Summary

Three Phase 89 UAT bugs against the 2D canvas. Each is a small, well-scoped patch on top of existing infrastructure (Phase 88 theme bridge, Phase 83 floating toolbar, Phase 6 NAV-01/02 pan handler).

## Locked Decisions

### D-01 — Standalone polish phase (no v1.xx milestone)

Phase 90 mirrors Phases 87 / 88 / 89: a polish phase listed under "Polish Phases" in `ROADMAP.md`, not tied to a versioned milestone. Ships as soon as verification passes.

### D-02 — Closes 3 GitHub issues

- **#201** — Theme backdrop doesn't flip on Light/Dark toggle (Phase 89 UAT carry-over).
- **#202** — Floating toolbar overlaps the 2D plan at common viewport sizes.
- **#203** — Left-click drag on empty canvas with the Select tool should pan.

PR body must include `Closes #201`, `Closes #202`, `Closes #203` (global GH-Issues rule).

### D-03 — Theme backdrop fix uses `requestAnimationFrame` deferral

Root cause (research §201): `getCanvasTheme()` reads CSS via the Phase 88 probe-div technique BEFORE `useTheme`'s `.dark` className write has flushed to the DOM. The redraw effect and the theme-class effect both run after commit; if the canvas redraw runs first, `getComputedStyle(probe).color` returns the stale theme's `--background`, Fabric paints the wrong color, and no further redraw fires.

**Fix:** add a dedicated `useEffect` keyed only on `resolved` (from `useTheme`). Inside it, schedule a `requestAnimationFrame(() => { fc.backgroundColor = getCanvasTheme().background; fc.renderAll(); })`. The rAF tick guarantees the `.dark` class is on `<html>` before the probe-div reads CSS tokens.

**Alternative if rAF proves flaky:** swap rAF for a `MutationObserver` on `<html>` that watches `class` attribute mutations and triggers the same backgroundColor write. The plan should call this out as a fallback, not a primary path.

**Constraint:** the fix must NOT trigger a full Fabric redraw (`redraw()`). It must mutate `fc.backgroundColor` and call `fc.renderAll()` directly. Otherwise selectTool drag transactions could be interrupted mid-drag.

### D-04 — Canvas wrapper gets `pb-28` (112px bottom padding)

Toolbar height analysis (research §202): FloatingToolbar at `bottom-6` (24px) with `p-2` (8px×2) + group label (~15px) + `h-11` button (44px) = ~80px tall, top edge sits ~104px above viewport bottom. `pb-28` (112px) gives ~8px breathing room.

**Where:** the FabricCanvas wrapper `<div ref={wrapperRef}>` at `src/canvas/FabricCanvas.tsx:805`. Replace `relative w-full h-full overflow-hidden` with `relative w-full h-full overflow-hidden pb-28` (or pull the padding to the parent flex container at `App.tsx:263` if 3D viewport also needs it — confirm during execution).

**Hardcoded value justification:** the toolbar height is stable post-Phase 83. Add a code comment on the line referencing `FloatingToolbar.tsx:161` so future toolbar redesigns trigger the visual review.

**Mechanism:** Fabric's existing ResizeObserver + `wrapper.getBoundingClientRect()` read in `redraw()` (`FabricCanvas.tsx:184-189`) consume the reduced height naturally. No additional plumbing needed.

### D-05 — Left-click pan on empty canvas + Select tool, with hover cursor

**Trigger location:** `src/canvas/tools/selectTool.ts` no-hit branch at lines 1013-1017 (inside `onMouseDown`, after `hitTestStore` returns no entity). Adding pan logic here keeps it co-located with Select tool behavior and avoids racing the FabricCanvas-level pan handler.

**Behavior:**
- On `mousedown` over empty canvas (no entity hit) with Select tool active → start a pan-drag that mirrors the existing pan handler (`FabricCanvas.tsx:480-548`): track start coords + origin pan offset, install window-level `mousemove`/`mouseup` listeners, on move call `useUIStore.getState().setPanOffset({ x: originX + dx, y: originY + dy })`, on up remove listeners.
- On hover over empty canvas (Select tool active, no entity under pointer) → `wrapper.style.cursor = "grab"`.
- During pan drag → `wrapper.style.cursor = "grabbing"`.
- On drag end or tool deactivation → restore cursor.

**Preserve existing triggers:** middle-mouse-drag pan and Space+left-drag pan in `FabricCanvas.tsx:484-487` are untouched. Power users keep their workflows.

**StrictMode cleanup (CLAUDE.md §7):** any module-level state added (e.g., a `_panActive` flag mirroring `_dragActive` at `selectTool.ts:907`) must be cleared in the activate() cleanup returned by `activateSelectTool`. Window-level mousemove/mouseup listeners installed during pan-drag must be removed in the activate() cleanup AND on mouseup.

### D-06 — Fit-to-screen resets `panOffset` to {0,0}

Already implemented at `src/stores/uiStore.ts:360`: `resetView: () => set({ userZoom: 1, panOffset: { x: 0, y: 0 } })`. The toolbar Fit button at `FloatingToolbar.tsx:538-539` calls `resetView()`. **No code change required** — Plan 90-02 Task 2 verifies the existing wiring works after pan is added and adds an e2e assertion.

## Scope Boundaries

**In scope:**
- 2D canvas backdrop flip on theme change (#201)
- 2D canvas viewport reserves space for toolbar (#202)
- Left-click pan on empty 2D canvas with Select tool (#203)
- Fit-to-screen resets pan (verification only — already implemented)

**Out of scope (deferred):**
- 3D viewport (ThreeViewport) toolbar overlap — not flagged in Phase 89 UAT. If observed during execution, file as separate issue.
- Cursor flicker tuning beyond grab/grabbing — accept the simple "hover = grab, drag = grabbing" UX.
- Pan inertia / momentum scrolling — out of scope.
- Touchscreen pan (single-finger drag) — out of scope.

## Files Touched

| File | Purpose | Plan |
|------|---------|------|
| `src/canvas/FabricCanvas.tsx` | Theme rAF effect; wrapper `pb-28` | 90-01 |
| `src/canvas/tools/selectTool.ts` | Pan-start in no-hit branch; cursor wiring | 90-02 |
| `tests/e2e/specs/...` | RED + GREEN e2e specs | 90-01, 90-02 |
| `tests/unit/...` (if any) | Targeted unit if rAF logic warrants | 90-01 |

## Test Bridges

Existing bridges to leverage:
- `window.__driveTheme(theme)` — flip theme programmatically (Phase 71).
- `window.__driveGetCanvasBg()` — read Fabric `backgroundColor` (Phase 88, installed at `FabricCanvas.tsx:200-201`).
- `useUIStore.getState().panOffset` — read pan state from e2e.
- `useUIStore.getState().setActiveTool("select")` — activate Select tool.

May need to add:
- `window.__driveCanvasMouse({ type, clientX, clientY, button })` if existing test helpers don't cover synthetic mousedown/move/up on the wrapper (research the playwright-helpers dir during execution).

## Risks

- **rAF timing on slow CI runners:** if a single rAF tick isn't enough for the class flush, the test will flake. Mitigation: research notes the MutationObserver fallback. Plan should keep the rAF path but design the test to retry once on failure or use `expect.poll` for the canvas-bg assertion.
- **Pan double-trigger:** if both FabricCanvas's mousedown and selectTool's mouse:down try to start a pan, the user gets a doubled offset. Mitigation: research recommends pan-on-empty lives in selectTool ONLY; FabricCanvas's pan handler keeps middle-mouse + Space+left.
- **3D split-view overlap:** if `pb-28` only lands on FabricCanvas, the 3D side of split view still has overlap. Plan must check during execution and lift the padding to `App.tsx:263` parent if 3D is also affected.
