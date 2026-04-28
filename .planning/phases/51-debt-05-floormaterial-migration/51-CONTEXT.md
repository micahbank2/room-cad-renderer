---
phase: 51-debt-05-floormaterial-migration
type: context
created: 2026-04-27
status: ready-for-research
requirements: [DEBT-05]
depends_on: [Phase 32 (LIB-08 user-texture infra + saveUserTextureWithDedup)]
---

# Phase 51: FloorMaterial Legacy Data-URL Migration (DEBT-05) — Context

## Goal

One-time migration: legacy `FloorMaterial { kind: "custom", imageUrl: "data:image/..." }` snapshot entries get rewritten to `{ kind: "user-texture", userTextureId }` references that point into the existing IDB user-texture keyspace. Saved JSON sizes drop from MBs (with embedded data URLs) to <50KB.

Source: [GH #95](https://github.com/micahbank2/room-cad-renderer/issues/95). Phase 32 (LIB-08) introduced the `userTextureId` reference shape but left the legacy data-URL path untouched.

## Pre-existing infrastructure

- `FloorMaterial` type at `src/types/cad.ts:177` already supports all three kinds (`preset`, `custom` with imageUrl, `user-texture` with userTextureId)
- IDB store: `src/lib/userTextureStore.ts` with `saveUserTextureWithDedup()`, SHA-256 dedup, `userTextureIdbStore` keyspace
- Snapshot migration: `src/lib/snapshotMigration.ts` with `migrateSnapshot(raw)` — currently SYNC, called inside `produce()` in cadStore
- Current snapshot version: 2 (defined at `src/stores/cadStore.ts:155`)

## Decisions

### D-01 — Async loadSnapshot (Option A)

Refactor `loadSnapshot` to async. The IDB writes required by migration are inherently asynchronous; trying to keep loadSnapshot sync (Option B "sync schema bump + async promotion pass") leaves state in a transitional shape and creates race conditions during early renders.

**Migration path:**
1. New signature: `loadSnapshot: (raw: unknown) => Promise<void>`
2. Update existing callers:
   - `src/App.tsx` silent-restore on mount (already inside an async useEffect — trivial)
   - `src/components/ProjectManager.tsx` openProject handler
   - `src/test-utils/*Drivers.ts` — any driver that calls loadSnapshot needs `await`
   - Any e2e spec that uses `__cadStore.getState().loadSnapshot(snap)` — update to `await __cadStore.getState().loadSnapshot(snap)`

**Why Option A over Option B/C:**
- Option B (tombstone + async promotion) leaves state inconsistent during the promotion window — first render after load shows wrong data
- Option C (lazy convert on next save) means migration only runs when user saves; legacy data-URL bloat persists for read-only projects
- Option A is the architecture the rest of the texture pipeline already uses (`getUserTextureCached`, `useUserTexture`) — fits naturally

### D-02 — Scope: FloorMaterial only

Issue #95 is explicitly FloorMaterial-scoped. Wallpaper and wallArt MAY have the same legacy data-URL pattern, but verifying that and migrating those would expand this phase 2-3×.

**If research finds wallpaper/wallArt also have legacy data-URL paths,** file a new GH issue + 999.x backlog entry. Do NOT expand Phase 51 scope.

### D-03 — Robustness: idempotent + graceful

The migration MUST be:
- **Idempotent:** snapshots already at version 3 skip migration entirely (version check at top of migrateSnapshot)
- **Graceful on malformed input:** if a data URL is truncated, has wrong MIME, or fails to decode → log a warning, leave the entry as-is (kind: "custom" with imageUrl preserved). Do NOT corrupt or drop the entry.
- **Dedup-aware:** use existing `saveUserTextureWithDedup()` so identical data URLs across multiple projects collapse to one IDB entry
- **Quota-tolerant:** if IDB write fails (quota exceeded), log + skip that entry (entry stays as legacy `custom` until user manually re-uploads)

Migration runs once per snapshot at load time; the schema version bump (v2 → v3) ensures it never runs twice on the same data.

### D-04 — Test coverage: 5-6 vitest cases + 1 e2e

**Vitest unit tests at `tests/lib/snapshotMigration.floorMaterial.test.ts`:**
1. v2 snapshot with 1 legacy custom FloorMaterial → after migration, kind is "user-texture", userTextureId is set, IDB has the texture
2. v2 snapshot with 0 legacy entries → no-op, version bumps to 3
3. v3 snapshot loaded → migration is skipped entirely
4. Malformed data URL (truncated) → entry preserved as legacy, warning logged, version still bumps
5. Two FloorMaterials with identical data URLs (same SHA-256) → IDB has 1 entry, both userTextureIds point to it
6. IDB quota exceeded simulation → entry preserved as legacy, version still bumps

**E2E spec at `e2e/floor-material-migration.spec.ts`:**
- Seed legacy v2 snapshot with a base64 data URL FloorMaterial (use a real ~50KB JPEG to make the size delta measurable)
- Load via `__cadStore.getState().loadSnapshot()` (now awaitable)
- Save the project (autosave)
- Read the saved snapshot back
- Assert: no `data:image/` strings in the JSON; userTextureId is present; floor still renders correctly in 3D

### D-05 — Snapshot version: 2 → 3

`defaultSnapshot()` returns `{ version: 3, ... }` after this phase. The migration function detects `version <= 2` (or missing version, treated as v1) and runs the FloorMaterial conversion.

The v1→v2 migration (Phase 17 wallsPerSide) keeps running when needed — chained migrations are correct (v1 → v2 → v3 in one load).

### D-06 — Atomic commits per task

Mirror Phase 49/50/52 pattern. One commit per logical change.

### D-07 — Zero regressions

The migration MUST NOT break:
- v2 snapshots WITHOUT legacy custom entries (most projects) — should behave identically
- Phase 32 LIB-06/07/08 user-texture upload + apply flow
- Phase 36 VIZ-10 regression harness
- Phase 49/50/52 e2e specs
- 6 pre-existing vitest failures stay at 6

## Out of scope

- Wallpaper / wallArt legacy data-URL migration (file as separate 999.x if research confirms it exists)
- Refactoring `userTextureStore.ts` IDB layer
- New PBR features ([#81](https://github.com/micahbank2/room-cad-renderer/issues/81))
- Phase 999.4 EXPLODE+saved-camera offset
- Cleanup of orphaned IDB textures (separate concern; Phase 32 has fallback-to-color logic)

## Files we expect to touch (estimate)

- `src/lib/snapshotMigration.ts` — new `migrateFloorMaterials()` function + version bump
- `src/stores/cadStore.ts` — `loadSnapshot` becomes async; `defaultSnapshot()` returns version 3
- `src/types/cad.ts` — possibly add a comment noting the deprecated `imageUrl` field's migration path
- `src/App.tsx` — await loadSnapshot in silent-restore useEffect
- `src/components/ProjectManager.tsx` — await loadSnapshot in openProject
- `src/test-utils/treeDrivers.ts`, `displayModeDrivers.ts`, `savedCameraDrivers.ts`, `userTextureDrivers.ts` — any that call loadSnapshot need updating
- Phase 46-52 e2e specs that call `__cadStore.getState().loadSnapshot(snap)` — add `await`
- New: `tests/lib/snapshotMigration.floorMaterial.test.ts`
- New: `e2e/floor-material-migration.spec.ts`

Estimated 1 plan, 3-4 tasks, ~10 files touched. Heaviest of v1.12 — bigger than 49/50/52 because the async signature change ripples to multiple callers.

## Open questions for research phase

1. **Async loadSnapshot caller audit:** exhaustive list of every site that calls `loadSnapshot` — production code AND tests AND e2e specs. Each needs to be updated.
2. **Idempotency strategy:** version check at top of `migrateSnapshot` is the easy path. Confirm v1 → v2 chained migration still works correctly.
3. **Malformed data URL handling:** what's the exact failure mode of `fetch(dataUrl)` or atob() on a corrupt input? How to detect and skip cleanly?
4. **IDB quota:** does the current `saveUserTextureWithDedup` already handle quota failures gracefully, or does it throw? Determines D-03 escalation handling.
5. **Test-fixture data URL size:** how big a real legacy FloorMaterial data URL gets in practice? Determines the e2e fixture size for measurable size-delta assertion.
