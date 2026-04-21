---
phase: 32-pbr-foundation
plan: 05
status: superseded
superseded_by: 32-06
updated: 2026-04-21
---

# Plan 32-05 — Superseded by 32-06

## Outcome

Plan 32-05 attempted to fix the wallpaper view-toggle regression (Gap 1 in `32-HUMAN-UAT.md`) by introducing a 3000ms debounce window before `tex.dispose()` in `pbrTextureCache.releaseTexture`. The idea: if a consumer unmounts and remounts within the grace window, the same cached `THREE.Texture` instance would be reused.

Tasks 1 and 2 landed (commits `8812605`, `ddb017e`). Task 3's human-verify checkpoint correctly blocked auto-advance. When Jessica manually tested, **the fix did not work** — uploaded wallpaper still disappeared after a single 2D → 3D → 2D → 3D cycle.

## Root-cause discovered in post-fix investigation

The debounce was the wrong layer. Console-log instrumentation showed:

- `acquireTexture` correctly returned the cached Texture instance on remount (CACHE-HIT logs confirmed)
- `setTex(tex)` fired with a non-null texture
- But the wall still rendered blank

Browser console showed `THREE.WebGLRenderer: Context Lost.` on every `ThreeViewport` unmount. When the new `ThreeViewport` mounted, it created a fresh `WebGLRenderer` with a fresh internal properties `WeakMap`. Cached textures that had `tex.dispose()` called on them (from a prior lifecycle) remained in a state that prevented clean re-upload to the new GL context, especially for large data-URL images.

## Remediation

All Plan 05 changes reverted in commit `0b15ba0`:

- `src/three/pbrTextureCache.ts` — removed `disposeGraceMs`, `pendingDispose` map, `__setDisposeGraceMsForTests` export. Back to synchronous dispose.
- `src/three/useSharedTexture.ts` — kept (still used by PBR consumers), jsdoc narrowed to document scope.
- `tests/pbrTextureCache.test.ts` — removed the `__setDisposeGraceMsForTests(0)` opt-in (no longer needed).
- `tests/pbrTextureCacheDebounce.test.ts` — deleted.
- `tests/wallpaperViewToggle.test.tsx` — deleted (was testing the superseded debounce contract).

## Successor: Plan 32-06

Plan `32-06-PLAN.md` replaces this attempt with the correct fix: restore pre-Phase-32 non-disposing module caches for wallpaper / wallArt / custom-upload floor textures. These were the three legacy paths that Plan 32-03's D-05 migration consolidated under `pbrTextureCache`. PBR paths remain on `pbrTextureCache` (fast reload from known URL paths, not affected by the data-URL re-decode gap).

## Commits landed

- `8812605` — feat(32-05): debounced disposal + 6 unit tests (reverted in `0b15ba0`)
- `ddb017e` — feat(32-05): useSharedTexture extraction + 3 regression tests (extraction retained, regression tests deleted)
- `45ab007` — docs(32-05): plan file committed
- `0b15ba0` — revert(32-05): full rollback + supersession
