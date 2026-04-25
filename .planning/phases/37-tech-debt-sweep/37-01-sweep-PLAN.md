---
phase_number: 37
plan_number: 01
plan_name: sweep
phase_dir: .planning/phases/37-tech-debt-sweep
objective: >
  Final v1.8 cleanup. Verify the 4 DEBT-01 GH issues are closed cleanly, delete
  the orphan SaveIndicator component, finish the effectiveDimensions →
  resolveEffectiveDims migration (unused-import cleanup + @deprecated JSDoc),
  backfill 29-03-SUMMARY.md frontmatter, and document permanent acceptance of
  the 6 pre-existing vitest failures. ~30 minutes of mechanical work; one
  commit per DEBT requirement.
requirements_addressed: [DEBT-01, DEBT-02, DEBT-03, DEBT-04]
depends_on: []
wave: 1
autonomous: true
files_modified:
  - src/components/SaveIndicator.tsx
  - src/types/product.ts
  - src/canvas/snapEngine.ts
  - src/canvas/tools/selectTool.ts
  - src/canvas/fabricSync.ts
  - .planning/phases/29-editable-dim-labels/29-03-SUMMARY.md
  - .planning/phases/36-viz-10-regression/deferred-items.md
must_haves:
  truths:
    - "GH issues #44, #46, #50, #60 are CLOSED with closing comments referencing the actual shipping PRs and carry no orphan `in-progress` labels (DEBT-01)"
    - "src/components/SaveIndicator.tsx no longer exists on disk; grep -r SaveIndicator src/ returns zero hits in production code; npm run build passes (DEBT-02)"
    - "grep -rn 'effectiveDimensions(' src/ returns zero call-site hits; src/types/product.ts retains the function definition with an @deprecated JSDoc tag pointing to resolveEffectiveDims; the 3 unused imports in snapEngine/selectTool/fabricSync are removed (DEBT-03 + D-01)"
    - ".planning/phases/29-editable-dim-labels/29-03-SUMMARY.md frontmatter contains `requirements: [EDIT-20, EDIT-21]` (matching siblings 29-01 + 29-04 and REQUIREMENTS literal); gsd-tools summary-extract enumerates EDIT-20 + EDIT-21 from 29-03 without errors (DEBT-04)"
    - "deferred-items.md (or sibling doc) records permanent acceptance of the 6 pre-existing vitest failures (LIB-03/04/05 + App.restore) with rationale per CONTEXT D-02"
  test_results:
    - "npm run build succeeds"
    - "npx tsc --noEmit reports zero errors"
    - "npm test passes with vitest failure count unchanged (≤6 pre-existing failures, no new ones)"
---

# Phase 37 Plan 01 — Tech-Debt Sweep

## Context

Closes the 4 DEBT requirements that wrap up v1.8. Most of the work is already complete at planning time — this plan formalizes verification + the small mechanical cleanups that remain.

**Decisions locked in 37-CONTEXT.md:**
- **D-01** Remove unused `effectiveDimensions` imports + `@deprecated` JSDoc; do NOT delete the function
- **D-02** Document permanent acceptance of 6 pre-existing vitest failures; do NOT fix them
- **D-03** Do NOT re-enable vitest in CI
- **D-04** Backfill 29-03-SUMMARY frontmatter with `requirements: [EDIT-20]`
- **D-05** Verify GH issue label hygiene
- **D-06** Single plan, atomic commits per DEBT

---

## Task 1 — Verify DEBT-01 (GH issues closed cleanly)

**Read first:**
- `.planning/REQUIREMENTS.md` §DEBT-01
- `CLAUDE.md` GitHub Issues living-system label taxonomy

**Goal:** Confirm GH #44, #46, #50, #60 are all CLOSED, each with a closing comment that names the shipping PR/phase, and none carry an orphan `in-progress` label.

**Steps:**
1. For each issue, run `gh issue view N --json state,labels,closedAt,comments --jq '{state, labels: [.labels[].name], closing_comment: (.comments[-1].body // "" | .[0:300])}'`.
2. Verify `state == "CLOSED"` for all four.
3. Verify the labels array contains NO `in-progress`. (Discuss-time spot-check showed all clean; verify here.)
4. Verify each closing comment references the shipping phase or PR (e.g., "Shipped in Phase 28", "Shipped in Phase 29", "Shipped in Phase 31").
5. If ANY issue fails verification, fix it (remove stale label via `gh issue edit N --remove-label in-progress`; add a closing comment if missing) and re-verify.

**Acceptance criteria:**
- All 4 issues report `state: CLOSED`
- All 4 issues' label arrays exclude `in-progress`
- All 4 issues have a closing comment referencing the shipping phase/PR

**Commit:** `chore(37-01): verify DEBT-01 — GH #44/#46/#50/#60 closed cleanly`

(If verification finds nothing to fix, the commit message can read "verify only — no changes" with the audit results captured in SUMMARY.md. If a label fix is needed, name the issue + change in the message.)

---

## Task 2 — Delete orphan SaveIndicator (DEBT-02)

**Read first:**
- `src/components/SaveIndicator.tsx` (confirm it has only its own export — discuss-time check showed zero importers)

**Goal:** Remove the orphan component. Confirm zero import or JSX references remain after deletion.

**Steps:**
1. `grep -rn "SaveIndicator" src/` — capture current state. Expect ONLY `src/components/SaveIndicator.tsx:3:export default function SaveIndicator()`.
2. `git rm src/components/SaveIndicator.tsx`
3. Re-run grep — expect zero hits.
4. `npm run build` and `npx tsc --noEmit` — both must pass.

**Acceptance criteria:**
- File no longer exists
- Zero `SaveIndicator` references in `src/` after deletion
- Build + typecheck clean

**Commit:** `chore(37-01): delete orphan SaveIndicator (DEBT-02)`

---

## Task 3 — Effective-dimensions cleanup + @deprecated (DEBT-03 + D-01)

**Read first:**
- `src/types/product.ts` (lines ~38-70 for `effectiveDimensions`, line ~89 for `resolveEffectiveDims`)
- `src/canvas/snapEngine.ts` line 33 (current import)
- `src/canvas/tools/selectTool.ts` line 7 (current import)
- `src/canvas/fabricSync.ts` line 10 (current import)

**Goal:** Per D-01, remove unused `effectiveDimensions` from the 3 import sites and add `@deprecated` JSDoc on the function. Function body stays intact (REQUIREMENTS allows catalog-context callers).

**Steps:**
1. Verify zero call sites: `grep -rn 'effectiveDimensions(' src/ --include='*.ts' --include='*.tsx' | grep -v 'export function\|^//'` should return empty (or only the definition line in product.ts).
2. Edit `src/canvas/snapEngine.ts` line 33: remove `effectiveDimensions,` from the import. Keep `resolveEffectiveDims` and `resolveEffectiveCustomDims`.
3. Edit `src/canvas/tools/selectTool.ts` line 7: same removal.
4. Edit `src/canvas/fabricSync.ts` line 10: same removal.
5. Edit `src/types/product.ts` — above the `effectiveDimensions` function declaration, add a JSDoc block:
   ```ts
   /**
    * @deprecated Use {@link resolveEffectiveDims} instead. The legacy
    * `effectiveDimensions(product, scale)` form does not honor per-placement
    * `widthFtOverride` / `depthFtOverride` from Phase 31. New call sites must
    * use `resolveEffectiveDims(product, placedProduct)`. Retained only for
    * catalog-context placement-preview paths that have no `PlacedProduct` yet.
    */
   ```
6. `npm run build` + `npx tsc --noEmit` — both must pass. (TypeScript `noUnusedLocals`, if enabled, would catch any leftover unused imports.)
7. `npm test` — vitest passes with failure count ≤ 6 (unchanged).

**Acceptance criteria:**
- `grep -rn 'effectiveDimensions' src/canvas/` returns zero hits (function name is no longer imported into canvas/)
- `src/types/product.ts` shows the `@deprecated` JSDoc above the function
- Build + typecheck + vitest pass

**Commit:** `chore(37-01): mark effectiveDimensions @deprecated + drop unused imports (DEBT-03)`

---

## Task 4 — DEBT-04 frontmatter backfill + permanent-failure acceptance

**Read first:**
- `.planning/phases/29-editable-dim-labels/29-03-SUMMARY.md` (frontmatter section)
- `.planning/phases/29-editable-dim-labels/29-02-SUMMARY.md` (sibling format reference: `requirements: [EDIT-20]`)
- `.planning/phases/36-viz-10-regression/deferred-items.md` (existing precedent — append-only)

**Goal:** Two small doc edits: (a) add the missing `requirements:` line to 29-03, (b) document permanent acceptance of the 6 pre-existing vitest failures.

**Steps:**

(a) DEBT-04:
1. Open `.planning/phases/29-editable-dim-labels/29-03-SUMMARY.md`.
2. In the YAML frontmatter, add the line `requirements: [EDIT-20, EDIT-21]` — matches REQUIREMENTS DEBT-04 literal (EDIT-20 + EDIT-21) and the closest siblings 29-01 / 29-04. Note: this supersedes CONTEXT D-04's narrower `[EDIT-20]` after plan-checker review showed REQUIREMENTS expects both reqs and 29-01/29-04 (the editable-dim-label work) include both. 29-02's `[EDIT-20]`-only frontmatter was a sibling outlier, not the canonical pattern.
3. Run `node $HOME/.claude/get-shit-done/bin/gsd-tools.cjs summary-extract` from the project root and verify it enumerates `EDIT-20` AND `EDIT-21` for plan 29-03 without errors.

(b) D-02 permanent-acceptance documentation:
1. Open or create `.planning/phases/36-viz-10-regression/deferred-items.md`.
2. Append a section titled `## Permanent acceptance (Phase 37)` with:
   - The 6 failing test paths/names (LIB-03, LIB-04, LIB-05, App.restore × 3 — exact list from current `npm test` output)
   - Rationale per CONTEXT D-02: "These tests have failed across multiple phases without masking any production bug. The tests are wrong, not the code. Accepted as permanent until/unless a future phase has reason to touch the relevant production code."
   - Date: 2026-04-25
3. Confirm the doc is readable / properly formatted Markdown.

**Acceptance criteria:**
- 29-03-SUMMARY.md frontmatter contains `requirements: [EDIT-20]`
- `gsd-tools summary-extract` reports EDIT-20 for 29-03
- deferred-items.md contains the permanent-acceptance section with all 6 failures listed

**Commit:** `docs(37-01): DEBT-04 — backfill 29-03 requirements + accept 6 vitest failures permanently`

---

## Plan-level acceptance criteria

- [ ] All 4 tasks executed and committed individually
- [ ] DEBT-01..04 each have a passing verification trace in SUMMARY.md
- [ ] `npm run build` succeeds
- [ ] `npx tsc --noEmit` clean
- [ ] `npm test` failure count unchanged (≤6 pre-existing)
- [ ] No new files created beyond what's listed in `files_modified`
- [ ] No scope creep into deferred ideas (per CONTEXT.md `<deferred>`)
- [ ] SUMMARY.md created at `.planning/phases/37-tech-debt-sweep/37-01-sweep-SUMMARY.md`
- [ ] STATE.md and ROADMAP.md updated

---

*Plan: 37-01-sweep*
*Author: orchestrator-inline (gsd-planner overloaded at planning time; CONTEXT.md decisions are fully prescriptive — no judgment calls deferred)*
