# Phase 37: Tech-Debt Sweep — Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Final cleanup phase before v1.8 milestone close. Closes the four DEBT requirements (DEBT-01/02/03/04) with verification + trivial deletion + frontmatter backfill. The work is small enough to ship as a single plan; most items are already complete and need verification only.

**In scope:**
- Verify GH #44/#46/#50/#60 are CLOSED with PR-reference comments (DEBT-01) — already true at discuss time, just confirm + label hygiene
- Delete orphan `src/components/SaveIndicator.tsx` (DEBT-02)
- Remove unused `effectiveDimensions` imports from 3 files; mark the function `@deprecated` (DEBT-03)
- Backfill `requirements: [EDIT-20]` in `.planning/phases/29-editable-dim-labels/29-03-SUMMARY.md` (DEBT-04)
- Document permanent acceptance of 6 pre-existing vitest failures (LIB-03/04/05 + App.restore)

**Out of scope:**
- Fixing the 6 pre-existing vitest failures (deferred permanently — see D-02)
- Re-enabling vitest in CI (predicated on fixing the failures, which is out of scope)
- Removing the `effectiveDimensions` function entirely (deprecation only, per D-01)
- Any new feature work, refactor not in DEBT-01..04
</domain>

<decisions>
## Implementation Decisions

### Effective-dimensions cleanup depth
- **D-01:** Remove unused `effectiveDimensions` imports from `src/canvas/snapEngine.ts`, `src/canvas/tools/selectTool.ts`, `src/canvas/fabricSync.ts` (current usage count: 0 in each — confirmed via grep). Leave the `effectiveDimensions` function defined in `src/types/product.ts`, but add an `@deprecated` JSDoc tag on the function declaration pointing developers to `resolveEffectiveDims`.
- **Reason:** Cheap signal, prevents future re-introduction without forcing us to audit catalog-context callers right now. REQUIREMENTS.md DEBT-03 explicitly allows "catalog-context usages" of `effectiveDimensions` (places that compute library dims with no `PlacedProduct` to resolve against). Removing the function entirely would force a deeper audit; deprecation is the lighter touch.

### Pre-existing vitest failures
- **D-02:** Document permanent acceptance of the 6 pre-existing vitest failures (LIB-03/04/05 + App.restore) in `.planning/phases/36-viz-10-regression/deferred-items.md` (or wherever the existing deferred-items doc lives). Do NOT attempt to fix them in this phase.
- **Reason:** Those failures have surfaced in every CI run for several phases. If they masked real bugs, behavior would have broken visibly by now — it hasn't. The tests are wrong, not the production code. Trying to fix them is scope creep on a final-cleanup phase. Honest documentation > more deferral.

### CI vitest re-enable
- **D-03:** Do NOT re-enable vitest in CI as part of Phase 37. The e2e workflow stays Playwright-only (Phase 36-02 decision).
- **Reason:** Re-enabling would require fixing the 6 deferred failures first (D-02 says no). Local `npm test` discipline + Playwright on PR is the current contract; no observed problem with that contract.

### Phase 29 frontmatter backfill
- **D-04:** Add `requirements: [EDIT-20, EDIT-21]` to `.planning/phases/29-editable-dim-labels/29-03-SUMMARY.md` frontmatter. Other Phase 29 SUMMARY files (29-01, 29-02, 29-04) already have the `requirements` field — no further backfill needed.
- **Reason:** 29-03 was the PropertiesPanel parser prop change supporting the editable-dim-label feature. REQUIREMENTS DEBT-04 literally names "EDIT-20 / EDIT-21". Closest siblings 29-01 and 29-04 both use `[EDIT-20, EDIT-21]`; 29-02 uses `[EDIT-20]` only but is the outlier. Matching the REQUIREMENTS literal + canonical siblings keeps the milestone-close audit clean. (Initial draft of D-04 used `[EDIT-20]` only; revised after plan-checker review surfaced the literal-vs-sibling-2 mismatch.)

### GH issue label hygiene
- **D-05:** Verify no `in-progress` labels remain on #44/#46/#50/#60. Spot-check at discuss time confirmed no `in-progress` labels visible — verification step in plan should re-confirm and remove any if found.
- **Reason:** REQUIREMENTS DEBT-01 explicitly names "no orphan in-progress labels remain on these issues."

### Plan structure
- **D-06:** Single plan (`37-01-sweep-PLAN.md`) covering all 4 DEBT items. No wave split needed — work is sequential/atomic and total scope is ~30 minutes of code changes.
- **Reason:** DEBT-01..04 are independent but trivially small. A multi-plan split would add ceremony with zero parallelism benefit. Pattern: one task per DEBT requirement, each commits independently.

### Claude's Discretion
- Exact `@deprecated` JSDoc wording — pick whatever is idiomatic
- Whether to delete the unused-import lines surgically or run a Prettier/ESLint pass — pick whichever produces a cleaner diff
- Where to record the permanent vitest-failure acceptance (existing deferred-items.md vs new doc) — planner picks based on existing convention
- Whether to add a vitest test asserting `SaveIndicator` is gone (probably overkill; build passing is enough proof)

</decisions>

<specifics>
## Specific Ideas

- **Verification > work:** This phase is mostly "confirm what's already true, then do small mechanical cleanups." The plan should structure each task as `verify current state → make change → re-verify`. No exploratory implementation needed.
- **Atomic commits per DEBT:** Each DEBT requirement gets its own commit. SaveIndicator deletion + import cleanup + Phase 29 backfill + deferred-items doc update should each land separately so the milestone-close audit can trace each requirement to a single SHA.
- **Use existing tooling for verification:**
  - `gh issue view N --json state,labels` for DEBT-01 verification
  - `npm run build && npx tsc --noEmit` for DEBT-02/03 (catches dangling references + unused imports if `noUnusedLocals` is on)
  - `node $HOME/.claude/get-shit-done/bin/gsd-tools.cjs summary-extract` for DEBT-04 (per spec)
- **Phase 29 frontmatter format must match siblings:** 29-02-SUMMARY uses `requirements: [EDIT-20]` (single bracket-list). Use that exact form on 29-03.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §v1.8 → Tech-Debt Sweep (DEBT) — DEBT-01/02/03/04 acceptance criteria
- `.planning/ROADMAP.md` §Phase 37 — scope statement

### Existing files to read / modify
- `src/types/product.ts` — `effectiveDimensions` definition (lines ~38-70), `resolveEffectiveDims` definition (line ~89). Mark `effectiveDimensions` `@deprecated`.
- `src/components/SaveIndicator.tsx` — orphan to delete
- `src/canvas/snapEngine.ts` line 33 — unused `effectiveDimensions` import
- `src/canvas/tools/selectTool.ts` line 7 — unused `effectiveDimensions` import
- `src/canvas/fabricSync.ts` line 10 — unused `effectiveDimensions` import
- `.planning/phases/29-editable-dim-labels/29-03-SUMMARY.md` — frontmatter to backfill
- Existing deferred-items doc (likely `.planning/phases/36-viz-10-regression/deferred-items.md`) — permanent vitest-failure acceptance

### GitHub issues to verify
- [#44](https://github.com/micahbank2/room-cad-renderer/issues/44) (Auto-save CAD scene with debounce — Phase 28)
- [#46](https://github.com/micahbank2/room-cad-renderer/issues/46) (Editable dimension labels — Phase 29)
- [#50](https://github.com/micahbank2/room-cad-renderer/issues/50) (Per-placement label override — Phase 31)
- [#60](https://github.com/micahbank2/room-cad-renderer/issues/60) (Drag-to-resize — Phase 31)

### Locked conventions
- CLAUDE.md GitHub Issues living-system rules (label taxonomy, closing-comment expectations)
- Phase 36 deferred-items.md format (existing precedent for documenting accepted-as-permanent test failures)
- Phase 29 sibling SUMMARY frontmatter format (single-line `requirements: [EDIT-20]` bracket-list)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `gh` CLI for issue state/label verification — already used throughout the project
- `gsd-tools.cjs summary-extract` — DEBT-04's named verification command

### Established Patterns
- **Atomic commits per requirement** — every prior phase commits each task separately so SHAs map 1:1 to changes
- **Deferred-items.md as the home for accepted-permanent failures** — Phase 36 established this; reuse rather than invent

### Integration Points
- `src/types/product.ts` — adds `@deprecated` JSDoc only; no signature change, no behavior change
- 3 import sites in canvas/ — surgical line removals
- Phase 29 SUMMARY — frontmatter-only edit
- Existing deferred-items doc — append-only

</code_context>

<deferred>
## Deferred Ideas

- **Fix the 6 pre-existing vitest failures** — explicit out-of-scope per D-02. If a future phase has reason to touch LIB-03/04/05 or App.restore, revisit then.
- **Remove `effectiveDimensions` function entirely** — D-01 keeps it with `@deprecated`. If a future phase confirms zero callers (including catalog-context placement preview), remove it then.
- **Re-enable vitest in CI** — predicated on D-02 being reversed. Not happening this milestone.
- **General CI/CD modernization** (Node 24 upgrade, action versions, etc.) — not DEBT-flagged, out of scope.

</deferred>

---

*Phase: 37-tech-debt-sweep*
*Context gathered: 2026-04-25*
