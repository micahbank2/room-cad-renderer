# Phase 38: VERIFICATION.md Backfill — Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Retroactively author `VERIFICATION.md` for Phases 35, 36, 37 — each missing one despite shipping. Closes v1.8 audit's AUDIT-01 carry-over.

**In scope:**
- Three new docs: `35-VERIFICATION.md`, `36-VERIFICATION.md`, `37-VERIFICATION.md`
- Cross-reference existing SUMMARY files, e2e specs, ROOT-CAUSE.md as substitute evidence
- Match the format of `34-VERIFICATION.md` (the one Phase 34 has)

**Out of scope:**
- Re-running e2e tests / re-deriving evidence (use what's already on the record)
- Backfilling VERIFICATION.md for any earlier phase (only the v1.8 trio per AUDIT-01)
- Fabricating verification not actually performed — if evidence is missing, document the gap honestly
</domain>

<decisions>
## Implementation Decisions

### Format reference
- **D-01:** Mirror `34-VERIFICATION.md` exactly — same frontmatter shape (`phase`, `verified`, `status`, `score`, `re_verification`), same section structure (Goal Achievement → Observable Truths → Required Artifacts → Key Link Verification → Data-Flow Trace → Behavioral Spot-Checks).
- **Reason:** Consistency with the one VERIFICATION.md that exists. Avoids inventing a new format mid-milestone.

### Verification dates
- **D-02:** `verified` field carries the actual date these are written (2026-04-25), NOT the original shipping date. Add a `note: "retroactively authored — substitute evidence from SUMMARY + e2e + ROOT-CAUSE.md"` flag in the `re_verification` block to make the retrofit explicit.
- **Reason:** Truthfulness. These are not fresh verifications; they're audit-trail backfills.

### Status values
- **D-03:** `status: passed` for Phase 35 (12/12 e2e green; CAM-01/02/03 acceptance fully met) and Phase 37 (DEBT-01/02/03/04 all closed with evidence). `status: passed_with_carry_over` for Phase 36 (VIZ-10 outcome is no-repro Branch B per R-04 — not a fix; permanent regression guard shipped instead; issue #94 stays OPEN by design).
- **Reason:** Honest read of each phase's actual outcome. Phase 36's no-repro is explicitly anticipated by R-04 in the original plan, so it's a passed outcome of the planned process — but the underlying VIZ-10 question stays open, so `passed_with_carry_over` is the truthful label.

### Evidence sourcing
- **D-04:** For each phase, evidence comes from these existing artifacts (cite by relative path, don't duplicate content):
  - **Phase 35**: `35-01-structure-SUMMARY.md`, `35-02-motion-SUMMARY.md`, 5 preset e2e specs in `tests/e2e/specs/preset-*.spec.ts`, unit tests in `src/three/cameraPresets.test.ts`
  - **Phase 36**: `36-01-SUMMARY.md`, `36-02-SUMMARY.md`, `ROOT-CAUSE.md`, 4 surface e2e specs (`wallpaper-`/`wallart-`/`floor-`/`ceiling-*-toggle.spec.ts`), CI workflow `.github/workflows/e2e.yml`
  - **Phase 37**: `37-01-sweep-SUMMARY.md`, the 4 atomic commits (cc37e2a / 00a104c / e207ef4 / 6f28711), `deferred-items.md` permanent-acceptance section
- **Reason:** Substitute evidence is sufficient per v1.8 audit's AUDIT-01 disposition. Linking instead of copying keeps the docs honest and small.

### Plan structure
- **D-05:** Single plan, three tasks (one per VERIFICATION.md). Each task is a single commit. ~30 minutes total.
- **Reason:** Pure mechanical doc work. No code changes, no test runs, no decisions deferred.

### Claude's Discretion
- Exact phrasing of "Observable Truths" bullets — pick from each phase's must_haves
- Whether to include a "Data-Flow Trace" table (Phase 34's has one) — only if the phase actually has data flowing across components; otherwise skip the section honestly rather than fabricate
- Score format (`8/8 must-haves verified` vs `passed (no must_haves table — substitute via SUMMARY frontmatter)`) — pick whichever is most truthful per phase

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before authoring:**

### Format reference
- `.planning/phases/34-user-uploaded-textures/34-VERIFICATION.md` — the canonical template. Match its structure.

### Phase 35 evidence sources
- `.planning/phases/35-camera-presets/35-CONTEXT.md` (D-01..D-07 locked decisions)
- `.planning/phases/35-camera-presets/35-RESEARCH.md` (technical approach)
- `.planning/phases/35-camera-presets/35-01-structure-SUMMARY.md` (Wave 1 outcome)
- `.planning/phases/35-camera-presets/35-02-motion-SUMMARY.md` (Wave 2 outcome)
- `tests/e2e/specs/preset-*.spec.ts` (5 spec files, 12 tests)
- `src/three/cameraPresets.test.ts` (6 unit tests)

### Phase 36 evidence sources
- `.planning/phases/36-viz-10-regression/36-CONTEXT.md`
- `.planning/phases/36-viz-10-regression/36-RESEARCH.md`
- `.planning/phases/36-viz-10-regression/ROOT-CAUSE.md` (no-repro Branch B per R-04)
- `.planning/phases/36-viz-10-regression/36-01-SUMMARY.md`
- `.planning/phases/36-viz-10-regression/36-02-SUMMARY.md`
- `.planning/phases/36-viz-10-regression/deferred-items.md`
- `.github/workflows/e2e.yml`
- `tests/e2e/specs/{wallpaper,wallart,floor,ceiling}-*-toggle.spec.ts`

### Phase 37 evidence sources
- `.planning/phases/37-tech-debt-sweep/37-CONTEXT.md`
- `.planning/phases/37-tech-debt-sweep/37-01-sweep-PLAN.md`
- `.planning/phases/37-tech-debt-sweep/37-01-sweep-SUMMARY.md`
- Commits: `cc37e2a` (DEBT-01 verify), `00a104c` (DEBT-02 SaveIndicator delete), `e207ef4` (DEBT-03 @deprecated), `6f28711` (DEBT-04 frontmatter + permanent-acceptance)

### Requirements
- `.planning/REQUIREMENTS.md` §POLISH-01 (acceptance criteria)
- `.planning/milestones/v1.8-MILESTONE-AUDIT.md` AUDIT-01 (the gap this closes)

</canonical_refs>

<deferred>
## Deferred Ideas

- **Earlier-phase VERIFICATION.md backfill** — Phase 30 / 31 / etc. also lack formal VERIFICATION.md but were not flagged in v1.8 audit. Out of scope for Phase 38 (only the AUDIT-01 trio).
- **Programmatic VERIFICATION.md generator** — a `gsd-tools` subcommand that scaffolds VERIFICATION.md from SUMMARY + acceptance criteria. Worth considering but not in scope.

</deferred>

---

*Phase: 38-verification-backfill*
*Context gathered: 2026-04-25*
