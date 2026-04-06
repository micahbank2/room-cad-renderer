# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

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
