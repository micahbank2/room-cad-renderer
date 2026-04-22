---
phase: 33-design-system-ui-polish
plan: 00
subsystem: testing
tags: [vitest, tdd, test-drivers, red-stubs, phase33]

# Dependency graph
requires:
  - phase: 31-drag-to-resize
    provides: Phase 31 LabelOverrideInput + __driveLabelOverride driver shape (mirrored for __driveInlineTitleEdit)
provides:
  - 11 RED test scaffolds covering every Wave 1/2/3 plan contract
  - Driver contract README documenting 6 window.__drive* handles
  - Count-regression test skeleton for Plan 05 library-migration blocker
  - Single-undo store-level test for Plan 08 rotation presets (expect(after-before).toBe(1))
affects: [33-01, 33-02, 33-03, 33-04, 33-05, 33-06, 33-07, 33-08, 33-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RED-stub TDD: scaffold failing test per downstream plan before any implementation"
    - "Driver contract table in README: name + signature + implementing plan"
    - "grep-based spacing audit as regression guard for arbitrary Tailwind values"

key-files:
  created:
    - tests/phase33/README.md
    - tests/phase33/tokens.test.ts
    - tests/phase33/typography.test.ts
    - tests/phase33/spacingAudit.test.ts
    - tests/phase33/useReducedMotion.test.ts
    - tests/phase33/collapsibleSections.test.ts
    - tests/phase33/libraryCard.test.ts
    - tests/phase33/phase33LibraryMigration.test.tsx
    - tests/phase33/floatingToolbar.test.ts
    - tests/phase33/gestureChip.test.ts
    - tests/phase33/rotationPresets.test.ts
    - tests/phase33/inlineTitleEdit.test.ts
  modified: []

key-decisions:
  - "Kept count-regression test RED by seeding `expect(true).toBe(false)` in the CustomElementsPanel skeleton — Plan 05 Task 3 fills in the real seed + assertion"
  - "rotationPresets store-level test uses addRoom + placeProduct to seed a minimum viable scene — no .todo fallback per acceptance criteria"
  - "tokens.test.ts + spacingAudit.test.ts baseline-green (not RED) because Plan 33-01 already landed tokens and the 4 target files already lack arbitrary values — tests now serve as regression guards"

patterns-established:
  - "Pattern 1: Wave 0 test scaffolds gate every downstream plan — no plan is 'done' until its test is GREEN"
  - "Pattern 2: Driver contracts documented in tests/phase33/README.md with signature + implementing-plan mapping"
  - "Pattern 3: Count-regression test placed at Wave 0 to lock Plan 05 against silent row-duplication regressions"

requirements-completed:
  - "GH #83"
  - "GH #84"
  - "GH #85"
  - "GH #86"
  - "GH #87"
  - "GH #88"
  - "GH #89"
  - "GH #90"

# Metrics
duration: 5min
completed: 2026-04-22
---

# Phase 33 Plan 00: Wave 0 Test Scaffolding Summary

**11 RED test scaffolds + driver contract README locking every Wave 1/2/3 plan to a concrete TDD target (mirrors Phase 29/30/31 red-stub pattern)**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-22T13:40:43Z
- **Completed:** 2026-04-22T13:44:57Z
- **Tasks:** 3
- **Files created:** 12 (11 tests + 1 README)
- **Files modified:** 0

## Accomplishments

- Created `tests/phase33/` directory with 11 test files covering all 9 downstream plans
- Documented 6 `window.__drive*` driver contracts in README (toggle/position/rotation/inline-edit/chip/reduced-motion)
- Scaffolded count-regression test skeleton (`phase33LibraryMigration.test.tsx`) to block Plan 05 from regressing product-card counts after unifying ProductLibrary/CustomElementsPanel onto LibraryCard
- Locked single-undo invariant at the store level for Plan 08 rotation presets (`expect(after - before).toBe(1)` + `expect(after - before).toBe(0)` for NoHistory variant) — no `.todo` fallback
- Established baseline RED state: `npm test -- --run phase33` returns 11 suites, 31 failing / 13 passing

## Task Commits

1. **Task 1: Create phase33 test directory with README** — `84fe1b7` (chore)
2. **Task 2: Wave 1 RED test scaffolds** (tokens, typography, spacing, useReducedMotion) — `ae0e308` (test)
3. **Task 3: Wave 2/3 RED test scaffolds** (7 files: collapsibleSections, libraryCard, phase33LibraryMigration, floatingToolbar, gestureChip, rotationPresets, inlineTitleEdit) — `cd5965d` (test)

## Files Created

- `tests/phase33/README.md` — driver contract table + per-plan map + TDD convention
- `tests/phase33/tokens.test.ts` — canonical typography/spacing/radius token presence checks (Plan 01 already green)
- `tests/phase33/typography.test.ts` — grep-based mixed-case section header checks (Plan 02, GH #83)
- `tests/phase33/spacingAudit.test.ts` — grep-based guard: zero `p-[Npx]/m-[Npx]/rounded-[Npx]/gap-[Npx]` in 4 target files (Plan 03, GH #90)
- `tests/phase33/useReducedMotion.test.ts` — hook existence + `prefers-reduced-motion` + `matchMedia` (Plan 03, D-39)
- `tests/phase33/collapsibleSections.test.ts` — component + ChevronRight/Down + localStorage key + PropertiesPanel wrap (Plan 04, GH #84)
- `tests/phase33/libraryCard.test.ts` — LibraryCard/CategoryTabs + props + `data-testid="library-card"` + ProductLibrary migration (Plan 05, GH #89)
- `tests/phase33/phase33LibraryMigration.test.tsx` — count-regression assertion skeleton (Plan 05, blocker fix)
- `tests/phase33/floatingToolbar.test.ts` — FloatingSelectionToolbar + Copy/Trash2 + uiStore `isDragging`/`setDragging` + selectTool bridge (Plan 06, GH #85)
- `tests/phase33/gestureChip.test.ts` — 2D/3D copy contracts + localStorage dismissed key (Plan 07, GH #86)
- `tests/phase33/rotationPresets.test.ts` — preset chips in PropertiesPanel + driver doc + store-level single-undo test (Plan 08, GH #87)
- `tests/phase33/inlineTitleEdit.test.ts` — InlineEditableText + skipNextBlurRef + projectStore draftName + renameRoomNoHistory + Toolbar relocation (Plan 09, GH #88)

## Decisions Made

- **tokens.test.ts + spacingAudit.test.ts already green (not RED)**: Plan 33-01 shipped tokens before this scaffolding plan ran; the 4 target files don't use arbitrary `p-[Npx]`. Rather than making the tests artificially fail, they serve as regression guards that catch any future drift. Plan 02 and 03 will keep them green.
- **CustomElementsPanel skeleton uses `expect(true).toBe(false)`** intentionally — resolves to a real `querySelectorAll('[data-testid="library-card"]').length === N` assertion once Plan 05 lands (seed mechanism resolved then).
- **rotationPresets store-test seeds via `addRoom` + `placeProduct`** (verified API at cadStore.ts:43, 102, 316, 1012). Plan 08 may refine, but this provides a minimum viable scene for `past.length` delta assertions.
- **Driver README documents all 6 contracts upfront** so downstream plans have a single reference for `__drive*` shapes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing Plan 01 tokens already satisfy tokens.test.ts; this is the expected baseline for a phase where Wave 1 work partially preceded Wave 0 scaffolding.

## Verification

```bash
ls tests/phase33/*.test.* | wc -l   # → 11 ✓
npx vitest run tests/phase33/       # → 11 suites, 31 failing / 13 passing (RED state) ✓
```

## Next Plan Readiness

- Every Wave 1/2/3 plan has a concrete test target to flip GREEN
- Driver contracts locked before implementation
- Count-regression + single-undo tests in place before Plans 05 and 08 execute

## Self-Check: PASSED

All 12 files verified on disk:

- tests/phase33/README.md — FOUND
- tests/phase33/tokens.test.ts — FOUND
- tests/phase33/typography.test.ts — FOUND
- tests/phase33/spacingAudit.test.ts — FOUND
- tests/phase33/useReducedMotion.test.ts — FOUND
- tests/phase33/collapsibleSections.test.ts — FOUND
- tests/phase33/libraryCard.test.ts — FOUND
- tests/phase33/phase33LibraryMigration.test.tsx — FOUND
- tests/phase33/floatingToolbar.test.ts — FOUND
- tests/phase33/gestureChip.test.ts — FOUND
- tests/phase33/rotationPresets.test.ts — FOUND
- tests/phase33/inlineTitleEdit.test.ts — FOUND

All 3 task commits verified: `84fe1b7`, `ae0e308`, `cd5965d`.

---
*Phase: 33-design-system-ui-polish*
*Completed: 2026-04-22*
