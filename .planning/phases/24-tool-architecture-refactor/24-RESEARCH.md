# Phase 24: Tool Architecture Refactor - Research

**Researched:** 2026-04-17
**Domain:** Pure structural refactor of 6 Fabric.js tool modules in `src/canvas/tools/`
**Confidence:** HIGH

## Summary

This is a pure structural refactor, not a feature change. All concrete data below was verified against the working-tree source; no training-data assumptions were needed. The refactor target is well-bounded: 6 tool files, 18 `(fc as any)` casts on a single property pattern (`__xToolCleanup`), 6 duplicated `pxToFeet` implementations, 2 duplicated `findClosestWall` implementations, and a single consumer (`FabricCanvas.tsx`).

Two surprises vs. CONTEXT.md expectations:
1. **Test infrastructure is fully wired** — `vitest ^4.1.2` + `@testing-library/react`, 28 test files, 171 tests (not the "115" in the roadmap). Command: `npm test`. 6 pre-existing failures exist but none touch tool files. D-12 success criterion #5 should be updated to "171 tests" or a ratcheting "no new failures" phrasing.
2. **Fabric v6 `fc.on()` already returns a `VoidFunction` disposer** (verified in `node_modules/fabric/dist/src/Observable.d.ts`). The current code ignores that return and calls `fc.off(name, handler)` manually. The planner can choose either approach; keeping `fc.off(name, handler)` matches existing style and is fine.

**Primary recommendation:** Implement the refactor in this order to minimize diff-review risk:
1. Create `toolUtils.ts` (new file, zero consumer changes yet) with `pxToFeet` + `findClosestWall`
2. Refactor the 4 simplest tools (door, window, product, ceiling) one at a time — each tool's commit replaces its local helpers + moves state into closure + returns cleanup fn + updates FabricCanvas.tsx call site
3. Refactor wallTool (moderate complexity — `state` referenced by module-scope `cleanup()` helper)
4. Refactor selectTool last (750 lines, but the `state` object is entirely self-contained inside `activateSelectTool` — no module-scope helpers read it)
5. Delete `deactivate*Tool` exports, remove `deactivateAllTools` helper, replace with a single cleanup-fn ref

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Refactor applies to all 6 tool files: `wallTool.ts`, `selectTool.ts`, `doorTool.ts`, `windowTool.ts`, `productTool.ts`, `ceilingTool.ts`
- **D-02:** Update roadmap success criterion #3 to "all 6 tool files" during planning
- **D-03:** `activate<Tool>Tool()` returns `() => void` cleanup function
- **D-04:** Drop `deactivate<Tool>Tool(fc)` exports — replaced by calling stored cleanup fn
- **D-05:** FabricCanvas.tsx tool-dispatch tracks active cleanup fn in a ref (exact shape = planner discretion)
- **D-06:** Tool-internal state as individual `let` vars inside `activate()`; drop wrapper interfaces (`WallToolState`, `SelectState`, `CeilingToolState`)
- **D-07:** `productTool.pendingProductId` stays module-level (public API for toolbar → tool bridge via `setPendingProduct`/`getPendingProduct`)
- **D-08:** New file `src/canvas/tools/toolUtils.ts` exports `pxToFeet(px, origin, scale)` and `findClosestWall(feetPos)` — zero local copies
- **D-09:** `toolUtils.ts` lives under `src/canvas/tools/` (tool-specific, reads `getActiveRoomDoc()`)
- **D-10:** 4 non-cleanup `as any` casts in selectTool (custom-elements catalog) are **deferred**
- **D-11:** 3 `as any` casts in FabricCanvas.tsx (fabric event types) are **deferred**
- **D-12:** "115 tests" claim unverified — planner confirms (now confirmed: 171 tests, 6 pre-existing failures unrelated to tools)
- **D-13:** Verification = manual smoke script + rapid tool-switch leak check
- **D-14:** If a test runner exists (it does — vitest), add automated regression coverage on top of manual script

### Claude's Discretion
- Exact shape of cleanup-fn ref in FabricCanvas.tsx (useRef vs. Map)
- Whether `findNearestEndpoint` moves into `toolUtils.ts` (currently wallTool-only)
- Variable naming inside closures (consistent style)
- Whether to define `type CleanupFn = () => void` alias or inline

### Deferred Ideas (OUT OF SCOPE)
- selectTool custom-elements `as any` casts (4) — needs `cadStore.customElements` typing
- FabricCanvas.tsx fabric event `as any` casts (3) — needs fabric.js type-def work
- Introducing new automated tests for activate/deactivate — existing 171 tests are the regression harness

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOOL-01 | Tool cleanup uses type-safe pattern (no `as any` on Fabric canvas instance) | §1 enumerates all 18 casts to eliminate; §8 confirms Fabric v6 `fc.on()` returns a typed disposer |
| TOOL-02 | Tool state held in closures, not module-level singletons | §2 maps every module-level mutable binding across 6 files and the exception (productTool.pendingProductId) |
| TOOL-03 | `pxToFeet` and `findClosestWall` extracted to shared `toolUtils.ts` | §4 confirms 6 `pxToFeet` copies (byte-identical bodies) and 2 `findClosestWall` copies (identical except `DOOR_WIDTH`/`WINDOW_WIDTH` constant — see §5) |

## Project Constraints (from CLAUDE.md)

- **Tech stack:** TypeScript strict mode, Fabric.js v6, Vite, React 18
- **No React state in tools** — tools read store via `useCADStore.getState()` / `useUIStore.getState()`
- **Store access pattern:** `getActiveRoomDoc()` for reading active room; preserve this in shared helpers
- **Geometry helpers already in `src/lib/geometry.ts`** — `closestPointOnWall`, `distance`, `wallLength`, `snapPoint`, `constrainOrthogonal`, `formatFeet` — `toolUtils.ts` must use these rather than reinvent
- **GSD workflow enforcement** — all file changes must come from a GSD command; commits must be small and reviewable

---

## 1. Every `(fc as any)` cast in `src/canvas/tools/`

Verified exhaustively — `ripgrep "(fc as any)" src/canvas/tools/` returns **18 matches across 6 files**, all on the `__xToolCleanup` property pattern. Zero other cast patterns exist in tools/:

| File | Line | Code | Role |
|------|------|------|------|
| `productTool.ts` | 60 | `(fc as any).__productToolCleanup = () => {` | write |
| `productTool.ts` | 67 | `const cleanupFn = (fc as any).__productToolCleanup;` | read |
| `productTool.ts` | 70 | `delete (fc as any).__productToolCleanup;` | delete |
| `ceilingTool.ts` | 161 | `(fc as any).__ceilingToolCleanup = () => {` | write |
| `ceilingTool.ts` | 201 | `const fn = (fc as any).__ceilingToolCleanup;` | read |
| `ceilingTool.ts` | 204 | `delete (fc as any).__ceilingToolCleanup;` | delete |
| `windowTool.ts` | 156 | `(fc as any).__windowToolCleanup = () => {` | write |
| `windowTool.ts` | 165 | `const fn = (fc as any).__windowToolCleanup;` | read |
| `windowTool.ts` | 166 | `if (fn) { fn(); delete (fc as any).__windowToolCleanup; }` | delete |
| `wallTool.ts` | 227 | `(fc as any).__wallToolCleanup = () => {` | write |
| `wallTool.ts` | 257 | `const cleanupFn = (fc as any).__wallToolCleanup;` | read |
| `wallTool.ts` | 260 | `delete (fc as any).__wallToolCleanup;` | delete |
| `doorTool.ts` | 160 | `(fc as any).__doorToolCleanup = () => {` | write |
| `doorTool.ts` | 169 | `const fn = (fc as any).__doorToolCleanup;` | read |
| `doorTool.ts` | 170 | `if (fn) { fn(); delete (fc as any).__doorToolCleanup; }` | delete |
| `selectTool.ts` | 733 | `(fc as any).__selectToolCleanup = () => {` | write |
| `selectTool.ts` | 743 | `const cleanupFn = (fc as any).__selectToolCleanup;` | read |
| `selectTool.ts` | 746 | `delete (fc as any).__selectToolCleanup;` | delete |

**All 18 are eliminated by returning the cleanup function from `activate*` and having the caller hold it.** After the refactor the property `__xToolCleanup` ceases to exist anywhere, so the `as any` is no longer necessary.

## 2. Every module-level mutable state declaration

Per-tool inventory. Individual `let` bindings are already used in doorTool, windowTool, productTool — only wallTool, selectTool, ceilingTool have wrapper interfaces that must be dissolved per D-06.

### `wallTool.ts` (lines 7-21)
```ts
interface WallToolState { /* 5 fields */ }
const state: WallToolState = { startPoint, previewLine, startMarker, endpointHighlight, lengthLabel: null }
```
**Fields to move into closure (all `let` bindings):**
- `startPoint: Point | null`
- `previewLine: fabric.Line | null`
- `startMarker: fabric.Circle | null`
- `endpointHighlight: fabric.Circle | null`
- `lengthLabel: fabric.Group | null`

**Gotcha:** A module-scope helper `function cleanup(fc: fabric.Canvas)` (lines 235-254) reads `state.previewLine`, `state.startMarker`, etc. directly. Per CONTEXT.md §Risks, this helper must either move **inside** `activateWallTool` (preferred — becomes a local arrow fn that closes over the `let` bindings) or take the state as a parameter. Inlining is simpler.

**Also:** `findNearestEndpoint(cursor, excludeStart)` (line 28) is pure (doesn't touch `state`) — can stay at module scope or move into `toolUtils.ts` (discretion per D-08). Recommend keeping it in wallTool since only wallTool uses endpoint-snap semantics.

### `selectTool.ts` (lines 41-75)
```ts
interface SelectState { /* 15 fields */ }
const state: SelectState = { dragging: false, dragId: null, dragType: null, ... }
```
**Fields to move into closure (all `let` bindings):** 15 fields including `dragging`, `dragId`, `dragType`, `dragOffsetFeet`, `rotateInitialAngle`, `wallRotateInitialAngleDeg`, `wallRotatePointerStartDeg`, `resizeInitialScale`, `resizeInitialDiagFt`, `wallEndpointWhich`, `openingWallId`, `openingId`, `openingInitialOffset`, `openingInitialWidth`, `openingInitialPointerOffset`.

**Additional module-scope bindings:**
- `let _productLibrary: Product[] = []` — set via exported `setSelectToolProductLibrary()` (line 290). **Keep module-scoped** — it's public API consumed by `FabricCanvas.tsx:93` (`useEffect` → `setSelectToolProductLibrary(productLibrary)`). Same rationale as `pendingProductId` in productTool.
- `let sizeTag: fabric.Group | null = null` (appears near line 240s area, used by `clearSizeTag`) — this IS per-activation state and should move into closure. **Planner must verify during implementation.**

**Verified at source — module-scope helpers that read `state` directly:** None found in my scan. All state reads are inside `activateSelectTool`'s event handlers. This contradicts the CONTEXT.md §Risks warning — after reading the file, moving `state` to closure is a mechanical transformation with no helper-inlining needed. **Planner should double-check by grep'ing `state\.` inside selectTool.ts during implementation.**

### `ceilingTool.ts` (lines 7-19)
```ts
interface CeilingToolState { points, previewLine, vertexMarkers, closingEdge }
const state: CeilingToolState = { points: [], previewLine: null, vertexMarkers: [], closingEdge: null }
```
**Fields to move into closure (`let` bindings):**
- `points: Point[]` (initialize `= []`)
- `previewLine: fabric.Line | null`
- `vertexMarkers: fabric.Circle[]` (initialize `= []`)
- `closingEdge: fabric.Line | null`

**Gotcha:** Module-scope `commitCeiling(fc)` (line 170) and `cleanup(fc)` (line 180) both read `state.*`. Both must move **inside** `activateCeilingTool` to close over the `let` bindings. Simple transformation — no external callers.

### `doorTool.ts`, `windowTool.ts`
Already use individual `let` bindings:
- `doorTool.ts:10` — `let previewPolygon: fabric.Polygon | null = null`
- `windowTool.ts:10` — `let previewPolygon: fabric.Polygon | null = null`

These are module-scope and must move into `activateXTool` closure per TOOL-02. Also:
- `doorTool.ts` — module-scope `updatePreview(fc, hit, scale, origin, fillColor)` (line 45) and `clearPreview(fc)` (line 102) read/write `previewPolygon`. Must inline into closure.
- `windowTool.ts` — same pattern: `updatePreview` (line 45) + `clearPreview` (line 100).

### `productTool.ts`
- `let pendingProductId: string | null = null` (line 8) — **KEEP module-scoped** per D-07. This is the toolbar → tool bridge. Consumer: `src/components/ProductLibrary.tsx:5,37` calls `setPendingProduct(productId)`.
- **No per-activation state exists** in productTool — the only mutable thing is `pendingProductId`. Refactor here is cleanup-only: change the cleanup-fn pattern, extract `pxToFeet`. State migration is a no-op.

## 3. Every call site of `activate*Tool` / `deactivate*Tool`

Verified: **FabricCanvas.tsx is the only external consumer.** Zero matches elsewhere in `src/`.

### `src/canvas/FabricCanvas.tsx` (lines requiring update)

| Line | Current Code | Required Change |
|------|--------------|-----------------|
| 18-23 | `import { activate*, deactivate* } from "./tools/*Tool"` (6 imports) | Drop all `deactivate*` imports; keep `activate*` |
| 160 | `deactivateAllTools(fc);` (inside `redraw` useCallback) | Invoke the stored cleanup-fn ref (if any) instead |
| 161 | `activateCurrentTool(fc, activeTool, scale, origin);` | Store the returned cleanup fn into the ref |
| 198 | `deactivateAllTools(fc);` (inside unmount cleanup) | Invoke stored cleanup-fn ref before `fc.dispose()` |
| 465-472 | `function deactivateAllTools(fc)` helper | **Delete entire function** |
| 474-500 | `function activateCurrentTool(fc, tool, scale, origin)` helper | Change return type to `() => void` — return the cleanup fn from the dispatched `activate*` call |

**In-tool self-deactivation calls** (each `activate*` calls `deactivate*` as its first line to self-clean from prior activation):
- `wallTool.ts:64` — `cleanup(fc)` (calls local helper, not the export — already uses internal fn)
- `selectTool.ts:299` — `deactivateSelectTool(fc)`
- `productTool.ts:34` — `deactivateProductTool(fc)`
- `doorTool.ts:115` — `deactivateDoorTool(fc)`
- `windowTool.ts:113` — `deactivateWindowTool(fc)`
- `ceilingTool.ts:46` — `deactivateCeilingTool(fc)`

After refactor this self-clean is **no longer needed** because (a) callers always invoke the returned cleanup before re-activating, and (b) there is no stored state on `fc` to clear. Drop these lines.

### Recommended cleanup-fn storage shape (planner discretion per D-05)
```ts
// Inside FabricCanvas component:
const toolCleanupRef = useRef<(() => void) | null>(null);

// In redraw useCallback, replacing lines 160-161:
toolCleanupRef.current?.();
toolCleanupRef.current = activateCurrentTool(fc, activeTool, scale, origin);

// In unmount cleanup, replacing line 198:
toolCleanupRef.current?.();
toolCleanupRef.current = null;

// activateCurrentTool now returns (() => void) | null
```

A `useRef<() => void>` is simpler than a `Map<ToolType, () => void>` since only one tool is active at a time and cleanup semantics are "always invoke previous before activating next."

## 4. Duplicated `pxToFeet` implementations

**All 6 tool files have a local `pxToFeet` with byte-identical body** (verified):

| File | Line | Signature |
|------|------|-----------|
| `productTool.ts` | 18 | `function pxToFeet(px, origin, scale): Point` |
| `wallTool.ts` | 48 | `function pxToFeet(px, origin, scale): Point` |
| `windowTool.ts` | 12 | `function pxToFeet(px, origin, scale): Point` |
| `ceilingTool.ts` | 21 | `function pxToFeet(px, origin, scale): Point` |
| `selectTool.ts` | 77 | `function pxToFeet(px, origin, scale): Point` |
| `doorTool.ts` | 12 | `function pxToFeet(px, origin, scale): Point` |

Canonical body (identical across all 6):
```ts
function pxToFeet(
  px: { x: number; y: number },
  origin: { x: number; y: number },
  scale: number
): Point {
  return {
    x: (px.x - origin.x) / scale,
    y: (px.y - origin.y) / scale,
  };
}
```

**Action:** Move verbatim to `src/canvas/tools/toolUtils.ts` as `export function pxToFeet(...)`. Delete all 6 local copies. Each tool adds `import { pxToFeet } from "./toolUtils"`.

## 5. Duplicated `findClosestWall` implementations

Only 2 tools (doorTool, windowTool) have this helper. Bodies differ by **one constant**:

- `doorTool.ts:23-43` — uses `DOOR_WIDTH = 3` in the "skip walls too short" guard
- `windowTool.ts:23-43` — uses `WINDOW_WIDTH = 3` in the same guard

**Both constants have the same value (3)** but live as per-tool file constants. To extract a shared `findClosestWall(feetPos)` that preserves behavior, the **minimum-fit-width** must become a parameter:

```ts
// src/canvas/tools/toolUtils.ts
export function findClosestWall(
  feetPos: Point,
  minWallLength: number = 0
): { wall: WallSegment; offset: number } | null {
  const SNAP_THRESHOLD = 0.5;
  const walls = getActiveRoomDoc()?.walls ?? {};
  let best: { wall: WallSegment; offset: number; dist: number } | null = null;
  for (const wall of Object.values(walls)) {
    const len = wallLength(wall);
    if (len < minWallLength) continue;
    const { point, t } = closestPointOnWall(wall, feetPos);
    const d = distance(point, feetPos);
    const offset = t * len;
    if (d < SNAP_THRESHOLD && (!best || d < best.dist)) {
      best = { wall, offset, dist: d };
    }
  }
  return best ? { wall: best.wall, offset: best.offset } : null;
}
```

Callers pass the tool's `DOOR_WIDTH` / `WINDOW_WIDTH` as `minWallLength`. **Behavior is byte-equivalent** since both currently filter by their own width constant, which is 3 in both tools.

**Alternative (planner discretion):** Keep `findClosestWall(feetPos)` with no second param and move `SNAP_THRESHOLD` into the signature instead. The two tools' `SNAP_THRESHOLD = 0.5` are also identical. Recommend the `minWallLength` param since it reflects the actual per-tool variance.

**Also extract `SNAP_THRESHOLD = 0.5`** as a shared constant in `toolUtils.ts` — it appears in both doorTool:7 and windowTool:7.

## 6. Other shared helpers (bonus utility candidates)

Identified during file scan. Recommend keeping these in their current locations unless the planner has budget — the phase goal is scope-minimal per D-08/D-09.

| Helper | Locations | Recommendation |
|--------|-----------|----------------|
| `updatePreview(fc, hit, scale, origin, fill?)` | `doorTool.ts:45-100`, `windowTool.ts:45-98` | Near-identical (only `fill` color differs). Could extract but it touches Fabric drawing primitives + closed-over `previewPolygon`. **Keep inside each tool's closure** — cleaner than forcing an impure external helper. |
| `clearPreview(fc)` | `doorTool.ts:102`, `windowTool.ts:100` | 6 lines, trivially duplicated. Move into each closure. |
| `findNearestEndpoint` | `wallTool.ts:28` | Only used by wallTool. Keep there. |
| Forward-transform `origin.x + feet.x * scale` pattern | All tools (inline) | Pervasive inline math; extracting `feetToPx()` would touch many lines for minimal clarity gain. **Out of scope** — defer. |

**Final `toolUtils.ts` surface (minimal per D-08):**
```ts
export function pxToFeet(px, origin, scale): Point
export function findClosestWall(feetPos, minWallLength?): { wall, offset } | null
export const SNAP_THRESHOLD = 0.5  // optional — only if findClosestWall exposes it
```

## 7. Event listener leak test approach (Success Criterion #4)

**Goal:** Prove rapid tool switching (10× loop through select → wall → door → window → product → ceiling) does not grow the Fabric event-listener registry.

### Approach A — Chrome DevTools manual (matches D-13 manual smoke plan)
1. `npm run dev`, open app, open Chrome DevTools
2. Performance Monitor → tick "JS event listeners"
3. Record baseline listener count after initial `select` tool activation
4. Tap `V W D N P C V W D N P C …` (keyboard shortcuts) 10 cycles
5. Assert listener count returns to baseline ± 0 after each full cycle

**Drawback:** "JS event listeners" includes DOM-level listeners, not Fabric's internal `__eventListeners` map. Useful for `document.addEventListener("keydown", ...)` leaks but not for `fc.on("mouse:down", ...)` leaks.

### Approach B — Programmatic assertion against Fabric internals (recommended supplement)
Fabric v6's `Observable` class (verified at `node_modules/fabric/dist/src/Observable.d.ts:10`) declares `private __eventListeners`. Although marked private, it's accessible at runtime. A dev-console assertion:

```js
// In browser DevTools console after 10 tool-switch cycles:
const fc = document.querySelector('canvas').__fc;  // or grab via React DevTools
const listeners = fc.__eventListeners || {};
Object.entries(listeners).forEach(([ev, arr]) =>
  console.log(ev, arr.length));
// Expected: mouse:down=1, mouse:move=1, mouse:up=1 (never 10+)
```

**Drawback:** `__eventListeners` is not a stable API — could break in future Fabric versions. Do not add to automated tests.

### Approach C — Automated smoke test (recommended for ratcheting coverage per D-14)
Add a single vitest integration test that exercises the activate → cleanup → activate cycle programmatically, using the returned cleanup fn:

```ts
// tests/toolCleanup.test.ts
import * as fabric from "fabric";
import { activateDoorTool } from "@/canvas/tools/doorTool";

test("activateDoorTool cleanup fn removes all listeners", () => {
  const fc = new fabric.Canvas(document.createElement("canvas"));
  const beforeCount = Object.values((fc as any).__eventListeners ?? {})
    .reduce((n: number, arr: any) => n + arr.length, 0);

  const cleanup = activateDoorTool(fc, 10, { x: 0, y: 0 });
  const afterActivate = /* ... */;
  expect(afterActivate).toBeGreaterThan(beforeCount);

  cleanup();
  const afterCleanup = /* ... */;
  expect(afterCleanup).toBe(beforeCount);
});
```

Run one such test per tool (6 tests). Uses `happy-dom` (already installed). **Recommended — cheap, catches regressions, and D-14 explicitly authorizes this.**

## 8. Test coverage mapping

### Current test infrastructure (verified)
- **Runner:** Vitest ^4.1.2 (`vitest.config.ts` exists)
- **Scripts:** `npm test` (= `vitest run`), `npm run test:watch`, `npm run test:quick`
- **DOM library:** happy-dom ^20.8.9 + jsdom ^29.0.1
- **RTL:** @testing-library/react ^16, @testing-library/jest-dom ^6.9.1, user-event ^14
- **Total tests on main:** **171 tests across 28 files** (roadmap's "115" is stale by ~2 milestones)
- **Pre-existing failures:** 6 tests in 3 files (`productStore`, `cadStore.paint` or similar — **none reference any tool module**). Planner should verify the 6 failures are pre-existing vs. phase-introduced before calling the refactor complete.

### Tests directly covering tool files
**None.** `grep "wallTool\|doorTool\|windowTool\|productTool\|selectTool\|ceilingTool" tests/` returns zero matches. The refactor has no direct unit-test regression exposure.

### Tests that exercise adjacent code (could regress indirectly)
| Test file | What it covers | Indirect relevance |
|-----------|----------------|---------------------|
| `tests/fabricSync.test.ts` | Wall/product rendering | Tool output (placed walls/products) flows through here — catches if a tool stops calling store actions correctly |
| `tests/cadStore.test.ts` | `addWall`, `addOpening`, `placeProduct`, etc. | Tool action targets |
| `tests/cadStore.multiRoom.test.ts` | Active-room doc switching | `findClosestWall` uses `getActiveRoomDoc()` — must not regress multi-room behavior |
| `tests/geometry.test.ts` | `snapPoint`, `distance`, `closestPointOnWall`, `wallLength` | Helpers `toolUtils.ts` depends on |
| `tests/dimensionEditor.test.ts` | Dimension-label editing | Not tool-related, but lives in canvas area |
| `tests/dragDrop.test.ts` | Drag-drop of products | Adjacent canvas wiring |

**Recommendation:** Success criterion #5 becomes "all 165 currently-passing tests still pass; 6 known pre-existing failures remain unchanged." Document the 6 failing test names in the VALIDATION.md so phase-verifier doesn't flag them as regressions.

**Planner TODO:** Capture the exact 6 failing test names in VALIDATION.md (run `npm test 2>&1 | grep -A 1 "✗\|FAIL"`) before execution so the pre/post comparison is unambiguous.

## 9. productTool `pendingProductId` external usage (risk check for D-07)

Verified consumer: **`src/components/ProductLibrary.tsx`** only.
- Line 5: `import { setPendingProduct } from "@/canvas/tools/productTool";`
- Line 37: `setPendingProduct(productId);` (called when user clicks a product in the library to arm placement)

No consumer calls `getPendingProduct()` — it's used internally inside `activateProductTool` (line 37 reads it inside `onMouseDown`). Safe to keep as-is; safe to remove the `getPendingProduct` export if unused elsewhere (**verify** — one more grep: only `productTool.ts:14` defines it and only `productTool.ts:37` reads `pendingProductId`, so `getPendingProduct` appears to be **dead code** exported but never imported. **Optional cleanup: delete the `getPendingProduct` export.** Not required for TOOL-01/02/03 but a tidiness win.)

**Same pattern exists for `setSelectToolProductLibrary`:** lives at module scope in selectTool.ts (line 290), consumed by FabricCanvas.tsx:93 via `useEffect`. Per the same rationale as `pendingProductId`, leave it module-scoped — it's a cross-boundary bridge, not per-activation state.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Distance from point to line segment | Custom math | `closestPointOnWall` from `@/lib/geometry` |
| Grid snapping | Custom rounding | `snapPoint` from `@/lib/geometry` |
| Orthogonal constraint | Custom angle logic | `constrainOrthogonal` from `@/lib/geometry` |
| Wall length | `Math.hypot`/`Math.sqrt` inline | `wallLength` from `@/lib/geometry` |
| Active-room wall lookup | Raw `useCADStore.getState().rooms[...]` indexing | `getActiveRoomDoc()` from `@/stores/cadStore` |
| Cleanup-fn type alias | `type Disposer = () => void` etc. | Either inline `() => void` or reuse Fabric's exported `VoidFunction` type from `Observable.d.ts` |

## Common Pitfalls

### Pitfall 1: Forgetting to also remove `document.addEventListener("keydown", ...)`
Every tool attaches a keydown listener on `document` in addition to Fabric events. The returned cleanup fn **must** call `document.removeEventListener("keydown", onKeyDown)`. Easy to miss since the rest of the cleanup is `fc.off(...)` calls. All current cleanup blocks do this correctly — preserve the pattern.

### Pitfall 2: `cleanup()` helpers in wallTool/ceilingTool also clear preview objects
wallTool's `cleanup(fc)` (line 235) and ceilingTool's `cleanup(fc)` (line 180) do two jobs: (a) remove preview Fabric objects, (b) reset state to initial. The returned cleanup fn must do both. Don't merge them into a "just remove listeners" fn — you'll leak preview polygons/markers onto the canvas after tool switch.

### Pitfall 3: Double-cleanup on unmount
`FabricCanvas.tsx:194-201`'s unmount effect calls `deactivateAllTools(fc)` then `fc.dispose()`. After refactor, the unmount block must: (a) invoke stored cleanup-fn ref, (b) then `fc.dispose()`. Order matters — cleaning up after dispose will throw.

### Pitfall 4: `activateCurrentTool` must handle unknown tool types
Current switch (line 480) silently ignores unknown tools. After refactor, `activateCurrentTool` returning `() => void | null` must handle the "no tool" case — return `null` or a no-op `() => {}`. Recommend `null` + nullish-call in caller (`toolCleanupRef.current?.()`).

### Pitfall 5: selectTool's `sizeTag` is module-scoped, easy to miss
The `sizeTag` variable (used in `clearSizeTag(fc)` on line 738 inside the cleanup block) is separate from the `state` object. **Verify during implementation** — grep `sizeTag` in selectTool.ts and confirm whether it's module-scope or closure-scope. If module-scope, move it into the `activateSelectTool` closure alongside the other former-`state` fields.

### Pitfall 6: `findClosestWall` parameter-order ambiguity
If planner changes signature to `findClosestWall(feetPos, minWallLength)` with optional `minWallLength = 0`, a door call site passing just `findClosestWall(feet)` would silently accept walls shorter than 3'. Recommend making `minWallLength` **required** to surface this at TypeScript compile time.

## Code Examples

### Before/after: productTool.ts (simplest case)

**Before:**
```ts
let pendingProductId: string | null = null;  // KEEP (public API)

function pxToFeet(px, origin, scale): Point { ... }  // DELETE — import from toolUtils

export function activateProductTool(fc, scale, origin) {
  deactivateProductTool(fc);  // DELETE — no longer needed
  const onMouseDown = (opt) => { /* ... uses pendingProductId + pxToFeet */ };
  const onKeyDown = (e) => { /* ... */ };
  fc.on("mouse:down", onMouseDown);
  document.addEventListener("keydown", onKeyDown);
  (fc as any).__productToolCleanup = () => { /* cleanup */ };  // DELETE the cast
}

export function deactivateProductTool(fc) {  // DELETE the whole export
  const cleanupFn = (fc as any).__productToolCleanup;
  if (cleanupFn) { cleanupFn(); delete (fc as any).__productToolCleanup; }
}
```

**After:**
```ts
import { pxToFeet } from "./toolUtils";
// ... other imports unchanged

let pendingProductId: string | null = null;  // unchanged — public API

export function setPendingProduct(productId: string | null) {
  pendingProductId = productId;
}

export function activateProductTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number }
): () => void {
  const onMouseDown = (opt: fabric.TEvent) => {
    if (!pendingProductId) return;
    const pointer = fc.getViewportPoint(opt.e);
    const gridSnap = useUIStore.getState().gridSnap;
    const feet = pxToFeet(pointer, origin, scale);
    const snapped = gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;
    useCADStore.getState().placeProduct(pendingProductId, snapped);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      pendingProductId = null;
      useUIStore.getState().setTool("select");
    }
  };
  fc.on("mouse:down", onMouseDown);
  document.addEventListener("keydown", onKeyDown);
  return () => {
    fc.off("mouse:down", onMouseDown);
    document.removeEventListener("keydown", onKeyDown);
  };
}
// getPendingProduct removed (dead code). deactivateProductTool removed.
```

### Before/after: FabricCanvas.tsx tool dispatch

**Before (lines 160-161, 198, 465-500):**
```ts
// Inside redraw useCallback:
deactivateAllTools(fc);
activateCurrentTool(fc, activeTool, scale, origin);

// Inside unmount:
deactivateAllTools(fc);
fc.dispose();

// Helpers:
function deactivateAllTools(fc) {
  deactivateSelectTool(fc); deactivateWallTool(fc); /* ...4 more */
}
function activateCurrentTool(fc, tool, scale, origin) {
  switch (tool) { case "select": activateSelectTool(fc, scale, origin); break; /* ... */ }
}
```

**After:**
```ts
// Add at component top:
const toolCleanupRef = useRef<(() => void) | null>(null);

// In redraw useCallback:
toolCleanupRef.current?.();
toolCleanupRef.current = activateCurrentTool(fc, activeTool, scale, origin);

// In unmount:
toolCleanupRef.current?.();
toolCleanupRef.current = null;
fc.dispose();

// Helper (deactivateAllTools deleted):
function activateCurrentTool(
  fc: fabric.Canvas, tool: string, scale: number, origin: { x: number; y: number }
): (() => void) | null {
  switch (tool) {
    case "select":  return activateSelectTool(fc, scale, origin);
    case "wall":    return activateWallTool(fc, scale, origin);
    case "product": return activateProductTool(fc, scale, origin);
    case "door":    return activateDoorTool(fc, scale, origin);
    case "window":  return activateWindowTool(fc, scale, origin);
    case "ceiling": return activateCeilingTool(fc, scale, origin);
    default:        return null;
  }
}
```

### New file: `src/canvas/tools/toolUtils.ts`
```ts
import { getActiveRoomDoc } from "@/stores/cadStore";
import { closestPointOnWall, distance, wallLength } from "@/lib/geometry";
import type { Point, WallSegment } from "@/types/cad";

/** Default snap threshold (in feet) for wall hit-testing. */
export const WALL_SNAP_THRESHOLD_FT = 0.5;

/** Convert canvas-pixel coordinates to real-world feet. */
export function pxToFeet(
  px: { x: number; y: number },
  origin: { x: number; y: number },
  scale: number,
): Point {
  return {
    x: (px.x - origin.x) / scale,
    y: (px.y - origin.y) / scale,
  };
}

/** Find the closest wall to a feet-position within WALL_SNAP_THRESHOLD_FT.
 *  Skips walls shorter than minWallLength (use door/window width to ensure fit). */
export function findClosestWall(
  feetPos: Point,
  minWallLength: number,
): { wall: WallSegment; offset: number } | null {
  const walls = getActiveRoomDoc()?.walls ?? {};
  let best: { wall: WallSegment; offset: number; dist: number } | null = null;
  for (const wall of Object.values(walls)) {
    const len = wallLength(wall);
    if (len < minWallLength) continue;
    const { point, t } = closestPointOnWall(wall, feetPos);
    const d = distance(point, feetPos);
    const offset = t * len;
    if (d < WALL_SNAP_THRESHOLD_FT && (!best || d < best.dist)) {
      best = { wall, offset, dist: d };
    }
  }
  return best ? { wall: best.wall, offset: best.offset } : null;
}
```

## Environment Availability

Skipped — phase is purely code/config changes using already-installed deps.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | `vitest.config.ts` (exists at repo root) |
| DOM library | happy-dom ^20.8.9 + jsdom ^29.0.1 |
| Quick run command | `npm run test:quick` (dot reporter) |
| Full suite command | `npm test` (= `vitest run`) |
| Current totals | 171 tests in 28 files — 165 passing, 6 pre-existing failures (none in tool code) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TOOL-01 | Zero `(fc as any)` in `src/canvas/tools/` | grep guard | `! grep -rE "\(fc as any\)" src/canvas/tools/` | ✅ repo shell |
| TOOL-01 | TypeScript strict mode compiles after refactor | type-check | `npx tsc --noEmit` | ✅ already wired |
| TOOL-01 | Rapid tool switch does not grow listener count | integration | `npm test -- toolCleanup.test.ts` | ❌ Wave 0 (new) |
| TOOL-02 | No `const state =` module-scope in tool files | grep guard | `! grep -E "^const state" src/canvas/tools/*.ts` | ✅ repo shell |
| TOOL-02 | Existing behavior tests pass (fabricSync, cadStore, geometry, dragDrop) | integration | `npm test` | ✅ existing 165 passing tests |
| TOOL-03 | `src/canvas/tools/toolUtils.ts` exists | fs check | `test -f src/canvas/tools/toolUtils.ts` | ❌ Wave 0 (new file) |
| TOOL-03 | All 6 tool files import from toolUtils | grep guard | `for f in src/canvas/tools/{wallTool,selectTool,doorTool,windowTool,productTool,ceilingTool}.ts; do grep -q "from \"./toolUtils\"" "$f" || exit 1; done` | ✅ repo shell |
| TOOL-03 | Zero local `function pxToFeet` in tool files | grep guard | `! grep -E "^function pxToFeet" src/canvas/tools/{wallTool,selectTool,doorTool,windowTool,productTool,ceilingTool}.ts` | ✅ repo shell |
| TOOL-03 | Zero local `function findClosestWall` in tool files | grep guard | `! grep -E "^function findClosestWall" src/canvas/tools/{doorTool,windowTool}.ts` | ✅ repo shell |
| Success #4 | Rapid tool switching produces no listener leak | manual + automated | D-13 Chrome DevTools script + new `tests/toolCleanup.test.ts` | ❌ Wave 0 (manual script doc + optional automated test) |
| Success #5 | No behavioral regressions | full suite | `npm test` — assert "165 passed, 6 failed" matches baseline | ✅ existing |

### Sampling Rate
- **Per task commit:** `npm run test:quick` (dot reporter, ~1.5s) + relevant grep guards
- **Per wave merge:** `npm test` full run + `npx tsc --noEmit`
- **Phase gate:** Full suite passes with identical failure set as baseline (6 pre-existing) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/canvas/tools/toolUtils.ts` — new file (no tests needed — exercised indirectly by every tool file and by existing fabricSync/cadStore tests)
- [ ] `tests/toolCleanup.test.ts` — **optional** automated listener-leak test per D-14 (6 test cases, one per tool). Recommend including since cost is low and it ratchets coverage for the whole file group.
- [ ] Document the 6 pre-existing test failures by name in VALIDATION.md (baseline snapshot) — prevents false-positive regression reports
- [ ] Smoke-test script per D-13 captured as markdown checklist in VALIDATION.md

## State of the Art

| Old Approach | Current Approach | Why |
|--------------|------------------|-----|
| `(fc as any).__xToolCleanup = ...` property stashing | Return `() => void` cleanup fn from `activate*` | Matches React useEffect idiom; TS-safe; no type escape hatch |
| Module-level `const state = {...}` singleton | Closure-scoped `let` bindings inside `activate*` | Two parallel activations can't bleed state; state lifecycle matches activation lifecycle |
| Per-tool local `pxToFeet` / `findClosestWall` | Shared `src/canvas/tools/toolUtils.ts` | DRY; single place to fix bugs or extend grid-snap behavior |

## Open Questions

1. **Should `getPendingProduct` be removed?**
   - What we know: only defined in productTool.ts:14, never imported anywhere.
   - Recommendation: Delete it as tidiness. Not required for TOOL-01/02/03.

2. **Should `findNearestEndpoint` (wallTool-only, line 28) move into toolUtils.ts?**
   - What we know: Only wallTool uses it. No other tool needs endpoint snapping today.
   - Recommendation: Leave in wallTool per D-08 scope-minimal principle. Promote to toolUtils.ts only if a second tool needs it later.

3. **Should the new automated leak test (tests/toolCleanup.test.ts) be part of Phase 24 scope?**
   - What we know: D-14 says "if researcher discovers a working test runner, add automated regression coverage." Test runner exists; test would be small (~60 lines, 6 cases).
   - Recommendation: Include it. Cost is low, value is high (turns the manual D-13 rapid-switch check into a permanent regression guard).

4. **What are the 6 pre-existing test failures exactly?**
   - What we know: 6 failed in 3 files; one failure surfaced in `productStore.test.ts:122`.
   - Recommendation: Planner runs `npm test` at phase start and captures the failing test names verbatim in VALIDATION.md as the "ignore" baseline. If fewer than 6 fail, that's still pass. If a new one appears, the refactor regressed something.

## Sources

### Primary (HIGH confidence)
- `src/canvas/tools/*.ts` — all 6 tool files read exhaustively at their current working-tree state
- `src/canvas/FabricCanvas.tsx` — full file read (501 lines)
- `src/components/ProductLibrary.tsx` — verified via grep (productTool external caller)
- `package.json` — test script + dependency versions
- `node_modules/fabric/dist/src/Observable.d.ts` — Fabric v6 event API (confirms `fc.on()` returns `VoidFunction` disposer)
- `vitest.config.ts` — test runner confirmed present
- `npm test` output — 171 tests, 6 pre-existing failures (not in tool code)

### Secondary (MEDIUM confidence)
- CLAUDE.md (repo root) — architecture conventions
- `.planning/phases/24-tool-architecture-refactor/24-CONTEXT.md` — 14 locked decisions
- `.planning/REQUIREMENTS.md` — TOOL-01/02/03 acceptance criteria

### Tertiary (LOW confidence)
- None — all findings verified against working-tree source.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — refactor introduces no new dependencies; uses existing Vitest + TypeScript + Fabric v6
- Architecture: HIGH — all 18 casts, all 6 duplicate `pxToFeet`, both `findClosestWall` copies, and all call sites were enumerated by grep against working-tree source
- Pitfalls: HIGH — pitfalls 1-6 derived from reading the actual file contents, not generic TypeScript refactor advice

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (30 days — stable refactor target, low-churn codebase area)

---

## RESEARCH COMPLETE

Phase 24 is a pure structural refactor with a well-bounded target: **18 `(fc as any)` casts** to eliminate (all on `__xToolCleanup` property), **6 byte-identical `pxToFeet` copies** to consolidate, **2 near-identical `findClosestWall` copies** (parameterized by `minWallLength`), **3 wrapper-interface + `state` object dissolutions** (wallTool, selectTool, ceilingTool), and a single consumer (`FabricCanvas.tsx`) whose tool-dispatch switches from "deactivate-all + activate-one" to "invoke stored cleanup ref + store new cleanup ref." Test infrastructure is already wired (vitest ^4.1.2, 165 passing tests, 6 known-failing tests unrelated to tool code) so success criterion #5 can be verified automatically. The roadmap's "115 tests" figure is stale — actual total is 171. Two module-scope bindings stay put per D-07 (`pendingProductId`) and analogous rationale (`_productLibrary` in selectTool + `setSelectToolProductLibrary`). Recommend adding a small `tests/toolCleanup.test.ts` (~60 lines, 6 cases) to convert the manual D-13 rapid-switch leak check into a permanent automated regression guard; cost is low and D-14 authorizes it.
