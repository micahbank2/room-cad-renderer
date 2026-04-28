---
phase: 51
plan: 01
subsystem: snapshot-migration
tags: [debt-resolution, async-refactor, idb, sha256-dedup, floor-material]
dependency_graph:
  requires: [Phase34-LIB07-userTextureStore, Phase32-LIB08-FloorMaterialKind]
  provides: [DEBT-05-resolution, loadSnapshot-async-contract]
  affects: [cadStore, snapshotMigration, all-23-loadSnapshot-callers]
tech_stack:
  added: []
  patterns:
    - "Pattern A: async pre-pass before Immer produce() — runs migrateFloorMaterials before set(produce(...))"
    - "SHA-256 dedup via saveUserTextureWithDedup (existing Phase 34 pipeline)"
    - "Idempotent version gate: snap.version >= 3 returns immediately"
key_files:
  created:
    - tests/lib/snapshotMigration.floorMaterial.test.ts
    - e2e/floor-material-migration.spec.ts
  modified:
    - src/lib/snapshotMigration.ts
    - src/stores/cadStore.ts
    - src/App.tsx
    - src/components/ProjectManager.tsx
    - src/components/WelcomeScreen.tsx
    - src/components/TemplatePickerDialog.tsx
    - src/__tests__/cadStore.paint.test.ts
    - tests/phase31LabelOverride.test.tsx
    - tests/snapshotMigration.test.ts
    - tests/e2e/playwright-helpers/seedRoom.ts
    - e2e/tree-empty-states.spec.ts
    - e2e/keyboard-shortcuts-overlay.spec.ts
    - e2e/display-mode-cycle.spec.ts
    - e2e/saved-camera-cycle.spec.ts
    - e2e/tree-expand-persistence.spec.ts
    - e2e/wall-user-texture-first-apply.spec.ts
    - tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts
    - tests/e2e/specs/floor-user-texture-toggle.spec.ts
    - tests/e2e/specs/wallart-2d-3d-toggle.spec.ts
    - tests/e2e/specs/ceiling-user-texture-toggle.spec.ts
decisions:
  - "Pattern A chosen (async pre-pass then sync produce) — only Immer-compatible approach"
  - "WelcomeScreen handleFile uses void loadSnapshot() fire-and-forget (safe: v3 defaultSnapshot has no data URLs)"
  - "defaultSnapshot() and snapshot() both write version:3 (D-05)"
  - "Existing tests/snapshotMigration.test.ts updated to expect version:3 from defaultSnapshot()"
metrics:
  duration: "~28 minutes"
  completed: "2026-04-28T01:12:29Z"
  tasks: 4
  files_modified: 21
---

# Phase 51 Plan 01: FloorMaterial Legacy Data-URL Migration Summary

**One-liner:** Async `loadSnapshot` refactor + SHA-256 IDB migration pipeline converts legacy `kind:custom` FloorMaterial data URLs to `kind:user-texture` references on project open, eliminating multi-MB base64 payloads from saved JSON.

## What Was Built

Phase 51 resolves DEBT-05 (GH #95): saved projects with user-uploaded floor textures embedded base64 data URLs directly in snapshot JSON, causing file sizes in the MBs. This phase implements a one-time async migration that intercepts legacy `FloorMaterial { kind: "custom", imageUrl: "data:..." }` entries at snapshot load time, decodes them, hashes them via SHA-256, stores them in the existing `room-cad-user-textures` IDB keyspace via `saveUserTextureWithDedup`, and rewrites the entry to `{ kind: "user-texture", userTextureId }`. Snapshot version bumps 2 → 3 to mark migration complete.

## Architecture Decision: Pattern A

The core constraint is that Immer `produce()` callbacks must be synchronous, but IDB writes require `await`. Pattern A solves this cleanly:

```
loadSnapshot: async (raw) => {
  const shaped = migrateSnapshot(raw);         // sync: v1→v2
  const migrated = await migrateFloorMaterials(shaped); // async: v2→v3 IDB
  set(produce((s) => { s.rooms = migrated.rooms; ... })); // sync
}
```

The `set(produce(...))` call is still fully synchronous — only the outer `loadSnapshot` function is async. No Immer constraints violated.

## Caller Impact: 23 Sites Updated

- 7 production callers: cadStore (type + impl), App.tsx, ProjectManager (×2), WelcomeScreen (×2), TemplatePickerDialog (×2)
- 3 vitest tests: cadStore.paint (×2), phase31LabelOverride (×1)
- 12 e2e call sites: seedRoom.ts + 11 spec files — evaluate callbacks made `async`, all `loadSnapshot` calls `await`ed, type casts updated to `Promise<void>`

## Tests

- 6 vitest unit cases (TDD — written RED first, then GREEN): happy path, no-op, v3 passthrough, malformed URL, SHA-256 dedup, IDB quota rejection
- 3 e2e scenarios: user-texture rewrite assertion, no `data:image/` in serialized rooms, clean v2 regression

## Regression Guards

- Phase 32 VIZ-10 `wallpaper-2d-3d-toggle.spec.ts` — PASSES (D-07)
- Phase 49 BUG-02 `wall-user-texture-first-apply.spec.ts` — PASSES (D-07)
- Phase 36 `floor-user-texture-toggle.spec.ts` — updated, PASSES
- Vitest pre-existing failure count: 4 test IDs (6 individual cases) — unchanged from baseline

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] tests/snapshotMigration.test.ts asserted version:2 from defaultSnapshot()**
- **Found during:** Task 1 (GREEN phase — vitest full suite run)
- **Issue:** Existing test `"empty/unknown input returns default single-room snapshot"` expected `d.version === 2` but `defaultSnapshot()` was updated to return `version: 3` per D-05. This caused a new test failure (not a pre-existing one).
- **Fix:** Updated test assertion from `expect(d.version).toBe(2)` to `expect(d.version).toBe(3)` with a comment referencing Phase 51 D-05.
- **Files modified:** `tests/snapshotMigration.test.ts`
- **Commit:** 84e085b

## Known Stubs

None. All migration paths are fully wired end-to-end.

## Self-Check: PASSED

Files created/modified verified to exist:
- [x] `tests/lib/snapshotMigration.floorMaterial.test.ts` — exists, 6 tests pass
- [x] `e2e/floor-material-migration.spec.ts` — exists, 3 tests pass
- [x] `src/lib/snapshotMigration.ts` — migrateFloorMaterials exported, defaultSnapshot returns v3
- [x] `src/stores/cadStore.ts` — loadSnapshot is async Promise<void>, snapshot() writes v3

Commits:
- [x] 84e085b — task 1 (TDD RED+GREEN, migrateFloorMaterials + 6 unit tests)
- [x] d455635 — task 2 (async loadSnapshot refactor + 7 production callers + 3 vitest)
- [x] e32b792 — task 3 (11 e2e caller sites updated)
- [x] f4d3bed — task 4 (floor-material-migration.spec.ts)
