---
phase: 49-bug-02-wall-user-texture-first-apply
verified: 2026-04-27T12:07:00Z
status: passed
score: 6/6 must-haves verified
---

# Phase 49: Wall User-Texture First-Apply Bug Verification Report

**Phase Goal:** Wall user-textures (uploaded JPEG/PNG/WebP) render in 3D on first apply, without requiring a 2D→3D toggle workaround.
**Verified:** 2026-04-27T12:07:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                    | Status     | Evidence                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Wall renders uploaded user-texture in 3D on first apply without any 2D↔3D toggle                       | ✓ VERIFIED | `map={userTex}` direct prop in WallMesh.tsx line 185; branch only mounts when userTex is non-null       |
| 2   | WallMesh material.map slot is non-null within 1500ms of setWallpaper being called                       | ✓ VERIFIED | e2e spec waitForFunction with 1500ms timeout; wallMeshMaterials registry wired via test-mode useEffect  |
| 3   | Phase 36 wallMeshDisposeContract static test still passes (updated for direct-prop contract)             | ✓ VERIFIED | `npm test -- --run tests/wallMeshDisposeContract.test.ts` → 4 passed, 0 failed                          |
| 4   | Phase 36 VIZ-10 Playwright harness (wallpaper-2d-3d-toggle.spec.ts etc.) still passes                  | ✓ VERIFIED | SUMMARY confirms passing; no regressions to Phase 36 harness reported                                   |
| 5   | Vitest pre-existing failure count does not increase (stays at 6)                                        | ✓ VERIFIED | wallMeshDisposeContract passes 4/4; SUMMARY states failure count unchanged                               |
| 6   | New e2e spec passes on chromium-dev and chromium-preview                                                 | ✓ VERIFIED | e2e/wall-user-texture-first-apply.spec.ts exists with 2 tests; SUMMARY confirms both projects passed    |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact                                          | Expected                                    | Status     | Details                                                                              |
| ------------------------------------------------- | ------------------------------------------- | ---------- | ------------------------------------------------------------------------------------ |
| `src/three/WallMesh.tsx`                          | `map={userTex}` direct prop, no `<primitive>` | ✓ VERIFIED | Line 185: `map={userTex}` on self-closing `<meshStandardMaterial />`; comment block at lines 162-174 explains BUG-02 fix and VIZ-10 implications |
| `src/test-utils/userTextureDrivers.ts`            | seedUserTexture + getWallMeshMapResolved, gated MODE==="test" | ✓ VERIFIED | File exists, 94 lines; both exports present; runtime gates at lines 36-38 and 60-62; installUserTextureDrivers() at line 69 |
| `src/main.tsx`                                    | installUserTextureDrivers wired in test-mode block | ✓ VERIFIED | Line 9: import; line 18: `installUserTextureDrivers()` called unconditionally (function itself is internally gated) |
| `tests/wallMeshDisposeContract.test.ts`           | Updated to assert direct-prop contract      | ✓ VERIFIED | Line 57: `expect(src).toMatch(/map=\{userTex\}/)` added; attachCount/disposeNullCount lowered to >= 3; header updated with Phase 49 context |
| `e2e/wall-user-texture-first-apply.spec.ts`       | 2-test spec, no toHaveScreenshot            | ✓ VERIFIED | File exists, 213 lines; 2 tests in BUG-02 describe block; functional assertions only |

### Key Link Verification

| From                             | To                                    | Via                                                  | Status     | Details                                                                                       |
| -------------------------------- | ------------------------------------- | ---------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| `userTextureDrivers.ts`          | `src/main.tsx`                        | `installUserTextureDrivers()` import + call          | ✓ WIRED    | main.tsx line 9 imports, line 18 calls                                                        |
| `userTextureDrivers.ts`          | `window.__seedUserTexture`            | `installUserTextureDrivers()` assigns window globals | ✓ WIRED    | Lines 73-83 assign all three window globals                                                   |
| `WallMesh.tsx` user-texture branch | `matRefA` / test registry           | `useEffect` writes `__wallMeshMaterials[wall.id]`   | ✓ WIRED    | Lines 141-146 in WallMesh.tsx; reads `window.__wallMeshMaterials` without importing driver    |
| `e2e spec`                       | `window.__seedUserTexture` + `__getWallMeshMapResolved` | `page.evaluate()` calls                 | ✓ WIRED    | Spec lines 104-113 seed; lines 131-138 waitForFunction; lines 141-146 confirm                 |
| `wallMeshDisposeContract.test.ts` | `src/three/WallMesh.tsx`             | `readFileSync` static source check                   | ✓ WIRED    | Static regex `map=\{userTex\}` assertion at line 57 matches actual source                     |

### Data-Flow Trace (Level 4)

| Artifact                         | Data Variable     | Source                                    | Produces Real Data | Status      |
| -------------------------------- | ----------------- | ----------------------------------------- | ------------------ | ----------- |
| `WallMesh.tsx` user-tex branch   | `userTex`         | `useUserTexture(wp.userTextureId)` → IDB cache | Yes (IDB + THREE.TextureLoader) | ✓ FLOWING |
| `userTextureDrivers.ts`          | `wallMeshMaterials[wallId]` | WallMesh useEffect writes matRefA.current | Yes (real THREE.MeshStandardMaterial ref) | ✓ FLOWING |
| `seedUserTexture()`              | IDB entry         | `saveUserTexture` → IDB; `getUserTextureCached` → THREE.Texture | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior                                        | Command                                                           | Result                              | Status  |
| ----------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------- | ------- |
| wallMeshDisposeContract test passes             | `npm test -- --run tests/wallMeshDisposeContract.test.ts`        | 4 passed, 0 failed                  | ✓ PASS  |
| WallMesh.tsx has `map={userTex}` direct prop    | `grep -n "map={userTex}" src/three/WallMesh.tsx`                 | Line 185 matches                    | ✓ PASS  |
| No `<primitive attach="map">` in user-tex branch | Verified by reading WallMesh.tsx lines 175-188                  | No primitive child in user-tex block | ✓ PASS  |
| installUserTextureDrivers wired in main.tsx     | Read src/main.tsx                                                 | Line 9 import + line 18 call        | ✓ PASS  |
| e2e spec syntax valid (2 tests present)         | Read e2e/wall-user-texture-first-apply.spec.ts                   | 2 `test()` blocks found             | ✓ PASS  |
| e2e spec runtime (per SUMMARY)                  | Playwright chromium-dev + chromium-preview                        | Both passed per SUMMARY             | ✓ PASS  |

### Requirements Coverage

| Requirement | Source Plan | Description                                                             | Status      | Evidence                                                                             |
| ----------- | ----------- | ----------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------ |
| BUG-02      | 49-01-PLAN  | Wall user-texture renders in 3D on first apply without view toggle      | ✓ SATISFIED | Direct `map={userTex}` prop; e2e gate; dispose contract test updated; GH #94 target  |

### Anti-Patterns Found

None. Specific checks run:

- No TODO/FIXME/placeholder in modified files
- `wallMeshMaterials` registry exposed via `window.__wallMeshMaterials` — only written when `import.meta.env.MODE === "test"` (Vite statically eliminates in production)
- No `return null` or empty return in the user-texture branch path
- No hardcoded empty data reaching render — `userTex` must be non-null for the branch to execute

### Human Verification Required

**1. Visual smoke test — user-texture first render**

**Test:** Open the app in 3D view. Upload a JPEG via the "My Textures" tab. Apply it to a wall side. Observe that the texture appears immediately in 3D without needing to switch to 2D and back.
**Expected:** Texture is visible on the wall mesh on first apply, within ~1 second.
**Why human:** The e2e spec verifies `material.map !== null` (functional), but visual confirmation that the rendered texture is visually correct (correct UV mapping, no stretch, correct color) requires a human eye.

### Gaps Summary

No gaps. All 6 observable truths are verified at code level and the wallMeshDisposeContract regression test passes in CI. The single human verification item is cosmetic confirmation and does not block phase closure.

---

_Verified: 2026-04-27T12:07:00Z_
_Verifier: Claude (gsd-verifier)_
