---
phase: 71-token-foundation-token-foundation
plan: 06
subsystem: testing + documentation
tags: [carry-over-tests, claudemd, token-foundation, phase-cleanup]
dependency_graph:
  requires: [71-04, 71-05]
  provides: [TOKEN-FOUNDATION complete, clean test baseline, updated CLAUDE.md]
  affects: [all future phases that read CLAUDE.md conventions]
tech_stack:
  added: []
  patterns: [pre-load guard in Zustand store, duplicate vi.mock removal]
key_files:
  created: []
  modified:
    - tests/snapshotMigration.test.ts
    - tests/pickerMyTexturesIntegration.test.tsx
    - tests/WallMesh.cutaway.test.tsx
    - tests/lib/contextMenuActionCounts.test.ts
    - tests/phase33/tokens.test.ts
    - tests/myTexturesList.test.tsx
    - tests/components/PropertiesPanel.area.test.tsx
    - tests/components/PropertiesPanel.opening.test.tsx
    - tests/productStore.test.ts
    - src/stores/productStore.ts
    - src/components/__tests__/RoomsTreePanel.savedCamera.test.tsx
    - src/components/__tests__/Toolbar.displayMode.test.tsx
    - src/components/__tests__/RoomsTreePanel.select.test.tsx
    - src/components/__tests__/RoomsTreePanel.empty.test.tsx
    - e2e/stairs.spec.ts
    - CLAUDE.md
decisions:
  - "D-15 stairs e2e: [data-stair-icon] is on the SVG element itself (lucide Footprints), not a span with text content"
  - "productStore.ts addProduct: restore pre-load guard (addProduct was missing the loaded check, silently added)"
  - "contextMenuActionCounts: duplicate vi.mock() call (lines 37 + 63) caused TypeErrors in full suite; removed first incomplete mock"
metrics:
  duration: "45m"
  completed: "2026-05-07"
  tasks: 3
  files: 16
---

# Phase 71 Plan 06: Carry-over Tests + CLAUDE.md — Summary

Token Foundation final cleanup: fix v1.17 carry-over tests, update CLAUDE.md design-system sections, run final phase grep audit.

## What Was Built

Resolved all test contract mismatches introduced by Phase 71 Plans 01-05 (token sweep, label case sweep, Material Symbols removal, Phase 68 schema changes). Updated CLAUDE.md to reflect the post-Phase-71 state of the design system.

## Task Results

### Task 1: snapshotMigration v5→v6 + pickerMyTexturesIntegration cleanup

- `tests/snapshotMigration.test.ts:32`: `expect(d.version).toBe(5)` → `toBe(6)` (Phase 68 MAT-APPLY-01 bumped the snapshot version)
- `tests/pickerMyTexturesIntegration.test.tsx`: removed 2 WallSurfacePanel MY TEXTURES tests (tab was removed in Phase 68); FloorMaterialPicker + SurfaceMaterialPicker MY TEXTURES tests preserved (those components still have the tab)
- **Commit:** `41b521c`

### Task 2: Carry-over tests + full-suite cleanup

Fixed all tests broken by Phase 71 Plans 01-05:

| File | Change |
|------|--------|
| `tests/WallMesh.cutaway.test.tsx` | Site count 13→15 (Phase 68 added 2 resolved-Material sites; all have `{...ghost}`) |
| `tests/lib/contextMenuActionCounts.test.ts` | Removed duplicate `vi.mock("@/stores/cadStore")` at line 37 (first call lacked `getState`); caused `TypeError: useCADStore.getState is not a function` in full suite |
| `tests/phase33/tokens.test.ts` | Updated radius-lg and spacing token assertions to reflect Pascal scale (Phase 71 supersedes Phase 33) |
| `tests/myTexturesList.test.tsx` | "UPLOAD"→"Upload" (D-09 mixed-case sweep) |
| `tests/components/PropertiesPanel.area.test.tsx` | `/AREA/`→`/Area/i` (D-09) |
| `tests/components/PropertiesPanel.opening.test.tsx` | WIDTH/HEIGHT/DEPTH/SILL/OFFSET → Width/Height/Depth/Sill/Offset (D-09) |
| `src/stores/productStore.ts` | Restored pre-load guard in `addProduct` (writing before load resolves could overwrite stored library; LIB-03 safety) |
| `src/components/__tests__/RoomsTreePanel.savedCamera.test.tsx` | `text-accent-light`→`text-foreground` (Pascal token sweep) |
| `src/components/__tests__/Toolbar.displayMode.test.tsx` | `text-accent`→`text-foreground`, `border-accent/30`→`border-ring` |
| `src/components/__tests__/RoomsTreePanel.select.test.tsx` | Stub test description: Obsidian token names → Pascal |
| `src/components/__tests__/RoomsTreePanel.empty.test.tsx` | Stub test description: `text-text-ghost`→`text-muted-foreground` |
| `e2e/stairs.spec.ts` | E6 test: `[data-stair-icon]` is the SVG element itself; removed `.textContent === "stairs"` check |

- **Commits:** `f23490e`, `20705c3`, `538a755`

### Task 3: CLAUDE.md + final grep audit

Updated sections:

**D-33 (Icon Policy):** Replaced 10-file Material Symbols allowlist with "lucide-react only across the chrome." Documents D-15 substitutes for CAD glyphs (stairs→Footprints, arch→Squircle, etc.).

**D-34 (Canonical Spacing+Radius):** Updated to Pascal scale — 10px base radius (`var(--radius)`), spacing xs/sm/md/lg/xl tokens at 8/12/16/24/32px. Added squircle utilities documentation (D-13).

**D-03 (Typography):** Replaced IBM Plex Mono/Inter/Space Grotesk with Barlow + Geist Mono. Documents font-mono dual semantics (D-10).

**NEW — Theme System (Phase 71):** Documents `useTheme` hook, `room-cad-theme` localStorage key, `__driveTheme` test driver, boot bridge script, D-06 phasing.

**UI Label Convention:** Updated to D-09 mixed-case chrome labels with D-10 UPPERCASE-preserved data identifiers.

**Styling Approach:** Replaced Obsidian token class list with Pascal equivalents.

**Final grep audit:** `grep -rln "obsidian-|text-text-|cad-grid-bg|glass-panel|accent-glow|ghost-border|material-symbols|font-display" src/` → 0 results.

- **Commit:** `48f4d0e`

## Test Counts

| Suite | Before | After |
|-------|--------|-------|
| vitest (unit) | 10 failed / 129 passed | **2 failed / 137 passed** |
| Playwright (e2e) | 2 failed / 184 passed | **0 failed / 186 passed** |

The 2 remaining vitest failures are pre-existing structural issues (not caused by this phase):
- `tests/SaveIndicator.test.tsx` — imports `@/components/SaveIndicator` which doesn't exist; pre-existing from a prior phase deletion
- `tests/SidebarProductPicker.test.tsx` — idb-keyval mock missing `createStore`; pre-existing from prior phase

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Restored productStore.ts addProduct pre-load guard**
- **Found during:** Task 2 — productStore.test.ts failure
- **Issue:** `addProduct` was writing to IndexedDB before `load()` resolved, potentially overwriting the user's stored product library with an empty array (LIB-03 safety regression)
- **Fix:** Added `if (!getState().loaded) return;` guard at start of `addProduct`
- **Files modified:** `src/stores/productStore.ts`
- **Commit:** `f23490e`

**2. [Rule 1 - Bug] Removed duplicate vi.mock causing contextMenuActionCounts suite pollution**
- **Found during:** Task 2 — test passes in isolation but fails in full suite
- **Issue:** Two `vi.mock("@/stores/cadStore")` calls in the same file; first one (line 37) lacked `getState`, causing `TypeError: useCADStore.getState is not a function` when running after other test files
- **Fix:** Removed the first incomplete mock declaration
- **Files modified:** `tests/lib/contextMenuActionCounts.test.ts`
- **Commit:** `20705c3`

**3. [Rule 1 - Bug] Fixed stairs E2E test for D-15 icon change**
- **Found during:** Task 3 (Playwright e2e run) — 2 e2e failures on `stairs.spec.ts:246`
- **Issue:** E6 test expected `textContent === "stairs"` (Material Symbols ligature text); Phase 71 replaced with Footprints SVG — no text content
- **Fix:** Changed assertion to check `[data-stair-icon]` SVG element is visible
- **Files modified:** `e2e/stairs.spec.ts`
- **Commit:** `538a755`

**4. [Rule 1 - Bug] Fixed phase33/tokens.test.ts for Phase 71 scale changes**
- **Found during:** Task 2 — tokens test failed in full suite
- **Issue:** Phase 33 tokens test asserted `--radius-lg: 8px` and NO `--spacing-*` tokens; Phase 71 changed both
- **Fix:** Updated assertions to match Pascal scale; preserved typography token assertions (still valid)
- **Files modified:** `tests/phase33/tokens.test.ts`
- **Commit:** `f23490e`

## Known Stubs

None.

## Self-Check: PASSED

- `tests/snapshotMigration.test.ts` — FOUND, passes
- `tests/pickerMyTexturesIntegration.test.tsx` — FOUND, passes
- `tests/WallMesh.cutaway.test.tsx` — FOUND, passes
- `tests/lib/contextMenuActionCounts.test.ts` — FOUND, passes in isolation AND full suite
- `CLAUDE.md` sections D-33/D-34/D-03/Theme System — all updated
- Final grep audit: 0 survivors in `src/`
- Commits `41b521c`, `f23490e`, `20705c3`, `48f4d0e`, `538a755` — all FOUND
- vitest: 2 failed (pre-existing) / 137 passed
- Playwright: 0 failed / 186 passed
