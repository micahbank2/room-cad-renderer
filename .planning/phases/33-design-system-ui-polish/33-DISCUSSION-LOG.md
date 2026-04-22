# Phase 33: Design System & UI Polish — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 33-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 33-design-system-ui-polish
**Milestone:** v1.7.5
**Areas discussed:** Sequencing, Typography ramp, Collapsible persistence, Floating toolbar scope, Library unification depth, Iconography, Ship strategy, Breaking visual changes

---

## Pre-discussion reconciliation

Before scoping, the ROADMAP.md and the v1.7.5 GH milestone were out of sync:
- ROADMAP.md had Phase 33 = "User-Uploaded Textures" (v1.7 3D Realism)
- GH milestone #8 "v1.7.5 Design System & UI Polish" had 8 UI polish issues
- STATE.md listed v1.7.5 as the active milestone

**User's choice:** Option 1 — rename Phase 33 to "Design System & UI Polish"; renumber existing 33/34/35 to 34/35/36 under v1.7 3D Realism (PARTIAL — remainder deferred). Performed mechanically in ROADMAP.md before launching discuss-phase.

---

## Sequencing strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Foundation-first | Typography + spacing tokens → rest consume canonical values | ✓ |
| Easy-wins-first | Rotation chips + gesture chip → harder items later | |
| Claude decides in planning | Defer wave ordering | |

**User's choice:** Foundation-first
**Rationale:** Typography/spacing tokens land first so later items consume canonical values, not drift again.

---

## Typography ramp depth (#83)

| Option | Description | Selected |
|--------|-------------|----------|
| 3-tier (conservative) | H2 / body / mono-label | |
| 5-tier (richer) | display / H1 / H2 / H3 / body + label | ✓ |
| Claude researches Pascal + decides | — | |

**User's choice:** 5-tier
**Rationale:** Gives planner enough vocabulary for the full app; matches Pascal's depth. UPPERCASE preserved for dynamic identifiers, status strings, and unit-value labels.

---

## Collapsible section persistence (#84)

| Option | Description | Selected |
|--------|-------------|----------|
| Session-only (Zustand uiStore) | Resets on reload | |
| localStorage | Persists across reloads per user | ✓ |

**User's choice:** localStorage
**Rationale:** Jessica reloads often; lost expand state would annoy. UI chrome, not CAD data, so bypasses undo. Key: `ui:propertiesPanel:sections`. Respects `prefers-reduced-motion`.

---

## Floating toolbar scope (#85)

| Option | Description | Selected |
|--------|-------------|----------|
| 2D only (Phase 33), 3D later | Lower risk, scope-contained | ✓ |
| Both 2D + 3D day 1 | More discoverable across views, projection math risk | |

**User's choice:** 2D only in Phase 33
**Rationale:** 3D selection anchoring requires screen-space projection math; scope creep risk. 3D toolbar deferred to backlog.

---

## Library card unification depth (#89)

| Option | Description | Selected |
|--------|-------------|----------|
| Full component extraction | Single `<LibraryCard>` + `<CategoryTabs>` used by all 5 libraries | ✓ |
| Visual-only (tokens) | Same classes, still separate components | |

**User's choice:** Full extraction
**Rationale:** Otherwise we'll drift again. Risk-managed by landing each library migration as its own PR under #89; stops if shape mismatch appears.

---

## Iconography single-library (#90)

| Option | Description | Selected |
|--------|-------------|----------|
| Lucide-only | Drop Material Symbols entirely | |
| Both (lucide + MS) | Keep MS for CAD-specific glyphs, lucide for chrome | |
| Audit first (grep + decide) | If MS < 5 sites → drop; if ≥ 5 → keep both with docs | ✓ |

**User's choice:** Audit first
**Rationale:** Data-driven. Planner runs grep before committing to either direction.

---

## Ship strategy

| Option | Description | Selected |
|--------|-------------|----------|
| One big PR (all 8 items) | One review, one visual diff, higher merge risk | |
| Incremental (1 PR per issue) | 8 PRs, safer reviews, partial-ship possible | ✓ |

**User's choice:** Incremental
**Rationale:** Smaller PRs review faster and let typography land independently from the later polish items.

---

## Breaking visual changes — behind a flag?

| Option | Description | Selected |
|--------|-------------|----------|
| Ship as-is | Jessica sees new look as it ships | ✓ |
| Feature-flag for preview | Gate typography + spacing behind a toggle | |

**User's choice:** Ship as-is
**Rationale:** Jessica is the sole user; no surprise factor, she sees progression during development.

---

## Claude's Discretion (no user decision needed)

- Specific px values within the approved 4/8/12/16/24 spacing scale
- Exact font sizes in the 5-tier ramp
- Animation timing constants (200ms ease-out baseline)
- Exact gesture chip copy wording
- Whether to extract `useReducedMotion()` hook
- Floating toolbar pixel offset from selection bbox
- Whether room tab labels share doc-title component or wrap per-tab

---

## Deferred Ideas

Moved to Phase 33 CONTEXT.md `<deferred>` section — see that file for the full list. Summary:

- 3D selection floating toolbar (follow-up backlog)
- Right-click context menu (existing issue)
- Per-node saved cameras (Tier 2)
- Auto-generated library thumbnails (separate issue #77)
- Keyboard shortcuts cheat-sheet (existing issue #72)
- In-app feedback dialog (existing issue)
- `.claude/rules/` subdirectory split (Tier 3)
- Store split (Tier 3)
- Zod runtime validation (Tier 3)
- Guide image upload (Tier 4)

---

*Log generated: 2026-04-21*
