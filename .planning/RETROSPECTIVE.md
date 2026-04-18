# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

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

### Top Lessons (Verified Across Milestones)

1. **Store-driven rendering (Zustand → Fabric/Three) is load-bearing** — every milestone has validated this pattern without regressions
2. **Module-level async caches prevent double-fetch bugs** — proven across images (v1.0), textures (v1.0), floor materials (v1.2), paint colors (v1.3)
3. **Verification checkpoints catch real issues** — Phase 18's 18-04 verification found zero issues; Phase 19's 19-05 found sidebar scroll + text size bugs that got fixed. The phases that skip verification are the ones with lingering gaps.
