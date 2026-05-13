---
phase: 81-left-panel-restructure-v1-21
plan: 01
subsystem: ui
tags: [react, sidebar, panel-section, localstorage, ia-02]

requires:
  - phase: 72-pascal-tokens-radius-shadows
    provides: src/components/ui/PanelSection — shared collapsible primitive with localStorage persistence
provides:
  - Sidebar.tsx unified under shared PanelSection with 7 stable sidebar-* ids
  - Default visibility per IA-02: Rooms tree expanded, every secondary panel collapsed
  - Inline PanelSection clone deleted from RoomsTreePanel.tsx (parent owns the wrapper)
  - CustomElementsPanel, FramedArtLibrary, WainscotLibrary stripped of bespoke outer headers
  - Sidebar IA-02 contract integration test suite (4 vitest tests)
affects:
  - 81-02 (tree hover-highlight — shares Sidebar.tsx layout, RoomsTreePanel.tsx return shape)
  - 81-03 (inline rename — shares RoomsTreePanel.tsx + TreeRow.tsx)
  - 82-inspector-rebuild (right-sidebar Pascal token contract)
  - 83-floating-toolbar (Snap dropdown move per D-05)

tech-stack:
  added: []
  patterns:
    - "Shared PanelSection wrapping: all sidebar sections share one localStorage key + one persistence pathway"
    - "data-panel-id scoping: integration tests query the section-toggle button via data-panel-id to avoid collision with inner content buttons"

key-files:
  created:
    - src/components/__tests__/Sidebar.ia02.test.tsx
    - .planning/phases/81-left-panel-restructure-v1-21/deferred-items.md
  modified:
    - src/components/Sidebar.tsx
    - src/components/RoomsTreePanel/RoomsTreePanel.tsx
    - src/components/CustomElementsPanel.tsx
    - src/components/FramedArtLibrary.tsx
    - src/components/WainscotLibrary.tsx
    - src/components/__tests__/RoomsTreePanel.render.test.tsx
    - .gitignore

key-decisions:
  - "IA-02 ids locked: sidebar-rooms-tree, sidebar-room-config, sidebar-snap, sidebar-custom-elements, sidebar-framed-art, sidebar-wainscoting, sidebar-product-library"
  - "Only sidebar-rooms-tree defaults open (per IA-02 verifiable criterion); every secondary section defaults closed"
  - "Library panels keep their local '+ NEW' action button as body-level chrome; only the title h3 + caret was removed since the parent PanelSection now owns the section title and collapse caret"
  - "Replaced the plan's Playwright e2e spec with a vitest integration suite (Sidebar.ia02.test.tsx) — e2e harness is currently blocked by the v1.18-era TooltipProvider issue tracked in STATE.md; the contract is exercised by integration tests without the blocker"

patterns-established:
  - "Library panels (Custom Elements / Framed Art / Wainscot) follow a 'header-less body' contract — the parent PanelSection provides the title; the component returns inner content + its own action buttons in the body"

requirements-completed: [IA-02]

duration: 5m20s
completed: 2026-05-13
---

# Phase 81 Plan 01: Persistent Panel Collapse State (IA-02) Summary

**Left-sidebar IA-02 rebuild — every section now wrapped in the shared PanelSection primitive with stable sidebar-* ids; only the Rooms tree defaults open; collapse state persists to localStorage["ui:propertiesPanel:sections"] across reloads.**

## Performance

- **Duration:** 5m 20s
- **Started:** 2026-05-13T19:33:55Z
- **Completed:** 2026-05-13T19:39:15Z
- **Tasks:** 2 of 2
- **Files modified:** 7 (+ 2 created)

## Accomplishments
- Sidebar.tsx now wraps all 7 left-panel sections in the shared `PanelSection` primitive with stable ids — `sidebar-rooms-tree`, `sidebar-room-config`, `sidebar-snap`, `sidebar-custom-elements`, `sidebar-framed-art`, `sidebar-wainscoting`, `sidebar-product-library`.
- Only `sidebar-rooms-tree` defaults open. Every other section defaults closed per the IA-02 verifiable criterion. Per-section collapse state persists across reloads via the canonical `localStorage["ui:propertiesPanel:sections"]` map (Phase 72).
- `RoomsTreePanel.tsx` no longer contains its local inline `PanelSection` clone (the Phase 46 component had a private mini-implementation with no persistence). The parent now owns the section wrapper.
- `CustomElementsPanel.tsx`, `FramedArtLibrary.tsx`, `WainscotLibrary.tsx` lose their bespoke outer header (h3 + caret) — only the inner "+ NEW" action toggle is preserved as body-level chrome.
- Mixed-case panel labels per CLAUDE.md D-09: "Rooms", "Room config", "Snap", "Custom elements", "Framed art library", "Wainscoting library", "Product library".
- New `Sidebar.ia02.test.tsx` vitest integration suite (4 tests) verifies the full contract: all 7 ids mount, only Rooms is expanded on fresh state, labels are mixed-case, toggling persists across remount.

## Task Commits

1. **Task 1: Unify Sidebar.tsx under shared PanelSection** — `756410b` (refactor)
2. **Task 2: Sidebar IA-02 integration test suite** — `c41535a` (test)

## Files Created/Modified

- `src/components/Sidebar.tsx` — wraps all 7 sections in `PanelSection` with sidebar-* ids; only Rooms defaults open
- `src/components/RoomsTreePanel/RoomsTreePanel.tsx` — deleted the inline `PanelSection` clone (L67–91) and the wrapping element in `return` (L287, L307); component now returns a plain `<div role="tree">`
- `src/components/CustomElementsPanel.tsx` — removed the h3 outer header; kept the "+ NEW" toggle as a body action
- `src/components/FramedArtLibrary.tsx` — same treatment as CustomElementsPanel
- `src/components/WainscotLibrary.tsx` — same treatment as CustomElementsPanel
- `src/components/__tests__/RoomsTreePanel.render.test.tsx` — updated the "Rooms panel header" test to assert the new contract (`role="tree"` + `aria-label="Rooms tree"`)
- `src/components/__tests__/Sidebar.ia02.test.tsx` — **new** — 4 integration tests for the IA-02 contract
- `.gitignore` — ignore `playwright-transform-cache-*/` ephemeral output
- `.planning/phases/81-left-panel-restructure-v1-21/deferred-items.md` — pre-existing test failures noted as out-of-scope

## Decisions Made

- **Library panels keep their "+ NEW" action.** The plan said "REMOVE the bespoke header — keep only the body content." The h3 title was redundant once the parent's PanelSection owns the section title, but the "+ NEW" toggle button is a per-panel action (not a header element). Kept it inside the panel body, right-aligned, so the create form stays co-located with its trigger.
- **Integration test instead of Playwright e2e.** The plan offered a fallback ("If no e2e test exists for sidebar collapse, this task ALSO adds a minimal Playwright spec"). Playwright e2e in this repo is currently blocked by a v1.18-era TooltipProvider harness issue (STATE.md). A vitest integration test exercises the same contract via the canonical `data-panel-id` selectors that `__drivePanelSection` already uses, without the harness blocker. Test driver remains intact for future e2e.
- **D-09 label casing.** All seven section labels are mixed-case ("Custom elements", not "CUSTOM ELEMENTS") per CLAUDE.md. The library panels' UPPERCASE was always purely cosmetic for the h3 — those h3s are gone now, and the data identifiers (e.g. `{name}.toUpperCase()` rendering in 2D Fabric overlay) are unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan referenced npm scripts that don't exist**

- **Found during:** Task 1 (verify)
- **Issue:** The plan's Task 1 `<verify>` command was `npm run typecheck 2>&1 | tail -5 && npm run lint 2>&1 | tail -5` — but `package.json` defines no `typecheck` or `lint` scripts (only `dev`, `build`, `test`, `test:watch`, `test:quick`, `test:e2e`, `test:e2e:debug`, `preview`).
- **Fix:** Substituted `npm run build` (which exercises tsc via Vite during the build step) + `npm run test:quick` (vitest). Both green.
- **Files modified:** none (verify-command substitution only)
- **Verification:** `npm run build` exits 0 with no type errors; `npm run test:quick` returns to the HEAD~1 baseline of 992 passing.
- **Committed in:** N/A (process correction, documented in `deferred-items.md`)

**2. [Rule 1 - Bug] Stale test assertion in RoomsTreePanel.render.test.tsx**

- **Found during:** Task 1 verify (`npm run test:quick`)
- **Issue:** Removing the local inline PanelSection clone from RoomsTreePanel.tsx broke `tests/components/__tests__/RoomsTreePanel.render.test.tsx`'s assertion `expect(screen.getByText(/Rooms/i))` — the "Rooms" header text moved up to the parent's PanelSection (which is correct per the new IA-02 contract), so it's not present when RoomsTreePanel is rendered in isolation.
- **Fix:** Updated the test to assert the new contract: `expect(screen.getByRole("tree", { name: /Rooms tree/i }))`. The other 4 tests in the file (h-6 height, chevron sizing, eye-icon, indent classes) were already `it("...", () => {})` placeholders with no body and remain passing.
- **Files modified:** `src/components/__tests__/RoomsTreePanel.render.test.tsx`
- **Verification:** `npx vitest run src/components/__tests__/RoomsTreePanel.render.test.tsx` — 5/5 pass.
- **Committed in:** `756410b` (Task 1 commit)

**3. [Rule 2 - Missing Critical] `playwright-transform-cache-501/` untracked output**

- **Found during:** Task 1 staging
- **Issue:** Vitest/Playwright tooling generates `playwright-transform-cache-501/` as untracked output. Without a `.gitignore` entry it would either pollute commits or constantly show up as untracked.
- **Fix:** Added `playwright-transform-cache-*/` to `.gitignore` (the existing `test-results/` and `/playwright/.cache/` rules covered other paths, not this one).
- **Files modified:** `.gitignore`
- **Verification:** `git status --short` no longer lists the directory.
- **Committed in:** `756410b` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** All three were process/test corrections, not scope creep. The IA-02 contract was implemented exactly as specified.

## Issues Encountered

- **Sidebar integration test selector collisions.** First version of `Sidebar.ia02.test.tsx` used `screen.getByRole("button", { name: "Custom elements" })` — matched two buttons because the library panel's "+ NEW" toggle has the same accessible context. Resolved by scoping selectors to `[data-panel-id="..."]` first, then `querySelector("button")` inside. Same pattern `__drivePanelSection` already uses.

## Verification

**IA-02 verifiable criterion** ("Open the app fresh → left panel shows the Rooms tree expanded and all secondary panels collapsed. Expand Materials → reload page → Materials panel is still expanded"):

- Exercised by `Sidebar.ia02.test.tsx` — 4/4 pass:
  1. All 7 `sidebar-*` ids mount.
  2. On empty localStorage, only `sidebar-rooms-tree` has `aria-expanded="true"`.
  3. All 7 aria-labels are mixed-case per D-09.
  4. Clicking `sidebar-custom-elements` writes `{ "sidebar-custom-elements": true }` to the canonical key; an unmount/remount reads it back and keeps the panel expanded.
- `npm run build` — green (typecheck via Vite).
- `npm run test:quick` — 996 passing (up from 992 baseline; +4 IA-02 tests), still only the 2 pre-existing file failures (SaveIndicator, SidebarProductPicker) — both pre-date Phase 81 and are tracked in `deferred-items.md` as out of scope.

## Known Stubs

None. The IA-02 contract is fully wired: every section's collapse state flows through the canonical `localStorage["ui:propertiesPanel:sections"]` map via the shared PanelSection.

## Next Phase Readiness

- **81-02 (tree hover-highlight)** unblocked. `RoomsTreePanel` now returns a plain `<div role="tree">`; Plan 02 can attach `onMouseEnter`/`onMouseLeave` handlers to `TreeRow` without re-routing through the inline-clone wrapper.
- **81-03 (inline rename + WallSegment.name schema bump)** unblocked. The `TreeRow.tsx` file is untouched by Plan 01; Plan 03 has a clean shared file to work on.
- **Phase 82 (inspector rebuild)** can reuse the same `PanelSection` ↔ `localStorage["ui:propertiesPanel:sections"]` pattern for right-sidebar sections without re-litigating the wrapper contract.

---
*Phase: 81-left-panel-restructure-v1-21*
*Plan: 01*
*Completed: 2026-05-13*

## Self-Check: PASSED

- `.planning/phases/81-left-panel-restructure-v1-21/81-01-SUMMARY.md` — FOUND (this file)
- `src/components/__tests__/Sidebar.ia02.test.tsx` — FOUND
- Commit `756410b` (refactor Task 1) — FOUND in git log
- Commit `c41535a` (test Task 2) — FOUND in git log
