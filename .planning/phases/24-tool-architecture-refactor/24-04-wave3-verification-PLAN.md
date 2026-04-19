---
phase: 24-tool-architecture-refactor
plan: 04
type: execute
wave: 3
depends_on: [24-03]
files_modified:
  - .planning/phases/24-tool-architecture-refactor/24-VALIDATION.md
  - .planning/ROADMAP.md
  - CLAUDE.md
autonomous: false
requirements:
  - TOOL-01
  - TOOL-02
  - TOOL-03
must_haves:
  truths:
    - "ripgrep '(fc as any)' src/canvas/tools/ returns zero matches"
    - "No const state = {...} declarations at module scope in any tool file"
    - "Single src/canvas/tools/toolUtils.ts exists; all 6 tool files import pxToFeet from it; doorTool + windowTool import findClosestWall from it"
    - "Rapid tool switching (select → wall → door → window → product → ceiling, 10x) produces no event listener leaks (automated test + manual DevTools check confirm)"
    - "npm test passes with baseline failure set preserved (165 baseline + 6 new passing from toolCleanup = 171 passing; 6 pre-existing failures unchanged)"
    - "ROADMAP.md success criterion #3 updated from '5 tool files' to '6 tool files' per D-02"
    - "CLAUDE.md 'Tool System' and 'Tool cleanup pattern' sections updated to reflect new cleanup-fn return pattern"
  artifacts:
    - path: .planning/phases/24-tool-architecture-refactor/24-VALIDATION.md
      provides: "Per-task verification map marked green; nyquist_compliant: true"
      contains: "nyquist_compliant: true"
    - path: .planning/ROADMAP.md
      provides: "Phase 24 success criteria updated per D-02"
      contains: "all 6 tool files"
    - path: CLAUDE.md
      provides: "Updated Tool System docs reflecting new cleanup pattern"
      contains: "cleanup fn"
  key_links:
    - from: .planning/phases/24-tool-architecture-refactor/24-VALIDATION.md
      to: "phase success criteria"
      via: "Status column flipped from ⬜ pending to ✅ green for all rows"
      pattern: "✅"
---

<objective>
Wave 3 is phase-level verification and documentation cleanup. Runs the full automated suite one more time, executes the D-13 manual smoke checklist with the user, captures results in VALIDATION.md, updates ROADMAP.md to reflect D-02 (5 → 6 tool files), updates CLAUDE.md to document the new cleanup pattern, and gates the phase-complete handoff.

Purpose: Prevent "works on my machine" drift. Gives the user a single checkpoint that touches the real 2D canvas with real inputs (D-13 smoke) while exercising every tool once. Documents the final state so next-phase context is accurate.

Output: VALIDATION.md with `nyquist_compliant: true`, ROADMAP.md success criterion #3 corrected, CLAUDE.md updated, all user-facing smoke steps signed off.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/24-tool-architecture-refactor/24-CONTEXT.md
@.planning/phases/24-tool-architecture-refactor/24-VALIDATION.md
@.planning/phases/24-tool-architecture-refactor/24-01-SUMMARY.md
@.planning/phases/24-tool-architecture-refactor/24-02-SUMMARY.md
@.planning/phases/24-tool-architecture-refactor/24-03-SUMMARY.md
@CLAUDE.md
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Run final automated gate — full suite + type-check + grep guards</name>
  <files>.planning/phases/24-tool-architecture-refactor/24-VALIDATION.md</files>
  <read_first>
    - .planning/phases/24-tool-architecture-refactor/24-VALIDATION.md (per-task verification map with ⬜ pending rows)
    - .planning/phases/24-tool-architecture-refactor/24-03-SUMMARY.md (confirm Wave 2 delivered 18→0 cast removal)
  </read_first>
  <behavior>
    - All 5 roadmap success criteria verified by automated commands
    - VALIDATION.md per-task verification map (lines 48–61) flipped from ⬜ to ✅ for every row
    - VALIDATION.md frontmatter `nyquist_compliant` flipped from `false` to `true`
    - Wave 0 Requirements checklist (lines 69–74) all [x]
    - Validation Sign-Off section (lines 88–95) all [x]
    - Output of each command captured as evidence block in VALIDATION.md
  </behavior>
  <action>
    Run all automated verification commands in sequence and record results.

    **A. Zero (fc as any) in tools/** (Success #1, TOOL-01):
    ```
    grep -rE "\(fc as any\)" src/canvas/tools/ || echo "ZERO MATCHES"
    ```
    Expected: "ZERO MATCHES"

    **B. Zero module-level state objects** (Success #2, TOOL-02):
    ```
    grep -rE "^const state\s*:" src/canvas/tools/
    grep -rE "^const state\s*=" src/canvas/tools/
    ```
    Both must be empty.

    Note: `let pendingProductId` in productTool.ts and `let _productLibrary` in selectTool.ts are ALLOWED (D-07 public-API bridges). Verify these still exist:
    ```
    grep -q "^let pendingProductId" src/canvas/tools/productTool.ts && echo "D-07 productTool preserved"
    grep -q "^let _productLibrary" src/canvas/tools/selectTool.ts && echo "D-07 selectTool preserved"
    ```

    **C. toolUtils.ts consolidation** (Success #3, TOOL-03):
    ```
    test -f src/canvas/tools/toolUtils.ts && echo "toolUtils exists"
    for f in src/canvas/tools/{wallTool,selectTool,doorTool,windowTool,productTool,ceilingTool}.ts; do
      grep -q 'from "./toolUtils"' "$f" && echo "$f imports toolUtils" || echo "FAIL: $f"
    done
    grep -rE "^function pxToFeet" src/canvas/tools/ && echo "FAIL: local pxToFeet exists" || echo "zero local pxToFeet"
    ```
    All 6 tool files must import from toolUtils; zero local pxToFeet functions.

    **D. Listener-leak automated test** (Success #4):
    ```
    npm test -- toolCleanup 2>&1 | tail -20
    ```
    Expected: "Tests  6 passed". If any fail, Wave 2 Task 3 didn't fully land cleanup (Pitfalls #1/#2 applied).

    **E. Full suite baseline match** (Success #5):
    ```
    npm test 2>&1 | tee /tmp/phase24-final.txt
    tail -10 /tmp/phase24-final.txt
    ```
    Expected summary: `Tests  6 failed | 171 passed (177)`. The 6 failing test names must match the baseline captured in VALIDATION.md "Pre-Existing Failure Baseline" section. Diff:
    ```
    grep -E "^\s*(FAIL|×|✗)\s" /tmp/phase24-final.txt | sort > /tmp/final-fails.txt
    # Compare to baseline (captured in VALIDATION.md Task 24-01) — same test names
    ```

    **F. TypeScript compile** (supports TOOL-01):
    ```
    npx tsc --noEmit 2>&1 | tail -5
    ```
    Expected: exit 0, no output.

    **G. Update VALIDATION.md:**

    1. Flip frontmatter `nyquist_compliant: false` → `nyquist_compliant: true`
    2. Flip `wave_0_complete: false` → `wave_0_complete: true` (Wave 0 baselines were captured)
    3. Under "Per-Task Verification Map" (lines 48–61), change every row's Status column from `⬜ pending` to `✅ green` after confirming the corresponding automated command passes
    4. Under "Wave 0 Requirements" (lines 69–74), check all [x]
    5. Under "Validation Sign-Off" (lines 88–95), check all [x]
    6. Append a new "Final Results" section at the end:

    ```markdown
    ## Final Results (2026-04-XX)

    **Automated gate:** ALL GREEN

    | Check | Command | Result |
    |-------|---------|--------|
    | Zero (fc as any) in tools/ | `grep -rE "\(fc as any\)" src/canvas/tools/` | 0 matches |
    | Zero module-level state | `grep -rE "^const state" src/canvas/tools/*.ts` | 0 matches |
    | toolUtils imports | `for f in ...; do grep ...; done` | 6/6 files import |
    | Zero local pxToFeet | `grep -rE "^function pxToFeet" src/canvas/tools/` | 0 matches |
    | Listener-leak test | `npm test -- toolCleanup` | 6/6 pass |
    | Full suite | `npm test` | 171 passed, 6 pre-existing failed (matches baseline) |
    | Type-check | `npx tsc --noEmit` | exit 0 |

    **Baseline comparison:** Same 6 test names failing pre- and post-refactor (recorded in "Pre-Existing Failure Baseline" above). No new regressions.
    ```
  </action>
  <verify>
    <automated>grep -q "nyquist_compliant: true" .planning/phases/24-tool-architecture-refactor/24-VALIDATION.md && grep -q "## Final Results" .planning/phases/24-tool-architecture-refactor/24-VALIDATION.md && ! grep -rE "\\(fc as any\\)" src/canvas/tools/ && ! grep -rE "^const state" src/canvas/tools/*.ts && npx tsc --noEmit && npm test</automated>
  </verify>
  <acceptance_criteria>
    - `! grep -rE "\\(fc as any\\)" src/canvas/tools/` — zero matches (success criterion #1)
    - `! grep -rE "^const state\\s*(:|=)" src/canvas/tools/*.ts` — zero matches (success criterion #2)
    - `test -f src/canvas/tools/toolUtils.ts` — exists (success criterion #3)
    - All 6 tool files grep-confirmed to import from "./toolUtils" (success criterion #3)
    - `npm test -- toolCleanup` — 6 tests pass (success criterion #4)
    - `npm test` summary matches: 171 passed, 6 failed — same 6 test names as baseline (success criterion #5)
    - `npx tsc --noEmit` exits 0
    - VALIDATION.md `nyquist_compliant: true`
    - VALIDATION.md has "## Final Results" section with the evidence table
    - All ⬜ in VALIDATION.md per-task map flipped to ✅
  </acceptance_criteria>
  <done>Every automated success criterion passes. VALIDATION.md reflects the green state with evidence. Ready for manual smoke.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Manual smoke test (D-13 checklist) with DevTools listener-leak verification</name>
  <files>none (human-verification of running app)</files>
  <read_first>
    - .planning/phases/24-tool-architecture-refactor/24-CONTEXT.md §D-13 (8-step smoke script)
    - .planning/phases/24-tool-architecture-refactor/24-03-SUMMARY.md (what Wave 2 shipped)
  </read_first>
  <what-built>
    - 18 `(fc as any)` casts removed from src/canvas/tools/
    - 3 module-level `state` objects + wrapper interfaces dissolved into closures (wallTool, selectTool, ceilingTool)
    - 6 duplicate `pxToFeet` + 2 duplicate `findClosestWall` consolidated into src/canvas/tools/toolUtils.ts
    - FabricCanvas.tsx tool dispatch now uses `toolCleanupRef = useRef<() => void | null>(null)` + invokes on switch + unmount
    - 6 deactivateXTool exports removed
    - Dead-code `getPendingProduct` export removed from productTool.ts
    - New automated test `tests/toolCleanup.test.ts` with 6 listener-leak regression cases (all passing)
    - Full suite: 171 passed, 6 pre-existing failed (same 6 names as baseline — no regressions)
  </what-built>
  <action>
    HUMAN CHECKPOINT — see <how-to-verify> block below.

    Steps (executor runs `npm run dev` first, then pauses for user):
    1. Start dev server: `npm run dev` (runs in background on port 5173)
    2. Pause and present the 8-step smoke checklist to the user
    3. Wait for "approved" or issue description in <resume-signal>
    4. If approved: mark this task complete and continue to Task 3
    5. If rejected: flag the failing step, stop the phase, create an issue for fix-forward plan
  </action>
  <how-to-verify>
    Per D-13 manual smoke script. Run `npm run dev` first, then open http://localhost:5173 in Chrome.

    **Step 1 — Draw 3 walls:**
    1. Press `W` to activate wall tool
    2. Click at any point on canvas — wall start anchor appears
    3. Click again ~5 ft away — first wall drawn with length label
    4. Continue clicking to draw 3 walls forming an L or U shape
    5. Confirm: preview line follows mouse, length label shows feet+inches, corners snap cleanly
    6. Expected: behavior identical to pre-refactor (no visual difference)

    **Step 2 — Place a door:**
    1. Press `D` to activate door tool
    2. Hover over a wall — blue preview polygon appears at nearest wall point
    3. Click to place the door
    4. Confirm: door appears as opening in the wall (white cut-out)

    **Step 3 — Place a window:**
    1. Press `N` to activate window tool
    2. Hover over a different wall — preview appears
    3. Click to place the window
    4. Confirm: window appears as opening

    **Step 4 — Place a product:**
    1. Open sidebar → Product Library
    2. Pick any product (or create a quick one via "Add Product" if library is empty)
    3. Confirm the tool auto-switches to product-place mode (crosshair cursor)
    4. Click on canvas to place — product appears at click location
    5. Drag the product — it moves with cursor, snaps to grid
    6. Escape — returns to select tool

    **Step 5 — Draw a ceiling:**
    1. Press the ceiling tool button in the toolbar
    2. Click 3+ points to form a ceiling polygon
    3. Click the starting point or press Enter to close the polygon
    4. Confirm: ceiling appears with vertex markers during drawing; commits on close

    **Step 6 — Rapid tool switching (leak check per Success Criterion #4):**
    1. Open Chrome DevTools (`Cmd+Option+I`) → Performance Monitor
    2. Enable "JS event listeners" checkbox
    3. Note the baseline count after hovering cursor away from canvas
    4. Rapidly press the sequence: V → W → D → N → P → V → W → D → N → P (10 rounds — takes ~5 seconds)
    5. Wait 1 second
    6. Confirm: JS event listener count returns to within ±2 of the baseline (a leak would show +20 or more)
    7. Also open DevTools Console and run:
       ```js
       const fc = /* expose via React DevTools or __fc hack */;
       console.log(Object.entries(fc.__eventListeners ?? {}).map(([k, v]) => [k, v.length]));
       ```
       Each event key should show count ≤ 3 (not 10+).

    **Step 7 — Undo/redo across all operations:**
    1. Press Ctrl+Z (or Cmd+Z) repeatedly — every action from steps 1–5 should reverse in order
    2. Press Ctrl+Shift+Z to redo — should re-apply in order
    3. Confirm: no phantom preview objects, no stuck state, tool remains `select` after undo chain completes

    **Step 8 — Delete each element:**
    1. Press `V` (select tool)
    2. Click each placed element in turn, press Delete/Backspace
    3. Confirm: each deletes cleanly, no residual preview polygons, no console errors

    Expected end state: empty room, 0 walls / doors / windows / products / ceilings, tool = `select`, Fabric listener count = baseline.

    If any step produces a console error, a visual regression, a frozen tool, or a listener leak (count +20 after 10 switches), **reject this checkpoint** and describe the issue.
  </how-to-verify>
  <verify>
    <automated>MISSING — checkpoint task; verification is human-driven per &lt;how-to-verify&gt; block. Automated equivalent runs in tests/toolCleanup.test.ts (Wave 2 Task 3).</automated>
  </verify>
  <acceptance_criteria>
    - User types "approved" after completing all 8 smoke steps with no regressions
    - OR user describes the specific failing step — in which case the phase halts and a gap-closure plan is required
    - Dev server shut down cleanly after verification
  </acceptance_criteria>
  <done>User signed off on D-13 smoke checklist. No behavioral regressions observed. No DevTools listener leak detected after 10 rapid tool-switch cycles.</done>
  <resume-signal>Type "approved" if all 8 steps pass cleanly, OR describe the specific step that failed (e.g., "Step 4 failed: product tool cursor stays crosshair after Escape")</resume-signal>
</task>


<task type="auto" tdd="false">
  <name>Task 3: Update ROADMAP.md (D-02) and CLAUDE.md (cleanup pattern) documentation</name>
  <files>.planning/ROADMAP.md, CLAUDE.md</files>
  <read_first>
    - .planning/ROADMAP.md (Phase 24 section, lines 66–76 — success criterion #3 currently says "5 tool files")
    - CLAUDE.md (the project root CLAUDE.md — NOT the user's private one. Likely contains "Tool System" and "Tool cleanup pattern" sections referencing `(fc as any).__xToolCleanup`. Grep to locate.)
    - .planning/phases/24-tool-architecture-refactor/24-CONTEXT.md lines 83–90 "Project conventions" (notes that CLAUDE.md documents the pattern being removed)
    - D-02 in 24-CONTEXT.md: "Update roadmap success criterion #3 to read 'all 6 tool files' instead of 'all 5 tool files' during planning"
  </read_first>
  <behavior>
    - ROADMAP.md Phase 24 Success Criterion #3 changed from "all 5 tool files" to "all 6 tool files"
    - ROADMAP.md Phase 24 `**Requirements**: TOOL-01, TOOL-02, TOOL-03` unchanged
    - ROADMAP.md Phase 24 marked complete: `- [x] **Phase 24: Tool Architecture Refactor**` in the Phases section; Progress Table row flipped to "Complete"
    - CLAUDE.md "Tool System" section (if present in project CLAUDE.md) updated: describes the new cleanup-fn return pattern. `(fc as any).__xToolCleanup` reference removed.
    - CLAUDE.md "Known Patterns & Gotchas" — if it contains the pattern as a gotcha, either remove the entry or update to describe the closure pattern
  </behavior>
  <action>
    **1. ROADMAP.md edits:**

    a. In the Phases section (around line 59), change:
    ```markdown
    - [ ] **Phase 24: Tool Architecture Refactor** — Eliminate `as any` casts, move state to closures, extract shared utilities
    ```
    To:
    ```markdown
    - [x] **Phase 24: Tool Architecture Refactor** — Eliminate `as any` casts, move state to closures, extract shared utilities (shipped 2026-04-XX)
    ```

    b. In "Phase 24: Tool Architecture Refactor" success criteria (around line 73), change:
    ```markdown
    3. A single `src/canvas/tools/toolUtils.ts` exists and all 5 tool files import `pxToFeet` and `findClosestWall` from it — zero local duplicates
    ```
    To:
    ```markdown
    3. A single `src/canvas/tools/toolUtils.ts` exists and all 6 tool files import `pxToFeet` from it (and door/window additionally import `findClosestWall`) — zero local duplicates
    ```

    c. Change success criterion #5 (per RESEARCH.md §8 conclusion):
    ```markdown
    5. All 115 tests pass with no behavioral regressions
    ```
    To:
    ```markdown
    5. Full test suite passes with same failure set as baseline (171 tests total; 165 passing pre-refactor → 171 passing post-refactor including 6 new listener-leak cases; 6 pre-existing unrelated failures unchanged)
    ```

    d. Update "Plans" line from `**Plans**: TBD` to `**Plans**: 4 plans (scaffolding → consolidate → cleanup pattern → verification)`

    e. In the Progress Table (around line 114), change the Phase 24 row to:
    ```markdown
    | 24. Tool Architecture Refactor | 4/4 | Complete | 2026-04-XX |
    ```
    (Substitute actual completion date.)

    **2. CLAUDE.md edits:**

    First, locate the relevant sections. The project CLAUDE.md at the worktree root likely has a "Tool System" section (per CONTEXT.md line 88). Grep:
    ```
    grep -n "Tool System\|tool cleanup\|__xToolCleanup\|__wallToolCleanup" CLAUDE.md
    ```

    a. If a section describes the `(fc as any).__xToolCleanup` pattern, replace it with:
    ```markdown
    ### Tool System

    Each tool (select, wall, door, window, product, ceiling) is activated via `activateXTool(fc, scale, origin)` which:
    - Attaches Fabric and document event handlers inside a closure
    - Holds all per-activation mutable state as `let` bindings inside the closure (no module-level `state` objects)
    - Returns a `() => void` cleanup function that removes all listeners and clears preview objects

    `FabricCanvas.tsx` stores the returned cleanup fn in a `useRef<(() => void) | null>` and invokes it:
    - Before activating a different tool (on tool switch)
    - Before `fc.dispose()` (on unmount)

    Shared helpers `pxToFeet` and `findClosestWall` live in `src/canvas/tools/toolUtils.ts`.

    **Module-scoped exceptions** (intentional public APIs, not per-activation state):
    - `productTool.ts` — `pendingProductId` + `setPendingProduct(id)` — toolbar → tool bridge
    - `selectTool.ts` — `_productLibrary` + `setSelectToolProductLibrary(lib)` — productLibrary injection bridge
    ```

    b. If the "Known Patterns & Gotchas" list includes an entry about `__xToolCleanup`, remove that entry and renumber remaining items.

    c. Update the "Remaining Work" section if it mentions this refactor — mark as shipped.

    **Sanity check:** `grep -c "__xToolCleanup\|__wallToolCleanup\|__selectToolCleanup\|__doorToolCleanup\|__windowToolCleanup\|__productToolCleanup\|__ceilingToolCleanup" CLAUDE.md` must return 0.
  </action>
  <verify>
    <automated>grep -q "all 6 tool files" .planning/ROADMAP.md && grep -q "\\- \\[x\\] \\*\\*Phase 24" .planning/ROADMAP.md && ! grep -q "__xToolCleanup\\|__wallToolCleanup\\|__selectToolCleanup" CLAUDE.md</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "all 6 tool files" .planning/ROADMAP.md` — success criterion #3 updated per D-02
    - `grep -q "\\- \\[x\\] \\*\\*Phase 24" .planning/ROADMAP.md` — phase marked complete in Phases section
    - `grep -q "4/4" .planning/ROADMAP.md` — progress table updated (or similar pattern depending on actual table format)
    - `grep -q "171 tests" .planning/ROADMAP.md` OR `grep -q "same failure set as baseline" .planning/ROADMAP.md` — success criterion #5 updated per RESEARCH.md §8
    - `! grep -q "__xToolCleanup" CLAUDE.md` — reference to old pattern removed
    - `! grep -q "__wallToolCleanup\\|__selectToolCleanup\\|__doorToolCleanup\\|__windowToolCleanup\\|__productToolCleanup\\|__ceilingToolCleanup" CLAUDE.md` — no tool-specific old-pattern references remain
    - `grep -q "toolUtils" CLAUDE.md` — new pattern documented
    - `grep -q "useRef<() => void" CLAUDE.md` OR similar mention of cleanup-fn ref — new pattern documented
  </acceptance_criteria>
  <done>Documentation reflects the post-refactor architecture. ROADMAP.md Phase 24 marked complete. Future phases planning from CLAUDE.md will see the correct current pattern.</done>
</task>

</tasks>

<verification>
Phase 24 is complete when:

1. **Automated (Task 1):**
   - `! grep -rE "\(fc as any\)" src/canvas/tools/` — zero matches (Success #1)
   - `! grep -rE "^const state\s*(:|=)" src/canvas/tools/*.ts` (Success #2)
   - `test -f src/canvas/tools/toolUtils.ts` and all 6 tools import from it (Success #3)
   - `npm test -- toolCleanup` passes 6/6 (Success #4)
   - `npm test` passes with baseline failure set (Success #5)
   - `npx tsc --noEmit` exits 0

2. **Manual (Task 2):**
   - User runs D-13 smoke checklist steps 1–8 and responds "approved"
   - DevTools listener count stable after 10 tool-switch cycles (Success #4)

3. **Documentation (Task 3):**
   - ROADMAP.md Success Criterion #3 reads "6 tool files"
   - Phase 24 marked `[x]` shipped in Phases list
   - CLAUDE.md Tool System section describes cleanup-fn return pattern
   - CLAUDE.md contains no `__xToolCleanup` references
</verification>

<success_criteria>
- [ ] All 5 ROADMAP success criteria (with D-02 correction + RESEARCH.md §8 test-count correction) verified green
- [ ] All 3 phase requirements (TOOL-01, TOOL-02, TOOL-03) automated evidence captured in VALIDATION.md
- [ ] VALIDATION.md frontmatter `nyquist_compliant: true`
- [ ] User manual smoke (D-13) signed off
- [ ] ROADMAP.md Phase 24 marked complete
- [ ] CLAUDE.md updated to describe new cleanup pattern
- [ ] Ready to commit: `node $HOME/.claude/get-shit-done/bin/gsd-tools.cjs commit "refactor(24): tool architecture cleanup complete" --files .planning/phases/24-tool-architecture-refactor/ .planning/ROADMAP.md CLAUDE.md`
- [ ] Ready for PR creation per user's "PR-on-Push Rule" (global CLAUDE.md)
</success_criteria>

<output>
After completion, create `.planning/phases/24-tool-architecture-refactor/24-04-SUMMARY.md` describing:
- Final automated gate results (copy evidence table from VALIDATION.md Final Results section)
- Manual smoke outcome (approved / issues found)
- Documentation updates (ROADMAP.md lines changed, CLAUDE.md sections updated)
- Post-phase deferred items confirmed carried forward:
  - 4 custom-elements `as any` casts in selectTool.ts (needs cadStore.customElements typing — deferred per D-10)
  - 3 fabric event `as any` casts in FabricCanvas.tsx (needs fabric v6 type-def shims — deferred per D-11)
- Pointer to next phase: Phase 25 (Canvas & Store Performance) depends on this phase's stabilized tool files, so Phase 25 planning can begin
</output>
