# Phase 36: Wallpaper/wallArt 2D↔3D Regression (VIZ-10) - Research

**Researched:** 2026-04-24
**Domain:** Browser-based E2E regression harness (Playwright) + R3F/Three.js texture lifecycle instrumentation
**Confidence:** HIGH

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Harness Scope + Location (H):**
- H-01: Playwright lives in `tests/e2e/`, sibling to vitest `tests/`. Single test cabinet.
- H-02: Two Playwright projects in `playwright.config.ts` — dev-server (Plan 36-01 investigation, Vite HMR + sourcemaps); production-build (`vite build && vite preview`) added when wiring the retained CI guard at end of Plan 36-02.
- H-03: Four surfaces — wallpaper on wall (5 cycles) + wallArt on wall (5 cycles) are ROADMAP-mandated; floor + ceiling get 2-cycle smoke scenarios (same `userTextureCache` / `dispose={null}` plumbing).
- H-04: 5 toggle cycles per wallpaper/wallArt — literal ROADMAP mandate.

**Pixel-Diff (D):**
- D-01: Diff tool = Playwright's built-in `toHaveScreenshot()`. Zero extra deps.
- D-02: One screenshot per 3D mount, after a 200ms settle + `await zero pending rAF`. Compared against screenshot #1 of the scenario.
- D-03: Viewport fixed at 1280×720, `deviceScaleFactor: 1`. `window.__setTestCamera()` helper exposed (Phase 31 `__drive*` convention).
- D-04: `maxDiffPixelRatio: 0.01` (≤1% per ROADMAP). `retries: 1` in CI, `retries: 0` locally.

**Root-Cause Discipline (R):**
- R-01: Strict 2-plan, 2-PR split. 36-01 = harness + ROOT-CAUSE.md only (NO fix). 36-02 = fix informed by 36-01's findings. Plan 36-02 does not begin until 36-01 PR merges.
- R-02: ROOT-CAUSE.md MUST contain 4 sections: (1) the 4 Phase 32 candidate causes verbatim from 32-07-SUMMARY.md lines 36-43; (2) actual cause with harness evidence embedded INLINE (not linked); (3) evidence ruling out the other 3; (4) Phase 32 defensive-code redundancy classification.
- R-03: If all 4 Phase 32 candidates proven wrong, add "Actual cause not previously considered" section with same evidence standard.
- R-04: No-repro outcome is valid — written into ROOT-CAUSE.md itself. "Defensive code stays forever" is acceptable. "Silent best-guess fix" is NOT.

**Phase 32 Code + CI Guard (C):**
- C-01: 3 Phase 32 defensive pieces (non-disposing `userTextureCache`, `<primitive attach="map" dispose={null}>`, static regression test) classified case-by-case in ROOT-CAUSE.md, biased toward keeping.
- C-02: Retained Playwright harness runs every PR via GitHub Actions. NO path filter. ~90s cost accepted.
- C-03: Chromium headless in CI. `"test:e2e:debug": "playwright test --headed --debug"` for local.
- C-04: Chromium-only browser matrix. Firefox/WebKit deferred.

### Claude's Discretion
- Exact Playwright config layout (projects, webServer, reporters).
- `tests/e2e/` internal structure + scenario naming.
- `window.__setTestCamera()` API shape (follow Phase 31 conventions).
- GitHub Actions workflow file name + job structure.
- `test.step()` vs plain `await` for lifecycle logging.

### Deferred Ideas (OUT OF SCOPE)
- Firefox / WebKit browser matrix.
- Path-filtered CI.
- Nightly cron harness.
- Visual regression for NON-user-upload paths (PBR presets, color wallpaper, paint).
- Soft-separation single-PR root-cause discipline.
- Sequence screenshots per 3D view.
- Custom pixel-diff algorithm.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIZ-10 | Uploaded-image wallpaper + wallArt survive 2D↔3D toggles indefinitely. Root cause identified via runtime instrumentation (Playwright harness) BEFORE fix. | This document provides: Playwright setup, camera-injection strategy, texture-lifecycle instrumentation plan, Phase 32 candidate-cause catalog, defensive-code inventory, CI wiring plan, Validation Architecture. |

## Summary

Phase 36 requires a fresh dev dependency — **Playwright ^1.45+** (Chromium only) — to be installed, configured with two projects (dev-server + production-preview), and wired into a new GitHub Actions workflow (`.github/workflows/` does not currently exist — must be created). The repo already has Vitest infrastructure in place (`vitest.config.ts`, 60+ tests, `tests/setup.ts` with fake-indexeddb); Playwright is strictly additive.

The VIZ-10 bug signature is narrow: it ONLY manifests for data-URL-backed user textures (IDB `Blob` → `createObjectURL` → `THREE.TextureLoader.loadAsync`) rendered via `<meshStandardMaterial>` across `ThreeViewport` unmount/remount. PBR, color wallpaper, and paint paths all work. The harness MUST use a real uploaded image blob — the existing `window.__driveTextureUpload(file, name, tileSizeFt)` helper in `src/components/UploadTextureModal.tsx:460` is the exact entry point. A bundled PNG via Vite's asset pipeline would miss the bug entirely.

**Primary recommendation:** Install Playwright 1.45+ as a devDependency, create `playwright.config.ts` at repo root with two projects (chromium-dev using `npm run dev`, chromium-preview using `vite preview`), expose `window.__setTestCamera()` in `ThreeViewport.tsx` gated by `import.meta.env.MODE === "test"` (mirrors Phase 31 convention), and instrument all four texture caches (`userTextureCache.ts`, `wallpaperTextureCache.ts`, `wallArtTextureCache.ts`, floorTexture) with lifecycle tap points writing to `window.__textureLifecycleEvents[]` for Playwright to read via `page.evaluate()`.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@playwright/test` | ^1.45.0 (verify latest via `npm view @playwright/test version`) | E2E test runner + built-in `toHaveScreenshot()` pixel-diff | Zero-dep visual regression; golden-image storage; HTML reporter; dev-server orchestration via `webServer:` config; widely adopted for Vite+React SPAs. |

### Supporting (already installed — no new deps)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `vite` | ^8.0.3 | Dev server + production preview | `npm run dev` and `vite preview` are Playwright `webServer:` targets. |
| `three` | ^0.183.2 | WebGL texture/renderer API | Instrumentation hooks live at `THREE.TextureLoader.loadAsync` boundary inside cache modules. |
| `@react-three/fiber` | ^8.17.14 | R3F `<Canvas>` mount/unmount lifecycle | `ThreeViewport.tsx` is the unmount target triggered by `viewMode` toggle in `src/App.tsx:333-360`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright `toHaveScreenshot()` | `pixelmatch` library | Rejected (D-01): adds dep, no HTML reporter, no auto baseline management. |
| Playwright | Cypress | Cypress has weaker WebGL canvas screenshot support and no equivalent `webServer:` multi-project config. |
| Real Playwright | `@vitest/browser` | MEDIUM confidence note: `@vitest/browser-playwright` is ALREADY in the lockfile (transitive via vitest 4). It's a Vitest 4 peer capability, not a functional browser runner in this project. Do NOT attempt to use it as the harness — user locked on Playwright proper (H-01). |

**Installation:**
```bash
npm install --save-dev @playwright/test
npx playwright install --with-deps chromium
```

**Version verification (run at plan time):**
```bash
npm view @playwright/test version
```

## Architecture Patterns

### Recommended Project Structure

```
tests/
  e2e/                             # Plan 36-01 creates
    playwright-helpers/
      setTestCamera.ts             # page.evaluate helper wrapping window.__setTestCamera
      uploadTexture.ts             # page.evaluate helper wrapping window.__driveTextureUpload
      toggleViewMode.ts            # clicks Toolbar "2D"/"3D" buttons
      settle.ts                    # 200ms wait + await Promise(rAF)
      lifecycleEvents.ts           # page.evaluate getter for window.__textureLifecycleEvents
    fixtures/
      sample-wallpaper.jpg         # real uploaded JPEG (small, ~10KB)
      sample-wallart.png           # real uploaded PNG
    specs/
      wallpaper-2d-3d-toggle.spec.ts      # 5-cycle scenario, pixel-diff vs frame #1
      wallart-2d-3d-toggle.spec.ts        # 5-cycle scenario
      floor-user-texture-toggle.spec.ts   # 2-cycle smoke
      ceiling-user-texture-toggle.spec.ts # 2-cycle smoke
    wallpaper-2d-3d-toggle.spec.ts-snapshots/  # Playwright-generated golden images (gitignored? — decide in Plan 36-01; typically COMMITTED)
playwright.config.ts                # repo root
.github/workflows/
  e2e.yml                          # Plan 36-01 (or end of 36-02) creates
```

### Pattern 1: Playwright Config — Two Projects

**What:** Dev-server project for investigation (Plan 36-01); production-preview project for CI guard (Plan 36-02).
**When to use:** H-02 lock requires both.
**Example:**
```ts
// playwright.config.ts
// Source: https://playwright.dev/docs/test-configuration + https://playwright.dev/docs/test-webserver
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e/specs",
  fullyParallel: false, // texture caches are module-level singletons — isolate serial
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  projects: [
    {
      name: "chromium-dev",
      use: { ...devices["Desktop Chrome"] },
      // Dev-mode Vite: Playwright process sets MODE=test so import.meta.env.MODE === "test"
      // gates activate. Phase 31 pattern — confirmed at src/components/PropertiesPanel.tsx:443.
    },
    {
      name: "chromium-preview",
      use: { ...devices["Desktop Chrome"] },
      // Prod build + preview — catches minifier bugs. Does NOT get test-mode drivers
      // unless vite build is invoked with --mode test (H-02 detail — Claude's discretion).
    },
  ],
  webServer: [
    {
      command: "npm run dev -- --mode test --port 5173",
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    // Plan 36-02 adds preview server here.
  ],
});
```

### Pattern 2: Test-Camera Injection via Phase 31 Convention

**What:** `window.__setTestCamera({ position: [x,y,z], target: [x,y,z] })` gated by `import.meta.env.MODE === "test"`. Manipulates the existing `orbitControlsRef.current.object.position` + `ctrl.target` at `src/three/ThreeViewport.tsx:51-110`.
**When to use:** Before every `await expect(page).toHaveScreenshot()` call. Deterministic pose prevents per-mount camera drift (OrbitControls damping can land slightly differently each mount).
**Example:**
```ts
// src/three/ThreeViewport.tsx — inside Scene() component, new useEffect
// Mirrors src/canvas/tools/selectTool.ts:1567 install pattern.
useEffect(() => {
  if (import.meta.env.MODE !== "test" || typeof window === "undefined") return;
  (window as unknown as {
    __setTestCamera?: (p: { position: [number, number, number]; target: [number, number, number] }) => void;
  }).__setTestCamera = ({ position, target }) => {
    const ctrl = orbitControlsRef.current;
    if (!ctrl?.object) return;
    ctrl.object.position.set(...position);
    ctrl.target.set(...target);
    ctrl.update();
  };
  return () => {
    delete (window as unknown as { __setTestCamera?: unknown }).__setTestCamera;
  };
}, []);
```

### Pattern 3: Texture-Lifecycle Instrumentation Tap

**What:** A module-level event buffer `window.__textureLifecycleEvents: Array<{ t: number, event: string, id: string, context?: any }>` appended to at every load/bind/unbind/dispose site. Test-mode gated. Playwright reads via `page.evaluate(() => window.__textureLifecycleEvents)` and embeds output inline in ROOT-CAUSE.md.
**When to use:** Tap points:
1. `src/three/userTextureCache.ts:40` — log `load-start` when IDB read begins; `load-resolve` when `tex.needsUpdate = true`; `load-fail` on catch.
2. `src/three/userTextureCache.ts:62` — log `cache-clear` in `clearUserTextureCache`.
3. `src/three/wallpaperTextureCache.ts:22` — same load-start / load-resolve / load-fail.
4. `src/three/wallArtTextureCache.ts:11` — same.
5. `src/hooks/useUserTexture.ts:22` — log `hook-mount(id)` / `hook-unmount(id)` / `hook-resolve(id, texRef)`.
6. `src/three/ThreeViewport.tsx:206` — log `viewport-mount` / `viewport-unmount` via useEffect cleanup.

**Critical:** the buffer must NOT be cleared between cycles; the audit value IS the full sequence across all 5 mount cycles.

### Anti-Patterns to Avoid

- **Reading `window.__textureLifecycleEvents` mid-test and asserting shape** — drains the forensic value. Read it at the END of all 5 cycles and dump verbatim into ROOT-CAUSE.md (R-02).
- **Clearing the texture cache between cycles in the harness** — defeats the entire purpose. The cache surviving remount IS the contract being verified.
- **Using a bundled Vite asset for the "uploaded image"** — CONTEXT.md §specifics line 126: bundled PNGs miss the bug entirely. MUST go through `window.__driveTextureUpload(File, name, tileSizeFt)` with a real `File` synthesized from a fetched fixture blob.
- **Asserting pixel identity across cycles without a fixed camera** — OrbitControls damping (`dampingFactor: 0.1` at `src/three/ThreeViewport.tsx:185`) produces visible sub-pixel drift. `window.__setTestCamera()` is non-negotiable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pixel-diff algorithm | Custom byte-loop or pixelmatch integration | Playwright `toHaveScreenshot()` | Built-in baseline storage, HTML report, diff visualization, CI artifact integration. D-01 lock. |
| Screenshot timing | `setTimeout` guessing | `page.waitForFunction(() => ... rAF count === 0)` + 200ms settle | Deterministic settle per D-02. |
| Browser install | Manual Chromium download | `npx playwright install --with-deps chromium` in CI | Official, cached, handles system deps on Linux runners. |
| Test file synthesis | jsdom `new File()` | `fs.readFile(fixture) → new File([buf], "sample.jpg", { type: "image/jpeg" })` via `page.evaluate` with `page.addInitScript` injecting the blob | Phase 34 pattern already established in `window.__driveTextureUpload` at `src/components/UploadTextureModal.tsx:460` — REUSE IT. |
| Camera pose stability | Custom OrbitControls freezing | `window.__setTestCamera()` (Phase 31 driver convention) | D-03 lock; Phase 31 convention. |
| Dev-server orchestration in CI | Manual `npm run dev &` + wait | Playwright `webServer:` config | Handles port readiness, cleanup, `reuseExistingServer` for local iteration. |

**Key insight:** the entire harness is composable from existing Phase 31/34 test drivers + Playwright defaults. The only new code is the lifecycle-event taps and `__setTestCamera`.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | IndexedDB `room-cad-user-textures` store (Phase 34 D-00) — harness fixtures will seed this per-test via `window.__driveTextureUpload`. Test-mode uses happy-dom for vitest, but Playwright runs against REAL browser IDB. | Plan 36-01 adds a `test.beforeEach` that clears the store via `page.evaluate(() => indexedDB.deleteDatabase('...'))` so fixture seeding is deterministic. |
| Live service config | None — no external services. | None — verified by absence of fetch calls in `userTextureStore`. |
| OS-registered state | None. | None. |
| Secrets/env vars | None — `import.meta.env.MODE` is build-time, not OS-level. | None. |
| Build artifacts | `playwright-report/`, `test-results/`, `tests/e2e/**/*-snapshots/` will be generated. | Plan 36-01 MUST add to `.gitignore` (`playwright-report/`, `test-results/`) — but commit `*-snapshots/` directories (golden images ARE the contract). |

## Common Pitfalls

### Pitfall 1: `MODE === "test"` Gates Inactive in Plain `npm run dev`
**What goes wrong:** Playwright's default `webServer: { command: "npm run dev" }` starts Vite in `development` mode. `import.meta.env.MODE === "test"` is false → `__setTestCamera` never installed → Playwright `page.evaluate(() => window.__setTestCamera(...))` throws.
**Why it happens:** Vite's `MODE` defaults to `development` for `vite`, `production` for `vite build`. Only vitest sets `test`.
**How to avoid:** `webServer.command = "npm run dev -- --mode test --port 5173"`. Confirmed by reading Phase 31 drivers (all use `import.meta.env.MODE === "test"` consistently).
**Warning signs:** Playwright error `TypeError: window.__setTestCamera is not a function` on the first helper call.

### Pitfall 2: Five-Cycle Screenshot Determinism
**What goes wrong:** Subtle OrbitControls damping drift, Environment HDR re-loading (`src/three/ThreeViewport.tsx:128-130`), and shadow-map re-generation produce >1% pixel delta even when textures ARE binding correctly. False-positive regression.
**Why it happens:** R3F's `<Canvas>` unmounts the entire WebGLRenderer and Environment; shadow maps re-build on remount.
**How to avoid:** (1) Fix camera via `__setTestCamera`, (2) settle 200ms + wait `requestAnimationFrame` twice, (3) consider disabling shadows in test mode — but only if golden-image regen also runs in test mode (otherwise prod-preview vs dev-prod will drift).
**Warning signs:** Baseline passes on first `--update-snapshots`, fails on re-run with deltas clustered in shadow regions.

### Pitfall 3: fake-indexeddb vs Real Browser IDB
**What goes wrong:** `tests/setup.ts` wires `fake-indexeddb/auto` for vitest. Playwright tests run in real Chromium → real IDB → ZERO overlap. A developer debugging a Playwright test using the same IDB inspector as vitest will be confused.
**Why it happens:** `tests/setup.ts` is imported by `vitest.config.ts:16` `setupFiles:`. Playwright does NOT read vitest config.
**How to avoid:** Add `exclude: ["tests/e2e/**"]` to `vitest.config.ts:test.exclude` so vitest never picks up `.spec.ts` in `tests/e2e/`. Document in ROOT-CAUSE.md that Playwright uses real IDB.

### Pitfall 4: Cached Texture Instance Identity Across Mounts
**What goes wrong:** The whole point of the non-disposing cache (`src/three/userTextureCache.ts:31`) is that `getUserTextureCached(id)` returns the SAME `Promise<Texture>` instance across mounts. If a harness assertion reads `texture.uuid` post-first-mount, stores it, remounts, reads again, and the uuid is different — that's the bug. Tap points must log `tex.uuid` to enable this assertion.
**Why it happens:** Phase 32 theory #2 (meshStandardMaterial uniform re-link) predicts this exact signature.
**How to avoid:** Lifecycle tap at `userTextureCache.ts:52` MUST log `tex.uuid` so ROOT-CAUSE.md can answer "is it the same Texture instance?" directly.

### Pitfall 5: Golden-Image Update Workflow
**What goes wrong:** A legitimate visual change (e.g., updating HDR) invalidates goldens; developer force-regenerates → loses regression-detection ability.
**Why it happens:** `--update-snapshots` is a blunt tool.
**How to avoid:** Document in `tests/e2e/README.md` (Claude's discretion): "To update baselines, run `npm run test:e2e -- --update-snapshots` ONLY after confirming the visual change is intentional. Commit the updated `*-snapshots/*.png` files with the source change in the same PR so review catches the diff." Playwright generates a per-scenario subfolder per snapshot — goldens are reviewable in GitHub PR diff view.
**Warning signs:** PR that touches only `*-snapshots/*.png` with no source change = regression masking.

## Code Examples

### Playwright Test Skeleton — 5-Cycle Wallpaper Scenario

```ts
// tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts
// Source: Playwright docs + Phase 34 driver patterns (src/components/UploadTextureModal.tsx:460).
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const TEST_CAMERA = { position: [15, 10, 15] as [number, number, number], target: [10, 4, 8] as [number, number, number] };

test.describe("VIZ-10 — wallpaper survives 5x 2D↔3D toggle", () => {
  test("uploaded wallpaper binds identically across 5 mount cycles", async ({ page }) => {
    await page.goto("/");
    // Clear the user-texture IDB to isolate the test fixture.
    await page.evaluate(() => indexedDB.deleteDatabase("room-cad-user-textures"));
    await page.reload();

    // Upload fixture JPEG via the Phase 34 test driver.
    const bytes = readFileSync(resolve("tests/e2e/fixtures/sample-wallpaper.jpg"));
    const b64 = Buffer.from(bytes).toString("base64");
    const textureId = await page.evaluate(async (b64) => {
      const blob = await fetch(`data:image/jpeg;base64,${b64}`).then((r) => r.blob());
      const file = new File([blob], "sample-wallpaper.jpg", { type: "image/jpeg" });
      return await (window as any).__driveTextureUpload(file, "Test Wallpaper", 4);
    }, b64);

    // Apply wallpaper to a wall via existing picker test drivers (or store action directly).
    // [Plan 36-01 decides: direct store.setWallpaper() call via page.evaluate vs click-through the picker.]

    for (let cycle = 1; cycle <= 5; cycle++) {
      await page.click('[data-testid="view-mode-3d"]'); // existing Toolbar button
      await page.evaluate((c) => (window as any).__setTestCamera(c), TEST_CAMERA);
      await page.waitForTimeout(200);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      await expect(page).toHaveScreenshot(`wallpaper-cycle-${cycle}.png`, { maxDiffPixelRatio: 0.01 });
      await page.click('[data-testid="view-mode-2d"]');
      await page.waitForTimeout(100);
    }

    // Drain lifecycle events for ROOT-CAUSE.md audit (Plan 36-01 only).
    const events = await page.evaluate(() => (window as any).__textureLifecycleEvents);
    console.log(JSON.stringify(events, null, 2)); // captured in Playwright trace
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Unit tests asserting cache behavior (Phase 34 `tests/userTextureCache.test.tsx:122`, `tests/userTextureSnapshot.test.ts:168`) | Integration E2E harness asserting pixel-level surface render | Phase 36 (this one) | Unit tests catch cache-contract regressions. Pixel harness catches integration-level bugs (WebGL context rebinding, R3F dispose traversal, material uniform re-link) that unit tests cannot see. |
| Manual Jessica visual verification (Phase 32 Plan 07 Task 4) | Automated Playwright harness | Phase 36 | Moves VIZ-10 from "Jessica tests" to "CI tests every PR". Phase 32 Plan 07 FAILED because manual testing caught the regression too late (after 3 speculative fix attempts). |

**Deprecated/outdated:** None. Phase 32/34 defensive code is retained until ROOT-CAUSE.md justifies per-piece removal (C-01).

## Open Questions

1. **Should MODE=test propagate to `vite build` for the production-preview Playwright project?**
   - What we know: `vite build --mode test` is supported syntax.
   - What's unclear: whether minifier behavior differs under `MODE=test` (i.e., whether test-only globals survive production build).
   - Recommendation: Plan 36-01 leaves the prod-preview project wired but INACTIVE. Plan 36-02 (end) activates it once test-mode interaction with production build is characterized.

2. **Does `<Environment files="/hdr/studio_small_09_1k.hdr" />` load asynchronously post-remount, causing sub-1% drift?**
   - What we know: HDR is wrapped in `<Suspense fallback={null}>` at `src/three/ThreeViewport.tsx:128-130`.
   - What's unclear: whether the first 3D frame after remount reliably has the HDR loaded, or whether we need to await a custom "environment-ready" signal.
   - Recommendation: Plan 36-01 harness logs `environment-load-complete` as a tap point. If baseline regeneration shows drift > 0.5% from HDR alone, add an explicit wait.

3. **Does prod-preview catch bugs dev-server misses?**
   - What we know: minifier may eliminate dead code paths that dev mode keeps.
   - What's unclear: whether ANY Phase 32 candidate cause is minifier-dependent.
   - Recommendation: accept the prod-preview project as a LAYER of guard, not a primary diagnostic. Dev-server is the investigation surface.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite + Playwright | ✓ | v24+ (inferred from `engines: none` in package.json; works locally) | — |
| npm | Playwright install | ✓ | — | — |
| `@playwright/test` | Harness runner | ✗ | — | Install as `devDependency` in Plan 36-01 Task 1 |
| Chromium browser binary | Playwright runtime | ✗ | — | `npx playwright install --with-deps chromium` in Plan 36-01 + CI workflow |
| GitHub Actions | Retained CI guard | ✗ (no `.github/workflows/` directory exists) | — | Create `.github/workflows/e2e.yml` in Plan 36-01 or end of 36-02 |
| `vite preview` | Prod-preview Playwright project | ✓ | bundled with vite ^8.0.3 | — |
| `fake-indexeddb` | vitest-only; NOT used by Playwright | ✓ | ^6.2.5 (devDep) | — (Playwright uses real browser IDB) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** All three (`@playwright/test`, Chromium binary, `.github/workflows/`) are standard Plan 36-01 install steps. No blockers.

## Phase 32 Still-Plausible Candidate Causes (for ROOT-CAUSE.md §1)

Must be copied verbatim into ROOT-CAUSE.md per R-02 section (1). Source: `.planning/phases/32-pbr-foundation/32-07-SUMMARY.md` lines 36-43.

| # | Candidate | Predicted Evidence Signature | Source line |
|---|-----------|------------------------------|-------------|
| 1 | `HTMLImageElement` backing a data URL is tied to the old `WebGLRenderer`'s context and silently fails re-upload to the new one (would require manual `texture.source.needsUpdate = true` on every mount). | Same `tex.uuid` across mounts; blank material on 2nd+ mount; WebGL inspector shows uploaded-but-empty texture slot. | 32-07-SUMMARY.md:38-39 |
| 2 | `meshStandardMaterial` in R3F receives `<primitive attach="map">` child but doesn't re-link the uniform on the fresh material instance created at remount (would require forcing `material.needsUpdate = true`). | Same `tex.uuid` + `tex.source.data` valid; `material.map === null` or stale reference on 2nd+ mount. | 32-07-SUMMARY.md:40 |
| 3 | Image decode happens once off the event loop and the decoded pixel data is only bound to the first WebGL texture upload; second context's upload sees pre-decoded `ImageBitmap` in an unusable state. | First mount renders correctly; 2nd mount's `gl.texImage2D` call succeeds but samples to black; DevTools shows `ImageBitmap.closed === true`. | 32-07-SUMMARY.md:41 |
| 4 | Something unrelated to textures — the 300×150 canvas size observed during diagnostics hints that the R3F `<Canvas>` may not be mounting into a sized container on the second entry, so nothing renders regardless of texture state. | Canvas element `clientWidth/clientHeight` === 300/150 on 2nd mount; non-texture objects also blank/missing. | 32-07-SUMMARY.md:42 |

## Phase 32 Defensive Code Inventory (for ROOT-CAUSE.md §4)

Must be triaged case-by-case per C-01. Each piece gets "redundant" (delete in Plan 36-02 with commit citing ROOT-CAUSE.md section) or "load-bearing" (keep with code comment linking back) classification.

| # | Piece | File:Line | Rationale | Triage Question |
|---|-------|-----------|-----------|-----------------|
| 1 | Non-disposing `userTextureCache` Map | `src/three/userTextureCache.ts:31` | Module-level `Map<string, Promise<Texture \| null>>` never calls `.dispose()`. Mirrors `wallpaperTextureCache.ts:19`. | Does ROOT-CAUSE show that R3F auto-dispose is NOT the cause? If so, this pattern may be redundant. BUT: keep if removing introduces risk. |
| 2 | `<primitive attach="map" object={tex} dispose={null} />` at mesh render sites | `src/three/WallMesh.tsx:136, 182, 268, 288`; `src/three/FloorMesh.tsx:102, 127`; `src/three/CeilingMesh.tsx:110` | R3F escape hatch preventing auto-dispose traversal on unmount. Phase 32 Plan 07 commit `fcdfe18`/`4c5f75f`. | Does ROOT-CAUSE rule out auto-dispose? If so, `map={tex}` shorthand could return. BUT: the pattern is cheap and documented — likely load-bearing forever. |
| 3 | Static regression test for dispose contract | `tests/wallMeshDisposeContract.test.ts` (76 lines, 4/4 passing) | Locks source-level pattern for primitive attach + no `.dispose()`/`cache.delete()` in caches. Phase 32 commit `63b4dc9`. | Does the new Playwright harness supersede this? Probably NO — static source tests are fast and catch different regressions (the primitive-attach pattern disappearing entirely). KEEP with comment pointing at Playwright harness for runtime verification. |
| 4 | Phase 34 VIZ-10 cache stability tests | `tests/userTextureCache.test.tsx:122-143`; `tests/userTextureSnapshot.test.ts:168` | Unit-level assertion that `useUserTexture` unmount does NOT dispose, and that 5x mount/unmount returns SAME texture instance. | Not Phase 32 code — Phase 34. ROOT-CAUSE should note these remain valid regardless of outcome (they're orthogonal to the integration-level regression). KEEP. |

Additionally, the static test at `tests/wallMeshDisposeContract.test.ts:65-74` locks `wallpaperTextureCache` and `wallArtTextureCache` to never call `cache.delete(` or `.dispose(` — classify whether this test extends to cover `userTextureCache.ts` (which DOES have `cache.delete` at line 63, but only via explicit `clearUserTextureCache` event listener, not per-unmount).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright ^1.45 (new devDep) + existing Vitest ^4.1.2 |
| Config file | `playwright.config.ts` (new, repo root); existing `vitest.config.ts` gains `exclude: ["tests/e2e/**"]` |
| Quick run command | `npm run test:e2e -- --project=chromium-dev tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts` |
| Full suite command | `npm run test:e2e` (all 4 spec files, both projects once 36-02 activates prod-preview) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIZ-10 (Plan 36-01) | Harness reproduces the regression (fails pre-fix) and produces ROOT-CAUSE.md lifecycle evidence | E2E (Playwright) | `npm run test:e2e -- tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts` | ❌ Wave 0 |
| VIZ-10 (Plan 36-01) | WallArt 5-cycle survives | E2E | `npm run test:e2e -- tests/e2e/specs/wallart-2d-3d-toggle.spec.ts` | ❌ Wave 0 |
| VIZ-10 (Plan 36-01) | Floor user-texture 2-cycle smoke | E2E | `npm run test:e2e -- tests/e2e/specs/floor-user-texture-toggle.spec.ts` | ❌ Wave 0 |
| VIZ-10 (Plan 36-01) | Ceiling user-texture 2-cycle smoke | E2E | `npm run test:e2e -- tests/e2e/specs/ceiling-user-texture-toggle.spec.ts` | ❌ Wave 0 |
| VIZ-10 (Plan 36-02) | After fix, all 4 scenarios GREEN with ≤1% pixel delta | E2E | `npm run test:e2e` | ❌ Wave 0 (runs existing files post-fix) |
| VIZ-10 (retained CI) | Every PR runs the harness in Chromium headless | CI (GitHub Actions) | `.github/workflows/e2e.yml` triggers on `pull_request` | ❌ Wave 0 |
| (regression contract — existing) | Static dispose-contract assertion | Unit (vitest) | `npm test -- wallMeshDisposeContract` | ✅ |
| (regression contract — existing) | Cache non-disposal assertion (5x cycles) | Unit (vitest) | `npm test -- userTextureSnapshot` | ✅ |

### Harness Success/Failure Detection Mechanism

**Pre-fix (Plan 36-01 end):** The harness MUST fail. Expected signature: pixel-diff of cycle #2+ vs cycle #1 exceeds 1%, OR `window.__textureLifecycleEvents` shows `tex.uuid` divergence / blank material binding. This failure is the proof-of-reproduction required before 36-01 merges. Plan 36-01's PR body MUST include the harness output as evidence.

**Post-fix (Plan 36-02 end):** Same harness passes with ≤1% delta across all 5 cycles × 2 surfaces + 2 cycles × 2 smoke surfaces. Baselines generated once (from the fixed state) and committed. Any future regression triggers a baseline mismatch in CI.

**Catch-future-regression mechanism:** GitHub Actions `e2e.yml` runs on every PR. `retries: 1` masks flaky GPU-driver noise; `maxDiffPixelRatio: 0.01` locks the ROADMAP tolerance. A regression surfaces as a PR-check failure with Playwright HTML report + diff visualization uploaded as CI artifact.

### Sampling Rate
- **Per task commit (Plan 36-01):** `npm run test:e2e -- --project=chromium-dev` (just the dev project, Chromium only). ~30-45s per spec.
- **Per wave merge (Plan 36-01 / 36-02):** `npm run test:e2e` full run, both projects once preview is active. ~90s per ROADMAP budget.
- **Phase gate (before `/gsd:verify-work`):** `npm test && npm run test:e2e` both green.

### Wave 0 Gaps

- [ ] `playwright.config.ts` — repo root
- [ ] `package.json` — add `"test:e2e": "playwright test"` and `"test:e2e:debug": "playwright test --headed --debug"`
- [ ] `package.json` — `npm install --save-dev @playwright/test`
- [ ] `vitest.config.ts` — add `"tests/e2e/**"` to `exclude` array
- [ ] `tests/e2e/fixtures/sample-wallpaper.jpg` + `sample-wallart.png` — small real JPEG/PNG
- [ ] `tests/e2e/playwright-helpers/*.ts` — helper library
- [ ] `tests/e2e/specs/*.spec.ts` — 4 spec files
- [ ] `src/three/ThreeViewport.tsx` — `window.__setTestCamera()` install (test-mode gated)
- [ ] `src/three/userTextureCache.ts`, `wallpaperTextureCache.ts`, `wallArtTextureCache.ts`, `hooks/useUserTexture.ts` — lifecycle tap points writing to `window.__textureLifecycleEvents`
- [ ] `src/components/Toolbar.tsx` — `data-testid="view-mode-2d"` / `data-testid="view-mode-3d"` on the view-mode buttons (plan-discretion naming, but test-stable selectors are needed — current code at `src/components/Toolbar.tsx:19,74` uses `onClick={() => onViewChange(mode)}` — confirm selectors)
- [ ] `.gitignore` — add `playwright-report/` and `test-results/` (keep `*-snapshots/` committed)
- [ ] `.github/workflows/e2e.yml` — new workflow (Plan 36-02 end, per H-02)
- [ ] `tests/e2e/README.md` — baseline-update workflow documentation
- [ ] `.planning/phases/36-viz-10-regression/ROOT-CAUSE.md` — Plan 36-01 deliverable (4 sections per R-02)

## Key File Paths (absolute references for planner)

### Phase 32 Evidence Base
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/.planning/phases/32-pbr-foundation/32-07-SUMMARY.md` — 4 candidate causes at lines 36-43
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/tests/wallMeshDisposeContract.test.ts` — static contract test (76 lines)

### Texture Cache Modules
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/src/three/userTextureCache.ts` — Phase 34 non-disposing cache; test driver at line 93-102
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/src/three/wallpaperTextureCache.ts` — legacy data-URL path cache
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/src/three/wallArtTextureCache.ts` — wallArt cache
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/src/hooks/useUserTexture.ts` — React consumer hook

### Mesh Render Sites (dispose={null} pattern)
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/src/three/WallMesh.tsx:136,182,268,288`
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/src/three/FloorMesh.tsx:102,127`
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/src/three/CeilingMesh.tsx:110`

### Mount/Unmount Lifecycle
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/src/three/ThreeViewport.tsx` — R3F `<Canvas>` at line 225, Scene at line 24
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/src/App.tsx:333-360` — viewMode-driven conditional mount/unmount of `<ThreeViewport>`
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/src/components/Toolbar.tsx:19,74` — view-mode toggle buttons (need `data-testid`)

### Test Infrastructure
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/package.json` — scripts at lines 6-12; add `test:e2e`
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/vitest.config.ts` — add `exclude: ["tests/e2e/**"]`
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/tests/setup.ts` — vitest-only; DO NOT touch
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/tests/userTextureCache.test.tsx:122-143` — existing VIZ-10 unit guard
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/tests/userTextureSnapshot.test.ts:168` — 5x cycle stability guard

### Phase 31 Driver Convention References
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/src/canvas/tools/selectTool.ts:1567` — `window.__driveResize` install pattern
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/src/components/PropertiesPanel.tsx:443-470` — test-mode gate + cleanup pattern
- `/Users/micahbank/room-cad-renderer/.claude/worktrees/friendly-merkle-8005fb/src/components/UploadTextureModal.tsx:460` — `window.__driveTextureUpload(file, name, tileSizeFt)` — REUSE for fixture upload

### Project Constraints (from CLAUDE.md)

- Must follow the "Tool cleanup pattern" — test-mode globals install/uninstall via useEffect cleanup (Phase 31 convention).
- `import.meta.env.MODE === "test"` gating is mandatory for any `window.__*` driver.
- GitHub Issues living-system rule — Phase 36 must ensure VIZ-10 GH issue gets `in-progress` label on Plan 36-01 start, and PR bodies use `Fixes #<VIZ-10 issue>` on Plan 36-02 merge.
- Icon policy (D-33) — no new icon work in this phase (harness is test-only).
- Canonical spacing (D-34) — N/A (no UI work).

## Sources

### Primary (HIGH confidence)
- `.planning/phases/36-viz-10-regression/36-CONTEXT.md` — locked decisions
- `.planning/phases/32-pbr-foundation/32-07-SUMMARY.md` lines 36-43 — candidate causes
- `src/three/userTextureCache.ts` (read in full) — Phase 34 cache contract
- `src/three/ThreeViewport.tsx` (read in full) — mount/unmount + camera ref architecture
- `src/three/WallMesh.tsx:1-110,110-300` — wallpaper/wallArt render sites
- `src/three/FloorMesh.tsx:80-132` — floor user-texture branch
- `src/three/CeilingMesh.tsx:85-120` — ceiling user-texture branch
- `tests/wallMeshDisposeContract.test.ts` (read in full) — existing static contract
- `src/hooks/useUserTexture.ts` — consumer hook
- `src/components/UploadTextureModal.tsx:460-463` — existing `__driveTextureUpload` driver
- `src/canvas/tools/selectTool.ts:1567-1643` — Phase 31 driver install/cleanup convention
- `package.json` + `vitest.config.ts` — current test infrastructure

### Secondary (MEDIUM confidence)
- Playwright documentation (https://playwright.dev/docs/test-configuration, https://playwright.dev/docs/test-webserver, https://playwright.dev/docs/test-snapshots) — from training; verify current version syntax via `npm view @playwright/test version` at plan time.

### Tertiary (LOW confidence)
- None. All claims verified against repo source or CONTEXT.md lock.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Playwright is the obvious choice, user locked it in CONTEXT.md
- Architecture: HIGH — two-project config + test-driver convention are both well-established (Playwright docs, Phase 31 precedent)
- Pitfalls: HIGH — derived from reading actual source (`ThreeViewport` damping, HDR suspense, fake-indexeddb vs real IDB)
- Phase 32 candidate causes: HIGH — copied verbatim from 32-07-SUMMARY.md
- Defensive code inventory: HIGH — grepped and line-referenced

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (30 days — Playwright is stable; verify version at plan time)
