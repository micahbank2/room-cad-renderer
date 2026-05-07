---
phase: 71-token-foundation-token-foundation
plan: "03"
subsystem: chrome-css
tags: [token-migration, css-cleanup, pascal-aesthetic]
dependency_graph:
  requires: ["71-01"]
  provides: ["obsidian-custom-classes-removed"]
  affects: ["PropertiesPanel", "Toolbar", "WallCutoutsDropdown", "WainscotPopover", "MyTexturesList", "WelcomeScreen", "StatusBar", "PropertiesPanel.OpeningSection", "LibraryCard", "MaterialCard", "FloatingSelectionToolbar", "GestureChip"]
tech_stack:
  added: []
  patterns: ["bg-card border border-border (replaces glass-panel)", "border border-border/50 (replaces ghost-border)"]
key_files:
  created: []
  modified:
    - src/components/PropertiesPanel.tsx
    - src/components/Toolbar.tsx
    - src/components/Toolbar.WallCutoutsDropdown.tsx
    - src/components/WainscotPopover.tsx
    - src/components/MyTexturesList.tsx
    - src/components/WelcomeScreen.tsx
    - src/components/StatusBar.tsx
    - src/components/PropertiesPanel.OpeningSection.tsx
    - src/components/library/LibraryCard.tsx
    - src/components/MaterialCard.tsx
    - src/components/ui/FloatingSelectionToolbar.tsx
    - src/components/ui/GestureChip.tsx
decisions:
  - "D-03 replacement table applied exactly: glass-panel → bg-card border border-border; ghost-border → border border-border/50; accent-glow → deleted (no replacement); cad-grid-bg → no occurrences in runtime src found"
  - "D-04 honored: Obsidian frosted-blur + purple-glow signature look intentionally killed; one-way commitment"
  - "Comment in FloatingSelectionToolbar.tsx updated from 'glass-panel mini-toolbar' to 'flat-card mini-toolbar' to prevent semantic drift"
metrics:
  duration_minutes: 8
  completed_date: "2026-05-07"
  tasks_completed: 1
  files_changed: 12
---

# Phase 71 Plan 03: Custom Class Removal Summary

Stripped the four Obsidian custom CSS classes (`glass-panel`, `ghost-border`, `accent-glow`, `cad-grid-bg`) from all 12 runtime source files — replacing with Pascal flat-card Tailwind equivalents per D-03, and honoring D-04's one-way commitment to kill the Obsidian frosted-blur + purple-glow aesthetic.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Strip glass-panel + ghost-border + accent-glow from 12 files | 759418b | 12 files |

## Replacement Decisions Per File

| File | Classes Removed | Replacement Applied |
|------|----------------|---------------------|
| `PropertiesPanel.tsx` (3 sites) | `glass-panel` | `bg-card border border-border` |
| `Toolbar.tsx` header | `ghost-border` | `border border-border/50` |
| `Toolbar.tsx` cutaway button | `accent-glow` | deleted (no replacement per D-03) |
| `Toolbar.tsx` ToolPalette | `glass-panel` | `bg-card border border-border` |
| `Toolbar.WallCutoutsDropdown.tsx` | `glass-panel ghost-border` | `bg-card border border-border` |
| `WainscotPopover.tsx` | `glass-panel ghost-border` | `bg-card border border-border` |
| `MyTexturesList.tsx` | `ghost-border` | `border border-border/50` |
| `WelcomeScreen.tsx` (2 sites) | `ghost-border` | `border border-border/50` |
| `StatusBar.tsx` | `ghost-border` | `border border-border/50` |
| `PropertiesPanel.OpeningSection.tsx` | `ghost-border` | `border border-border/50` |
| `LibraryCard.tsx` | `ghost-border` | `border border-border/50` |
| `MaterialCard.tsx` | `ghost-border` | `border border-border/50` |
| `FloatingSelectionToolbar.tsx` | `glass-panel` | `bg-card border border-border` |
| `GestureChip.tsx` | `glass-panel` | `bg-card border border-border` |

Note: `cad-grid-bg` had zero runtime `.tsx`/`.ts` usages — the class definition was already removed in Plan 71-01 and no component referenced it directly.

## Deviations from Plan

None — plan executed exactly as written. The RESEARCH §File Inventory listed 13 files but one (`cad-grid-bg`) had no runtime className usages; the actual sweep covered 12 component files with 19 total replacement sites across 4 class names.

## Verification

- `grep -rn "glass-panel|ghost-border|accent-glow|cad-grid-bg" src/` → **0 matches**
- `npm run build` → **exits 0** (warnings pre-existing, not introduced)
- `npm run test:quick` → 10 files failing, 880 passing — **same baseline as pre-change** (confirmed via git stash round-trip; no regressions introduced)
- `src/canvas/grid.ts` (Fabric canvas grid data) → untouched per RESEARCH §Pitfall #5

## Self-Check: PASSED

- All 12 modified files confirmed changed via git diff
- Commit 759418b exists: `git log --oneline | grep 759418b` → confirmed
- grep audit clean: 0 remaining occurrences
