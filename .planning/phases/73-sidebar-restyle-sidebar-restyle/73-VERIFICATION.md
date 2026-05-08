---
phase: 73-sidebar-restyle
verified: 2026-05-07T00:00:00Z
status: gaps_found
score: 11/13 criteria verified
gaps:
  - truth: "phase33 + phase46 tests pass"
    status: failed
    reason: "Build fails at test time due to @radix-ui/react-popover not installed in node_modules, preventing Playwright from starting the dev server. Package is declared in package.json but npm install was not run after it was added in Phase 72."
    artifacts:
      - path: "src/components/ui/Popover.tsx"
        issue: "Imports @radix-ui/react-popover which is missing from node_modules"
    missing:
      - "Run `npm install` to install @radix-ui/react-popover (declared in package.json, not present in node_modules)"
  - truth: "TreeRow.tsx has pl-8 relative (no INDENT constant)"
    status: partial
    reason: "pl-8 is present in rowBase. However the row container div uses class='group relative flex items-center h-6 pr-2 pl-8 rounded-smooth-md cursor-pointer' — 'relative' is on the row container, not as a standalone class. This is correct and intentional; the criterion is met structurally even though the exact string 'pl-8 relative' doesn't appear as adjacent tokens."
    artifacts: []
    missing: []
human_verification:
  - test: "Click empty canvas area"
    expected: "PropertiesPanel disappears and the canvas fills the freed right-hand space"
    why_human: "AnimatePresence exit animation and layout reflow cannot be verified by static grep"
  - test: "Click a wall or product"
    expected: "PropertiesPanel slides in from the right with a spring animation"
    why_human: "Spring physics (damping/stiffness) and visual slide cannot be verified by static grep"
---

# Phase 73: Sidebar Restyle Verification Report

**Phase Goal:** Restyle the left sidebar rooms tree to match Pascal's spine-and-branches geometry, and make the right PropertiesPanel contextual (mounts only when something is selected, spring-slides in from the right).

**Verified:** 2026-05-07

**Status:** gaps_found

**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Left sidebar shows rooms tree with Pascal spine geometry | VERIFIED | `left-[21px] w-px bg-border/50` at TreeRow.tsx:134 |
| 2 | Hover rows → bg-accent/30; selected → bg-accent/20 text-accent-foreground; active room → bg-accent text-accent-foreground | VERIFIED | TreeRow.tsx:64-68 |
| 3 | Click empty canvas → right panel disappears | VERIFIED (code path) | App.tsx:266 `{selectedIds.length > 0 && ...}` inside AnimatePresence |
| 4 | Click wall/product → right panel slides in with spring animation | VERIFIED (code path) | App.tsx:265-278 and 297-310, `initial={{ x: 288 }}` |
| 5 | No CollapsibleSection in Sidebar.tsx | VERIFIED | grep count: 0 |
| 6 | Sidebar.tsx imports PanelSection from @/components/ui | VERIFIED | Sidebar.tsx:1 |
| 7 | phase33 + phase46 tests pass | FAILED | Build fails — @radix-ui/react-popover not installed |

**Score:** 6/7 observable truths verified (1 blocked by missing dependency)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `src/components/RoomsTreePanel/TreeRow.tsx` | Spine + branch geometry, selection states | VERIFIED | All patterns present |
| `src/components/Sidebar.tsx` | PanelSection only, no CollapsibleSection | VERIFIED | Zero CollapsibleSection occurrences |
| `src/App.tsx` | AnimatePresence on both PropertiesPanel sites | VERIFIED | Both 2D and 3D sites wrapped |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|---|-----|--------|---------|
| TreeRow.tsx | Spine line | `left-[21px] w-px bg-border/50` | WIRED | Line 134 |
| TreeRow.tsx | Branch line | `left-[21px] h-px w-[11px] bg-border/50` | WIRED | Line 136 |
| TreeRow.tsx | selected state | `bg-accent/20 text-accent-foreground` | WIRED | Line 67 |
| TreeRow.tsx | active room state | `bg-accent text-accent-foreground` | WIRED | Line 68 |
| TreeRow.tsx | hover state | `hover:bg-accent/30` | WIRED | Line 64 |
| App.tsx | AnimatePresence (2D site) | `selectedIds.length > 0` condition | WIRED | Lines 265-278 |
| App.tsx | AnimatePresence (3D site) | `selectedIds.length > 0` condition | WIRED | Lines 297-310 |
| App.tsx | slide animation | `initial={{ x: 288, opacity: 0 }}` | WIRED | Both sites |

---

## Per-Criterion Pass/Fail Table (from prompt)

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | `left-[21px] w-px bg-border/50` (spine) | PASS | TreeRow.tsx:134 |
| 2 | `left-[21px] h-px w-[11px] bg-border/50` (branch) | PASS | TreeRow.tsx:136 |
| 3 | `pl-8 relative` / no INDENT constant | PASS | `pl-8` in rowBase string; `relative` on same container; no INDENT constant present |
| 4 | selected: `bg-accent/20 text-accent-foreground` | PASS | TreeRow.tsx:67 |
| 5 | active room: `bg-accent text-accent-foreground` | PASS | TreeRow.tsx:68 |
| 6 | hover: `hover:bg-accent/30` | PASS | TreeRow.tsx:64 |
| 7 | Sidebar.tsx zero occurrences of `CollapsibleSection` | PASS | grep count: 0 |
| 8 | Sidebar.tsx has `import { PanelSection } from "@/components/ui"` | PASS | Sidebar.tsx:1 (exact match) |
| 9 | App.tsx contains `AnimatePresence` (both sites) | PASS | Lines 265, 297 |
| 10 | App.tsx conditions on `selectedIds.length > 0` | PASS | Lines 266, 298 |
| 11 | App.tsx has `x: 288` in initial/exit | PASS | Both sites: `x: 288, opacity: 0` |
| 12 | TypeScript compiles clean (`npx tsc --noEmit`, ignore TS5101) | PASS | Zero errors beyond TS5101 deprecation noise |
| 13 | phase33 + phase46 tests pass | FAIL | Build error: `@radix-ui/react-popover` missing from node_modules |

**Score: 12/13 criteria pass** (one blocked by pre-existing missing npm install)

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/components/ui/Popover.tsx` | Import of uninstalled package `@radix-ui/react-popover` | BLOCKER | Prevents Playwright test server from starting; all e2e tests fail |

Note: This missing package was declared in `package.json` during Phase 72 (`feat(72-01)` commit `1a98dcf`) but `npm install` was either not run or the worktree's `node_modules` was never populated. The issue predates Phase 73 — `package.json` on `main` also contains the dependency without it being installed.

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript validity | `npx tsc --noEmit` | 0 errors (TS5101 only) | PASS |
| Build | `npm run build` | Fails — @radix-ui/react-popover unresolved | FAIL (pre-existing) |
| E2E tests | Playwright | Cannot start dev server (same root cause) | FAIL (pre-existing) |

---

## Human Verification Required

### 1. PropertiesPanel collapse on empty-canvas click

**Test:** Open 3D or split view. Click on an empty area of the canvas with nothing selected.
**Expected:** The right PropertiesPanel smoothly exits (slides to the right and fades), and the canvas layout expands to fill the freed space.
**Why human:** AnimatePresence exit animation and CSS layout reflow are not verifiable by static analysis.

### 2. PropertiesPanel slide-in on selection

**Test:** Click on a wall or placed product.
**Expected:** The PropertiesPanel slides in from the right with a spring feel (not a linear ease).
**Why human:** Spring animation quality (`damping`, `stiffness` tuning) requires visual inspection.

---

## Gaps Summary

One gap blocks full verification: `@radix-ui/react-popover` is declared in `package.json` but not installed in `node_modules`. This prevents the Vite build from completing, which in turn prevents Playwright from starting the dev server, so the phase33 and phase46 regression test suites cannot run.

**Root cause:** Pre-existing from Phase 72 — the package was added to `package.json` but `npm install` was not committed or run in this worktree environment.

**Fix:** `npm install` in the project root. No code changes required.

All 12 other success criteria are verified by direct code inspection. The Phase 73 functional goal (spine/branch tree geometry + contextual slide-in PropertiesPanel) is fully implemented in code.

---

_Verified: 2026-05-07_
_Verifier: Claude (gsd-verifier)_
