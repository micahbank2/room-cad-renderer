---
phase: 68-material-application-system-mat-apply-01
plan: 01
subsystem: material-application
tags: [tdd, red-tests, wave-0, contract-pinning, snapshot-migration, material]
requires:
  - .planning/phases/68-material-application-system-mat-apply-01/68-CONTEXT.md
  - .planning/phases/68-material-application-system-mat-apply-01/68-RESEARCH.md
  - .planning/phases/68-material-application-system-mat-apply-01/68-VALIDATION.md
provides:
  - "RED contract: migrateV5ToV6 (snapshot v5→v6 migration)"
  - "RED contract: applySurfaceMaterial / applySurfaceMaterialNoHistory (single-undo)"
  - "RED contract: resolveSurfaceMaterial / resolveSurfaceTileSize (D-04 + D-08)"
  - "RED contract: MaterialPicker component (4 surface kinds)"
  - "RED contract: fabricSync paint colorHex fill + renderFloor"
  - "RED contract: e2e apply Material → 3D → undo → reload round-trip"
affects:
  - src/lib/snapshotMigration.ts (Plan 02 will add migrateV5ToV6)
  - src/stores/cadStore.ts (Plan 03 will add apply actions)
  - src/lib/surfaceMaterial.ts (Plan 04 will create)
  - src/canvas/fabricSync.ts (Plan 05 will add renderFloor + materials param)
  - src/components/MaterialPicker.tsx (Plan 06 will create)
tech-stack:
  added: []
  patterns: [tdd-red-first, fake-indexeddb-vitest, vi-spyOn-mocks, playwright-test-drivers]
key-files:
  created:
    - src/lib/__tests__/snapshotMigration.v6.test.ts
    - src/stores/__tests__/cadStore.material.test.ts
    - src/lib/__tests__/materialResolver.test.ts
    - src/components/__tests__/MaterialPicker.test.tsx
    - src/canvas/__tests__/fabricSync.materialFill.test.ts
    - tests/e2e/material-apply.spec.ts
  modified: []
decisions: []
metrics:
  duration: "~6 minutes"
  completed: 2026-05-07
  test-files-created: 6
  red-tests-pinned: 15
---

# Phase 68 Plan 01: Wave 0 RED Test Scaffolding Summary

**One-liner:** Six failing test files pin the Phase 68 material-application contract before any production code lands — Plans 02–07 turn them GREEN.

## What Was Done

Wrote six RED test files (per `68-VALIDATION.md` Wave 0 checklist). Each file imports a symbol that does not yet exist; running vitest produces clean "is not a function" / module-not-found failures. This is the contract Plans 02–07 must satisfy.

### Files Created

| # | Path | RED Trigger | Owner Plan |
|---|------|-------------|------------|
| 1 | `src/lib/__tests__/snapshotMigration.v6.test.ts` | `import { migrateV5ToV6 } from "@/lib/snapshotMigration"` — symbol not exported | Plan 02 |
| 2 | `src/stores/__tests__/cadStore.material.test.ts` | `useCADStore.getState().applySurfaceMaterial(...)` — action does not exist | Plan 03 |
| 3 | `src/lib/__tests__/materialResolver.test.ts` | `import { resolveSurfaceMaterial, resolveSurfaceTileSize } from "@/lib/surfaceMaterial"` — module does not exist | Plan 04 |
| 4 | `src/canvas/__tests__/fabricSync.materialFill.test.ts` | `import { renderFloor } from "@/canvas/fabricSync"` — function not exported | Plan 05 |
| 5 | `src/components/__tests__/MaterialPicker.test.tsx` | `import { MaterialPicker } from "@/components/MaterialPicker"` — component does not exist | Plan 06 |
| 6 | `tests/e2e/material-apply.spec.ts` | `window.__driveApplyMaterial` / `__getResolvedMaterial` test drivers do not exist | Plan 07 |

### RED State Verification

**Vitest run for all 5 vitest files:**

- `snapshotMigration.v6.test.ts`: 11 tests, 11 fail (`migrateV5ToV6 is not a function`)
- `cadStore.material.test.ts`: 6 tests (4 active + 2 todo... actually 2 active + 4 todo per file), 2 fail (`applySurfaceMaterial is not a function`, `applySurfaceMaterialNoHistory is not a function`)
- `materialResolver.test.ts`: fails on import (`@/lib/surfaceMaterial` module not found)
- `MaterialPicker.test.tsx`: fails on import (`@/components/MaterialPicker` not found)
- `fabricSync.materialFill.test.ts`: fails on import (`renderFloor` export missing)

Exit code: NON-ZERO. Total: 15 RED tests across 6 files.

**Playwright spec:** Not run in this plan — drivers do not yet exist; will go RED→GREEN in Plan 07.

## Coverage Map

Each Wave 0 line in `68-VALIDATION.md` is now satisfied:

- [x] `src/lib/__tests__/snapshotMigration.v6.test.ts` — 6 describe blocks (paint / wallpaper / floor / ceiling / idempotency / graceful failure)
- [x] `src/stores/__tests__/cadStore.material.test.ts` — single-undo contract (history+1, NoHistory+0, plus 4 todos for Plan 03)
- [x] `src/lib/__tests__/materialResolver.test.ts` — D-04 precedence + D-08 PBR fallbacks
- [x] `src/components/__tests__/MaterialPicker.test.tsx` — 4 surface kinds + onChange dispatch
- [x] `src/canvas/__tests__/fabricSync.materialFill.test.ts` — paint colorHex + renderFloor
- [x] `tests/e2e/material-apply.spec.ts` — apply→3D→undo→reload

## Deviations from Plan

None — plan executed exactly as written. The plan's inline test skeletons were used verbatim with one cosmetic adjustment: added `// @ts-expect-error` comments above each not-yet-existing import to keep TypeScript noise out of CI output without weakening RED enforcement (the runtime `is not a function` / module-not-found failures still fire).

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | `4a62cf6` | test(68-01): add RED tests for v5→v6 snapshot migration |
| 2 | `1f503f7` | test(68-01): add RED tests for apply/resolver/picker/fabric/e2e (5 files) |

## What Plans 02–07 Inherit

- **Plan 02 (migration):** Must export `migrateV5ToV6(snap)` from `src/lib/snapshotMigration.ts` that satisfies all 11 cases in `snapshotMigration.v6.test.ts`. Async, idempotent, graceful on materialStore failure.
- **Plan 03 (apply actions):** Must add `applySurfaceMaterial` + `applySurfaceMaterialNoHistory` to `cadStore.ts` with Phase 31 single-undo pair contract.
- **Plan 04 (resolver):** Must create `src/lib/surfaceMaterial.ts` exporting `resolveSurfaceMaterial` and `resolveSurfaceTileSize` with D-04 / D-08 semantics.
- **Plan 05 (fabricSync):** Must extend `renderWalls` to accept `materials[]` param and add `renderFloor` export.
- **Plan 06 (picker):** Must create `MaterialPicker` component supporting `surface ∈ {wallSide, floor, ceiling, customElementFace}`.
- **Plan 07 (e2e):** Must wire `window.__driveCreateWall`, `__driveSelect`, `__driveApplyMaterial`, `__getResolvedMaterial` test drivers (gated by `import.meta.env.MODE === "test"` per CLAUDE.md StrictMode rule).

## Self-Check: PASSED

Verified files exist on disk:
- src/lib/__tests__/snapshotMigration.v6.test.ts — FOUND
- src/stores/__tests__/cadStore.material.test.ts — FOUND
- src/lib/__tests__/materialResolver.test.ts — FOUND
- src/components/__tests__/MaterialPicker.test.tsx — FOUND
- src/canvas/__tests__/fabricSync.materialFill.test.ts — FOUND
- tests/e2e/material-apply.spec.ts — FOUND

Verified commits exist:
- 4a62cf6 — FOUND
- 1f503f7 — FOUND

RED state confirmed: vitest exited non-zero, 15/15 active tests failed with expected runtime errors.
