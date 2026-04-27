---
phase: 50-wallpaper-wallart-view-toggle-persistence-bug-03
plan: "01"
subsystem: three/WallMesh
tags: [bug-fix, viz-10, wall-art, texture, r3f, phase-50]
dependency_graph:
  requires: [Phase 49 BUG-02 fix (direct-prop pattern established)]
  provides: [BUG-03 fix (wallArt texture persistence across 2D↔3D toggle)]
  affects: [src/three/WallMesh.tsx, tests/wallMeshDisposeContract.test.ts, src/test-utils/userTextureDrivers.ts, tests/e2e/specs/wallart-2d-3d-toggle.spec.ts]
tech_stack:
  added: []
  patterns: [R3F direct map prop with mesh-level tex-conditional split (Phase 49 mechanism extended to wallArt)]
key_files:
  created: []
  modified:
    - src/three/WallMesh.tsx
    - tests/wallMeshDisposeContract.test.ts
    - src/test-utils/userTextureDrivers.ts
    - tests/e2e/specs/wallart-2d-3d-toggle.spec.ts
decisions:
  - "Applied Phase 49 direct-prop pattern to both wallArt render sites (unframed + framed inner); wallArtTextureCache retains ownership equivalent to removed dispose={null}"
  - "wallMeshDisposeContract assertions updated to >= 1 (only preset wallpaper site remains using primitive attach); bad-shorthand regex excludes tex (now correct for wallArt)"
  - "getWallArtBlobUrl reads IDB blob via getUserTexture, not raw idb-keyval, for store-abstraction consistency"
metrics:
  duration_minutes: 8
  completed_date: "2026-04-27T18:46:14Z"
  tasks_completed: 3
  files_modified: 4
---

# Phase 50 Plan 01: WallArt View-Toggle Persistence Fix (BUG-03) Summary

Fix BUG-03 (#71): wallArt textures disappearing on 2D↔3D view toggle by applying the proven Phase 49 direct-prop pattern to both wallArt render sites in `renderSideDecor`.

## What Was Done

Applied the Phase 49 BUG-02 fix mechanism to the two wallArt `<primitive attach="map" ... dispose={null} />` sites in `WallMesh.tsx`. Both unframed and framed-inner render paths now use `map={tex}` as a direct prop with a mesh-level `tex ?` conditional split, so the material is constructed with the map slot already filled — eliminating the `needsUpdate` gap that caused texture loss on ThreeViewport remount.

## Tasks

| Task | Commit | Description |
|------|--------|-------------|
| 1 | b80d048 | Fix both wallArt primitive sites in WallMesh.tsx + update dispose contract test |
| 2 | 246e43c | Add __getWallArtBlobUrl driver to userTextureDrivers |
| 3 | e6a3aca | Add blob-URL wallArt 5-cycle e2e test (VIZ-10 BUG-03 guard) |

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit` — exits 0 (pre-existing deprecation warning only, not a new error)
- `npx vitest run tests/wallMeshDisposeContract.test.ts` — all 4 it() blocks pass
- `npx vitest run` — 6 failed (matches pre-phase baseline, no new failures)
- `wallart-2d-3d-toggle.spec.ts` (chromium-dev) — 2 tests GREEN (data-URL + blob-URL)
- `wallpaper-2d-3d-toggle.spec.ts` (chromium-dev) — 1 test GREEN (D-07 guard)
- `grep -n 'attach="map"' src/three/WallMesh.tsx` — exactly 1 JSX site (preset wallpaper, line 237)
- `grep -n 'dispose={null}' src/three/WallMesh.tsx` — exactly 1 JSX site (same line)

## Known Stubs

None.

## Self-Check: PASSED

- src/three/WallMesh.tsx — FOUND
- tests/wallMeshDisposeContract.test.ts — FOUND
- src/test-utils/userTextureDrivers.ts — FOUND
- tests/e2e/specs/wallart-2d-3d-toggle.spec.ts — FOUND
- Commits b80d048, 246e43c, e6a3aca — FOUND in git log
