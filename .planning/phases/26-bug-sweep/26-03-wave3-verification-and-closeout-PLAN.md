---
phase: 26-bug-sweep
plan: 03
type: execute
wave: 3
depends_on: [26-01, 26-02]
files_modified:
  - .planning/ROADMAP.md
  - .planning/REQUIREMENTS.md
  - .planning/STATE.md
autonomous: false
requirements: [FIX-01, FIX-02]
user_setup: []
must_haves:
  truths:
    - "Full vitest suite is GREEN (no regressions against pre-phase baseline)"
    - "Manual smoke for FIX-01 (product thumbnail appears within one render cycle on placement) user-approved per D-10"
    - "Manual smoke for FIX-02 (ceiling preset produces visible color/roughness change in 3D, PLASTER → WOOD_PLANK cycle tested) user-approved per D-10"
    - "Manual IndexedDB smoke (save → hard-refresh → reopen → both thumbnail and ceiling preset persist) user-approved per D-12"
    - "GitHub issues #42 and #43 are closed with the phase PR reference (D-14) — or closed as stale with repro evidence if D-04 was triggered"
    - "ROADMAP Phase 26 marked complete with plan list and checkmark"
  artifacts:
    - path: ".planning/ROADMAP.md"
      provides: "Phase 26 marked complete with progress table updated"
      contains: "Phase 26: Bug Sweep"
    - path: ".planning/REQUIREMENTS.md"
      provides: "FIX-01 and FIX-02 marked with completion status"
      contains: "FIX-01"
  key_links:
    - from: ".planning/ROADMAP.md Phase 26 block"
      to: "Plan SUMMARYs 26-00, 26-01, 26-02"
      via: "links in plan list lines"
      pattern: "26-0[0-3]-.*-SUMMARY"
    - from: "GitHub issues #42, #43"
      to: "phase PR / commits (D-14)"
      via: "gh issue close with commit reference"
      pattern: "#42|#43"
---

<objective>
Close out Phase 26: confirm the full automated suite is GREEN, run the two user-approved manual smoke gates (D-10, D-12), close GitHub issues #42 and #43 (D-14), and update docs (ROADMAP, REQUIREMENTS, STATE). This is the only plan in the phase that contains checkpoints.

Purpose: Enforce the "user signs off before the phase ends" discipline established in Phase 24 D-13. Unit tests alone can't prove (a) a thumbnail actually paints in a real canvas, (b) a ceiling preset is visibly different in real WebGL, or (c) IndexedDB round-trips survive a real browser refresh.

Output: Phase 26 marked complete; both bugs either fixed-and-verified or closed-as-stale with documented evidence.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.planning/phases/26-bug-sweep/26-CONTEXT.md
@.planning/phases/26-bug-sweep/26-RESEARCH.md
@.planning/phases/26-bug-sweep/26-VALIDATION.md
@.planning/phases/26-bug-sweep/26-00-wave0-red-tests-SUMMARY.md
@.planning/phases/26-bug-sweep/26-01-fix01-product-image-rebuild-SUMMARY.md
@.planning/phases/26-bug-sweep/26-02-fix02-ceiling-preset-material-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 3-01: Run full vitest suite and record pass/fail against baseline</name>
  <files>(no files modified — verification only)</files>
  <read_first>
    - .planning/phases/26-bug-sweep/26-00-wave0-red-tests-SUMMARY.md
    - .planning/phases/26-bug-sweep/26-01-fix01-product-image-rebuild-SUMMARY.md
    - .planning/phases/26-bug-sweep/26-02-fix02-ceiling-preset-material-SUMMARY.md
    - .planning/phases/26-bug-sweep/26-VALIDATION.md (sampling rate)
  </read_first>
  <action>
    Run the full vitest suite:
    ```
    npm run test -- --run
    ```
    Capture the output. Compare against Phase 25 baseline from STATE.md ("179 passing" after Phase 25 Wave 3). Phase 26 should add:
    - 1 new test file for FIX-01 (≥1 test → now GREEN after Plan 01)
    - 1 new test file for FIX-02 (≥3 tests → GREEN)
    Expected: ≥183 passing, no new failures.

    Record the actual number in the task output. If any pre-existing failure set expanded, STOP and report — do not proceed to manual smoke gates.
  </action>
  <verify>
    <automated>npm run test -- --run</automated>
  </verify>
  <acceptance_criteria>
    - `npm run test -- --run` exits with code 0.
    - Total passing count ≥ 183 (baseline 179 + at least 4 new tests from Plans 00, 01, 02).
    - Zero new failures compared to pre-phase baseline captured in STATE.md.
    - Output recorded in task summary with pass/fail/skip counts.
  </acceptance_criteria>
  <done>Full suite GREEN; counts logged; ready for manual smoke gates.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3-02: Manual smoke — FIX-01 (product thumbnail on placement + reload)</name>
  <files>(no files modified — human verification only)</files>
  <read_first>
    - .planning/phases/26-bug-sweep/26-01-fix01-product-image-rebuild-SUMMARY.md (which path was taken — fix or stale-close)
    - .planning/phases/26-bug-sweep/26-VALIDATION.md Manual-Only Verifications section (exact instructions)
  </read_first>
  <what-built>
    FIX-01 applied (or closed as stale per D-04). Product Group now rebuilds on async image load via an `onImageReady` callback from productImageCache into FabricCanvas's redraw tick. Existing productImageCache abstraction preserved (D-02).
  </what-built>
  <action>
    Run `npm run dev` and open the app in Chrome. Execute the two-part manual verification below and pause for user sign-off.

    Part A — Placement (D-10):
    1. Open or create a project.
    2. Add a product to the Product Library with an uploaded image (PNG/JPG data URL).
    3. Switch to 2D view (or split). Select the product tool. Click on the canvas to place the product.
    4. EXPECTED: The product thumbnail image is visible in the placed product's canvas tile WITHIN ONE RENDER CYCLE (no need to pan, zoom, switch tools, or drag). A placeholder-only render is a failure.

    Part B — Reload persistence (D-12):
    1. Save the project (File → Save, or the save button).
    2. Hard-refresh the browser tab (Cmd+Shift+R on Mac).
    3. Reopen the saved project.
    4. EXPECTED: The placed product's thumbnail is visible in the 2D canvas immediately on load. No re-trigger or interaction needed.

    (Only if Plan 01 took the stale-close path:) Skip Part A's expectation of a fix; instead confirm the current deployed behavior matches Part A expectations against current main. If so, issue #42 is stale — proceed to close in Task 3-04.

    Pause and request the user type "approved" or describe the failure.
  </action>
  <how-to-verify>
    Follow Part A and Part B steps above exactly. Screenshot both 2D canvas states if useful for the SUMMARY.
  </how-to-verify>
  <verify>
    <automated>MISSING — human-only visual verification; D-10 + D-12 require manual sign-off and cannot be automated in this phase (Playwright IDB round-trip is deferred per CONTEXT deferred ideas).</automated>
  </verify>
  <acceptance_criteria>
    - User types "approved" (both Part A and Part B pass visually).
    - OR user describes exact failure, which becomes a new task or an Outcome-revised Plan 01.
  </acceptance_criteria>
  <done>User-approved sign-off captured in session log or SUMMARY with timestamp.</done>
  <resume-signal>Type "approved" or describe the specific failure observed.</resume-signal>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3-03: Manual smoke — FIX-02 (ceiling preset visible change + reload)</name>
  <files>(no files modified — human verification only)</files>
  <read_first>
    - .planning/phases/26-bug-sweep/26-02-fix02-ceiling-preset-material-SUMMARY.md (diagnosed Outcome A/B/C)
    - .planning/phases/26-bug-sweep/26-VALIDATION.md Manual-Only Verifications rows 3-4
  </read_first>
  <what-built>
    FIX-02 applied per the diagnosed Outcome in Plan 02 (Pitfall 2/UI/4) — OR closed as perception-only (Pitfall 3, Outcome A). Tier order `surfaceMaterialId → paintId → legacy material` preserved. Color + roughness parity with FloorMesh preset path (no texture loading per D-06).
  </what-built>
  <action>
    Run `npm run dev` and open the app in Chrome. Execute the two-part manual verification below and pause for user sign-off.

    Part A — Visible preset change (D-10):
    1. Create or open a project with at least one ceiling.
    2. Open the ceiling panel (select the ceiling; properties panel shows the preset picker).
    3. Click PLASTER. Observe 3D viewport ceiling color/roughness.
    4. Click WOOD_PLANK. EXPECTED: ceiling visibly changes to amber brown (`#a0794f`) with lower roughness. This is the cleanest distinctness test — WOOD_PLANK is unambiguous.
    5. Click CONCRETE. EXPECTED: ceiling visibly changes to mid-gray (`#8a8a8a`).
    6. Click PAINTED_DRYWALL. EXPECTED: ceiling visibly changes to off-white (`#f5f5f5`) — subtle vs PLASTER but non-zero.

    Part B — Reload persistence (D-12):
    1. With WOOD_PLANK selected, save the project.
    2. Open Chrome DevTools → Application → IndexedDB → keyval-store → `room-cad-project-*`. Confirm the snapshot JSON contains `"surfaceMaterialId":"WOOD_PLANK"` inside the ceiling entry.
    3. Hard-refresh (Cmd+Shift+R). Reopen the project.
    4. EXPECTED: Ceiling still WOOD_PLANK in 3D viewport; panel still shows WOOD_PLANK selected.

    (If Plan 02 Outcome A:) Part A's step 4 (WOOD_PLANK) MUST already pass on current code — that's the evidence for stale-close. Part B must also pass.

    Pause and request the user type "approved" or describe the failure.
  </action>
  <how-to-verify>
    Follow Part A and Part B steps above exactly. Use the browser DevTools IndexedDB viewer for step B.2.
  </how-to-verify>
  <verify>
    <automated>MISSING — human-only visual verification of WebGL color/roughness change + real IndexedDB round-trip; D-10 + D-12 require manual sign-off per CONTEXT decisions.</automated>
  </verify>
  <acceptance_criteria>
    - User types "approved" (both Part A steps 4 & 5 showed visible change, AND Part B preset persisted after refresh).
    - OR user describes exact failure, which becomes a new task or an Outcome-revised Plan 02.
  </acceptance_criteria>
  <done>User-approved sign-off captured in session log or SUMMARY with timestamp.</done>
  <resume-signal>Type "approved" or describe the specific failure observed.</resume-signal>
</task>

<task type="auto">
  <name>Task 3-04: Close GitHub issues #42 and #43; update ROADMAP / REQUIREMENTS / STATE</name>
  <files>.planning/ROADMAP.md, .planning/REQUIREMENTS.md, .planning/STATE.md</files>
  <read_first>
    - .planning/ROADMAP.md (Phase 26 block — lines ~98-107; Progress Table)
    - .planning/REQUIREMENTS.md (FIX-01 and FIX-02 rows; Traceability table)
    - .planning/STATE.md (current frontmatter + decisions log)
    - .planning/phases/26-bug-sweep/26-01-fix01-product-image-rebuild-SUMMARY.md (code path vs stale-close)
    - .planning/phases/26-bug-sweep/26-02-fix02-ceiling-preset-material-SUMMARY.md (diagnosed outcome)
  </read_first>
  <action>
    Step 1 — Close GitHub issues (D-14):

    (a) For issue #42 (FIX-01):
    - If Plan 01 applied a code fix:
      ```
      gh issue close 42 --comment "Fixed by Phase 26 — product Group now rebuilds on async image load via onImageReady callback. Full smoke D-10 + IDB reload D-12 user-approved $(date +%Y-%m-%d). See .planning/phases/26-bug-sweep/26-01-fix01-product-image-rebuild-SUMMARY.md."
      ```
    - If Plan 01 closed as stale (D-04):
      ```
      gh issue close 42 --comment "Closing as stale — Phase 26 Wave 0 RED test passed against current main. Root cause referenced in the original issue (sync imgEl.complete check) no longer exists; current code uses productImageCache. Evidence: tests/fabricSync.image.test.ts. See .planning/phases/26-bug-sweep/26-01-fix01-product-image-rebuild-SUMMARY.md."
      ```

    (b) For issue #43 (FIX-02):
    - Outcome B/C (code fix applied):
      ```
      gh issue close 43 --comment "Fixed by Phase 26 — {one-line diagnosis from Plan 02 SUMMARY}. Tier order preserved; color+roughness parity with FloorMesh preset path per D-06. Smoke D-10 + IDB reload D-12 user-approved $(date +%Y-%m-%d). See .planning/phases/26-bug-sweep/26-02-fix02-ceiling-preset-material-SUMMARY.md."
      ```
    - Outcome A (perception-only):
      ```
      gh issue close 43 --comment "Closing as perception-only — Phase 26 investigation confirmed preset selection works correctly (WOOD_PLANK #a0794f and CONCRETE #8a8a8a produce visibly distinct 3D renders). Original report likely driven by near-white preset similarity (PLASTER vs PAINTED_DRYWALL). Backlog polish item filed separately. See .planning/phases/26-bug-sweep/26-02-fix02-ceiling-preset-material-SUMMARY.md."
      ```

    Step 2 — Update `.planning/ROADMAP.md`:
    - Change `- [ ] **Phase 26: Bug Sweep**` → `- [x] **Phase 26: Bug Sweep**` (add completion date).
    - In the `Phase 26: Bug Sweep` block, replace `**Plans**: TBD` with the actual plan list:
      ```
      **Plans**: 4 plans
        - [x] 26-00-wave0-red-tests-PLAN.md — RED/baseline tests for FIX-01 and FIX-02 (Phase 25 W0 pattern)
        - [x] 26-01-fix01-product-image-rebuild-PLAN.md — Product Group rebuild on async image load (FIX-01) [or: closed as stale per D-04]
        - [x] 26-02-fix02-ceiling-preset-material-PLAN.md — Ceiling preset fix ({diagnosed-outcome}) (FIX-02)
        - [x] 26-03-wave3-verification-and-closeout-PLAN.md — Full suite + D-10/D-12 smoke + issue close-out
      ```
    - In the Progress Table, change `| 26. Bug Sweep | 0/? | Not started | - |` → `| 26. Bug Sweep | 4/4 | Complete | {YYYY-MM-DD} |`.

    Step 3 — Update `.planning/REQUIREMENTS.md`:
    - FIX-01 row: change `[ ]` → `[x]` (or note "Closed as stale — see 26-01 SUMMARY" if D-04).
    - FIX-02 row: change `[ ]` → `[x]` (or note "Closed as perception-only — see 26-02 SUMMARY" if Outcome A).
    - Traceability table at bottom: update FIX-01 and FIX-02 Status columns from "Pending" → "Complete" (or "Stale — closed"/"Perception — closed").

    Step 4 — Update `.planning/STATE.md`:
    - Set `status: complete` (if Phase 26 is the last work in progress) OR `status: verifying` → next-phase transitional.
    - Bump `completed_phases: 2` → `3`; `completed_plans: 8` → `12`.
    - Append to Decisions log:
      `- [Phase 26-bug-sweep]: Phase 26 closed — FIX-01 {fixed|stale}; FIX-02 {fixed|perception-only}. GitHub #42, #43 closed per D-14. Full suite {N} passing; D-10 and D-12 user-approved {date}.`
    - Update `last_updated` ISO timestamp, `last_activity` date, `stopped_at`.

    Step 5 — Commit:
    ```
    node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(26): close Phase 26 — FIX-01 and FIX-02 resolved" --files .planning/ROADMAP.md .planning/REQUIREMENTS.md .planning/STATE.md
    ```
  </action>
  <verify>
    <automated>gh issue view 42 --json state --jq '.state' && gh issue view 43 --json state --jq '.state' && grep -n "26. Bug Sweep" .planning/ROADMAP.md | head -3</automated>
  </verify>
  <acceptance_criteria>
    - `gh issue view 42 --json state --jq '.state'` returns `"CLOSED"`.
    - `gh issue view 43 --json state --jq '.state'` returns `"CLOSED"`.
    - `grep -n "\- \[x\] \*\*Phase 26" .planning/ROADMAP.md` returns 1 match.
    - `grep -n "26. Bug Sweep | 4/4 | Complete" .planning/ROADMAP.md` returns 1 match.
    - `grep -n "FIX-01" .planning/REQUIREMENTS.md | head -3` shows FIX-01 row updated (either `[x]` or stale-note).
    - `grep -n "FIX-02" .planning/REQUIREMENTS.md | head -3` shows FIX-02 row updated.
    - `.planning/STATE.md` frontmatter shows `completed_phases: 3` and `completed_plans: 12`.
    - Commit exists on current branch referencing "26" slug.
  </acceptance_criteria>
  <done>Both GitHub issues closed with traceable comments; ROADMAP/REQUIREMENTS/STATE updated; phase is auditable end-to-end.</done>
</task>

</tasks>

<verification>
- Full suite: `npm run test -- --run` GREEN (≥183 passing, zero new failures).
- Manual smokes: Tasks 3-02 and 3-03 both user-approved.
- Issues closed: #42 and #43 state=CLOSED.
- Docs: ROADMAP, REQUIREMENTS, STATE all reflect Phase 26 completion.
- No type-model refactors, no feature additions, no cross-cutting cleanup — D-13 guardrail held.
</verification>

<success_criteria>
- Phase 26 fully closed; v1.5 progress goes from 2/4 to 3/4 milestones.
- Both FIX-01 and FIX-02 are auditable: plan SUMMARYs + GitHub issue comments + REQUIREMENTS table rows.
- Either observable user fix OR documented stale-close evidence per D-04.
</success_criteria>

<output>
After completion, create `.planning/phases/26-bug-sweep/26-03-wave3-verification-and-closeout-SUMMARY.md` recording:
1. Final test suite count (passing/failing/skipped).
2. User approval timestamps for Tasks 3-02 and 3-03.
3. GitHub issue close-out links / comment IDs.
4. Whether Phase 26 closed via code fixes or a mix of fixes + stale-closes.
5. Any backlog items filed during the phase (e.g., preset visual-distinctness polish, ceiling material type-collapse, texture loading for ceilings).
</output>
