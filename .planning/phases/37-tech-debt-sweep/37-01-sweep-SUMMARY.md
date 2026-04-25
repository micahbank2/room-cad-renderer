---
phase: 37-tech-debt-sweep
plan: 01
subsystem: tech-debt
tags: [tech-debt, debt-01, debt-02, debt-03, debt-04, milestone-close]
requirements: [DEBT-01, DEBT-02, DEBT-03, DEBT-04]
dependency-graph:
  requires:
    - GH issues #44/#46/#50/#60 already shipped + closed in earlier phases (Phase 28/29/31)
    - Phase 31 effectiveDimensions → resolveEffectiveDims migration mostly complete
    - Phase 36 deferred-items.md as the canonical home for accepted-permanent failures
  provides:
    - DEBT-01 verified: 4 GH issues confirmed CLOSED with proper closing comments + no orphan in-progress labels
    - DEBT-02: orphan SaveIndicator.tsx deleted (zero importers confirmed pre + post)
    - DEBT-03: 3 unused effectiveDimensions imports removed; @deprecated JSDoc added on the function definition
    - DEBT-04: 29-03-SUMMARY.md frontmatter backfilled with requirements: [EDIT-20, EDIT-21]
    - D-02 deliverable: deferred-items.md gained "Permanent acceptance (Phase 37)" section closing the 6-failure question
  affects:
    - none beyond declared files_modified
tech-stack:
  added: []
  patterns:
    - "@deprecated JSDoc to signal API replacement without breaking existing callers"
    - "permanent-acceptance documentation pattern for pre-existing test failures (alternative to indefinite deferral)"
key-files:
  created:
    - .planning/phases/37-tech-debt-sweep/37-01-sweep-SUMMARY.md
  deleted:
    - src/components/SaveIndicator.tsx
  modified:
    - src/types/product.ts
    - src/canvas/snapEngine.ts
    - src/canvas/tools/selectTool.ts
    - src/canvas/fabricSync.ts
    - .planning/phases/29-editable-dim-labels/29-03-SUMMARY.md
    - .planning/phases/36-viz-10-regression/deferred-items.md
decisions:
  - DEBT-04 frontmatter form revised mid-plan from `[EDIT-20]` to `[EDIT-20, EDIT-21]` per plan-checker review (matches REQUIREMENTS DEBT-04 literal + closest siblings 29-01/29-04). 29-02's narrower `[EDIT-20]` is the outlier.
  - effectiveDimensions function body left intact per CONTEXT D-01 — REQUIREMENTS allows catalog-context callers. @deprecated JSDoc points future readers to resolveEffectiveDims.
  - 6 pre-existing vitest failures (LIB-03/04/05 + App.restore × 3) accepted as permanent in deferred-items.md per CONTEXT D-02. Future phases that touch the affected production files should fix the corresponding test as part of their scope, not standalone.
  - CI vitest stays disabled (Phase 36-02 decision unchanged). Local npm test discipline + Playwright on PR remains the contract.
deviations:
  - Plan was authored inline by orchestrator (gsd-planner subagent unavailable due to API overload at planning time). All decisions sourced from CONTEXT.md which was fully prescriptive — no judgment calls deferred.
  - Plan was executed inline by orchestrator (instead of gsd-executor subagent) due to recurring quota / overload issues with subagent runs. Phase scope (4 mechanical tasks, ~30 min) made inline execution efficient.
  - 29-03-SUMMARY.md needed FULL frontmatter block (no YAML existed), not just a single requirements line. Wrote the full block modeled on 29-02. Marked the backfill date in the frontmatter for audit trail.
verification:
  manual:
    - gh issue view 44 / 46 / 50 / 60 — all CLOSED with proper closing-comment phase references and no orphan in-progress labels
    - grep -rn SaveIndicator src/ — zero hits
    - grep -rn 'effectiveDimensions(' src/ — only the @deprecated JSDoc reference remains (no live call sites)
    - 29-03-SUMMARY.md frontmatter present with requirements: [EDIT-20, EDIT-21]
    - deferred-items.md "Permanent acceptance" section present
  automated:
    - npm run build — succeeds
    - npx tsc --noEmit — clean (pre-existing baseUrl deprecation warning is unrelated)
    - npm test — 6 failed / 533 passed (matches pre-existing baseline; no new regressions)
    - gsd-tools summary-extract on 29-03-SUMMARY.md — runs without errors
  human-uat:
    - none — this phase is doc + dead-code cleanup with no UI surface
test-results:
  build: succeeds
  typecheck: clean (1 pre-existing deprecation warning unrelated to phase)
  unit: 6 failed / 533 passed / 3 todo — same as pre-Phase-37 baseline
  e2e: not run (no UI changes; not in plan acceptance)
---

# Phase 37 Plan 01 — Tech-Debt Sweep — SUMMARY

## What shipped

Final v1.8 cleanup. All 4 DEBT requirements closed with atomic commits.

| Requirement | Outcome | Commit |
|-------------|---------|--------|
| DEBT-01 | 4 GH issues verified CLOSED with proper closing comments + no orphan labels | `cc37e2a` (verify-only, --allow-empty) |
| DEBT-02 | Orphan `SaveIndicator.tsx` deleted (zero importers) | `00a104c` |
| DEBT-03 | 3 unused imports removed; `@deprecated` JSDoc added on `effectiveDimensions` | `e207ef4` |
| DEBT-04 | 29-03-SUMMARY frontmatter backfilled; deferred-items.md gained permanent-acceptance section | `6f28711` |

## Commits

- `cc37e2a` chore(37-01): verify DEBT-01 — GH #44/#46/#50/#60 closed cleanly
- `00a104c` chore(37-01): delete orphan SaveIndicator (DEBT-02)
- `e207ef4` chore(37-01): mark effectiveDimensions @deprecated + drop unused imports (DEBT-03)
- `6f28711` docs(37-01): DEBT-04 — backfill 29-03 requirements + accept 6 vitest failures permanently

## Phase scope vs deferred

Strict scope discipline held. None of the deferred items from CONTEXT.md were silently planned in:
- 6 pre-existing vitest failures: documented as permanent acceptance, NOT fixed (D-02)
- `effectiveDimensions` function: `@deprecated` JSDoc only, NOT removed (D-01)
- CI vitest re-enable: NOT done (D-03)
- General CI/CD modernization: NOT done (out of scope)

## Status

v1.8 milestone is now feature-complete: phases 32 / 33 / 34 / 35 / 36 / 37 all complete. Ready for milestone close once Phase 37 PR merges.
