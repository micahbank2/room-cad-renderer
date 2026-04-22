---
phase: 34-user-uploaded-textures
plan: 03
subsystem: three-render
tags: [LIB-06, LIB-07, LIB-08, phase-34, render, viz-10-guard, user-texture-cache]
requires: [34-00, 34-01, 34-02]
provides:
  - userTextureCache.ts — non-disposing module-level Map<id, Promise<THREE.Texture | null>>
  - useUserTexture React hook — returns THREE.Texture | null, silent orphan fallback
  - user-texture branch in WallMesh (both sides), FloorMesh, CeilingMesh
  - window 'user-texture-deleted' event subscriber — invalidates cache + revokes ObjectURL
affects:
  - none — additive to existing render paths; zero pre-existing mesh behavior changed
tech_stack:
  added:
    - fake-indexeddb (dev-dep) — required by tests/setup.ts import (was missing from node_modules)
  patterns:
    - Non-disposing module Map cache (mirrors wallpaperTextureCache) — the anti-pattern is pbrTextureCache's refcount dispose (VIZ-10 regression root cause)
    - `<primitive attach="map" object={tex} dispose={null} />` on every user-texture render site (extends Phase 32 VIZ-07 contract)
    - ObjectURL lifecycle via `Map<id, url>` — revoked on invalidate (delete event) or _clearAllForTests
    - Static-source regex contract tests (idiomatic to this repo per tests/wallMeshDisposeContract.test.ts) for branch + attach + dispose assertions that don't require @react-three/test-renderer
key_files:
  created:
    - path: src/three/userTextureCache.ts
      purpose: "Non-disposing THREE.Texture cache keyed by UserTexture.id; subscribes to window 'user-texture-deleted' for immediate invalidation"
    - path: src/hooks/useUserTexture.ts
      purpose: "Thin React hook around getUserTextureCached; returns THREE.Texture | null; never disposes on unmount"
    - path: tests/userTextureCache.test.tsx
      purpose: "10 cases — dedup, SRGBColorSpace/RepeatWrapping config, orphan null, loader throw null, clearUserTextureCache, ObjectURL lifecycle, event invalidation, VIZ-10 non-disposing guard, id-change resolution, undefined id"
    - path: tests/userTextureOrphan.test.tsx
      purpose: "15 cases — static-source contract that each mesh imports the hook, branches on userTextureId, uses dispose={null}, doesn't reuse pbrTextureCache API, and guards the branch on non-null hook result"
    - path: tests/userTextureSnapshot.test.ts
      purpose: "6 cases — LIB-08 purity (no data:image, no Blob, <50KB with 5 textures applied), roundtrip purity, VIZ-10 cache-stability guard (5x same instance returned)"
  modified:
    - path: src/three/WallMesh.tsx
      change: "Hoisted useUserTexture(wall.wallpaper?.A|B?.userTextureId); renderWallpaperOverlay gained userTex arg and a priority branch. Repeat applied in effects (length/scaleFt, height/scaleFt). Orphan → falls through to pattern/paint/color branches."
    - path: src/three/FloorMesh.tsx
      change: "Hoisted useUserTexture on material.kind==='user-texture' id; useUserTextureBranch wins over PBR/preset when tex non-null. Repeat = roomSize / material.scaleFt; rotation honored. Orphan → flat-color fallback path below."
    - path: src/three/CeilingMesh.tsx
      change: "Highest-priority branch: useUserTexture(ceiling.userTextureId). Ceiling has no scaleFt field → tileSizeFt sourced via useUserTextures() catalog lookup (see D-03-tile-size-lookup). Orphan → surfaceMaterialId / paint / flat fallback."
decisions:
  - id: D-03-non-disposing-cache
    label: "userTextureCache uses a non-disposing Map<id, Promise<THREE.Texture | null>>; DOES NOT reuse pbrTextureCache refcount API"
    rationale: "Phase 32 Plan 05 shipped a refcount-dispose cache for wallpaper/wallArt/custom-floor which caused the VIZ-10 class bug (texture goes blank after 2D↔3D toggle because R3F auto-dispose invalidates the cached instance). Plan 32-07 reverted to the module-level non-disposing pattern. User textures share the same 2D↔3D toggle lifecycle → same contract. Static test tests/userTextureSnapshot.test.ts → 'VIZ-10 regression guard' proves 5x getUserTextureCached(id) returns the same instance."
  - id: D-03-tile-size-lookup
    label: "CeilingMesh sources tileSizeFt from useUserTextures() catalog instead of extending the Ceiling schema"
    rationale: "Two options considered: (1) add Ceiling.userTextureScaleFt field + pass it through at pick time, or (2) look up UserTexture.tileSizeFt via useUserTextures(). Option 2 wins because (a) the picker already pipes only userTextureId (no scale), (b) Ceiling already carries surfaceMaterialId as the only PBR-scale input (no per-placement override pattern), (c) useUserTextures() is already memoized via its own internal state — one IDB read per mount, not per render, (d) RESEARCH.md §H explicitly recommends this approach. Plan 02 pickers already landed — changing Ceiling schema would be cross-wave scope."
  - id: D-03-orphan-fallback-silent
    label: "Orphan ids resolve to null, NEVER throw"
    rationale: "D-08/D-09 locked: 'orphan fallback is silent; zero thrown errors; zero blank scene'. Both the IDB-miss path (rec === undefined) and the loader-error path (loadAsync throws) resolve to null in the cache promise chain. Meshes guard on `userTex !== null` before rendering the user-texture branch, so orphan = render fallback (flat color / legacy / PBR depending on mesh). Verified by cache tests #3+#4 and mesh tests under 'orphan-fallback guard'."
  - id: D-03-static-source-test-idiom
    label: "Mesh contract tests assert via static-source regex instead of full R3F render tree"
    rationale: "tests/wallMeshDisposeContract.test.ts (Phase 32) established the idiom: R3F requires @react-three/test-renderer which is not in package.json. Installing it risks Phase 32 fragility. Static-source regex catches every known mechanism for the VIZ-10 class bug (bare `map={tex}` shorthand, missing `dispose={null}`, missing import, missing branch guard) without introducing a heavyweight test dep."
metrics:
  new_files: 5   # 2 source + 3 test
  modified_files: 3  # 3 mesh files
  lines_added: ~580  # includes tests
  new_tests: 31  # 10 + 15 + 6
  commits: 5
  duration: "~30min"
  completed: "2026-04-22"
requirements:
  - id: LIB-06
    status: complete
    note: "Upload (Plan 01) → Pick (Plan 02) → Render (Plan 03) end-to-end. Test coverage: processTextureFile, UploadTextureModal, MyTexturesList, pickerMyTexturesIntegration, userTextureOrphan, userTextureSnapshot."
  - id: LIB-07
    status: complete
    note: "2048px downscale (Plan 01) + SHA-256 dedup (Plan 00) + MIME reject (Plan 01) + JPEG re-encode (Plan 01). Render (this plan) consumes the deduped Blob from IDB by id."
  - id: LIB-08
    status: complete
    note: "tests/userTextureSnapshot.test.ts proves JSON.stringify(snapshot) contains zero 'data:image' with 5 user-texture surfaces applied; snapshot size <50KB; no Blob instances anywhere; roundtrip-pure."
---

# Phase 34 Plan 03: Render Integration Summary

LIB-06 end-to-end: uploaded textures land on 3D surfaces via a non-disposing cache that mirrors the Phase 32 wallpaper pattern, with silent orphan fallback when the IDB entry is missing and automatic invalidation via the window `user-texture-deleted` event Plan 02 already emits.

## One-liner

User-uploaded textures render on walls/floors/ceilings via a non-disposing `userTextureCache` (VIZ-10-safe), silent orphan fallback, and LIB-08 snapshot purity verified.

## What Shipped

### `src/three/userTextureCache.ts`

Module-level `Map<string, Promise<THREE.Texture | null>>`. Key is `UserTexture.id`; value is a memoized Promise. Resolution path:

1. `getUserTexture(id)` Blob lookup via the Plan 00 IDB keyspace
2. Missing Blob → `null` (orphan path, silent)
3. `URL.createObjectURL(blob)` → `THREE.TextureLoader.loadAsync(url)`
4. On success: `colorSpace = SRGBColorSpace`, `wrapS = wrapT = RepeatWrapping`, `needsUpdate = true`
5. On loader throw: `null` (no throw propagates)

`clearUserTextureCache(id)` invalidates the cache entry AND revokes the ObjectURL. A module-load `window.addEventListener("user-texture-deleted", ...)` wires Plan 02's `DeleteTextureDialog` dispatch to immediate invalidation → next mesh render falls back to base color.

### `src/hooks/useUserTexture.ts`

`useState + useEffect` pattern (NOT R3F Suspense). Returns `null` while loading and on orphan. On id change: clears local state, re-resolves. On unmount: sets a `cancelled` flag — **never** calls `tex.dispose()`. The cache owns lifetime.

### Render-branch ordering per mesh

| Mesh          | Priority chain |
| ------------- | -------------- |
| `WallMesh`    | `wp.userTextureId && userTex` → `wp.kind==="paint"` → `wp.kind==="pattern" && imageUrl && tex` → `wp.kind==="color"` → null |
| `FloorMesh`   | `material.kind==="user-texture" && userTex !== null` → PBR (preset with pbr maps) → custom/preset/fallback chain |
| `CeilingMesh` | `ceiling.userTextureId && userTex !== null` → `pbrMaterial` (surfaceMaterialId) → paint / legacy flat |

Every user-texture render site uses `<primitive attach="map" object={tex} dispose={null} />` — extends the Phase 32 VIZ-07 contract enforced by `tests/wallMeshDisposeContract.test.ts`.

### Ceiling `tileSizeFt` — the D-03-tile-size-lookup decision

`Ceiling` carries no `scaleFt` field. Two options:

1. Extend schema with `Ceiling.userTextureScaleFt` and pipe it through Plan 02's picker dispatch.
2. Look up the `UserTexture.tileSizeFt` via `useUserTextures()` inside `CeilingMesh`.

Chose **option 2**. Plan 02 already landed; widening Ceiling schema would force changes across picker + cadStore actions + serialization migration. `useUserTextures()` is memoized via its own React state (one IDB read per mount) and the ceiling mesh is mounted once per ceiling. Negligible overhead. Floor keeps its per-surface `FloorMaterial.scaleFt` (already in schema), Wall keeps its per-side `Wallpaper.scaleFt` (already in schema) — ceilings are the only asymmetric case.

## VIZ-10 Regression Guard

Two test locations guard the non-disposing contract:

1. `tests/userTextureCache.test.tsx` test `"VIZ-10 guard: useUserTexture unmount does NOT dispose the texture"` — mounts the hook, lets the effect resolve, unmounts, asserts `tex.dispose` spy was never called, and further asserts that a subsequent `getUserTextureCached` call returns the SAME instance.

2. `tests/userTextureSnapshot.test.ts` test `"VIZ-10 guard: user texture survives 5x mount/unmount cycles with SAME instance"` — runs the cache lookup 5 times and asserts reference equality to the first result plus cache size stability.

If a future change introduces refcount dispose to `userTextureCache.ts` (e.g., by copying `pbrTextureCache`'s shape), both tests fail deterministically.

## LIB-08 Assertion Results

`tests/userTextureSnapshot.test.ts` builds a realistic CADSnapshot: 1 room, 4 walls, 3 of them with `wallpaper.A.userTextureId` or `wallpaper.B.userTextureId` set (3 total texture refs across walls), `floorMaterial: { kind: "user-texture", userTextureId, scaleFt, rotationDeg }`, and 1 ceiling with `userTextureId`. That's 5 user-texture surface references.

Assertions:
- `JSON.stringify(snapshot).indexOf("data:image") === -1` (no data URLs)
- `json.match(/utex_[a-z0-9_]+/g).length >= 5` (id references present)
- deep walk for `instanceof Blob` returns false (no Blobs in JSON-rendered structure)
- `json.length < 50_000` — actual observed size is well under, confirming the bloat guard
- `saveProject → loadProject` roundtrip preserves all four invariants

## Deviations from Plan

### Auto-fixed issues

**[Rule 3 - Blocking] Installed missing `fake-indexeddb` devDependency**
- **Found during:** Task 1 RED run
- **Issue:** `tests/setup.ts` imports `fake-indexeddb/auto` (Plan 00 Task 2 added it), but the package was never actually installed in `package.json`. Every test run failed at setup resolve.
- **Fix:** `npm install --save-dev fake-indexeddb`. `package.json` already listed it (was committed in Plan 00), but `node_modules` was out of sync in this worktree.
- **Files modified:** `package.json` (already recorded the dep; no diff), `package-lock.json`
- **Commit:** folded into `06c508a test(34-03): add failing tests for userTextureCache + useUserTexture` — the lockfile update committed there.

### Scope-bounded pre-existing failures (NOT auto-fixed, logged to deferred)

Observed 6 pre-existing test failures on the branch baseline (verified by `git stash && vitest run <files> && git stash pop` roundtrip): `AddProductModal` (3), `SidebarProductPicker` (2), `productStore` (1). None are touched by this plan's changes. Logged to `.planning/phases/34-user-uploaded-textures/deferred-items.md` for triage.

## Files Touched

### Created
- `src/three/userTextureCache.ts`
- `src/hooks/useUserTexture.ts`
- `tests/userTextureCache.test.tsx`
- `tests/userTextureOrphan.test.tsx`
- `tests/userTextureSnapshot.test.ts`
- `.planning/phases/34-user-uploaded-textures/deferred-items.md`

### Modified
- `src/three/WallMesh.tsx`
- `src/three/FloorMesh.tsx`
- `src/three/CeilingMesh.tsx`
- `package.json` / `package-lock.json` (fake-indexeddb node_modules resync)

## Commits

- `06c508a` test(34-03): add failing tests for userTextureCache + useUserTexture
- `79e310a` feat(34-03): implement userTextureCache + useUserTexture hook
- `3cb7a16` test(34-03): add failing orphan-fallback + mesh-integration tests
- `38ce4bf` feat(34-03): wire useUserTexture into Wall/Floor/CeilingMesh
- `e780c11` test(34-03): add LIB-08 snapshot purity + VIZ-10 cache stability tests

## Self-Check: PASSED

All plan-level acceptance criteria verified:
- 18/18 grep-based acceptance checks pass (see `<acceptance_criteria>` in plan)
- `tests/userTextureCache.test.tsx`: 10/10 green
- `tests/userTextureOrphan.test.tsx`: 15/15 green
- `tests/userTextureSnapshot.test.ts`: 6/6 green
- `tests/wallMeshDisposeContract.test.ts`: 4/4 green (Phase 32 contract not regressed)
- `tests/wallpaperTextureCache.test.tsx`: 6/6 green
- Files created exist on disk; commits found in `git log --oneline`.
