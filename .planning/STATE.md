---
gsd_state_version: 1.0
milestone: v1.17
milestone_name: Library + Material Engine
status: executing
last_updated: "2026-05-07T10:38:40.843Z"
last_activity: 2026-05-07
progress:
  total_phases: 9
  completed_phases: 1
  total_plans: 8
  completed_plans: 7
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-06 — v1.16 archived; v1.17 Library + Material Engine roadmap finalized)

**Core value:** Jessica can see her future room with her actual furniture before spending money.
**Current focus:** Phase 68 — material-application-system-mat-apply-01

## Current Position

Phase: 68 (material-application-system-mat-apply-01) — EXECUTING
Milestone: v1.17 Library + Material Engine
Phases: 4 (67, 68, 69, 70) — 1 complete
Plan: 6 of 7
Status: Ready to execute
Last activity: 2026-05-07

## Decisions

- **D-09 RESOLVED (Phase 67):** wrapper architecture confirmed. Material stores `utex_`-prefixed colorMapId references into the existing userTextureStore (Phase 34 pipeline) rather than owning blobs directly. Phase 68 surface renderers consume Material via the existing pbrTextureCache plumbing — zero new texture-cache code needed for apply.
- [Phase 68-material-application-system-mat-apply-01]: Plan 05: Convex-only floor footprint for v1.17 (walk wall.start points); non-convex rooms degrade gracefully without crash. True wall-graph traversal deferred to Phase 70+.
- [Phase 68-material-application-system-mat-apply-01]: Plan 05: Ceiling 2D fabric fill intentionally deferred — ceilings remain outlines in top-down view per RESEARCH Q5.
- [Phase 68-material-application-system-mat-apply-01]: FACE_ORDER physically-correct mapping ([+X=east, -X=west, +Y=top, -Y=bottom, +Z=north, -Z=south]) over material.ts JSDoc that had +Z=top — material.ts comment cleanup deferred
- [Phase 68-material-application-system-mat-apply-01]: FloorMesh receives floorMaterialId/floorScaleFt as new props from RoomGroup; keeps FloorMesh deterministic vs reading from cadStore
- [Phase 68-material-application-system-mat-apply-01]: Plan 06: Mid-pick preview NOT enabled in v1.17 — single click applies, single Ctrl+Z reverts. Documented in MaterialPicker file header for v1.18 reconsideration.
- [Phase 68-material-application-system-mat-apply-01]: Plan 06: Floor MaterialPicker relocated from Sidebar.tsx into RoomSettings.tsx to honor plan acceptance criteria AND group floor material with room dimensions.

## Performance Metrics

| Phase-Plan | Duration | Tasks | Files | Date |
|---|---|---|---|---|
| 67-01 | ~25min | 3 | 13 (6 src + 6 tests + 1 mod) | 2026-05-07 |
| Phase 68 P01 | 6m | 2 tasks | 6 files |
| Phase 68-material-application-system-mat-apply-01 P03 | 10m | 2 tasks | 4 files |
| Phase 68-material-application-system-mat-apply-01 P05 | 358s | 2 tasks | 4 files |
| Phase 68-material-application-system-mat-apply-01 P04 | 25min | 3 tasks | 9 files |
| Phase 68-material-application-system-mat-apply-01 P06 | 14min | 2 tasks | 6 files |

## v1.17 Roadmap

| Phase | Requirement | Goal | Status |
|-------|-------------|------|--------|
| 67 | MAT-ENGINE-01 | Material engine foundation — texture maps + metadata + IDB persistence (#25) | Complete |
| 68 | MAT-APPLY-01 | Material application system — unified surface picker (#27) | Pending |
| 69 | MAT-LINK-01 | Product-to-material linking — finish slot on placed products (#26) | Pending |
| 70 | LIB-REBUILD-01 | Library rebuild — Materials / Assemblies / Products top-level toggle (#24) | Pending |

## Recent Milestones

- **v1.16 Maintenance Pass** — shipped 2026-05-06 (4 phases, audit `passed-with-notes`)
- **v1.15 Architectural Toolbar Expansion** — shipped 2026-05-06 (4 phases, audit `passed`)
- **v1.14 Real 3D Models** — shipped 2026-05-05 (4 phases, audit `passed`)
- **v1.13 UX Polish Bundle** — shipped 2026-04-28 (2 phases)

## Accumulated Context

- v1.16 carry-over notes: monitor DEBT-06 vitest cascade pattern; observed once during audit re-run, not blocking. Captured as potential Phase 999.5 (DEBT-07) if it reappears in v1.17 PR audits.
- StrictMode useEffect cleanup pattern (CLAUDE.md #7) applies to any new module-level registry writes — relevant if Phase 67/68 introduces material-registry bridges.
- Phase 32 user-texture pipeline is the architectural template for Phase 67 (SHA-256 dedup, IDB store, real-world tile size convention, 25MB cap, 2048px longest-edge downscale).
- Snapshot version chain: currently v5 (Phase 62 MEASURE-01). Phases 68 + 69 likely each need a version bump + migration; Phase 67 isolates new entity to its own store and skips snapshot impact.
- Phase 31 D-02 placement-instance separation pattern (override fields on PlacedProduct, not Product) is the template for Phase 69's `finishMaterialId` slot.
- Phase 33 CategoryTabs primitive is reused by Phase 70 library tabs.
- v1.17 sequencing locked: Foundation (67) → Apply (68) → Link (69) → UI Surface (70). Each phase ships independently; Phase 67 alone has user value (uploaded materials persist, ready for Phase 68 apply).

## Next Step

Run `/gsd:verify-work` to gate Phase 67 — confirm all 5 success criteria, run e2e Playwright suite (`npx playwright test tests/e2e/specs/material-upload.spec.ts`), and validate Pattern #7 / D-09 wrapper architecture before promoting to Phase 68.
