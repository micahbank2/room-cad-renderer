---
phase: 33-design-system-ui-polish
plan: 03
subsystem: design-system
tags: [spacing, icons, reduced-motion, hooks, documentation]
requirements: ["GH #90"]
dependency_graph:
  requires:
    - "Plan 33-00 (spacing audit + useReducedMotion RED scaffolds)"
    - "Plan 33-01 (canonical spacing + radius tokens in src/index.css)"
  provides:
    - "src/hooks/useReducedMotion.ts — shared reduced-motion hook for Plans 04/06/07"
    - "4 target files have zero arbitrary spacing/radius values (Toolbar, Sidebar, PropertiesPanel, RoomSettings)"
    - "CLAUDE.md documents icon policy + canonical spacing + reduced-motion requirement"
  affects:
    - "Plans 04 (collapsible sections — consumes useReducedMotion)"
    - "Plans 06 (floating toolbar — consumes useReducedMotion)"
    - "Plans 07 (gesture chip — consumes useReducedMotion)"
tech-stack:
  added: []
  patterns:
    - "matchMedia subscription with addEventListener('change') cleanup"
    - "SSR-safe hook guards via typeof window"
key-files:
  created:
    - src/hooks/useReducedMotion.ts
  modified:
    - src/components/Toolbar.tsx
    - src/components/Sidebar.tsx
    - CLAUDE.md
decisions:
  - "Toolbar Export button: px-3 → px-4 (16px, --spacing-lg) — primary action deserves more horizontal weight vs tab-control neighbors"
  - "Tab controls + button group: px-3/gap-3 → px-2/gap-2 (8px, --spacing-sm) — compact toolbar rhythm"
  - "PropertiesPanel + RoomSettings: already compliant — no changes needed"
metrics:
  duration: "~4 minutes"
  completed: "2026-04-22"
  tasks: 3
  files_modified: 4
---

# Phase 33 Plan 03: Spacing & Hook Summary

Shipped canonical-scale spacing remaps in Toolbar/Sidebar, the shared `useReducedMotion` hook (D-39), and Phase 33 design-system documentation in CLAUDE.md. GH #90 closed.

## What Shipped

### Task 1 — useReducedMotion hook (commit c3a11cc)

`src/hooks/useReducedMotion.ts`:
- Named export returning `boolean`
- SSR-safe (`typeof window` guards on both useState initializer and effect)
- Subscribes via `addEventListener('change')` — not the deprecated `addListener`
- Removes listener on unmount
- Downstream consumers: Plans 04, 06, 07 (animation guards)

**Test:** `tests/phase33/useReducedMotion.test.ts` — 3/3 GREEN.

### Task 2 — Spacing normalization (commit 9bde92b)

Consumed Plan 01's AUDIT.md remap table. **6 sites remapped** across 2 files:

| File | Site | Before | After | Rationale |
|------|------|--------|-------|-----------|
| Toolbar.tsx:51 | Floor plan tab | `px-3 py-1` | `px-2 py-1` | 8px/4px compact tab |
| Toolbar.tsx:64 | View tabs (2d/3d/library/split) | `px-3 py-1` | `px-2 py-1` | Match sibling tabs |
| Toolbar.tsx:84 | Walk/Orbit camera toggle | `px-3 py-1` | `px-2 py-1` | Tab consistency |
| Toolbar.tsx:100 | Right-actions button group | `gap-3` | `gap-2` | 8px canonical gap |
| Toolbar.tsx:135 | Export PNG primary action | `px-3 py-1` | `px-4 py-1` | 16px primary weight |
| Sidebar.tsx:59 | Panels header | `pt-3 pb-2` | `pt-2 pb-2` | 8px vertical rhythm |

PropertiesPanel.tsx and RoomSettings.tsx already compliant — zero changes.

**Verification:**
- `tests/phase33/spacingAudit.test.ts` — 4/4 GREEN (all 4 target files zero arbitrary `p|m|gap|rounded-[Npx]`)
- `grep "\-3\b"` pattern returns zero `p-3`/`m-3`/`gap-3` matches across the 4 target files
- `npm run build` — succeeds cleanly

### Task 3 — CLAUDE.md Design System section (commit 0d3888a)

New `## Design System (Phase 33 — v1.7.5)` section inserted between Remaining Work and Project sections. Subsections:

- **Icon Policy (D-33)** — lucide-react for new chrome, Material Symbols allowlist (8 existing files)
- **Canonical Spacing + Radius (D-34)** — full token table + "12px is NOT canonical" rule
- **Typography (D-03)** — 5-tier ramp reference, mixed-case vs UPPERCASE contract
- **Reduced Motion (D-39)** — points consumers at `src/hooks/useReducedMotion.ts`

## Plan 02 Typography — NOT Regressed

Verified Plan 02's mixed-case conversions survive this plan:
- Sidebar collapsible labels still mixed-case ("Room config", "System stats", "Floor material")
- Toolbar tab labels still mixed-case ("Floor plan", "2D plan", "3D view", "Library", "Split")
- Properties / Bulk actions / Dimensions / Material / Position / Rotation h3/h4 labels unchanged

## Deviations from Plan

**None.** Plan 01's AUDIT had already scoped the exact remap list; Task 2 consumed it verbatim. The plan's broader text-size remap discussion (text-[10px] → text-sm) was not required — spacingAudit regex only targets `p|m|gap|rounded-[Npx]`, and no 12px sites remained after the 6 AUDIT-scoped changes.

## Auth Gates

None.

## Downstream Unblocked

- Plan 33-04 (collapsible sections) — can now `import { useReducedMotion } from "@/hooks/useReducedMotion"`
- Plan 33-06 (floating toolbar)
- Plan 33-07 (gesture chip)

Closes #90.

## Self-Check: PASSED

Files verified present:
- FOUND: src/hooks/useReducedMotion.ts
- FOUND: src/components/Toolbar.tsx (modified)
- FOUND: src/components/Sidebar.tsx (modified)
- FOUND: CLAUDE.md (contains "## Design System (Phase 33 — v1.7.5)", "lucide-react", "useReducedMotion")

Commits verified in git log:
- FOUND: c3a11cc feat(33-03): add useReducedMotion shared hook (D-39)
- FOUND: 9bde92b refactor(33-03): remap 12px spacing to canonical scale (GH #90)
- FOUND: 0d3888a docs(33-03): add Design System section with icon policy + spacing scale

Tests verified green:
- spacingAudit.test.ts (4/4)
- useReducedMotion.test.ts (3/3)
- typography.test.ts (passing — Plan 02 preserved)
- tokens.test.ts (passing — Plan 01 preserved)
