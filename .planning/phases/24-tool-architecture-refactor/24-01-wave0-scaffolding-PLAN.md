---
phase: 24-tool-architecture-refactor
plan: 01
type: execute
wave: 0
depends_on: []
files_modified:
  - src/canvas/tools/toolUtils.ts
  - tests/toolCleanup.test.ts
  - .planning/phases/24-tool-architecture-refactor/24-VALIDATION.md
autonomous: true
requirements:
  - TOOL-03
must_haves:
  truths:
    - "A new module src/canvas/tools/toolUtils.ts exists and exports pxToFeet + findClosestWall"
    - "A new test file tests/toolCleanup.test.ts exists and asserts activate() → cleanup() returns listener count to baseline for each of the 6 tools"
    - "VALIDATION.md contains the exact names of the 6 pre-existing failing tests captured from npm test on main"
    - "npm test still passes with identical failure set as baseline (no consumer code changed yet)"
    - "npx tsc --noEmit exits 0"
  artifacts:
    - path: src/canvas/tools/toolUtils.ts
      provides: "Shared pxToFeet + findClosestWall helpers for all 6 tools"
      exports: ["pxToFeet", "findClosestWall", "WALL_SNAP_THRESHOLD_FT"]
    - path: tests/toolCleanup.test.ts
      provides: "Automated leak-regression guard for activate/cleanup cycles (D-14)"
      min_lines: 50
    - path: .planning/phases/24-tool-architecture-refactor/24-VALIDATION.md
      provides: "Baseline failure list captured before any refactor commits"
      contains: "Pre-Existing Failure Baseline"
  key_links:
    - from: tests/toolCleanup.test.ts
      to: "(future) src/canvas/tools/*Tool.ts activate() return values"
      via: "calls activateXTool then invokes returned cleanup fn; inspects fc.__eventListeners"
      pattern: "activateXTool\\(fc"
---

<objective>
Wave 0 scaffolding for the tool refactor. Creates the shared utility module and the listener-leak regression test up front, and captures the pre-existing test-failure baseline into VALIDATION.md — all BEFORE any consumer code changes. This lets later waves verify their own changes against a known-good reference.

Purpose: Eliminate the scavenger hunt. When Waves 1–3 run, executors don't discover `toolUtils.ts` — it's already there with the exact signatures they'll import. The leak test is already there to be run after each consumer-facing change. The baseline failure list is frozen so "regressions" vs. "baseline" is unambiguous.

Output:
1. `src/canvas/tools/toolUtils.ts` (new file — shared helpers, zero consumers yet)
2. `tests/toolCleanup.test.ts` (new file — 6 test cases skipped/pending until Wave 2 lands)
3. `VALIDATION.md` updated with the exact 6 pre-existing failing test names
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/24-tool-architecture-refactor/24-CONTEXT.md
@.planning/phases/24-tool-architecture-refactor/24-RESEARCH.md
@.planning/phases/24-tool-architecture-refactor/24-VALIDATION.md
@src/lib/geometry.ts
@src/stores/cadStore.ts
@src/types/cad.ts
@src/canvas/tools/doorTool.ts
@src/canvas/tools/windowTool.ts

<interfaces>
<!-- Key types and helpers toolUtils.ts depends on. Extracted from working tree. -->

From src/lib/geometry.ts:
```typescript
export function distance(a: Point, b: Point): number;
export function wallLength(wall: WallSegment): number;
export function closestPointOnWall(wall: WallSegment, p: Point): { point: Point; t: number };
```

From src/stores/cadStore.ts:
```typescript
export function getActiveRoomDoc(): RoomDoc | null; // reads active room including walls keyed by id
```

From src/types/cad.ts:
```typescript
export interface Point { x: number; y: number; }
export interface WallSegment {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
  // ...
}
```

Reference implementations to mirror (all byte-identical per RESEARCH.md §4):
- src/canvas/tools/doorTool.ts:12 — pxToFeet body
- src/canvas/tools/doorTool.ts:23 — findClosestWall body (uses DOOR_WIDTH=3)
- src/canvas/tools/windowTool.ts:23 — findClosestWall body (uses WINDOW_WIDTH=3)
Both findClosestWall copies use SNAP_THRESHOLD=0.5 (doorTool.ts:7, windowTool.ts:7).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Capture pre-existing test-failure baseline into VALIDATION.md</name>
  <files>.planning/phases/24-tool-architecture-refactor/24-VALIDATION.md</files>
  <read_first>
    - .planning/phases/24-tool-architecture-refactor/24-VALIDATION.md (current file — has placeholder checkbox for baseline capture at line 32)
    - .planning/phases/24-tool-architecture-refactor/24-RESEARCH.md §8 "Test coverage mapping" (confirms 171 tests, 6 pre-existing failures, none in tool code)
  </read_first>
  <behavior>
    - Running `npm test 2>&1 | tail -120` produces output containing failing test names
    - After this task, VALIDATION.md lists the 6 failing tests by full name under "Pre-Existing Failure Baseline"
    - VALIDATION.md checkbox on line 32 flips from `[ ]` to `[x]`
  </behavior>
  <action>
    Step 1. Run the baseline:
    ```
    npm test 2>&1 | tee /tmp/phase24-baseline.txt
    ```

    Step 2. Extract failing test full names. Vitest prints failures as lines starting with `FAIL` or `×`. Grep them:
    ```
    grep -E "^\s*(FAIL|×|✗)\s" /tmp/phase24-baseline.txt
    ```
    Also look for the final summary line "Tests  N failed | M passed" to confirm count matches research (6 failed, 165 passed).

    Step 3. Edit `.planning/phases/24-tool-architecture-refactor/24-VALIDATION.md`. Replace the placeholder checkbox section (lines 29–34) with the recorded baseline. Target shape:

    ```markdown
    ### Pre-Existing Failure Baseline

    Phase 24 must NOT introduce any new test failures. The 6 pre-existing failures below are treated as baseline and must remain the SAME tests failing at phase verification.

    Captured 2026-04-17 from `npm test` on branch `claude/friendly-merkle-8005fb` before any refactor commits:

    1. `tests/<file>.test.ts > <describe> > <it>`
    2. `tests/<file>.test.ts > <describe> > <it>`
    3. ... (all 6)

    Summary line observed: `Tests  6 failed | 165 passed (171)` (or actual)

    - [x] Wave 0 task: baseline recorded
    - [x] Pre-existing failures DO NOT include any test file that imports from `src/canvas/tools/` (confirmed via grep: `grep -l "canvas/tools" tests/*.ts` returns zero)
    ```

    Step 4. If the actual count differs from 6, record the real count. Research allowed for variance ("If fewer than 6 fail, that's still pass. If a new one appears, the refactor regressed something." — RESEARCH.md §9 Q4). Note the exact number as the baseline.

    Step 5. Do NOT fix any of the baseline failures. This phase is a pure refactor — fixing unrelated tests is out of scope (D-10/D-11 scope-control rationale).
  </action>
  <verify>
    <automated>grep -q "Captured 2026" .planning/phases/24-tool-architecture-refactor/24-VALIDATION.md && grep -c "^[0-9]\." .planning/phases/24-tool-architecture-refactor/24-VALIDATION.md | awk '$1>=1'</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "Pre-Existing Failure Baseline" .planning/phases/24-tool-architecture-refactor/24-VALIDATION.md` exits 0
    - `grep -c "Captured" .planning/phases/24-tool-architecture-refactor/24-VALIDATION.md` returns ≥ 1
    - `grep "\- \[x\] Wave 0 task: baseline recorded" .planning/phases/24-tool-architecture-refactor/24-VALIDATION.md` exits 0
    - The recorded baseline count matches the actual `npm test` summary line (verified by reading VALIDATION.md and comparing to re-running `npm test`)
  </acceptance_criteria>
  <done>VALIDATION.md contains full names of all pre-existing failing tests, the capture date, and confirmation that none live under src/canvas/tools/. Later waves can cite this list to disambiguate regressions.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create src/canvas/tools/toolUtils.ts with pxToFeet + findClosestWall</name>
  <files>src/canvas/tools/toolUtils.ts</files>
  <read_first>
    - src/canvas/tools/doorTool.ts (lines 1–45 — canonical pxToFeet + findClosestWall with DOOR_WIDTH minWallLength guard)
    - src/canvas/tools/windowTool.ts (lines 1–45 — identical findClosestWall with WINDOW_WIDTH guard)
    - src/lib/geometry.ts (verify exports: distance, wallLength, closestPointOnWall)
    - src/stores/cadStore.ts (verify getActiveRoomDoc signature)
    - src/types/cad.ts (verify Point, WallSegment types)
    - .planning/phases/24-tool-architecture-refactor/24-RESEARCH.md §4 + §5 + §6 (canonical body + signature decision)
  </read_first>
  <behavior>
    - New file compiles with `npx tsc --noEmit` (no type errors)
    - Exports `pxToFeet(px, origin, scale)` — byte-equivalent to the 6 local copies in tool files
    - Exports `findClosestWall(feetPos, minWallLength)` — REQUIRED second parameter (not optional), per Pitfall #6 in RESEARCH.md
    - Exports `WALL_SNAP_THRESHOLD_FT = 0.5` as named constant (replaces the inline SNAP_THRESHOLD=0.5 literals)
    - Zero consumers yet — no tool file is touched in this task
  </behavior>
  <action>
    Create `src/canvas/tools/toolUtils.ts` with exactly this content (per D-08, D-09, and RESEARCH.md §6 "Final toolUtils.ts surface"):

    ```typescript
    import { getActiveRoomDoc } from "@/stores/cadStore";
    import { closestPointOnWall, distance, wallLength } from "@/lib/geometry";
    import type { Point, WallSegment } from "@/types/cad";

    /** Default snap threshold (in feet) for wall hit-testing by door/window tools. */
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

    /**
     * Find the closest wall to a feet-space position within WALL_SNAP_THRESHOLD_FT.
     * Skips walls shorter than minWallLength so the caller's element (door/window)
     * can fit. Pass DOOR_WIDTH or WINDOW_WIDTH at the call site — required to
     * surface size-contract mismatches at compile time (Pitfall #6).
     */
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

    DO NOT touch any existing tool file in this task. Waves 1 and 2 will migrate consumers. This task's only job is to create the module and confirm it compiles.

    Verify walls access pattern: RESEARCH.md §6 says `getActiveRoomDoc()?.walls ?? {}` returns `Record<string, WallSegment>`. Confirm by reading `getActiveRoomDoc` in cadStore.ts. If the actual type is `WallSegment[]` (array), adjust to iterate accordingly — but existing doorTool.ts:28 iterates via `Object.values()`, which implies the record shape. Match whatever the existing code does.
  </action>
  <verify>
    <automated>test -f src/canvas/tools/toolUtils.ts && grep -q "export function pxToFeet" src/canvas/tools/toolUtils.ts && grep -q "export function findClosestWall" src/canvas/tools/toolUtils.ts && grep -q "export const WALL_SNAP_THRESHOLD_FT" src/canvas/tools/toolUtils.ts && npx tsc --noEmit 2>&1 | grep -E "toolUtils\.ts.*error" || echo OK</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/canvas/tools/toolUtils.ts` exits 0
    - `grep -q "^export function pxToFeet" src/canvas/tools/toolUtils.ts` exits 0
    - `grep -q "^export function findClosestWall" src/canvas/tools/toolUtils.ts` exits 0
    - `grep -q "^export const WALL_SNAP_THRESHOLD_FT" src/canvas/tools/toolUtils.ts` exits 0
    - `grep -q "minWallLength: number" src/canvas/tools/toolUtils.ts` exits 0 (REQUIRED parameter per Pitfall #6)
    - `! grep -E "minWallLength\?:|minWallLength:\s*number\s*=" src/canvas/tools/toolUtils.ts` (parameter must NOT be optional or defaulted)
    - `npx tsc --noEmit` exits 0
    - `npm test` passes with same failure set as baseline (no consumer changes yet — toolUtils is unused)
    - Zero existing tool files modified: `git diff --name-only src/canvas/tools/ | grep -v toolUtils.ts` returns empty
  </acceptance_criteria>
  <done>toolUtils.ts exists, exports pxToFeet + findClosestWall + WALL_SNAP_THRESHOLD_FT with correct signatures, type-checks clean, test baseline unchanged. Ready for Wave 1 to wire up consumers.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Create tests/toolCleanup.test.ts (6 cases, pending until Wave 2)</name>
  <files>tests/toolCleanup.test.ts</files>
  <read_first>
    - tests/fabricSync.test.ts (reference style: how existing tests construct a fabric.Canvas in happy-dom)
    - tests/setup.ts (test environment setup)
    - src/canvas/tools/doorTool.ts (current signature: `activateDoorTool(fc, scale, origin): void` — will become `() => void` in Wave 2)
    - src/canvas/tools/productTool.ts (same current signature pattern)
    - node_modules/fabric/dist/src/Observable.d.ts (confirm `__eventListeners` runtime field per RESEARCH.md §7 Approach B)
    - .planning/phases/24-tool-architecture-refactor/24-RESEARCH.md §7 "Event listener leak test approach" (Approach C sample code)
  </read_first>
  <behavior>
    - File `tests/toolCleanup.test.ts` exists with 6 describe/test blocks — one per tool (door, window, product, ceiling, wall, select)
    - Each test is marked `.skip` (or wrapped in `describe.skip`) in Wave 0 because the tools don't yet return a cleanup fn — Wave 2 will flip them to `.only` / active
    - Tests import from each tool module directly: `import { activateDoorTool } from "@/canvas/tools/doorTool"` etc.
    - Test structure per tool:
      1. Create fabric.Canvas on a happy-dom HTMLCanvasElement
      2. Record initial listener count: `sum(Object.values(fc.__eventListeners ?? {}).map(a => a.length))`
      3. Call `activateXTool(fc, 10, {x:0, y:0})` — capture returned cleanup fn (Wave 2) OR just call (Wave 0 skipped)
      4. Assert listener count increased
      5. Call cleanup fn
      6. Assert listener count returned to initial value
      7. Repeat activate/cleanup 10 times — count must stay stable
    - All 6 test cases use identical scaffold (DRY via a shared `expectLeakFree(activateFn, toolName)` helper defined at top of file)
  </behavior>
  <action>
    Create `tests/toolCleanup.test.ts` with the following content. The helper is defined once, then invoked 6 times — one per tool. Tests are `describe.skip(...)` initially since cleanup return-fn signature doesn't exist until Wave 2.

    ```typescript
    import { describe, test, expect, afterEach } from "vitest";
    import * as fabric from "fabric";

    // Tool activators (imports resolve today; signatures change to `() => void` return in Wave 2)
    import { activateDoorTool } from "@/canvas/tools/doorTool";
    import { activateWindowTool } from "@/canvas/tools/windowTool";
    import { activateProductTool } from "@/canvas/tools/productTool";
    import { activateCeilingTool } from "@/canvas/tools/ceilingTool";
    import { activateWallTool } from "@/canvas/tools/wallTool";
    import { activateSelectTool } from "@/canvas/tools/selectTool";

    type Activator = (
      fc: fabric.Canvas,
      scale: number,
      origin: { x: number; y: number },
    ) => (() => void) | void; // void today, () => void after Wave 2

    function countListeners(fc: fabric.Canvas): number {
      const map = (fc as unknown as { __eventListeners?: Record<string, unknown[]> }).__eventListeners ?? {};
      return Object.values(map).reduce((n, arr) => n + (arr?.length ?? 0), 0);
    }

    function makeCanvas(): fabric.Canvas {
      const el = document.createElement("canvas");
      el.width = 800;
      el.height = 600;
      return new fabric.Canvas(el);
    }

    function expectLeakFree(activate: Activator, cycles = 10) {
      const fc = makeCanvas();
      const baseline = countListeners(fc);

      const cleanup = activate(fc, 10, { x: 0, y: 0 });
      if (typeof cleanup !== "function") {
        throw new Error("activate did not return a cleanup fn — Wave 2 refactor incomplete");
      }
      expect(countListeners(fc)).toBeGreaterThan(baseline);
      cleanup();
      expect(countListeners(fc)).toBe(baseline);

      // Stability over repeated activations
      for (let i = 0; i < cycles; i++) {
        const c = activate(fc, 10, { x: 0, y: 0 });
        if (typeof c !== "function") throw new Error("activate must return cleanup fn");
        c();
      }
      expect(countListeners(fc)).toBe(baseline);

      fc.dispose();
    }

    // Skipped in Wave 0 because tools don't yet return cleanup fn. Wave 2 flips to describe(...)
    describe.skip("tool cleanup — no listener leaks (Wave 2 enables)", () => {
      test("doorTool activate/cleanup cycle stays leak-free", () => {
        expectLeakFree(activateDoorTool as Activator);
      });
      test("windowTool activate/cleanup cycle stays leak-free", () => {
        expectLeakFree(activateWindowTool as Activator);
      });
      test("productTool activate/cleanup cycle stays leak-free", () => {
        expectLeakFree(activateProductTool as Activator);
      });
      test("ceilingTool activate/cleanup cycle stays leak-free", () => {
        expectLeakFree(activateCeilingTool as Activator);
      });
      test("wallTool activate/cleanup cycle stays leak-free", () => {
        expectLeakFree(activateWallTool as Activator);
      });
      test("selectTool activate/cleanup cycle stays leak-free", () => {
        expectLeakFree(activateSelectTool as Activator);
      });
    });
    ```

    Rationale for `describe.skip`:
    - Wave 0 creates the test file scaffolding without breaking the build. The tests would fail today because `activate*Tool` returns `void`, not a function.
    - Wave 2 (tool refactor) includes a sub-task that replaces `describe.skip(` with `describe(` once all 6 tools return `() => void`.
    - This lets us land Wave 0 without waiting for Wave 2 and without introducing red tests.

    Do NOT add the file to any CI exclude — vitest automatically runs `tests/**/*.test.ts`. `describe.skip` is the correct pattern.

    If `fabric.Canvas` construction throws in happy-dom due to missing `getContext` or similar, wrap creation in a try/catch and skip the whole file (`describe.skip(...)` already handles this). Check `tests/fabricSync.test.ts` for the known-good canvas-construction pattern and mirror it.
  </action>
  <verify>
    <automated>test -f tests/toolCleanup.test.ts && grep -q "describe.skip" tests/toolCleanup.test.ts && grep -c "test(\"" tests/toolCleanup.test.ts | awk '$1>=6' && npm test -- toolCleanup 2>&1 | grep -E "(skipped|6 skipped|OK)"</automated>
  </verify>
  <acceptance_criteria>
    - `test -f tests/toolCleanup.test.ts` exits 0
    - `grep -c "test(\"" tests/toolCleanup.test.ts` returns ≥ 6 (one per tool: door, window, product, ceiling, wall, select)
    - `grep -q "describe.skip" tests/toolCleanup.test.ts` exits 0 (skipped in Wave 0)
    - `grep -q "activateDoorTool" tests/toolCleanup.test.ts` and similar for all 5 other activators
    - `grep -q "__eventListeners" tests/toolCleanup.test.ts` exits 0 (uses Fabric v6 runtime inspection)
    - `grep -q "function expectLeakFree" tests/toolCleanup.test.ts` exits 0 (shared helper, DRY)
    - `npm test` passes with same failure set as baseline (6 new tests are skipped, do not run)
    - `npx tsc --noEmit` exits 0 (file type-checks even with activators returning `void` today — the `as Activator` cast handles the current vs. future signature)
  </acceptance_criteria>
  <done>Listener-leak regression test scaffold exists with 6 skipped cases. Wave 2 will un-skip it. Full test suite baseline is preserved.</done>
</task>

</tasks>

<verification>
After all 3 tasks:
1. `test -f src/canvas/tools/toolUtils.ts && test -f tests/toolCleanup.test.ts` both exit 0
2. `npx tsc --noEmit` exits 0
3. `npm test` — same pass/fail count as the baseline recorded in Task 1
4. `git diff --name-only` shows exactly these files changed: `.planning/phases/24-tool-architecture-refactor/24-VALIDATION.md`, `src/canvas/tools/toolUtils.ts`, `tests/toolCleanup.test.ts`. No tool file touched.
</verification>

<success_criteria>
Wave 0 complete when:
- [ ] Pre-existing test-failure baseline captured in VALIDATION.md by full test name
- [ ] `src/canvas/tools/toolUtils.ts` exists with `pxToFeet`, `findClosestWall(feetPos, minWallLength)` (required param), `WALL_SNAP_THRESHOLD_FT` exports, type-checks clean
- [ ] `tests/toolCleanup.test.ts` exists with 6 `describe.skip` cases referencing all 6 tools, uses shared `expectLeakFree` helper, uses `fc.__eventListeners` runtime inspection
- [ ] `npm test` baseline unchanged (toolUtils has zero consumers, toolCleanup is skipped)
- [ ] `npx tsc --noEmit` exits 0
- [ ] Zero src/canvas/tools/*Tool.ts files modified in Wave 0
- [ ] VALIDATION.md `nyquist_compliant: false` unchanged (stays false until full phase verification)
</success_criteria>

<output>
After completion, create `.planning/phases/24-tool-architecture-refactor/24-01-SUMMARY.md` describing:
- Files created (toolUtils.ts, toolCleanup.test.ts)
- VALIDATION.md baseline capture result (exact test count that failed, exact test names)
- Confirmation that `npm test` baseline is stable
- Handoff note for Wave 1: "toolUtils.ts exports pxToFeet(px, origin, scale) and findClosestWall(feetPos, minWallLength). Import from './toolUtils'. Do not add optional params."
</output>
