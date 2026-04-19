# Phase 25: Canvas & Store Performance - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver PERF-01 and PERF-02 only:

- **PERF-01** — `FabricCanvas.tsx` + `fabricSync.ts`: dragging at 50 walls / 30 products sustains 60fps in Chrome DevTools Performance (no frame drops below 16.7ms/frame). Full clear-and-redraw gets replaced with a drag-only fast path; other mutations may keep the existing full-redraw model.
- **PERF-02** — `cadStore.ts snapshot()`: zero `JSON.parse(JSON.stringify(...))` calls in snapshot code; `structuredClone()` used everywhere a deep clone is needed. Dev-mode timing shows ≥2x improvement at 50 walls / 30 products.

Undo/redo continues to produce exactly one history entry per completed drag — no regression. All vitest tests pass (count to be refreshed from current baseline during research; roadmap's "115" is stale).

No new features, no object-pool refactor of the whole renderer, no backend/auth, no new canvas abstractions.

</domain>

<decisions>
## Implementation Decisions

### Incremental redraw strategy (PERF-01)
- **D-01:** Use a **drag-only fast path**, not a full object-pool refactor. Full clear-and-redraw stays as the default for non-drag mutations (add/remove wall, tool switch, room change, etc.). Only the hot drag path is specialized.
- **D-02:** Disable `canvas.renderOnAddRemove` at FabricCanvas construction. Every batch path (full redraw, drag tick, incremental update) ends with an explicit `fc.requestRenderAll()`. This eliminates the hidden per-object renders that currently fire during full rebuilds.
- **D-03:** Drag fast-path operations covered:
  1. Product drag (move)
  2. Wall drag (move whole wall)
  3. Wall endpoint drag (resize/reshape)
  4. Product rotation handle drag
- **D-04:** During an active drag, skip re-rendering all non-moving layers (grid, dimensions, other products/walls/ceilings/custom elements). Only the moving Fabric object is mutated in place (`left`, `top`, `angle`, or polygon points as applicable) and a single `fc.requestRenderAll()` paints the frame. Maximum frame budget.

### Drag history boundary (PERF-01 success criterion #4)
- **D-05:** Mirror the existing `updateWallNoHistory` precedent. During drag: mutate the Fabric object directly, do NOT write to the store. On drag-end: call the existing history-pushing store action (`moveProduct`, `updateWall`, `rotateProduct`, etc.) **exactly once** with the final values → produces the single history entry. No per-mousemove store writes.
- **D-06:** On drag interruption (Escape, tool switch, tab blur, cleanup-fn invocation): revert the Fabric object to its pre-drag position/angle/endpoints. No store write, no history entry. The fast path must cache the pre-drag values at drag-start and restore them on interruption.

### Snapshot strategy (PERF-02)
- **D-07:** Replace every `JSON.parse(JSON.stringify(...))` inside `snapshot()` in `src/stores/cadStore.ts` with `structuredClone(...)`. Specifically: `state.rooms`, `root.customElements`, `root.customPaints`. Non-deep slices (e.g., `recentPaints` spread) keep their existing handling. No other cloning paths are touched in this phase.
- **D-08:** Do NOT skip cloning entirely. Immer's frozen outputs would likely be safe, but tests, migrations, and future consumers assume snapshots are independent copies. The literal PERF-02 requirement is structuredClone — keep the shape, just change the mechanism.
- **D-09:** Measure via `console.time("snapshot")` / `console.timeEnd` inside `snapshot()` gated by `import.meta.env.DEV`. Also expose `window.__cadBench()` in dev builds: seeds the active room with 50 walls / 30 products, runs snapshot 100× warm, prints mean + p95 before/after. Ad-hoc, zero prod overhead, no brittle CI assertion.

### Verification evidence
- **D-10:** Evidence bundle for VERIFICATION.md:
  - PERF-01: Chrome DevTools Performance trace screenshot (50 walls / 30 products, dragging a product ~5 seconds). Annotate dropped-frame count; target is zero frames > 16.7ms in the dragging region.
  - PERF-02: Terminal/console output from `window.__cadBench()` showing before/after mean + p95 snapshot time, plus calculated ratio (must be ≥2.0).
- **D-11:** Canonical benchmark scene = exactly 50 walls + 30 products (matches roadmap success criteria). Seeded by a single `window.__cadSeed(wallCount, productCount)` dev helper so anyone can reproduce the measurement. No multi-size scaling curves in this phase.
- **D-12:** Match Phase 24's verification style — manual-evidence first, no brittle perf asserts in CI. fps is not measurable in jsdom; snapshot ratio is measurable but varies by CI hardware, so we keep it as a documented manual step.

### Claude's Discretion
- Exact structure of `window.__cadBench()` / `__cadSeed()` helper output format
- Where to install the drag-start position cache (selectTool closure vs FabricCanvas ref) — planner picks
- Whether to add a feature flag (e.g., `useUIStore.perfDragFastPath`) or ship straight
- Refactoring within fabricSync to factor out per-layer render helpers if that aids the drag fast path
- Whether to pre-refresh the stale "115 tests" number in ROADMAP success criterion #5 during this phase or leave for a later doc sweep

### Folded Todos
None — no pending todos matched Phase 25 scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` §"Phase 25: Canvas & Store Performance" — goal, PERF-01/PERF-02, 5 success criteria
- `.planning/REQUIREMENTS.md` §"Performance (PERF)" — PERF-01, PERF-02 with file targets and verifiable criteria

### Source GitHub issues (context only — requirements already distilled)
- https://github.com/micahbank2/room-cad-renderer/issues/51 — PERF-01 origin (canvas incremental updates)
- https://github.com/micahbank2/room-cad-renderer/issues/52 — PERF-02 origin (structuredClone)

### Prior phase context (patterns & precedents to follow)
- `.planning/phases/24-tool-architecture-refactor/24-CONTEXT.md` — closure-state pattern, cleanup-fn contract, manual smoke verification style (D-13)
- `.planning/phases/01-2d-canvas-polish/01-CONTEXT.md` — rotation-handle pattern (relevant to D-03 #4)
- `.planning/phases/05-multi-room/05-CONTEXT.md` — active-room selector pattern (walls/products/ceilings come from active RoomDoc; fast-path must read via `activeDoc(state)`, not legacy top-level fields)

### Files being modified
- `src/stores/cadStore.ts` — `snapshot()` function (~lines 38–50); dev-mode timing wrapper; new `window.__cadSeed()` / `window.__cadBench()` test hooks
- `src/canvas/FabricCanvas.tsx` — disable `renderOnAddRemove`; drag fast-path wiring (mousedown/mousemove/mouseup lifecycle); interruption/cleanup revert
- `src/canvas/fabricSync.ts` — may factor out per-layer render helpers if needed for the fast path; otherwise untouched for non-drag flows
- `src/canvas/tools/selectTool.ts` — primary tool exercising the drag fast path; caches pre-drag values

### Project conventions
- `CLAUDE.md` — Tool cleanup pattern, store-driven rendering, coordinate system (feet × scale → pixels)
- `.planning/codebase/ARCHITECTURE.md` — Store-driven rendering pattern, tool lifecycle, data flow
- `.planning/codebase/CONVENTIONS.md` — Obsidian CAD tokens, naming patterns
- `.planning/codebase/CONCERNS.md` — Existing known concerns around full-redraw perf (pre-dating this phase)

### Fabric.js API docs (for planner research)
- Canvas#renderOnAddRemove, Canvas#requestRenderAll — http://fabricjs.com/docs/fabric.Canvas.html

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`updateWallNoHistory` action** in `cadStore.ts` — exact precedent for "mutate without pushing history" during drags. D-05 extends this pattern's spirit to product/rotation drags (may not need a new `NoHistory` variant since drags skip store writes entirely during the drag).
- **Zustand + Immer idiom** — All store actions already wrap mutations in `produce()`. The snapshot change in D-07 is a 3-line diff inside `snapshot()`; no action-shape changes.
- **Phase 24 cleanup-fn pattern** — Every tool returns `() => void` cleanup that FabricCanvas stashes in `toolCleanupRef`. The drag interruption revert (D-06) hooks into the same cleanup lifecycle.
- **Active-room selectors** — Phase 5's `activeDoc(s)` / `useActiveWalls()` / `useActivePlacedProducts()` — fast path reads walls/products from the active RoomDoc, not legacy top-level fields.

### Established Patterns
- **Full redraw model** — `FabricCanvas.redraw()` clears and rebuilds everything on store change. Phase 25 preserves this as the default; fast path is an optimization layer, not a replacement.
- **Dev-only hooks on window** — Precedent for `window.__*` debug hooks is thin in this codebase; D-09 introduces the convention. Gate behind `import.meta.env.DEV`.
- **`fc.clear()` + ordered `drawX` / `renderX` calls** — fabricSync.ts renders in strict z-order (grid → dims → walls → products → ceilings → custom elements). Fast path must not disrupt this ordering for non-drag objects already on canvas.
- **Tool-lifecycle cleanup invoked from `FabricCanvas.tsx`** — activation returns cleanup; cleanup runs on tool switch/unmount. Drag-interruption revert (D-06) piggybacks on this.

### Integration Points
- **`cadStore.ts snapshot()`** — Single editing site for PERF-02. Three `JSON.parse(JSON.stringify(...))` calls → three `structuredClone(...)` calls.
- **`FabricCanvas.tsx` useEffect chain** — Where `renderOnAddRemove = false` is set once; where drag lifecycle hooks attach (via selectTool cleanup interaction).
- **`selectTool.ts` closure state** (from Phase 24) — Where pre-drag cached values live: `{ id, origLeft, origTop, origAngle, origStart, origEnd }`. Cleared on drag-end or interruption.
- **`cadStore.ts moveProduct` / `updateWall` / `rotateProduct`** — Existing history-pushing actions called once on drag-end per D-05.

### Risks
- **Cleanup ordering on tool switch during drag** — If user presses `W` mid-drag, Phase 24's tool-switch flow invokes selectTool's cleanup. The cleanup must revert the in-flight drag AND release listeners in the right order. Planner should write an explicit test for this edge case.
- **structuredClone and custom types** — `structuredClone` fails on functions, Symbols, or non-cloneable objects. `RoomDoc` / `WallSegment` / `PlacedProduct` are plain data today, but any future field holding e.g. a DOM node or function would break. Planner verifies current shapes are all cloneable before the swap.
- **Browser support** — `structuredClone` is baseline in all modern browsers (Safari 15.4+, Chrome 98+, FF 94+). No polyfill needed; app targets desktop Chrome per project context.
- **Fast-path visual parity** — Direct Fabric object mutation must keep selection outlines, dimension labels, and aging hints consistent. Any label/overlay that's re-rendered from store data each redraw needs to be either (a) re-rendered at drag-end only, or (b) mutated alongside the primary object during drag. Planner calls this out per drag operation.

</code_context>

<specifics>
## Specific Ideas

- "Matches existing precedent" is the guiding value — `updateWallNoHistory` is the model for drag history behavior; Phase 24's manual-smoke verification is the model for evidence bundles.
- Max frame budget during drag: nothing but the moving object re-renders. Grid/dims/other objects stay pinned to the canvas as-is.
- Dev-only tooling (`window.__cadBench`, `window.__cadSeed`) keeps measurement cheap and reproducible without CI-bound assertions.
- Benchmark scene is the roadmap's exact 50 walls / 30 products — no scaling curves, no multi-size matrix.

</specifics>

<deferred>
## Deferred Ideas

- **Full object-pool + dirty-flag diff rendering** — broader fabricSync refactor to maintain `Map<id, FabricObject>` per layer. Out of scope for Phase 25; reconsider if drag-only fast path leaves perf gaps at higher scene sizes.
- **Multi-size benchmarking (10/5, 100/60, etc.)** — useful for scaling curves, but not required by PERF-01/PERF-02. Leave for a future perf phase or one-off investigation.
- **RAF-throttled redraw coalescing for non-drag mutations** — would smooth batch updates (e.g., room resize). Not needed for 60fps drag; revisit if add/remove flows get slow.
- **Automated perf regression test in CI** — committed vitest bench asserting snapshot ratio ≥2x. Value is low (hardware-dependent, flaky); manual evidence is sufficient this milestone.
- **Refreshing the stale "115 tests" count in roadmap/requirements** — cleanup work; bundle into a docs sweep or handle inside Phase 25 verification step if convenient. Not a scope commitment.
- **Feature flag for the drag fast path** — useful for A/B debugging, but adds UI store surface. Only add if the implementation reveals a need during planning.

### Reviewed Todos (not folded)
None — no pending todos matched Phase 25.

</deferred>

---

*Phase: 25-canvas-store-performance*
*Context gathered: 2026-04-19*
