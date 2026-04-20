# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.5 — Performance & Tech Debt

**Shipped:** 2026-04-20
**Phases:** 4 (24, 25, 26, 27) | **Plans:** 15 | **Tasks:** 31
**Timeline:** 2026-04-17 → 2026-04-20 (~3 days)

### What Was Built
- Tool architecture refactored: 18 `(fc as any).__xToolCleanup` casts removed, closure state across all 6 tools, shared `toolUtils.ts` (TOOL-01/02/03)
- Drag fast-path: `renderOnAddRemove: false`, Fabric-only mid-drag mutation, single commit on mouse:up, ~99.9% clean frames over 47.7s (PERF-01)
- `cadStore.snapshot()` migrated to `structuredClone(toPlain(...))` with Immer-draft normalization and dev-gated timing sampler (PERF-02 partial)
- Product thumbnail async-render fix via `productImageTick` React state + Group rebuild (FIX-01, GH #42 closed)
- Ceiling preset material closed as perception-only Outcome A with 4 regression guards (FIX-02, GH #43 closed)
- R3F v9 / React 19 upgrade path documented in `CONCERNS.md` + tracked on GH #56 (TRACK-01)
- Test baseline grew 168 → 191 passing (+23 new tests across leak, contract, drag-integration, ceiling, image suites)

### What Worked
- **Wave-based plan architecture inside phases** — Phase 24 (Wave 0 scaffold → Wave 1 consolidate → Wave 2 cleanup → Wave 3 verify) and Phase 25 (Wave 0 RED tests → Wave 1 snapshot → Wave 2 drag → Wave 3 verify) kept each commit bisectable and made rollbacks cheap
- **Writing RED tests before code (Phase 25 Wave 0, Phase 26 Wave 0)** — 7 contract tests for PERF-01/02 and 2 contract tests for FIX-01/02 landed before production changes. Tests flipped GREEN as features landed; clear pass/fail signal without human judgment
- **`__cadSeed` / `__cadBench` dev-only window helpers (import.meta.env.DEV-gated, tree-shaken from prod)** — gave deterministic before/after bench numbers without polluting the production bundle. Reusable pattern for any future perf work
- **Audit-before-complete gate (`/gsd:audit-milestone`)** — surfaced PERF-02 partial credit, traceability drift, and integration wiring confidence before archival. Prevented "declare done then discover gaps" pattern
- **Honest partial-credit documentation (PERF-02)** — rather than rewriting benchmarks to hit the ≥2× target, the verification report stated the target was miscalibrated and proved absolute latency was <0.3ms. Preserves trust in future perf claims
- **Hotfixes landed within the phase (Phase 25 H1 + H2)** — selection-redraw-kills-drag and tool-switch-reverts-drag both caught during D-10 manual smoke, fixed with jsdom regression tests, merged before phase close. Zero carry-over debt
- **Outcome A (perception-only) closure (FIX-02)** — avoided chasing a non-bug; documented ~3 L* color difference as below JND with regression guards instead of invented fixes
- **Artifacts generated at execute-time, not retrofit** — unlike v1.4, every Phase 24/25/26/27 plan produced SUMMARY.md + VERIFICATION.md + VALIDATION.md during the execute step. Audit read cleanly with zero reconstruction needed

### What Was Inefficient
- **PERF-02 benchmark targets set without profiling data** — the ≥2× speedup bar was aspirational, not measurement-backed. By the time Wave 0 RED tests ran against a real scene, the target was unreachable because V8's JSON fast path is already highly optimized. Should have profiled current snapshot cost at representative scales *before* writing the target
- **Traceability table strings drifted again** — TOOL-01/02/03 and TRACK-01 rows stayed "Pending" in the table while checkboxes were `[x]` and VERIFICATION.md was PASS. Same lesson as v1.4, not fully addressed: when marking a requirement complete, also update the table row in the same commit
- **Two separate MILESTONE-AUDIT.md files at root (`v1.2-MILESTONE-AUDIT.md` + `v1.5-MILESTONE-AUDIT.md`)** — the v1.2 file should have been archived during v1.2 completion; slipped through. Clean up during next milestone-prep
- **`gsd-tools milestone complete` auto-generated MILESTONES.md entry was thin again** — same issue as v1.4: CLI produced a bulleted dump of summary one-liners without stats, git range, timeline, or traceability. Required manual rewrite to match the v1.3/v1.4 entry format. Consider fixing the CLI template or skipping the auto-generated body

### Patterns Established
- **RED-first contract tests for perf work** — write the failing test that would pass when the contract is met (e.g., "snapshot body contains zero `JSON.parse`"), land it before the migration, flip GREEN in the migration commit. Same discipline as v1.0-era TDD applied to non-functional requirements
- **Dev-only instrumentation via `import.meta.env.DEV`** — add bench helpers, timing samplers, or diagnostic handles on `window` behind the DEV gate. Vite tree-shakes the branch out in production. No prod-binary overhead, no cleanup needed
- **Partial credit as a first-class milestone state** — not every requirement is binary. `status: tech_debt` in the audit (vs `passed` or `gaps_found`) lets a milestone ship with documented acceptance instead of forcing an artificial re-plan. Outcome A closure (perception-only) is a sibling pattern for bug requirements
- **Two-wave execution strategy for docs-only phases (Phase 27)** — Wave 1 adds the new canonical section, Wave 2 rewrites pointers / posts trackers. Avoids in-flight double edits to the same file. Reusable for any documentation restructuring
- **Closure-scoped tool state with intentional module-level bridges** — `pendingProductId` and `_productLibrary` stay module-scoped per D-07 as public-API bridges; everything else lives in the `activate()` closure. Codifies the separation between "state the UI injects" and "state the activation owns"

### Key Lessons
- **Set perf targets by profiling current cost, not aspiration** — "≥2×" sounds defensible until you measure and find the current code is 0.12ms. Future perf phases should start with a Wave 0 that records baseline cost, then set targets as "current × fraction < X ms" with a user-visible threshold
- **JSON roundtrip is shockingly fast in V8** — `structuredClone` isn't a universal perf win. Use it for *correctness* (Dates, Maps, cyclic refs if ever needed) not for speed. For speed, profile first
- **Outcome A (perception-only) needs a canonical framing** — FIX-02 could have become a ritual debugging death-march if not for the Just-Noticeable-Difference framing. When a bug report describes "the button doesn't work" and the code path is verified correct, check whether the difference is perceptually resolvable before instrumenting deeper
- **Hotfixes during manual smoke are signals of test coverage gaps** — H1 (selection redraw kills drag) and H2 (tool-switch revert broken by H1) were both invisible to the jsdom test suite at smoke time. Added as regression tests in the same commit. Lesson: after landing a hot path change, manual smoke in a realistic scene is non-optional even with green CI
- **Defer upgrades behind persistent trackers** — GH #56 is a better artifact than a code comment because it survives reorganizations and accepts upstream status updates (R3F v9 beta → stable). Upgrade docs live in `CONCERNS.md` (single source of truth) with a dated GH comment as the tracker. Reusable for any dependency upgrade with external blocker

### Cost Observations
- Model mix: opus for planning + verification + audit; sonnet for executor waves; haiku rarely used
- Sessions: ~6 across 3 wall-clock days
- Notable: the research agent → planner → plan-checker → executor → verifier chain ran clean for all 4 phases with zero human intervention on gates. Yolo + balanced profile scaled well to 4 phases × 3-4 plans each
- Audit → complete-milestone flow took ~2 chapters of session time (context gathering + 3-source cross-reference + archival + retrospective). Amortizes across lessons captured — would have cost more to discover drift during v1.6 planning

---

## Milestone: v1.4 — Polish & Tech Debt

**Shipped:** 2026-04-08 (archived 2026-04-18)
**Phases:** 3 | **Plans:** 3

### What Was Built
- All 4 deferred v1.3 polish requirements verified and fixed (POLISH-02/03/04/06)
- `WainscotPopover` component + FabricCanvas dblclick integration for inline wainscot editing on 2D canvas
- `updateWallArtNoHistory` store action + onFocus/onChange color picker pattern producing clean single-undo entries
- Sidebar scroll fix via `min-h-0` on flex-1 overflow container
- Label cleanup: ~125 static labels + 4 dynamic transforms across 30+ files, code identifiers preserved
- 10 Jess Feedback bugs fixed in parallel via PR #39 (user-testing regressions from v1.3)

### What Worked
- **Phase sizing was right** — each phase scoped to one cohesive concern (verification, inline edit, labels) unlike v1.3's over-broad Phase 19
- **Three-commit split for label cleanup** — dynamic transforms → static labels → surface materials. Each commit independently revertable, easier to review
- **Extending existing dblclick useEffect** instead of adding a second one avoided handler collision with dimension-label editor (reuse beats parallel handlers)
- **Color picker onFocus pattern** — realized React `onChange` fires like native events so `onBlur` misses initial state. `onFocus` captures one snapshot per interaction
- **Parallel bug fix PR** (#39) alongside planned phases — 10 regression fixes landed without blocking the milestone plan

### What Was Inefficient
- **Phases 22 and 23 shipped without generating SUMMARY.md files** — code merged, artifacts skipped. Required 2026-04-17 retrofit from git history during milestone audit. Root cause: running work through direct execution instead of `/gsd:execute-phase` for the final phases
- **REQUIREMENTS.md traceability drifted from shipped state** — POLISH-02, LABEL-01, LABEL-02 stayed `[ ]` Pending even after PRs merged. Milestone PR #40 updated roadmap checkboxes but missed requirements table
- **No VERIFICATION.md for any v1.4 phase** — integration checker ended up substituting, but that's a fallback, not a target pattern
- **CLI-generated MILESTONES.md entry was too thin** — had to manually rewrite to match the richer v1.3/v1.2/v1.1 entry style. The auto-generated 3-bullet version loses the stats, git range, and per-requirement traceability

### Patterns Established
- **Canvas inline editor pattern** — Fabric dblclick → hit test → React overlay state → popover component → store action → 2D/3D re-render. Matches EDIT-06 dimension editor; now a reusable template
- **Color picker NoHistory pattern** — `onFocus` calls history-pushing action, `onChange` calls NoHistory variant. Reusable for any continuous-input (slider, range, etc.)
- **Display-vs-identifier separation** (Obsidian CAD convention) — spaces in display text, underscores only in code keys/CSS classes/test IDs/data attrs. Locked as naming rule

### Key Lessons
- **SUMMARY.md must be generated at execute-time, not retrofit** — the retrofit path works but loses granularity (task timings, deviation notes, issues encountered) that only exist in-the-moment
- **Traceability tables rot silently** — when marking milestone checkboxes in ROADMAP.md, always update REQUIREMENTS.md traceability in the same commit
- **Audit trail debt is real** — `/gsd:audit-milestone` surfaces it, but the cost of fixing later > cost of doing it at execute-time. Worth stricter gates before declaring a milestone shipped
- **Integration checker is a decent substitute but not equivalent to VERIFICATION.md** — it confirms wiring but doesn't capture the per-requirement evidence tables that formal verification provides

### Cost Observations
- Model mix: primarily sonnet for execution, opus for planning/audit
- Retrofit session (2026-04-17): 1 audit + 2 SUMMARY writes + REQUIREMENTS reconciliation + archival
- Notable: The PR #39 Jess Feedback sweep was cheaper than expected because all 10 bugs had narrow blast radius — parallel inline fixes beat sequential phase planning for regression-class work

---

## Milestone: v1.3 — Color, Polish & Materials

**Shipped:** 2026-04-06
**Phases:** 3 | **Plans:** 11

### What Was Built
- Full paint system with 132 Farrow & Ball colors, custom hex palette, lime wash finish, recently-used row
- Paint rendering in 2D (solid fill + lime wash pattern) and 3D (PBR material with roughness)
- Custom element edit handles (drag, rotate, resize) matching product interaction model
- Cmd+click multi-select with bulk paint actions for walls
- Collapsible sidebar sections + sidebar collapse toggle
- Unified surface material catalog for floors and ceilings with swatch picker

### What Worked
- **Phase 18 (paint system) was the smoothest execution yet** — 4 plans shipped cleanly with verified user approval of all 7 PAINT requirements
- **Unified catalog pattern** — creating `surfaceMaterials.ts` once and having both floor and ceiling pickers share it eliminated duplication
- **History-boundary drag pattern** reused effectively for custom element interactions (proven in v1.0, reapplied in v1.3)
- **Yolo mode** kept throughput high — auto-approving scope gates cut overhead without missing issues

### What Was Inefficient
- **Phase 19 verification gap** — code for POLISH-02/03/04 landed but requirements were marked incomplete because visual verification was skipped for those specific features
- **Phase 19 scope was too broad** — mixing 6 different polish items (handles, inline edit, copy-side, frame override, multi-select, sidebar) in one phase made it hard to verify each one individually
- **Summary extraction from gsd-tools failed** — CLI returned "One-liner:" placeholders instead of actual content, requiring manual fix of MILESTONES.md

### Patterns Established
- **Mutual exclusion pattern** for surface states (paintId clears surfaceMaterialId and vice versa) — clean UX, should apply to future material additions
- **SurfaceMaterialPicker swatch grid** — reusable for any future material type
- **CollapsibleSection** file-scoped component pattern for sidebar-only widgets

### Key Lessons
1. **Verification plans should be per-requirement, not per-phase** — Phase 19's bulk verification missed individual features
2. **Polish phases should be smaller** — 2-3 requirements max per phase, each with clear verification criteria
3. **The paint system proves that a rich catalog (F&B) drives more engagement than blank-slate custom creation** — consider catalog-first approach for future material types

### Cost Observations
- Model mix: ~80% opus, ~20% sonnet (via GSD agents)
- Sessions: ~4 across 2 days
- Notable: 11 plans in 3 phases completed in under 1 day of wall-clock time

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 6 | 23 | Foundation — wave-based parallelization established |
| v1.1 | 6 | ~7 | Smaller plans, focused scopes |
| v1.2 | 7 | ~8 | Element-type phases, per-side architecture |
| v1.3 | 3 | 11 | Catalog-driven features, verification gaps exposed |
| v1.4 | 3 | 3 | Polish & verification of deferred v1.3 items; audit-retrofit pattern |
| v1.5 | 4 | 15 | RED-first perf tests, dev-only instrumentation, partial-credit as first-class state |

### Top Lessons (Verified Across Milestones)

1. **Store-driven rendering (Zustand → Fabric/Three) is load-bearing** — every milestone has validated this pattern without regressions
2. **Module-level async caches prevent double-fetch bugs** — proven across images (v1.0), textures (v1.0), floor materials (v1.2), paint colors (v1.3)
3. **Verification checkpoints catch real issues** — Phase 18's 18-04 verification found zero issues; Phase 19's 19-05 found sidebar scroll + text size bugs that got fixed. The phases that skip verification are the ones with lingering gaps.
4. **Execute-time artifacts beat retrofit every time** — v1.5 produced SUMMARY/VERIFICATION/VALIDATION at plan close; v1.4 retrofitted them during audit. v1.5's audit read cleanly; v1.4's required archaeology. Same lesson verified across two milestones now.
5. **Manual smoke in realistic scenes remains non-optional for hot-path work** — v1.5 H1 + H2 hotfixes proved that jsdom green ≠ production green when interactions cross component boundaries (Fabric event → store → React re-render → DOM). Budget smoke time into every phase that touches the canvas.
