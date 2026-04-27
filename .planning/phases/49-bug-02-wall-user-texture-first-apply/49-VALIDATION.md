---
phase: 49-bug-02-wall-user-texture-first-apply
type: validation
created: 2026-04-27
requirements: [BUG-02]
---

# Phase 49 Validation Spec

## Test Paths

| Path | Kind | Status after phase |
|------|------|--------------------|
| `e2e/wall-user-texture-first-apply.spec.ts` | Playwright e2e (new) | GREEN |
| `tests/wallMeshDisposeContract.test.ts` | Vitest static (updated) | GREEN |

---

## Per-Task Verification Map

### Task 1 — Driver + main.tsx install

**Files:** `src/test-utils/userTextureDrivers.ts`, `src/main.tsx`

**Assertions:**
- `npx tsc --noEmit` exits 0
- `src/test-utils/userTextureDrivers.ts` exports `seedUserTexture`, `getWallMeshMapResolved`, `wallMeshMaterials`
- `src/main.tsx` installs `window.__seedUserTexture` and `window.__getWallMeshMapResolved` in `import.meta.env.MODE === "test"` block

---

### Task 2 — WallMesh fix + dispose contract update

**Files:** `src/three/WallMesh.tsx`, `tests/wallMeshDisposeContract.test.ts`

**WallMesh.tsx assertions:**
- `src/three/WallMesh.tsx` does NOT contain `<primitive attach="map" object={userTex}` (old pattern removed)
- `src/three/WallMesh.tsx` contains `map={userTex}` prop on `<meshStandardMaterial` (direct prop added)
- `src/three/WallMesh.tsx` still contains `<primitive attach="map"` for the wallpaper + wallArt branches (those are unchanged)
- Explanatory comment present at the user-texture branch (search for "Phase 49 fix")

**wallMeshDisposeContract.test.ts assertions:**
- `npx vitest run tests/wallMeshDisposeContract.test.ts` exits 0 (0 failures, 0 errors)
- Test file contains `expect(src).toMatch(/map=\{userTex\}/)` (positive assertion for direct prop)
- Test file comment updated to mention Phase 49 and direct-prop contract

---

### Task 3 — e2e spec

**File:** `e2e/wall-user-texture-first-apply.spec.ts`

**Spec structure:**
- `test.describe("BUG-02 — wall user-texture first-apply", ...)` present
- Test 1: "texture renders in 3D on first apply without view toggle"
  - Seeds texture via `__seedUserTexture`
  - Calls `setWallpaper` via `__cadStore.getState().setWallpaper(...)`
  - `waitForFunction` with 1500ms timeout on `__getWallMeshMapResolved(wallId)`
- Test 2: "texture still renders after switching 2D→3D→2D→3D" (BUG-03 smoke)
  - Same apply flow, view-mode toggle sequence, re-assert map non-null

**Run commands:**
```bash
npx playwright test e2e/wall-user-texture-first-apply.spec.ts --list
# Must list 2 tests and exit 0

npx playwright test e2e/wall-user-texture-first-apply.spec.ts --project=chromium-dev
# Must exit 0 (both tests GREEN)

npx playwright test e2e/wall-user-texture-first-apply.spec.ts --project=chromium-preview
# Must exit 0 (both tests GREEN)
```

---

## Regression Guard

All of the following must pass after Phase 49 ships:

| Check | Command | Expected |
|-------|---------|----------|
| TypeScript | `npx tsc --noEmit` | Exit 0 |
| Vitest unit/component (no new failures) | `npx vitest run 2>&1 \| grep "Tests"` | Same pass/fail as pre-49 baseline |
| Dispose contract static test | `npx vitest run tests/wallMeshDisposeContract.test.ts` | Exit 0 |
| Phase 46 e2e (ceiling user-texture toggle) | `npx playwright test e2e/ --project=chromium-dev` | Exit 0 |
| Phase 47 e2e (room display modes) | included above | Exit 0 |
| Phase 48 e2e (saved-camera cycle) | included above | Exit 0 |
| BUG-02 new spec | `npx playwright test e2e/wall-user-texture-first-apply.spec.ts` | Exit 0 |

---

## Acceptance Criteria (from REQUIREMENTS.md BUG-02)

- [ ] Upload a wall texture via "My Textures" tab, apply it to a wall while in 3D view — texture renders immediately (no 2D↔3D toggle required)
- [ ] Apply while in 2D view, switch to 3D — texture renders on first 3D render
- [ ] Existing upload flow (LIB-06/07/08) untouched — upload still works
- [ ] No regression on Phase 32 PBR pipeline
- [ ] `wallMeshDisposeContract` static test updated and passing
- [ ] Pre-existing vitest failure count unchanged (6)
