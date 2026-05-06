---
gsd_state_version: 1.0
milestone: v1.17
milestone_name: Library + Material Engine
status: "Defining requirements"
last_updated: "2026-05-06T22:15:00.000Z"
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-06 — v1.16 archived; v1.17 Library + Material Engine queued next)

**Core value:** Jessica can see her future room with her actual furniture before spending money.
**Current focus:** v1.17 Library + Material Engine — first new core data system since v1.2; materials become first-class with metadata + unified surface application

## Current Position

Phase: Not started (defining requirements)
Milestone: v1.17 Library + Material Engine
Phases: 4 (67, 68, 69, 70) — 0 complete
Plan: —
Status: Defining requirements
Last activity: 2026-05-06 — Milestone v1.17 started

## v1.17 Roadmap (provisional — finalized after roadmapper)

| Phase | Requirement | Goal | Status |
|-------|-------------|------|--------|
| 67 | MAT-ENGINE-01 | Material engine foundation — texture maps + metadata + IDB persistence (#25) | Pending |
| 68 | MAT-APPLY-01 | Material application system — unified surface picker (#27) | Pending |
| 69 | MAT-LINK-01 | Product-to-material linking — finish slot on placed products (#26) | Pending |
| 70 | LIB-REBUILD-01 | Library rebuild — Materials / Assemblies / Products top-level toggle (#24) | Pending |

## Recent Milestones

- **v1.16 Maintenance Pass** — shipped 2026-05-06 (4 phases, audit `passed-with-notes`)
- **v1.15 Architectural Toolbar Expansion** — shipped 2026-05-06 (4 phases, audit `passed`)
- **v1.14 Real 3D Models** — shipped 2026-05-05 (4 phases, audit `passed`)
- **v1.13 UX Polish Bundle** — shipped 2026-04-28 (2 phases)

## Accumulated Context

- v1.16 carry-over notes: monitor DEBT-06 vitest cascade pattern; observed once during audit re-run, not blocking.
- StrictMode useEffect cleanup pattern (CLAUDE.md #7) applies to any new module-level registry writes — relevant if Phase 67/68 introduces material-registry bridges.
- Phase 32 user-texture pipeline is the architectural template for Phase 67 (SHA-256 dedup, IDB store, real-world tile size convention).
- Snapshot version chain: currently v5 (Phase 62 MEASURE-01). Each v1.17 phase that touches stored CAD state likely needs a version bump + migration.

## Next Step

Run requirements gathering and roadmap creation, then `/gsd:discuss-phase 67` to scope Phase 67 (MAT-ENGINE-01).
