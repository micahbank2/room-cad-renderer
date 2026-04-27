---
phase: 50-wallpaper-wallart-view-toggle-persistence-bug-03
type: validation
requirements: [BUG-03]
---

# Phase 50 Validation — BUG-03

## BUG-03 Requirement

**Uploaded wallpaper + wallArt textures must persist across 2D↔3D view toggles.**

Scope after research:
- User-uploaded wallpaper: ALREADY FIXED (Phase 49 incidental fix, confirmed by VIZ-10 harness)
- WallArt (both unframed and framed): STILL BROKEN — fixed in Phase 50

---

## Test Paths

### 1. Static contract — wallMeshDisposeContract.test.ts

**File:** `tests/wallMeshDisposeContract.test.ts`
**Run:** `npx vitest run tests/wallMeshDisposeContract.test.ts`

| it() block | Assertion after Phase 50 | Validates |
|-----------|--------------------------|-----------|
| WallMesh dispose contract | `attachCount >= 1` (was >= 3); `disposeNullCount >= 1` (was >= 3); `expect(src).toMatch(/map=\{tex\}/)` added; bad-shorthand regex excludes `tex` | Two wallArt primitives removed; 1 preset-wallpaper primitive remains |
| FloorMesh dispose contract | Unchanged — `attachCount >= 1`, no bare `map={texture}` | Unaffected by this phase |
| PBR paths untouched | Unchanged | Unaffected |
| Module caches non-disposing | `wallArtTextureCache` has no `.dispose()` or `cache.delete()` | wallArtTextureCache ownership contract intact |

---

### 2. VIZ-10 wallArt e2e — 5-cycle toggle invariant

**File:** `tests/e2e/specs/wallart-2d-3d-toggle.spec.ts`
**Run:** `npx playwright test tests/e2e/specs/wallart-2d-3d-toggle.spec.ts --project=chromium-dev`

| Test | Path | Assertion |
|------|------|-----------|
| "uploaded wallArt survives 5 mount cycles" (existing) | data-URL → `wallArtTextureCache` | mismatchRatio <= 0.01 for cycles 2-5 vs. cycle 1 baseline |
| "user-uploaded wallArt (blob-URL / IDB path) survives 5 mount cycles" (new) | IDB blob → ObjectURL → `wallArtTextureCache` | mismatchRatio <= 0.01 for cycles 2-5 vs. cycle 1 baseline |

Both tests cover the BUG-03 observable truth: wallArt texture pixel-stable across 5 toggle cycles.

---

### 3. Phase 49 regression guard (D-07)

**Files:**
- `e2e/wall-user-texture-first-apply.spec.ts` (Phase 49 BUG-02 e2e)
- `tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts` (VIZ-10 wallpaper)

**Run:**
```
npx playwright test e2e/wall-user-texture-first-apply.spec.ts --project=chromium-dev
npx playwright test tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts --project=chromium-dev
```

Both must stay GREEN. Phase 50 changes are confined to the two wallArt render sites; the
user-texture (wallpaper) `map={userTex}` branch is untouched.

---

### 4. TypeScript compilation

```
npx tsc --noEmit
```

Must exit 0. No new errors introduced.

---

### 5. Full vitest suite

```
npx vitest run
```

Failing count must match pre-phase baseline (6 pre-existing failures). No new failures.

---

## BUG-03 Observable Truths → Test Mapping

| Truth | Test |
|-------|------|
| WallArt texture persists — 5 toggle cycles, unframed | wallart-2d-3d-toggle.spec.ts — existing data-URL test |
| WallArt texture persists — 5 toggle cycles, user IDB path | wallart-2d-3d-toggle.spec.ts — new blob-URL test |
| Preset wallpaper unaffected (ALWAYS-WORKED path) | wallpaper-2d-3d-toggle.spec.ts — unchanged |
| Phase 49 BUG-02 fix not reverted | wall-user-texture-first-apply.spec.ts — unchanged |
| dispose={null} contract updated accurately | wallMeshDisposeContract.test.ts — updated assertions |
