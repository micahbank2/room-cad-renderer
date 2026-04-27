---
phase: 49-bug-02-wall-user-texture-first-apply
plan: 01
subsystem: three
tags: [three.js, r3f, react-three-fiber, textures, wallmesh, e2e, playwright, vitest]

requires:
  - phase: 34-user-uploaded-textures
    provides: "useUserTexture hook, userTextureCache module, saveUserTexture IDB API"
  - phase: 36-viz-10-regression
    provides: "VIZ-10 harness, wallMeshDisposeContract static test, dispose={null} contract"

provides:
  - "BUG-02 fixed: user-uploaded wall textures render in 3D on first apply without view toggle"
  - "src/test-utils/userTextureDrivers.ts: seedUserTexture + getWallMeshMapResolved drivers"
  - "e2e/wall-user-texture-first-apply.spec.ts: BUG-02 regression guard (2 tests)"
  - "wallMeshMaterials registry for test-mode material map inspection"

affects: [50-bug-03-wallpaper-toggle, wall-mesh, user-texture-pipeline]

tech-stack:
  added: []
  patterns:
    - "Direct map={userTex} prop on meshStandardMaterial instead of <primitive attach='map'> child for branches that only render when texture is non-null"
    - "Phase 49 test driver: wallMeshMaterials registry populated by WallMesh useEffect in test mode"
    - "useRef<THREE.MeshStandardMaterial> passed as 5th arg to renderWallpaperOverlay for material registry access"

key-files:
  created:
    - src/test-utils/userTextureDrivers.ts
    - e2e/wall-user-texture-first-apply.spec.ts
  modified:
    - src/three/WallMesh.tsx
    - tests/wallMeshDisposeContract.test.ts
    - src/main.tsx

key-decisions:
  - "Option 1 (direct map prop) used over Option 2 (needsUpdate effect): branch only mounts when userTex is non-null, so material construction always has the map set — no needsUpdate required"
  - "R3F does NOT auto-dispose externally-passed texture props; userTextureCache retains ownership — equivalent to removed dispose={null} guard"
  - "wallMeshMaterials registry exposed via __wallMeshMaterials window global; WallMesh reads it without importing the driver module in production"

patterns-established:
  - "BUG-02 pattern: when a conditional branch only renders after an async value resolves, use direct props (not <primitive attach=>) so Three.js compiles the shader with all slots at material construction time"

requirements-completed: [BUG-02]

duration: 8min
completed: 2026-04-27
---

# Phase 49 Plan 01: Wall User-Texture First-Apply Bug Summary

**Fixed BUG-02 by replacing `<primitive attach="map">` with direct `map={userTex}` prop in WallMesh.tsx, ensuring Three.js compiles the shader with the map slot at construction time and eliminating the 2D↔3D toggle workaround**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-27T15:55:00Z
- **Completed:** 2026-04-27T16:03:05Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- BUG-02 root cause eliminated: user-texture branch now uses `map={userTex}` direct prop; since the branch only mounts when `userTex` is non-null, Three.js compiles the shader WITH the map slot at construction — no `material.needsUpdate` required
- Phase 36 VIZ-10 contract preserved: R3F does not auto-dispose externally-passed texture props, so removing `<primitive dispose={null}>` does not break the non-disposing cache invariant
- wallMeshDisposeContract.test.ts updated to assert new contract: direct prop for user-texture branch, `<primitive>` still required for wallpaper/wallArt cached branches (3 sites remain)

## Task Commits

1. **Task 1: userTextureDrivers.ts + main.tsx install** - `177eba3` (feat)
2. **Task 2: WallMesh fix + dispose contract test update** - `4b61143` (fix)
3. **Task 3: new e2e spec** - `9112c98` (test)

**Plan metadata:** (docs commit pending)

## Files Created/Modified

- `src/test-utils/userTextureDrivers.ts` — seedUserTexture, getWallMeshMapResolved, wallMeshMaterials registry; installUserTextureDrivers() entry point
- `src/main.tsx` — installUserTextureDrivers() call added in test-mode block
- `src/three/WallMesh.tsx` — user-texture branch: `<primitive attach="map">` replaced with `map={userTex}` direct prop; matRefA/matRefB added; test-mode registry useEffect; explanatory comment block
- `tests/wallMeshDisposeContract.test.ts` — updated assertions: direct-prop positive assertion + >= 3 remaining `<primitive>` sites; Phase 49 contract documented in header
- `e2e/wall-user-texture-first-apply.spec.ts` — 2 tests: first-apply regression gate (1500ms waitForFunction) + 2D→3D→2D→3D toggle smoke

## Decisions Made

- **Option 1 (direct prop) over Option 2 (ref + needsUpdate):** The conditional branch only mounts when `userTex` is non-null. A fresh `meshStandardMaterial` is constructed with the map already set — Three.js compiles the shader with the map slot from the start. No `needsUpdate` needed. Option 2 would work too but is more complex than necessary for this specific case.
- **wallMeshMaterials registry via window global (not import):** WallMesh reads `(window as unknown).__wallMeshMaterials` in test mode instead of importing from userTextureDrivers.ts. This keeps the driver module out of the production bundle entirely.
- **Kept Phase 36 VIZ-10 test passing:** VIZ-10 harness uses `wallpaper-2d-3d-toggle.spec.ts` which uploads a real texture through the UI. That spec passed after the fix — confirms R3F does not auto-dispose the externally-passed `map` texture.

## Deviations from Plan

None - plan executed exactly as written. Option 1 (direct prop) was the recommended fix per 49-RESEARCH.md and it worked first-try. The matRef + 5th parameter approach for the renderWallpaperOverlay function matched the plan's specification exactly.

## Issues Encountered

None.

## Known Stubs

None — all data flows are wired through real IDB + cache.

## Next Phase Readiness

- BUG-02 closed. Phase 50 (BUG-03 — wallpaper/wallArt 2D↔3D toggle for user-uploaded textures) is next.
- The Phase 49 BUG-02 fix may incidentally help BUG-03 symptoms (per 49-RESEARCH.md §BUG-03 determination), but Phase 50 investigation is still warranted — BUG-03 has additional contributing factors (WebGL context re-upload) that are unconfirmed.

---
*Phase: 49-bug-02-wall-user-texture-first-apply*
*Completed: 2026-04-27*
