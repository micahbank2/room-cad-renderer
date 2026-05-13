---
phase: 81-left-panel-restructure-v1-21
plan: 02
subsystem: ui
tags: [react, zustand, fabric, tree, hover, ia-03, raf-coalesce, 2d-only]

requires:
  - phase: 81-left-panel-restructure-v1-21
    plan: 01
    provides: RoomsTreePanel.tsx wrapped under shared PanelSection; TreeRow.tsx receives hover-ready props pipe.
provides:
  - uiStore.hoveredEntityId + RAF-coalesced setHoveredEntityId (D-02 transient hover state)
  - TreeRow onMouseEnter/onMouseLeave wired leaf-only (walls, products, ceilings, custom-elements, stairs)
  - fabricSync renderers (walls/products/ceilings/customElements/stairs) accept new optional hoveredId param
  - FabricCanvas subscribes to hoveredEntityId; redraw dep array now includes it
  - window.__driveTreeHover (test-mode only) installed via StrictMode-safe useEffect
  - e2e/tree-hover.spec.ts — 2 tests covering IA-03 + negative (room / group header rows)
affects:
  - 81-03 (inline rename — shares TreeRow.tsx props surface)
  - 82-inspector-rebuild (3D hover wiring follows here, per D-02 deferral)

tech-stack:
  added: []
  patterns:
    - "RAF-coalesce for high-frequency UI store writes: latest value wins per animation frame; SSR/jsdom fallback degrades to synchronous write"
    - "Hover outline = same accent-purple stroke as selection but XOR-style (selection wins when both apply); avoids double-stroke at the matched entity"
    - "Optional appended parameter pattern: hoveredId added at the END of each fabricSync renderer signature with a null default — legacy callers + tests untouched"
    - "Stairs use a separate accent outline overlay rect (children already baked into Group); other entities thread hover into their existing stroke field"

key-files:
  created:
    - e2e/tree-hover.spec.ts
  modified:
    - src/stores/uiStore.ts
    - src/components/RoomsTreePanel/RoomsTreePanel.tsx
    - src/components/RoomsTreePanel/TreeRow.tsx
    - src/canvas/fabricSync.ts
    - src/canvas/FabricCanvas.tsx

key-decisions:
  - "Hover state lives in uiStore (not cadStore) — view-only, never serialized, never undoable"
  - "Setter is RAF-coalesced via module-level _hoverRafPending slot — at most one set() per animation frame regardless of mouseenter rate (research §Pitfall 3)"
  - "Leaf-only hover trigger — room rows and group header rows are skipped in TreeRow onMouseEnter (rooms have no single canvas counterpart; group headers are tree chrome)"
  - "Selection precedence: when an entity is both selected and hovered, the selection outline wins; hover paints the same accent but does NOT layer over selection"
  - "Stair hover painted via a bbox-overlay rect since buildStairSymbolShapes already bakes selection styling into Group children"
  - "Test driver uses StrictMode-safe identity-check cleanup per CLAUDE.md §7 (Phase 58 + 64 documented trap)"
  - "e2e spec asserts via window.__driveTreeHover.getHoveredId() state — no toHaveScreenshot goldens per memory note `feedback_playwright_goldens_ci` (platform coupling causes flakes)"

patterns-established:
  - "uiStore setter for high-frequency UI events should RAF-coalesce when triggered by mouse-move-class events; reuse the _hoverRafPending pattern (module-level slot, latest-wins, requestAnimationFrame flush)"
  - "When adding a new optional render param to fabricSync renderers, append at the END with a sensible default — preserves legacy unit-test calls that pass partial argument lists"

requirements-completed: [IA-03 hover]

metrics:
  duration: 35min
  tasks-completed: 3
  files-modified: 5
  files-created: 1
  commits: 3
  completed: 2026-05-13

deferred-issues: []

deviations:
  - "None - plan executed exactly as written."

auth-gates: []
---

# Phase 81 Plan 02: Tree-to-canvas hover highlight Summary

Add Figma-style hover-to-highlight wiring between the Rooms tree and the 2D Fabric canvas: hovering any leaf row paints the matching wall / product / ceiling / custom-element / stair with an accent-purple outline, RAF-coalesced and selection-aware. Closes the hover half of GH #172 (IA-03).

## What Was Built

### Task 1 — `uiStore.hoveredEntityId` + RAF-coalesced setter
- New `uiStore` field: `hoveredEntityId: string | null` (initial `null`, transient, no persistence, no undo)
- New action: `setHoveredEntityId(id | null)` — coalesces 60+ calls/sec into a single store write per animation frame
- Module-level `_hoverRafPending` slot: latest value wins on flush; SSR/jsdom fallback when `requestAnimationFrame` is undefined
- Commit: `d2bebc9`

### Task 2 — End-to-end wiring (Tree → Store → Canvas)
- **TreeRow.tsx:** Added optional `onHoverEnter?` / `onHoverLeave?` props. Row container `onMouseEnter` / `onMouseLeave` handlers dispatch leaf-only (skips `isRoom` + `isGroup`). Props piped to recursive child rows.
- **RoomsTreePanel.tsx:** Added `onHoverEnter` / `onHoverLeave` callbacks that call `useUIStore.getState().setHoveredEntityId(...)`. Passed through to the top-level `<TreeRow>`.
- **fabricSync.ts:** Five renderers (`renderWalls`, `renderProducts`, `renderCeilings`, `renderCustomElements`, `renderStairs`) gained an optional `hoveredId: string | null = null` parameter at the END of their signatures. Each computes `isHovered = !isSelected && hoveredId === entity.id` and paints a 2px `#7c5bf0` stroke. Selection takes precedence (no double-stroke). Stairs use a separate accent overlay `fabric.Rect` since `buildStairSymbolShapes` already bakes selection styling into the Group.
- **FabricCanvas.tsx:** Subscribes to `hoveredEntityId` via `useUIStore` selector; threads it through all five render calls and adds it to the `redraw` `useCallback` dep array.
- Commit: `c8fca7a`

### Task 3 — Test driver + e2e spec
- **`__driveTreeHover` driver:** Installed in `RoomsTreePanel` via a `useEffect` gated on `import.meta.env.MODE === "test"`. StrictMode-safe identity-check cleanup pattern per CLAUDE.md §7. Exposes `enter(id)`, `leave()`, `getHoveredId()`.
- **`e2e/tree-hover.spec.ts`:** Two tests on `chromium-dev`:
  1. Hovering a wall row writes `hoveredEntityId`; moving cursor off clears to `null`.
  2. Hovering a room or group header row does NOT set hover state (negative test).
- Both pass; no `toHaveScreenshot` goldens (state-based assertions only).
- Commit: `ce4e132`

## How It Works

1. User moves cursor onto a leaf tree row in the sidebar
2. `TreeRow` `onMouseEnter` fires → `RoomsTreePanel`'s `onHoverEnter` callback → `useUIStore.getState().setHoveredEntityId(node.id)`
3. RAF-coalesce slot captures the id; multiple rapid events overwrite the same slot
4. On the next animation frame, the slot flushes — Zustand `set()` writes `hoveredEntityId`
5. `FabricCanvas`'s `useUIStore((s) => s.hoveredEntityId)` subscription fires → `redraw` `useCallback` recomputes → `useEffect([redraw])` invokes redraw
6. `fc.clear()` + `renderWalls/Products/.../Stairs(..., hoveredEntityId)` runs → each renderer checks `isHovered`, paints accent stroke on the matched entity
7. User moves cursor off the row → `setHoveredEntityId(null)` → next frame clears the outline

Total path from mouseenter to painted outline: 1 animation frame (~16ms).

## Decisions Made

See frontmatter `key-decisions`. Headlines:
- **Hover lives in uiStore, not cadStore.** View-only state, never persisted, never undoable.
- **RAF-coalesce is mandatory.** Pitfall 3 (research §4) — a long tree + fast cursor scan would otherwise blast 60+ store writes per frame.
- **Selection wins.** When an entity is both selected and hovered, only the selection outline paints. No layered double-stroke artifact.
- **Leaf-only.** Room rows have no single canvas counterpart. Group header rows are pure tree chrome. Both skip hover dispatch in `TreeRow`.
- **State-based e2e assertions.** No screenshot goldens per the project memory note on platform-coupled pixel flakes.

## Files Changed

### Created
- `e2e/tree-hover.spec.ts` (180 lines) — 2 Playwright tests covering IA-03 hover criterion + negative case

### Modified
- `src/stores/uiStore.ts` (+48 lines) — field, setter, RAF slot, comment block
- `src/components/RoomsTreePanel/TreeRow.tsx` (+19 lines) — 2 new optional props, mouseenter/leave handlers, recursive prop passthrough
- `src/components/RoomsTreePanel/RoomsTreePanel.tsx` (+27 lines) — 2 callbacks, top-level wiring, test driver useEffect
- `src/canvas/fabricSync.ts` (+44 / -11 lines) — `hoveredId` param + `isHovered` checks across 5 renderers; stair overlay rect
- `src/canvas/FabricCanvas.tsx` (+8 / -3 lines) — store selector, 5 render call args, dep array

## Verification

### Automated
- `npx tsc --noEmit` — passes (no new TS errors; only pre-existing `TS5101` deprecation warning for `baseUrl` in tsconfig)
- `npm run build` — passes (472ms, no warnings related to changed files)
- `npx playwright test e2e/tree-hover.spec.ts --project=chromium-dev` — 2 passed (5.6s)
- `npm run test:quick` — 996 passed, 11 todo, 2 pre-existing failures (`tests/SaveIndicator.test.tsx`, `tests/SidebarProductPicker.test.tsx`); verified pre-existing by stashing changes and re-running. 0 regressions introduced by this plan.
- `git diff --name-only HEAD~3 -- src/three/` returns empty (D-02 boundary held)

### Manual smoke (post-execute)
- `npm run dev` → seed a wall → hover the wall row in the Rooms tree → the wall outline turns accent-purple within one frame → move cursor off → outline reverts. Confirmed in browser.
- Hovering a product row outlines the product Group's border rect with accent-purple. Confirmed.
- Hovering a room row does nothing on the canvas. Confirmed.

### Boundaries held
- `src/three/**` — zero diff (no 3D hover wiring; deferred to Phase 82 per D-02)
- `cadStore` — zero diff (hover is uiStore-only)
- `dimensions.ts` — zero diff (D-04 dimension labels untouched)
- No new test-mode globals outside the plan's allowance (`__driveTreeHover`)
- No undo history pollution (`setHoveredEntityId` does not push snapshots)

## Self-Check: PASSED

- `src/stores/uiStore.ts` FOUND with `hoveredEntityId` and `setHoveredEntityId`
- `src/components/RoomsTreePanel/TreeRow.tsx` FOUND with `onMouseEnter` / `onMouseLeave` / `onHoverEnter` / `onHoverLeave`
- `src/components/RoomsTreePanel/RoomsTreePanel.tsx` FOUND with `setHoveredEntityId` dispatch + `__driveTreeHover` driver
- `src/canvas/fabricSync.ts` FOUND with `hoveredId` parameter in 5 renderers + `isHovered` checks
- `src/canvas/FabricCanvas.tsx` FOUND with `hoveredEntityId` selector + dep array entry
- `e2e/tree-hover.spec.ts` FOUND (new file, 180 lines)
- Commit `d2bebc9` FOUND (Task 1)
- Commit `c8fca7a` FOUND (Task 2)
- Commit `ce4e132` FOUND (Task 3)
