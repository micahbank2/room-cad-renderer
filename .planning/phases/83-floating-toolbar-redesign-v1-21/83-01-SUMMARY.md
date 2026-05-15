---
phase: 83-floating-toolbar-redesign-v1-21
plan: 01
subsystem: floating-toolbar
tags: [toolbar, ia-06, ia-07, wcag-aaa, responsive, hover-labels, banded-groups]
requires:
  - "src/components/ui/Button.tsx (cva size variants)"
  - "src/components/ui/Tooltip.tsx (Radix TooltipProvider delayDuration=200)"
  - "src/components/WindowPresetSwitcher.tsx (Phase 79 anchor)"
provides:
  - "icon-touch button size variant (44px WCAG 2.5.5 AAA)"
  - "Banded 5-group FloatingToolbar (Drawing/Measure/Structure/View/Utility)"
  - "Mixed-case always-on group labels"
  - "Responsive flex-wrap at 1024x768"
  - "Hover tooltips on every tool button via side='top' + collisionPadding={8}"
  - "Lifted WindowPresetSwitcher anchor (bottom-44) to clear wrapped toolbar"
affects:
  - "src/components/FloatingToolbar.tsx (rewrite)"
  - "src/components/WindowPresetSwitcher.tsx (anchor lift)"
  - "src/components/ui/Button.tsx (additive size variant)"
tech-stack:
  added: []
  patterns: ["cva size variant", "ToolGroup co-located subcomponent", "flex-wrap responsive collapse"]
key-files:
  created:
    - "tests/e2e/specs/toolbar-redesign.spec.ts"
  modified:
    - "src/components/ui/Button.tsx"
    - "src/components/FloatingToolbar.tsx"
    - "src/components/WindowPresetSwitcher.tsx"
decisions:
  - "D-01: 44px hit targets via new icon-touch variant (cva, no new CSS token)"
  - "D-02: 5 mixed-case banded groups in source order Drawing/Measure/Structure/View/Utility"
  - "D-03: flex-wrap container at max-w-[min(calc(100vw-24px),1240px)] — no JS, no container query"
  - "D-06: TooltipContent side='top' + collisionPadding={8}"
  - "D-07: WindowPresetSwitcher bottom-32 -> bottom-44"
  - "D-09: Mixed-case labels (no .toUpperCase, no uppercase Tailwind class)"
metrics:
  duration: "Resumed (prior agent crashed mid-execution); ~25 min effective resume time"
  completed: 2026-05-14
  tasks: 4
  unit-tests-passing: 1012
---

# Phase 83 Plan 01: Banded 5-Group Floating Toolbar Summary

Restructured `FloatingToolbar.tsx` from a two-row ad-hoc icon stack into a banded 5-group toolbar with WCAG-AAA 44 px hit targets, always-visible mixed-case group labels, hover tooltips, and responsive `flex-wrap` collapse at 1024×768. Closes IA-06 (#175) and IA-07 (#176). Snap migration deferred to Plan 83-02.

## Execution Notes — Resume

Prior executor agent crashed with a 529 overload error after committing Task 1 (`05fd783`). Task 2 work (FloatingToolbar rewrite + WindowPresetSwitcher anchor lift) was on disk but uncommitted. This resume agent:

1. Verified disk state matched Task 2 spec — all 18 expected `data-testid`s present (including dynamic `view-mode-*` and `display-mode-*` from `VIEW_MODES`/`DISPLAY_MODES` constants).
2. Verified ToolGroup structure: 5 groups in source order Drawing → Measure → Structure → View → Utility.
3. Verified container: `flex flex-wrap items-start justify-center gap-3 ... max-w-[min(calc(100vw-24px),1240px)]`.
4. Verified every tool button: `size="icon-touch"` (counted 22 occurrences).
5. Verified no `.toUpperCase()` or `uppercase` Tailwind class anywhere in the file.
6. Verified WindowPresetSwitcher: `bottom-44` with updated Phase 83 D-07 comment.
7. Ran vitest pre-stash AND post-stash — 1012 passing in both states. Confirmed the 33 "errors" in `MaterialThumbnail`/`swedishThumbnailGenerator` are pre-existing WebGL-in-jsdom failures, NOT caused by Phase 83.
8. Committed Task 2, wrote and committed Task 3 (e2e spec).

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `05fd783` | feat(83-01): add icon-touch size variant for 44px WCAG AAA targets |
| 2 | `c44aeec` | feat(83-01): restructure FloatingToolbar into 5 banded groups |
| 3 | `ebd32d3` | test(83-01): add e2e spec for banded toolbar + hover labels + responsive wrap |

## Testid Preservation Evidence

All 18 pre-Phase-83 data-testids are present in the new JSX (verified via `grep -oE 'data-testid="[^"]+"' src/components/FloatingToolbar.tsx`):

**Tools (9):** `tool-select`, `tool-wall`, `tool-door`, `tool-window`, `tool-ceiling`, `tool-stair`, `tool-measure`, `tool-label`, `tool-product`
**Wall cutouts (1):** `wall-cutouts-trigger`
**View modes (5):** `view-mode-segmented` + `view-mode-2d`/`view-mode-3d`/`view-mode-split`/`view-mode-library` rendered from `VIEW_MODES.map(({testId}) => ...)`
**Display modes (4):** `display-mode-segmented` + `display-mode-normal`/`display-mode-solo`/`display-mode-explode` rendered from `DISPLAY_MODES.map`
**Additive (6):** `toolbar-undo`, `toolbar-redo`, `toolbar-grid-toggle`, `toolbar-zoom-in`, `toolbar-zoom-out`, `toolbar-fit`

## Verification Results

- **TypeScript:** Clean (only pre-existing `baseUrl` deprecation warning in tsconfig — not from our changes).
- **Vitest:** 1012 passed | 11 todo (target met, zero regressions). Pre-existing WebGL/jsdom errors in `MaterialThumbnail` and `swatchThumbnailGenerator` unchanged.
- **Playwright e2e:** Spec written for chromium; execution deferred to orchestrator/CI per phase workflow (no push, no run in this resume).
- **Grep proofs:** `ToolGroup label="Drawing"`, `ToolGroup label="Utility"`, `flex-wrap`, `max-w-[min(calc(100vw-24px),1240px)]`, `size="icon-touch"`, `data-testid="view-mode-3d"`, `data-testid="tool-select"`, `data-testid="wall-cutouts-trigger"`, `data-testid="display-mode-segmented"`, `data-testid="toolbar-grid-toggle"` all present.

## Deviations from Plan

None. Plan executed as written. Resume agent re-verified disk state before committing Task 2 (rather than blindly committing the prior agent's work).

## Deferred to Plan 83-02

- Snap dropdown migration from `Sidebar.tsx` into the Utility group as a Popover-backed button (D-04).

## Known Limitations

- Playwright e2e not executed in this resume; spec file is committed and ready for orchestrator/CI run.
- Pre-existing WebGL/jsdom test failures in `MaterialThumbnail.tsx` + `swatchThumbnailGenerator.ts` remain (33 unhandled rejections, 2 test files affected). These existed before Phase 83 and are tracked separately.

## Self-Check: PASSED

- FOUND: `src/components/ui/Button.tsx` (commit 05fd783)
- FOUND: `src/components/FloatingToolbar.tsx` (commit c44aeec)
- FOUND: `src/components/WindowPresetSwitcher.tsx` (commit c44aeec)
- FOUND: `tests/e2e/specs/toolbar-redesign.spec.ts` (commit ebd32d3)
- FOUND: commits 05fd783, c44aeec, ebd32d3 in git log
