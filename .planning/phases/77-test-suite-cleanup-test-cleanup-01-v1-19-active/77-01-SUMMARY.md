---
phase: 77-test-suite-cleanup
plan: 01
subsystem: tests
tags: [test-cleanup, tooltip, switch, vitest]
dependency_graph:
  requires: []
  provides: [passing test suite for v1.18 phase-31 tests]
  affects: [tests/phase31LabelOverride.test.tsx, tests/phase31Resize.test.tsx, tests/phase31Undo.test.tsx, tests/phase31WallEndpoint.test.tsx, tests/snapIntegration.test.tsx, tests/AddProductModal.test.tsx]
tech_stack:
  added: []
  patterns: [TooltipProvider wrapping for Radix-dependent component tests, document.body queries for Dialog portal DOM]
key_files:
  created: []
  modified:
    - tests/phase31LabelOverride.test.tsx
    - tests/phase31Resize.test.tsx
    - tests/phase31Undo.test.tsx
    - tests/phase31WallEndpoint.test.tsx
    - tests/snapIntegration.test.tsx
    - tests/AddProductModal.test.tsx
decisions:
  - Use document.body.querySelector instead of container.querySelector when component renders via Dialog portal
metrics:
  duration: "5 minutes"
  completed: "2026-05-08"
  tasks: 3
  files: 6
requirements: [TEST-CLEANUP-01, TEST-CLEANUP-02]
---

# Phase 77 Plan 01: Test Suite Cleanup (v1.18 Carry-overs) Summary

**One-liner:** Fixed 36 test failures from v1.18 UI migrations by adding TooltipProvider wrappers to 5 test files and fixing Switch + Dialog portal queries in AddProductModal.

## What Changed

**Fix 1 — TooltipProvider (GH #163):** v1.18 Phase 72 added a Radix Tooltip to FloatingToolbar. Radix throws if no `<TooltipProvider>` ancestor exists. Added `import { TooltipProvider } from "@/components/ui"` and wrapped every `render(<App />)` call in all 5 affected test files.

**Fix 2 — Switch role (GH #164):** v1.18 Phase 76 replaced `<input type="checkbox">` in AddProductModal with the Switch primitive (`role="switch"` on a `<button>`). Changed `getByRole("checkbox")` → `getByRole("switch")` and `HTMLInputElement` → `HTMLElement` cast.

**Fix 3 — Dialog portal (Rule 1 auto-fix):** AddProductModal renders its content via Radix Dialog portal, placing DOM nodes outside the `container` element returned by `render()`. Two test assertions using `container.querySelector(...)` silently found nothing. Fixed to use `document.body.querySelector(...)`.

## Verification Results

| Suite | Before | After |
|-------|--------|-------|
| phase31LabelOverride | failing | 8/8 passing |
| phase31Resize | failing | 6/6 passing |
| phase31Undo | failing | 8/8 passing |
| phase31WallEndpoint | failing | 6/6 passing |
| snapIntegration | failing | 4/4 passing |
| AddProductModal | 2/4 passing | 4/4 passing |
| **Full suite** | 2 file failures | 2 file failures (pre-existing only) |
| **Total tests** | ~890 passing | 926 passing |

Pre-existing failures untouched: `tests/SaveIndicator.test.tsx`, `tests/SidebarProductPicker.test.tsx`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dialog portal breaks container.querySelector in AddProductModal tests**
- **Found during:** Task 2
- **Issue:** `container.querySelector(".opacity-40.pointer-events-none")` returned null because Radix Dialog renders into a portal at `document.body`, not inside the RTL container. Similarly, `container.querySelectorAll('input[type="number"]')` returned an empty NodeList.
- **Fix:** Changed both to `document.body.querySelector(...)` / `document.body.querySelectorAll(...)`
- **Files modified:** `tests/AddProductModal.test.tsx`
- **Commit:** ae55993

## Commits

| Hash | Message |
|------|---------|
| ae55993 | fix(77): add TooltipProvider wrapper + Switch role queries to phase-31 tests |

## Known Stubs

None.
