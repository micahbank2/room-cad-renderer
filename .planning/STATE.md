---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Performance & Tech Debt
status: Phase closed; ready for Phase 27 (Upgrade Tracking)
stopped_at: Phase 27 context gathered
last_updated: "2026-04-20T17:47:51.410Z"
last_activity: 2026-04-20
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 12
  completed_plans: 12
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-17)

**Core value:** Jessica can see her future room with her actual furniture before spending money.
**Current focus:** Phase 26 — bug-sweep

## Current Position

Phase: 27
Plan: Not started
Status: Phase closed; ready for Phase 27 (Upgrade Tracking)
Last activity: 2026-04-20

[===============] 75% (3/4 v1.5 phases complete; Phase 26 plans 4/4 done)

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

### Pending Todos

None.

### Open Blockers/Concerns

None.

### Known Gaps Carried Forward

- No VERIFICATION.md files for v1.4 phases (integration-checker substituted)
- No VALIDATION.md (Nyquist) for v1.4 phases
- Phase 22/23 SUMMARY.md files were retrofit from git history, not generated at execute-time

## Session Continuity

Last session: 2026-04-20T17:47:51.407Z
Stopped at: Phase 27 context gathered
Resume file: .planning/phases/27-upgrade-tracking/27-CONTEXT.md
