# Phase 90: Canvas Polish — Research

**Researched:** 2026-05-15
**Domain:** Fabric.js canvas redraw + viewport sizing + pan-input handling
**Confidence:** HIGH

## Summary

Phase 90 closes three Phase 89 UAT bugs: theme backdrop doesn't flip on toggle (#201), floating toolbar overlaps the 2D plan (#202), and left-click-drag on empty canvas should pan (#203). All three are tightly scoped, low-risk extensions of existing Phase 88 (theme bridge), Phase 83 (floating toolbar), and Phase 6 (NAV-01/02 pan handler) code.

**Surprise finding for #201:** `fc.backgroundColor` IS already set inside `redraw()` at `FabricCanvas.tsx:196` and `resolved` IS in the redraw `useCallback` deps array at line 295. So the *write* fires. The bug must be one of: (a) Fabric needs `fc.renderAll()` after a `backgroundColor` mutation that happens with no other change (theme toggle alone doesn't dirty any geometry); (b) the redraw is being short-circuited by the drag-active hotfix or by `cW===0` race on first paint after a class flip; or (c) `getCanvasTheme()` is reading CSS tokens before the `.dark` class change has flushed to the DOM. Plan 90-01 must verify which by instrumenting and reproducing, then patch — likely (c), requiring a `requestAnimationFrame` deferral or a direct `fc.set('backgroundColor', …); fc.renderAll()` in a dedicated `[resolved]` effect.

**Primary recommendation:** Plan 90-01 (theme + toolbar viewport reservation) before Plan 90-02 (left-click pan). Both plans are independent and could merge in either order, but #201 + #202 are user-visible bugs from Phase 89 ship and should land first.

## Current State

### Theme backdrop (issue #201)

Files: `src/canvas/FabricCanvas.tsx`, `src/canvas/canvasTheme.ts`, `src/hooks/useTheme.ts`

- `FabricCanvas.tsx:143` — `const { resolved } = useTheme();` subscription is wired.
- `FabricCanvas.tsx:196` — `fc.backgroundColor = canvasTheme.background;` is set inside redraw.
- `FabricCanvas.tsx:287` — `fc.renderAll();` fires at end of redraw.
- `FabricCanvas.tsx:295` — `resolved` is the final dep in the redraw `useCallback` deps array.
- `canvasTheme.ts:73-107` — `getCanvasTheme()` resolves `var(--background)` via the probe-div technique (creates a hidden `<div>`, reads `getComputedStyle(probe).color`, removes it).

The subscription, the dep, the write, and the renderAll are all present. Why does the bug repro? Two suspects:

1. **DOM flush timing.** `useTheme` writes `<html class="dark">` from a `useEffect` (`useTheme.ts:43-47`). React's effect runs after commit, but `getCanvasTheme()` runs synchronously inside the FabricCanvas redraw `useCallback`. If both effects flush in the same microtask batch, the redraw effect may read CSS tokens *before* the `.dark` class is on `<html>` — `getComputedStyle()` returns the stale theme's `--background`. The redraw paints the OLD theme's background. No subsequent redraw fires until the next mutation, so the canvas stays stale until the user draws or pans.
2. **Drag-active short-circuit.** `FabricCanvas.tsx:179` skips redraw if `shouldSkipRedrawDuringDrag` returns true. Theme flip during a drag would be skipped — but a click on the Settings popover ends any drag, so this is unlikely.

Suspect (1) is the dominant cause. Fix: add a dedicated `useEffect` that depends only on `resolved` and uses `requestAnimationFrame` (or a microtask + `getComputedStyle` re-probe) to mutate `fc.backgroundColor` after the DOM class has flushed, then `fc.renderAll()`. Or simpler: trigger a *second* redraw on the next animation frame after `resolved` changes.

### Toolbar overlap (issue #202)

Files: `src/components/FloatingToolbar.tsx`, `src/App.tsx`, `src/canvas/FabricCanvas.tsx`

- `FloatingToolbar.tsx:161` — `className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-start justify-center gap-3 rounded-2xl border border-border bg-background/90 shadow-2xl backdrop-blur-md p-2 max-w-[min(calc(100vw-24px),1240px)]"`. Tool buttons use `size="icon-touch"` (44px tall, `h-11 w-11`). With `p-2` (8px) padding × 2 + group label (`text-[11px]` ≈ 11px line + `gap-1` 4px) + button (44px) = roughly **75-85px tall**. With `bottom-6` (24px) margin from viewport bottom, the toolbar's top edge sits ≈ **24 + 80 = ~104px above viewport bottom**.
- `App.tsx:266-267` — FabricCanvas mounts inside `<div className="flex-1 h-full relative">` which fills the available area. No bottom padding.
- `App.tsx:321` — `<FloatingToolbar … />` is a sibling of the canvas wrapper (inside the same `.flex.flex-1.overflow-hidden` ancestor) but uses `position: fixed`, so it's pulled out of flow and floats above the canvas.
- `FabricCanvas.tsx:184-189` — `redraw()` reads `wrapper.getBoundingClientRect()` and uses `cW`/`cH` for `fc.setDimensions` and as the input to `getViewTransform(roomW, roomL, cW, cH, …)`. The fit-to-screen `baseScale` formula in `getViewTransform` (called via the import at line 1; computed as `min((W - padding) / roomW, (H - padding) / roomH)` per CLAUDE.md description) treats the FULL wrapper height as available, including the strip the toolbar occupies.
- `FabricCanvas.tsx:805` — root element: `<div ref={wrapperRef} className={\`relative w-full h-full overflow-hidden ${cursorClass}\`}>` — this is the box that needs a `pb-` reservation.
- ResizeObserver wiring exists (referenced at `FabricCanvas.tsx:295` deps + the redraw uses fresh `getBoundingClientRect()` per call). Changing `padding-bottom` on the wrapper shrinks its `getBoundingClientRect().height`, which `redraw()` reads naturally — no extra plumbing needed.

**Reserved height calculation:** toolbar visual height ~80px + `bottom-6` margin 24px + small breathing gap 8px ≈ **112px**. Recommend `pb-28` (112px) on the FabricCanvas wrapper. If that feels too tight visually, bump to `pb-32` (128px). Decision deferred to Plan phase.

### Left-click pan (issue #203)

Files: `src/canvas/FabricCanvas.tsx:462-548`, `src/canvas/tools/selectTool.ts:1013-1024`

- `FabricCanvas.tsx:480-548` — pan handler. Tracks `panState` (start coords + origin pan offset) and `spaceDown` flag. Triggers ONLY on `isMiddle = e.button === 1` or `isSpacePan = spaceDown && e.button === 0` (lines 485-487). On `mousedown` it grabs `panOffset` from `useUIStore.getState()`, on `mousemove` it computes delta and calls `setPanOffset()`, on `mouseup` it resets `panState` and `wrapper.style.cursor`.
- `FabricCanvas.tsx:496/512/519/525` — cursor states: `"grabbing"` during pan-drag, `"grab"` when Space is held, `""` (cleared) otherwise.
- `selectTool.ts:884` — `const hit = hitTestStore(feet, _productLibrary);` is the canonical empty-canvas check. Lines 1013-1017 are the no-hit branch:
  ```ts
  } else {
    useUIStore.getState().clearSelection();
    dragging = false;
    dragId = null;
  }
  ```
- `selectTool.ts:1568` — handler is registered as `fc.on("mouse:down", onMouseDown)`. Fabric's `mouse:down` event fires AFTER the DOM `mousedown` that the FabricCanvas-level handler listens to. Both fire on the same click. This matters: the pan handler must decide BEFORE selectTool whether the click is on empty canvas, OR the pan logic must move into selectTool's no-hit branch.

**Recommended approach:** Move the new pan-on-empty-canvas trigger INTO `selectTool.ts`'s no-hit branch (line 1013-1017). It already has the hit-test result and the activeTool implicit context. Reasons:
- Co-locates "Select tool grab-pan" with the rest of Select tool behavior.
- Avoids running `hitTestStore` twice (once in FabricCanvas's pan handler, once in selectTool's mousedown).
- Avoids race conditions between two separate `mousedown` listeners on the same element.

Implementation sketch: on no-hit, start a pan state tracker scoped to selectTool's closure. Mirror the FabricCanvas pan-handler pattern (track start coords + origin pan, install window-level `mousemove`/`mouseup` for the duration of the drag, restore cursor on cleanup). The existing FabricCanvas-level pan handler stays intact for middle-mouse and space+left.

**Cursor wiring:** the wrapper's CSS class is computed at `FabricCanvas.tsx:672` (`cursorClass` constant). Currently `cursor-crosshair` when a drawing tool is active. For Select tool, default cursor is whatever Fabric paints (likely `default`). Plan should add: when Select tool active AND hover is over empty canvas → `cursor-grab`. During drag → `cursor-grabbing`. Hover detection requires a `mousemove` listener that runs `hitTestStore` on every move, which is cheap (already happens in selectTool's `onMouseMove` for drag, but not for hover). Could be `throttled` or done via a per-frame check.

**Cursor flicker concern:** the user-facing question is whether `cursor: grab` appearing every time you wiggle the mouse over empty canvas (without intent to pan) feels twitchy. Open question for plan phase.

## Implementation Plan

### Plan 90-01 — Theme backdrop + toolbar viewport reservation (#201 + #202)

**Wave 0 (RED tests, ~2 tasks):**
- Add an e2e spec asserting that after `window.__driveTheme('dark')` then `__driveTheme('light')`, the Fabric canvas `backgroundColor` rgb value matches the light theme's `--background` token. (Build on the existing `__driveGetCanvasBg` test bridge at `FabricCanvas.tsx:200-201`.)
- Add an e2e spec asserting that with toolbar visible, the room's `0,0` corner and its dimension labels are above the toolbar's `getBoundingClientRect().top` at multiple viewport heights (e.g., 800px, 1200px, 1600px). Failing without padding, passing with `pb-28`.

**Wave 1 (GREEN, ~2 tasks):**
- Task 1 (#201): add a dedicated `useEffect` keyed on `resolved` that, on the next animation frame, sets `fc.backgroundColor = getCanvasTheme().background; fc.renderAll();`. Alternatively, set the redraw deps to use a "theme-tick" counter incremented in a `useEffect` after the `<html>` class flush is observed via `MutationObserver`. (Plan phase picks one based on simplicity vs. robustness.)
- Task 2 (#202): add `pb-28` (or whichever final value the plan picks) to the FabricCanvas wrapper at `FabricCanvas.tsx:805`. Verify `redraw()` naturally consumes the smaller height. Update any e2e specs that assert canvas dimensions match wrapper dimensions.

### Plan 90-02 — Left-click pan with Select tool (#203)

**Wave 0 (RED tests, ~1 task):**
- Add an e2e spec: with Select tool active, mousedown on empty canvas at `(100, 100)`, mousemove to `(200, 150)`, mouseup. Assert `useUIStore.getState().panOffset` shifted by exactly `{ x: 100, y: 50 }`. Assert cursor was `"grabbing"` during drag and clears after release.
- Add a hit-clash spec: with a wall present, mousedown ON the wall, drag. Assert wall moves (existing selectTool drag), panOffset DID NOT change.

**Wave 1 (GREEN, ~2 tasks):**
- Task 1: in `selectTool.ts:1013-1017` (no-hit branch), add a pan-start tracker. Install temporary window-level `mousemove`/`mouseup` listeners; on move, call `useUIStore.getState().setPanOffset(...)` with delta; on up, remove listeners and restore cursor. Wire `wrapper.style.cursor = "grabbing"` at start, clear at end.
- Task 2: cursor-on-hover feedback. Either (a) add a `mousemove` handler on the Fabric canvas wrapper that runs `hitTestStore` and sets `cursor-grab` when no hit + Select tool, OR (b) accept the simpler "no hover cursor, only grabbing during drag" UX. Plan picks based on Open Question #2.

## Pitfalls

- **#201 — DOM flush ordering:** `useEffect` order is not deterministic across components. The theme effect (`useTheme.ts:43-47`) and the redraw effect (`FabricCanvas.tsx`) both run after render. If FabricCanvas's effect runs FIRST in a given commit, the redraw reads stale CSS tokens. Solution must defer the canvas redraw to after the class flush — `requestAnimationFrame`, microtask, or `MutationObserver` on `<html class>`.
- **#202 — fit-to-screen pan reset:** if the user has panned away from origin, then resizes the viewport (which shrinks via the new `pb-28`), the room may shift further off-screen. Confirm fit-to-screen logic uses `getBaseFitOrigin(r.width, r.length, baseScale, rect.width, rect.height)` already (`FabricCanvas.tsx:474`), which recenters. Decide whether reducing wrapper height should *also* clear `panOffset` to `{0,0}` — open Q #3.
- **#202 — toolbar in 3D split:** the new wrapper padding lives on FabricCanvas's wrapper, not on ThreeViewport's wrapper. Toolbar overlaps 3D view too — but Phase 89 UAT only reported 2D. Confirm with screenshot; if 3D viewport ALSO needs `pb-28`, the plan should handle both, or hoist the padding to the parent flex container at `App.tsx:263`.
- **#203 — hit-test correctness:** `hitTestStore` (`selectTool.ts:884`) must run BEFORE pan-start. The pan must NEVER fire when a click hit a wall/product/opening/handle. The no-hit branch at line 1013 is exactly that guard — keep the pan inside that branch.
- **#203 — Fabric `mouse:down` vs DOM `mousedown`:** if pan logic is added to selectTool, it uses Fabric's event (`opt.e` is the underlying MouseEvent). Make sure window-level `mousemove`/`mouseup` listeners are removed on tool cleanup (the `() => void` cleanup pattern from CLAUDE.md §5).
- **#203 — StrictMode cleanup:** if pan tracking writes to any module-level state (e.g., a `_pendingPan` flag like `_dragActive` at `selectTool.ts:907`), the activate() cleanup must clear it. Follow the identity-check pattern from CLAUDE.md §7 (Phase 64 lesson).

## Plan Decomposition

**2 plans, 4-5 tasks total:**

- **Plan 90-01** (theme backdrop + toolbar viewport): 2 GREEN tasks, 2 RED tasks. Closes #201 + #202.
- **Plan 90-02** (left-click pan with Select tool): 2 GREEN tasks, 1-2 RED tasks. Closes #203.

Plans are independent — can ship in either order, but recommend 90-01 first since both #201 and #202 are visible-on-page bugs from the Phase 89 ship.

## Open Questions for Plan Phase

1. **Toolbar padding value.** Hardcode `pb-28` (112px) on the canvas wrapper, OR measure FloatingToolbar's actual height at mount and write a CSS variable (`--toolbar-height`) that the wrapper consumes? Hardcode is simpler and the toolbar height won't change unless we redesign the toolbar again. **Recommend:** hardcode `pb-28` with a comment pointing to FloatingToolbar's height.

2. **Cursor-on-hover for left-click pan.** Show `cursor-grab` whenever Select tool is active and the pointer is over empty canvas? Or only show `cursor-grabbing` once the drag has actually started? Option A (hover cursor) matches Figma; option B avoids cursor flicker on every pointer movement. **No strong recommendation** — Jessica may prefer the simpler "no hover cursor" since this is a personal tool, not a public collab app.

3. **Fit-to-screen behavior.** When the wrapper resizes (toolbar padding takes effect on mount, or user resizes the window), should we ALSO reset `panOffset` to `{0,0}`? Currently the existing `resetView()` at `uiStore.ts:360` does both. **Recommend:** do NOT auto-reset pan on resize — that would break the user's intentional view. But DO reset pan when explicitly fit-to-screen is invoked from the toolbar.

## Sources

### Primary (HIGH confidence)
- `src/canvas/FabricCanvas.tsx` (lines 143, 178-295, 462-548, 805) — redraw + pan handler + wrapper element
- `src/canvas/canvasTheme.ts` (full file) — Phase 88 theme bridge, probe-div technique
- `src/hooks/useTheme.ts` (full file) — theme subscription + DOM class write
- `src/canvas/tools/selectTool.ts` (lines 884, 1013-1024, 1568) — hit-test + no-hit branch + mouse:down registration
- `src/components/FloatingToolbar.tsx` (line 161) — toolbar positioning + size
- `src/App.tsx` (lines 263-321) — canvas wrapper structure + FloatingToolbar mount site
- `src/stores/uiStore.ts` (lines 42-43, 125, 273-274, 324, 360) — panOffset state + actions
- `CLAUDE.md` (§5 tool cleanup, §7 StrictMode-safe registries) — patterns Phase 90 must follow

### Confidence breakdown
- Current state diagnosis: HIGH — direct file reads
- Cause of #201: MEDIUM — DOM-flush-ordering hypothesis is the most likely culprit but needs runtime confirmation in Wave 0 RED tests
- Fix path for #202: HIGH — straightforward CSS padding
- Fix path for #203: HIGH — clean injection point at `selectTool.ts:1013-1017`

**Research date:** 2026-05-15
**Valid until:** 2026-06-15 (canvas + toolbar code is stable)
