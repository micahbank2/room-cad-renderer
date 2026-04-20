---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Performance & Tech Debt
status: milestone-complete
stopped_at: Completed 27-03-PLAN.md (Phase 27 done; v1.5 milestone complete)
last_updated: "2026-04-20T18:11:29.000Z"
last_activity: 2026-04-20
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 15
  completed_plans: 15
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-17)

**Core value:** Jessica can see her future room with her actual furniture before spending money.
**Current focus:** v1.5 Performance & Tech Debt milestone complete — all 4 phases (24, 25, 26, 27) shipped.

## Current Position

Phase: 27 (complete)
Plan: — (v1.5 milestone complete; next milestone not yet scoped)
Status: v1.5 milestone complete — all 15 plans across 4 phases done
Last activity: 2026-04-20

[██████████] 100% (15/15 v1.5 plans complete; 4/4 phases complete)

## Accumulated Context

### Decisions

Full log in PROJECT.md Key Decisions table. Recent v1.4 decisions:

- Canvas inline editor pattern (Fabric dblclick → hit test → React overlay → store action) established — reusable template beyond wainscot
- Color picker NoHistory pattern (onFocus push history, onChange NoHistory) — reusable for any continuous input
- Display-vs-identifier separation in Obsidian CAD theme: spaces in display, underscores only in code keys/CSS/test IDs — locked convention
- [Phase 24]: Wave 0 scaffolding landed: toolUtils.ts (pxToFeet, findClosestWall with required minWallLength, WALL_SNAP_THRESHOLD_FT) + skipped toolCleanup.test.ts + 6-test baseline captured in VALIDATION.md
- [Phase 24-tool-architecture-refactor]: [Phase 24 Wave 1]: All 6 canvas tool files now import pxToFeet + findClosestWall from ./toolUtils — 107 net lines of duplicated helpers deleted; (fc as any) casts and module-level state intentionally preserved for Wave 2
- [Phase 24-tool-architecture-refactor]: Wave 2 atomic commit strategy — Tasks 1+2+3a as one refactor commit (85c21ae) + Task 3b as test-only commit (f8f26aa); per-tool commits would break build mid-bisect
- [Phase 24-tool-architecture-refactor]: All 18 (fc as any).__xToolCleanup casts eliminated; 4 deferred as any casts in selectTool (on useCADStore/doc per D-10) and 3 in FabricCanvas (fabric event types per D-11) preserved
- [Phase 24-tool-architecture-refactor]: [Phase 24 closed]: Wave 3 verification complete — automated gate green (2fbeb16), D-13 manual smoke user-approved 2026-04-18, ROADMAP Phase 24 marked [x] + Progress Table 4/4 Complete, CLAUDE.md cleanup-fn pattern docs updated (zero __xToolCleanup refs remain). All 3 TOOL requirements verified.
- [Phase 25-canvas-store-performance]: Phase 25 Wave 0: 7 RED/GREEN contract tests landed + dev-only window.__cadSeed/__cadBench helpers (gated by import.meta.env.DEV, tree-shaken from prod bundle). Source-level test guards adopted over jsdom runtime simulation.
- [Phase 25-canvas-store-performance]: Wave 1: cadStore.snapshot() migrated to structuredClone with toPlain(isDraft/current) helper — Immer draft Proxies are not structuredClone-able; current() normalizes before clone. Dev-gated > 2ms timing sampler added (tree-shaken in prod). PERF-02 code landed.
- [Phase 25-canvas-store-performance]: Wave 2: Drag fast path landed for 4 D-03 operations (product move incl. custom, wall move, wall endpoint, product rotation). renderOnAddRemove off, mouse:move mutates fabric obj + requestRenderAll only, mouse:up commits one store action, cleanup reverts in-flight drags. 173 -> 176 passing (+3 Wave 0 RED gates flipped: renderOnAddRemove, fast-path no-clear, drag-interrupt revert).
- [Phase 25-canvas-store-performance]: Wave 3 verification bundle assembled. PERF-01 MET (Chrome trace ~99.9% clean frames over 47.7s drag). PERF-02 D-07 contract MET (zero JSON.parse in snapshot body) but ≥2× speedup target NOT MET — measured 0.80× ratio (1.25× slower) at 50W/30P, honestly documented. Root cause: V8's JSON fast path + Immer-draft toPlain() overhead. User-visible impact zero (<0.3ms/call at 200W/100P). Two hotfixes landed during Part D smoke: Hotfix #1 (drag-survives-selection, _dragActive flag) + Hotfix #2 (tool-switch-reverts-drag, shouldSkipRedrawDuringDrag predicate). 176 -> 179 passing (+3 jsdom regression tests in tests/dragIntegration.test.ts).
- [Phase 26-bug-sweep]: FIX-01 RED confirmed Pitfall 1 (Group rebuild missing on cache onReady). Plan 26-01 must rebuild Group on image load.
- [Phase 26-bug-sweep]: FIX-02 Pitfall 4 ruled out (structuredClone preserves surfaceMaterialId). Plan 26-02 must target UI wiring or visual perception, not persistence.
- [Phase 26-bug-sweep]: FIX-01: React tick state (productImageTick) in FabricCanvas bumped by renderProducts onImageReady callback — forces Group rebuild on async image load without touching productImageCache.ts (D-02) or fabric internals (D-03 first-paint correctness)
- [Phase 26]: FIX-02 closed as Outcome A (Pitfall 3 perception-only). PLASTER #f0ebe0 vs PAINTED_DRYWALL #f5f5f5 differ by ~3 L* points — below JND. Production code path verified correct end-to-end; 4 store-integration regression guards added.
- [Phase 26-bug-sweep]: Phase 26 closed — FIX-01 fixed (Group rebuild via onImageReady/React tick); FIX-02 closed as Outcome A (perception-only, regression guards added). GitHub #42 and #43 closed per D-14. Full suite 191 passing (6 pre-existing unrelated failures unchanged). D-10 + D-12 user-approved 2026-04-20. Backlog: #60 (drag-to-resize UX), #61 (WOOD_PLANK PBR realism) filed during smoke session.
- [Phase 27-upgrade-tracking]: Plan 27-01: Appended `## R3F v9 / React 19 Upgrade` section to CONCERNS.md — documents current pins, locked target majors (^9.0.0 R3F / ^10.0.0 drei / ^19.0.0 React), sequence phrase `R3F v9 → drei v10 → React 19`, affected files, canonical citations, and links issue #56 as persistent tracker. Wave 2 (plans 27-02 + 27-03) now unblocked.
- [Phase 27-upgrade-tracking]: Tech Debt React 18 bullet rewritten as pointer to the new § R3F v9 / React 19 Upgrade section; duplicated fix content removed; issue #56 linked inline
- [Phase 27-upgrade-tracking]: Plan 27-03: Dated upgrade-plan comment posted on GH issue #56 (issuecomment-4283199813) linking to CONCERNS.md § R3F v9 / React 19 Upgrade; issue state OPEN, milestone/labels/assignees unchanged, zero repo files modified (D-05..D-08 all honored). TRACK-01 acceptance #2 satisfied. Phase 27 complete → v1.5 milestone closed (4/4 phases, 15/15 plans).

### Pending Todos

None.

### Open Blockers/Concerns

None.

### Known Gaps Carried Forward

- No VERIFICATION.md files for v1.4 phases (integration-checker substituted)
- No VALIDATION.md (Nyquist) for v1.4 phases
- Phase 22/23 SUMMARY.md files were retrofit from git history, not generated at execute-time

## Session Continuity

Last session: 2026-04-20T18:11:29.000Z
Stopped at: Completed 27-03-PLAN.md (Phase 27 done; v1.5 milestone complete)
Resume file: None
