# Phase 27: Upgrade Tracking - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Document the R3F v9 → drei v10 → React 19 upgrade path in `.planning/codebase/CONCERNS.md`, and update GitHub issue #56 with the plan. This phase ships **documentation only** — no `package.json` changes, no runtime code changes, no dependency bumps. Issue #56 stays OPEN as the tracking artifact; execution happens in a future phase once R3F v9 is stable.

</domain>

<decisions>
## Implementation Decisions

### Documentation Content
- **D-01:** Depth is **moderate**: current pinned versions, known blockers, upgrade sequence (R3F v9 → drei v10 → React 19), and acceptance criteria. Maps 1:1 to phase success criterion #1 without over-investing in a speculative future upgrade.
- **D-02:** Specify **specific pinned target versions** — e.g., `@react-three/fiber@^9.0.0`, `@react-three/drei@^10.0.0`, `react@^19.0.0`, `react-dom@^19.0.0`. Gives future-me a clear target; trivial to update if versions drift by execution time.
- **D-03:** Include **light external research** — quick web/GitHub check for current R3F v9 release status. Cite 1-2 authoritative links (e.g., R3F GitHub milestone/release, React 19 compatibility issue thread) so the blocker claim is traceable.

### Documentation Placement
- **D-04:** Add a **new dedicated `## R3F v9 / React 19 Upgrade` section** to `.planning/codebase/CONCERNS.md`, placed below the existing Tech Debt bulleted list. Keep the existing short "React 18 downgrade" bullet in Tech Debt as a pointer ("see § R3F v9 / React 19 Upgrade below") so that section remains scannable.

### GitHub Issue #56 Update
- **D-05:** **Add a comment** to issue #56 linking to the new CONCERNS.md section and summarizing the upgrade plan. Leave the existing issue body intact (it is already a clean summary). Issue stays OPEN.
- **D-06:** Do NOT change the milestone, labels, or assignees on #56.

### Scope Guardrails
- **D-07:** Zero `package.json` changes in this phase. A verification step should assert `git diff package.json` is empty at phase close (success criterion #3).
- **D-08:** No changes to any `src/` files. Only `.planning/codebase/CONCERNS.md` and GitHub issue #56 are touched.

### Claude's Discretion
- Exact prose/wording of the new CONCERNS.md section
- Specific headings / subsection breakdown within the new section (as long as it covers: current versions, blockers, sequence, acceptance)
- Which 1-2 research links to cite (Claude picks the most authoritative, current sources during planning/research)
- Format of the issue #56 comment (markdown body, bullet structure)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` § Phase 27: Upgrade Tracking — phase goal, depends-on, success criteria
- `.planning/REQUIREMENTS.md` § TRACK-01 — source-of-truth requirement, verifiable acceptance, linked to issue #56

### Existing Codebase Docs to Extend
- `.planning/codebase/CONCERNS.md` — target file for the new section. Existing "React 18 downgrade" bullet at the top of Tech Debt is the anchor to cross-reference.
- `.planning/codebase/STACK.md` — reference for current pinned versions of React, R3F, drei (must match what the new section cites)

### External Tracking Artifact
- GitHub issue [#56](https://github.com/micahbank2/room-cad-renderer/issues/56) — "Tracking: R3F v9 / React 19 upgrade path" — the tracking artifact that must be updated with a comment and kept OPEN

### Package Versions (Read-only — do not modify)
- `package.json` — current pinned versions: `react@^18.3.1`, `react-dom@^18.3.5`, `@react-three/fiber@^8.17.14`, `@react-three/drei@^9.122.0`, `three@^0.183.2`

### Memory
- STATE.md Phase 27 spec (memory S241): confirms documentation-only scope and no `package.json` changes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **CONCERNS.md structure** — existing file uses "Issue / Files / Impact / Fix approach" four-field bullets under a `## Tech Debt` heading. The new section does NOT have to conform (it is a larger upgrade-plan document), but the short pointer bullet that stays in Tech Debt should keep the existing field shape.
- **`gh issue comment` via the gh CLI** — standard workflow for updating issue #56. No PAT setup needed (already authenticated per recent phase work on issues #42 / #43).

### Established Patterns
- **Docs-only phases commit artifacts under `.planning/`** — no `src/` touches. Matches pattern of prior planning/research commits across Phases 24-26.
- **Phase verification uses GitHub issue state as an acceptance signal** — consistent with Phase 26's closeout of #42/#43. Here: #56 must stay OPEN at phase close.

### Integration Points
- **No runtime integration points.** This phase deliberately avoids touching any code path.

</code_context>

<specifics>
## Specific Ideas

- **Upgrade sequence is fixed:** `@react-three/fiber` v9 first → `@react-three/drei` v10 (compatible range) → then `react` + `react-dom` v19. This order is already stated in the phase success criteria and in the existing CONCERNS.md bullet; the new section should repeat it verbatim with reasoning (R3F v9 is the gatekeeper on React 19 compatibility).
- **Blocker citation:** must explicitly mention "hook errors with React 19" (the language used in existing CONCERNS.md) so the new section reinforces rather than contradicts the existing short bullet.
- **Acceptance criteria in the doc itself should mirror the issue #56 acceptance block** already on the issue (3D viewport renders, walk mode + orbit camera + textures work, all tests pass) — keeps a single source of truth.

</specifics>

<deferred>
## Deferred Ideas

- **Actually executing the upgrade** — explicitly out of scope. Belongs in a future phase (likely a new milestone after v1.5) once R3F v9 is stable.
- **Test matrix / rollback runbook** — considered under "comprehensive" doc depth; deferred because (a) the R3F v9 API surface isn't final and (b) the execution phase will author a fresh, current runbook.
- **Breaking-changes table** — same reasoning as test matrix. Wait for the execution phase.
- **Other dependency upgrades** (Vite 8→latest, Tailwind v4 minor bumps, Zustand 5→latest) — not covered by TRACK-01. Different issue, different phase.

</deferred>

---

*Phase: 27-upgrade-tracking*
*Context gathered: 2026-04-20*
