# Phase 27: Upgrade Tracking - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 27-upgrade-tracking
**Areas discussed:** Doc depth, Placement, Versions, Research, Issue #56 update

---

## Doc depth

| Option | Description | Selected |
|--------|-------------|----------|
| Moderate | Current pinned versions, known blockers, upgrade sequence (R3F v9 → drei v10 → React 19), acceptance criteria. Matches phase success criteria 1:1 without over-investing. | ✓ |
| Minimal stub | Just bullets: current versions + blocker note + sequence. Shortest — risks under-specifying acceptance. | |
| Comprehensive | Moderate + rollback notes, breaking-changes table, test matrix, verification plan. More work; may become stale before execution. | |

**User's choice:** Moderate (Recommended)
**Notes:** Recommended option selected — downstream planner should mirror the issue #56 acceptance block inside the new section so there's a single source of truth.

---

## Placement

| Option | Description | Selected |
|--------|-------------|----------|
| New dedicated section | Add '## R3F v9 / React 19 Upgrade' section below the existing Tech Debt list. Keeps the short existing bullet as a pointer. | ✓ |
| Expand existing bullet in place | Replace the current 'React 18 downgrade' bullet with an expanded version. Keeps under 'Tech Debt' but makes that bullet much longer than neighbors. | |

**User's choice:** New dedicated section (Recommended)
**Notes:** Keep the existing short bullet in Tech Debt but rewrite it as a pointer to the new section to preserve scannability.

---

## Versions

| Option | Description | Selected |
|--------|-------------|----------|
| Specific pinned targets | Cite concrete target versions (e.g., @react-three/fiber@^9, @react-three/drei@^10, react@^19). Clear goal; easy to update. | ✓ |
| Version-agnostic | 'Latest stable R3F v9 / drei v10 / React 19 at execution time' with no version numbers. Ages better but vaguer. | |

**User's choice:** Specific pinned targets (Recommended)
**Notes:** Cite `^9.0.0` / `^10.0.0` / `^19.0.0` — revise during execution phase if versions drift.

---

## Research

| Option | Description | Selected |
|--------|-------------|----------|
| Light research | Quick web search for R3F v9 release status, cite 1-2 authoritative links. | ✓ |
| Just restate CONCERNS.md | No external research — paraphrase 'hook errors with React 19'. | |
| Deep research | Read R3F v9 changelog, drei v10 compatibility notes, React 19 migration guide; cite specific breaking changes. Likely overkill. | |

**User's choice:** Light research (Recommended)
**Notes:** Priority links: R3F GitHub milestone/release notes, React 19 compatibility issue thread. Claude picks best sources during research/planning.

---

## Issue #56 update

| Option | Description | Selected |
|--------|-------------|----------|
| Comment with plan | Leave existing body intact; add comment linking to new CONCERNS.md section with full plan. Preserves history; stays OPEN. | ✓ |
| Replace body + comment | Rewrite issue body with full upgrade plan and add a short comment noting the update. | |
| Replace body only | Just rewrite the issue body; no comment. Cleanest final state; loses audit trail. | |

**User's choice:** Comment with plan (Recommended)
**Notes:** Issue #56 stays OPEN as the tracking artifact. No milestone/label/assignee changes.

---

## Claude's Discretion

- Exact prose of the new CONCERNS.md section
- Subsection structure within the new section (required coverage: current versions, blockers, sequence, acceptance)
- Which 1-2 specific external links to cite
- Format/structure of the issue #56 comment

## Deferred Ideas

- Actually executing the upgrade — future phase after R3F v9 stabilizes
- Test matrix / rollback runbook — defer to execution phase
- Breaking-changes table — defer to execution phase
- Unrelated dependency upgrades (Vite, Tailwind, Zustand) — not in TRACK-01
