# Roadmap: Room CAD Renderer

## Milestones

- ✅ **v1.0 Room Visualization MVP** — Phases 1–5.1 (shipped 2026-04-05) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 UX Fixes & Polish** — Phases 6–10 (shipped 2026-04-05) — see [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 New Element Types** — Phases 11–17 (shipped 2026-04-05) — see [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Color, Polish & Materials** — Phases 18–20 (shipped 2026-04-06) — see [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Polish & Tech Debt** — Phases 21–23 (shipped 2026-04-08) — see [milestones/v1.4-ROADMAP.md](milestones/v1.4-ROADMAP.md)
- 🔄 **v1.5 Performance & Tech Debt** — Phases 24–27 (in progress)

---

## Completed Milestones

<details>
<summary>✅ v1.0 Room Visualization MVP (Phases 1–5.1) — SHIPPED 2026-04-05</summary>

6 phases, 23 plans. Core loop: global product library → 2D floor plans → textured 3D rendering → eye-level walkthrough → PNG export → auto-saved. See [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md).

</details>

<details>
<summary>✅ v1.1 UX Fixes & Polish (Phases 6–10) — SHIPPED 2026-04-05</summary>

6 phases, 7 PRs, 21 requirements. Zoom/pan, click accuracy, tool auto-revert, live dimensions, wall rotation, product resize, corner-perfect wall rendering, edit handles for every element, home page redesign, prominent save. See [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md).

</details>

<details>
<summary>✅ v1.2 New Element Types (Phases 11–17) — SHIPPED 2026-04-05</summary>

7 phases, 8 PRs, 29 requirements. Ceilings, floor materials, wallpaper, wall art, wainscoting, crown molding, custom elements, framed art library, 7 wainscoting styles with live 3D preview, per-side wall treatments. See [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md).

</details>

<details>
<summary>✅ v1.3 Color, Polish & Materials (Phases 18–20) — SHIPPED 2026-04-06</summary>

3 phases, 11 plans, 12/16 requirements. Full paint system (132 F&B + custom hex + lime wash), custom element edit handles, multi-select + bulk paint, collapsible sidebars, unified surface material catalog. See [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md).

</details>

<details>
<summary>✅ v1.4 Polish & Tech Debt (Phases 21–23) — SHIPPED 2026-04-08</summary>

3 phases, 3 plans, 6/6 requirements. Deferred v1.3 verification (copy-side, frame color override, sidebar scroll) plus `updateWallArtNoHistory` undo-history fix, wainscot inline-edit popover on 2D canvas, underscore cleanup across 30+ files with display/identifier separation. See [milestones/v1.4-ROADMAP.md](milestones/v1.4-ROADMAP.md).

</details>

---

## v1.5 Performance & Tech Debt

**Milestone goal:** Make the app feel smoother as scenes grow and close the highest-friction tech debt and bug debt before adding more features.

### Phases

- [x] **Phase 24: Tool Architecture Refactor** — Eliminate `as any` casts, move state to closures, extract shared utilities (shipped 2026-04-18)
- [ ] **Phase 25: Canvas & Store Performance** — Incremental canvas updates, faster cadStore snapshots
- [ ] **Phase 26: Bug Sweep** — Fix async product images in 2D canvas and ceiling preset material path
- [ ] **Phase 27: Upgrade Tracking** — Document R3F v9 / React 19 upgrade path

### Phase Details

### Phase 24: Tool Architecture Refactor
**Goal**: Tool code is type-safe, state-isolated, and DRY — no `as any` casts on Fabric instances, no module-level singletons, no duplicated coordinate utilities
**Depends on**: Nothing (internal refactor, no new features)
**Requirements**: TOOL-01, TOOL-02, TOOL-03
**Success Criteria** (what must be TRUE):
  1. `ripgrep "(fc as any)" src/canvas/tools/` returns zero matches
  2. No `const state = {...}` declarations at module scope in any tool file — all mutable tool state lives inside the activate closure
  3. A single `src/canvas/tools/toolUtils.ts` exists and all 6 tool files import `pxToFeet` from it (door/window additionally import `findClosestWall`) — zero local duplicates (updated from 5 to 6 per phase-24 D-02; v1.4 added ceilingTool after the requirement was written)
  4. Rapid tool switching (select → wall → door → window → product → ceiling, 10x fast) produces no event listener leaks (Chrome DevTools memory snapshot confirms stable listener count; automated `tests/toolCleanup.test.ts` guard)
  5. Full test suite passes with same failure set as baseline (171 tests total; 165 passing pre-refactor → 171 passing post-refactor including 6 new listener-leak cases; 6 pre-existing unrelated failures unchanged — baseline recorded in 24-VALIDATION.md)
**Plans**: 4 plans
  - [x] 24-01-wave0-scaffolding-PLAN.md — Create toolUtils.ts + toolCleanup.test.ts scaffold; capture pre-existing test-failure baseline
  - [x] 24-02-wave1-consolidate-helpers-PLAN.md — All 6 tools import pxToFeet from toolUtils; door/window import findClosestWall (TOOL-03)
  - [x] 24-03-wave2-cleanup-pattern-PLAN.md — Cleanup-fn return pattern + closure state in all 6 tools; FabricCanvas.tsx dispatch update; un-skip leak tests (TOOL-01, TOOL-02)
  - [x] 24-04-wave3-verification-PLAN.md — Final automated gate + D-13 manual smoke + docs update (ROADMAP, CLAUDE.md)

### Phase 25: Canvas & Store Performance
**Goal**: Dragging in a complex scene sustains 60fps and cadStore undo snapshots are measurably faster
**Depends on**: Phase 24 (tool files stabilized before canvas hot path is touched)
**Requirements**: PERF-01, PERF-02
**Success Criteria** (what must be TRUE):
  1. Chrome DevTools Performance trace: dragging a product through a 50-wall / 30-product scene shows sustained 60fps (no frame drops below 16.7ms/frame)
  2. `structuredClone()` replaces every `JSON.parse(JSON.stringify(...))` call in `cadStore.ts` — zero JSON roundtrips in snapshot code
  3. Snapshot timing measured before/after: ≥2x improvement at 50 walls / 30 products (logged to console in dev mode)
  4. Undo/redo still produces single history entries for completed drag mutations — no regression in history boundary behavior
  5. All 115 tests pass with identical visual output
**Plans**: 4 plans
  - [ ] 25-00-wave0-validation-scaffolding-PLAN.md — 7 RED contract tests + window.__cadSeed/__cadBench dev helpers
  - [ ] 25-01-wave1-structured-clone-PLAN.md — snapshot() uses structuredClone + dev-gated timing (PERF-02)
  - [ ] 25-02-wave2-drag-fast-path-PLAN.md — drag fast path for 4 ops + renderOnAddRemove: false (PERF-01)
  - [ ] 25-03-wave3-verification-PLAN.md — Chrome trace + bench ratio + ROADMAP update

### Phase 26: Bug Sweep
**Goal**: Product thumbnails appear in 2D canvas after placement and ceiling preset materials render correctly in 3D
**Depends on**: Nothing (both bugs are isolated to specific files; can run in parallel with Phase 24/25 but grouped here for clean PR)
**Requirements**: FIX-01, FIX-02
**Success Criteria** (what must be TRUE):
  1. Place a product with an uploaded image — thumbnail appears in 2D canvas within one render cycle (no placeholder-only render)
  2. Project reload shows product images in 2D canvas without any re-trigger or user action
  3. Select a ceiling preset material in the ceiling panel — the 3D ceiling mesh visibly changes to that material
  4. Preset material selection persists across project save/reload (not reset to default hex on load)
**Plans**: TBD

### Phase 27: Upgrade Tracking
**Goal**: R3F v9 / React 19 upgrade path is documented and the blocking issue is tracked so it can be executed when R3F v9 stabilizes
**Depends on**: Phase 25 (want final v1.5 perf baseline recorded before noting upgrade target)
**Requirements**: TRACK-01
**Success Criteria** (what must be TRUE):
  1. `.planning/codebase/CONCERNS.md` contains an R3F v9 / React 19 section with: current pinned versions, known blockers (hook errors with React 19), and the upgrade sequence (R3F v9 → drei v10 → React 19)
  2. GitHub issue #56 is updated with the documented upgrade plan and stays open as the tracking artifact
  3. No version bumps are made in `package.json` — this phase is documentation only
**Plans**: TBD

### Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 24. Tool Architecture Refactor | 4/4 | Complete    | 2026-04-19 |
| 25. Canvas & Store Performance | 0/? | Not started | - |
| 26. Bug Sweep | 0/? | Not started | - |
| 27. Upgrade Tracking | 0/? | Not started | - |
