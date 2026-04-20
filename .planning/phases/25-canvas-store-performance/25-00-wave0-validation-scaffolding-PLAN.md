---
phase: 25-canvas-store-performance
plan: 00
type: execute
wave: 0
depends_on: []
files_modified:
  - tests/cadStore.test.ts
  - tests/toolCleanup.test.ts
  - tests/fabricSync.test.ts
  - src/stores/cadStore.ts
autonomous: true
requirements: [PERF-01, PERF-02]
gap_closure: false

must_haves:
  truths:
    - "All 7 Wave 0 unit tests named in 25-VALIDATION.md exist and fail (RED) before production code lands"
    - "window.__cadSeed(wallCount, productCount) and window.__cadBench() exist in dev builds only"
    - "Pre-existing 168-pass / 6-fail / 3-todo baseline is preserved — no unrelated regressions"
  artifacts:
    - path: "tests/cadStore.test.ts"
      provides: "5 new test cases for snapshot independence, key preservation, no-JSON-stringify, product drag single history entry, wall drag single history entry"
      contains: "snapshot is independent"
    - path: "tests/toolCleanup.test.ts"
      provides: "drag-interrupt-by-tool-switch revert test case"
      contains: "drag interrupted by tool switch"
    - path: "tests/fabricSync.test.ts"
      provides: "renderOnAddRemove disabled + fast-path no-clear test cases"
      contains: "renderOnAddRemove disabled"
    - path: "src/stores/cadStore.ts"
      provides: "Dev-only window.__cadSeed and window.__cadBench helpers gated by import.meta.env.DEV"
      contains: "import.meta.env.DEV"
  key_links:
    - from: "Wave 1 (PERF-02 structuredClone swap)"
      to: "tests/cadStore.test.ts"
      via: "Tests defined here MUST flip from RED to GREEN when structuredClone lands"
      pattern: "snapshot uses structuredClone"
    - from: "Wave 2 (PERF-01 drag fast path)"
      to: "tests/toolCleanup.test.ts, tests/fabricSync.test.ts, tests/cadStore.test.ts"
      via: "Tests defined here MUST flip from RED to GREEN when fast path lands"
      pattern: "drag produces single history entry|renderOnAddRemove disabled|fast path does not clear"
    - from: "Wave 3 (VERIFICATION evidence)"
      to: "window.__cadSeed / window.__cadBench"
      via: "Dev helpers installed here are the evidence-capture surface for D-10 + D-11"
      pattern: "window\\.__cadBench|window\\.__cadSeed"
---

<objective>
Land Wave 0 validation scaffolding: 7 RED unit tests from 25-VALIDATION.md + dev-only `window.__cadSeed` / `window.__cadBench` helpers. This is the feedback-sampling contract — every later wave has tests that fail correctly before code and pass after.

Purpose: Per the Nyquist rule, every `<verify>` in Waves 1 and 2 needs an `<automated>` test that already exists. This plan writes those tests FIRST so the red→green transition is observable.
Output: 3 test files extended with 7 new failing cases; `cadStore.ts` extended with two dev-gated window helpers.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/25-canvas-store-performance/25-CONTEXT.md
@.planning/phases/25-canvas-store-performance/25-RESEARCH.md
@.planning/phases/25-canvas-store-performance/25-VALIDATION.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@src/stores/cadStore.ts
@tests/cadStore.test.ts
@tests/toolCleanup.test.ts
@tests/fabricSync.test.ts

<interfaces>
<!-- Current snapshot() function (src/stores/cadStore.ts lines 98-114) — to be tested as-is in Wave 0, changed in Wave 1 -->
```typescript
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

<!-- snapshot is module-local — not exported. Test strategy: exercise snapshot() indirectly via history-pushing store actions and inspect state.past[state.past.length - 1], OR export it via a narrow `__test_snapshot` helper. -->

<!-- History inspection via Zustand: useCADStore.getState().past — array of CADSnapshot objects, max 50 entries. pushHistory called inside every committing action (updateWall, moveProduct, etc.). -->

<!-- Dev-hook convention (D-09, new in this phase): gate via `if (import.meta.env.DEV) { (window as any).__cadSeed = ...; (window as any).__cadBench = ...; }` at module scope, after the useCADStore create() call. -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add 5 snapshot-behavior + drag-history test cases to tests/cadStore.test.ts</name>
  <files>tests/cadStore.test.ts</files>
  <read_first>
    - tests/cadStore.test.ts (existing structure/patterns for `describe`/`it`/`beforeEach` and how state is reset between cases)
    - tests/cadStore.multiRoom.test.ts (precedent for exercising store actions + inspecting rooms)
    - src/stores/cadStore.ts (lines 98-114 for current snapshot() shape; lines 161-211 for pushHistory/updateWall pattern; lines 203-211 for updateWallNoHistory precedent)
    - .planning/phases/25-canvas-store-performance/25-VALIDATION.md (Per-Task Verification Map — test names must match exactly)
    - .planning/phases/25-canvas-store-performance/25-CONTEXT.md (locked D-05, D-07, D-08)
    - .planning/phases/25-canvas-store-performance/25-RESEARCH.md (§"Code Examples" — snapshot refactor target shape)
  </read_first>
  <behavior>
    - Test "snapshot is independent" — after pushHistory is triggered, mutating the result in state.past[0] does NOT mutate the live state.rooms. Assert via reference-equality + deep mutation.
    - Test "snapshot preserves all keys" — after seeding a room with walls, placedProducts, customElements, customPaints, recentPaints, the latest past entry has ALL five keys with equal shape (use toEqual on each slice).
    - Test "snapshot uses structuredClone" — source-level guard: read src/stores/cadStore.ts as text via `readFileSync`, assert the snapshot() function body does NOT contain "JSON.parse(JSON.stringify" AND DOES contain "structuredClone(". (This test MUST be RED in Wave 0 — pre-migration source still has JSON.parse.)
    - Test "drag produces single history entry" (product variant) — simulate drag by calling `moveProduct(id, pos)` ONCE with final position (mouse:down is hit-only, mouse:moves do not write to store in fast-path world, mouse:up commits once). Assert `past.length` delta = 1. (In Wave 0 this passes today because tests simulate only the final commit; the test PINS the contract so Wave 2's fast-path implementation cannot regress it.)
    - Test "wall drag produces single history entry" — identical structure calling `updateWall(id, { start, end })` ONCE. past.length delta = 1.
  </behavior>
  <action>
    Append to tests/cadStore.test.ts a new `describe("Phase 25 Wave 0 — snapshot + drag history contract", () => { ... })` block with exactly these five `it(...)` cases using the exact test names listed above (Vitest will filter by `-t`):

    1. `it("snapshot is independent", ...)` — drive the store to push at least one history entry (e.g., call `useCADStore.getState().addWall({x:0,y:0}, {x:5,y:0})`), then grab `const past0 = useCADStore.getState().past[0]`. Mutate `past0.rooms.room_main.room.width = 999`. Assert `useCADStore.getState().rooms.room_main.room.width !== 999`.

    2. `it("snapshot preserves all keys", ...)` — extend live state to include customElements/customPaints/recentPaints (set via `(useCADStore.setState as any)({ customElements: { foo: { id: "foo" } }, customPaints: { red: "#f00" }, recentPaints: ["#f00"] })` before the triggering action), call `addWall(...)`, then inspect `past[past.length-1]` and assert `.rooms`, `.activeRoomId`, `.customElements`, `.customPaints`, `.recentPaints` all present via `expect(snap).toHaveProperty("customElements")` for each.

    3. `it("snapshot uses structuredClone", ...)` — `import { readFileSync } from "node:fs"; const src = readFileSync(new URL("../src/stores/cadStore.ts", import.meta.url), "utf8");` then extract the snapshot function body by regex between `function snapshot(state: CADState)` and the next top-level `function ` or `export`. Assert `expect(body).not.toContain("JSON.parse(JSON.stringify")` AND `expect(body).toContain("structuredClone(")`. NOTE: this case MUST fail RED in Wave 0.

    4. `it("drag produces single history entry", ...)` — reset store to initial, place a product (use any existing helper or `useCADStore.setState` to inject `rooms.room_main.placedProducts = { pp_test: {...} }` with a valid PlacedProduct shape), record `before = state.past.length`, call `useCADStore.getState().moveProduct("pp_test", { x: 5, y: 5 })` ONCE, assert `state.past.length - before === 1`.

    5. `it("wall drag produces single history entry", ...)` — same structure using `useCADStore.getState().addWall(...)` to create a wall, record `before = past.length after addWall`, then call `updateWall(wallId, { start: {x:1,y:1}, end: {x:6,y:1} })` ONCE, assert delta = 1.

    Keep each test self-contained (no shared fixtures). If resetting store state between tests requires `useCADStore.setState(initialState() as any, true)`, call that in `beforeEach`.

    Use `import.meta.env.DEV === true` check where needed. Use the `// eslint-disable-next-line @typescript-eslint/no-explicit-any` pattern already present in the codebase for narrow `as any` casts.

    Implements: D-07, D-08 (PERF-02 contract) and D-05 (PERF-01 history boundary contract).
  </behavior>
  <action>
    See `<behavior>` — implementation IS the test source. After writing, run `npm test -- tests/cadStore.test.ts -t "Phase 25 Wave 0"` and confirm RED (test 3 MUST fail pre-migration; tests 1, 2, 4, 5 may pass if current JSON.parse path happens to satisfy them — that is fine, they pin the contract for Waves 1 and 2).
  </action>
  <verify>
    <automated>npm test -- tests/cadStore.test.ts -t "Phase 25 Wave 0"</automated>
  </verify>
  <acceptance_criteria>
    - `tests/cadStore.test.ts` contains the literal string `"snapshot is independent"`
    - `tests/cadStore.test.ts` contains the literal string `"snapshot preserves all keys"`
    - `tests/cadStore.test.ts` contains the literal string `"snapshot uses structuredClone"`
    - `tests/cadStore.test.ts` contains the literal string `"drag produces single history entry"`
    - `tests/cadStore.test.ts` contains the literal string `"wall drag produces single history entry"`
    - `npm test -- tests/cadStore.test.ts -t "snapshot uses structuredClone"` exits NON-ZERO (RED) pre-migration — proves the guard actually guards something
    - `npm test -- tests/cadStore.test.ts -t "snapshot is independent"` exits 0 (contract holds under both JSON and structuredClone clone mechanisms)
    - `npm test` shows 168 + N_new_passing passing and 6 + N_new_failing failing where N_new_failing ≥ 1 (the structuredClone guard)
  </acceptance_criteria>
  <done>
    5 new `it(...)` cases landed in tests/cadStore.test.ts under a "Phase 25 Wave 0" describe block. Test 3 is RED pre-migration. Full suite regression: 168 pre-existing passing preserved.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add 2 fast-path canvas tests to tests/fabricSync.test.ts + 1 cleanup-revert test to tests/toolCleanup.test.ts</name>
  <files>tests/fabricSync.test.ts, tests/toolCleanup.test.ts</files>
  <read_first>
    - tests/fabricSync.test.ts (existing describe/it structure, how fabric.Canvas is instantiated in jsdom)
    - tests/toolCleanup.test.ts (existing listener-leak test pattern from Phase 24 — the tool-activation + cleanup lifecycle harness)
    - src/canvas/FabricCanvas.tsx (lines 166-204 for canvas init — `renderOnAddRemove` flag lives at line 169 area)
    - src/canvas/tools/selectTool.ts (lines 699-706 for cleanup-fn shape from Phase 24)
    - .planning/phases/25-canvas-store-performance/25-CONTEXT.md (D-02 renderOnAddRemove=false; D-06 interrupt revert)
    - .planning/phases/25-canvas-store-performance/25-VALIDATION.md (test names must match exactly)
  </read_first>
  <behavior>
    - Test "renderOnAddRemove disabled" (in fabricSync.test.ts) — mount FabricCanvas (or instantiate a `new fabric.Canvas(el)` and import whatever setter from FabricCanvas.tsx sets the flag); assert `fc.renderOnAddRemove === false`. In Wave 0 this is RED (default is true until Wave 2 lands D-02).
    - Test "fast path does not clear canvas during drag" (in fabricSync.test.ts) — install a spy on `fc.clear` and `fc.requestRenderAll`; simulate a product drag via direct tool-event dispatch (`fc.fire("mouse:down", ...); fc.fire("mouse:move", ...)*N; fc.fire("mouse:up", ...)`); assert `clearSpy.toHaveBeenCalledTimes(0)` during moves AND `requestRenderAllSpy` called ≥ N. RED in Wave 0.
    - Test "drag interrupted by tool switch" (in toolCleanup.test.ts) — activate select tool, simulate mouse:down + 2 mouse:move on a seeded product, then invoke the cleanup fn returned by `activateSelectTool` (simulates tool switch). Assert the Fabric object's `left/top/angle` equal the pre-drag values AND `useCADStore.getState().past.length` did NOT increment. RED in Wave 0.
  </behavior>
  <action>
    **Part A — tests/fabricSync.test.ts:**

    Append a new `describe("Phase 25 Wave 0 — canvas fast-path contract", () => { ... })` block with two `it(...)` cases:

    1. `it("renderOnAddRemove disabled", ...)` — instantiate a jsdom fabric canvas the same way existing tests in this file do (follow the pattern already present). If FabricCanvas.tsx is the only place the flag is set, render `<FabricCanvas />` via @testing-library/react (use patterns from existing *.test.tsx files if present) and read `fc.renderOnAddRemove` via exposed ref. If impractical to mount the React component in jsdom, alternative: assert source-level via `readFileSync(new URL("../src/canvas/FabricCanvas.tsx", import.meta.url), "utf8")` and `expect(src).toContain("renderOnAddRemove: false")`. Prefer source-level if the runtime path is brittle. Either approach satisfies the contract.

    2. `it("fast path does not clear canvas during drag", ...)` — construct a minimal `fabric.Canvas` in jsdom, install spies `const clearSpy = vi.spyOn(fc, "clear"); const renderSpy = vi.spyOn(fc, "requestRenderAll");`. Activate select tool via `activateSelectTool(fc, scale, origin)` with a seeded store state containing one placed product. Fire `fc.fire("mouse:down", { target: productGroup, e: { clientX: 100, clientY: 100 } })`, then `fc.fire("mouse:move", { e: { clientX: 150, clientY: 150 } })` three times, then `fc.fire("mouse:up", { e: { clientX: 150, clientY: 150 } })`. Assert `expect(clearSpy).not.toHaveBeenCalled()` AND `expect(renderSpy.mock.calls.length).toBeGreaterThanOrEqual(3)`. If Wave 0's selectTool implementation makes this impractical to simulate (currently calls moveProduct on every move → triggers redraw via React), fall back to source-level assertion: `expect(readFileSync("src/canvas/tools/selectTool.ts", "utf8")).toContain("fc.requestRenderAll()")` combined with a structural check that `moveProduct` is NOT called inside the mouse:move handler path — use a regex scan of the drag-move block.

    **Part B — tests/toolCleanup.test.ts:**

    Append a new `it("drag interrupted by tool switch", ...)` inside the existing describe block. Use the existing listener-leak harness as the template. Steps:
    1. Reset store to a known state with one placed product at (5,5).
    2. Create a fabric.Canvas. Call `const cleanup = activateSelectTool(fc, 50, {x:100, y:100})`.
    3. Locate the product Fabric object; cache its `left, top, angle` as `pre`.
    4. Fire mouse:down at product center, then mouse:move to a new pixel position (simulating dragging).
    5. Record `beforePast = useCADStore.getState().past.length`.
    6. Invoke `cleanup()` (simulates tool switch interrupt).
    7. Assert: `expect(fabricObj.left).toBe(pre.left)` AND `.top === pre.top` AND `.angle === pre.angle` AND `useCADStore.getState().past.length === beforePast` (no history push from the interrupted drag).

    Implements: D-02, D-06.
  </action>
  <verify>
    <automated>npm test -- tests/fabricSync.test.ts tests/toolCleanup.test.ts -t "Phase 25 Wave 0|drag interrupted by tool switch"</automated>
  </verify>
  <acceptance_criteria>
    - `tests/fabricSync.test.ts` contains the literal string `"renderOnAddRemove disabled"`
    - `tests/fabricSync.test.ts` contains the literal string `"fast path does not clear canvas during drag"`
    - `tests/toolCleanup.test.ts` contains the literal string `"drag interrupted by tool switch"`
    - `npm test -- tests/fabricSync.test.ts -t "renderOnAddRemove disabled"` exits NON-ZERO pre-migration (guards real behavior)
    - `npm test -- tests/toolCleanup.test.ts -t "drag interrupted by tool switch"` exits NON-ZERO pre-migration
    - `npm test` full suite: pre-existing 168 passing tests still pass (count may rise with passing new tests; never drops)
  </acceptance_criteria>
  <done>
    3 new `it(...)` cases exist in the named files with exact names from 25-VALIDATION.md. All three RED pre-migration; they will flip GREEN in Wave 2.
  </done>
</task>

<task type="auto">
  <name>Task 3: Install dev-only window.__cadSeed + window.__cadBench helpers in src/stores/cadStore.ts</name>
  <files>src/stores/cadStore.ts</files>
  <read_first>
    - src/stores/cadStore.ts (ENTIRE file — understand createCADStore + initialState + existing action names `addWall`, `placeProduct`/`addProduct` for seeding; understand CADState shape)
    - .planning/phases/25-canvas-store-performance/25-CONTEXT.md (D-09, D-11 lock the helper contract)
    - .planning/phases/25-canvas-store-performance/25-RESEARCH.md (§"Code Examples — window.__cadSeed / window.__cadBench dev helpers" — exact shape)
    - src/types/cad.ts (PlacedProduct / WallSegment / Point types — for seed data that matches the store's shape)
    - CLAUDE.md (D-07 "public-API bridge" exception — dev-helpers are NOT a new bridge, they're a dev-only surface gated at module scope)
  </read_first>
  <action>
    Append to the end of `src/stores/cadStore.ts`, AFTER the `export const useCADStore = create<CADState>()(...)` block, a dev-gated installation block:

    ```typescript
    // ─────────────────────────────────────────────────────────────────────
    // Dev-only perf helpers (D-09, D-11) — stripped from production builds
    // by Vite tree-shaking of the `import.meta.env.DEV` branch.
    // ─────────────────────────────────────────────────────────────────────
    if (import.meta.env.DEV) {
      // Seed the active room with N walls + M placed products for the canonical
      // 50/30 benchmark scene. Walls laid out along the top edge in a zig-zag.
      // Products arranged in a grid inside the room.
      (window as unknown as Record<string, unknown>).__cadSeed = (
        wallCount = 50,
        productCount = 30,
      ) => {
        const store = useCADStore.getState();
        const doc = store.rooms[store.activeRoomId!];
        if (!doc) return { walls: 0, products: 0, error: "no active room" };
        // Reset past/future so bench timings aren't distorted by old history
        useCADStore.setState({ past: [], future: [] } as Partial<CADState>);
        // Seed walls via direct mutation (dev-only; bypasses action history)
        useCADStore.setState(
          produce((s: CADState) => {
            const d = s.rooms[s.activeRoomId!];
            if (!d) return;
            for (let i = 0; i < wallCount; i++) {
              const id = `wall_seed_${i}`;
              const x = (i % 10) * 1.5;
              const y = Math.floor(i / 10) * 1.5;
              d.walls[id] = {
                id,
                start: { x, y },
                end: { x: x + 1, y },
                thickness: 0.5,
                height: d.room.wallHeight,
                openings: [],
              };
            }
            for (let i = 0; i < productCount; i++) {
              const id = `pp_seed_${i}`;
              const x = 2 + (i % 6) * 2;
              const y = 2 + Math.floor(i / 6) * 2;
              d.placedProducts[id] = {
                id,
                productId: "seed_product",
                position: { x, y },
                rotation: 0,
              } as unknown as PlacedProduct;
            }
          }) as (s: CADState) => void,
        );
        return { walls: wallCount, products: productCount };
      };

      // Run snapshot() N times on the current state, return mean + p95 in ms.
      (window as unknown as Record<string, unknown>).__cadBench = (
        iterations = 100,
      ) => {
        const state = useCADStore.getState();
        const samples: number[] = [];
        for (let i = 0; i < iterations; i++) {
          const t0 = performance.now();
          snapshot(state);
          samples.push(performance.now() - t0);
        }
        samples.sort((a, b) => a - b);
        const mean = samples.reduce((s, x) => s + x, 0) / samples.length;
        const p95 = samples[Math.floor(samples.length * 0.95)];
        // eslint-disable-next-line no-console
        console.log(
          `[__cadBench] n=${iterations} mean=${mean.toFixed(2)}ms p95=${p95.toFixed(2)}ms`,
        );
        return { mean, p95, samples };
      };
    }
    ```

    Import `produce` if not already imported at top; import `PlacedProduct` from `../types/cad`. The `snapshot` function is module-local — since this block lives in the same module, it has direct access (no export needed).

    Requirements:
    - Both helpers MUST live inside a single `if (import.meta.env.DEV) { ... }` block
    - Do NOT attach at prototype/global scope outside the guard
    - Do NOT export them (they are window-only)
    - Keep the seeded wall and product ID prefixes (`wall_seed_`, `pp_seed_`) distinct so they can be identified later if needed

    Implements: D-09 (snapshot timing surface), D-11 (canonical 50/30 seed).
  </action>
  <verify>
    <automated>npm test -- tests/cadStore.test.ts tests/cadStore.multiRoom.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/stores/cadStore.ts` contains the literal string `import.meta.env.DEV`
    - `src/stores/cadStore.ts` contains the literal string `__cadSeed`
    - `src/stores/cadStore.ts` contains the literal string `__cadBench`
    - Both `__cadSeed` and `__cadBench` assignments are inside a SINGLE `if (import.meta.env.DEV)` block (grep the file: exactly one `if (import.meta.env.DEV)` check surrounds both)
    - `npm run build` succeeds (Vite build) — dev-only branch tree-shaken
    - After `npm run build`, `grep -r "__cadBench" dist/` returns zero matches (dev-only helpers stripped from prod bundle)
    - `npm test` full suite: 168 pre-existing passing preserved (new helpers don't break anything)
  </acceptance_criteria>
  <done>
    `window.__cadSeed(50, 30)` seeds the active room; `window.__cadBench(100)` runs snapshot 100 times, logs mean + p95, returns samples. Both only exist in dev builds. `npm run build && grep -r "__cadBench" dist/` returns empty.
  </done>
</task>

</tasks>

<verification>
Run the quick suite: `npm test -- tests/cadStore.test.ts tests/toolCleanup.test.ts tests/fabricSync.test.ts`. Expected:
- Tests with literal names `"snapshot is independent"`, `"snapshot preserves all keys"`, `"drag produces single history entry"`, `"wall drag produces single history entry"` pass (they pin behavior that holds under both JSON.parse and structuredClone)
- Tests `"snapshot uses structuredClone"`, `"renderOnAddRemove disabled"`, `"fast path does not clear canvas during drag"`, `"drag interrupted by tool switch"` FAIL RED (they are the Wave 1 + Wave 2 contract and MUST be red until those waves land)
- Full suite: 168 pre-existing passing still pass; new red count ≥ 4, new green count ≥ 3

Run `npm run build && grep -r "__cadBench\|__cadSeed" dist/` → zero matches (dev-only tree-shaking works).
</verification>

<success_criteria>
- [ ] 5 new `it(...)` cases in tests/cadStore.test.ts with the exact names from 25-VALIDATION.md Wave 0 Requirements
- [ ] 2 new `it(...)` cases in tests/fabricSync.test.ts with the exact names from 25-VALIDATION.md
- [ ] 1 new `it(...)` case in tests/toolCleanup.test.ts with the exact name `"drag interrupted by tool switch"`
- [ ] `window.__cadSeed` and `window.__cadBench` installed in src/stores/cadStore.ts, gated by `import.meta.env.DEV`
- [ ] `npm run build` succeeds; prod bundle does NOT contain `__cadBench` or `__cadSeed`
- [ ] Full test suite: 168 pre-existing passing unchanged; at least 4 NEW RED tests (they flip GREEN in Waves 1+2)
</success_criteria>

<output>
After completion, create `.planning/phases/25-canvas-store-performance/25-00-SUMMARY.md` documenting:
- Exact test names added and which file they live in
- Red/green count delta against the 168/6/3 baseline
- Bundle size delta (dev vs prod) if worth noting
- Decisions confirmed: D-09, D-11 (dev helpers), D-05, D-07, D-08 (contract-pinning tests)
</output>
