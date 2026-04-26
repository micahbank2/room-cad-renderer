---
phase: "46"
plan: "01"
subsystem: rooms-hierarchy-sidebar-tree
tags: [tdd, stubs, red-baseline, wave-0]
dependency_graph:
  requires: []
  provides: [buildRoomTree-stub, isHiddenInTree-stub, RoomsTreePanel-stub, treeDrivers-stub, 16-red-test-files]
  affects: [plans-02-03-04]
tech_stack:
  added: []
  patterns: [tdd-red-green, window-driver-pattern, vitest-component-testing]
key_files:
  created:
    - src/lib/buildRoomTree.ts
    - src/lib/isHiddenInTree.ts
    - src/components/RoomsTreePanel/index.ts
    - src/test-utils/treeDrivers.ts
    - src/lib/__tests__/buildRoomTree.test.ts
    - src/lib/__tests__/isHiddenInTree.test.ts
    - src/lib/__tests__/uiPersistence.tree.test.ts
    - src/stores/__tests__/uiStore.hiddenIds.test.ts
    - src/stores/__tests__/uiStore.pendingCameraTarget.test.ts
    - src/components/__tests__/RoomsTreePanel.render.test.tsx
    - src/components/__tests__/RoomsTreePanel.expand.test.tsx
    - src/components/__tests__/RoomsTreePanel.visibility.test.tsx
    - src/components/__tests__/RoomsTreePanel.select.test.tsx
    - src/components/__tests__/RoomsTreePanel.empty.test.tsx
    - src/three/__tests__/ThreeViewport.hiddenIds.test.tsx
    - src/three/__tests__/ThreeViewport.cameraDispatch.test.tsx
    - e2e/tree-select-roundtrip.spec.ts
    - e2e/tree-visibility-cascade.spec.ts
    - e2e/tree-expand-persistence.spec.ts
    - e2e/tree-empty-states.spec.ts
  modified:
    - playwright.config.ts
decisions:
  - "playwright.config.ts: testDir='.' + testMatch pattern to cover both tests/e2e/specs (Phase 36 specs) and e2e/ (Phase 46 tree specs) — canonical paths per VALIDATION.md mandated e2e/ at root"
  - "tsc --noEmit pre-existing failure: TS 6.0 baseUrl deprecation exits code 2 in all pre-existing builds; out-of-scope, documented as deviation"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-26"
  tasks_completed: 3
  files_created: 20
---

# Phase 46 Plan 01: Wave 0 RED Stubs Summary

All 20 files (4 source stubs + 12 vitest + 4 Playwright) created at VALIDATION.md canonical paths. Wave 0 RED baseline established.

## One-liner

TDD Wave 0 scaffold: 4 safe-default source stubs + 16 RED test files covering all TREE-01 acceptance criteria paths from VALIDATION.md.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Source-file stubs | b4b43fb | buildRoomTree.ts, isHiddenInTree.ts, RoomsTreePanel/index.ts, treeDrivers.ts |
| 2 | 12 Vitest unit/component RED tests | 7d7aa56 | 12 files in src/**/__tests__/ |
| 3 | 4 Playwright e2e spec stubs | 530f594 | 4 files in e2e/, playwright.config.ts |

## RED Baseline

- **Test files:** 5 failed / 7 passed (12 vitest files)
- **Individual tests:** 10 failed / 36 passed (46 total)
- **Failure mode:** All assertion errors (not import/TypeError errors) — stubs return safe defaults
- **Playwright:** `npx playwright test e2e/ --list` exits 0, 4 specs discovered

## Source Stub Behaviors

| File | Stub behavior | Why |
|------|---------------|-----|
| `src/lib/buildRoomTree.ts` | Returns `[]` | Component tests fail with "empty tree" assertions, not TypeError |
| `src/lib/isHiddenInTree.ts` | Returns `false` | Tests assert `true` on hidden ancestry → RED |
| `src/components/RoomsTreePanel/index.ts` | Returns `null` | `screen.getByText(/Rooms/i)` fails → RED |
| `src/test-utils/treeDrivers.ts` | Throws `"unimplemented"` on all 4 drivers | Gated by `import.meta.env.MODE !== "test"` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] playwright.config.ts testDir excluded e2e/ directory**
- **Found during:** Task 3 — VALIDATION.md mandates `e2e/tree-*.spec.ts` at repo root, but Playwright config had `testDir: "./tests/e2e/specs"`
- **Fix:** Changed `testDir: "."` + added `testMatch: ["tests/e2e/specs/**/*.spec.ts", "e2e/**/*.spec.ts"]`
- **Files modified:** `playwright.config.ts`
- **Commit:** 530f594
- **Impact:** Existing Phase 36 specs still discovered (verified via `--list`)

### Out-of-scope Pre-existing Issues (Deferred)

**tsc --noEmit exits with code 2:** TypeScript 6.0 treats `baseUrl` as deprecated (TS5101). This pre-existed before any changes in this plan (confirmed via `git stash` verification). Adding `"ignoreDeprecations": "6.0"` exposes ~70 pre-existing type errors in unrelated files. Deferred — out of scope for Wave 0.

## Known Stubs

All 4 source files are intentional stubs per plan design. Plans 02/03/04 implement them:
- `buildRoomTree()` → Plan 02
- `isHiddenInTree()` → Plan 02
- `RoomsTreePanel` component → Plan 03
- `treeDrivers` window bindings → Plan 03

## Verbatim UI-SPEC Strings Embedded in Tests

- `"No walls yet"` — RoomsTreePanel.empty.test.tsx
- `"No products placed"` — RoomsTreePanel.empty.test.tsx
- `"No custom elements placed"` — RoomsTreePanel.empty.test.tsx
- `"bg-obsidian-highest"`, `"border-l-2 border-accent"`, `"text-accent-light"`, `"aria-current"` — RoomsTreePanel.select.test.tsx
- `"w-4 h-4"`, `"w-6 h-6"`, `"w-3.5 h-3.5"`, `"h-6"` — RoomsTreePanel.render.test.tsx
- `"Hide.*from 3D view"`, `"Show.*in 3D view"`, `"hidden because"` — RoomsTreePanel.visibility.test.tsx
- `"gsd:tree:room"` — uiPersistence.tree.test.ts + tree-expand-persistence.spec.ts

## Self-Check: PASSED

All 20 files confirmed present on disk. All 3 task commits verified in git log.
