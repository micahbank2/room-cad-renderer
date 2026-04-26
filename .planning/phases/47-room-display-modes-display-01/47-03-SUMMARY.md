---
phase: 47-room-display-modes-display-01
plan: "03"
subsystem: toolbar-display-modes
tags: [toolbar, display-modes, lucide-icons, tdd-green, wave-1, DISPLAY-01]
dependency_graph:
  requires: [47-01, 47-02]
  provides: [Toolbar-displayMode-UI, DISPLAY-01-user-facing]
  affects: [e2e/display-mode-cycle.spec.ts]
tech_stack:
  added: [lucide LayoutGrid, lucide Square, lucide Move3d]
  patterns: [segmented-control, viewMode-gate, DISPLAY_MODES-config-constant]
key_files:
  created: []
  modified:
    - src/components/Toolbar.tsx
decisions:
  - "Added named export { Toolbar } alias alongside default export — test imports { Toolbar } and component was default-only"
  - "Added title attribute to each display-mode button so tooltip verbatim strings appear in DOM without hover (Tooltip component uses hover-portal)"
  - "D-09 active classes bg-accent/10 (not bg-accent/20 used by camera presets) — intentional visual distinction between feature categories"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-26"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 1
---

# Phase 47 Plan 03: Toolbar Display-Mode Segmented Control Summary

Three-button NORMAL/SOLO/EXPLODE segmented control added to Toolbar using lucide LayoutGrid/Square/Move3d icons, gated on viewMode === "3d" || "split", with D-09 verbatim active-state styling (bg-accent/10 text-accent border-accent/30).

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Toolbar 3-button segmented control + viewMode gate | 9f5dd0b | src/components/Toolbar.tsx |

## Files Modified

### src/components/Toolbar.tsx

- Added lucide imports: `LayoutGrid`, `Square`, `Move3d` (D-33 icon policy — lucide-only for new chrome)
- Added `DISPLAY_MODES` config constant (module scope, above component) with D-09 verbatim labels + tooltips
- Added `export function Toolbar` (named export) + `export default Toolbar` — test uses named import
- Subscribed `displayMode` + `setDisplayMode` from uiStore (D-02 field shape)
- Rendered 3-button segmented control after camera-preset cluster, before document-title center slot (D-01 placement)
- Gate: `(viewMode === "3d" || viewMode === "split")` — matches Walk/Orbit precedent (D-01)
- Active button: `bg-accent/10 text-accent border-accent/30` (D-09 verbatim, distinct from preset's bg-accent/20)
- Inactive button: `text-text-dim hover:text-accent-light border-transparent`
- `title={tooltip}` attribute surfaces verbatim tooltip text in DOM for test assertion without hover
- `data-testid`, `aria-label`, `aria-pressed` per test contract (D-09)
- Click calls `setDisplayMode(id)` synchronously — no debounce, no animation (D-07)

## Test Results

| File | Tests | Status |
|------|-------|--------|
| src/components/__tests__/Toolbar.displayMode.test.tsx | 9 | GREEN |
| src/components/__tests__ (full suite) | 31 | GREEN (no regressions) |
| e2e/display-mode-cycle.spec.ts | N/A | Depends on Plan 02 merge |

## Audits

### D-34 Spacing Audit (Toolbar.tsx per-file rule)
`grep -E '(p|m|gap|rounded)-\[' src/components/Toolbar.tsx | wc -l` → **0** (CLEAN)

### D-33 Icon Policy Audit
- New icons added: `LayoutGrid`, `Square`, `Move3d` — all from lucide-react (COMPLIANT)
- No new `material-symbols-outlined` usages added
- Existing Material Symbols allowlist (8 files) unchanged

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added named export { Toolbar }**
- **Found during:** Task 1 — test imports `{ Toolbar }` but component was `export default` only
- **Fix:** Changed `export default function Toolbar` to `export function Toolbar` + added `export default Toolbar` alias at end of component
- **Files modified:** src/components/Toolbar.tsx
- **Commit:** 9f5dd0b

**2. [Rule 1 - Bug] Added title attribute for tooltip DOM presence**
- **Found during:** Task 1 — tooltip test checks `document.body.innerHTML` for verbatim strings; Tooltip component only renders portal text on hover, not at render time
- **Fix:** Added `title={tooltip}` to each button so verbatim strings are always in the DOM
- **Files modified:** src/components/Toolbar.tsx
- **Commit:** 9f5dd0b

## Phase 47 Acceptance Status

DISPLAY-01 user-facing slice is fully observable with Plans 02 + 03 combined:

- "Toolbar gains a NORMAL/SOLO/EXPLODE display-mode selector" — DONE (this plan)
- "Visible only when viewMode === '3d' || 'split'" — DONE (D-01 gate)
- "Three buttons grouped together" — DONE (role="group" segmented control)
- "Active button styling matches D-09: bg-accent/10 text-accent border-accent/30" — DONE
- "lucide-react icons LayoutGrid/Square/Move3d" — DONE (D-33 compliant)
- "Tooltip text matches D-09 verbatim" — DONE
- "Switching modes is INSTANT" — DONE (D-07, synchronous setDisplayMode call)
- "displayMode persists across reload" — Plan 02 localStorage (D-05)
- "displayMode in uiStore is single source of truth" — Plan 02 store

## Self-Check: PASSED

- [x] src/components/Toolbar.tsx modified (48 insertions)
- [x] Commit 9f5dd0b exists in git log
- [x] Toolbar.displayMode.test.tsx: 9/9 tests GREEN
- [x] Full __tests__ suite: 31/31 tests GREEN
- [x] D-34 audit: 0 arbitrary spacing values
- [x] D-33 audit: no new Material Symbols; lucide icons added correctly
- [x] DISPLAY_MODES constant present in file
- [x] viewMode gate present (viewMode === "3d" || viewMode === "split")
- [x] bg-accent/10 present (D-09 active class)
- [x] border-accent/30 present (D-09 active class)
- [x] All 3 tooltip verbatim strings present in file
