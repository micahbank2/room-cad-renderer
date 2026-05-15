---
phase: 83-floating-toolbar-redesign-v1-21
plan: 02
subsystem: floating-toolbar
tags: [toolbar, snap, popover, ia-06, ia-07, phase-81-d05-carryover]
requires:
  - "src/components/FloatingToolbar.tsx (Wave 1 ToolGroup wrapper + Utility group)"
  - "src/components/ui/Popover.tsx (Radix Popover wrapper)"
  - "src/stores/uiStore.ts (gridSnap field + setGridSnap action)"
provides:
  - "Snap Popover button in FloatingToolbar Utility group"
  - "Phase 81 D-05 carry-over closure (Snap migrated out of Sidebar)"
  - "data-testid=toolbar-snap + toolbar-snap-options + toolbar-snap-option-{0|0.25|0.5|1}"
affects:
  - "src/components/FloatingToolbar.tsx (add Snap popover)"
  - "src/components/Sidebar.tsx (delete sidebar-snap PanelSection)"
  - "src/components/__tests__/Sidebar.ia02.test.tsx (fixture update: 7→6 panels)"
tech-stack:
  added: []
  patterns:
    - "Radix Popover trigger nested inside Tooltip trigger via dual asChild"
    - "Mixed-case dynamic tooltip text (Snap: 6 inch, etc.)"
key-files:
  created:
    - "tests/e2e/specs/toolbar-snap.spec.ts"
  modified:
    - "src/components/FloatingToolbar.tsx"
    - "src/components/Sidebar.tsx"
    - "src/components/__tests__/Sidebar.ia02.test.tsx"
decisions:
  - "Snap value list matches sidebar predecessor verbatim: Off, 3 inch, 6 inch, 1 foot (no new options added in this plan)"
  - "Popover width capped at w-32 (128px) for compact list — narrower than the default w-72"
  - "Active option marked with lucide Check icon (size 12)"
metrics:
  duration: "13 minutes"
  completed: "2026-05-14"
  tests-added: 3
  tasks-completed: 3
  files-modified: 3
  files-created: 1
---

# Phase 83 Plan 02: Snap Migration to Toolbar Utility Popover Summary

Phase 81 D-05 carry-over closed: the Snap dropdown moved from a `PanelSection` in `Sidebar.tsx` into the `FloatingToolbar` Utility group as a Radix Popover-backed button using a lucide `Magnet` icon.

---

## What Shipped

- **Snap button in Utility group** of `FloatingToolbar.tsx`, positioned between Grid toggle and Zoom-in. Clicking opens a `<Popover side="top">` containing 4 options (Off / 3 inch / 6 inch / 1 foot). Active option marked with a `Check` icon. Clicking an option writes `useUIStore.setGridSnap(value)` and closes the popover.
- **Tooltip dynamism:** the trigger tooltip reads "Snap: Off" / "Snap: 3 inch" / "Snap: 6 inch" / "Snap: 1 foot" — mixed case per D-09.
- **Active styling:** button shows `data-active` whenever `gridSnap > 0`.
- **Sidebar cleanup:** `sidebar-snap` PanelSection deleted; the stale Phase 80 comment about "Snap stays here until Phase 83" replaced with a one-line note pointing to D-04; the unused `gridSnap` / `setGridSnap` selectors dropped from `Sidebar.tsx`.
- **Test fixture update:** `src/components/__tests__/Sidebar.ia02.test.tsx` `EXPECTED_IDS` reduced from 7 entries to 6 (no more `sidebar-snap`), and the `labelById` map updated accordingly. All 4 IA-02 cases still pass.
- **New e2e spec** (`tests/e2e/specs/toolbar-snap.spec.ts`) — 3 chromium-dev tests covering tooltip text, popover-driven store update, and Off-state active-attribute clear. All pass in ~4.4s.

---

## Verification

| Check | Result |
|-------|--------|
| `grep -rn 'sidebar-snap' src/ tests/` | empty (the only match is a documentation comment in `Sidebar.ia02.test.tsx` explaining the removal) |
| `grep -q 'data-testid="toolbar-snap"' src/components/FloatingToolbar.tsx` | found |
| `grep -q 'Magnet' src/components/FloatingToolbar.tsx` | found (icon import + JSX use) |
| `npx tsc --noEmit` | clean (only pre-existing `baseUrl` deprecation warning) |
| `npx vitest run src/components/__tests__/Sidebar.ia02.test.tsx` | 4/4 pass |
| `npx vitest run` (full suite) | 1012 pass, 11 todo. 2 file failures pre-existing (snapshotMigration import error) — logged in `deferred-items.md`. |
| `npx playwright test toolbar-snap.spec.ts --project=chromium-dev` | 3/3 pass (4.4s) |
| `gsd-tools verify key-links` | 2/3 verified (3rd is a planner false-negative — spec exercises FloatingToolbar via DOM testids, not via file-path import) |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated `Sidebar.ia02.test.tsx` to reflect 6-panel sidebar**
- **Found during:** Task 2 verification (`grep -rn 'sidebar-snap' src/ tests/`)
- **Issue:** The IA-02 contract test hardcoded 7 expected panel IDs (including `sidebar-snap`) and 7 expected labels. With `sidebar-snap` removed from `Sidebar.tsx`, the test would fail because the panel no longer mounts.
- **Fix:** Dropped `sidebar-snap` from both `EXPECTED_IDS` and the `labelById` fixture; added a one-line docstring note about the removal pointing to Phase 83 D-04.
- **Files modified:** `src/components/__tests__/Sidebar.ia02.test.tsx`
- **Commit:** `00d3a81`

**2. [Rule 3 - Blocking] Added `setupPage(page)` to e2e spec**
- **Found during:** Task 3 first run — `seedRoom` timed out waiting for `window.__cadStore` because the page was never navigated.
- **Fix:** Added `await setupPage(page)` before every `seedRoom(page)` call, matching the established convention in the existing camera-preset and inspector specs.
- **Files modified:** `tests/e2e/specs/toolbar-snap.spec.ts`
- **Commit:** `e5b682c`

### Deferred Issues

Two pre-existing vitest file failures (snapshotMigration import error in `SaveIndicator` + `SidebarProductPicker`) — unrelated to Snap migration. Logged in `deferred-items.md`.

---

## Phase 81 D-05 Carry-Over Status

**CLOSED.** The Phase 81 D-05 deferral ("Snap stays in sidebar until Phase 83 wires it into FloatingToolbar") is satisfied. Snap is now zero-click from the canvas (toolbar button) instead of two-click (open sidebar panel → click select).

---

## Compatibility Note

`window.__uiStore` is exposed by `src/stores/uiStore.ts` (L489–501) whenever `import.meta.env.MODE === "test"`. Playwright sets this mode automatically (verified in `playwright.config.ts`'s `webServer.command` which runs `vite --mode test` equivalent). All 3 e2e cases read `gridSnap` via the test handle — no fallback needed.

---

## Self-Check: PASSED

- src/components/FloatingToolbar.tsx — modified (Magnet, Popover imports, SNAP_OPTIONS, snap button JSX)
- src/components/Sidebar.tsx — modified (sidebar-snap PanelSection + gridSnap selectors removed)
- src/components/__tests__/Sidebar.ia02.test.tsx — modified (fixture update)
- tests/e2e/specs/toolbar-snap.spec.ts — created

Commits verified:
- `ffbd30b` — feat(83-02): add Snap popover to Utility group in FloatingToolbar
- `00d3a81` — refactor(83-02): remove Snap PanelSection from Sidebar.tsx
- `e5b682c` — test(83-02): e2e spec for FloatingToolbar Snap popover
