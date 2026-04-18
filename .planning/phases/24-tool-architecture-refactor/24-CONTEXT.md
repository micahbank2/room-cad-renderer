# Phase 24: Tool Architecture Refactor - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Internal refactor of every tool file under `src/canvas/tools/` (including `ceilingTool.ts`). Goal: eliminate `(fc as any).__xToolCleanup` casts, move module-level mutable state into `activate()` closures, and extract duplicated coordinate helpers (`pxToFeet`, `findClosestWall`) into a single `src/canvas/tools/toolUtils.ts`.

**Zero user-visible behavior change.** Drawing, placement, selection, dragging, undo/redo, tool switching must all behave identically after the refactor.

**Out of scope:** Fixing `as any` casts outside the cleanup pattern (selectTool custom-elements access, FabricCanvas.tsx event types). Those are tracked as deferred tech debt.

</domain>

<decisions>
## Implementation Decisions

### Scope
- **D-01:** Refactor applies to all **6** tool files: `wallTool.ts`, `selectTool.ts`, `doorTool.ts`, `windowTool.ts`, `productTool.ts`, and `ceilingTool.ts`. Requirements originally listed 5 (v1.4 added ceilingTool after requirements were written). All 6 exhibit the same `(fc as any).__xToolCleanup` + module-level `state` pattern.
- **D-02:** Update roadmap success criterion #3 to read "all 6 tool files" instead of "all 5 tool files" during planning.

### Cleanup pattern
- **D-03:** `activate<Tool>Tool()` returns a `() => void` cleanup function. Callers (FabricCanvas.tsx) store the returned function and invoke it on tool switch / unmount. No `(fc as any).__xToolCleanup` anywhere.
- **D-04:** Drop the `deactivate<Tool>Tool(fc)` exports — replaced by calling the stored cleanup fn. If any external caller besides FabricCanvas.tsx uses `deactivateXTool`, planner confirms during research and adjusts.
- **D-05:** FabricCanvas.tsx's tool-dispatch logic (currently calls all `deactivate*` then one `activate*`) updates to track the active cleanup fn in a ref. Planner owns the exact shape.

### Closure state shape
- **D-06:** Tool-internal mutable state lives as individual `let` variables inside `activate()` (e.g., `let startPoint: Point | null = null; let previewLine: fabric.Line | null = null;`). Drop the `WallToolState` / `SelectState` / `CeilingToolState` wrapper interfaces — they add no value inside a closure.
- **D-07:** `productTool.ts`'s `pendingProductId` stays module-level because it's intentionally shared state between the toolbar selection UI and the tool (accessed via `setPendingProduct` / `getPendingProduct`). That's public API, not per-activation state.

### Shared utilities
- **D-08:** New file: `src/canvas/tools/toolUtils.ts`. Exports `pxToFeet(px, origin, scale)` and `findClosestWall(feetPos)`. All 6 tools import from here — zero local copies.
- **D-09:** `toolUtils.ts` lives under `src/canvas/tools/` (not `src/lib/geometry.ts`) because these helpers are tool-specific: they assume a `getActiveRoomDoc()` reading of walls and carry scale/origin semantics that general geometry helpers don't.

### Scope control
- **D-10:** The 4 non-cleanup `as any` casts in `selectTool.ts` (lines 134, 135, 341, 526 — custom-elements catalog access) are **deferred**. Fixing them requires adding proper types to `cadStore.customElements`, which is out of scope.
- **D-11:** The 3 `as any` casts in `FabricCanvas.tsx` (lines 210, 250, 251 — fabric event type workarounds) are **deferred**. They're outside `src/canvas/tools/` and addressing them means navigating fabric.js type definition gaps.

### Verification
- **D-12:** No vitest/jest setup was found in quick scan. Roadmap's "115 tests" claim is unverified — planner confirms during research and updates success criterion #5.
- **D-13:** Verification plan = manual smoke script (planner authors):
  1. Draw 3 walls, confirm preview + length label behavior
  2. Place a door on a wall, place a window on a wall
  3. Place a product, drag it, resize it
  4. Draw a ceiling polygon
  5. Rapid tool switch loop (select → wall → door → window → product → ceiling → select, repeat ×10) — Chrome DevTools Memory: Event Listener count stays stable
  6. Undo/redo across all operations
- **D-14:** If researcher discovers a working test runner, add automated regression coverage on top of the manual script.

### Claude's Discretion
- Exact shape of the cleanup-fn ref in FabricCanvas.tsx (useRef vs. a `Map<ToolType, () => void>` etc.) — planner decides.
- Whether to inline `findNearestEndpoint` (wallTool-only) into `toolUtils.ts` too or leave it in wallTool — planner decides based on whether any other tool ends up needing it.
- Variable naming inside the closure — planner picks consistent style.
- Whether to write a minimal `CleanupFn = () => void` type alias or inline the type.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §"Tool Architecture (TOOL)" — TOOL-01, TOOL-02, TOOL-03 with file/line sources
- `.planning/ROADMAP.md` §"Phase 24: Tool Architecture Refactor" — 5 success criteria (note: criterion #3 says "5 tool files" — update to 6 per D-02)

### Source GitHub issues (context only — requirements already distilled)
- [#53](https://github.com/micahbank2/room-cad-renderer/issues/53) — Tool cleanup type-safe pattern
- [#54](https://github.com/micahbank2/room-cad-renderer/issues/54) — Tool state in closures
- [#55](https://github.com/micahbank2/room-cad-renderer/issues/55) — Extract pxToFeet + findClosestWall

### Files being refactored (all under `src/canvas/tools/`)
- `src/canvas/tools/wallTool.ts` — module-level `state`, local `pxToFeet`, cleanup cast on lines 227/257/260
- `src/canvas/tools/selectTool.ts` — module-level `state` (~line 59), cleanup cast on lines 733/743/746
- `src/canvas/tools/doorTool.ts` — local `pxToFeet` + `findClosestWall`, cleanup cast on lines 160/169/170
- `src/canvas/tools/windowTool.ts` — local `pxToFeet` + `findClosestWall`, cleanup cast on lines 156/165/166
- `src/canvas/tools/productTool.ts` — module-level `pendingProductId` (keep, see D-07), local `pxToFeet`, cleanup cast on lines 60/67/70
- `src/canvas/tools/ceilingTool.ts` — module-level `state` (~line 14), local `pxToFeet`, cleanup cast on lines 161/201/204

### Call sites
- `src/canvas/FabricCanvas.tsx` — activates/deactivates tools in redraw/tool-switch effect. New cleanup-fn return value is consumed here.

### Project conventions
- `CLAUDE.md` §"Tool System" — documents current `(fc as any).__xToolCleanup` pattern (will need update after refactor)
- `CLAUDE.md` §"Tool cleanup pattern" — known gotcha #5 (remove after refactor)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/geometry.ts` — already exports `snapPoint`, `constrainOrthogonal`, `distance`, `formatFeet`, `wallLength`, `closestPointOnWall`. `toolUtils.ts` should use `closestPointOnWall` from here rather than reinvent distance-to-segment math.
- `getActiveRoomDoc()` from `cadStore` — the canonical way to read walls for `findClosestWall`.

### Established Patterns
- Every tool currently calls `deactivateXTool(fc)` as the first line of `activateXTool()` to self-clean before reinstalling — preserve equivalent behavior with the new return-fn pattern.
- Tools read store state via `useCADStore.getState()` / `useUIStore.getState()` (not React subscriptions) — no change needed.
- Tools attach `document.addEventListener("keydown", ...)` in addition to `fc.on(...)` — cleanup fn must remove both.

### Integration Points
- `src/canvas/FabricCanvas.tsx` — single consumer. Its useEffect chain currently calls `deactivateSelectTool(fc); deactivateWallTool(fc); ...` then activates the current one. After refactor: stash returned cleanup in a ref, invoke it before activating the next tool.
- No other code in the app calls `activateXTool` or `deactivateXTool` (verify in planner research).

### Risks
- `selectTool.ts` is 750+ lines with deeply nested event handlers. Moving its `state` object into the closure means every helper inside activate() now sees the same closed-over `let` bindings — watch for any helpers that were extracted to module scope and read `state` directly. They must either move into the closure or take state as a parameter.
- `pendingProductId` in productTool must remain module-scoped (setPendingProduct/getPendingProduct is the toolbar → tool bridge) — don't refactor it.

</code_context>

<specifics>
## Specific Ideas

- Returning `() => void` from activate is the React-idiomatic "useEffect cleanup" shape — matches how FabricCanvas.tsx already thinks about effects.
- Goal is a diff that's readable as "pure refactor": no behavioral changes, just structural. Commit message should say so.

</specifics>

<deferred>
## Deferred Ideas

- **selectTool custom-elements `as any` casts (4 occurrences)** — requires typing `cadStore.customElements` properly. Separate tech-debt task; add as v1.5 backlog issue or defer to v1.6.
- **FabricCanvas.tsx fabric event `as any` casts (3 occurrences)** — fabric.js v6 type-def gaps. Investigate upstream or write a small `fabricTypeShims.ts`. Defer.
- **Automated test coverage for tool activate/deactivate** — if no test runner is wired up, introducing vitest is its own phase (likely v1.6).

### Reviewed Todos (not folded)
- None — `todo match-phase 24` returned no matches.

</deferred>

---

*Phase: 24-tool-architecture-refactor*
*Context gathered: 2026-04-17*
