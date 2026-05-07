---
phase: 72-primitives-shelf
plan: "07"
subsystem: ui-primitives
tags: [migration, animation, design-system]
dependency_graph:
  requires: ["72-03"]
  provides: ["PropertiesPanel PanelSection migration", "CollapsibleSection removal"]
  affects: ["src/components/PropertiesPanel.tsx", "tests/phase33/collapsibleSections.test.ts"]
tech_stack:
  added: ["motion/react (AnimatePresence + motion.div)", "class-variance-authority (Button)"]
  patterns: ["PanelSection spring-animated collapse", "Button primitive CVA variants"]
key_files:
  created:
    - src/components/ui/PanelSection.tsx
    - src/components/ui/Button.tsx
    - src/components/ui/index.ts
    - src/lib/cn.ts
    - src/lib/motion.ts
  modified:
    - src/components/PropertiesPanel.tsx
    - tests/phase33/collapsibleSections.test.ts
  deleted:
    - src/components/ui/CollapsibleSection.tsx
decisions:
  - "Sidebar.tsx uses its own local CollapsibleSection (inline function) — intentionally not migrated per plan scope comment"
  - "face direction buttons migrated to Button variant=ghost with active prop for cleaner state"
  - "SavedCameraButtons migrated to Button variant=ghost preserving all data-testid and aria attributes"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-07"
  tasks: 2
  files: 8
---

# Phase 72 Plan 07: PropertiesPanel → PanelSection + Button Summary

PropertiesPanel fully migrated from CSS max-height CollapsibleSection to spring-animated PanelSection (motion/react), with key buttons migrated to Button primitive.

## What Was Built

All 11 `CollapsibleSection` usages in `PropertiesPanel.tsx` replaced with `PanelSection` (identical props — mechanical swap). Key buttons migrated to `Button` primitive with semantic variants. Old `CollapsibleSection.tsx` deleted. Phase 33 structural test updated to assert PanelSection.

## Tasks

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Migrate PropertiesPanel to PanelSection + Button | c77faed | PropertiesPanel.tsx, PanelSection.tsx, Button.tsx, index.ts, cn.ts, motion.ts |
| 2 | Update structural test + delete CollapsibleSection | 042be1e | collapsibleSections.test.ts, (deleted) CollapsibleSection.tsx |

## Deviations from Plan

### Auto-added Prerequisites

**[Rule 3 - Blocking] Created supporting primitives not present in this worktree**
- **Found during:** Task 1 setup — PanelSection.tsx, Button.tsx, motion.ts, cn.ts not present in this worktree branch
- **Fix:** Created all 4 files using exact implementations from peer worktrees (agent-a3f5990120e32a3a6 for PanelSection/motion.ts, agent-a6ba4de01b74768b3 for Button.tsx/cn.ts)
- **Files created:** src/components/ui/PanelSection.tsx, src/components/ui/Button.tsx, src/lib/motion.ts, src/lib/cn.ts, src/components/ui/index.ts
- **Rationale:** These are wave-2 plan outputs (72-03, 72-02) that run in parallel worktrees; this plan (72-07 wave-3) depends on them per `depends_on: ["72-03"]`

## Self-Check

### Files exist:
- [x] src/components/ui/PanelSection.tsx — FOUND
- [x] src/components/ui/Button.tsx — FOUND
- [x] src/components/PropertiesPanel.tsx — FOUND (modified)
- [x] tests/phase33/collapsibleSections.test.ts — FOUND (updated)
- [x] src/components/ui/CollapsibleSection.tsx — DELETED (confirmed)

### Commits exist:
- [x] c77faed — FOUND
- [x] 042be1e — FOUND

### Tests:
- [x] `npx vitest run tests/phase33/collapsibleSections.test.ts` — 4/4 PASSED
- [x] `npm run build` — SUCCESS

### Zero CollapsibleSection imports in src/:
- [x] CONFIRMED — grep returns 0 functional import results

## Self-Check: PASSED
