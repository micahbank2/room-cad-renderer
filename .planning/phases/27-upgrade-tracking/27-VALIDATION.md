---
phase: 27
slug: upgrade-tracking
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> **Note:** Phase 27 is documentation-only. Validation collapses to file-content assertions and `gh` CLI state checks, not a test-framework run. Traditional test sampling does not apply.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none (documentation-only phase) |
| **Config file** | none |
| **Quick run command** | `rg "## R3F v9 / React 19 Upgrade" .planning/codebase/CONCERNS.md` |
| **Full suite command** | `bash .planning/phases/27-upgrade-tracking/verify.sh` (created in Wave 0 if needed) |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run the matching grep check from the acceptance list below
- **After every plan wave:** Re-run all grep checks + `gh issue view 56 --json state`
- **Before `/gsd:verify-work`:** All 7 acceptance checks must pass
- **Max feedback latency:** ~2 seconds (grep/gh calls)

---

## Per-Task Verification Map

Populated by planner when PLAN.md is authored. Each task row lists its acceptance check.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| _TBD — planner fills this in after creating tasks_ | | | TRACK-01 | file-content | grep | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Acceptance Checks (from RESEARCH.md Validation Architecture)

1. `.planning/codebase/CONCERNS.md` contains a heading matching `## R3F v9 / React 19 Upgrade`.
2. That section mentions all three target versions (`^9.0.0`, `^10.0.0`, `^19.0.0`) and the ordering phrase `R3F v9 → drei v10 → React 19`.
3. That section cites at least one canonical link (R3F v9 migration guide or React 19 blog post).
4. The existing "React 18 downgrade" bullet in Tech Debt has been rewritten as a pointer to the new section.
5. `git diff package.json` produces no output at phase close (scope guardrail D-07).
6. `git status -- src/` shows no modifications (scope guardrail D-08).
7. GitHub issue #56 has a new comment and state is still `OPEN`.

---

## Wave 0 Requirements

- [ ] None — no test files or fixtures needed for a documentation-only phase.

*Existing infrastructure covers all phase requirements: `rg`, `git`, `gh` CLI.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Issue #56 comment readability | TRACK-01 | Human review of comment prose | After posting comment, view `gh issue view 56` and confirm the upgrade plan reads clearly |

*All other phase behaviors have automated (grep/gh) verification.*

---

## Validation Sign-Off

- [ ] All tasks have automated verify commands (grep or gh)
- [ ] Sampling continuity: every task has an inline check (no framework test run needed)
- [ ] Wave 0 not needed — no test scaffolding required
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter once planner fills Per-Task Verification Map

**Approval:** pending
