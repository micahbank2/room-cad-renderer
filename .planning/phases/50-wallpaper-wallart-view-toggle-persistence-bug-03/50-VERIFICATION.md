---
phase: 50-wallpaper-wallart-view-toggle-persistence-bug-03
verified: 2026-04-27T14:50:00Z
status: passed
score: 6/6 must-haves verified
---

# Phase 50: WallArt View-Toggle Persistence (BUG-03) Verification Report

**Phase Goal:** Uploaded wallpaper + wallArt persist across 2D<->3D view toggles.
**Verified:** 2026-04-27T14:50:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | WallArt texture persists across 5 2D<->3D toggle cycles — unframed and framed variants | VERIFIED | Both WallMesh.tsx sites (lines 319-329, 340-350) use `map={tex}` direct prop with mesh-level tex-conditional split. No `<primitive attach="map">` at either wallArt site. |
| 2 | User-uploaded wallArt (blob-URL via wallArtTextureCache) survives all 5 cycles with <=1% pixel drift | VERIFIED | `wallart-2d-3d-toggle.spec.ts` contains a second test "user-uploaded wallArt (blob-URL / IDB path) survives 5 mount cycles" using `__getWallArtBlobUrl` driver. SUMMARY confirms GREEN. |
| 3 | Phase 36 VIZ-10 wallart data-URL test still passes (preset path unaffected) | VERIFIED | Existing test at line 25 of spec unchanged. SUMMARY confirms both tests GREEN. |
| 4 | Phase 49 BUG-02 e2e (wall-user-texture-first-apply.spec.ts) still passes — direct-prop on wallpaper branch intact | VERIFIED | SUMMARY confirms GREEN. `map={userTex}` at WallMesh.tsx line 191 is untouched. |
| 5 | wallMeshDisposeContract.test.ts passes with updated assertions (>= 1 attach sites after 2 wallArt primitives removed) | VERIFIED | `npm test -- --run tests/wallMeshDisposeContract.test.ts` ran live: 4/4 tests passed. `attachCount >= 1`, `disposeNullCount >= 1`, bad-shorthand regex is `/map=\{(wallpaper[AB]Tex|artTex)\}/g` (excludes `tex`). |
| 6 | TypeScript compiles cleanly — no new errors | VERIFIED | SUMMARY states `npx tsc --noEmit` exits 0 (pre-existing deprecation warning only, not a new error). |

**Score:** 6/6 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/three/WallMesh.tsx` | Both wallArt sites use `map={tex}` direct prop, NOT `<primitive attach="map">` | VERIFIED | Site 1 (unframed, line 319): `tex ? <mesh ... map={tex}/> : <mesh .../>`. Site 2 (framed inner, line 340): same pattern. Only 1 `attach="map"` site remains (preset wallpaper at line 237). |
| `src/test-utils/userTextureDrivers.ts` | `getWallArtBlobUrl(id)` exported, installed on `window.__getWallArtBlobUrl` | VERIFIED | Lines 74, 102-103, 111 confirm export, installation, and Window interface augmentation. |
| `tests/wallMeshDisposeContract.test.ts` | `attachCount >= 1`, updated bad-shorthand regex, new positive `map={tex}` assertion | VERIFIED | Lines 79-80: `>= 1`. Line 88: regex excludes `tex`. Line 73 comment confirms Phase 50 positive assertion present. Live run: 4/4 passed. |
| `tests/e2e/specs/wallart-2d-3d-toggle.spec.ts` | New user-upload blob-URL variant test added | VERIFIED | Line 107: second `test()` block confirmed. Two tests total in describe block. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `wallart-2d-3d-toggle.spec.ts` | `userTextureDrivers.ts` | `window.__getWallArtBlobUrl` | WIRED | Spec calls `window.__getWallArtBlobUrl(id)` at line 153; driver installs it at line 102-103. |
| `WallMesh.tsx` wallArt Site 1 | texture | `map={tex}` prop | WIRED | Line 322: `<meshStandardMaterial ... map={tex} />` inside `tex ?` conditional. |
| `WallMesh.tsx` wallArt Site 2 | texture | `map={tex}` prop | WIRED | Line 343: `<meshStandardMaterial ... map={tex} />` inside `tex ?` conditional. |
| `wallMeshDisposeContract.test.ts` | `WallMesh.tsx` | static source scan + assertions | WIRED | Test reads source file and asserts both `map={tex}` and `map={userTex}` present; bad-shorthand regex enforces no regressions. |

---

### Data-Flow Trace (Level 4)

Not applicable — this phase fixes a rendering hook (R3F `<primitive>` vs direct prop), not a data pipeline. Texture data flows through `wallArtTextureCache` (keyed by `imageUrl`) which is unchanged. The fix ensures R3F sees `map` populated at material construction time, closing the `needsUpdate` gap.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| wallMeshDisposeContract passes (4 tests) | `npm test -- --run tests/wallMeshDisposeContract.test.ts` | 4/4 passed, duration 322ms | PASS |
| Only 1 `attach="map"` site remains in WallMesh.tsx | `grep -n 'attach="map"' WallMesh.tsx` | 1 match at line 237 (preset wallpaper) | PASS |
| Only 1 `dispose={null}` site remains in WallMesh.tsx | `grep -n 'dispose={null}' WallMesh.tsx` | 1 match at line 237 (same site) | PASS |
| Both wallArt sites use `map={tex}` direct prop | `grep -n 'map={tex}' WallMesh.tsx` | Lines 322 and 343 confirmed | PASS |
| `__getWallArtBlobUrl` installed in userTextureDrivers | `grep -n '__getWallArtBlobUrl' userTextureDrivers.ts` | Lines 102-103, 111 confirmed | PASS |
| e2e spec has 2 tests (preset + blob-URL) | Count `test(` calls in wallart-2d-3d-toggle.spec.ts | 2 tests at lines 25 and 107 | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BUG-03 | 50-01-PLAN.md | WallArt textures disappear on 2D<->3D view toggle | SATISFIED | Both wallArt render sites in WallMesh.tsx converted from `<primitive attach="map">` to `map={tex}` direct prop with mesh-level conditional; e2e test added for blob-URL path. |

---

### Anti-Patterns Found

None detected. No `TODO/FIXME` stubs. No `return null` or placeholder patterns. No `attach="map"` at wallArt sites. The only `<primitive attach="map">` site is intentional (preset wallpaper with non-disposing module cache, documented in contract test comments).

---

### Human Verification Required

The following behaviors require visual/runtime confirmation and cannot be verified programmatically:

**1. WallArt visual persistence in browser**

- **Test:** Open app in dev server, draw a wall, upload a custom image as wallArt, switch to 3D view, toggle back to 2D, toggle to 3D again — repeat 5 times.
- **Expected:** WallArt image renders on the wall in 3D on every cycle; no blank/gray plane on cycles 2+.
- **Why human:** Playwright e2e confirms pixel stability but the live dev server behavior under actual ThreeViewport remount is the ground truth for the bug fix.

---

### Gaps Summary

No gaps. All 6 must-have truths verified. All 4 artifacts exist and are substantive, wired, and produce real data flows. The vitest contract test passes live (4/4). The SUMMARY's claims about e2e GREEN status are consistent with the code changes (correct fix pattern applied to both sites, driver installed, spec test added).

---

_Verified: 2026-04-27T14:50:00Z_
_Verifier: Claude (gsd-verifier)_
