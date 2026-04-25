---
phase: 42-bug01-tilesize-isolation
plan: 01
subsystem: 3d-render
tags: [bug-fix, ceiling, user-texture, scale, isolation, gh-96, milestone-close]
requirements: [BUG-01]
dependency-graph:
  requires:
    - Phase 34 user-texture pipeline (userTextureCache + useUserTextures + Wallpaper.scaleFt + FloorMaterial.scaleFt patterns)
  provides:
    - Ceiling.scaleFt optional field (per-surface tile-size override)
    - CeilingMesh resolver: ceiling.scaleFt ?? entry?.tileSizeFt ?? 2
    - CeilingPaintSection apply-time write of scaleFt alongside userTextureId
    - 4 new tests in tests/userTextureSnapshot.test.ts asserting per-surface isolation
  affects:
    - none (additive — no breaking changes; existing snapshots without scaleFt fall through to catalog default)
tech-stack:
  added: []
  patterns:
    - "Per-surface tile-size override mirrored across all 3 surface types (Wall/Floor/Ceiling)"
    - "Implicit-migration-by-resolver-fallback pattern (no version bump for additive optional fields)"
key-files:
  created:
    - .planning/phases/42-bug01-tilesize-isolation/42-01-fix-SUMMARY.md
  modified:
    - src/types/cad.ts (Ceiling.scaleFt field + JSDoc)
    - src/three/CeilingMesh.tsx (resolver precedence updated)
    - src/components/CeilingPaintSection.tsx (handleCeilingUserTexture accepts tileSizeFt + writes scaleFt)
    - tests/userTextureSnapshot.test.ts (BUG-01 isolation describe block, 4 new tests)
decisions:
  - D-01 honored: field name is `scaleFt` (matches Wallpaper.scaleFt + FloorMaterial.scaleFt convention), NOT `tileSizeFt`. User-facing UI label stays "Tile size."
  - D-02 honored: resolver precedence ceiling.scaleFt ?? entry?.tileSizeFt ?? 2.
  - D-03 honored: no CADSnapshot version bump. Implicit migration via resolver fallback.
  - D-04 honored: apply-time write in CeilingPaintSection.handleCeilingUserTexture mirrors FloorMaterialPicker + WallSurfacePanel pattern. The handler now accepts (id, tileSizeFt) — previously the second arg was being silently dropped.
  - D-05 honored: per-placement edit UI deferred to v2.0+ (Phase 999.3 design-effect override).
  - D-06 honored: 4 new tests — 1 round-trip integration test + 3 resolver-precedence unit tests inline (kept in userTextureSnapshot.test.ts rather than a new file per CONTEXT.md "Claude's Discretion" guidance).
  - D-07 honored: single plan, 4 atomic commits.
deviations:
  - GH #96 was already CLOSED at fix time (likely auto-closed by an earlier PR's reference to it). Used `gh issue comment` instead of `gh issue close --comment` to leave the audit trail. Effect on milestone audit: no change — issue is closed with PR-reference content.
  - Plan suggested 4 unit tests in a NEW dedicated file (tests/ceilingMeshScaleResolver.test.ts) — kept all 4 cases inline in tests/userTextureSnapshot.test.ts instead per CONTEXT D-06 "Claude's Discretion" (cleaner diff, no new file overhead). 3 resolver-precedence cases + 1 round-trip integration case.
  - Plan executed inline by orchestrator (no gsd-executor subagent). 4 atomic commits, ~30 min total — well under the 1-2 hour estimate.
verification:
  manual:
    - npx tsc --noEmit clean (only pre-existing baseUrl deprecation warning)
    - All 4 atomic commits landed: 4011eee (schema), 0a9ae59 (resolver), 293cc83 (apply-time write), and the test commit (this commit chain)
    - GH #96 has audit-trail comment referencing the fix
  automated:
    - npm test -- --run userTextureSnapshot → 10/10 pass (6 existing + 4 new BUG-01 tests)
    - Full vitest suite → 537 passed (up from 533 — the 4 new tests), 6 pre-existing failures unchanged (LIB-03/04/05 + App.restore × 3 — formally permanent per Phase 37 D-02)
    - npm run build → succeeds
  human-uat:
    - Manual smoke: open dev server, apply same user-texture to a wall and a ceiling. Edit the catalog tileSizeFt via UploadTextureModal. Confirm wall and ceiling each render at their own scaleFt — neither updates when catalog changes (the bug is fixed).
test-results:
  build: succeeds
  typecheck: clean (1 pre-existing baseUrl deprecation, unrelated)
  unit: 537 passed / 6 failed / 3 todo — pre-existing 6 unchanged; +4 new BUG-01 tests
  e2e: not run (no UI interaction changes; existing apply-time write semantics preserved)
---

# Phase 42 Plan 01 — BUG-01 Fix SUMMARY

## What shipped

4 atomic commits closing [GH #96](https://github.com/micahbank2/room-cad-renderer/issues/96):

| # | Commit | What |
|---|--------|------|
| 1 | `4011eee` | Add `Ceiling.scaleFt?: number` field with JSDoc |
| 2 | `0a9ae59` | `CeilingMesh` resolver: `ceiling.scaleFt ?? entry?.tileSizeFt ?? 2` |
| 3 | `293cc83` | `CeilingPaintSection.handleCeilingUserTexture` accepts and writes `scaleFt` |
| 4 | (this) | 4 new tests + GH #96 comment + plan summary + state updates |

## The bug, before and after

**Before:**
- Apply user-texture X to wall → `wallpaper.scaleFt` written at apply-time (per-surface, isolated)
- Apply same X to ceiling → `userTextureId` written, `scaleFt` silently dropped at the `CeilingPaintSection` handler boundary (the picker passes it; the handler signature was `(id)` not `(id, tileSizeFt)`)
- Edit catalog `tileSizeFt` → wall stays (override wins), **ceiling re-renders at new size** (catalog read at render)

**After:**
- Apply X to ceiling → `ceiling.scaleFt` written at apply-time (mirrors wall + floor)
- Edit catalog → both surfaces stick at their applied `scaleFt` (override wins everywhere)
- 4 tests guard the invariant: snapshot round-trip preserves per-surface `scaleFt` independence; resolver returns the override when present, catalog default when not, hardcoded 2 as last resort.

## Honest scope notes

- **Field name = `scaleFt`, not `tileSizeFt`.** Schema convention beats REQUIREMENTS-doc literal. User-facing UI label stays "Tile size."
- **No version bump.** Optional field + resolver fallback = implicit migration. Existing snapshots keep working without re-write.
- **No per-placement edit UI.** That's Phase 999.3 / v2.0+. This phase fixes the apply-time write + render path only.
- **Plan suggested a dedicated test file** (`tests/ceilingMeshScaleResolver.test.ts`); inlined all 4 cases in `tests/userTextureSnapshot.test.ts` instead — cleaner diff, same coverage.

## Phase 42 status

Single plan, 4 commits, complete.

**v1.9 milestone status: ALL phases complete.** Ready for `/gsd:audit-milestone v1.9` → `/gsd:complete-milestone v1.9` → `/gsd:new-milestone` for v2.0.
