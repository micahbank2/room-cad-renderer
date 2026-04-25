# Milestones — Room CAD Renderer

## v1.9 — Polish & Feedback ✅

**Shipped:** 2026-04-25 (single-day milestone)
**Phases:** 3 (38, 39, 42) — 4 plans · 2 phases (40, 41) cancelled mid-milestone
**Files changed:** 26 files (+2,840 / −40 LOC)
**Git range:** v1.8 tag → `26340fc` (audit-close merge)
**Tag:** `v1.9`
**PRs:** #110 (Phase 38), #111 (Phase 39 prep), #112 (Phase 39 synthesis), #113 (rescope), #114 (Phase 42), #115 (audit)

**Delivered:** Smaller, more honest milestone than originally scoped. Shipped what feedback signal warranted, cancelled what it contradicted. Closed v1.8 audit AUDIT-01 (3 retroactive VERIFICATION.md backfills), gathered real-use signal from Jessica via async questionnaire (zero friction reported, zero new wishes beyond GH backlog), fixed [GH #96](https://github.com/micahbank2/room-cad-renderer/issues/96) per-surface `scaleFt` isolation bug (Ceiling.scaleFt added; CeilingMesh resolver + apply-time write + 4 new tests).

**The biggest delivery:** validating the "feedback-first" milestone sequencing pattern by acting on its own hedge. Phases 40 (CEIL-01) and 41 (TILE-01) were CANCELLED mid-milestone after Jessica's signal contradicted both hypotheses — re-deferred to Phase 999.1 + 999.3 backlogs.

**Key accomplishments:**

- **VERIFICATION.md backfill (POLISH-01)** — Phase 38 closed v1.8 AUDIT-01 carry-over with 3 retroactive verification reports (Phase 35 = passed, 36 = passed_with_carry_over, 37 = passed). Substitute evidence pattern: cross-reference SUMMARY + e2e + ROOT-CAUSE.md rather than re-running tests.
- **Real-use feedback signal (FEEDBACK-01)** — Phase 39 pivoted from in-person 50-min hybrid to async 5-question questionnaire (CONTEXT D-08) due to calendar constraints. Result: zero friction reported, all 3 Phase 35 HUMAN-UAT items confirmed, 8 GH issues curated as v2.0 scope seeds.
- **Mid-milestone re-scope** — Phase 40 + Phase 41 CANCELLED after Phase 39 contradicted hypotheses ("ceilings went fine", "texture sizing feels right"). Re-deferred to Phase 999.1 + 999.3 backlogs.
- **Per-surface `scaleFt` isolation (BUG-01 / Phase 42)** — Closed [GH #96](https://github.com/micahbank2/room-cad-renderer/issues/96). Added `Ceiling.scaleFt?: number` (mirrors Wallpaper + FloorMaterial schema convention). CeilingMesh resolver: `ceiling.scaleFt ?? entry?.tileSizeFt ?? 2`. Apply-time write in CeilingPaintSection. 4 new tests guard the invariant. No CADSnapshot version bump (implicit migration via resolver fallback).
- **Honest restraint** — Rejected Claude-roleplay-Jessica option (would generate confabulated signal). Rejected padding Phase 39 deliverable to meet ≥3 friction / ≥3 wishes thresholds. Honest absence > fabricated complaint.

**Audit:** [v1.9-MILESTONE-AUDIT.md](milestones/v1.9-MILESTONE-AUDIT.md) — `passed_with_carry_over`. AUDIT-01 recurring (v1.9 phases 38/39/42 lack VERIFICATION.md, same pattern as v1.8); AUDIT-03 (BUG-01 field name `scaleFt` vs REQUIREMENTS literal `tileSizeFt` — documented deviation); AUDIT-04 (Phase 39 thresholds not met — honest absence). All accepted with rationale.

**Tech debt carried forward:**

- AUDIT-01 (recurring) — systemic fix for VERIFICATION.md auto-generation deferred to v2.0+
- 6 pre-existing vitest failures (formally permanent per Phase 37 D-02)
- CI vitest disabled

**Backlog re-parked:**

- Phase 999.1 — Ceiling drag-resize handles (CEIL-01 from cancelled Phase 40)
- Phase 999.3 — Per-surface design-effect tile-size override (TILE-01 from cancelled Phase 41)

**v2.0 scope seeds curated (8 GH issues):**

- UX polish trio: [#97](https://github.com/micahbank2/room-cad-renderer/issues/97), [#98](https://github.com/micahbank2/room-cad-renderer/issues/98), [#99](https://github.com/micahbank2/room-cad-renderer/issues/99)
- Quick wins: [#100](https://github.com/micahbank2/room-cad-renderer/issues/100), [#101](https://github.com/micahbank2/room-cad-renderer/issues/101), [#76](https://github.com/micahbank2/room-cad-renderer/issues/76)
- Pascal competitor-insight set: [#79](https://github.com/micahbank2/room-cad-renderer/issues/79), [#80](https://github.com/micahbank2/room-cad-renderer/issues/80), [#78](https://github.com/micahbank2/room-cad-renderer/issues/78), [#77](https://github.com/micahbank2/room-cad-renderer/issues/77)
- PBR extensions: [#81](https://github.com/micahbank2/room-cad-renderer/issues/81)

---

## v1.8 — 3D Realism Completion ✅

**Shipped:** 2026-04-25
**Timeline:** 2026-04-22 → 2026-04-25 (~3 days)
**Phases:** 4 (34, 35, 36, 37) — 9 plans
**Files changed:** 121 files (+16,588 / −242 LOC)
**Git range:** Phase 34 first commit → `a2116f3` (PR #107 audit close)
**Tag:** `v1.8`
**PRs:** #93 (Phase 34), #102/#103 (Phase 36), #104 (Phase 35), #106 (Phase 37), #107 (audit + close gaps)

**Delivered:** Jessica drops a photo of any real surface (JPEG/PNG/WebP) and sees it on a wall/floor/ceiling at the right scale within seconds; switches between top-down / eye-level / 3-quarter / corner camera angles with a single keystroke and a smooth ~600ms glide; uploaded-image wallpaper and wallArt survive 2D↔3D toggles indefinitely (permanent regression guard via Playwright CI on every PR). v1.6 carry-over tech debt cleared. The "SEEING" side of Core Value reaches parity with the 2D editing side.

**Key accomplishments:**

- **User-uploaded textures (LIB-06/07/08)** — Upload UI accepts JPEG/PNG/WebP, names + real-world tile size in feet+inches, applies to walls/floors/ceilings. 2048px longest-edge client-side downscale + SHA-256 dedup to single IDB entry. Snapshots reference textures by `userTextureId` only. Orphan-deletion fallback to base hex color (no crash).
- **Camera presets (CAM-01/02/03)** — 4 lucide Toolbar buttons + bare `1`/`2`/`3`/`4` hotkeys. ~600ms easeInOutCubic tween with imperative damping toggle, live-capture cancel-and-restart, view-mode + walk-mode cleanup, reduced-motion instant-snap. Full activeElement/viewMode/cameraMode/modifier guard chain. Zero `cadStore.past` pollution + zero `useAutoSave` triggers.
- **VIZ-10 permanent regression guard** — Playwright harness across 4 surfaces × 2 projects (chromium-dev + chromium-preview production-minified) with within-run pixel-diff via pixelmatch + GitHub Actions CI. ROOT-CAUSE.md documents Branch B no-repro per R-04. All 4 Phase 32 defensive-code pieces classified KEEP. Issue #94 stays OPEN by design.
- **Tech-debt sweep (DEBT-01/02/03/04)** — Verified GH #44/#46/#50/#60 closed cleanly; deleted orphan `SaveIndicator.tsx`; finished `effectiveDimensions` migration with `@deprecated` JSDoc + 3 unused-import cleanups; backfilled Phase 29 `29-03-SUMMARY.md` frontmatter; permanently accepted 6 pre-existing vitest failures.
- **Within-run pixel-diff testing pattern** — Phase 36's redesigned spec format (cycle-N vs cycle-1 buffer baseline via `pixelmatch` + `pngjs`) sidesteps Playwright's platform-coupled stored-golden problem. Reusable for any "stability across actions" test.
- **Root-cause-before-fix discipline** — Phase 36's `depends_on: [36-01]` gate on Plan 36-02 saved a 4th speculative VIZ-10 fix attempt after three earlier Phase 32 fixes (Plans 05/06/07) failed to identify the root cause.

**Audit:** [v1.8-MILESTONE-AUDIT.md](milestones/v1.8-MILESTONE-AUDIT.md) — `passed_with_carry_over`. AUDIT-01 (3 phases lack `VERIFICATION.md`) → tech debt for v1.9+ polish cycle.

**Tech debt carried forward:**
- AUDIT-01 — backfill formal VERIFICATION.md for Phases 35/36/37
- 6 pre-existing vitest failures — formally permanent until/unless a future phase has independent reason to fix the affected production code
- CI vitest disabled (Playwright-only on PR)

**Backlog surfaced:**
- Phase 999.3 / GH #105 — per-surface texture tile-size override (design-effect scaling)

---

## v1.6 Editing UX (Shipped: 2026-04-21)

**Phases completed:** 4 phases, 17 plans, 34 tasks

**Key accomplishments:**

- Wave 0 red-state test stubs for SAVE-05 debounce + rename trigger + no-spam + save-failure persistence, and SAVE-06 silent-restore with pointer fallthrough — drives Plans 02/03 to green.
- Extends useAutoSave with a SAVE_FAILED path and a rename trigger; turns Plan 01's 4 red stubs green without touching the Phase 25 drag fast-path filter.
- Pointer-based silent restore on app mount: Jessica reloads → lands back in her last-active project. Replaces broken listProjects-based hydration; completes SAVE-05 reload-restore.
- Closes Phase 28. Per-Task Verification Map signed, full vitest suite green for Phase 28 stubs, CLAUDE.md documents the shipped auto-save hardening.
- One-liner:
- [Rule 3 – Blocker] Added `window.__openDimensionEditor` test driver (sanctioned by Plan 01 handoff).
- Plan:
- Auto-approved per orchestrator auto-mode
- Locks the SNAP-01/02/03 contract in executable form — 29 red assertions across unit + Fabric + RTL layers define what Plans 02 and 03 must deliver.
- Turns Plan 01's 25 red unit assertions green by delivering one pure-math module (`snapEngine.ts`, 427 lines) and one Fabric-side renderer (`snapGuides.ts`, 110 lines) — SNAP-01 edge math and SNAP-02 midpoint math are now implemented; Plan 03 will wire them into the drag tools.
- Lights up smart snap in the UI — dragging products/custom elements/ceilings or placing a new product now snaps edges to walls + object bboxes and auto-centers on wall midpoints, with the purple accent guides from Plan 02 rendering live during the gesture. Phase 25 drag fast-path intact; wall-endpoint drag (D-08b) untouched; all 4 Plan 01 integration tests GREEN.
- Status:
- Wave 0 TDD red-stub plan — pure test files, no production code.
- Per-axis resize override schema + edge-handle hit-test + restricted wall-endpoint snap scene + 8 placement-mutation store actions, all locked behind Wave 0 red tests turned green.
- Wave 2 wires every Wave 1 pure module into live user flows: corner+edge product resize via combined hit-test, wall-endpoint smart-snap closing Phase 30 D-08b, custom-element label override with single-undo commit, and migrates all 7 enumerated effectiveDimensions consumer sites to resolveEffectiveDims/Custom — all 4 red RTL spec files turn GREEN.
- Final phase gate: full vitest suite re-run confirms 340/346 passing (6 pre-existing LIB-03/04/05 only, documented out-of-scope), 31-VALIDATION.md signed off as nyquist_compliant=true / wave_0_complete=true / status=approved with all 8 Phase 31 test files mapped, 31-HUMAN-UAT.md created with 10 perceptual items (auto-approved), and CLAUDE.md updated with the complete Phase 31 surface — schema additions, resolver pattern, wall-endpoint smart-snap, single-undo hardening, label-override UX, new store actions, and test drivers.

---

## v1.5 — Performance & Tech Debt ✅

**Shipped:** 2026-04-20
**Timeline:** 2026-04-17 → 2026-04-20 (~3 days)
**Phases:** 4 (24, 25, 26, 27) — 15 plans — 31 tasks
**Files changed:** 18 source files (+2,322 / −826 LOC) | **LOC:** ~14,355 TypeScript
**Git range:** `38002c5` (Phase 24 Wave 0) → `6d9dafc` (v1.5 milestone audit)
**Tag:** `v1.5`

**Delivered:** Interactions feel smoother at realistic scene sizes — drag a product through 50 walls / 30 products and DevTools traces ~99.9% clean frames over 47+ seconds of active dragging. Canvas tool code is type-safe (zero `(fc as any)` casts), state-isolated in closures, and DRY (shared `toolUtils.ts`). Product thumbnails now appear in the 2D canvas the instant their image finishes loading, and the R3F v9 / React 19 upgrade path is documented end-to-end so the upgrade can be executed when upstream stabilizes.

**Key accomplishments:**

1. **Tool architecture refactor (Phase 24)** — 18 `(fc as any).__xToolCleanup` casts eliminated, all 6 tools converted to `() => void` cleanup-fn return pattern with per-activation closure state, `pxToFeet` + `findClosestWall` consolidated into `src/canvas/tools/toolUtils.ts` (107 duplicated lines deleted). 6 new listener-leak regression tests in `tests/toolCleanup.test.ts` lock the behavior. (TOOL-01/02/03)
2. **Drag fast-path (Phase 25, PERF-01)** — `renderOnAddRemove: false`, 4 drag operations (product move incl. custom, wall move, wall endpoint, product rotation) mutate Fabric only mid-drag and commit exactly once on `mouse:up`; tool-switch mid-drag reverts cleanly. DevTools trace: ~99.9% clean frames over 47.7s continuous drag at 50W/30P.
3. **structuredClone snapshots (Phase 25, PERF-02)** — `cadStore.snapshot()` migrated from 3× `JSON.parse(JSON.stringify(...))` to `structuredClone(toPlain(...))` with Immer-draft normalization + dev-gated `>2ms` timing sampler. D-07 contract met; undo/redo semantics byte-for-byte identical.
4. **Product thumbnail async-render fix (Phase 26, FIX-01)** — `productImageCache.onReady` now bumps a React tick that triggers a product Group rebuild via `renderProducts`, so thumbnails appear within one render cycle of the image load without touching cache internals. Closes GH #42.
5. **Ceiling preset material resolved (Phase 26, FIX-02)** — closed as **Outcome A (perception-only)**: PLASTER `#f0ebe0` vs PAINTED_DRYWALL `#f5f5f5` differ ~3 L* (below Just-Noticeable-Difference). End-to-end code path verified correct; 4 store-integration regression guards added to lock the `setSurfaceMaterialId` → snapshot → JSON round-trip. Closes GH #43.
6. **R3F v9 / React 19 upgrade tracking (Phase 27, TRACK-01)** — 105-line `## R3F v9 / React 19 Upgrade` section appended to `.planning/codebase/CONCERNS.md` with pinned versions, target majors (`^9.0.0` R3F / `^10.0.0` drei / `^19.0.0` React), upgrade sequence, upstream blocker status, affected files, citations. `React 18 downgrade` Tech Debt bullet rewritten as a pointer. GH #56 updated with dated upgrade-plan comment; issue stays OPEN as persistent tracker.
7. **Test baseline growth** — 168 passing → 191 passing (+23 new tests: 6 listener-leak, 7 Wave-0 contracts for PERF, 3 drag-integration for hotfixes, 4 ceiling-material persistence, 3 product-image onReady). Same 6 pre-existing unrelated failures throughout.

### Known Gaps (Accepted)

- **PERF-02 speedup target missed** — D-07 contract met (zero `JSON.parse(JSON.stringify)` in snapshot body) but the ≥2× speedup goal was not achieved at the tested scales. Measured 0.80× ratio (≈1.25× slower) at 50 walls / 30 products. Root cause: V8's JSON fast path is highly optimized, and Immer-draft `toPlain()` unwrap adds overhead. Absolute latency remains <0.3ms/call even at 200W/100P — **never user-visible**. Accepted as tech debt; documented in `milestones/v1.5-MILESTONE-AUDIT.md` and `phases/25-canvas-store-performance/25-VERIFICATION.md`. No plan to revisit unless snapshot cost becomes user-visible at future scene sizes.
- **R3F v9 / React 19 execution deferred** — documentation shipped in v1.5 (TRACK-01 complete); the upgrade itself is deferred until R3F v9 exits beta per D-02. Tracked on GH #56.
- **Traceability table drift (cosmetic)** — archive `milestones/v1.5-REQUIREMENTS.md` preserves "Pending" strings in the Traceability table for TOOL-01/02/03 and TRACK-01 even though all have `[x]` checkboxes and passed VERIFICATION.md. Audit called this out; no functional impact.

---

## v1.4 — Polish & Tech Debt ✅

**Shipped:** 2026-04-08 (archived 2026-04-18)
**Timeline:** 2026-04-06 → 2026-04-08 (~2 days)
**Phases:** 3 (21, 22, 23) — 3 plans
**Files changed:** ~40 | **LOC:** ~13,987 TypeScript
**Git range:** `0596cef` (feat 21-01) → `b330315` (fix 23 surface labels)
**Tag:** `v1.4`

**Delivered:** All deferred v1.3 verification gaps closed and every user-facing underscore label cleaned up. Jessica can double-click a wainscoted wall in the 2D canvas to edit its style and height inline, her color picker interactions produce clean single-undo entries, and the sidebar scrolls smoothly when every section is expanded. Every label in the app reads cleanly with spaces — code identifiers left untouched.

**Key accomplishments:**

1. **Undo-history fix** — `updateWallArtNoHistory` cadStore action + onFocus/onChange color picker pattern producing at most one undo entry per interaction (POLISH-04)
2. **Sidebar scroll fix** — `min-h-0` on flex-1 overflow container lets every section be expanded simultaneously without clipping (POLISH-06)
3. **Wainscot inline edit** — `WainscotPopover` component + FabricCanvas dblclick integration so users edit wainscot style/height directly on canvas, matching EDIT-06 dimension-label precedent. Single useEffect shared with dimension-label handler (no collision) (POLISH-02)
4. **Copy wall side verification** — `copyWallSide` action tested end-to-end with 3 new unit tests (POLISH-03)
5. **Label cleanup** — 4 dynamic `.replace(/\s/g, "_")` transforms removed, ~125 static underscore labels replaced across 30+ files, surface material display labels fixed. Display/identifier separation established as Obsidian CAD convention (LABEL-01, LABEL-02)
6. **Jess Feedback bug sweep (PR #39)** — 10 bugs found during v1.3 user testing fixed in parallel: welcome screen "Open Existing Project" option, wall dimensions editable after placement, ceilings draggable after placement, ceiling paint picker usable after material selection, product persistence to IndexedDB, wall Side A/B alignment between 2D and 3D

### Known Gaps (Accepted)

- **VERIFICATION.md artifacts** — not generated for phases 21, 22, 23. Integration checker (2026-04-17) substitutes for formal verification; all 6 requirements confirmed wired end-to-end.
- **VALIDATION.md (Nyquist)** — not generated for any v1.4 phase. Low priority.
- Phase 22 and 23 SUMMARY.md files were retrofit on 2026-04-17 from git history (see [v1.4-MILESTONE-AUDIT.md](milestones/v1.4-MILESTONE-AUDIT.md))

**Archives:**

- [v1.4-ROADMAP.md](milestones/v1.4-ROADMAP.md) — full phase breakdown
- [v1.4-REQUIREMENTS.md](milestones/v1.4-REQUIREMENTS.md) — 6/6 requirements validated
- [v1.4-MILESTONE-AUDIT.md](milestones/v1.4-MILESTONE-AUDIT.md) — 3-source cross-reference audit with integration verification

---

## v1.3 — Color, Polish & Materials ✅

**Shipped:** 2026-04-06
**Timeline:** 2026-04-05 → 2026-04-06 (1 day)
**Phases:** 3 (18, 19, 20) — 11 plans
**Files changed:** 72 | **LOC:** ~13,300 TypeScript (+4,738 from v1.2)
**Git range:** `94d96a4` → `cdc7dc9`
**Tag:** `v1.3`

**Delivered:** Jessica can paint any wall or ceiling with named Farrow & Ball colors, create custom hex colors, toggle lime wash finishes, and see results in both 2D and 3D. Custom elements have full edit handles, multi-select enables bulk painting, and floor/ceiling materials share a unified swatch catalog.

**Key accomplishments:**

1. **Full paint system** — 132 Farrow & Ball swatches with hue filter + name search, custom hex palette, lime wash toggle, recently-used row, paint-all-walls action (PAINT-01..07)
2. **Paint rendering** — wall and ceiling paint in both 2D floor plans (solid fill + lime wash overlay) and 3D views (PBR material with roughness) (PAINT-01/02/05)
3. **Custom element edit handles** — drag, rotate, resize placed custom elements via same interaction model as products (POLISH-01)
4. **Cmd+click multi-select** — select multiple walls in 2D, then bulk-paint with one action (POLISH-05)
5. **Sidebar UX** — collapsible sections, sidebar collapse toggle, full scroll support (POLISH-06 partial)
6. **Unified surface material catalog** — single picker for floor and ceiling texture presets, floor texture clone fix for split-view safety (MAT-01/02/03)

### Known Gaps

Accepted as tech debt for v1.4:

- **POLISH-02**: Wainscot library inline edit (code landed but not verified end-to-end)
- **POLISH-03**: Copy SIDE_A treatments to SIDE_B (copyWallSide action exists, UI button landed but not verified)
- **POLISH-04**: Per-placement frame color override (frameColorOverride type + picker landed but not verified)
- **POLISH-06**: Sidebar scroll/collapse (implemented but not fully verified on every page/view)

**Archives:**

- [v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md) — full phase breakdown
- [v1.3-REQUIREMENTS.md](milestones/v1.3-REQUIREMENTS.md) — 12/16 requirements validated (4 gaps)

---

## v1.1 — UX Fixes & Polish ✅

**Shipped:** 2026-04-05
**Timeline:** 2026-04-05 (~3.5 hours of execution)
**Phases:** 6 (Phase 6, 7, 7.1, 8, 9, 10) — 7 PRs
**Files changed:** 33 | **LOC:** ~8,562 TypeScript (from ~4,924 after v1.0 = +3,638)
**Git range:** `f51d537` → `389446b`
**Tag:** `v1.1`

**Delivered:** The app is usable without workarounds. Zoom + pan work, clicks land where you click, tools don't get stuck, live dimensions show during every drag, corners look professional, and every placed element (walls, doors, windows, products) can be edited in-place with Google-Slides-style handles.

**Key accomplishments:**

1. **2D canvas navigation** — scroll-zoom + pinch + +/- buttons + fit-to-view + `0` key (NAV-01/02/03)
2. **Placement & interaction fixes** — door/window preview, tool auto-revert, live wall length (EDIT-10/11/13)
3. **Wall rotation + product resize** — handles + live size tags, per-placement sizeScale without mutating library (EDIT-12/14)
4. **Home page redesign** — 2-CTA welcome, FLOOR_PLAN tab, template picker, floor plan upload for tracing, prominent save status, broken tabs removed (HOME-01/02/03, SAVE-04, UI-01)
5. **Wall rendering polish** — clean X-junctions, dead-end caps, mid-segment crossing caps (WALL-01/02/03)
6. **Google-Slides-style edit handles** — wall endpoints + thickness, opening slide + resize, live dim tags everywhere (EDIT-15/16/17/18/19)

**Archives:**

- [v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md) — full phase breakdown
- [v1.1-REQUIREMENTS.md](milestones/v1.1-REQUIREMENTS.md) — all 21 requirements validated
- [v1.1-MILESTONE-AUDIT.md](milestones/v1.1-MILESTONE-AUDIT.md) — audit report (PASSED)

---

## v1.0 — Room Visualization MVP ✅

**Shipped:** 2026-04-05
**Timeline:** 2026-04-04 → 2026-04-05 (2 days)
**Phases:** 6 (1, 2, 3, 4, 5, 5.1) — 23 plans
**Files changed:** 155 | **LOC:** ~4,924 TypeScript
**Git range:** `f5da5fb` → `395403a`
**Tag:** `v1.0`

**Delivered:** Jessica can upload her own products, place them in dimensionally accurate multi-room layouts, see real image textures in a 3D scene with PBR materials and soft shadows, walk through the room at eye level, and export the view as PNG — all of it auto-saved and restored on reload.

**Key accomplishments:**

1. **2D canvas made fully interactive** — async product image rendering (EDIT-09), HTML5 drag-drop placement (EDIT-07), rotation handles with 15° snap (EDIT-08), double-click editable wall dimensions (EDIT-06)
2. **Global product library** with nullable dimensions, search, and placeholder rendering — one catalog across all projects (LIB-03/04/05)
3. **3D scene coherence** — ACES tone mapping, soft shadows, procedural wood-plank floor, Environment preset, PBR materials, image-textured products (VIZ-04/06)
4. **Eye-level walkthrough** with PointerLockControls, WASD movement, walls+bounds collision, axis-slide fallback (VIZ-05)
5. **Multi-room model** — CADSnapshot v2 migration, rooms map + activeRoomId, room templates (living/bedroom/kitchen), RoomTabs + Ctrl/Cmd+Tab switching (ROOM-01/02)
6. **Auto-save + startup hydration** — 2s debounce, SaveIndicator, last-saved project restored on page reload, walk camera respawns on room switch, orbit position preserved on mode toggle (SAVE-02/03, closed via 5.1)

**Archives:**

- [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) — full phase breakdown
- [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md) — all 14 active requirements validated
- [v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md) — integration audit + gap closure record
