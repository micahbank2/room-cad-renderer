# Phase 25: Canvas & Store Performance - Research

**Researched:** 2026-04-19
**Domain:** Fabric.js v6 hot-path optimization + Zustand/Immer snapshot cloning
**Confidence:** HIGH (all claims grounded in the actual source; verified against current test baseline)

## Summary

Phase 25 lands two surgical optimizations on top of the Phase 24-stabilized tool architecture:

1. A **drag-only fast path** that mutates the moving Fabric object in place on every `mouse:move` and bypasses the full `FabricCanvas.redraw()` cycle (which currently does `fc.clear()` + re-adds every object + re-activates the tool on every store change).
2. A **`structuredClone()` swap** inside `cadStore.snapshot()` to replace the three `JSON.parse(JSON.stringify(...))` calls that run on every history push.

Both changes preserve existing behavior precisely: the undo/redo boundary stays at one history entry per completed drag (matching the `updateWallNoHistory` → `updateWall(...)` pattern already used for wall endpoint, wall rotation, product resize, product rotation, opening slide/resize, ceiling drag, and wall thickness drags today), and the full-redraw pipeline stays as the default for all non-drag mutations.

**Primary recommendation:** Execute exactly the twelve locked decisions in CONTEXT.md — do NOT broaden scope to object pools, RAF batching, or automated perf tests. The current drag path already uses `*NoHistory` store actions for most drags; the missing piece is that each `*NoHistory` call still triggers `FabricCanvas.redraw()` via the Zustand subscription. The fast path breaks that chain for drag ticks only.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Incremental redraw strategy (PERF-01)**
- **D-01:** Drag-only fast path, not full object-pool refactor. Full clear-and-redraw stays as default for non-drag mutations (add/remove wall, tool switch, room change, etc.).
- **D-02:** Disable `canvas.renderOnAddRemove` at FabricCanvas construction. Every batch path (full redraw, drag tick, incremental update) ends with an explicit `fc.requestRenderAll()`.
- **D-03:** Drag fast-path operations covered: (1) Product drag (move), (2) Wall drag (move whole wall), (3) Wall endpoint drag (resize/reshape), (4) Product rotation handle drag.
- **D-04:** During active drag, skip re-rendering all non-moving layers (grid, dimensions, other products/walls/ceilings/custom elements). Only the moving Fabric object is mutated in place; a single `fc.requestRenderAll()` paints the frame.

**Drag history boundary (PERF-01 success criterion #4)**
- **D-05:** Mirror existing `updateWallNoHistory` precedent. During drag: mutate the Fabric object directly, do NOT write to the store. On drag-end: call existing history-pushing store action (`moveProduct`, `updateWall`, `rotateProduct`, etc.) exactly once with final values → single history entry. No per-mousemove store writes.
- **D-06:** On drag interruption (Escape, tool switch, tab blur, cleanup-fn invocation): revert the Fabric object to pre-drag position/angle/endpoints. No store write, no history entry. Cache pre-drag values at drag-start, restore on interruption.

**Snapshot strategy (PERF-02)**
- **D-07:** Replace every `JSON.parse(JSON.stringify(...))` inside `snapshot()` in `src/stores/cadStore.ts` with `structuredClone(...)`. Specifically: `state.rooms`, `root.customElements`, `root.customPaints`. Non-deep slices (e.g., `recentPaints` spread) keep existing handling. No other cloning paths touched in this phase.
- **D-08:** Do NOT skip cloning entirely. Immer's frozen outputs would likely be safe, but tests/migrations/future consumers assume snapshots are independent copies. Literal PERF-02 requirement is structuredClone — keep the shape, just change the mechanism.
- **D-09:** Measure via `console.time("snapshot")` / `console.timeEnd` inside `snapshot()` gated by `import.meta.env.DEV`. Also expose `window.__cadBench()` in dev builds: seeds active room with 50 walls / 30 products, runs snapshot 100× warm, prints mean + p95 before/after. Ad-hoc, zero prod overhead, no brittle CI assertion.

**Verification evidence**
- **D-10:** Evidence bundle for VERIFICATION.md:
  - PERF-01: Chrome DevTools Performance trace screenshot (50 walls / 30 products, dragging a product ~5 seconds). Annotate dropped-frame count; target is zero frames > 16.7ms in dragging region.
  - PERF-02: Terminal/console output from `window.__cadBench()` showing before/after mean + p95 snapshot time, plus calculated ratio (must be ≥2.0).
- **D-11:** Canonical benchmark scene = exactly 50 walls + 30 products. Seeded by single `window.__cadSeed(wallCount, productCount)` dev helper. No multi-size scaling curves in this phase.
- **D-12:** Match Phase 24's verification style — manual-evidence first, no brittle perf asserts in CI. fps is not measurable in jsdom; snapshot ratio is measurable but varies by CI hardware.

### Claude's Discretion
- Exact structure of `window.__cadBench()` / `__cadSeed()` helper output format
- Where to install the drag-start position cache (selectTool closure vs FabricCanvas ref) — planner picks
- Whether to add a feature flag (e.g., `useUIStore.perfDragFastPath`) or ship straight
- Refactoring within fabricSync to factor out per-layer render helpers if that aids the drag fast path
- Whether to pre-refresh the stale "115 tests" count in ROADMAP success criterion #5 during this phase or leave for a later doc sweep

### Deferred Ideas (OUT OF SCOPE)
- Full object-pool + dirty-flag diff rendering — broader fabricSync refactor to maintain `Map<id, FabricObject>` per layer
- Multi-size benchmarking (10/5, 100/60, etc.) — useful for scaling curves but not required
- RAF-throttled redraw coalescing for non-drag mutations
- Automated perf regression test in CI — committed vitest bench asserting snapshot ratio ≥2x
- Refreshing the stale "115 tests" count in roadmap/requirements (actual current baseline: 177 tests, 168 passing, 6 pre-existing failures, 3 todo — see Test Framework below)
- Feature flag for the drag fast path
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERF-01 | Canvas redraw uses incremental updates instead of full clear-and-redraw; 60fps drag at 50 walls / 30 products | Drag Hot-Path Anatomy + Fabric Direct-Mutation Pattern + Single-History-Entry Pattern sections below |
| PERF-02 | cadStore snapshots use `structuredClone()` instead of `JSON.parse(JSON.stringify())`; ≥2x at 50 walls / 30 products | structuredClone Migration Scope + Performance Measurement Approach sections below |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Store-driven rendering** — Canvas cleared and redrawn from store state on every change (current model). Fast path is a *bypass* of this model during drag only; default behavior preserved for all other mutations.
- **Coordinate system** — Feet × scale = pixels. `pxToFeet(pointer, origin, scale)` and origin offset convert. Fast path must use existing conversion; no new coordinate model.
- **Tool cleanup pattern (Phase 24)** — Every `activateXTool()` returns `() => void` cleanup. `FabricCanvas.tsx` stashes in `toolCleanupRef: useRef<(() => void) | null>`. Drag interruption revert (D-06) hooks into this same lifecycle.
- **Closure-scoped tool state (Phase 24)** — No module-level `const state = {...}`. Pre-drag position cache lives either in the `activateSelectTool` closure (preferred precedent — matches existing `dragging`, `dragId`, `resizeInitialScale`, etc.) or as an extra `useRef` in `FabricCanvas.tsx`. Both are allowed under D-06's "Claude's discretion."
- **Public-API bridge exception (D-07 from Phase 24)** — `productTool.pendingProductId` + `selectTool._productLibrary` / `setSelectToolProductLibrary()` are sanctioned module-level bridges. Do NOT extend this pattern for drag state; that stays in closure.
- **Active-room selectors (Phase 5)** — Fast path reads walls/products via `getActiveRoomDoc()` / `useActiveWalls()` / `useActivePlacedProducts()`, NOT legacy top-level fields. `placedCustomElements` lives at `doc.placedCustomElements` with a typed-any cast (current convention).
- **Strict z-order in fabricSync** — grid → room dims → walls → products → ceilings → custom elements. Fast path leaves already-rendered non-moving objects in place and only mutates the one `FabricObject` being dragged. No re-ordering.
- **Dev-only `window.__*` hooks** — Precedent is thin; D-09 introduces the convention. Gate behind `import.meta.env.DEV`. No prod surface.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Fabric.js | ^6.9.1 | 2D canvas, drawing tools, object graph | Already the canvas engine; v6 exposes `requestRenderAll()` + `renderOnAddRemove` flag needed for D-02 |
| Zustand | ^5.0.12 | State store for `cadStore` + `uiStore` | Already the store; `useCADStore.getState()` used imperatively from tool modules |
| Immer | ^11.1.4 | Immutable updates via `produce()` | Already wraps every store action; PERF-02 operates at the snapshot boundary, not the action boundary |
| `structuredClone` (browser built-in) | Baseline 2022 | Deep-clone for snapshots | Node 17+ / Chrome 98+ / Firefox 94+ / Safari 15.4+. App targets desktop Chrome per project context. No polyfill needed. |
| Vitest | ^4.1.2 | Test runner (jsdom env) | Already the runner. 177 tests in current suite. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `performance.now()` | Browser built-in | Sub-ms timing for snapshot bench | Inside `window.__cadBench()` helper (D-09) — NOT `console.time` for the batch measurement; `console.time` resolution is fine for per-call dev telemetry but p95 math needs raw numbers. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff | Status |
|------------|-----------|----------|--------|
| `structuredClone` | `klona` / `lodash.cloneDeep` | Third-party adds deps; structuredClone is native, handles all plain JSON + Map/Set/Date | REJECTED — D-07 locks structuredClone |
| Drag-only fast path | Object-pool + dirty-flag diff | Much bigger refactor; fits neither D-01 nor phase scope | REJECTED (D-01, Deferred) |
| Drag-only fast path | RAF-throttled `redraw()` coalescing | Still runs full `fc.clear()` cycle per RAF frame → same GC pressure; doesn't skip non-moving layers | REJECTED (D-01, Deferred) |
| `console.time` only | Vitest perf-bench test | CI hardware variance → flaky threshold; D-12 explicitly rejects | REJECTED (D-09, D-12) |

**Installation:** None. All needed primitives already in `package.json`.

## Architecture Patterns

### Current Architecture (no new layers)

```
src/
├── stores/
│   └── cadStore.ts              # snapshot() — PERF-02 target (~lines 98-114)
├── canvas/
│   ├── FabricCanvas.tsx         # redraw() full-rebuild loop; disable renderOnAddRemove here
│   ├── fabricSync.ts            # renderWalls/renderProducts/renderCeilings — unchanged (optional helper extraction per "Claude's Discretion")
│   └── tools/
│       ├── selectTool.ts        # drag handlers — primary fast-path site
│       └── toolUtils.ts         # pxToFeet already lives here (Phase 24)
└── types/cad.ts                 # Point, WallSegment, Opening, PlacedProduct, Room — all plain-data (structuredClone-safe)
```

### Pattern 1: Drag-Only Fast Path

**What:** During a drag, bypass `FabricCanvas.redraw()` entirely. Mutate the moving Fabric object in place, then call `fc.requestRenderAll()`. Commit to store exactly once on `mouse:up`.

**When to use:** Only during the four drag operations enumerated in D-03. All other mutations (tool switch, room change, add/remove wall, rotate via keyboard, etc.) keep the full-redraw default.

**Where the hot path currently bleeds frames (from reading selectTool.ts lines 450-647 + FabricCanvas.tsx lines 98-163):**

On every `mouse:move` during a product drag:
1. `onMouseMove` → `useCADStore.getState().moveProduct(dragId, snapped)` (selectTool.ts:630)
2. `moveProduct` pushes history + updates position inside `produce()` (cadStore.ts:301-310)
3. Zustand notifies subscribers → `useActivePlacedProducts()` hook returns new ref
4. `FabricCanvas.redraw()` fires via the `useEffect(() => { redraw(); }, [redraw])` dependency chain (FabricCanvas.tsx:257-259)
5. `redraw()` calls `fc.clear()` then re-adds EVERY object: grid, dims, all walls, all products, all ceilings, all custom elements, all handles, all opening polygons, all wall caps (FabricCanvas.tsx:108-158)
6. `redraw()` also tears down + re-activates the current tool (FabricCanvas.tsx:161-162) — this re-enters `activateSelectTool`, rebinding mouse handlers mid-drag

Note: some drags (wall endpoint, wall thickness, product rotation, product resize, ceiling move, opening slide/resize, wall rotation) **already** call `*NoHistory` variants, which also trigger the same redraw chain — they avoid history but not the redraw cost. Product drag + wall drag additionally push history on every tick (selectTool.ts:630 `moveProduct`, selectTool.ts:641 `updateWall`). Both problems dissolve under D-05: during drag, no store writes at all.

**Example shape:**
```typescript
// Source: pattern synthesized from existing selectTool closure state + FabricCanvas toolCleanupRef
// During drag-start (mouse:down on a product):
const pre = {
  id: hit.id,
  kind: "product" as const,
  left: fabricGroup.left!,
  top: fabricGroup.top!,
  angle: fabricGroup.angle ?? 0,
  feetPos: { ...pp.position },
  feetAngle: pp.rotation,
};
dragPreRef.current = pre;          // or a closure `let pre` in activateSelectTool
fabricGroupRef = fabricGroup;      // cache the specific fabric.Group being dragged

// During drag (mouse:move):
const newLeftPx = origin.x + snapped.x * scale;
const newTopPx  = origin.y + snapped.y * scale;
fabricGroupRef.set({ left: newLeftPx, top: newTopPx });
fc.requestRenderAll();             // single paint, no clear, no re-add
// NO useCADStore.getState().moveProduct(...) call here

// During drag-end (mouse:up):
useCADStore.getState().moveProduct(pre.id, snappedFinal);  // ONE history entry
dragPreRef.current = null;

// During drag-interrupt (cleanup-fn fires or Escape pressed):
fabricGroupRef.set({ left: pre.left, top: pre.top, angle: pre.angle });
fc.requestRenderAll();
dragPreRef.current = null;
// NO store write
```

### Pattern 2: Single History Entry per Drag (the `updateWallNoHistory` precedent)

**What:** The Zustand store exposes two variants of every mutating action used during a drag:
- Committing variant (pushes history): `moveProduct`, `updateWall`, `rotateProduct`, `resizeProduct`, `updateOpening`, `rotateWall`, `updateCeiling`, `resizeCustomElement`, `rotateCustomElement`, `moveCustomElement`
- No-history variant: `updateWallNoHistory`, `updateOpeningNoHistory`, `rotateProductNoHistory`, `rotateWallNoHistory`, `resizeProductNoHistory`, `updateCeilingNoHistory`, `rotateCustomElementNoHistory`, `resizeCustomElementNoHistory` — identical produce() block minus `pushHistory(s)`

**Current precedent in selectTool.ts (lines 285, 300, 319, 331, 348, 356, 366, 383, 423) — the "seed" pattern:**
- On **mouse:down**: call the *committing* variant once with the *current* (unchanged) values to push a single history snapshot representing pre-drag state
- On **mouse:move**: call the *NoHistory* variant repeatedly with changing values → mutates state without bloating `past[]`
- On **mouse:up**: no additional commit needed (already pushed on mouse:down)

**D-05 supersedes this for the four fast-path drags:** during drag, NO store writes at all (not even NoHistory). The store is updated exactly once on mouse:up via the committing variant. This gives one history entry and collapses the per-frame store traffic entirely.

**Special case — wall drag currently has no NoHistory variant** (selectTool.ts:641 calls `updateWall` directly on every tick → pushes history on every tick → this is the primary PERF-01 bug for wall drags today). Options for the planner:
- (a) Don't add a NoHistory variant; just adopt the fast-path-no-store-writes pattern (D-05 mandates this anyway)
- (b) Add `updateWallNoHistory` call on mousedown as the "seed" history push before entering fast path

Recommendation: (a). D-05 already calls for no store writes during drag; the fast path caches pre-drag `{ start, end }` and the final `updateWall(dragId, { start: finalStart, end: finalEnd })` on mouse:up creates the single history entry. No new `*NoHistory` action needed.

### Pattern 3: Fabric v6 `renderOnAddRemove` + `requestRenderAll`

**What:** Fabric.js defaults to `canvas.renderOnAddRemove = true`, which forces an internal `renderAll()` after every `fc.add()`/`fc.remove()` call. With `redraw()` adding ~50 walls + 30 products + dimensions + grid + handles per frame, that's 100+ hidden renders per "single" redraw today.

**Change (D-02):** Set `canvas.renderOnAddRemove = false` at canvas construction (FabricCanvas.tsx:169 area). Every batch path (full redraw, fast-path drag tick, incremental update) ends with an explicit `fc.requestRenderAll()`.

**Why `requestRenderAll` not `renderAll`:** `requestRenderAll` schedules the render on the next microtask/rAF tick, coalescing multiple calls in the same turn into one paint. Safer during the drag tick, where only one paint per frame is desired anyway.

### Anti-Patterns to Avoid

- **Do NOT mutate Fabric object `.left`/`.top` without calling `requestRenderAll`** — the change won't paint until the next natural trigger.
- **Do NOT mutate the fabric object directly and ALSO write to the store during drag** — double the work, plus Zustand notification fires `redraw()` which will wipe and re-create the object you just mutated, causing visual flicker.
- **Do NOT call `fabric.Group.setCoords()` per frame during drag** — it's expensive and only needed for selection/hit-testing, which is already done via `hitTestStore()` reading from the store (not Fabric's containsPoint).
- **Do NOT extend the drag fast path to custom elements, ceiling-polygon drag, or opening slide/resize in this phase** — D-03 explicitly scopes to four operations. Ceiling and opening drags keep their current `*NoHistory` chain + full-redraw path.
- **Do NOT add a NoHistory wall-drag action just to satisfy the "seed history on mousedown" pattern** — the fast path skips store writes during drag entirely (D-05); the single commit on mouseup is the one history entry.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deep cloning nested objects | `JSON.parse(JSON.stringify(...))` or hand recursion | `structuredClone(x)` | Native, handles Map/Set/Date/typed-arrays, faster than JSON roundtrip in all browsers. Baseline since 2022. |
| Scheduling canvas paint | `requestAnimationFrame(() => fc.renderAll())` | `fc.requestRenderAll()` | Fabric v6 already coalesces via its own rAF queue; redundant. |
| Frame timing for benchmark | Hand-rolled setInterval sampling | Chrome DevTools Performance panel (manual, per D-10) | Automated fps in jsdom isn't meaningful; manual trace is the evidence per D-12. |
| Seeding a 50-wall / 30-product scene | Hand-building literal store state | Expose `window.__cadSeed(wallCount, productCount)` dev helper | D-11 locks a reusable dev hook; one implementation, reproducible by any operator. |
| Per-call snapshot timing | Custom perf logger | `console.time("snapshot") / console.timeEnd("snapshot")` guarded by `import.meta.env.DEV` | D-09 locks this; zero prod overhead, DevTools-native surfacing. |

**Key insight:** Everything needed is either (a) already in the codebase (Zustand, Immer, Fabric v6, Vitest) or (b) a browser built-in (structuredClone, performance.now, DevTools Perf panel). No new dependencies.

## Runtime State Inventory

Not applicable — Phase 25 is pure code refactor. No rename, no string substitution, no data migration, no external service registration. Snapshot shape is unchanged (same object keys, same value shapes — only the clone mechanism changes). IndexedDB `serialization.saveProject/loadProject` reads `cadStore` state via normal accessors and is unaffected.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None | None — snapshot shape unchanged (D-07) |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None | None |

**Nothing found in any category** — verified by (1) CONTEXT.md explicitly scoping changes to `src/stores/cadStore.ts` + `src/canvas/FabricCanvas.tsx` + `src/canvas/tools/selectTool.ts` + optionally `src/canvas/fabricSync.ts`, and (2) snapshot output keys (`version`, `rooms`, `activeRoomId`, `customElements`, `customPaints`, `recentPaints`) remaining identical under D-07.

## Common Pitfalls

### Pitfall 1: Tool cleanup invoked mid-drag doesn't revert

**What goes wrong:** User presses `W` (wall tool) while still holding a product drag. Phase 24's FabricCanvas.tsx:161-162 calls `toolCleanupRef.current?.()` — the returned cleanup fn unbinds `mouse:up` and `mouse:move`. If the fast path hasn't wired revert into cleanup, the Fabric object is left at its last-mid-drag position, with no store commit → visual state desyncs from store state on next redraw.

**Why it happens:** Cleanup runs before mouse:up would have fired. Current code (selectTool.ts:699-706) only unbinds listeners and clears `sizeTag`; it does not inspect in-flight drag state.

**How to avoid:** In the cleanup returned by `activateSelectTool`, check if a drag is in flight (`dragging === true` with a cached pre-drag snapshot). If yes: restore Fabric object to pre-drag `{left, top, angle}`, call `fc.requestRenderAll()`, clear the drag state refs. No store write.

**Warning signs:** After tool-switching mid-drag, the next full redraw "snaps" the dragged object back to its store position with a visible jump.

### Pitfall 2: `renderOnAddRemove = false` without a trailing render call

**What goes wrong:** With the flag off, `fc.add(obj)` no longer auto-renders. If any code path (grid.ts `drawGrid`, dimensions.ts `drawRoomDimensions`, fabricSync.ts `renderX`) accidentally relies on that implicit render, those objects become invisible until the next explicit render call.

**Why it happens:** Fabric's default has auto-render baked in; code written against that default doesn't necessarily end with `fc.renderAll()`.

**How to avoid:** Audit every rendering callsite. `FabricCanvas.redraw()` already ends with `fc.renderAll()` (line 158). The fast path must end every tick with `fc.requestRenderAll()`. All async handlers (image onload at line 134, product image cache callback at fabricSync.ts:870, bg image cache at line 133) currently call `fc.renderAll()` — those are fine, but double-check with a grep during planning.

**Warning signs:** After landing D-02, specific elements disappear until a zoom/pan forces redraw.

### Pitfall 3: structuredClone on non-cloneable values

**What goes wrong:** `structuredClone` throws `DataCloneError` on functions, DOM nodes, Symbols, Error instances, WeakMap/WeakSet. If any future field creeps in (e.g., a wall carrying a ref to an HTMLImageElement), snapshot breaks at runtime.

**Why it happens:** Type system doesn't enforce cloneability; types like `Point`, `WallSegment`, `Opening`, `PlacedProduct`, `Room`, `Ceiling`, `WallArt`, `Wallpaper`, `CustomElement`, `PlacedCustomElement` (all in src/types/cad.ts) are plain-data today but TypeScript doesn't prevent future regressions.

**How to avoid:** Verified by scanning types/cad.ts + cadStore.ts: all current fields are primitives, plain objects, or arrays thereof. Add a smoke test `tests/cadStore.test.ts > snapshot is structuredClone-safe` that exercises every snapshot key against a representative fixture (roomDoc with walls + opened openings + wallpaper + wainscoting + crownMolding + wallArt + ceilings + placedProducts + placedCustomElements + customElements + customPaints + recentPaints). Phase 5's `cadStore.multiRoom.test.ts` is a natural companion.

**Warning signs:** Console error "DataCloneError: ... could not be cloned" on undo/redo or any history-pushing action.

### Pitfall 4: Forgetting `setCoords()` on the dragged Fabric object before hit-testing resumes

**What goes wrong:** After the fast path ends, the dragged object's bounding rect (`aCoords` / `oCoords`) may be stale. Not an issue for this codebase because `hitTestStore` reads from the store, not from Fabric's bounding rects — BUT if a future rotation-handle hit test ever falls back to Fabric's `containsPoint`, stale coords break clicks on just-dragged objects.

**Why it happens:** Fabric's cached bounding rects are only recomputed on `setCoords()` call (or via the default internal invalidation that's tied to `renderOnAddRemove` flow).

**How to avoid:** On mouse:up, after the final store commit, `redraw()` will fire via the subscription and rebuild the object from scratch → `setCoords` gets called in the Fabric constructor path. So no explicit `setCoords` needed. Document this assumption in the code.

**Warning signs:** Only surfaces if someone adds Fabric-native hit-testing later.

### Pitfall 5: `setDimensions` during drag

**What goes wrong:** `ResizeObserver` (FabricCanvas.tsx:192-193) fires `redraw()` on any wrapper size change. If that fires mid-drag (e.g., window resize), the fast path's cached Fabric object is destroyed by `fc.clear()` in the middle of the gesture.

**Why it happens:** ResizeObserver is a separate async channel from mouse events.

**How to avoid:** Accept the edge case. It's an extremely rare mid-drag event and graceful degradation is fine (drag effectively ends; the next mouse:move hits stale `fabricGroupRef`). Optional hardening: in the fast path's mouse:move, guard with `if (!fabricGroupRef || !fabricGroupRef.canvas) return`.

**Warning signs:** Resizing window mid-drag causes the drag to "freeze" until mouseup + re-click.

### Pitfall 6: Dev-hook bundle leakage to production

**What goes wrong:** `window.__cadBench` / `window.__cadSeed` attached unconditionally ship in the prod bundle, enlarging bundle and exposing internals.

**How to avoid:** Install inside `if (import.meta.env.DEV) { window.__cadBench = ...; window.__cadSeed = ...; }`. Vite tree-shakes the false branch in prod builds — same mechanism as D-09's snapshot timing gate.

**Warning signs:** Running `npm run build` then grepping `dist/` for `__cadBench` returns matches.

## Code Examples

### `snapshot()` refactor (PERF-02)

Current (src/stores/cadStore.ts:98-114):
```typescript
// Source: src/stores/cadStore.ts lines 98-114
function snapshot(state: CADState): CADSnapshot {
  const root = state as any;
  return {
    version: 2,
    rooms: JSON.parse(JSON.stringify(state.rooms)),
    activeRoomId: state.activeRoomId,
    ...(root.customElements
      ? { customElements: JSON.parse(JSON.stringify(root.customElements)) }
      : {}),
    ...(root.customPaints
      ? { customPaints: JSON.parse(JSON.stringify(root.customPaints)) }
      : {}),
    ...(root.recentPaints
      ? { recentPaints: [...root.recentPaints] }
      : {}),
  };
}
```

Target shape:
```typescript
function snapshot(state: CADState): CADSnapshot {
  const root = state as any;
  const t0 = import.meta.env.DEV ? performance.now() : 0;
  const snap: CADSnapshot = {
    version: 2,
    rooms: structuredClone(state.rooms),
    activeRoomId: state.activeRoomId,
    ...(root.customElements
      ? { customElements: structuredClone(root.customElements) }
      : {}),
    ...(root.customPaints
      ? { customPaints: structuredClone(root.customPaints) }
      : {}),
    ...(root.recentPaints
      ? { recentPaints: [...root.recentPaints] }
      : {}),
  };
  if (import.meta.env.DEV) {
    // Sampled/throttled logging to avoid console spam during rapid edits.
    // (Exact throttle strategy = Claude's discretion per D-09.)
    const dt = performance.now() - t0;
    if (dt > 2) console.log(`[cadStore] snapshot ${dt.toFixed(2)}ms`);
  }
  return snap;
}
```

**Note on D-07 scope:** The three JSON calls inside `copyWallSide` (cadStore.ts:810, 817, 824) and the one at line 834 (wallArt clone loop) are **out of scope** — CONTEXT.md D-07 explicitly names only `state.rooms`, `root.customElements`, `root.customPaints` inside `snapshot()`. The copyWallSide paths are a single user-triggered action, not a hot path, and changing them falls outside PERF-02's verifiable criteria. Leave them as `JSON.parse(JSON.stringify(...))`. *Optional:* planner may choose to swap them too for consistency, but call it out separately in the PR.

Also out of scope: the four JSON calls in `src/App.tsx` (lines 144, 145, 176, 177, 178) — not in `cadStore.ts`, not in PERF-02's stated files.

### Drag fast-path wiring in `selectTool.ts` (PERF-01)

Product drag — current hot loop (src/canvas/tools/selectTool.ts:627-633):
```typescript
// Source: src/canvas/tools/selectTool.ts lines 627-633
} else if (dragType === "product") {
  const pp3 = (getActiveRoomDoc()?.placedProducts ?? {})[dragId];
  if (pp3) {
    useCADStore.getState().moveProduct(dragId, snapped);  // ← per-frame store write, history push, full redraw
  } else {
    useCADStore.getState().moveCustomElement(dragId, snapped);
  }
}
```

Fast-path shape (synthesized):
```typescript
// Closure-scoped (added alongside existing `dragging`, `dragId`, etc. at selectTool.ts:152-165):
let dragPre: {
  id: string;
  kind: "product" | "wall" | "wall-endpoint" | "rotate";
  fabricObj: fabric.Object | null;   // cached reference to the Fabric object being dragged
  origLeft: number;
  origTop: number;
  origAngle: number;
  origFeetPos: Point | { start: Point; end: Point };
  origFeetRotation?: number;
} | null = null;

// On mouse:down for product drag (extending selectTool.ts:425-434):
const fabricObj = findFabricObjectByPlacedProductId(fc, hit.id); // new helper; searches fc._objects by data.placedProductId
dragPre = {
  id: hit.id, kind: "product", fabricObj,
  origLeft: fabricObj?.left ?? 0,
  origTop: fabricObj?.top ?? 0,
  origAngle: fabricObj?.angle ?? 0,
  origFeetPos: { ...pp.position },
};

// On mouse:move (replacing selectTool.ts:627-633 for the product case):
if (dragType === "product" && dragPre?.fabricObj) {
  dragPre.fabricObj.set({
    left: origin.x + snapped.x * scale,
    top:  origin.y + snapped.y * scale,
  });
  fc.requestRenderAll();
  // Cache the latest snapped position for commit-on-mouseup
  lastDragSnapped = snapped;
}

// On mouse:up (extending selectTool.ts:649-675):
if (dragType === "product" && dragPre && lastDragSnapped) {
  const store = useCADStore.getState();
  if ((getActiveRoomDoc()?.placedProducts ?? {})[dragPre.id]) {
    store.moveProduct(dragPre.id, lastDragSnapped);   // ONE history entry
  } else {
    store.moveCustomElement(dragPre.id, lastDragSnapped);
  }
}
dragPre = null;

// In cleanup (extending selectTool.ts:699-706):
return () => {
  // If cleanup fires during an in-flight drag: revert Fabric, don't write to store
  if (dragPre && dragPre.fabricObj) {
    dragPre.fabricObj.set({
      left: dragPre.origLeft,
      top: dragPre.origTop,
      angle: dragPre.origAngle,
    });
    fc.requestRenderAll();
  }
  dragPre = null;
  // ... existing listener-detach code ...
};
```

### `window.__cadSeed` / `window.__cadBench` dev helpers (D-11, D-09)

Shape (planner picks exact output format per "Claude's discretion"):
```typescript
// In src/stores/cadStore.ts, after store definition:
if (import.meta.env.DEV) {
  (window as any).__cadSeed = (wallCount = 50, productCount = 30) => {
    const s = useCADStore.getState();
    // Reset + seed N walls around room perimeter, N products in a grid
    // Use existing store actions: addWall, placeProduct (placeholder product IDs)
    // ...implementation...
    return { walls: wallCount, products: productCount };
  };
  (window as any).__cadBench = (iterations = 100) => {
    const state = useCADStore.getState();
    const samples: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now();
      // Call snapshot() through a test-only export or via push/undo round-trip
      snapshot(state);
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    const mean = samples.reduce((s, x) => s + x, 0) / samples.length;
    const p95 = samples[Math.floor(samples.length * 0.95)];
    console.log(`[__cadBench] n=${iterations} mean=${mean.toFixed(2)}ms p95=${p95.toFixed(2)}ms`);
    return { mean, p95, samples };
  };
}
```

Note: `snapshot()` is currently a module-local function. Planner decides whether to export it for test access, attach `__cadBench` inside the same module, or expose via a `cadStore.test.ts` helper.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `JSON.parse(JSON.stringify(x))` for deep clone | `structuredClone(x)` | Baseline ~2022 (Chrome 98, Node 17) | 2-5x faster for mixed-depth JSON, handles Dates/Maps/Sets |
| Fabric `renderAll()` everywhere | `requestRenderAll()` with `renderOnAddRemove=false` | Fabric v5+ | Coalesces paints, eliminates hidden per-add renders |
| `JSON.parse(JSON.stringify)` for undo-history | `structuredClone` OR immer-frozen references | Immer 9+ (2022) | Per D-08, the codebase opts for structuredClone shape-for-shape — keeps semantics |

**Deprecated/outdated:**
- Nothing in Phase 25's footprint is literally deprecated. `JSON.parse(JSON.stringify)` still works, it's just slower and lossy on Dates/undefined/functions/Symbols. The swap is pure perf + robustness.

## Open Questions

1. **Is a `findFabricObjectByPlacedProductId` helper needed or should the drag-start cache the Fabric object during hit-test?**
   - What we know: `hit.type === "product"` in `hitTestStore` returns only an `id`, not the Fabric object. The fast path needs the Fabric.Group to mutate.
   - What's unclear: Whether to (a) add a helper that walks `fc.getObjects()` searching for `obj.data?.placedProductId === id`, or (b) cache the Fabric object by iterating at drag-start just once.
   - Recommendation: (a) via a small helper `findFabricObjectByData(fc, predicate)`. The lookup is O(N) in objects (~80 for the benchmark scene) and runs once per mousedown.

2. **Does `activateSelectTool` need to be re-activated after every `redraw()`?**
   - What we know: FabricCanvas.tsx:161-162 tears down + re-activates the current tool on every redraw. This means during a full redraw triggered mid-drag (e.g., from a *different* non-drag store change), the drag state would be wiped.
   - What's unclear: Is the tool re-activation actually needed after redraw? The tool's listeners don't depend on canvas object identity — they're bound to `fc.on(...)`.
   - Recommendation: Outside scope for this phase (D-01 "no broader refactor"). BUT: the fast path avoids triggering `redraw()` during drag, which sidesteps this concern entirely. Document in Phase 25 notes.

3. **Snapshot call frequency vs. structuredClone cost for tiny states**
   - What we know: `snapshot()` fires on every history-pushing action. Empty/new projects snapshot in sub-ms. Large states (50 walls / 30 products) are the target case.
   - What's unclear: Does the `console.time("snapshot")` output get noisy for tiny states? D-09 says "gated by DEV" but doesn't specify throttling.
   - Recommendation: Add a `> 2ms` filter (see the code example) to only log interesting cases. Planner's discretion.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js + npm | Build + test | ✓ | per `package.json` | — |
| Vitest | Test suite | ✓ | ^4.1.2 | — |
| Chrome DevTools | Manual perf trace (D-10) | ✓ (user machine) | Chrome 98+ | None — manual human action required |
| `structuredClone` | PERF-02 | ✓ | Node 17+, Chrome 98+ | None needed (baseline) |
| `performance.now()` | D-09 bench | ✓ | Baseline browser | None needed |
| `import.meta.env.DEV` | Dev-hook gating | ✓ | Vite ^8.0.3 | None needed |
| Fabric v6 | `requestRenderAll`, `renderOnAddRemove` | ✓ | ^6.9.1 | None — core dep |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | `vitest.config.ts` (inferred; vitest defaults work) |
| Quick run command | `npm test -- tests/cadStore.test.ts tests/toolCleanup.test.ts` |
| Full suite command | `npm test` |
| Current baseline | **177 tests total, 168 passing, 6 pre-existing failures, 3 todo** (verified 2026-04-19 via `npx vitest run`). ROADMAP's "115 tests" is stale. |

**Pre-existing failures (unchanged baseline from Phase 24):**
- Test file count: 3 failed files / 26 passed = 29 total files (matches `find tests -name *.test.ts -o -name *.test.tsx | wc -l` = 25 + 4 tsx = 29)
- 6 failing tests are pre-existing and unrelated to Phase 25's footprint. Planner should verify the exact list during Wave 0 and confirm none touch `cadStore.ts snapshot()`, `FabricCanvas.tsx`, or `selectTool.ts` drag handlers.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-01 | Dragging a product at 50W/30P sustains 60fps | manual (Chrome DevTools Perf) | N/A — operator captures trace per D-10 | N/A (manual) |
| PERF-01 | Single drag produces exactly one history entry | unit | `npm test -- tests/cadStore.test.ts -t "drag produces single history entry"` | ❌ Wave 0 — add to `tests/cadStore.test.ts` |
| PERF-01 | Drag-interruption via tool-switch reverts and produces zero history entries | unit/integration | `npm test -- tests/toolCleanup.test.ts -t "drag interrupted by tool switch"` | ❌ Wave 0 — add to `tests/toolCleanup.test.ts` (existing file) |
| PERF-01 | Fast path uses `fc.requestRenderAll`, not `fc.clear` during drag move (guards against regression back to full redraw) | unit | `npm test -- tests/fabricSync.test.ts -t "fast path does not clear canvas during drag"` | ❌ Wave 0 — extend existing `tests/fabricSync.test.ts` |
| PERF-01 | `canvas.renderOnAddRemove === false` after init | unit | `npm test -- tests/fabricSync.test.ts -t "renderOnAddRemove disabled"` | ❌ Wave 0 — extend `tests/fabricSync.test.ts` |
| PERF-02 | `snapshot()` returns object independent from input (mutations don't leak) | unit | `npm test -- tests/cadStore.test.ts -t "snapshot is independent"` | Likely ❌ — verify existing cadStore.test.ts doesn't already cover this |
| PERF-02 | `snapshot()` does not call `JSON.parse`/`JSON.stringify` (grep-style or spy-based assertion) | unit | `npm test -- tests/cadStore.test.ts -t "snapshot uses structuredClone"` | ❌ Wave 0 — add |
| PERF-02 | `snapshot()` preserves all keys (rooms, activeRoomId, customElements, customPaints, recentPaints) | unit | `npm test -- tests/cadStore.test.ts -t "snapshot preserves all keys"` | Partial — `cadStore.multiRoom.test.ts` covers rooms; extend for customElements + customPaints + recentPaints |
| PERF-02 | ≥2x snapshot speedup at 50W/30P | manual (dev console) | Operator runs `window.__cadBench()` before/after per D-10 | N/A (manual) |
| PERF-01+02 | All non-regressed tests pass | regression | `npm test` | ✅ full suite exists |

### Sampling Rate

- **Per task commit:** `npm test -- tests/cadStore.test.ts tests/toolCleanup.test.ts tests/fabricSync.test.ts` (the three files touched by Phase 25 changes; ~1s)
- **Per wave merge:** `npm test` (full 177-test suite; ~1.5s per the current run)
- **Phase gate:** Full suite green (168+ passing, pre-existing 6 failures unchanged, 3 todo unchanged) before `/gsd:verify-work`. Plus manual evidence bundle per D-10.

### Wave 0 Gaps

- [ ] Extend `tests/cadStore.test.ts` — cases for:
  - `snapshot()` produces independent deep copy (mutate result → original unchanged)
  - `snapshot()` preserves `customElements`, `customPaints`, `recentPaints` round-trip
  - Product drag commits exactly one history entry (simulate the mouse:down / move×N / mouse:up sequence at the store level, asserting `past.length` delta = 1)
  - Wall drag commits exactly one history entry
- [ ] Extend `tests/toolCleanup.test.ts` — case for:
  - Drag interrupted by tool-switch reverts Fabric object and produces zero history entries
- [ ] Extend `tests/fabricSync.test.ts` — cases for:
  - `canvas.renderOnAddRemove === false` after FabricCanvas mounts
  - Fast-path drag tick calls `fc.requestRenderAll` (spy-based) and not `fc.clear`
- [ ] Install dev-only `window.__cadSeed` and `window.__cadBench` in cadStore.ts (or a sibling module) — not a test, but a dev-build artifact required for D-10's evidence bundle
- [ ] Framework install: none needed (Vitest already present)

If Wave 0 finds that any existing pre-existing failure is *inside* the Phase 25 footprint, escalate before editing — don't entangle a pre-existing red test with a new refactor.

## Sources

### Primary (HIGH confidence)

- `src/stores/cadStore.ts` (lines 98-114) — current `snapshot()` implementation with three `JSON.parse(JSON.stringify(...))` calls
- `src/stores/cadStore.ts` (lines 203-211) — `updateWallNoHistory` precedent for drag-without-history pattern (D-05 references this)
- `src/canvas/FabricCanvas.tsx` (lines 97-163) — full `redraw()` cycle: `fc.clear()` + re-add every layer + re-activate tool
- `src/canvas/FabricCanvas.tsx` (lines 166-204) — canvas init (where D-02's `renderOnAddRemove = false` lands)
- `src/canvas/tools/selectTool.ts` (lines 450-647) — drag `mouse:move` handlers for every drag type; shows which currently call `*NoHistory` vs history-pushing variants
- `src/canvas/tools/selectTool.ts` (lines 699-706) — cleanup-fn precedent (D-06 hooks in here)
- `src/canvas/fabricSync.ts` (entire file, 948 lines) — strict z-order wall/product render; per-layer helpers could be factored if planner chooses
- `.planning/phases/25-canvas-store-performance/25-CONTEXT.md` — locked decisions D-01 through D-12
- `package.json` — Vitest ^4.1.2, Fabric ^6.9.1, Zustand ^5.0.12, Immer ^11.1.4 confirmed
- Live test run 2026-04-19: `npx vitest run` → 177 tests, 168 passing, 6 failed, 3 todo (baseline correction for stale "115" in ROADMAP)

### Secondary (MEDIUM confidence)

- `src/App.tsx` (lines 144, 145, 176-178) — additional `JSON.parse(JSON.stringify(...))` calls *outside* PERF-02's scope; documented for completeness
- `src/stores/cadStore.ts` (lines 810, 817, 824, 834) — `copyWallSide` JSON calls *outside* PERF-02's scope per D-07
- MDN `structuredClone` page — baseline browser support Safari 15.4+, Chrome 98+, FF 94+ (referenced in CONTEXT.md canonical_refs)

### Tertiary (LOW confidence)

- None. All claims are grounded in source-code reads or direct test-runner output.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library is already pinned in `package.json`; no new deps
- Architecture: HIGH — CONTEXT.md D-01..D-12 lock the approach; Phase 24 patterns (cleanup fn, closure state, toolUtils) are already in place
- Pitfalls: HIGH — every pitfall ties to a specific line in the current source
- Validation: HIGH — test framework already running, baseline test count verified live

**Research date:** 2026-04-19
**Valid until:** 2026-05-19 (30 days — stable domain; only risk of drift is if a neighboring phase lands a change to `cadStore.snapshot()` or `FabricCanvas.redraw()` first, which would require re-baselining)
