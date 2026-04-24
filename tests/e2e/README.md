# Playwright E2E Harness (Phase 36 Plan 01)

This directory contains the VIZ-10 regression harness. It was built in Phase 36 Plan 01 to instrument the 2D↔3D view-toggle flow for uploaded-image textures (wallpaper, wallArt, floor, ceiling) and produce the evidence base that ROOT-CAUSE.md requires.

## What's Here

```
tests/e2e/
  playwright-helpers/                 # small composable helpers
    setTestCamera.ts                  # wraps window.__setTestCamera
    uploadTexture.ts                  # wraps window.__driveTextureUpload (Phase 34)
    toggleViewMode.ts                 # clicks [data-testid="view-mode-{mode}"]
    settle.ts                         # 200ms + 2×rAF settle (D-02)
    lifecycleEvents.ts                # drain window.__textureLifecycleEvents[]
  fixtures/
    sample-wallpaper.jpg              # tiny 16×16 JPEG (red)
    sample-wallart.png                # tiny 16×16 PNG (blue)
  specs/
    wallpaper-2d-3d-toggle.spec.ts    # 5-cycle wallpaper scenario
    wallart-2d-3d-toggle.spec.ts      # 5-cycle wallArt scenario
    floor-user-texture-toggle.spec.ts # 2-cycle floor smoke
    ceiling-user-texture-toggle.spec.ts # 2-cycle ceiling smoke
```

Golden images are stored in sibling `*-snapshots/` directories next to each spec — these ARE committed (they're the regression contract).

## Running

```bash
# Full suite (auto-starts Vite dev server in --mode test)
npm run test:e2e

# Headed + Playwright inspector (local debug)
npm run test:e2e:debug

# Single spec, single browser
npx playwright test tests/e2e/specs/wallpaper-2d-3d-toggle.spec.ts --project=chromium-dev

# Generate/refresh golden images (dangerous — see §Baseline Workflow below)
npm run test:e2e -- --update-snapshots

# View HTML report (auto-opens)
npx playwright show-report
```

## Baseline Workflow (GOLDEN IMAGE UPDATE PROTOCOL)

**Do NOT casually run `--update-snapshots`. It is a regression-masking footgun.**

Correct workflow:

1. Make an intentional visual change (e.g., update HDR, tweak light colors, ship a new material).
2. Run `npm run test:e2e` — baselines fail as expected.
3. Inspect the diff in the HTML report (`npx playwright show-report`). Confirm the change matches your intent.
4. Run `npm run test:e2e -- --update-snapshots` to regenerate goldens.
5. Commit the updated `*-snapshots/*.png` files **in the same PR as the source change** so reviewers see the visual delta.

A PR that touches only `*-snapshots/*.png` with no source change is almost certainly masking a real regression — block such PRs in review.

## IDB Note (Pitfall 3)

Playwright runs against **real browser IndexedDB**, not the `fake-indexeddb` shim that `tests/setup.ts` wires up for vitest. The two runners share no state. Each spec's `beforeEach` deletes `room-cad-user-textures` to isolate fixtures.

## Test-Mode Drivers

The harness depends on test-mode-only globals (all gated by `import.meta.env.MODE === "test"`):

- `window.__setTestCamera({ position, target })` — deterministic camera pose (D-03).
- `window.__driveTextureUpload(file, name, tileSizeFt)` — Phase 34 IDB-backed upload driver.
- `window.__textureLifecycleEvents: LifecycleEvent[]` — append-only buffer of load/resolve/fail/mount/unmount events.

The Playwright `webServer` command runs `npm run dev -- --mode test --port 5173` so these gates activate.

## Lifecycle-Event Discipline

The `window.__textureLifecycleEvents[]` buffer is **never cleared between cycles**. The cross-cycle sequence (mount 1 → mount 2 → mount 5) is exactly what ROOT-CAUSE.md needs as evidence. Reading it mid-test drains the audit value. Helpers expose only `getLifecycleEvents(page)` at end-of-test.

## Plan 36-02

Plan 36-02 will:

- Add the `chromium-preview` Playwright project (currently scaffolded, inactive).
- Add the retained CI workflow (`.github/workflows/e2e.yml`).
- Land the actual VIZ-10 fix informed by ROOT-CAUSE.md.
- Update these goldens to reflect the fixed-state render.
