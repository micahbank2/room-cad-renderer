---
phase: 24-tool-architecture-refactor
plan: 02
type: execute
wave: 1
depends_on: [24-01]
files_modified:
  - src/canvas/tools/doorTool.ts
  - src/canvas/tools/windowTool.ts
  - src/canvas/tools/productTool.ts
  - src/canvas/tools/ceilingTool.ts
  - src/canvas/tools/wallTool.ts
  - src/canvas/tools/selectTool.ts
autonomous: true
requirements:
  - TOOL-03
must_haves:
  truths:
    - "All 6 tool files import pxToFeet from './toolUtils' — zero local copies of pxToFeet remain"
    - "doorTool and windowTool import findClosestWall from './toolUtils' — local copies removed"
    - "doorTool and windowTool pass their respective width constant (DOOR_WIDTH=3, WINDOW_WIDTH=3) as the required minWallLength parameter"
    - "npm test passes with same failure set as baseline from Wave 0"
    - "npx tsc --noEmit exits 0"
    - "No behavioral change — door/window snap to walls identically pre- and post-consolidation"
  artifacts:
    - path: src/canvas/tools/doorTool.ts
      provides: "Door placement tool consuming shared pxToFeet + findClosestWall"
      contains: 'from "./toolUtils"'
    - path: src/canvas/tools/windowTool.ts
      provides: "Window placement tool consuming shared pxToFeet + findClosestWall"
      contains: 'from "./toolUtils"'
    - path: src/canvas/tools/productTool.ts
      provides: "Product placement tool consuming shared pxToFeet"
      contains: 'from "./toolUtils"'
    - path: src/canvas/tools/ceilingTool.ts
      provides: "Ceiling polygon tool consuming shared pxToFeet"
      contains: 'from "./toolUtils"'
    - path: src/canvas/tools/wallTool.ts
      provides: "Wall drawing tool consuming shared pxToFeet"
      contains: 'from "./toolUtils"'
    - path: src/canvas/tools/selectTool.ts
      provides: "Select tool consuming shared pxToFeet"
      contains: 'from "./toolUtils"'
  key_links:
    - from: src/canvas/tools/doorTool.ts
      to: src/canvas/tools/toolUtils.ts
      via: 'import { pxToFeet, findClosestWall } from "./toolUtils"'
      pattern: 'from "./toolUtils"'
    - from: src/canvas/tools/windowTool.ts
      to: src/canvas/tools/toolUtils.ts
      via: 'import { pxToFeet, findClosestWall } from "./toolUtils"'
      pattern: 'from "./toolUtils"'
---

<objective>
Wave 1 DRY consolidation. Replace the 6 byte-identical `pxToFeet` copies and 2 near-identical `findClosestWall` copies with imports from `./toolUtils` (created in Wave 0). Leaves the cleanup-pattern and closure-state work for Wave 2 — this plan is purely about deleting duplicated helpers.

Purpose: Isolates TOOL-03 (shared utilities) from TOOL-01/TOOL-02 (cleanup + closure), producing a clean, grep-verifiable commit before the structurally larger Wave 2 refactor. If Wave 2 regresses, Wave 1 stays landed.

Output: 6 tool files each importing from `./toolUtils`, zero local duplicates, full test baseline preserved.
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
@.planning/phases/24-tool-architecture-refactor/24-01-SUMMARY.md
@src/canvas/tools/toolUtils.ts

<interfaces>
<!-- From src/canvas/tools/toolUtils.ts (created in Wave 0): -->
```typescript
export const WALL_SNAP_THRESHOLD_FT: number; // 0.5
export function pxToFeet(
  px: { x: number; y: number },
  origin: { x: number; y: number },
  scale: number,
): Point;
export function findClosestWall(
  feetPos: Point,
  minWallLength: number, // REQUIRED — pass DOOR_WIDTH / WINDOW_WIDTH
): { wall: WallSegment; offset: number } | null;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Consolidate helpers in 4 simple tools (doorTool, windowTool, productTool, ceilingTool)</name>
  <files>src/canvas/tools/doorTool.ts, src/canvas/tools/windowTool.ts, src/canvas/tools/productTool.ts, src/canvas/tools/ceilingTool.ts</files>
  <read_first>
    - src/canvas/tools/toolUtils.ts (verify exported signatures)
    - src/canvas/tools/doorTool.ts (local pxToFeet around line 12, findClosestWall around line 23, DOOR_WIDTH=3, SNAP_THRESHOLD=0.5)
    - src/canvas/tools/windowTool.ts (mirror: local pxToFeet ~12, findClosestWall ~23, WINDOW_WIDTH=3, SNAP_THRESHOLD=0.5)
    - src/canvas/tools/productTool.ts (local pxToFeet ~18, no findClosestWall)
    - src/canvas/tools/ceilingTool.ts (local pxToFeet ~21, no findClosestWall)
    - .planning/phases/24-tool-architecture-refactor/24-RESEARCH.md §4 (canonical pxToFeet body) + §5 (findClosestWall minWallLength rationale)
  </read_first>
  <behavior>
    - doorTool.ts: local pxToFeet deleted; local findClosestWall deleted; import added; all findClosestWall(feet) call sites updated to findClosestWall(feet, DOOR_WIDTH)
    - windowTool.ts: same pattern with WINDOW_WIDTH
    - productTool.ts: local pxToFeet deleted; import added. No findClosestWall.
    - ceilingTool.ts: local pxToFeet deleted; import added.
    - DOOR_WIDTH / WINDOW_WIDTH constants kept at module scope (per-tool element sizes, not shared)
    - Local SNAP_THRESHOLD=0.5 constants removed from doorTool/windowTool IF no other caller remains (grep first)
    - Zero behavior change — snap distance (0.5 ft) and min-wall-length (3 ft) preserved
  </behavior>
  <action>
    For each of the 4 files, perform the following transformation.

    **doorTool.ts**:

    1. Read current file. Locate:
       - `const SNAP_THRESHOLD = 0.5;` and `const DOOR_WIDTH = 3;` near top
       - `function pxToFeet(...)` around line 12
       - `function findClosestWall(feetPos) { ... }` around line 23 (uses DOOR_WIDTH in the `if (len < DOOR_WIDTH) continue` filter)
       - Call sites of `findClosestWall(feet)` inside mouse handlers

    2. Add import at top of file, after existing imports:
       ```typescript
       import { pxToFeet, findClosestWall } from "./toolUtils";
       ```

    3. Delete the local `function pxToFeet(...) { ... }` block (entire function definition and body)

    4. Delete the local `function findClosestWall(...) { ... }` block

    5. Delete the local `const SNAP_THRESHOLD = 0.5;` ONLY if grep confirms zero remaining references inside doorTool.ts:
       ```
       grep -n "SNAP_THRESHOLD" src/canvas/tools/doorTool.ts
       ```
       If only the const definition line remains, delete it. If other call sites remain (e.g., comparisons in updatePreview), leave the const in place.

    6. KEEP `const DOOR_WIDTH = 3;` — still used as the minWallLength argument.

    7. Update every `findClosestWall(feet)` call site to `findClosestWall(feet, DOOR_WIDTH)`. Search via:
       ```
       grep -n "findClosestWall(" src/canvas/tools/doorTool.ts
       ```
       Each one becomes a 2-arg call.

    8. Run `npx tsc --noEmit` — must exit 0.

    **windowTool.ts**: Identical pattern. Replace `DOOR_WIDTH` with `WINDOW_WIDTH`:
       - Add `import { pxToFeet, findClosestWall } from "./toolUtils";`
       - Delete local `pxToFeet` + local `findClosestWall`
       - Update call sites to `findClosestWall(feet, WINDOW_WIDTH)`
       - Optionally delete local `SNAP_THRESHOLD` if unreferenced

    **productTool.ts** (simpler — no findClosestWall):
       - Add `import { pxToFeet } from "./toolUtils";`
       - Delete local `function pxToFeet(...) { ... }` at line ~18

    **ceilingTool.ts** (same — no findClosestWall):
       - Add `import { pxToFeet } from "./toolUtils";`
       - Delete local `function pxToFeet(...) { ... }` at line ~21

    After all 4 files, run `npm test` and confirm same failure set as baseline recorded in Wave 0.

    **Scope discipline:** Do NOT change function signatures, return types, mutable state, or event-handler shape in this task. Do NOT touch `(fc as any)` casts — that's Wave 2. This task is purely delete-duplicate + add-import.
  </action>
  <verify>
    <automated>! grep -E "^function pxToFeet" src/canvas/tools/doorTool.ts src/canvas/tools/windowTool.ts src/canvas/tools/productTool.ts src/canvas/tools/ceilingTool.ts; ! grep -E "^function findClosestWall" src/canvas/tools/doorTool.ts src/canvas/tools/windowTool.ts; for f in src/canvas/tools/doorTool.ts src/canvas/tools/windowTool.ts src/canvas/tools/productTool.ts src/canvas/tools/ceilingTool.ts; do grep -q 'from "./toolUtils"' "$f" || exit 1; done; npx tsc --noEmit && npm test</automated>
  </verify>
  <acceptance_criteria>
    - `! grep -E "^function pxToFeet" src/canvas/tools/doorTool.ts` (no local pxToFeet)
    - `! grep -E "^function pxToFeet" src/canvas/tools/windowTool.ts`
    - `! grep -E "^function pxToFeet" src/canvas/tools/productTool.ts`
    - `! grep -E "^function pxToFeet" src/canvas/tools/ceilingTool.ts`
    - `! grep -E "^function findClosestWall" src/canvas/tools/doorTool.ts`
    - `! grep -E "^function findClosestWall" src/canvas/tools/windowTool.ts`
    - `grep -q 'from "./toolUtils"' src/canvas/tools/doorTool.ts` (and for windowTool, productTool, ceilingTool)
    - `grep -q "findClosestWall(.*,\\s*DOOR_WIDTH)" src/canvas/tools/doorTool.ts` (call sites updated)
    - `grep -q "findClosestWall(.*,\\s*WINDOW_WIDTH)" src/canvas/tools/windowTool.ts`
    - `npx tsc --noEmit` exits 0
    - `npm test` baseline matches Wave 0 capture (same 6 failures, same 165 passed)
  </acceptance_criteria>
  <done>The 4 simple tools now consume toolUtils. Duplicated pxToFeet deleted from these files. DOOR_WIDTH/WINDOW_WIDTH pass through at call sites. Full test suite unchanged from baseline.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Consolidate pxToFeet in wallTool.ts and selectTool.ts</name>
  <files>src/canvas/tools/wallTool.ts, src/canvas/tools/selectTool.ts</files>
  <read_first>
    - src/canvas/tools/wallTool.ts (current — local pxToFeet at ~line 48, also contains findNearestEndpoint at ~line 28 which stays)
    - src/canvas/tools/selectTool.ts (current — local pxToFeet at ~line 77, 750+ lines total)
    - src/canvas/tools/toolUtils.ts (confirm pxToFeet signature)
    - .planning/phases/24-tool-architecture-refactor/24-RESEARCH.md §4 table (wallTool pxToFeet line 48, selectTool line 77)
  </read_first>
  <behavior>
    - wallTool.ts: local pxToFeet deleted; import added; findNearestEndpoint stays (only wallTool uses it per D-08 + RESEARCH.md §6)
    - selectTool.ts: local pxToFeet deleted; import added
    - No other transformations — cleanup pattern, state object, and (fc as any) casts remain untouched for Wave 2
    - findClosestWall is not present in either of these files
  </behavior>
  <action>
    **wallTool.ts**:

    1. Read current file. Confirm local `function pxToFeet(...)` exists around line 48.
    2. Add `import { pxToFeet } from "./toolUtils";` at top of file after existing imports.
    3. Delete the local `function pxToFeet(...) { ... }` block in its entirety.
    4. Confirm `function findNearestEndpoint(cursor, excludeStart)` at line ~28 REMAINS — it's wallTool-specific per D-08 and RESEARCH.md §6 Open Question 2.
    5. Do NOT touch the module-level `state` object, the `cleanup(fc)` helper at line ~235, or the `(fc as any).__wallToolCleanup` cast at line 227. Wave 2 handles those.
    6. Run `npx tsc --noEmit` — must exit 0.

    **selectTool.ts**:

    1. Read current file (750+ lines). Locate `function pxToFeet(...)` at line ~77.
    2. Add `import { pxToFeet } from "./toolUtils";` at top of file.
    3. Delete the local `function pxToFeet` definition.
    4. Do NOT touch: the `state` object (~line 41–75), the `SelectState` interface, `_productLibrary` module-scope binding, `setSelectToolProductLibrary` export, any `(fc as any)` cast, or any of the 4 custom-elements `as any` casts (deferred per D-10).
    5. Run `npx tsc --noEmit` — must exit 0.

    After both files updated, run `npm test` — same failure baseline must hold.

    **Critical scope guard:** If you find yourself editing anything other than (a) the pxToFeet definition or (b) the import statement, you're outside this task's scope. Abort and flag.
  </action>
  <verify>
    <automated>! grep -E "^function pxToFeet" src/canvas/tools/wallTool.ts src/canvas/tools/selectTool.ts; grep -q 'from "./toolUtils"' src/canvas/tools/wallTool.ts; grep -q 'from "./toolUtils"' src/canvas/tools/selectTool.ts; grep -q "function findNearestEndpoint" src/canvas/tools/wallTool.ts; npx tsc --noEmit && npm test</automated>
  </verify>
  <acceptance_criteria>
    - `! grep -E "^function pxToFeet" src/canvas/tools/wallTool.ts` (no local pxToFeet)
    - `! grep -E "^function pxToFeet" src/canvas/tools/selectTool.ts`
    - `grep -q 'from "./toolUtils"' src/canvas/tools/wallTool.ts` exits 0
    - `grep -q 'from "./toolUtils"' src/canvas/tools/selectTool.ts` exits 0
    - `grep -q "function findNearestEndpoint" src/canvas/tools/wallTool.ts` (wallTool-specific helper preserved)
    - All 18 `(fc as any)` casts still present (Wave 2 removes them): `grep -c "(fc as any)" src/canvas/tools/wallTool.ts src/canvas/tools/selectTool.ts` returns ≥ 6 total
    - Module-level `state` object still exists in wallTool and selectTool (unchanged): `grep -q "^const state" src/canvas/tools/wallTool.ts` exits 0
    - `npx tsc --noEmit` exits 0
    - `npm test` baseline matches Wave 0 capture
  </acceptance_criteria>
  <done>All 6 tool files now import pxToFeet from toolUtils. Zero local pxToFeet copies remain across src/canvas/tools/. Cleanup pattern and state still untouched — Wave 2's job.</done>
</task>

</tasks>

<verification>
After both tasks:
1. `grep -rE "^function pxToFeet" src/canvas/tools/` returns zero results
2. `grep -rE "^function findClosestWall" src/canvas/tools/` returns zero results (only toolUtils.ts exports it, no `^function` prefix match since it's `export function`)
3. All 6 tool files grep-confirmed to import from `./toolUtils`
4. `npm test` matches baseline pass/fail count
5. `npx tsc --noEmit` exits 0
6. `git diff --name-only src/canvas/tools/` lists exactly the 6 tool files (toolUtils.ts unchanged since Wave 0)
</verification>

<success_criteria>
Wave 1 complete when:
- [ ] All 6 tool files import from `./toolUtils` — verifiable via grep
- [ ] Zero `^function pxToFeet` occurrences anywhere under `src/canvas/tools/`
- [ ] Zero `^function findClosestWall` occurrences anywhere under `src/canvas/tools/` (toolUtils uses `export function` prefix, so the anchored regex excludes it — or use a more precise check)
- [ ] doorTool.ts + windowTool.ts call findClosestWall with 2 args (DOOR_WIDTH / WINDOW_WIDTH as second arg)
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm test` same 165 passing / 6 failing as Wave 0 baseline
- [ ] Cleanup pattern UNCHANGED — all 18 `(fc as any)` casts still present (Wave 2's job)
- [ ] Module-level `state` objects UNCHANGED in wallTool/selectTool/ceilingTool (Wave 2's job)
</success_criteria>

<output>
After completion, create `.planning/phases/24-tool-architecture-refactor/24-02-SUMMARY.md` describing:
- 6 files changed, what was deleted (lines N–M in each file), what was added (single import line)
- Confirmation that findClosestWall call sites are now 2-arg in doorTool/windowTool
- Confirmation that (fc as any) and state objects are INTENTIONALLY untouched — left for Wave 2
- Test baseline unchanged
- Handoff note for Wave 2: "Helpers consolidated. Now apply cleanup-fn return pattern and closure-state migration. Start with the 4 simple tools (door, window, product, ceiling), then wallTool, then selectTool."
</output>
