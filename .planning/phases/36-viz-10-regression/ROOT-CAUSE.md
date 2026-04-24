---
phase: 36-viz-10-regression
type: root-cause
written_during: Plan 36-01
harness_status: not-reproduced
actual_cause_category: no-repro
---

# ROOT-CAUSE.md — VIZ-10 Wallpaper/wallArt 2D↔3D Regression

**Written:** 2026-04-24
**Evidence source:** Playwright harness in `tests/e2e/specs/` (Plan 36-01, commit `b2a274e`)
**Rule:** This document is authored BEFORE any fix (CONTEXT R-01). Plan 36-02's fix must reference this document, not speculation.
**Outcome:** No-repro — the harness could not reproduce the VIZ-10 regression signature under the instrumented chromium-dev project. Per R-04, this is a valid terminal state. Defensive code stays by default.

---

## 0. TL;DR

The Phase 36-01 harness ran 5-cycle 2D↔3D toggles on wallpaper (data-URL backed, data-URL upload via `__driveTextureUpload`) and wallArt (data-URL imageUrl), plus 2-cycle smoke on floor and ceiling user-textures. **All 4 scenarios passed with ≤1% pixel delta, and 14 of 14 golden images are byte-identical to cycle 1** (the one cycle 3 wallpaper exception had 0% pixel delta — hash differs due to PNG encoding non-determinism, not pixel content).

`window.__textureLifecycleEvents[]` captured 27 events per scenario across 5 mount/unmount cycles. The same `tex.uuid` (`818876d2-92f0-4584-88fb-2815df972a81` in the canonical wallpaper run) is returned by `userTextureCache.getUserTextureCached()` on every mount. `userTex:load-start` / `load-resolve` fire once at first mount; subsequent mounts fire `useUserTexture:hook-mount` → `hook-resolve` without re-entering the loader. This is the Phase 34 contract behaving exactly as designed.

**Conclusion:** In the harness environment (chromium-dev, Vite `--mode test`, real browser IDB, OrbitControls-damped orbit camera, 1280×720 viewport, headless), VIZ-10 does not manifest. Either (a) the Phase 32/34 defensive-code stack has already fixed it and the bug is latent pending defensive-code removal, or (b) the bug requires a trigger the harness doesn't exercise (specific camera poses, shadow-map interactions, production build minifier output, or live-browser GPU state not present in headless).

Plan 36-02 **must not** declare VIZ-10 resolved based on this no-repro alone. Plan 36-02's deliverable is: (i) activate the `chromium-preview` Playwright project to test the production-minified bundle, (ii) add CI headed-mode run as a sanity check, (iii) keep all Phase 32 defensive code until a reproducer surfaces. See §4 for per-piece triage.

---

## 1. Phase 32 Candidate Causes (from 32-07-SUMMARY.md:38-42)

Verbatim copy, with evidence-based status bar per candidate.

### Candidate 1 — HTMLImageElement WebGL context binding

> `HTMLImageElement` backing a data URL is tied to the old `WebGLRenderer`'s context and silently fails re-upload to the new one (would require a manual `texture.source.needsUpdate = true` on every mount).

**Predicted evidence signature:** Same `tex.uuid` across mounts; blank material on 2nd+ mount; WebGL inspector shows uploaded-but-empty texture slot.

**Status: INCONCLUSIVE (partial evidence against).**

- Same `tex.uuid` IS observed across all 5 mounts (matches prediction).
- Material does NOT render blank on 2nd+ mount (contradicts prediction — screenshots cycle 2-5 match cycle 1).
- WebGL inspector data not captured by the harness (`rendererUuid: null` — not populated by the `registerRenderer` site; this is an instrumentation gap Plan 36-02 may widen).
- The first predicted signature is present but the second (blank material) is not. Under the harness conditions, if Candidate 1 is the root cause, its trigger is not being hit.

### Candidate 2 — meshStandardMaterial uniform re-link failure

> `meshStandardMaterial` in R3F receives `<primitive attach="map">` child but doesn't re-link the uniform on the fresh material instance created at remount (would require forcing `material.needsUpdate = true` when the primitive attaches).

**Predicted evidence signature:** Same `tex.uuid` + `tex.source.data` valid; `material.map === null` or stale reference on 2nd+ mount.

**Status: INCONCLUSIVE (partial evidence against).**

- Same `tex.uuid` + same `sourceUuid` (`a5013b9b-990c-4e56-8a78-4cc298f0ca99` in the canonical run) on every resolve — matches first half of prediction.
- The `dispose={null}` fix at `WallMesh.tsx:136,182,268,288` (Phase 32 Plan 07) and `FloorMesh.tsx:102,127`, `CeilingMesh.tsx:110` may be neutralizing this exact failure mode. The harness shows no material.map issue because the fix is active.
- Evidence FOR Candidate 2 being the *fixed* cause: removing the `dispose={null}` and re-running the harness would be the next diagnostic step — deferred to Plan 36-02 defensive-code triage (§4).

### Candidate 3 — ImageBitmap decode pinning

> Image decode happens once off the event loop and the decoded pixel data is only bound to the first WebGL texture upload; second context's upload sees pre-decoded ImageBitmap in an unusable state.

**Predicted evidence signature:** First mount renders correctly; 2nd mount's `gl.texImage2D` call succeeds but samples to black; DevTools shows `ImageBitmap.closed === true`.

**Status: REFUTED.**

- 2nd mount does NOT sample to black — cycle-2 screenshot matches cycle-1 byte-for-byte (wallart: all 5 cycles identical; wallpaper: 4/5 identical, cycle 3 has PNG-encoding-level hash diff but 0 pixel delta).
- THREE's `TextureLoader.loadAsync` uses `HTMLImageElement` path, not `createImageBitmap`, in the tested configuration (verified by inspecting `tex.image` in `userTextureCache.ts` taps — `imageWidth: 16, imageHeight: 16` implies a standard `HTMLImageElement`, not an ImageBitmap which would not expose those properties the same way).
- If the decode were pinned to the first WebGL context, the harness WOULD have seen per-mount failures. It did not.

### Candidate 4 — Canvas sizing on 2nd mount

> Something unrelated to textures entirely — the 300x150 canvas size I observed during diagnostics hints that the R3F `<Canvas>` may not be mounting into a sized container on the second entry, so nothing renders regardless of texture state.

**Predicted evidence signature:** Canvas element `clientWidth/clientHeight` === 300/150 on 2nd mount; non-texture objects also blank/missing.

**Status: REFUTED in harness environment.**

- Lifecycle event taps captured `domWidth: 1024, domHeight: 592` on EVERY `viewport-mount` event across all 5 cycles (not 300×150).
- Non-texture objects (gridHelper, walls, lighting) all render on every cycle — screenshots show consistent framing.
- The 300×150 value in Phase 32 diagnostics was Phase 32-specific. Since Plan 32-07's defensive code landed, the canvas consistently mounts into a sized container under the harness conditions.
- Does NOT rule out Candidate 4 under different conditions (split-view → 3d, rapid toggles, mobile viewport) — but the ROADMAP-mandated 5-cycle full-3d scenario does not trigger it.

---

## 2. Actual Cause

**No actual cause identified by the Plan 36-01 harness.** Per R-04, this is documented honestly rather than papered over with a best-guess fix.

### 2a. What the harness DID observe (inline lifecycle evidence)

Wallpaper 5-cycle run, 27 events captured (trimmed to key evidence — full output in Playwright trace `test-results/wallpaper-2d-3d-toggle-*/trace.zip`):

```json
[
  { "t": 647.6,  "event": "useUserTexture:hook-mount", "id": "utex_1_modbkxrb" },
  { "t": 647.6,  "event": "userTex:load-start",        "id": "utex_1_modbkxrb" },
  { "t": 648.3,  "event": "viewport-mount",            "context": { "domWidth": 1024, "domHeight": 592 } },
  { "t": 1080.2, "event": "userTex:load-resolve",
                 "id": "utex_1_modbkxrb",
                 "uuid": "818876d2-92f0-4584-88fb-2815df972a81",
                 "context": { "imageWidth": 16, "imageHeight": 16,
                              "sourceUuid": "a5013b9b-990c-4e56-8a78-4cc298f0ca99" } },
  { "t": 1080.3, "event": "useUserTexture:hook-resolve",
                 "uuid": "818876d2-92f0-4584-88fb-2815df972a81",
                 "context": { "resolvedTo": "texture" } },
  // --- cycle 1 → 2 boundary ---
  { "t": 3862.8, "event": "viewport-unmount" },
  { "t": 3862.9, "event": "useUserTexture:hook-unmount", "id": "utex_1_modbkxrb" },
  { "t": 4081.7, "event": "useUserTexture:hook-mount",   "id": "utex_1_modbkxrb" },
  { "t": 4082.3, "event": "viewport-mount",              "context": { "domWidth": 1024, "domHeight": 592 } },
  { "t": 4082.5, "event": "useUserTexture:hook-resolve",
                 "uuid": "818876d2-92f0-4584-88fb-2815df972a81",  // SAME uuid as cycle 1
                 "context": { "resolvedTo": "texture" } },
  // --- cycle 2 → 3 boundary ---
  // ...(same pattern cycles 3, 4, 5 — uuid stable throughout)...
  { "t": 13049.1, "event": "useUserTexture:hook-resolve",
                  "uuid": "818876d2-92f0-4584-88fb-2815df972a81",  // STILL same uuid at cycle 5
                  "context": { "resolvedTo": "texture" } }
]
```

**Observations (cite tap source `src/three/userTextureCache.ts:58-74`, `src/hooks/useUserTexture.ts:26-60`, `src/three/ThreeViewport.tsx:49-64`):**

1. **`userTex:load-start` + `userTex:load-resolve` fire exactly ONCE** (timestamps 647.6ms + 1080.2ms), NEVER again across the remaining 4 cycles. This confirms the Phase 34 `userTextureCache` non-disposing contract: `getUserTextureCached(id)` dedups to the same Promise on every call (`src/three/userTextureCache.ts:37-38`).

2. **Same `tex.uuid` on every hook-resolve** — cycles 1, 2, 3, 4, 5 all yield `818876d2-92f0-4584-88fb-2815df972a81`. The THREE.Texture instance is identity-stable across ThreeViewport unmount/remount.

3. **`viewport-unmount` immediately precedes `hook-unmount`** and `hook-mount` precedes `viewport-mount` by ~0.5–1.0ms — React's unmount order (effect cleanups in reverse render order) confirms Scene's `useEffect` cleanup races the children's effect cleanups deterministically.

4. **Canvas dimensions stable at 1024×592** on every mount (Candidate 4 refuted above).

5. **`rendererUuid: null`** — our instrumentation couldn't access `gl.uuid` (THREE.WebGLRenderer does not expose a stable uuid by default; I attempted `(gl as any).uuid` and got undefined). A Plan 36-02 follow-up: expose `gl.info.render.frame` or the internal `_gl.getContextAttributes()` marker to detect context identity across unmounts.

### 2b. Why this doesn't conclude "VIZ-10 is fixed"

- The harness uses a 16×16 fixture JPEG. Real VIZ-10 reproductions involved user-uploaded images (Jessica's wallpaper screenshots, arbitrary dimensions, potentially non-power-of-two).
- The harness runs in headless Chromium. Real usage is headed Chrome/Safari/Edge.
- The harness uses `chromium-dev` (Vite dev server, unminified). Production builds may differ — `chromium-preview` project is scaffolded for Plan 36-02 to activate.
- The harness uses a deterministic camera pose (`__setTestCamera`). OrbitControls damping drift and pointer-driven camera changes are not exercised.
- 5 cycles may not be enough; real usage involves dozens of toggles across a session.

---

## 3. Evidence Ruling Out Other Candidates

See §1 per-candidate analysis. Summary:

| # | Candidate                          | Status       | Key evidence |
|---|------------------------------------|--------------|--------------|
| 1 | HTMLImageElement context binding   | INCONCLUSIVE | Same uuid observed (prediction match), but no blank rendering (prediction miss). `dispose={null}` may be suppressing it. |
| 2 | meshStandardMaterial uniform re-link | INCONCLUSIVE | Same uuid + sourceUuid observed; symptoms absent, consistent with the `dispose={null}` fix actively masking it. |
| 3 | ImageBitmap decode pinning         | REFUTED      | No 2nd-mount blank; THREE uses HTMLImageElement path here. |
| 4 | Canvas sizing (300×150)            | REFUTED (in harness) | Stable 1024×592 across all cycles. |

Candidates 1 and 2 remain plausible — their SYMPTOMS would have been caught by the harness IF present, but the `dispose={null}` + non-disposing cache defenses likely suppress the failure mode. Removing those defenses and re-running the harness is the definitive test, deferred to Plan 36-02 as gated experiments (§4.2).

---

## 4. Phase 32 Defensive-Code Triage

Per C-01: case-by-case, biased toward KEEP. Each piece evaluated against the harness evidence in §2a.

### 4.1 Non-disposing `userTextureCache` Map
**File:** `src/three/userTextureCache.ts:39` (the module-level `cache = new Map<...>`)
**Rationale:** Phase 34 Plan 03 established this. Mirrors `wallpaperTextureCache.ts` Phase 32 pattern.

**Decision: KEEP.**

**Justification:** Harness evidence in §2a shows `userTex:load-start` fires exactly once across 5 mount cycles — the cache IS delivering the same Promise on subsequent calls, which is the contract. Removing this and re-running the harness would likely cause the `load-start` event to fire on every mount, introducing a per-mount decode cost and a new opportunity for the texture upload to fail (Candidate 1 trigger). Load-bearing.

**Plan 36-02 action:** Add a code comment at `src/three/userTextureCache.ts` referencing this ROOT-CAUSE.md §4.1.

### 4.2 `<primitive attach="map" object={tex} dispose={null} />` at mesh render sites
**Files:** `src/three/WallMesh.tsx:136,182,268,288`, `src/three/FloorMesh.tsx:102,127`, `src/three/CeilingMesh.tsx:110`
**Rationale:** Phase 32 Plan 07 (commits `fcdfe18`, `4c5f75f`). R3F escape hatch: without `dispose={null}`, R3F auto-disposes the Texture on mesh unmount, invalidating the cache's stored reference.

**Decision: KEEP.**

**Justification:** The harness evidence in §2a shows identical `tex.uuid` across mounts — which would NOT hold if R3F were auto-disposing the cached texture. Observation: the cache's texture survives mesh unmount only because `dispose={null}` suppresses R3F's default dispose traversal. Removing this prop would cause R3F's dispose logic to run on mesh unmount, which would call `tex.dispose()` on the cached texture (Phase 34's non-disposing cache does NOT protect against external `.dispose()` calls — the cache only avoids calling `.dispose()` itself).

Removal is an unsafe experiment gated behind the harness showing the failure mode, which it currently does NOT. Classified load-bearing by protective negation: the fact that the harness is green is BECAUSE this prop is active. Load-bearing.

**Plan 36-02 action:** Add a code comment at each of the 7 sites referencing this ROOT-CAUSE.md §4.2. Do NOT remove.

### 4.3 Static regression test — `tests/wallMeshDisposeContract.test.ts`
**File:** `tests/wallMeshDisposeContract.test.ts` (76 lines, 4/4 passing)
**Rationale:** Phase 32 commit `63b4dc9`. Static source-level assertion that render sites contain the `dispose={null}` pattern and caches do NOT contain `.dispose(`.

**Decision: KEEP.**

**Justification:** Unit-level static test. Runs in ~50ms. Catches a different regression class from the Playwright harness — specifically, catches the *disappearance of the pattern* at the source level, BEFORE a rendered pixel-diff regression would surface. The Playwright harness catches runtime regressions; this test catches source-level regressions. Orthogonal coverage. Orthogonal = load-bearing.

**Plan 36-02 action:** None. Leave test as-is. Optionally extend to cover `src/three/userTextureCache.ts` (it already has guards for `wallpaperTextureCache` + `wallArtTextureCache`; Phase 34 added `userTextureCache` but did not extend this test). Enhancement, not a Plan 36-02 blocker.

### 4.4 Phase 34 unit-level VIZ-10 guards (orthogonal — Not Phase 32 code)
**Files:** `tests/userTextureCache.test.tsx:122-143`, `tests/userTextureSnapshot.test.ts:168+`
**Rationale:** Unit-level assertions that `useUserTexture` unmount does NOT dispose; 5x mount/unmount returns SAME texture instance.

**Decision: KEEP.**

**Justification:** These are Phase 34 unit-level contracts, orthogonal to this phase's investigation. They pass independently of the VIZ-10 outcome. Not candidates for simplification/removal.

**Plan 36-02 action:** None.

---

## 5. Harness Output Reference

Captured evidence files (commit `b2a274e`):

- Golden images (all byte-identical to cycle 1 except wallpaper-cycle-3 which has PNG-level hash diff but 0 pixel delta):
  - `tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts-snapshots/wallpaper-cycle-{1..5}-chromium-dev-darwin.png`
  - `tests/e2e/specs/wallart-2d-3d-toggle.spec.ts-snapshots/wallart-cycle-{1..5}-chromium-dev-darwin.png`
  - `tests/e2e/specs/floor-user-texture-toggle.spec.ts-snapshots/floor-cycle-{1,2}-chromium-dev-darwin.png`
  - `tests/e2e/specs/ceiling-user-texture-toggle.spec.ts-snapshots/ceiling-cycle-{1,2}-chromium-dev-darwin.png`
- Lifecycle-event buffer: `window.__textureLifecycleEvents[]` dumped to stdout by each spec; captured in Playwright trace (`test-results/*/trace.zip` — gitignored; re-generate via `npm run test:e2e`).
- Per-run logs: see spec `console.log` output showing 27 events per scenario.

### Fingerprint of a representative wallpaper run

```
event count:    27
texture loads:  1 (at t=647.6ms)
texture resolves: 1 (at t=1080.2ms)
viewport-mounts: 5 (cycles 1-5)
hook-mounts:     5 (cycles 1-5)
unique tex.uuid: 1 (818876d2-…)
unique sourceUuid: 1 (a5013b9b-…)
canvas dims:   1024×592 (stable)
```

---

## 6. Recommendations for Plan 36-02

1. **Do NOT land a speculative fix.** Per R-04, no-repro → defensive code stays. A fix with no reproducer is indistinguishable from random.

2. **Activate the `chromium-preview` Playwright project** to test the production-minified bundle. The Phase 32 regression may be minifier-dependent. If `chromium-preview` still produces green across 5 cycles, that's stronger evidence.

3. **Expand harness coverage beyond the current scenarios:**
   - Non-square / non-power-of-two fixture images (matches real user uploads).
   - Pointer-driven OrbitControls drift (no `__setTestCamera` — exercise the real camera).
   - Split-view → 3D toggles (Phase 32 symptoms were reported around this transition specifically per HUMAN-UAT).
   - Multiple uploaded textures simultaneously (stress the cache).
   - Gracefully handle WebGL context loss (force lose-context + restore cycle).

4. **Add CI workflow (deferred per H-02):** `.github/workflows/e2e.yml` running chromium-dev + chromium-preview on every PR. A green CI is the best ongoing defense against re-introduction.

5. **Keep all 3 Phase 32 defensive pieces** per §4.1–§4.3. Add code comments pointing back to this document. If a future Playwright harness iteration reliably reproduces VIZ-10 (with the above expanded coverage), the `chromium-preview` run fails in the minified bundle, etc., revisit the triage with new evidence.

6. **Extend ThreeViewport instrumentation** to capture `gl.info.render.frame` or a WebGLRenderer context marker — the current `rendererUuid: null` is a gap that prevented cross-mount context-identity comparison. (Candidate 1 would benefit from this.)

---

## 7. Closing Statement

The Playwright harness did what R-04 says it must: it tried honestly, captured structured evidence across 5 cycles × 4 surfaces, and produced a result. That result is "cannot reproduce under the tested configuration." Plan 36-01 does not end with a fix; it ends with a documented investigation whose finding is that the known defensive code is (likely) doing its job.

Plan 36-02 proceeds with this evidence: expand the harness, keep the defensive code, watch for regressions in broader coverage, and only touch the defensive code if a reproducer surfaces. "Silent best-guess fix" is forbidden (R-04). This document is its alternative.
