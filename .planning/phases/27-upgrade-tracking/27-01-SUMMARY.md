---
phase: 27-upgrade-tracking
plan: 01
subsystem: docs
tags: [react, react-three-fiber, drei, three, upgrade-tracking, concerns]

# Dependency graph
requires:
  - phase: 27-upgrade-tracking
    provides: "CONTEXT.md decisions D-01..D-04, RESEARCH.md current+target versions, VALIDATION.md TRACK-01 criteria"
provides:
  - "New `## R3F v9 / React 19 Upgrade` section in `.planning/codebase/CONCERNS.md` documenting current pinned versions, target majors, locked upgrade sequence, known blockers, per-package breaking changes, affected files, acceptance criteria, and canonical citations"
  - "In-repo mirror of GitHub issue #56 tracking state so the upgrade plan persists across sessions"
affects: [27-02-PLAN (rewrite Tech Debt bullet as pointer), 27-03-PLAN (README roadmap line), future-r3f-v9-upgrade-execution-phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Documentation-only phase pattern: append new CONCERNS.md section with verbatim version strings and canonical upstream citations"

key-files:
  created: []
  modified:
    - ".planning/codebase/CONCERNS.md"

key-decisions:
  - "Placed new section between the last Tech Debt bullet (Library view filter checkboxes) and `## Known Bugs` — matches D-04 placement guidance ('below the existing Tech Debt bulleted list')"
  - "Included all three canonical citation candidates (R3F v9 guide, React 19 blog, drei releases) even though D-03 only required the first two, since the third is low-cost and satisfies RESEARCH.md §8 recommended-minimum completeness"
  - "Documented both the conceptual sequence (R3F v9 → drei v10 → React 19) and the practical single-PR install command, per RESEARCH.md §6 Option A — prevents a future executor from staging the four peer-dep bumps across separate PRs into invalid intermediate states"

patterns-established:
  - "Upgrade-tracking-in-CONCERNS.md: document deferred major-version upgrades as a structured section with Current State / Target Versions / Upgrade Sequence / Known Blockers / Per-Package Breaking Changes / Affected Files / Acceptance Criteria / Citations / Tracking subsections, mirrored against an open GitHub issue"

requirements-completed: [TRACK-01]

# Metrics
duration: ~10min
completed: 2026-04-20
---

# Phase 27 Plan 01: Document R3F v9 / React 19 Upgrade in CONCERNS.md Summary

**Appended a structured 105-line `## R3F v9 / React 19 Upgrade` section to `.planning/codebase/CONCERNS.md` capturing current pinned versions, locked target majors (`^9.0.0` R3F, `^10.0.0` drei, `^19.0.0` React), upgrade sequence, upstream blocker status, affected files, and canonical citations — no `package.json` or `src/` changes.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-20T17:55Z (approx)
- **Completed:** 2026-04-20T18:05:24Z
- **Tasks:** 1 / 1
- **Files modified:** 1

## Accomplishments

- In-repo tracking artifact for the deferred React 19 + R3F v9 + drei v10 upgrade now lives in `CONCERNS.md`, satisfying TRACK-01 success criterion #1.
- All current pinned versions verified verbatim against `package.json` at execute time (react ^18.3.1, @react-three/fiber ^8.17.14, @react-three/drei ^9.122.0, etc.) and recorded in a structured table alongside target majors.
- Locked upgrade sequence `R3F v9 → drei v10 → React 19` captured with the exact arrow character, and the practical single-PR `npm install` command is included to prevent invalid intermediate peer-dep states.
- Canonical upstream citations present: R3F v9 migration guide, React 19 release blog, drei releases.
- GitHub [issue #56](https://github.com/micahbank2/room-cad-renderer/issues/56) is linked as the persistent external tracking artifact.
- Zero changes to `package.json` (D-07) and zero changes to anything in `src/` (D-08).

## Task Commits

Each task was committed atomically:

1. **Task 1: Append new upgrade section to CONCERNS.md** — `4f7ebe5` (docs)

**Plan metadata commit:** (to be created after this SUMMARY + STATE + ROADMAP updates)

## Files Created/Modified

- `.planning/codebase/CONCERNS.md` — appended new `## R3F v9 / React 19 Upgrade` section between the last Tech Debt bullet and `## Known Bugs`. 105 insertions, 0 deletions. File grew from 172 → 276 lines.

## Decisions Made

- **Placement:** New section placed immediately after the last `## Tech Debt` bullet ("Library view filter checkboxes are non-functional") and before `## Known Bugs`. This matches D-04's "below the existing Tech Debt bulleted list" language and keeps the Tech Debt bullet list intact for plan 27-02 to later rewrite-as-pointer.
- **Sequence phrase:** Used the exact arrow character `→` (U+2192) per verify block `rg -F "R3F v9 → drei v10 → React 19"` requirement.
- **Version strings:** Kept every version string backtick-quoted and verbatim from `package.json`, never paraphrased.
- **Citations:** Included all three candidate canonical links even though only two were required minimum, since the third adds negligible cost and aids future executors.

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria in the plan's verify block passed on first run (after adjusting an `rg -E` syntax flag during verification, which was a tool-usage issue, not a deviation in output).

## Issues Encountered

- Minor: `rg -E "issues/56|#56"` failed with "unknown encoding" — ripgrep uses default PCRE2/regex without the `-E` flag. Re-ran without `-E` and the pattern matched correctly (two hits in CONCERNS.md). No impact on the output artifact.

## User Setup Required

None — documentation-only phase. No external service configuration or credentials needed.

## Verification Evidence

All acceptance criteria from the plan verify block PASSED:

- `rg -n "^## R3F v9 / React 19 Upgrade$" .planning/codebase/CONCERNS.md` → 1 match (line 91)
- `rg -c "\^9\.0\.0"` → 1 (target R3F major present)
- `rg -c "\^10\.0\.0"` → 1 (target drei major present)
- `rg -c "\^19\.0\.0"` → 4 (target React/react-dom/@types occurrences present)
- `rg -F "R3F v9 → drei v10 → React 19"` → 1 match (sequence phrase verbatim)
- `rg -F "r3f.docs.pmnd.rs/tutorials/v9-migration-guide"` → 1 match
- `rg -F "react.dev/blog/2024/12/05/react-19"` → 1 match
- `rg -F "hook errors with React 19"` → 2 matches (consistent with existing Tech Debt bullet)
- Current version strings (`^18.3.1`, `^8.17.14`, `^9.122.0`, `^18.3.18`, `^18.3.5`) all present
- `src/three/ThreeViewport.tsx` named in Affected Files
- `issues/56` reference present (2 hits)
- `git diff package.json` → empty (D-07 PASS)
- `git status --porcelain -- src/` → empty (D-08 PASS)
- `git diff --stat .planning/codebase/CONCERNS.md` → `105 insertions(+)`, 0 deletions — confirms "additions only" rule from verification block

## Self-Check: PASSED

File `.planning/codebase/CONCERNS.md` exists and contains the new section at line 91.
Commit `4f7ebe5` exists in `git log --oneline`.

## Next Phase Readiness

- Wave 1 gate complete for phase 27. Wave 2 plans `27-02` (rewrite Tech Debt "React 18 downgrade" bullet as pointer to the new section) and `27-03` (README roadmap line) are now unblocked and can proceed in parallel.
- No blockers for the future execution phase that will actually perform the upgrade — upstream ecosystem is GA-ready per RESEARCH.md §7. Execution timing is a scheduling decision, not a technical blocker.

---
*Phase: 27-upgrade-tracking*
*Completed: 2026-04-20*
